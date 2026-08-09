import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchOpenJobs } from '@/api/candidate'
import type { OpenJob } from '@/types/candidate'

export function CandidateJobsPage() {
  const [jobs, setJobs] = useState<OpenJob[]>([])
  const [isLoading, setIsLoading] = useState(true)
  useEffect(() => { fetchOpenJobs().then(setJobs).finally(() => setIsLoading(false)) }, [])
  return <div><p className="text-xs font-bold uppercase tracking-[.16em] text-brand-600">Opportunities</p><h1 className="page-heading mt-2">Find your next role</h1><p className="page-subtitle">Explore current opportunities and apply.</p>
    {isLoading ? <p className="mt-6 text-sm text-slate-500">Loading jobs…</p> : jobs.length === 0 ? <p className="mt-6 text-sm text-slate-500">There are no open jobs right now.</p> : <div className="mt-6 grid gap-4 md:grid-cols-2">{jobs.map((job) => <Link key={job.id} to={`/candidate/jobs/${job.id}`} className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-slate-200 hover:ring-indigo-300"><h2 className="font-semibold text-slate-900">{job.title}</h2><p className="mt-1 text-sm text-slate-600">{job.department} · {job.location}</p><p className="mt-3 text-sm text-slate-500">{job.experience_required}</p><p className="mt-4 text-sm font-medium text-indigo-600">View and apply →</p></Link>)}</div>}
  </div>
}
