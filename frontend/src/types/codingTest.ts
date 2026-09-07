import type { CodingQuestionDifficulty } from './codingQuestion'

export interface CodingTestQuestion {
  id: number
  title: string
  difficulty: CodingQuestionDifficulty
}

export interface CodingTest {
  id: number
  job_id: number
  job_title: string
  title: string
  duration_minutes: number
  question_count: number
  created_at: string
  questions: CodingTestQuestion[]
}

export interface CodingTestPayload {
  job_id: number
  title: string
  duration_minutes: number
  question_ids: number[]
}
