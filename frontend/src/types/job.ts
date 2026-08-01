export type JobStatus = 'Draft' | 'Open' | 'Closed'

export interface Job {
  id: number
  title: string
  department: string
  location: string
  employment_type: string
  experience_required: string
  salary_min: number | null
  salary_max: number | null
  openings: number
  description: string | null
  responsibilities: string[] | null
  required_skills: string[] | null
  preferred_skills: string[] | null
  qualifications: string[] | null
  status: JobStatus
  created_at: string
  updated_at: string
}

export interface JobFormValues {
  title: string
  department: string
  location: string
  employment_type: string
  experience_required: string
  salary_min: string
  salary_max: string
  openings: string
  description: string
  responsibilities: string[]
  required_skills: string[]
  preferred_skills: string[]
  qualifications: string[]
}

export interface JobPayload {
  title: string
  department: string
  location: string
  employment_type: string
  experience_required: string
  salary_min: number | null
  salary_max: number | null
  openings: number
  description: string | null
  responsibilities: string[]
  required_skills: string[]
  preferred_skills: string[]
  qualifications: string[]
}

export interface GenerateJDRequest {
  title: string
  department?: string
  location?: string
  employment_type?: string
  experience_required?: string
  salary_min?: number
  salary_max?: number
  openings?: number
  description?: string
}

export interface GenerateJDResponse {
  description: string
  responsibilities: string[]
  required_skills: string[]
  preferred_skills: string[]
  qualifications: string[]
}
