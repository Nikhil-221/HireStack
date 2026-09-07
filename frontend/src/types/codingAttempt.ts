export type CodingAttemptVerdict = 'accepted' | 'wrong_answer' | 'runtime_error' | 'time_limit_exceeded' | 'evaluation_infrastructure_error'

export interface CodingAttemptCase {
  input: string
  expected_output: string
}

export interface CodingAttemptQuestion {
  id: number
  title: string
  description: string
  difficulty: 'easy' | 'medium' | 'hard'
  starter_code: Record<string, string> | null
  test_cases: CodingAttemptCase[]
  attempted: boolean
  submission_status: string | null
  last_code: string | null
  last_language: string | null
}

export interface CodingAttempt {
  title: string
  duration_minutes: number
  status: 'not_started' | 'in_progress' | 'completed'
  opened_at: string
  server_time: string
  expires_at: string
  questions: CodingAttemptQuestion[]
}

export interface CodingAttemptPayload {
  question_id: number
  code: string
  language: string
}

export interface CodingAttemptResult {
  verdict: CodingAttemptVerdict
  results: Array<{
    input: string
    expected: string
    actual: string
    passed: boolean
  }>
  submission_id?: number
  status?: CodingAttempt['status']
}
