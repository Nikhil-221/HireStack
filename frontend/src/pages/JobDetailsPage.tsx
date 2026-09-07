import Editor from '@monaco-editor/react'
import axios from 'axios'
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
import { updateApplicationStatus } from '@/api/applications'
import type { ApplicationStatus } from '@/types/candidate'
import { fetchCodingSubmissionDetail, fetchJobCandidatesOverview } from '@/api/codingResults'
import type { CodingSubmissionDetail, JobCandidateOverviewRow } from '@/types/codingResults'

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
  const [overview, setOverview] = useState<JobCandidateOverviewRow[]>([])
  const [isLoadingOverview, setIsLoadingOverview] = useState(true)
  const [overviewSort, setOverviewSort] = useState<OverviewSort>({ key: 'coding', direction: 'desc' })
  const [selectedSubmission, setSelectedSubmission] = useState<CodingSubmissionDetail | null>(null)
  const [submissionIds, setSubmissionIds] = useState<number[]>([])
  const [isLoadingSubmission, setIsLoadingSubmission] = useState(false)
  const [submissionError, setSubmissionError] = useState<string | null>(null)

  useEffect(() => {
    if (!Number.isFinite(jobId)) return
    loadJob()
    loadOverview()
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

  const loadOverview = () => {
    setIsLoadingOverview(true)
    fetchJobCandidatesOverview(jobId)
      .then((data) => setOverview(data.candidates))
      .catch(() => setError('Could not load the candidate score overview.'))
      .finally(() => setIsLoadingOverview(false))
  }

  const handleApplicantStatusChange = async (applicationId: number, status: ApplicationStatus) => {
    try {
      await updateApplicationStatus(jobId, applicationId, status)
      setOverview((current) => current.map((candidate) => candidate.application_id === applicationId ? { ...candidate, status } : candidate))
    } catch {
      setError('Could not update application status.')
    }
  }

  const navigateApplicant = (applicationId: number) => {
    navigate(`/jobs/${jobId}/applicants/${applicationId}`)
  }

  const openSubmission = async (ids: number[]) => {
    if (ids.length === 0) return
    setSubmissionIds(ids)
    setIsLoadingSubmission(true)
    setSubmissionError(null)
    try {
      setSelectedSubmission(await fetchCodingSubmissionDetail(ids[0]))
    } catch (error: unknown) {
      setSubmissionError(axios.isAxiosError(error) && error.response?.status === 503
        ? 'The code evaluator is unavailable right now.'
        : 'Could not load this coding submission.')
    } finally {
      setIsLoadingSubmission(false)
    }
  }

  const selectSubmission = async (submissionId: number) => {
    setIsLoadingSubmission(true)
    setSubmissionError(null)
    try {
      setSelectedSubmission(await fetchCodingSubmissionDetail(submissionId))
    } catch {
      setSubmissionError('Could not load this coding submission.')
    } finally {
      setIsLoadingSubmission(false)
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

      <CandidateScoreOverview
        rows={overview}
        isLoading={isLoadingOverview}
        sort={overviewSort}
        onSort={setOverviewSort}
        onStatusChange={handleApplicantStatusChange}
        onOpenSubmission={openSubmission}
        onOpenApplicant={navigateApplicant}
      />

      {selectedSubmission && (
        <SubmissionDetailDialog
          submission={selectedSubmission}
          submissionIds={submissionIds}
          isLoading={isLoadingSubmission}
          error={submissionError}
          onSelect={selectSubmission}
          onClose={() => { setSelectedSubmission(null); setSubmissionError(null) }}
        />
      )}

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

type OverviewSortKey = 'name' | 'resume' | 'coding' | 'interview'
type OverviewSort = { key: OverviewSortKey; direction: 'asc' | 'desc' }

function CandidateScoreOverview({
  rows,
  isLoading,
  sort,
  onSort,
  onStatusChange,
  onOpenSubmission,
  onOpenApplicant,
}: {
  rows: JobCandidateOverviewRow[]
  isLoading: boolean
  sort: OverviewSort
  onSort: (sort: OverviewSort) => void
  onStatusChange: (applicationId: number, status: ApplicationStatus) => void
  onOpenSubmission: (submissionIds: number[]) => void
  onOpenApplicant: (applicationId: number) => void
}) {
  const sortedRows = [...rows].sort((left, right) => {
    const leftValue = overviewSortValue(left, sort.key)
    const rightValue = overviewSortValue(right, sort.key)
    if (leftValue === rightValue) return left.name.localeCompare(right.name)
    return (leftValue > rightValue ? 1 : -1) * (sort.direction === 'asc' ? 1 : -1)
  })

  const toggleSort = (key: OverviewSortKey) => {
    onSort({ key, direction: sort.key === key && sort.direction === 'desc' ? 'asc' : 'desc' })
  }

  return (
    <section className="overflow-hidden rounded-2xl bg-white shadow-[0_12px_35px_rgba(15,23,42,.06)] ring-1 ring-slate-200/70">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-5">
        <div><p className="text-xs font-bold uppercase tracking-[.16em] text-brand-600">Candidate pool</p><h2 className="mt-1 text-base font-bold text-slate-900">Score overview</h2><p className="mt-1 text-sm text-slate-500">Compare every applicant across the hiring signals for this job.</p></div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{rows.length} applicants</span>
      </div>
      {isLoading ? <p className="px-6 py-8 text-sm text-slate-500">Loading candidate scores…</p> : rows.length === 0 ? <p className="px-6 py-8 text-sm text-slate-500">No applications yet.</p> : <div className="overflow-x-auto"><table className="min-w-[820px] w-full text-left"><thead className="bg-slate-50 text-xs uppercase tracking-[.1em] text-slate-500"><tr><SortableHeader label="Candidate" active={sort.key === 'name'} direction={sort.direction} onClick={() => toggleSort('name')} /><SortableHeader label="Resume ATS" active={sort.key === 'resume'} direction={sort.direction} onClick={() => toggleSort('resume')} /><th className="px-5 py-3 font-bold">Coding test</th><SortableHeader label="Coding score" active={sort.key === 'coding'} direction={sort.direction} onClick={() => toggleSort('coding')} /><SortableHeader label="Interview" active={sort.key === 'interview'} direction={sort.direction} onClick={() => toggleSort('interview')} /><th className="px-5 py-3 font-bold">Application</th></tr></thead><tbody className="divide-y divide-slate-100">{sortedRows.map((row) => { const coding = row.coding_tests[0]; return <tr key={row.application_id} className="transition hover:bg-slate-50/70"><td className="px-5 py-4"><button type="button" onClick={() => onOpenApplicant(row.application_id)} className="text-left"><p className="text-sm font-bold text-slate-900 hover:text-brand-600">{row.name}</p><p className="mt-1 text-xs text-slate-500">{row.email}</p></button></td><td className="px-5 py-4"><ScorePill value={row.resume_score} /></td><td className="px-5 py-4"><div className="text-sm text-slate-700">{coding ? coding.test_title : 'Not invited'}</div><div className="mt-1 text-xs capitalize text-slate-500">{coding?.status.replaceAll('_', ' ') ?? '—'}</div></td><td className="px-5 py-4">{coding?.score !== null && coding?.score !== undefined ? <button type="button" onClick={() => onOpenSubmission(coding.submission_ids)} className="text-sm font-bold text-brand-600 underline decoration-brand-200 underline-offset-4 hover:text-brand-700">{coding.score}%</button> : <span className="text-sm text-slate-400">—</span>}</td><td className="px-5 py-4"><ScorePill value={row.interview_score} /></td><td className="px-5 py-4" onClick={(event) => event.stopPropagation()}><Select id={`overview-status-${row.application_id}`} options={applicationStatusOptions} value={row.status} onChange={(event) => onStatusChange(row.application_id, event.target.value as ApplicationStatus)} /></td></tr> })}</tbody></table></div>}
    </section>
  )
}

function overviewSortValue(row: JobCandidateOverviewRow, key: OverviewSortKey): string | number {
  if (key === 'name') return row.name.toLowerCase()
  if (key === 'resume') return row.resume_score ?? -1
  if (key === 'interview') return row.interview_score ?? -1
  return row.coding_tests[0]?.score ?? -1
}

function SortableHeader({ label, active, direction, onClick }: { label: string; active: boolean; direction: 'asc' | 'desc'; onClick: () => void }) {
  return <th className="px-5 py-3 font-bold"><button type="button" onClick={onClick} className={`inline-flex items-center gap-1 hover:text-slate-900 ${active ? 'text-brand-600' : ''}`}>{label}<span aria-hidden="true">{active ? direction === 'asc' ? '↑' : '↓' : '↕'}</span></button></th>
}

function ScorePill({ value }: { value: number | null }) {
  return value === null ? <span className="text-sm text-slate-400">—</span> : <span className={`inline-flex min-w-12 justify-center rounded-full px-2.5 py-1 text-sm font-bold ${value >= 80 ? 'bg-emerald-50 text-emerald-700' : value >= 60 ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-700'}`}>{value}</span>
}

function SubmissionDetailDialog({
  submission,
  submissionIds,
  isLoading,
  error,
  onSelect,
  onClose,
}: {
  submission: CodingSubmissionDetail
  submissionIds: number[]
  isLoading: boolean
  error: string | null
  onSelect: (submissionId: number) => void
  onClose: () => void
}) {
  return <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/55 p-4" role="dialog" aria-modal="true" aria-label="Coding submission details"><div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"><div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 px-6 py-4"><div><p className="text-xs font-bold uppercase tracking-[.14em] text-brand-600">Coding submission</p><h2 className="mt-1 text-lg font-bold text-slate-900">{submission.candidate.name} · {submission.question.title}</h2></div><div className="flex items-center gap-3"><label className="text-xs font-semibold text-slate-500">Question<select value={submission.id} onChange={(event) => onSelect(Number(event.target.value))} className="ml-2 rounded-lg border border-slate-200 px-2 py-1.5 text-sm text-slate-800">{submissionIds.map((id) => <option key={id} value={id}>Submission #{id}</option>)}</select></label><button type="button" onClick={onClose} className="rounded-lg px-2 py-1 text-2xl leading-none text-slate-400 hover:bg-slate-100 hover:text-slate-900" aria-label="Close details">×</button></div></div>{error && <p className="mx-6 mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}<div className="grid min-h-0 flex-1 overflow-y-auto lg:grid-cols-[minmax(0,1fr)_minmax(280px,38%)]"><div className="min-h-[320px] border-b border-slate-200 lg:border-b-0 lg:border-r"><Editor height="420px" language={submission.language} theme="light" value={submission.code} options={{ readOnly: true, minimap: { enabled: false }, fontSize: 13, automaticLayout: true, scrollBeyondLastLine: false, wordWrap: 'on' }} /></div><div className="overflow-y-auto p-5"><div className={`rounded-xl px-4 py-3 ${submission.verdict === 'accepted' ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'}`}><p className="text-xs font-bold uppercase tracking-[.12em]">Verdict</p><p className="mt-1 text-lg font-bold capitalize">{submission.verdict.replaceAll('_', ' ')}</p><p className="mt-1 text-xs">{submission.passed_cases}/{submission.total_cases} cases passed</p></div><h3 className="mt-5 text-sm font-bold text-slate-900">Test cases</h3><div className="mt-3 flex flex-col gap-3">{submission.results.map((testCase, index) => <article key={`${testCase.input}-${index}`} className="rounded-xl border border-slate-200 p-3"><div className="flex items-center justify-between"><span className="text-xs font-bold text-slate-500">Case {index + 1} · {testCase.is_sample ? 'Sample' : 'Hidden'}</span><span className={testCase.passed ? 'text-xs font-bold text-emerald-700' : 'text-xs font-bold text-red-700'}>{testCase.passed ? 'Passed' : 'Failed'}</span></div><DetailValue label="Input" value={testCase.input} /><DetailValue label="Expected" value={testCase.expected} /><DetailValue label="Actual" value={testCase.actual || 'No output'} /></article>)}</div></div></div>{isLoading && <div className="absolute" aria-live="polite">Loading…</div>}</div></div>
}

function DetailValue({ label, value }: { label: string; value: string }) {
  return <div className="mt-3"><p className="text-[11px] font-bold uppercase tracking-[.1em] text-slate-400">{label}</p><pre className="mt-1 max-h-20 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-slate-50 px-2 py-1.5 font-mono text-xs text-slate-700">{value}</pre></div>
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
