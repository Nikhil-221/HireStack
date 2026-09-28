from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient
from jose import jwt

from app.main import app
from app.routers import admin_coding_results


def test_candidate_token_gets_forbidden_from_interview_admin_endpoints(monkeypatch):
    secret = "candidate-interview-test-secret"
    monkeypatch.setenv("SECRET_KEY", secret)
    app.dependency_overrides[admin_coding_results.get_db] = lambda: None
    candidate_token = jwt.encode(
        {
            "sub": "candidate",
            "id": 123,
            "role": "candidate",
            "exp": datetime.now(timezone.utc) + timedelta(minutes=5),
        },
        secret,
        algorithm="HS256",
    )
    try:
        client = TestClient(app)
        headers = {"Authorization": f"Bearer {candidate_token}"}

        detail = client.get("/admin/interview-sessions/1", headers=headers)
        recording = client.get("/admin/interview-sessions/1/recording", headers=headers)

        assert detail.status_code == 403
        assert recording.status_code == 403
    finally:
        app.dependency_overrides.pop(admin_coding_results.get_db, None)