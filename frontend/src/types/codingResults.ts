import type { ApplicationStatus } from './candidate'

export interface CandidateCodingTestSummary {
  test_id: number
  test_title: string
  invite_id: number
  status: 'not_started' | 'in_progress' | 'completed'
  score: number | null
  passed_cases: number | null
  total_cases: number | null
  submission_ids: number[]
  question_statuses: CodingQuestionStatus[]
}

export interface CodingQuestionStatus {
  id: number
  title: string
  status: 'accepted' | 'wrong_answer' | 'runtime_error' | 'time_limit_exceeded' | 'pending' | 'skipped'
  submission_id: number | null
}

export interface JobCandidateOverviewRow {
  application_id: number
  candidate_id: number
  name: string
  email: string
  phone: string | null
  status: ApplicationStatus
  applied_at: string
  resume_score: number | null
  coding_tests: CandidateCodingTestSummary[]
  interview_score: number | null
}

export interface JobCandidatesOverview {
  job: { id: number; title: string }
  candidates: JobCandidateOverviewRow[]
}

export interface CodingSubmissionDetail {
  id: number
  candidate: { id: number; name: string; email: string }
  invite_id: number
  question: { id: number; title: string; difficulty: string }
  code: string
  language: string
  verdict: string
  passed_cases: number
  total_cases: number
  submitted_at: string
  has_recording: boolean
  question_statuses: CodingQuestionStatus[]
  results: Array<{
    input: string
    expected: string
    actual: string
    passed: boolean
    is_sample: boolean
  }>
}
