import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { changeJobStatus, deleteJob, fetchJob, updateJob } from '@/api/jobs'
import { JobForm } from '@/components/jobs/JobForm'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { jobToFormValues, formValuesToPayload } from '@/utils/job'
import type { Job, JobFormValues, JobStatus } from '@/types/job'
import { fetchJobApplicants, updateApplicationStatus } from '@/api/applications'
import type { ApplicationStatus, JobApplicant } from '@/types/candidate'

const statusOptions: { value: JobStatus; label: string }[] = [
  { value: 'Draft', label: 'Draft' },
  { value: 'Open', label: 'Open' },
  { value: 'Closed', label: 'Closed' },
]

export function JobDetailsPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const jobId = Number(id)

  const [job, setJob] = useState<Job | null>(null)
  const [values, setValues] = useState<JobFormValues | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isChangingStatus, setIsChangingStatus] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [applicants, setApplicants] = useState<JobApplicant[]>([])
  const [isLoadingApplicants, setIsLoadingApplicants] = useState(true)

  useEffect(() => {
    if (!Number.isFinite(jobId)) return
    loadJob()
    loadApplicants()
  }, [jobId])

  const loadJob = () => {
    setIsLoading(true)
    fetchJob(jobId)
      .then((data) => {
        setJob(data)
        setValues(jobToFormValues(data))
      })
      .catch(() => setError('Job not found.'))
      .finally(() => setIsLoading(false))
  }

  const loadApplicants = () => {
    setIsLoadingApplicants(true)
    fetchJobApplicants(jobId)
      .then(setApplicants)
      .catch(() => setError('Could not load applicants.'))
      .finally(() => setIsLoadingApplicants(false))
  }

  const handleApplicantStatusChange = async (applicationId: number, status: ApplicationStatus) => {
    try {
      const updated = await updateApplicationStatus(jobId, applicationId, status)
      setApplicants((current) => current.map((applicant) => applicant.id === applicationId ? updated : applicant))
    } catch {
      setError('Could not update application status.')
    }
  }

  const handleSave = async () => {
    if (!values) return
    setIsSubmitting(true)
    setError(null)
    try {
      const updated = await updateJob(jobId, formValuesToPayload(values))
      setJob(updated)
      setValues(jobToFormValues(updated))
      setIsEditing(false)
    } catch {
      setError('Could not save changes.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleStatusChange = async (status: JobStatus) => {
    setIsChangingStatus(true)
    try {
      const updated = await changeJobStatus(jobId, status)
      setJob(updated)
    } catch {
      setError('Could not update status.')
    } finally {
      setIsChangingStatus(false)
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      await deleteJob(jobId)
      navigate('/jobs')
    } catch {
      setError('Could not delete job.')
      setIsDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  if (isLoading) {
    return <p className="text-sm text-slate-500">Loading…</p>
  }

  if (!job || !values) {
    return <p className="text-sm text-red-600">{error ?? 'Job not found.'}</p>
  }

  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <button
            onClick={() => navigate('/jobs')}
            className="text-sm font-semibold text-slate-500 hover:text-brand-600"
          >
            &larr; Back to jobs
          </button>
          <p className="mt-4 text-xs font-bold uppercase tracking-[.16em] text-brand-600">Job details</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{job.title}</h1>
          <div className="mt-2 flex items-center gap-2">
            <StatusBadge status={job.status} />
            <span className="text-sm text-slate-500">
              {job.department} &middot; {job.location}
            </span>
          </div>
        </div>

        {!isEditing && (
          <div className="flex flex-wrap items-center gap-3">
            <Select
              id="status-change"
              options={statusOptions}
              value={job.status}
              disabled={isChangingStatus}
              onChange={(e) => handleStatusChange(e.target.value as JobStatus)}
            />
            <Button variant="secondary" onClick={() => setIsEditing(true)}>
              Edit
            </Button>
            <Button variant="danger" onClick={() => setShowDeleteConfirm(true)}>
              Delete
            </Button>
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-inset ring-red-200">
          {error}
        </div>
      )}

      <div className="rounded-2xl bg-white p-5 shadow-[0_12px_35px_rgba(15,23,42,.06)] ring-1 ring-slate-200/70 sm:p-7">
        {isEditing ? (
          <JobForm
            values={values}
            onChange={setValues}
            onSubmit={handleSave}
            submitLabel="Save changes"
            isSubmitting={isSubmitting}
            secondaryAction={{
              label: 'Cancel',
              onClick: () => {
                setValues(jobToFormValues(job))
                setIsEditing(false)
              },
            }}
          />
        ) : (
          <JobReadOnlyView job={job} />
        )}
      </div>

      <section className="overflow-hidden rounded-2xl bg-white shadow-[0_12px_35px_rgba(15,23,42,.06)] ring-1 ring-slate-200/70">
        <div className="border-b border-slate-100 px-6 py-5">
          <h2 className="text-base font-bold text-slate-900">Applicants</h2>
        </div>
        {isLoadingApplicants ? (
          <p className="px-6 py-5 text-sm text-slate-500">Loading applicants…</p>
        ) : applicants.length === 0 ? (
          <p className="px-6 py-5 text-sm text-slate-500">No applications yet.</p>
        ) : (
          <div className="divide-y divide-slate-200">
            {applicants.map((applicant) => (
              <div key={applicant.id} className="flex flex-wrap items-center justify-between gap-4 px-6 py-5 transition hover:bg-slate-50/70">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{applicant.name}</p>
                  <p className="text-sm text-slate-500">{applicant.email} · {applicant.resume_filename}</p>
                  {applicant.experience && <p className="mt-1 text-xs text-slate-500">{applicant.experience}</p>}
                </div>
                <Select
                  id={`application-status-${applicant.id}`}
                  options={applicationStatusOptions}
                  value={applicant.status}
                  onChange={(event) => handleApplicantStatusChange(applicant.id, event.target.value as ApplicationStatus)}
                />
              </div>
            ))}
          </div>
        )}
      </section>

      <ConfirmDialog
        open={showDeleteConfirm}
        title="Delete this job?"
        description={`This will permanently delete "${job.title}". This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
        isLoading={isDeleting}
      />
    </div>
  )
}

const applicationStatusOptions: { value: ApplicationStatus; label: string }[] = [
  { value: 'Applied', label: 'Applied' },
  { value: 'Shortlisted', label: 'Shortlisted' },
  { value: 'Rejected', label: 'Rejected' },
]

function JobReadOnlyView({ job }: { job: Job }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Detail label="Employment type" value={job.employment_type} />
        <Detail label="Experience required" value={job.experience_required} />
        <Detail label="Openings" value={String(job.openings)} />
        <Detail label="Application deadline" value={formatDeadline(job.deadline)} />
        <Detail
          label="Salary range"
          value={
            job.salary_min || job.salary_max
              ? `${job.salary_min ?? '—'} - ${job.salary_max ?? '—'}`
              : '—'
          }
        />
      </div>

      {job.description && (
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Description</h3>
          <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">{job.description}</p>
        </div>
      )}

      <ListSection title="Responsibilities" items={job.responsibilities} />
      <ListSection title="Required skills" items={job.required_skills} />
      <ListSection title="Preferred skills" items={job.preferred_skills} />
      <ListSection title="Qualifications" items={job.qualifications} />
    </div>
  )
}

function formatDeadline(deadline: string | null) {
  if (!deadline) return 'Not set'
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(
    new Date(`${deadline}T00:00:00`)
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-sm text-slate-900">{value}</p>
    </div>
  )
}

function ListSection({ title, items }: { title: string; items: string[] | null }) {
  if (!items || items.length === 0) return null
  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      <ul className="mt-1 list-inside list-disc text-sm text-slate-600">
        {items.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>
    </div>
  )
}
