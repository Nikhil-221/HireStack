import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createJob, generateJobDescription } from '@/api/jobs'
import { JobForm } from '@/components/jobs/JobForm'
import { emptyJobForm, formValuesToPayload } from '@/utils/job'
import type { JobFormValues } from '@/types/job'

export function CreateJobPage() {
  const navigate = useNavigate()
  const [values, setValues] = useState<JobFormValues>(emptyJobForm)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleGenerateAI = async () => {
    const generated = await generateJobDescription({
      title: values.title,
      department: values.department || undefined,
      location: values.location || undefined,
      employment_type: values.employment_type || undefined,
      experience_required: values.experience_required || undefined,
      salary_min: values.salary_min.trim() ? Number(values.salary_min) : undefined,
      salary_max: values.salary_max.trim() ? Number(values.salary_max) : undefined,
      openings: values.openings.trim() ? Number(values.openings) : undefined,
      description: values.description || undefined,
    })
    setValues((prev) => ({
      ...prev,
      description: generated.description,
      responsibilities: generated.responsibilities,
      required_skills: generated.required_skills,
      preferred_skills: generated.preferred_skills,
      qualifications: generated.qualifications,
    }))
  }

  const handleSubmit = async () => {
    setError(null)
    setIsSubmitting(true)
    try {
      const job = await createJob(formValuesToPayload(values))
      navigate(`/jobs/${job.id}`)
    } catch {
      setError('Could not save job. Please check the form and try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[.16em] text-brand-600">Job management</p>
        <h1 className="page-heading mt-2">Create a new role</h1>
        <p className="page-subtitle">
          Fill in the details manually, or generate a draft with AI first.
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-inset ring-red-200">
          {error}
        </div>
      )}

      <div className="rounded-2xl bg-white p-5 shadow-[0_12px_35px_rgba(15,23,42,.06)] ring-1 ring-slate-200/70 sm:p-7">
        <JobForm
          values={values}
          onChange={setValues}
          onSubmit={handleSubmit}
          submitLabel="Save Job"
          isSubmitting={isSubmitting}
          onGenerateAI={handleGenerateAI}
          secondaryAction={{ label: 'Cancel', onClick: () => navigate('/jobs') }}
        />
      </div>
    </div>
  )
}
