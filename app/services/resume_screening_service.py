import json
import logging
import os
import re
import zipfile
from pathlib import Path
from typing import Any

from sqlalchemy.orm import Session

from ..database import SessionLocal
from ..models import Application, Job

logger = logging.getLogger(__name__)


def get_groq_client():
    from openai import OpenAI

    return OpenAI(
        api_key=os.getenv("GROQ_API_KEY"),
        base_url="https://api.groq.com/openai/v1",
    )


def _normalize_skill_name(skill: str) -> str:
    return re.sub(r"\s+", " ", (skill or "").strip())


def _safe_json_loads(raw: str) -> dict[str, Any] | None:
    if not isinstance(raw, str):
        return None

    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        return None

    return parsed if isinstance(parsed, dict) else None


def _validate_score_payload(data: Any) -> dict[str, Any] | None:
    if not isinstance(data, dict):
        return None

    overall_score = data.get("overall_score")
    if not isinstance(overall_score, int):
        return None

    matched_skills = data.get("matched_skills", [])
    missing_skills = data.get("missing_skills", [])
    if not isinstance(matched_skills, list) or not all(isinstance(item, str) for item in matched_skills):
        return None
    if not isinstance(missing_skills, list) or not all(isinstance(item, str) for item in missing_skills):
        return None

    experience_fit = data.get("experience_fit")
    summary = data.get("summary")
    if not isinstance(experience_fit, str) or not isinstance(summary, str):
        return None

    return {
        "overall_score": max(0, min(100, overall_score)),
        "matched_skills": [_normalize_skill_name(skill) for skill in matched_skills if skill and skill.strip()],
        "missing_skills": [_normalize_skill_name(skill) for skill in missing_skills if skill and skill.strip()],
        "experience_fit": experience_fit.strip(),
        "summary": summary.strip(),
    }


def _extract_pdf_text(path: str) -> str:
    try:
        from pypdf import PdfReader
    except Exception:
        logger.warning("pypdf is not installed; PDF text extraction unavailable.")
        return ""

    try:
        reader = PdfReader(path)
        pages = []
        for page in reader.pages:
            text = page.extract_text() or ""
            pages.append(text)
        return "\n".join(pages)
    except Exception:
        logger.warning("Failed to extract text from PDF resume", exc_info=True)
        return ""


def _extract_docx_text(path: str) -> str:
    try:
        import docx
    except Exception:
        logger.warning("python-docx is not installed; DOCX extraction unavailable.")
        return ""

    try:
        document = docx.Document(path)
        return "\n".join(paragraph.text for paragraph in document.paragraphs if paragraph.text.strip())
    except Exception:
        logger.warning("Failed to extract text from DOCX resume", exc_info=True)
        return ""


def _extract_doc_text(path: str) -> str:
    try:
        import olefile
    except Exception:
        logger.warning("olefile is not installed; DOC extraction unavailable.")
        return ""

    try:
        if not olefile.isOleFile(path):
            return ""

        with olefile.OleFileIO(path) as ole:
            streams = [
                name for name in ole.listdir() if name and name[0]
            ]
            text_chunks = []
            for stream in streams:
                try:
                    data = ole.read(stream[0])
                    if isinstance(data, bytes):
                        text = data.decode("latin-1", errors="ignore")
                        if text.strip():
                            text_chunks.append(text)
                except Exception:
                    continue
            return "\n".join(text_chunks)
    except Exception:
        logger.warning("Failed to extract text from DOC resume", exc_info=True)
        return ""


def extract_resume_text(resume_path: str, resume_filename: str) -> str:
    if not resume_path:
        return ""

    path = Path(resume_path)
    if not path.exists():
        return ""

    suffix = path.suffix.lower()
    if suffix == ".pdf":
        return _extract_pdf_text(str(path))
    if suffix == ".docx":
        return _extract_docx_text(str(path))
    if suffix == ".doc":
        return _extract_doc_text(str(path))
    return ""


def score_resume_against_job(resume_text: str, job: dict[str, Any]) -> dict[str, Any] | None:
    if not os.getenv("GROQ_API_KEY"):
        logger.warning("GROQ_API_KEY is not set; skipping resume screening")
        return None

    if not isinstance(job, dict):
        return None

    title = job.get("title") or "Role"
    description = job.get("description") or ""
    required_skills = job.get("required_skills") or []
    skill_text = ", ".join(str(skill) for skill in required_skills if str(skill).strip())
    prompt = (
        "You are an ATS resume screening assistant. Compare the candidate resume to the job requirements. "
        "Return valid JSON only with exactly these keys and no markdown, no prose: "
        "{\n"
        "  \"overall_score\": <integer 0-100>,\n"
        "  \"matched_skills\": [<strings>],\n"
        "  \"missing_skills\": [<strings>],\n"
        "  \"experience_fit\": \"<short string>\",\n"
        "  \"summary\": \"<1-2 sentence string>\"\n"
        "}.\n\n"
        f"Job title: {title}\n"
        f"Job description: {description}\n"
        f"Required skills: {skill_text}\n\n"
        "Candidate resume:\n"
        f"{resume_text[:12000]}"
    )

    client = get_groq_client()
    model = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")

    responses = []
    for _ in range(2):
        try:
            response = client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": "Return only valid JSON matching the schema exactly."},
                    {"role": "user", "content": prompt},
                ],
                response_format={"type": "json_object"},
                temperature=0,
                timeout=60,
            )
            content = response.choices[0].message.content
            parsed = _safe_json_loads(content)
            validated = _validate_score_payload(parsed)
            if validated is not None:
                return validated
            responses.append(content)
        except Exception:
            logger.warning("Groq resume scoring failed; retrying once if available.", exc_info=True)
            responses.append(None)
        if len(responses) >= 2:
            break

    logger.error("Groq resume scoring failed after retries: %s", responses)
    return None


def score_application_resume(application_id: int) -> None:
    db: Session = SessionLocal()
    try:
        application = db.query(Application).filter(Application.id == application_id).first()
        if application is None:
            return

        job = db.query(Job).filter(Job.id == application.job_id).first()
        if job is None:
            return

        resume_text = extract_resume_text(application.resume_path, application.resume_filename)
        job_data = {
            "title": job.title,
            "description": job.description or "",
            "required_skills": job.required_skills or [],
        }
        scored = score_resume_against_job(resume_text, job_data)
        if scored is None:
            return

        application.resume_screening_score = scored.get("overall_score")
        application.resume_screening_details = {
            "matched_skills": scored.get("matched_skills", []),
            "missing_skills": scored.get("missing_skills", []),
            "experience_fit": scored.get("experience_fit", ""),
            "summary": scored.get("summary", ""),
        }
        db.commit()
    except Exception:
        logger.warning("Resume screening failed for application %s", application_id, exc_info=True)
        try:
            db.rollback()
        except Exception:
            pass
    finally:
        db.close()
