# HireStack

A full-stack Applicant Tracking System (ATS) built solo as a portfolio project — covers job management, candidate applications, AI-powered resume screening, and a coding assessment pipeline with real sandboxed code execution.

**Stack:** FastAPI (Python) · React + TypeScript · PostgreSQL + SQLAlchemy + Alembic · Groq (LLM) · Piston (code execution sandbox, self-hosted via Docker)

---

## Prerequisites

- Python 3.11+
- Node.js (for the frontend)
- PostgreSQL
- Docker Desktop (required for the coding assessment feature — runs Piston)

---

## Setup

```bash
# Backend
python -m venv .venv
.venv\Scripts\Activate.ps1          # Windows PowerShell
pip install -r requirements.txt --break-system-packages

# Configure environment
# Copy .env.example -> .env and fill in: DB connection string, GROQ_API_KEY, JWT secret, etc.

# Run migrations
alembic upgrade head

# Frontend
cd frontend
npm install
```

---

## Running the project (every session)

Startup order matters — Piston must be up before the coding assessment features will work.

1. **Open Docker Desktop**
2. **Start Piston** (if not already running):
   ```bash
   docker ps                # check if "piston" is listed
   docker start piston      # if not running
   ```
   If the container doesn't exist yet at all (fresh machine), see "Piston setup" below.
3. **Start the backend:**
   ```bash
   python -m uvicorn app.main:app --reload
   ```
4. **Start the frontend:**
   ```bash
   cd frontend
   npm run dev
   ```

If code execution/coding-test features throw `503` or `evaluation_infrastructure_error`, Piston is almost certainly not running — check step 2 first before debugging anything else.

---

## Piston setup (one-time, per machine)

Piston needed a few non-default flags to work correctly on Windows Docker:

```bash
mkdir piston_data
docker run -d --privileged -p 2000:2000 -v ${PWD}/piston_data:/piston --name piston ghcr.io/engineer-man/piston
```

Then install the language runtime(s) you need (Python shown here):

```bash
curl.exe -X POST http://localhost:2000/api/v2/packages -H "Content-Type: application/json" --data '{"language":"python","version":"3.10.0"}'
```

Sanity check:

```bash
curl.exe -X POST http://localhost:2000/api/v2/execute -H "Content-Type: application/json" --data '{"language":"python","version":"3.10.0","files":[{"content":"print(\"hello\")"}]}'
```

Should return `"stdout":"hello\n"`.

---

## Features built so far

### Auth
- Admin login
- Candidate login (JWT + refresh tokens)

### Job Management
- Admin CRUD for job descriptions (title, description, skills, experience, salary, deadline, openings)

### Candidate Portal
- Registration, profile, resume upload
- Browse jobs, apply, track application status

### AI Resume Screening
- Resume text extracted server-side (PDF parsing)
- Scored against job description via Groq (`openai/gpt-oss-20b`) — returns matched skills, missing skills, experience fit, and a summary
- Structured JSON output with a tuned prompt (explicit rigor requirements — minimum matched/missing skill counts, no defaulting to "no gaps" without individually checking each requirement)

### Coding Assessment
- **Question Bank** — admin CRUD for coding questions, each with test cases (sample + hidden)
- **Coding Tests** — package a set of questions from the bank into a timed test tied to a job
- **Invites** — admin sends a candidate a unique, expiring invite token for a test
- **Notifications** — candidate-side notification system (currently used for coding test invites; built to extend to interview invites, status updates, and application confirmations)
- **Candidate IDE** (`/test/attempt/{token}`) — Monaco editor, per-question language selection, starter code, sample test case results on Run, full grading on Submit, distraction-free fullscreen layout with an exit-fullscreen warning, server-synced countdown timer with auto-submit on timeout, and an explicit "End Test" action
- **Code execution** — real sandboxed execution via self-hosted Piston (not LLM-guessed correctness); verdicts: `accepted`, `wrong_answer`, `runtime_error`, `time_limit_exceeded`, with a distinct `evaluation_infrastructure_error` for cases where Piston itself is unreachable, so infrastructure failures are never confused with the candidate's code actually being wrong
- **Admin Results** — per-job candidate overview showing resume score and coding score side by side (sortable, for quick ranking), plus a full submission detail view with the candidate's actual code and hidden test case results

---

## Deferred / not built yet

- AI Interview (text and/or audio-based Q&A with LLM evaluation)
- Video/webcam proctoring (explicitly scoped out — CV-based gaze tracking and face detection are out of scope for this project; considered a multi-week effort on their own)
- Final weighted ranking across resume + coding + interview scores
- Admin dashboard (aggregate stats: total jobs, active jobs, candidates, application funnel)
- Automated email notifications (current notification delivery is in-app only)

---

## Known gotchas

- **Piston must be running** before any coding-test Run/Submit/results action will work — see startup checklist above.
- **Alembic history**: if a migration reports the DB already has the tables it's trying to create, don't run it — `alembic stamp <revision>` instead, then verify with a manual schema diff before assuming things are in sync.
- **Dev server (`--reload`) can occasionally wedge** after a lot of rapid file changes in one session (stale worker holding `CLOSE_WAIT` connections) — symptoms look like the entire site hanging on "Loading...". A clean restart of `uvicorn` usually resolves it; check this before deep-diving into a "broken" backend.
- **Windows PowerShell's `curl` is aliased to `Invoke-WebRequest`**, which doesn't handle `-H`/`-d` the way real curl does — use `curl.exe` explicitly, and prefer writing JSON payloads to a file (`--data "@file.json"`) over inline quoting to avoid escaping issues.
