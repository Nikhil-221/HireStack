from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

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


def test_interview_recording_url_supports_byte_ranges_without_bearer_auth(monkeypatch, tmp_path):
    secret = "interview-recording-test-secret"
    monkeypatch.setenv("SECRET_KEY", secret)
    monkeypatch.chdir(tmp_path)
    video_directory = tmp_path / "videos"
    video_directory.mkdir()
    recording_path = video_directory / "recording.webm"
    recording_path.write_bytes(b"0123456789")

    class FakeQuery:
        def filter(self, *_args):
            return self

        def first(self):
            return SimpleNamespace(recording_path=str(recording_path))

    class FakeDb:
        def query(self, *_args):
            return FakeQuery()

    app.dependency_overrides[admin_coding_results.get_db] = FakeDb
    recruiter_token = jwt.encode(
        {
            "sub": "recruiter",
            "id": 456,
            "role": "recruiter",
            "exp": datetime.now(timezone.utc) + timedelta(minutes=5),
        },
        secret,
        algorithm="HS256",
    )
    try:
        client = TestClient(app)
        url_response = client.post(
            "/admin/interview-sessions/7/recording-url",
            headers={"Authorization": f"Bearer {recruiter_token}"},
        )
        assert url_response.status_code == 200

        response = client.get(url_response.json()["url"], headers={"Range": "bytes=3-6"})

        assert response.status_code == 206
        assert response.headers["accept-ranges"] == "bytes"
        assert response.headers["content-range"] == "bytes 3-6/10"
        assert response.content == b"3456"
    finally:
        app.dependency_overrides.pop(admin_coding_results.get_db, None)