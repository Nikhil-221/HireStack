"""
Runs candidate-submitted code against test cases and reports pass/fail.

Security note (read before relying on this in production):
This uses Python's `-I` isolated mode plus a per-process CPU/memory limit as a
basic, MVP-level sandbox. It is NOT equivalent to container/VM isolation
(Docker, gVisor, firecracker, etc.) and should not be trusted to run fully
untrusted code on a shared production host without hardening further. It is
good enough for a local/dev assessment flow; harden before shipping publicly.
"""
import subprocess
import sys
from dataclasses import dataclass
from typing import List, Optional

try:
    import resource  # POSIX only
    _HAS_RESOURCE = True
except ImportError:  # pragma: no cover - Windows dev machines
    _HAS_RESOURCE = False

MAX_MEMORY_BYTES = 256 * 1024 * 1024  # 256 MB
DEFAULT_TIMEOUT_SECONDS = 5


@dataclass
class CaseResult:
    input: str
    expected: str
    actual: str
    passed: bool
    error: Optional[str] = None


def _limit_resources():  # pragma: no cover - exercised only on POSIX at runtime
    if not _HAS_RESOURCE:
        return
    resource.setrlimit(resource.RLIMIT_AS, (MAX_MEMORY_BYTES, MAX_MEMORY_BYTES))
    resource.setrlimit(resource.RLIMIT_CPU, (DEFAULT_TIMEOUT_SECONDS, DEFAULT_TIMEOUT_SECONDS))


def _run_once(code: str, stdin_text: str, timeout_seconds: int) -> tuple[str, str, bool]:
    """Returns (stdout, stderr_or_error, timed_out)."""
    try:
        completed = subprocess.run(
            [sys.executable, "-I", "-c", code],
            input=stdin_text or "",
            capture_output=True,
            text=True,
            timeout=timeout_seconds,
            preexec_fn=_limit_resources if _HAS_RESOURCE else None,
        )
        return completed.stdout, completed.stderr, False
    except subprocess.TimeoutExpired:
        return "", "Time limit exceeded", True
    except Exception as exc:  # noqa: BLE001 - surface any sandbox failure as a graded error
        return "", f"Execution error: {exc}", False


def run_against_cases(
    code: str,
    cases: List[dict],
    timeout_seconds: int = DEFAULT_TIMEOUT_SECONDS,
) -> List[CaseResult]:
    """cases: list of {"input": str, "expected_output": str}."""
    results: List[CaseResult] = []
    for case in cases:
        stdout, stderr, timed_out = _run_once(code, case.get("input") or "", timeout_seconds)
        actual = stdout.strip()
        expected = (case.get("expected_output") or "").strip()
        passed = (not timed_out) and (not stderr) and actual == expected
        results.append(
            CaseResult(
                input=case.get("input") or "",
                expected=expected,
                actual=actual if not stderr else "",
                passed=passed,
                error=stderr or None,
            )
        )
    return results


def score_results(results: List[CaseResult]) -> tuple[int, int, float]:
    total = len(results)
    passed = sum(1 for r in results if r.passed)
    score = round((passed / total) * 100, 2) if total else 0.0
    return passed, total, score


def summarize_failures(results: List[CaseResult]) -> Optional[str]:
    for r in results:
        if not r.passed:
            if r.error:
                return r.error.strip()[:500]
            return f"Failed on input: {r.input!r} — expected {r.expected!r}, got {r.actual!r}"
    return None
