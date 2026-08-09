import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { fetchJobs } from '@/api/jobs'
import type { Job, JobStatus } from '@/types/job'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { StatusBadge } from '@/components/ui/StatusBadge'

const statusFilterOptions = [
  { value: 'All', label: 'All statuses' },
  { value: 'Draft', label: 'Draft' },
  { value: 'Open', label: 'Open' },
  { value: 'Closed', label: 'Closed' },
]

export function JobsPage() {
  const navigate = useNavigate()
  const [jobs, setJobs] = useState<Job[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<JobStatus | 'All'>('All')

  useEffect(() => {
    loadJobs()
  }, [])

  const loadJobs = () => {
    setIsLoading(true)
    setError(null)
    fetchJobs()
      .then(setJobs)
      .catch(() => setError('Could not load jobs.'))
      .finally(() => setIsLoading(false))
  }

  const filteredJobs = useMemo(() => {
    const query = search.trim().toLowerCase()
    return jobs.filter((job) => {
      const matchesStatus = statusFilter === 'All' || job.status === statusFilter
      const matchesSearch =
        !query ||
        job.title.toLowerCase().includes(query) ||
        job.department.toLowerCase().includes(query) ||
        job.location.toLowerCase().includes(query)
      return matchesStatus && matchesSearch
    })
  }, [jobs, search, statusFilter])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.16em] text-brand-600">Job management</p>
          <h1 className="page-heading mt-2">Open positions</h1>
          <p className="page-subtitle">Create, publish, and manage every role in one place.</p>
        </div>
        <Button onClick={() => navigate('/jobs/new')}>Create Job</Button>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/70 sm:flex-row sm:items-end sm:gap-4">
        <div className="flex-1">
          <Input
            id="search"
            label="Search"
            placeholder="Search by title, department or location"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="sm:w-56">
          <Select
            id="status-filter"
            label="Status"
            options={statusFilterOptions}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as JobStatus | 'All')}
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl bg-white shadow-[0_12px_35px_rgba(15,23,42,.06)] ring-1 ring-slate-200/70">
        {isLoading ? (
          <p className="px-5 py-6 text-sm text-slate-500">Loading jobs…</p>
        ) : error ? (
          <p className="px-5 py-6 text-sm text-red-600">{error}</p>
        ) : filteredJobs.length === 0 ? (
          <p className="px-5 py-6 text-sm text-slate-500">No jobs match your filters.</p>
        ) : (
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50/80">
              <tr>
                <Th>Title</Th>
                <Th>Department</Th>
                <Th>Location</Th>
                <Th>Type</Th>
                <Th>Openings</Th>
                <Th>Deadline</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {filteredJobs.map((job) => (
                <tr
                  key={job.id}
                  onClick={() => navigate(`/jobs/${job.id}`)}
                  className="cursor-pointer transition hover:bg-brand-50/40"
                >
                  <td className="whitespace-nowrap px-5 py-3 text-sm font-medium text-slate-900">
                    <Link to={`/jobs/${job.id}`} className="hover:text-brand-600">
                      {job.title}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-5 py-3 text-sm text-slate-600">
                    {job.department}
                  </td>
                  <td className="whitespace-nowrap px-5 py-3 text-sm text-slate-600">
                    {job.location}
                  </td>
                  <td className="whitespace-nowrap px-5 py-3 text-sm text-slate-600">
                    {job.employment_type}
                  </td>
                  <td className="whitespace-nowrap px-5 py-3 text-sm text-slate-600">
                    {job.openings}
                  </td>
                  <td className="whitespace-nowrap px-5 py-3 text-sm text-slate-600">
                    {formatDeadline(job.deadline)}
                  </td>
                  <td className="whitespace-nowrap px-5 py-3 text-sm">
                    <StatusBadge status={job.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function formatDeadline(deadline: string | null) {
  if (!deadline) return 'Not set'
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(
    new Date(`${deadline}T00:00:00`)
  )
}

function Th({ children }: { children: string }) {
  return (
    <th className="px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-[.12em] text-slate-400">
      {children}
    </th>
  )
}
