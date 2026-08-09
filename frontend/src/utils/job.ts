import type { Job, JobFormValues, JobPayload } from '@/types/job'

export const emptyJobForm: JobFormValues = {
  title: '',
  department: '',
  location: '',
  employment_type: 'Full-time',
  experience_required: '',
  salary_min: '',
  salary_max: '',
  openings: '1',
  deadline: '',
  description: '',
  responsibilities: [],
  required_skills: [],
  preferred_skills: [],
  qualifications: [],
}

export function jobToFormValues(job: Job): JobFormValues {
  return {
    title: job.title,
    department: job.department,
    location: job.location,
    employment_type: job.employment_type,
    experience_required: job.experience_required,
    salary_min: job.salary_min !== null ? String(job.salary_min) : '',
    salary_max: job.salary_max !== null ? String(job.salary_max) : '',
    openings: String(job.openings),
    deadline: job.deadline ?? '',
    description: job.description ?? '',
    responsibilities: job.responsibilities ?? [],
    required_skills: job.required_skills ?? [],
    preferred_skills: job.preferred_skills ?? [],
    qualifications: job.qualifications ?? [],
  }
}

export function formValuesToPayload(values: JobFormValues): JobPayload {
  return {
    title: values.title.trim(),
    department: values.department.trim(),
    location: values.location.trim(),
    employment_type: values.employment_type,
    experience_required: values.experience_required.trim(),
    salary_min: values.salary_min.trim() ? Number(values.salary_min) : null,
    salary_max: values.salary_max.trim() ? Number(values.salary_max) : null,
    openings: values.openings.trim() ? Number(values.openings) : 1,
    deadline: values.deadline,
    description: values.description.trim() ? values.description.trim() : null,
    responsibilities: values.responsibilities,
    required_skills: values.required_skills,
    preferred_skills: values.preferred_skills,
    qualifications: values.qualifications,
  }
}
