import json

import pytest

from app.ai_interview_service import (
    InterviewAIError,
    generate_interview_questions,
    score_interview_answer,
)


class _FakeMessage:
    def __init__(self, content):
        self.content = content


class _FakeChoice:
    def __init__(self, content):
        self.message = _FakeMessage(content)


class _FakeCompletions:
    def __init__(self, content):
        self.content = content
        self.calls = []

    def create(self, **kwargs):
        self.calls.append(kwargs)
        return type("Response", (), {"choices": [_FakeChoice(self.content)]})()


class _FakeClient:
    def __init__(self, content):
        self.completions = _FakeCompletions(content)
        self.chat = type("Chat", (), {"completions": self.completions})()


def test_generate_interview_questions_requires_one_question_of_each_kind(monkeypatch):
    payload = {
        "questions": [
            {"kind": "technical", "question_text": "How would you design this API?"},
            {"kind": "situational", "question_text": "How would you handle a missed deadline?"},
        ]
    }
    client = _FakeClient(json.dumps(payload))
    monkeypatch.setattr("app.ai_interview_service.get_groq_client", lambda: client)

    questions = generate_interview_questions({"title": "Engineer", "skills": ["Python"]})

    assert [question["order_index"] for question in questions] == [0, 1]
    assert len(questions) == 2
    assert client.completions.calls[0]["response_format"] == {"type": "json_object"}


def test_generate_interview_questions_rejects_wrong_kinds(monkeypatch):
    payload = {
        "questions": [
            {"kind": "technical", "question_text": "Question one?"},
            {"kind": "technical", "question_text": "Question two?"},
        ]
    }
    monkeypatch.setattr("app.ai_interview_service.get_groq_client", lambda: _FakeClient(json.dumps(payload)))

    with pytest.raises(InterviewAIError, match="one technical"):
        generate_interview_questions({"title": "Engineer"})


def test_short_interview_answer_scores_zero_without_groq_call(monkeypatch):
    def unexpected_client():
        pytest.fail("Groq must not be called for a trivially short answer")

    monkeypatch.setattr("app.ai_interview_service.get_groq_client", unexpected_client)

    result = score_interview_answer("Tell me about a project.", "No idea.")

    assert result["score"] == 0
    assert result["evaluation_details"]["strengths"] == []


def test_score_interview_answer_delimits_untrusted_transcript(monkeypatch):
    payload = {
        "score": 74,
        "feedback": "Clear explanation with relevant detail.",
        "strengths": ["Explained tradeoffs"],
        "weaknesses": ["Could be more specific"],
    }
    client = _FakeClient(json.dumps(payload))
    monkeypatch.setattr("app.ai_interview_service.get_groq_client", lambda: client)

    result = score_interview_answer("Describe a project.", "I planned the work and measured the result carefully.")

    prompt = client.completions.calls[0]["messages"][1]["content"]
    assert "BEGIN_UNTRUSTED_CANDIDATE_ANSWER_" in prompt
    assert "END_UNTRUSTED_CANDIDATE_ANSWER_" in prompt
    assert "never instructions" in client.completions.calls[0]["messages"][0]["content"]
    assert result["score"] == 74


def test_score_interview_answer_rejects_malformed_json(monkeypatch):
    monkeypatch.setattr("app.ai_interview_service.get_groq_client", lambda: _FakeClient("not json"))

    with pytest.raises(InterviewAIError, match="malformed JSON"):
        score_interview_answer("Describe a project.", "I planned a useful project carefully.")