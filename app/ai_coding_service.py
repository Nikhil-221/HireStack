import json
import logging
import os
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

_SYSTEM_PROMPT = (
    "You are an expert technical interviewer who writes coding assessment questions. "
    "Given a job role and topic, write one self-contained coding problem solvable by "
    "reading input from stdin and writing the answer to stdout - no external libraries, "
    "no file I/O. Respond only with the requested JSON structure - no extra commentary."
)

_JSON_SHAPE_INSTRUCTIONS = (
    ' Respond with ONLY a JSON object with exactly these keys: "title" (string), '
    '"description" (string - the full problem statement, including input/output format), '
    '"starter_code" (string - a short Python starter snippet, may be empty string), '
    '"test_cases" (array of 3-5 objects, each with "input" (string, the exact stdin text) '
    'and "expected_output" (string, the exact expected stdout text); mark exactly the '
    'first one with "is_sample": true and the rest "is_sample": false). '
    "No other keys, no markdown, no commentary."
)

_QUESTION_RESPONSE_SCHEMA = {
    "name": "coding_question",
    "strict": True,
    "schema": {
        "type": "object",
        "properties": {
            "title": {"type": "string"},
            "description": {"type": "string"},
            "starter_code": {"type": "string"},
            "test_cases": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "input": {"type": "string"},
                        "expected_output": {"type": "string"},
                        "is_sample": {"type": "boolean"},
                    },
                    "required": ["input", "expected_output", "is_sample"],
                    "additionalProperties": False,
                },
            },
        },
        "required": ["title", "description", "starter_code", "test_cases"],
        "additionalProperties": False,
    },
}


def _build_prompt(job_title: str, topic: Optional[str], difficulty: str) -> str:
    lines = [f"Job role: {job_title}", f"Difficulty: {difficulty}"]
    if topic:
        lines.append(f"Preferred topic/skill area: {topic}")
    lines.append(
        "\nWrite one coding problem appropriate for screening candidates for this role. "
        "The candidate will read input from stdin and print the answer to stdout. "
        "Provide 3-5 test cases; the first must be a small, illustrative sample."
    )
    return "\n".join(lines)


def _generate_with_openai(prompt: str) -> dict:
    from openai import OpenAI

    client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

    response = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": _SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ],
        response_format={"type": "json_schema", "json_schema": _QUESTION_RESPONSE_SCHEMA},
        timeout=30,
    )
    return json.loads(response.choices[0].message.content)


def _generate_with_groq(prompt: str) -> dict:
    from openai import OpenAI

    client = OpenAI(
        api_key=os.getenv("GROQ_API_KEY"),
        base_url="https://api.groq.com/openai/v1",
    )
    model = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")

    response = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": _SYSTEM_PROMPT + _JSON_SHAPE_INSTRUCTIONS},
            {"role": "user", "content": prompt},
        ],
        response_format={"type": "json_object"},
        timeout=30,
    )
    return json.loads(response.choices[0].message.content)


def _validate_question_dict(data: dict) -> dict:
    if not isinstance(data, dict):
        raise ValueError("AI response was not a JSON object")
    for key in ("title", "description"):
        if not isinstance(data.get(key), str) or not data[key].strip():
            raise ValueError(f"AI response missing a valid '{key}' string")
    cases = data.get("test_cases")
    if not isinstance(cases, list) or not cases:
        raise ValueError("AI response missing 'test_cases'")
    for case in cases:
        if not isinstance(case, dict) or "expected_output" not in case:
            raise ValueError("AI response has a malformed test case")
    data.setdefault("starter_code", "")
    return data


def _generate_mock_question(job_title: str, topic: Optional[str], difficulty: str) -> dict:
    subject = topic or "arrays"
    title = f"{job_title} Screening: {subject.title()} Warm-up"
    description = (
        f"Given a difficulty of '{difficulty}', read a single line containing space-separated "
        f"integers from stdin, and print their sum to stdout.\n\n"
        f"This is a placeholder question generated without a configured AI provider - "
        f"edit the title, description, and test cases before publishing it in a test."
    )
    starter_code = (
        "numbers = list(map(int, input().split()))\n"
        "print(sum(numbers))\n"
    )
    test_cases = [
        {"input": "1 2 3", "expected_output": "6", "is_sample": True},
        {"input": "10 -2 5", "expected_output": "13", "is_sample": False},
        {"input": "0 0 0", "expected_output": "0", "is_sample": False},
    ]
    return {
        "title": title,
        "description": description,
        "starter_code": starter_code,
        "test_cases": test_cases,
    }


def generate_coding_question(job_title: str, topic: Optional[str] = None, difficulty: str = "Medium") -> dict:
    prompt = _build_prompt(job_title, topic, difficulty)

    if os.getenv("GROQ_API_KEY"):
        try:
            return _validate_question_dict(_generate_with_groq(prompt))
        except Exception:
            logger.warning("Groq coding-question generation failed - falling back", exc_info=True)

    if os.getenv("OPENAI_API_KEY"):
        try:
            return _validate_question_dict(_generate_with_openai(prompt))
        except Exception:
            logger.warning("OpenAI coding-question generation failed - falling back", exc_info=True)

    logger.info("No working AI provider configured - using mock coding-question generator")
    return _generate_mock_question(job_title, topic, difficulty)
