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
      employment_type: values.employment_type || undefined,
      experience_required: values.experience_required || undefined,
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
        <h1 className="text-2xl font-semibold text-slate-900">Create Job</h1>
        <p className="mt-1 text-sm text-slate-500">
          Fill in the details manually, or generate a draft with AI first.
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-inset ring-red-200">
          {error}
        </div>
      )}

      <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-slate-200">
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
