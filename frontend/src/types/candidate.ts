import type { Job } from './job'

export interface CandidateProfile {
  id: number
  user_id: number
  name: string
  email: string
  phone: string | null
  location: string | null
  education: string | null
  experience: string | null
  skills: string[]
  updated_at: string
}

export interface CandidateProfilePayload {
  phone: string | null
  location: string | null
  education: string | null
  experience: string | null
  skills: string[]
}

export type ApplicationStatus = 'Applied' | 'Shortlisted' | 'Rejected'

export interface CandidateApplication {
  id: number
  job_id: number
  job_title: string
  job_location: string
  job_deadline: string | null
  resume_filename: string
  status: ApplicationStatus
  applied_at: string
  updated_at: string
}

export interface ResumeScreeningDetails {
  matched_skills: string[]
  missing_skills: string[]
  experience_fit: string
  summary: string
}

export interface JobApplicant {
  id: number
  candidate_id: number
  name: string
  email: string
  phone: string | null
  location: string | null
  experience: string | null
  resume_filename: string
  resume_screening_score: number | null
  resume_screening_details: ResumeScreeningDetails | null
  status: ApplicationStatus
  applied_at: string
  updated_at: string
}

export type OpenJob = Job
