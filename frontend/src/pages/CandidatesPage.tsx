import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { fetchAllCandidates } from '@/api/applications'
import type { Candidate } from '@/api/applications'
import type { ApplicationStatus } from '@/types/candidate'

interface JobOption {
  value: string
  label: string
}

export function CandidatesPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [filteredCandidates, setFilteredCandidates] = useState<Candidate[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedCandidates, setSelectedCandidates] = useState<Set<number>>(new Set())
  const [filterJobId, setFilterJobId] = useState<string>('all')
  const [jobOptions, setJobOptions] = useState<JobOption[]>([])
  const [toast, setToast] = useState<{ message: string; type: 'info' | 'success' } | null>(null)

  // Fetch candidates on mount
  useEffect(() => {
    setIsLoading(true)
    fetchAllCandidates()
      .then((data) => {
        setCandidates(data)
        setFilteredCandidates(data)
        
        // Build unique job options from candidates
        const jobs = new Map<number, string>()
        data.forEach((c) => {
          if (!jobs.has(c.job_id)) {
            jobs.set(c.job_id, c.job_title)
          }
        })
        
        const options: JobOption[] = []
        jobs.forEach((title, id) => {
          options.push({ value: String(id), label: title })
        })
        setJobOptions(options.sort((a, b) => a.label.localeCompare(b.label)))
      })
      .catch(() => setError('Could not load candidates.'))
      .finally(() => setIsLoading(false))
  }, [])

  // Filter candidates when job filter changes
  useEffect(() => {
    if (filterJobId === 'all') {
      setFilteredCandidates(candidates)
    } else {
      setFilteredCandidates(candidates.filter((c) => c.job_id === Number(filterJobId)))
    }
    setSelectedCandidates(new Set())
  }, [filterJobId, candidates])

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedCandidates(new Set(filteredCandidates.map((c) => c.id)))
    } else {
      setSelectedCandidates(new Set())
    }
  }

  const handleSelectCandidate = (id: number, checked: boolean) => {
    const newSelected = new Set(selectedCandidates)
    if (checked) {
      newSelected.add(id)
    } else {
      newSelected.delete(id)
    }
    setSelectedCandidates(newSelected)
  }

  const handleSendCodingRound = () => {
    setToast({ message: 'Sending coding rounds is coming soon!', type: 'info' })
  }

  const handleSendInterview = () => {
    setToast({ message: 'Sending interview rounds is coming soon!', type: 'info' })
  }

  if (isLoading) {
    return <p className="text-sm text-slate-500">Loading candidates…</p>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.16em] text-brand-600">Recruiting</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">All Candidates</h1>
        </div>
      </div>

      {error && <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-inset ring-red-200">{error}</div>}
      {toast && (
        <div className={`rounded-md px-4 py-3 text-sm ring-1 ring-inset ${
          toast.type === 'success' 
            ? 'bg-green-50 text-green-700 ring-green-200' 
            : 'bg-blue-50 text-blue-700 ring-blue-200'
        }`}>
          {toast.message}
        </div>
      )}

      {/* Filter section */}
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="max-w-xs">
          <label className="text-sm font-semibold text-slate-900">Filter by Job</label>
          <div className="mt-2">
            <select
              value={filterJobId}
              onChange={(e) => setFilterJobId(e.target.value)}
              className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 shadow-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            >
              <option value="all">All Jobs</option>
              {jobOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Candidates table */}
      <div className="overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
        <table className="w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left">
                <input
                  type="checkbox"
                  checked={selectedCandidates.size > 0 && selectedCandidates.size === filteredCandidates.length}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="rounded border-slate-300"
                />
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-900">Name</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-900">Email</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-900">Job</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-900">Applied</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-900">Resume Score</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-900">Coding Score</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-900">Interview Score</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-900">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filteredCandidates.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-6 py-8 text-center text-sm text-slate-500">
                  No candidates found.
                </td>
              </tr>
            ) : (
              filteredCandidates.map((candidate) => (
                <tr key={candidate.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedCandidates.has(candidate.id)}
                      onChange={(e) => handleSelectCandidate(candidate.id, e.target.checked)}
                      className="rounded border-slate-300"
                    />
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-slate-900">{candidate.name}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{candidate.email}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{candidate.job_title}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{formatDate(candidate.applied_at)}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {candidate.resume_screening_score !== null
                      ? <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">{candidate.resume_screening_score}</span>
                      : <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700">Scoring in progress</span>}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {candidate.coding_round_score !== null ? candidate.coding_round_score : 'Not scored'}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {candidate.interview_score !== null ? candidate.interview_score : 'Not scored'}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${getStatusColor(candidate.status)}`}>
                      {candidate.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Action bar for multi-select */}
      {selectedCandidates.size > 0 && (
        <div className="sticky bottom-0 flex items-center justify-between rounded-2xl bg-white p-6 shadow-lg ring-1 ring-slate-200">
          <p className="text-sm font-medium text-slate-900">
            {selectedCandidates.size} candidate{selectedCandidates.size !== 1 ? 's' : ''} selected
          </p>
          <div className="flex gap-3">
            <Button type="button" variant="secondary" onClick={handleSendCodingRound}>
              Send Coding Round
            </Button>
            <Button type="button" variant="ghost" onClick={handleSendInterview}>
              Send Interview Round
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value))
}

function getStatusColor(status: ApplicationStatus): string {
  switch (status) {
    case 'Applied':
      return 'bg-blue-100 text-blue-800'
    case 'Shortlisted':
      return 'bg-green-100 text-green-800'
    case 'Rejected':
      return 'bg-red-100 text-red-800'
    default:
      return 'bg-slate-100 text-slate-800'
  }
}
