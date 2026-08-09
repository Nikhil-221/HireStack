import { apiClient } from './client'
import type { CandidateApplication, CandidateProfile, CandidateProfilePayload, OpenJob } from '@/types/candidate'

export async function fetchCandidateProfile(): Promise<CandidateProfile> {
  const response = await apiClient.get<CandidateProfile>('/candidate/profile')
  return response.data
}

export async function saveCandidateProfile(payload: CandidateProfilePayload): Promise<CandidateProfile> {
  const response = await apiClient.put<CandidateProfile>('/candidate/profile', payload)
  return response.data
}

export async function fetchOpenJobs(): Promise<OpenJob[]> {
  const response = await apiClient.get<OpenJob[]>('/candidate/jobs')
  return response.data
}

export async function fetchOpenJob(id: number): Promise<OpenJob> {
  const response = await apiClient.get<OpenJob>(`/candidate/jobs/${id}`)
  return response.data
}

export async function applyToJob(jobId: number, resume: File): Promise<CandidateApplication> {
  const form = new FormData()
  form.set('job_id', String(jobId))
  form.set('resume', resume)
  const response = await apiClient.post<CandidateApplication>('/candidate/applications', form)
  return response.data
}

export async function fetchMyApplications(): Promise<CandidateApplication[]> {
  const response = await apiClient.get<CandidateApplication[]>('/candidate/applications')
  return response.data
}
