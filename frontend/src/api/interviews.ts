import { apiClient } from './client'

export interface InterviewQuestion {
  id: number
  order_index: number
  question_text: string
  answer_transcript: string | null
}

export interface InterviewSession {
  status: 'not_started' | 'in_progress' | 'completed'
  opened_at: string | null
  expires_at: string
  questions: InterviewQuestion[]
}

export interface InterviewAnswerPayload {
  question_id: number
  transcript: string
}

export interface InterviewInvite {
  id: number
  job_id: number
  candidate_id: number
  token: string
  status: 'not_started' | 'in_progress' | 'completed'
  expires_at: string
  created_at: string
}

export interface InterviewStatus {
  status: InterviewSession['status'] | null
  interview_score: number | null
  interview_session_id: number | null
}

export interface InterviewResultQuestion {
  order_index: number
  question_text: string
  answer_transcript: string | null
  score: number | null
  evaluation_details: {
    feedback: string
    strengths: string[]
    weaknesses: string[]
  } | null
}

export interface InterviewResult {
  id: number
  candidate_name: string
  job_title: string
  status: InterviewSession['status']
  overall_score: number | null
  has_recording: boolean
  questions: InterviewResultQuestion[]
}

export async function createInterviewInvite(jobId: number, candidateId: number): Promise<InterviewInvite> {
  const response = await apiClient.post<InterviewInvite>(
    `/admin/jobs/${jobId}/interview-invite`,
    { candidate_id: candidateId },
  )
  return response.data
}

export async function fetchJobInterviewStatus(jobId: number, candidateId: number): Promise<InterviewStatus> {
  const response = await apiClient.get<InterviewStatus>(
    `/admin/jobs/${jobId}/candidates/${candidateId}/interview-status`,
  )
  return response.data
}

export async function fetchAdminInterviewResult(sessionId: number): Promise<InterviewResult> {
  const response = await apiClient.get<InterviewResult>(`/admin/interview-sessions/${sessionId}`)
  return response.data
}

export async function createAdminInterviewRecordingUrl(sessionId: number): Promise<string> {
  const response = await apiClient.post<{ url: string }>(`/admin/interview-sessions/${sessionId}/recording-url`)
  return response.data.url
}

export async function fetchInterview(token: string): Promise<InterviewSession> {
  const response = await apiClient.get<InterviewSession>(`/candidate/interview/${encodeURIComponent(token)}`)
  return response.data
}

export async function submitInterviewAnswer(token: string, payload: InterviewAnswerPayload): Promise<void> {
  await apiClient.post(`/candidate/interview/${encodeURIComponent(token)}/answer`, payload)
}

export async function endInterview(token: string): Promise<void> {
  await apiClient.post(`/candidate/interview/${encodeURIComponent(token)}/end`)
}

export async function uploadInterviewRecording(token: string, blob: Blob): Promise<void> {
  const form = new FormData()
  form.append('recording', blob, 'interview.webm')
  await apiClient.post(`/candidate/interview/${encodeURIComponent(token)}/upload-recording`, form)
}