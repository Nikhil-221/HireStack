import { apiClient } from './client'
import type { CodingAttempt, CodingAttemptPayload, CodingAttemptResult } from '@/types/codingAttempt'

export async function fetchCodingAttempt(token: string): Promise<CodingAttempt> {
  const response = await apiClient.get<CodingAttempt>(`/candidate/test-attempt/${token}`)
  return response.data
}

export async function runCodingAttempt(token: string, payload: CodingAttemptPayload): Promise<CodingAttemptResult> {
  const response = await apiClient.post<CodingAttemptResult>(`/candidate/test-attempt/${token}/run`, payload)
  return response.data
}

export async function submitCodingAttempt(token: string, payload: CodingAttemptPayload): Promise<CodingAttemptResult> {
  const response = await apiClient.post<CodingAttemptResult>(`/candidate/test-attempt/${token}/submit`, payload)
  return response.data
}

export async function endCodingAttempt(token: string): Promise<{ status: string }> {
  const response = await apiClient.post<{ status: string }>(`/candidate/test-attempt/${token}/end`)
  return response.data
}

export async function uploadCodingAttemptRecording(token: string, blob: Blob): Promise<void> {
  const formData = new FormData()
  formData.append('recording', blob, 'coding-test.webm')
  await apiClient.post(`/candidate/test-attempt/${token}/upload-recording`, formData)
}
