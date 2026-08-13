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
        <p className="text-xs font-bold uppercase tracking-[.16em] text-brand-600">Recruiter workspace</p>
        <h1 className="page-heading mt-2">Hiring overview</h1>
        <p className="page-subtitle">A clear view of your job openings and hiring activity.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="Total jobs" value={counts.total} />
        <StatCard label="Open" value={counts.open} />
        <StatCard label="Draft" value={counts.draft} />
        <StatCard label="Closed" value={counts.closed} />
      </div>

      <div className="overflow-hidden rounded-2xl bg-white shadow-[0_12px_35px_rgba(15,23,42,.06)] ring-1 ring-slate-200/70">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <h2 className="text-base font-bold text-slate-900">Recently created</h2>
          <Link to="/jobs" className="text-sm font-bold text-brand-600 hover:text-brand-500">
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
              <li key={job.id} className="flex items-center justify-between px-6 py-4 transition hover:bg-slate-50/80">
                <Link
                  to={`/jobs/${job.id}`}
                  className="text-sm font-semibold text-slate-900 hover:text-brand-600"
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
    <div className="rounded-2xl bg-white p-5 shadow-[0_10px_28px_rgba(15,23,42,.05)] ring-1 ring-slate-200/70 transition duration-200 hover:-translate-y-0.5">
      <p className="text-xs font-bold uppercase tracking-[.12em] text-slate-400">{label}</p>
      <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{value}</p>
    </div>
  )
}
