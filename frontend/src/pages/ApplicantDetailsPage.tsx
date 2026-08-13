import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { fetchJobApplicants, updateApplicationStatus, fetchResumeForView, fetchResumeForDownload } from '@/api/applications'
import type { ApplicationStatus, JobApplicant } from '@/types/candidate'

export function ApplicantDetailsPage() {
  const { jobId, applicantId } = useParams<{ jobId: string; applicantId: string }>()
  const navigate = useNavigate()
  const [applicant, setApplicant] = useState<JobApplicant | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resumeError, setResumeError] = useState<string | null>(null)
  const [isViewingResume, setIsViewingResume] = useState(false)
  const [isDownloadingResume, setIsDownloadingResume] = useState(false)
  const [isResumeDetailsOpen, setIsResumeDetailsOpen] = useState(false)

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

  const handleViewResume = async () => {
    if (!applicant || !jobId) return
    
    const fileExt = applicant.resume_filename.toLowerCase().slice(applicant.resume_filename.lastIndexOf('.'))
    
    // Only PDFs can be previewed in-browser
    if (fileExt !== '.pdf') {
      setResumeError('Preview unavailable for this file type. Please download instead.')
      return
    }

    setIsViewingResume(true)
    setResumeError(null)
    
    try {
      const blob = await fetchResumeForView(Number(jobId), applicant.id)
      const objectUrl = URL.createObjectURL(blob)
      window.open(objectUrl, '_blank')
      
      // Clean up the object URL after a delay to allow the browser to read it
      setTimeout(() => {
        URL.revokeObjectURL(objectUrl)
      }, 1000)
    } catch (err: unknown) {
      const axiosError = err as { response?: { status: number }; message?: string }
      if (axiosError?.response?.status === 401) {
        setResumeError('Session expired, please log in again.')
      } else {
        setResumeError('Could not load resume. Please try again.')
      }
    } finally {
      setIsViewingResume(false)
    }
  }

  const handleDownloadResume = async () => {
    if (!applicant || !jobId) return
    
    setIsDownloadingResume(true)
    setResumeError(null)
    
    try {
      const blob = await fetchResumeForDownload(Number(jobId), applicant.id)
      const objectUrl = URL.createObjectURL(blob)
      
      const link = document.createElement('a')
      link.href = objectUrl
      link.download = applicant.resume_filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      // Clean up the object URL after a delay
      setTimeout(() => {
        URL.revokeObjectURL(objectUrl)
      }, 1000)
    } catch (err: unknown) {
      const axiosError = err as { response?: { status: number }; message?: string }
      if (axiosError?.response?.status === 401) {
        setResumeError('Session expired, please log in again.')
      } else {
        setResumeError('Could not download resume. Please try again.')
      }
    } finally {
      setIsDownloadingResume(false)
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
            {resumeError && (
              <p className="mt-2 text-sm text-amber-700">{resumeError}</p>
            )}
          </div>
          <div className="flex flex-wrap gap-3">
            <Button 
              type="button" 
              variant="secondary" 
              onClick={handleViewResume}
              disabled={isViewingResume || isDownloadingResume}
            >
              {isViewingResume ? 'Loading…' : 'View resume'}
            </Button>
            <Button 
              type="button" 
              variant="ghost" 
              onClick={handleDownloadResume}
              disabled={isViewingResume || isDownloadingResume}
            >
              {isDownloadingResume ? 'Downloading…' : 'Download resume'}
            </Button>
          </div>
        </div>
      </section>

      <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.16em] text-brand-600">ATS score</p>
            <h2 className="mt-2 text-base font-semibold text-slate-900">Resume screening</h2>
          </div>
          <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-right ring-1 ring-emerald-200">
            <p className="text-xs uppercase tracking-[.16em] text-emerald-700">Overall</p>
            <p className="mt-1 text-2xl font-bold text-emerald-800">
              {applicant.resume_screening_score !== null ? applicant.resume_screening_score : '—'}
            </p>
          </div>
        </div>

        {!applicant.resume_screening_score && applicant.resume_screening_score !== 0 ? (
          <p className="mt-4 text-sm text-amber-700">Score unavailable. Scoring is still in progress or failed.</p>
        ) : (
          <div className="mt-5">
            <button
              type="button"
              onClick={() => setIsResumeDetailsOpen((current) => !current)}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              {isResumeDetailsOpen ? 'Hide details' : 'View details'}
              <span aria-hidden="true">{isResumeDetailsOpen ? '−' : '+'}</span>
            </button>

            {isResumeDetailsOpen && (
              <div className="mt-4 space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[.12em] text-slate-500">Matched skills</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(applicant.resume_screening_details?.matched_skills?.length ? applicant.resume_screening_details.matched_skills : ['No skills matched']).map((skill) => (
                      <span key={skill} className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-800">{skill}</span>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[.12em] text-slate-500">Missing skills</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(applicant.resume_screening_details?.missing_skills?.length ? applicant.resume_screening_details.missing_skills : ['No gaps reported']).map((skill) => (
                      <span key={skill} className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800">{skill}</span>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[.12em] text-slate-500">Experience fit</p>
                  <p className="mt-2 text-sm text-slate-700">{applicant.resume_screening_details?.experience_fit || 'No experience summary available.'}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[.12em] text-slate-500">Summary</p>
                  <p className="mt-2 text-sm text-slate-700">{applicant.resume_screening_details?.summary || 'No summary available.'}</p>
                </div>
              </div>
            )}
          </div>
        )}
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
