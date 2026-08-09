import { useEffect, useState } from 'react'
import { fetchMyApplications } from '@/api/candidate'
import type { ApplicationStatus, CandidateApplication } from '@/types/candidate'

const classes: Record<ApplicationStatus, string> = { Applied: 'bg-blue-50 text-blue-700', Shortlisted: 'bg-green-50 text-green-700', Rejected: 'bg-red-50 text-red-700' }

export function CandidateApplicationsPage() {
  const [applications, setApplications] = useState<CandidateApplication[]>([])
  const [isLoading, setIsLoading] = useState(true)
  useEffect(() => { fetchMyApplications().then(setApplications).finally(() => setIsLoading(false)) }, [])
  return <div><p className="text-xs font-bold uppercase tracking-[.16em] text-brand-600">Application tracker</p><h1 className="page-heading mt-2">My applications</h1><p className="page-subtitle">Track the status of every application.</p>
    <div className="mt-6 overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-slate-200">{isLoading ? <p className="p-5 text-sm text-slate-500">Loading applications…</p> : applications.length === 0 ? <p className="p-5 text-sm text-slate-500">You have not applied for any jobs yet.</p> : <table className="min-w-full divide-y divide-slate-200"><thead className="bg-slate-50"><tr><Header>Job</Header><Header>Resume</Header><Header>Applied</Header><Header>Status</Header></tr></thead><tbody className="divide-y divide-slate-200">{applications.map((application) => <tr key={application.id}><td className="px-5 py-3 text-sm font-medium text-slate-900">{application.job_title}<span className="block font-normal text-slate-500">{application.job_location}</span></td><td className="px-5 py-3 text-sm text-slate-600">{application.resume_filename}</td><td className="px-5 py-3 text-sm text-slate-600">{formatDate(application.applied_at)}</td><td className="px-5 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${classes[application.status]}`}>{application.status}</span></td></tr>)}</tbody></table>}</div>
  </div>
}
function Header({ children }: { children: string }) { return <th className="px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-[.12em] text-slate-400">{children}</th> }
function formatDate(value: string) { return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value)) }
