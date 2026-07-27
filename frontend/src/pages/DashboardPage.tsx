import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchJobs } from '@/api/jobs'
import type { Job } from '@/types/job'
import { StatusBadge } from '@/components/ui/StatusBadge'

export function DashboardPage() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchJobs()
      .then(setJobs)
      .finally(() => setIsLoading(false))
  }, [])

  const counts = {
    total: jobs.length,
    open: jobs.filter((job) => job.status === 'Open').length,
    draft: jobs.filter((job) => job.status === 'Draft').length,
    closed: jobs.filter((job) => job.status === 'Closed').length,
  }

  const recentJobs = [...jobs]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5)

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">Overview of your job openings.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Total jobs" value={counts.total} />
        <StatCard label="Open" value={counts.open} />
        <StatCard label="Draft" value={counts.draft} />
        <StatCard label="Closed" value={counts.closed} />
      </div>

      <div className="rounded-lg bg-white shadow-sm ring-1 ring-slate-200">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-900">Recently created</h2>
          <Link to="/jobs" className="text-sm font-medium text-indigo-600 hover:text-indigo-500">
            View all jobs
          </Link>
        </div>
        {isLoading ? (
          <p className="px-5 py-6 text-sm text-slate-500">Loading…</p>
        ) : recentJobs.length === 0 ? (
          <p className="px-5 py-6 text-sm text-slate-500">No jobs created yet.</p>
        ) : (
          <ul className="divide-y divide-slate-200">
            {recentJobs.map((job) => (
              <li key={job.id} className="flex items-center justify-between px-5 py-3">
                <Link
                  to={`/jobs/${job.id}`}
                  className="text-sm font-medium text-slate-900 hover:text-indigo-600"
                >
                  {job.title}
                </Link>
                <StatusBadge status={job.status} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  )
}
