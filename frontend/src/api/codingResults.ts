import { apiClient } from './client'
import type { CodingSubmissionDetail, JobCandidatesOverview } from '@/types/codingResults'

export async function fetchJobCandidatesOverview(jobId: number): Promise<JobCandidatesOverview> {
  const response = await apiClient.get<JobCandidatesOverview>(`/admin/jobs/${jobId}/candidates-overview`)
  return response.data
}

export async function fetchCodingSubmissionDetail(submissionId: number): Promise<CodingSubmissionDetail> {
  const response = await apiClient.get<CodingSubmissionDetail>(`/admin/coding-submissions/${submissionId}`)
  return response.data
}

export async function fetchCodingRecording(inviteId: number): Promise<Blob> {
  const response = await apiClient.get(`/admin/coding-test-invites/${inviteId}/recording`, { responseType: 'blob' })
  return response.data
}
