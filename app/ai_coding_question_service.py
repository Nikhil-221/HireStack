import json
import os
from typing import List

from .ai_jd_service import get_groq_client


_SYSTEM_PROMPT = """You are an expert coding-interview question author.
Return only a valid JSON object matching the requested schema. Do not use markdown fences or commentary.
Every question must be a LeetCode-style data structures and algorithms problem at easy or medium difficulty, never hard.
"""


_PROMPT_RULES = """Each question must have exactly these keys:
"title", "description", "difficulty", "test_cases".

Hard requirements for every question:
- Provide exactly 2 sample test cases with is_sample=true and at least 3 hidden test cases with is_sample=false.
- Every input value goes on its own line.
- Lists and arrays are space-separated values, matching Python's list(map(int, input().split())).
- Candidate code must always read input with input() and print the final answer with print().
- Keep output formatting consistent and tight. For example, print [0,1], never [0, 1].
- Make every test case consistent with the described input and output format.
- Use only easy or medium difficulty.
"""


def _validate_question(data: dict) -> dict:
    expected_keys = {"title", "description", "difficulty", "test_cases"}
    if not isinstance(data, dict) or set(data) != expected_keys:
        raise ValueError("AI response question must contain exactly the requested JSON keys")
    if not isinstance(data["title"], str) or not data["title"].strip():
        raise ValueError("AI response question must include a title")
    if not isinstance(data["description"], str) or not data["description"].strip():
        raise ValueError("AI response question must include a description")
    if data["difficulty"] not in {"easy", "medium"}:
        raise ValueError("AI response difficulty must be easy or medium")
    test_cases = data["test_cases"]
    if not isinstance(test_cases, list) or not all(
        isinstance(case, dict)
        and set(case) == {"input", "expected_output", "is_sample"}
        and isinstance(case["input"], str)
        and isinstance(case["expected_output"], str)
        and isinstance(case["is_sample"], bool)
        for case in test_cases
    ):
        raise ValueError("AI response contains an invalid test case")
    if sum(case["is_sample"] for case in test_cases) != 2:
        raise ValueError("AI response must include exactly 2 sample test cases")
    if sum(not case["is_sample"] for case in test_cases) < 3:
        raise ValueError("AI response must include at least 3 hidden test cases")
    for case in test_cases:
        case["input"] = case["input"].replace("\\\\n", "\n")
        case["expected_output"] = case["expected_output"].replace("\\\\n", "\n")
    return data


def generate_coding_questions(count: int = 2) -> List[dict]:
    prompt = f"""Create exactly {count} distinct generic DSA questions. Do not use any job or role context.
Return ONLY valid JSON, with no markdown or commentary, in this exact shape:
{{"questions":[{{"title":"string","description":"string","difficulty":"easy","test_cases":[{{"input":"string","expected_output":"string","is_sample":true}}]}}]}}
The questions array must contain exactly {count} objects. Every object must use exactly the keys title, description, difficulty, test_cases. difficulty must be exactly lowercase "easy" or "medium". Every test case must use exactly input, expected_output, is_sample; input and expected_output must be strings, and is_sample must be boolean. Include exactly 2 sample cases and at least 3 hidden cases per question.
Every input value goes on its own line; arrays are space-separated values parsed with list(map(int, input().split())). Candidate code reads with input() and prints with print(). Use tight output such as [0,1], not [0, 1].
{_PROMPT_RULES}"""

    response = get_groq_client().chat.completions.create(
        model=os.getenv("GROQ_MODEL", "llama-3.1-8b-instant"),
        messages=[
            {"role": "system", "content": _SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ],
        max_tokens=max(2048, int(os.getenv("GROQ_MAX_TOKENS", "4096"))),
        timeout=30,
    )
    content = response.choices[0].message.content or ""
    try:
        data = json.loads(content)
    except json.JSONDecodeError as exc:
        raise ValueError("AI response was not valid JSON") from exc

    if not isinstance(data, dict) or set(data) != {"questions"} or not isinstance(data["questions"], list):
        raise ValueError("AI response must contain exactly a questions array")
    if len(data["questions"]) != count:
        raise ValueError(f"AI response must contain exactly {count} questions")
    return [_validate_question(question) for question in data["questions"]]
