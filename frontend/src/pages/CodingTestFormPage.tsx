import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { createCodingTest, fetchCodingTest, updateCodingTest } from '@/api/codingTests'
import { fetchCodingQuestions } from '@/api/codingQuestions'
import { fetchJobs } from '@/api/jobs'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import type { CodingQuestion } from '@/types/codingQuestion'
import type { CodingTestPayload } from '@/types/codingTest'
import type { Job } from '@/types/job'

export function CodingTestFormPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEditing = Boolean(id)
  const [jobs, setJobs] = useState<Job[]>([])
  const [questions, setQuestions] = useState<CodingQuestion[]>([])
  const [jobId, setJobId] = useState('')
  const [title, setTitle] = useState('')
  const [duration, setDuration] = useState('60')
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<number[]>([])
  const [isLoading, setIsLoading] = useState(isEditing)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchJobs().then(setJobs).catch(() => setError('Could not load jobs.'))
    if (!id) return
    fetchCodingTest(Number(id))
      .then((test) => {
        setJobId(String(test.job_id))
        setTitle(test.title)
        setDuration(String(test.duration_minutes))
        setSelectedQuestionIds(test.questions.map((question) => question.id))
      })
      .catch(() => setError('Could not load that coding test.'))
      .finally(() => setIsLoading(false))
  }, [id])

  useEffect(() => {
    setSelectedQuestionIds((current) => current.filter((questionId) => questions.some((question) => question.id === questionId)))
    if (!jobId) {
      setQuestions([])
      return
    }
    fetchCodingQuestions({ job_id: Number(jobId) })
      .then(setQuestions)
      .catch(() => setError('Could not load questions for this job.'))
  }, [jobId])

  const toggleQuestion = (questionId: number) => {
    setSelectedQuestionIds((current) => current.includes(questionId) ? current.filter((idValue) => idValue !== questionId) : [...current, questionId])
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setIsSaving(true)
    setError(null)
    const payload: CodingTestPayload = { job_id: Number(jobId), title: title.trim(), duration_minutes: Number(duration), question_ids: selectedQuestionIds }
    try {
      if (id) await updateCodingTest(Number(id), payload)
      else await createCodingTest(payload)
      navigate('/coding-tests')
    } catch {
      setError('Could not save the coding test. Check the fields and try again.')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) return <p className="text-sm text-slate-500">Loading coding test…</p>

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div><button type="button" onClick={() => navigate('/coding-tests')} className="text-sm font-semibold text-brand-600 hover:text-brand-700">← Coding tests</button><p className="mt-5 text-xs font-bold uppercase tracking-[.16em] text-brand-600">Assessment packaging</p><h1 className="page-heading mt-2">{isEditing ? 'Edit coding test' : 'Create coding test'}</h1><p className="page-subtitle">Choose a job, set the time limit, and select questions from its bank.</p></div>
      {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70 sm:p-7"><div className="grid gap-5 sm:grid-cols-2"><Select id="coding-test-job" label="Job" required options={[{ value: '', label: 'Select a job' }, ...jobs.map((job) => ({ value: String(job.id), label: job.title }))]} value={jobId} onChange={(event) => setJobId(event.target.value)} /><Input id="coding-test-title" label="Title" required value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Backend fundamentals" /><Input id="coding-test-duration" label="Duration (minutes)" type="number" min={1} required value={duration} onChange={(event) => setDuration(event.target.value)} /></div></section>
        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70 sm:p-7"><div className="flex items-start justify-between gap-4"><div><h2 className="text-base font-bold text-slate-900">Questions</h2><p className="mt-1 text-sm text-slate-500">Only questions assigned to the selected job are shown.</p></div><span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-bold text-brand-700">{selectedQuestionIds.length} selected</span></div>{!jobId ? <p className="mt-5 rounded-xl border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-500">Select a job to load its question bank.</p> : questions.length === 0 ? <p className="mt-5 rounded-xl border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-500">No questions are assigned to this job yet.</p> : <div className="mt-5 grid gap-3 sm:grid-cols-2">{questions.map((question) => <label key={question.id} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${selectedQuestionIds.includes(question.id) ? 'border-brand-300 bg-brand-50/60' : 'border-slate-200 hover:border-slate-300'}`}><input type="checkbox" checked={selectedQuestionIds.includes(question.id)} onChange={() => toggleQuestion(question.id)} className="mt-1" /><span className="min-w-0"><span className="block text-sm font-semibold text-slate-900">{question.title}</span><span className="mt-1 block text-xs font-bold capitalize text-slate-500">{question.difficulty} · {question.test_cases.length} test cases</span></span></label>)}</div>}</section>
        <div className="flex justify-end gap-3 border-t border-slate-200 pt-6"><Button type="button" variant="secondary" onClick={() => navigate('/coding-tests')}>Cancel</Button><Button type="submit" disabled={isSaving || !jobId}>{isSaving ? 'Saving…' : isEditing ? 'Save changes' : 'Create test'}</Button></div>
      </form>
    </div>
  )
}
