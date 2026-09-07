export type CodingQuestionDifficulty = 'easy' | 'medium' | 'hard'

export interface CodingTestCase {
  id: number
  input: string
  expected_output: string
  is_sample: boolean
}

export interface CodingQuestion {
  id: number
  title: string
  description: string
  difficulty: CodingQuestionDifficulty
  job_id: number | null
  job_title: string | null
  starter_code: Record<string, string> | null
  created_at: string
  test_cases: CodingTestCase[]
}

export interface CodingTestCasePayload {
  input: string
  expected_output: string
  is_sample: boolean
}

export interface CodingQuestionPayload {
  title: string
  description: string
  difficulty: CodingQuestionDifficulty
  job_id: number | null
  starter_code: Record<string, string> | null
  test_cases: CodingTestCasePayload[]
}
