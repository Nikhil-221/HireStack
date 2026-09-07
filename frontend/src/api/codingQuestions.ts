import { apiClient } from './client'
import type {
  CodingQuestion,
  CodingQuestionDifficulty,
  CodingQuestionPayload,
} from '@/types/codingQuestion'

interface CodingQuestionFilters {
  job_id?: number
  difficulty?: CodingQuestionDifficulty
}

export async function fetchCodingQuestions(filters: CodingQuestionFilters = {}): Promise<CodingQuestion[]> {
  const response = await apiClient.get<CodingQuestion[]>('/admin/coding-questions', {
    params: filters,
  })
  return response.data
}

export async function fetchCodingQuestion(id: number): Promise<CodingQuestion> {
  const response = await apiClient.get<CodingQuestion>(`/admin/coding-questions/${id}`)
  return response.data
}

export async function createCodingQuestion(payload: CodingQuestionPayload): Promise<CodingQuestion> {
  const response = await apiClient.post<CodingQuestion>('/admin/coding-questions', payload)
  return response.data
}

export async function updateCodingQuestion(
  id: number,
  payload: CodingQuestionPayload
): Promise<CodingQuestion> {
  const response = await apiClient.put<CodingQuestion>(`/admin/coding-questions/${id}`, payload)
  return response.data
}

export async function deleteCodingQuestion(id: number): Promise<void> {
  await apiClient.delete(`/admin/coding-questions/${id}`)
}
