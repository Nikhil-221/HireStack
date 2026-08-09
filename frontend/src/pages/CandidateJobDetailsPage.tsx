import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { applyToJob, fetchOpenJob } from '@/api/candidate'
import { Button } from '@/components/ui/Button'
import type { OpenJob } from '@/types/candidate'

export function CandidateJobDetailsPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [job, setJob] = useState<OpenJob | null>(null)
  const [resume, setResume] = useState<File | null>(null)
  const [isApplying, setIsApplying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => { if (id) fetchOpenJob(Number(id)).then(setJob).catch(() => setError('This job is no longer open.')) }, [id])

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!job || !resume) { setError('Please select your resume.'); return }
    setIsApplying(true); setError(null)
    try { await applyToJob(job.id, resume); setSuccess(true) } catch (requestError: unknown) {
      const message = requestError && typeof requestError === 'object' && 'response' in requestError
        ? (requestError as { response?: { data?: { detail?: string } } }).response?.data?.detail
        : undefined
      setError(message ?? 'Could not submit your application.')
    } finally { setIsApplying(false) }
  }

  if (!job) return <p className="text-sm text-red-600">{error ?? 'Loading job…'}</p>
  return <div className="max-w-3xl"><button onClick={() => navigate('/candidate/jobs')} className="text-sm text-slate-500 hover:text-slate-700">← Back to open jobs</button><h1 className="mt-2 text-2xl font-semibold text-slate-900">{job.title}</h1><p className="mt-1 text-sm text-slate-500">{job.department} · {job.location} · {job.employment_type}</p>
    <section className="mt-6 rounded-lg bg-white p-6 shadow-sm ring-1 ring-slate-200"><h2 className="font-semibold text-slate-900">About the role</h2><p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{job.description || 'No description provided.'}</p><div className="mt-5 grid gap-4 sm:grid-cols-2"><Info label="Experience" value={job.experience_required} /><Info label="Application deadline" value={job.deadline ?? 'Not set'} /></div><SkillList title="Required skills" items={job.required_skills} /></section>
    <section className="mt-6 rounded-lg bg-white p-6 shadow-sm ring-1 ring-slate-200"><h2 className="font-semibold text-slate-900">Apply for this job</h2>{success ? <div className="mt-3"><p className="text-sm text-green-700">Application submitted successfully.</p><Link to="/candidate/applications" className="mt-3 inline-block text-sm font-medium text-indigo-600">View my applications →</Link></div> : <form onSubmit={submit} className="mt-4"><label htmlFor="resume" className="block text-sm font-medium text-slate-700">Resume (PDF, DOC, or DOCX)</label><input id="resume" type="file" accept=".pdf,.doc,.docx" className="mt-1 block w-full text-sm" onChange={(e) => setResume(e.target.files?.[0] ?? null)} required />{error && <p className="mt-3 text-sm text-red-600">{error}</p>}<p className="mt-2 text-xs text-slate-500">Complete <Link to="/candidate/profile" className="text-indigo-600">your profile</Link> before applying.</p><div className="mt-5"><Button type="submit" disabled={isApplying}>{isApplying ? 'Submitting…' : 'Submit application'}</Button></div></form>}</section>
  </div>
}

function Info({ label, value }: { label: string; value: string }) { return <div><p className="text-xs font-medium uppercase text-slate-500">{label}</p><p className="mt-1 text-sm text-slate-900">{value}</p></div> }
function SkillList({ title, items }: { title: string; items: string[] | null }) { if (!items?.length) return null; return <div className="mt-5"><h3 className="text-sm font-semibold text-slate-900">{title}</h3><p className="mt-2 text-sm text-slate-600">{items.join(', ')}</p></div> }
