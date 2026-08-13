import { apiClient } from './client'
import type { ApplicationStatus, JobApplicant } from '@/types/candidate'

export interface ResumeScreeningDetails {
  matched_skills: string[]
  missing_skills: string[]
  experience_fit: string
  summary: string
}

export interface Candidate {
  id: number
  application_id: number
  candidate_id: number
  name: string
  email: string
  job_title: string
  job_id: number
  resume_screening_score: number | null
  resume_screening_details: ResumeScreeningDetails | null
  coding_round_score: number | null
  interview_score: number | null
  status: ApplicationStatus
  applied_at: string
}

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

export async function fetchResumeForView(jobId: number, applicationId: number): Promise<Blob> {
  const response = await apiClient.get(
    `/jobs/${jobId}/applications/${applicationId}/resume/view`,
    { responseType: 'blob' }
  )
  return response.data
}

export async function fetchResumeForDownload(jobId: number, applicationId: number): Promise<Blob> {
  const response = await apiClient.get(
    `/jobs/${jobId}/applications/${applicationId}/resume/download`,
    { responseType: 'blob' }
  )
  return response.data
}

export async function fetchAllCandidates(jobId?: number): Promise<Candidate[]> {
  const params = jobId ? { job_id: jobId } : {}
  const response = await apiClient.get<Candidate[]>('/jobs/admin/candidates', { params })
  return response.data
}
