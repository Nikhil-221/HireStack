import json
import logging
import os
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)


def get_groq_client():
    from openai import OpenAI

    return OpenAI(
        api_key=os.getenv("GROQ_API_KEY"),
        base_url="https://api.groq.com/openai/v1",
    )


_SYSTEM_PROMPT = (
    "You are an expert technical recruiter and professional job description writer. "
    "Given details about an open role, write a clear, specific, and professional job "
    "description. Respond only with the requested JSON structure - no extra commentary."
)

_JSON_SHAPE_INSTRUCTIONS = (
    ' Respond with ONLY a JSON object with exactly these keys: "description" (a string), '
    '"responsibilities" (an array of strings), "required_skills" (an array of strings), '
    '"preferred_skills" (an array of strings), "qualifications" (an array of strings). '
    "No other keys, no markdown, no commentary."
)

_JD_RESPONSE_SCHEMA = {
    "name": "job_description",
    "strict": True,
    "schema": {
        "type": "object",
        "properties": {
            "description": {"type": "string"},
            "responsibilities": {"type": "array", "items": {"type": "string"}},
            "required_skills": {"type": "array", "items": {"type": "string"}},
            "preferred_skills": {"type": "array", "items": {"type": "string"}},
            "qualifications": {"type": "array", "items": {"type": "string"}},
        },
        "required": [
            "description",
            "responsibilities",
            "required_skills",
            "preferred_skills",
            "qualifications",
        ],
        "additionalProperties": False,
    },
}


def _build_prompt(
    title: str,
    department: Optional[str],
    location: Optional[str],
    employment_type: Optional[str],
    experience_required: Optional[str],
    salary_min: Optional[int],
    salary_max: Optional[int],
    openings: Optional[int],
    description: Optional[str],
) -> str:
    lines = [f"Job title: {title}"]
    if department:
        lines.append(f"Department: {department}")
    if location:
        lines.append(f"Location: {location}")
    if employment_type:
        lines.append(f"Employment type: {employment_type}")
    if experience_required:
        lines.append(f"Experience required: {experience_required}")
    if salary_min or salary_max:
        lines.append(f"Salary range: {salary_min or '—'} to {salary_max or '—'}")
    if openings:
        lines.append(f"Number of openings: {openings}")
    if description:
        lines.append(
            "The recruiter has already written a rough draft description below - "
            f"use it as guidance and refine/expand it rather than ignoring it:\n{description}"
        )

    lines.append(
        "\nWrite a complete job description with: a 2-4 sentence overview paragraph, "
        "5-7 responsibilities, 3-5 required skills, 2-4 preferred skills, and 2-3 qualifications."
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
        response_format={"type": "json_schema", "json_schema": _JD_RESPONSE_SCHEMA},
        timeout=30,
    )
    return json.loads(response.choices[0].message.content)


def _generate_with_groq(prompt: str) -> dict:
    client = get_groq_client()
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


def _validate_jd_dict(data: dict) -> dict:
    list_keys = ["responsibilities", "required_skills", "preferred_skills", "qualifications"]

    if not isinstance(data, dict) or "description" not in data or not isinstance(data["description"], str):
        raise ValueError("AI response missing a valid 'description' string")

    for key in list_keys:
        value = data.get(key)
        if not isinstance(value, list) or not all(isinstance(item, str) for item in value):
            raise ValueError(f"AI response missing a valid '{key}' list of strings")

    return data


def _generate_mock_jd(
    title: str,
    department: Optional[str] = None,
    employment_type: Optional[str] = None,
    experience_required: Optional[str] = None,
) -> dict:
    department_text = department or "our team"
    experience_text = experience_required or "relevant"
    employment_text = employment_type or "Full-time"

    description = (
        f"We are looking for a talented {title} to join {department_text} on a "
        f"{employment_text} basis. The ideal candidate has {experience_text} experience "
        f"and is passionate about solving real-world problems, collaborating with "
        f"cross-functional teams, and delivering high-quality work."
    )

    responsibilities = [
        f"Design, build, and maintain solutions as a {title}",
        "Collaborate with cross-functional teams to define and ship new features",
        "Write clean, maintainable, and well-tested code",
        "Participate in code reviews and technical design discussions",
        "Troubleshoot and resolve production issues in a timely manner",
    ]

    required_skills = [
        "Strong problem-solving and analytical skills",
        "Good communication and collaboration skills",
        "Solid understanding of software development fundamentals",
    ]

    preferred_skills = [
        "Prior experience in a similar role",
        "Exposure to agile development practices",
    ]

    qualifications = [
        "Bachelor's degree in Computer Science, Engineering, or a related field (or equivalent experience)",
        f"{experience_text} of professional experience in a relevant role",
    ]

    return {
        "description": description,
        "responsibilities": responsibilities,
        "required_skills": required_skills,
        "preferred_skills": preferred_skills,
        "qualifications": qualifications,
    }


def generate_job_description(
    title: str,
    department: Optional[str] = None,
    location: Optional[str] = None,
    employment_type: Optional[str] = None,
    experience_required: Optional[str] = None,
    salary_min: Optional[int] = None,
    salary_max: Optional[int] = None,
    openings: Optional[int] = None,
    description: Optional[str] = None,
) -> dict:
    prompt = _build_prompt(
        title, department, location, employment_type, experience_required,
        salary_min, salary_max, openings, description,
    )

    if os.getenv("GROQ_API_KEY"):
        try:
            return _validate_jd_dict(_generate_with_groq(prompt))
        except Exception:
            logger.warning("Groq job description generation failed - falling back", exc_info=True)

    if os.getenv("OPENAI_API_KEY"):
        try:
            return _validate_jd_dict(_generate_with_openai(prompt))
        except Exception:
            logger.warning("OpenAI job description generation failed - falling back", exc_info=True)

    logger.info("No working AI provider configured - using mock job description generator")
    return _generate_mock_jd(title, department, employment_type, experience_required)
