import { apiClient } from './client'
import type { GenerateJDRequest, GenerateJDResponse, Job, JobPayload, JobStatus } from '@/types/job'

export async function fetchJobs(): Promise<Job[]> {
  const response = await apiClient.get<Job[]>('/jobs')
  return response.data
}

export async function fetchJob(id: number): Promise<Job> {
  const response = await apiClient.get<Job>(`/jobs/${id}`)
  return response.data
}

export async function createJob(payload: JobPayload): Promise<Job> {
  const response = await apiClient.post<Job>('/jobs', payload)
  return response.data
}

export async function updateJob(id: number, payload: JobPayload): Promise<Job> {
  const response = await apiClient.put<Job>(`/jobs/${id}`, payload)
  return response.data
}

export async function deleteJob(id: number): Promise<void> {
  await apiClient.delete(`/jobs/${id}`)
}

export async function changeJobStatus(id: number, status: JobStatus): Promise<Job> {
  const response = await apiClient.patch<Job>(`/jobs/${id}/status`, { status })
  return response.data
}

export async function generateJobDescription(
  payload: GenerateJDRequest
): Promise<GenerateJDResponse> {
  const response = await apiClient.post<GenerateJDResponse>('/jobs/generate-jd', payload)
  return response.data
}
