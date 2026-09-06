import { apiClient } from './client'
import type { CodingTest, CodingTestPayload } from '@/types/codingTest'

export interface CodingTestInvite {
  id: number
  candidate_id: number
  coding_test_id: number
  token: string
  status: string
  expires_at: string
  created_at: string
}

export async function fetchCodingTests(): Promise<CodingTest[]> {
  const response = await apiClient.get<CodingTest[]>('/admin/coding-tests')
  return response.data
}

export async function fetchCodingTest(id: number): Promise<CodingTest> {
  const response = await apiClient.get<CodingTest>(`/admin/coding-tests/${id}`)
  return response.data
}

export async function createCodingTest(payload: CodingTestPayload): Promise<CodingTest> {
  const response = await apiClient.post<CodingTest>('/admin/coding-tests', payload)
  return response.data
}

export async function updateCodingTest(id: number, payload: CodingTestPayload): Promise<CodingTest> {
  const response = await apiClient.put<CodingTest>(`/admin/coding-tests/${id}`, payload)
  return response.data
}

export async function deleteCodingTest(id: number): Promise<void> {
  await apiClient.delete(`/admin/coding-tests/${id}`)
}

export async function inviteCandidate(testId: number, candidateId: number): Promise<CodingTestInvite> {
  const response = await apiClient.post<CodingTestInvite>(`/admin/coding-tests/${testId}/invite`, {
    candidate_id: candidateId,
  })
  return response.data
}
