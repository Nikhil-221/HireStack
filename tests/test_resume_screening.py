import json

import pytest

from app.services.resume_screening_service import score_resume_against_job


class _FakeMessage:
    def __init__(self, content):
        self.content = content


class _FakeChoice:
    def __init__(self, content):
        self.message = _FakeMessage(content)


class _FakeCompletions:
    def __init__(self, responses):
        self._responses = iter(responses)

    def create(self, **kwargs):
        return next(self._responses)


class _FakeChat:
    def __init__(self, responses):
        self.completions = _FakeCompletions(responses)


class _FakeClient:
    def __init__(self, responses):
        self.chat = _FakeChat(responses)


@pytest.fixture
def job():
    return {
        "title": "Python Developer",
        "description": "Build APIs with Python and FastAPI.",
        "required_skills": ["Python", "FastAPI", "SQLAlchemy"],
    }


def test_score_resume_against_job_parses_strict_json(monkeypatch, job):
    payload = {
        "overall_score": 88,
        "matched_skills": ["Python", "FastAPI"],
        "missing_skills": ["SQLAlchemy"],
        "experience_fit": "Strong match for backend API work.",
        "summary": "Candidate aligns well with the role and has backend API experience.",
    }

    def fake_groq_client():
        return _FakeClient([type("Response", (), {"choices": [_FakeChoice(json.dumps(payload))]})()])

    monkeypatch.setattr("app.services.resume_screening_service.get_groq_client", fake_groq_client)

    score = score_resume_against_job("Python developer with FastAPI experience and backend APIs.", job)

    assert score == payload


def test_score_resume_against_job_retries_invalid_json(monkeypatch, job):
    payload = {
        "overall_score": 72,
        "matched_skills": ["Python"],
        "missing_skills": ["FastAPI"],
        "experience_fit": "Moderate fit.",
        "summary": "Candidate is a reasonable match with some gaps.",
    }

    responses = [
        type("Response", (), {"choices": [_FakeChoice("not json")]})(),
        type("Response", (), {"choices": [_FakeChoice(json.dumps(payload))]})(),
    ]

    def fake_groq_client():
        return _FakeClient(responses)

    monkeypatch.setattr("app.services.resume_screening_service.get_groq_client", fake_groq_client)

    score = score_resume_against_job("Python resume.", job)

    assert score == payload
