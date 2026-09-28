import axios from 'axios'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { fetchCodingTests, inviteCandidate } from '@/api/codingTests'
import {
  createInterviewInvite,
  fetchAdminInterviewRecording,
  fetchAdminInterviewResult,
  fetchJobInterviewStatus,
  type InterviewResult,
} from '@/api/interviews'
import { fetchJobApplicants, updateApplicationStatus, fetchResumeForView, fetchResumeForDownload } from '@/api/applications'
import type { ApplicationStatus, JobApplicant } from '@/types/candidate'
import type { CodingTest } from '@/types/codingTest'

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
  const [codingTests, setCodingTests] = useState<CodingTest[]>([])
  const [selectedCodingTestId, setSelectedCodingTestId] = useState('')
  const [isInviting, setIsInviting] = useState(false)
  const [inviteMessage, setInviteMessage] = useState<string | null>(null)
  const [interviewStatus, setInterviewStatus] = useState<'loading' | 'unavailable' | 'not_started' | 'in_progress' | 'completed' | 'none'>('loading')
  const [interviewSessionId, setInterviewSessionId] = useState<number | null>(null)
  const [interviewResult, setInterviewResult] = useState<InterviewResult | null>(null)
  const [isLoadingInterviewResult, setIsLoadingInterviewResult] = useState(false)
  const [interviewResultError, setInterviewResultError] = useState<string | null>(null)
  const [interviewRecordingUrl, setInterviewRecordingUrl] = useState<string | null>(null)
  const [interviewRecordingError, setInterviewRecordingError] = useState<string | null>(null)
  const [isInterviewInviting, setIsInterviewInviting] = useState(false)
  const [interviewMessage, setInterviewMessage] = useState<string | null>(null)

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

  const interviewCandidateId = applicant?.candidate_id

  useEffect(() => {
    if (!jobId || interviewCandidateId === undefined) return
    let isCancelled = false
    setInterviewStatus('loading')
    fetchJobInterviewStatus(Number(jobId), interviewCandidateId)
      .then((result) => {
        if (isCancelled) return
        setInterviewStatus(result.status ?? 'none')
        setInterviewSessionId(result.interview_session_id)
      })
      .catch(() => {
        if (isCancelled) return
        setInterviewStatus('unavailable')
        setInterviewSessionId(null)
      })
    return () => { isCancelled = true }
  }, [jobId, interviewCandidateId])

  useEffect(() => {
    if (interviewStatus !== 'completed' || interviewSessionId === null) {
      setInterviewResult(null)
      setInterviewResultError(null)
      return
    }
    let isCancelled = false
    setIsLoadingInterviewResult(true)
    setInterviewResultError(null)
    fetchAdminInterviewResult(interviewSessionId)
      .then((result) => {
        if (!isCancelled) setInterviewResult(result)
      })
      .catch(() => {
        if (!isCancelled) setInterviewResultError('Could not load interview results.')
      })
      .finally(() => {
        if (!isCancelled) setIsLoadingInterviewResult(false)
      })
    return () => { isCancelled = true }
  }, [interviewSessionId, interviewStatus])

  useEffect(() => {
    if (interviewStatus === 'completed' && window.location.hash === '#interview-results') {
      document.getElementById('interview-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [interviewStatus])

  useEffect(() => {
    if (!interviewResult?.has_recording) {
      setInterviewRecordingUrl(null)
      return
    }
    let isCancelled = false
    let objectUrl: string | null = null
    setInterviewRecordingError(null)
    fetchAdminInterviewRecording(interviewResult.id)
      .then((blob) => {
        if (isCancelled) return
        objectUrl = URL.createObjectURL(blob)
        setInterviewRecordingUrl(objectUrl)
      })
      .catch(() => {
        if (!isCancelled) setInterviewRecordingError('Could not load the interview recording.')
      })
    return () => {
      isCancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [interviewResult?.has_recording, interviewResult?.id])

  useEffect(() => {
    if (!jobId) return
    fetchCodingTests()
      .then((tests) => {
        const matchingTests = tests.filter((test) => test.job_id === null || test.job_id === Number(jobId))
        setCodingTests(matchingTests)
        setSelectedCodingTestId((current) => current || (matchingTests[0] ? String(matchingTests[0].id) : ''))
      })
      .catch(() => setInviteMessage('Could not load coding tests for this job.'))
  }, [jobId])

  const handleInvite = async () => {
    if (!applicant || !selectedCodingTestId) return
    setIsInviting(true)
    setInviteMessage(null)
    try {
      await inviteCandidate(Number(selectedCodingTestId), applicant.candidate_id)
      setInviteMessage(`Invite sent to ${applicant.name}.`)
    } catch {
      setInviteMessage('Could not send the coding test invite.')
    } finally {
      setIsInviting(false)
    }
  }

  const handleInterviewInvite = async () => {
    if (!applicant || !jobId || interviewStatus === 'completed') return
    setIsInterviewInviting(true)
    setInterviewMessage(null)
    try {
      const invite = await createInterviewInvite(Number(jobId), applicant.candidate_id)
      setInterviewSessionId(invite.id)
      setInterviewStatus('not_started')
      setInterviewMessage(`Interview invite sent to ${applicant.name}`)
    } catch (requestError: unknown) {
      if (axios.isAxiosError(requestError) && requestError.response?.status === 409) {
        setInterviewMessage('An interview invite is already active for this candidate')
      } else {
        setInterviewMessage('Could not send the interview invite. Please try again.')
      }
    } finally {
      setIsInterviewInviting(false)
    }
  }

  const retryInterviewStatus = async () => {
    if (!jobId || !applicant) return
    setInterviewStatus('loading')
    try {
      const result = await fetchJobInterviewStatus(Number(jobId), applicant.candidate_id)
      setInterviewStatus(result.status ?? 'none')
      setInterviewSessionId(result.interview_session_id)
    } catch {
      setInterviewStatus('unavailable')
      setInterviewSessionId(null)
    }
  }

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

      {interviewStatus === 'completed' && <section id="interview-results" className="scroll-mt-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.16em] text-brand-600">Interview results</p>
            <h2 className="mt-2 text-base font-semibold text-slate-900">{interviewResult?.candidate_name ?? applicant.name} · {interviewResult?.job_title ?? 'Interview'}</h2>
            <p className="mt-1 text-sm capitalize text-slate-500">Status: {interviewResult?.status ?? 'completed'}</p>
          </div>
          <div className="rounded-xl bg-emerald-50 px-4 py-3 text-right ring-1 ring-emerald-200">
            <p className="text-xs uppercase tracking-[.12em] text-emerald-700">Overall score</p>
            <p className="mt-1 text-2xl font-bold text-emerald-800">{interviewResult?.overall_score ?? '—'}<span className="ml-1 text-sm font-semibold">/100</span></p>
          </div>
        </div>
        {isLoadingInterviewResult && <p className="mt-5 text-sm text-slate-500">Loading interview results…</p>}
        {interviewResultError && <p className="mt-5 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{interviewResultError}</p>}
        {interviewResult && <>
          <div className="mt-5 space-y-4">
            {interviewResult.questions.map((question) => {
              const evaluation = question.evaluation_details
              return <article key={question.order_index} className="rounded-xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[.12em] text-slate-500">Question {question.order_index + 1}</p>
                    <h3 className="mt-1 text-sm font-semibold leading-6 text-slate-900">{question.question_text}</h3>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-[11px] font-bold uppercase tracking-[.1em] text-slate-500">Score</p>
                    <p className="mt-1 text-lg font-bold text-slate-900">{question.score ?? '—'}<span className="ml-1 text-xs font-medium text-slate-500">/100</span></p>
                  </div>
                </div>
                <div className="grid gap-4 border-t border-slate-200 pt-4 md:grid-cols-[minmax(0,1fr)_110px]">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[.1em] text-slate-500">Transcript</p>
                    <p className={`mt-2 whitespace-pre-wrap text-sm leading-6 ${question.answer_transcript?.trim() ? 'text-slate-700' : 'italic text-slate-500'}`}>
                      {question.answer_transcript?.trim() || 'Not answered'}
                    </p>
                  </div>
                  <div className="md:border-l md:border-slate-200 md:pl-4">
                    <p className="text-xs font-semibold uppercase tracking-[.1em] text-slate-500">Answer score</p>
                    <p className="mt-2 text-2xl font-bold text-brand-700">{question.score ?? '—'}<span className="ml-1 text-xs font-semibold text-slate-500">/100</span></p>
                  </div>
                </div>
                {evaluation && <div className="mt-4 grid gap-4 border-t border-slate-200 pt-4 md:grid-cols-3">
                  <div className="md:col-span-3">
                    <p className="text-xs font-semibold uppercase tracking-[.1em] text-slate-500">Feedback</p>
                    <p className="mt-1 text-sm leading-6 text-slate-700">{evaluation.feedback || 'No feedback provided.'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[.1em] text-slate-500">Strengths</p>
                    {evaluation.strengths.length ? <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">{evaluation.strengths.map((strength, index) => <li key={`${question.order_index}-strength-${index}`}>{strength}</li>)}</ul> : <p className="mt-1 text-sm text-slate-500">None recorded</p>}
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[.1em] text-slate-500">Areas to improve</p>
                    {evaluation.weaknesses.length ? <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">{evaluation.weaknesses.map((weakness, index) => <li key={`${question.order_index}-weakness-${index}`}>{weakness}</li>)}</ul> : <p className="mt-1 text-sm text-slate-500">None recorded</p>}
                  </div>
                </div>}
              </article>
            })}
          </div>
          <div className="mt-6 border-t border-slate-200 pt-5">
            <h3 className="text-sm font-semibold text-slate-900">Interview recording</h3>
            {!interviewResult.has_recording ? <p className="mt-2 text-sm text-slate-500">No recording is available.</p>
              : interviewRecordingError ? <p className="mt-2 text-sm text-red-700">{interviewRecordingError}</p>
                : interviewRecordingUrl ? <video controls playsInline src={interviewRecordingUrl} className="mt-3 aspect-video max-h-[560px] w-full rounded-xl bg-black" />
                  : <p className="mt-2 text-sm text-slate-500">Loading recording…</p>}
          </div>
        </>}
      </section>}

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
            <p className="mt-2 text-sm text-slate-600">Choose a coding test tied to this job and send the candidate an invitation.</p>
            {inviteMessage && <p className={`mt-3 text-sm ${inviteMessage.startsWith('Invite sent') ? 'text-emerald-700' : 'text-red-700'}`}>{inviteMessage}</p>}
            {codingTests.length > 0 ? <>
              <div className="mt-4">
                <Select
                  id="coding-test-to-invite"
                  label="Coding test"
                  options={codingTests.map((test) => ({ value: String(test.id), label: `${test.title} · ${test.duration_minutes} min` }))}
                  value={selectedCodingTestId}
                  onChange={(event) => setSelectedCodingTestId(event.target.value)}
                />
              </div>
              <Button type="button" className="mt-4" onClick={handleInvite} disabled={isInviting || !selectedCodingTestId}>
                {isInviting ? 'Sending…' : 'Send invite'}
              </Button>
            </> : <p className="mt-4 text-sm text-slate-500">No coding tests are available for this job yet.</p>}
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-sm font-semibold text-slate-900">Send Interview Link</p>
            <p className="mt-2 text-sm text-slate-600">Send an AI interview invitation for this application.</p>
            {interviewStatus === 'completed' ? (
              <p className="mt-4 inline-flex rounded-lg bg-emerald-100 px-3 py-2 text-sm font-semibold text-emerald-800">Interview completed</p>
            ) : <>
              {interviewMessage && <p className={`mt-3 text-sm ${interviewMessage.startsWith('Interview invite sent') ? 'text-emerald-700' : 'text-red-700'}`} role="status">{interviewMessage}</p>}
              {interviewStatus === 'unavailable' && <div className="mt-3"><p className="text-sm text-amber-700">Could not check interview status.</p><Button type="button" variant="ghost" className="mt-2 border border-slate-200 text-slate-700 hover:bg-slate-100" onClick={() => void retryInterviewStatus()}>Retry status check</Button></div>}
              {interviewStatus !== 'unavailable' && <Button type="button" variant="ghost" className="mt-4 border border-slate-200 text-slate-700 hover:bg-slate-100" onClick={() => void handleInterviewInvite()} disabled={isInterviewInviting || interviewStatus === 'loading'}>
                {interviewStatus === 'loading' ? 'Checking status…' : isInterviewInviting ? 'Sending…' : 'Send interview invite'}
              </Button>}
            </>}
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
