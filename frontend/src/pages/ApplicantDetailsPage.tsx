import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { fetchJobApplicants, updateApplicationStatus } from '@/api/applications'
import type { ApplicationStatus, JobApplicant } from '@/types/candidate'

export function ApplicantDetailsPage() {
  const { jobId, applicantId } = useParams<{ jobId: string; applicantId: string }>()
  const navigate = useNavigate()
  const [applicant, setApplicant] = useState<JobApplicant | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!jobId || !applicantId) {
      setError('Invalid applicant route.')
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    fetchJobApplicants(Number(jobId))
      .then((rows) => {
        const selected = rows.find((row) => String(row.id) === applicantId)
        if (!selected) {
          setError('Applicant not found.')
        }
        setApplicant(selected ?? null)
      })
      .catch(() => setError('Could not load applicant details.'))
      .finally(() => setIsLoading(false))
  }, [jobId, applicantId])

  const handleStatusChange = async (status: ApplicationStatus) => {
    if (!applicant || !jobId) return
    setIsUpdating(true)
    setError(null)
    try {
      const updated = await updateApplicationStatus(Number(jobId), applicant.id, status)
      setApplicant(updated)
    } catch {
      setError('Could not update application status.')
    } finally {
      setIsUpdating(false)
    }
  }

  if (isLoading) {
    return <p className="text-sm text-slate-500">Loading applicant details…</p>
  }

  if (!applicant) {
    return <p className="text-sm text-red-600">{error ?? 'Applicant details are unavailable.'}</p>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.16em] text-brand-600">Applicant profile</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">{applicant.name}</h1>
          <p className="mt-1 text-sm text-slate-500">{applicant.email}</p>
        </div>
        <Button type="button" variant="secondary" onClick={() => navigate(-1)}>
          Back to job
        </Button>
      </div>

      {error && <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-inset ring-red-200">{error}</div>}

      <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Contact details</h2>
              <p className="mt-2 text-sm text-slate-600">{applicant.email}</p>
              {applicant.phone ? <p className="mt-1 text-sm text-slate-600">{applicant.phone}</p> : <p className="mt-1 text-sm text-slate-500">Phone not provided</p>}
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Applied</h3>
              <p className="mt-2 text-sm text-slate-600">{formatDate(applicant.applied_at)}</p>
            </div>
            <div className="max-w-xs">
              <h3 className="text-sm font-semibold text-slate-900">Current status</h3>
              <div className="mt-3">
                <Select
                  id="applicant-status"
                  options={applicationStatusOptions}
                  value={applicant.status}
                  disabled={isUpdating}
                  onChange={(event) => handleStatusChange(event.target.value as ApplicationStatus)}
                />
              </div>
            </div>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
            <p className="font-semibold text-slate-900">Application snapshot</p>
            <p className="mt-3">Location: {applicant.location ?? 'Not provided'}</p>
            <p className="mt-2">Experience: {applicant.experience ?? 'Not provided'}</p>
            <p className="mt-2">Resume: {applicant.resume_filename}</p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Resume</h2>
            <p className="mt-2 text-sm text-slate-600">Resume preview/download is reserved for the next implementation phase.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button type="button" variant="secondary" disabled>
              View resume
            </Button>
            <Button type="button" variant="ghost" disabled>
              Download resume
            </Button>
          </div>
        </div>
      </section>

      <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-base font-semibold text-slate-900">Next steps</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-sm font-semibold text-slate-900">Send Coding Round Link</p>
            <p className="mt-2 text-sm text-slate-600">Placeholder UI reserved for sending a coding round link to this candidate.</p>
            <Button type="button" variant="ghost" className="mt-4 border border-slate-200 text-slate-700 hover:bg-slate-100">
              Prepare link
            </Button>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-sm font-semibold text-slate-900">Send Interview Link</p>
            <p className="mt-2 text-sm text-slate-600">Placeholder UI reserved for interview scheduling or link delivery.</p>
            <Button type="button" variant="ghost" className="mt-4 border border-slate-200 text-slate-700 hover:bg-slate-100">
              Prepare interview
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}

const applicationStatusOptions: { value: ApplicationStatus; label: string }[] = [
  { value: 'Applied', label: 'Applied' },
  { value: 'Shortlisted', label: 'Shortlisted' },
  { value: 'Rejected', label: 'Rejected' },
]

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value))
}
