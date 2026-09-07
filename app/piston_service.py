from typing import Any

import requests
from fastapi import HTTPException

from .database import SessionLocal
from .models import CodingQuestion, TestCase


PISTON_EXECUTE_URL = "http://localhost:2000/api/v2/execute"
PISTON_TIMEOUT_SECONDS = 10
PISTON_LANGUAGE_VERSIONS = {
    "python": "3.10.0",
}
INFRASTRUCTURE_SIGNALS = {
    "PISTON_UNAVAILABLE",
    "PISTON_ERROR",
    "PISTON_INVALID_RESPONSE",
    "PISTON_UNSUPPORTED_LANGUAGE",
}


def run_code(code: str, language: str, stdin: str) -> dict:
    """Execute code through a local Piston instance."""
    version = PISTON_LANGUAGE_VERSIONS.get(language)
    if version is None:
        return {
            "stdout": "",
            "stderr": f"No Piston version configured for language: {language}",
            "exit_code": None,
            "signal": "PISTON_UNSUPPORTED_LANGUAGE",
        }

    payload = {
        "language": language,
        "version": version,
        "files": [{"content": code}],
        "stdin": stdin,
    }

    try:
        response = requests.post(
            PISTON_EXECUTE_URL,
            json=payload,
            timeout=PISTON_TIMEOUT_SECONDS,
        )
        response.raise_for_status()
        raw_response: dict[str, Any] = response.json()
        result: dict[str, Any] = raw_response.get("run", {})
        return {
            "stdout": result.get("stdout", ""),
            "stderr": result.get("stderr", ""),
            "exit_code": result.get("code"),
            "signal": result.get("signal"),
        }
    except requests.exceptions.Timeout:
        return {
            "stdout": "",
            "stderr": "Piston execution timed out",
            "exit_code": None,
            "signal": "TIMEOUT",
        }
    except requests.exceptions.HTTPError as exc:
        return {
            "stdout": "",
            "stderr": f"Piston rejected the execution request: {exc}",
            "exit_code": None,
            "signal": "PISTON_ERROR",
        }
    except requests.exceptions.RequestException as exc:
        return {
            "stdout": "",
            "stderr": f"Unable to reach Piston: {exc}",
            "exit_code": None,
            "signal": "PISTON_UNAVAILABLE",
        }
    except (ValueError, TypeError, AttributeError) as exc:
        return {
            "stdout": "",
            "stderr": f"Invalid response from Piston: {exc}",
            "exit_code": None,
            "signal": "PISTON_INVALID_RESPONSE",
        }


def evaluate_submission(
    question_id: int,
    code: str,
    language: str,
    sample_only: bool,
) -> dict:
    """Run a submission against the selected test cases for a question."""
    db = SessionLocal()
    try:
        question = db.query(CodingQuestion.id).filter(CodingQuestion.id == question_id).first()
        if question is None:
            raise HTTPException(status_code=404, detail="Coding question not found")

        query = db.query(TestCase).filter(TestCase.question_id == question_id)
        if sample_only:
            query = query.filter(TestCase.is_sample.is_(True))
        test_cases = query.order_by(TestCase.id).all()

        case_results = []
        verdict = "accepted"
        for test_case in test_cases:
            execution = run_code(code, language, test_case.input)
            actual = execution["stdout"].strip()
            expected = test_case.expected_output.strip()
            passed = actual == expected and execution["exit_code"] == 0 and not execution["signal"]

            case_results.append(
                {
                    "input": test_case.input,
                    "expected": test_case.expected_output,
                    "actual": execution["stdout"],
                    "passed": passed,
                }
            )

            signal = str(execution["signal"]).upper() if execution["signal"] else ""
            if signal in INFRASTRUCTURE_SIGNALS:
                verdict = "evaluation_infrastructure_error"
            elif signal in {"SIGKILL", "TIMEOUT"}:
                verdict = "time_limit_exceeded"
            elif execution["exit_code"] not in (None, 0) or execution["signal"]:
                if verdict != "time_limit_exceeded":
                    verdict = "runtime_error"
            elif not passed and verdict == "accepted":
                verdict = "wrong_answer"

        return {"verdict": verdict, "results": case_results}
    finally:
        db.close()