import { apiClient } from './client'
import type { ApplicationStatus, JobApplicant } from '@/types/candidate'

export async function fetchJobApplicants(jobId: number): Promise<JobApplicant[]> {
  const response = await apiClient.get<JobApplicant[]>(`/jobs/${jobId}/applications`)
  return response.data
}

export async function updateApplicationStatus(
  jobId: number,
  applicationId: number,
  status: ApplicationStatus
): Promise<JobApplicant> {
  const response = await apiClient.patch<JobApplicant>(
    `/jobs/${jobId}/applications/${applicationId}/status`,
    { status }
  )
  return response.data
}
