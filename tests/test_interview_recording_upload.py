import asyncio
from pathlib import Path

import pytest
from fastapi import HTTPException

from app.routers import interviews


class _FakeUpload:
    def __init__(self, content_type, chunks):
        self.content_type = content_type
        self._chunks = iter(chunks)

    async def read(self, size):
        return next(self._chunks, b"")


class _FakeDatabase:
    def __init__(self):
        self.commits = 0
        self.rollbacks = 0

    def commit(self):
        self.commits += 1

    def rollback(self):
        self.rollbacks += 1


class _FakeInterview:
    recording_path = None


def _upload(db, recording):
    return asyncio.run(
        interviews.upload_interview_recording(
            db=db,
            user={"id": 12},
            token="interview-token",
            recording=recording,
        )
    )


def test_upload_interview_recording_streams_webm_and_sets_path(tmp_path, monkeypatch):
    interview = _FakeInterview()
    monkeypatch.setattr(interviews, "VIDEO_DIRECTORY", tmp_path)
    monkeypatch.setattr(
        interviews.InterviewService,
        "get_recording_session",
        lambda self, token, candidate_id: interview,
    )
    db = _FakeDatabase()

    result = _upload(db, _FakeUpload("video/webm;codecs=vp9,opus", [b"video", b"data"]))

    file_path = Path(result["recording_path"])
    assert file_path.read_bytes() == b"videodata"
    assert interview.recording_path == str(file_path)
    assert db.commits == 1


def test_upload_interview_recording_rejects_non_webm(tmp_path, monkeypatch):
    monkeypatch.setattr(interviews, "VIDEO_DIRECTORY", tmp_path)
    db = _FakeDatabase()

    with pytest.raises(HTTPException) as error:
        _upload(db, _FakeUpload("video/mp4", [b"not webm"]))

    assert error.value.status_code == 400
    assert list(tmp_path.iterdir()) == []


def test_upload_interview_recording_rejects_duplicate_path(tmp_path, monkeypatch):
    def duplicate_recording(self, token, candidate_id):
        raise HTTPException(status_code=409, detail="A recording has already been uploaded")

    monkeypatch.setattr(interviews, "VIDEO_DIRECTORY", tmp_path)
    monkeypatch.setattr(interviews.InterviewService, "get_recording_session", duplicate_recording)

    with pytest.raises(HTTPException) as error:
        _upload(_FakeDatabase(), _FakeUpload("video/webm", [b"recording"]))

    assert error.value.status_code == 409
    assert list(tmp_path.iterdir()) == []


def test_upload_interview_recording_deletes_file_when_size_limit_exceeded(tmp_path, monkeypatch):
    monkeypatch.setattr(interviews, "VIDEO_DIRECTORY", tmp_path)
    monkeypatch.setattr(interviews, "MAX_RECORDING_BYTES", 5)
    monkeypatch.setattr(
        interviews.InterviewService,
        "get_recording_session",
        lambda self, token, candidate_id: _FakeInterview(),
    )
    db = _FakeDatabase()

    with pytest.raises(HTTPException) as error:
        _upload(db, _FakeUpload("video/webm", [b"1234", b"56"]))

    assert error.value.status_code == 413
    assert list(tmp_path.iterdir()) == []
    assert db.rollbacks == 1


def test_upload_interview_recording_deletes_partial_file_when_write_fails(tmp_path, monkeypatch):
    monkeypatch.setattr(interviews, "VIDEO_DIRECTORY", tmp_path)
    monkeypatch.setattr(
        interviews.InterviewService,
        "get_recording_session",
        lambda self, token, candidate_id: _FakeInterview(),
    )
    original_open = Path.open

    class _FailingWriter:
        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, traceback):
            return False

        def write(self, chunk):
            raise OSError("disk full")

    def failing_open(path, *args, **kwargs):
        if path.parent == tmp_path:
            return _FailingWriter()
        return original_open(path, *args, **kwargs)

    monkeypatch.setattr(Path, "open", failing_open)
    db = _FakeDatabase()

    with pytest.raises(HTTPException) as error:
        _upload(db, _FakeUpload("video/webm", [b"partial data"]))

    assert error.value.status_code == 500
    assert list(tmp_path.iterdir()) == []
    assert db.rollbacks == 1