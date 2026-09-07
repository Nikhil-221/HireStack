import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { createCodingQuestion, fetchCodingQuestion, updateCodingQuestion } from '@/api/codingQuestions'
import { fetchJobs } from '@/api/jobs'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { TextArea } from '@/components/ui/TextArea'
import type { CodingQuestion, CodingQuestionDifficulty, CodingQuestionPayload, CodingTestCasePayload } from '@/types/codingQuestion'
import type { Job } from '@/types/job'

type TestCaseForm = CodingTestCasePayload & { localId: number }
type StarterCodeForm = { language: string; code: string; localId: number }

interface FormValues {
  title: string
  description: string
  difficulty: CodingQuestionDifficulty
  job_id: string
  starterCode: StarterCodeForm[]
  testCases: TestCaseForm[]
}

let localId = 0
const nextLocalId = () => { localId += 1; return localId }
const newTestCase = (): TestCaseForm => ({ localId: nextLocalId(), input: '', expected_output: '', is_sample: false })
const newStarterCode = (): StarterCodeForm => ({ localId: nextLocalId(), language: '', code: '' })
const emptyForm = (): FormValues => ({ title: '', description: '', difficulty: 'medium', job_id: '', starterCode: [], testCases: [newTestCase()] })

const difficultyOptions = [
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
]

export function CodingQuestionFormPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEditing = Boolean(id)
  const [values, setValues] = useState<FormValues>(emptyForm)
  const [jobs, setJobs] = useState<Job[]>([])
  const [isLoading, setIsLoading] = useState(isEditing)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchJobs().then(setJobs).catch(() => setError('Could not load jobs.'))
    if (!id) return
    fetchCodingQuestion(Number(id))
      .then((question) => setValues(toFormValues(question)))
      .catch(() => setError('Could not load that question.'))
      .finally(() => setIsLoading(false))
  }, [id])

  const update = <K extends keyof FormValues>(key: K, value: FormValues[K]) => {
    setValues((current) => ({ ...current, [key]: value }))
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setIsSaving(true)
    setError(null)
    const payload: CodingQuestionPayload = {
      title: values.title.trim(),
      description: values.description.trim(),
      difficulty: values.difficulty,
      job_id: values.job_id ? Number(values.job_id) : null,
      starter_code: values.starterCode.length
        ? Object.fromEntries(values.starterCode.filter((item) => item.language.trim()).map((item) => [item.language.trim(), item.code]))
        : null,
      test_cases: values.testCases.map(({ localId: _localId, ...testCase }) => testCase),
    }
    try {
      if (id) await updateCodingQuestion(Number(id), payload)
      else await createCodingQuestion(payload)
      navigate('/question-bank')
    } catch {
      setError('Could not save the question. Check the fields and try again.')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) return <p className="text-sm text-slate-500">Loading question…</p>

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div>
        <button type="button" onClick={() => navigate('/question-bank')} className="text-sm font-semibold text-brand-600 hover:text-brand-700">← Question bank</button>
        <p className="mt-5 text-xs font-bold uppercase tracking-[.16em] text-brand-600">Manual assessment authoring</p>
        <h1 className="page-heading mt-2">{isEditing ? 'Edit question' : 'Add question'}</h1>
        <p className="page-subtitle">Define the prompt, starter code, and the cases used to evaluate submissions.</p>
      </div>

      {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      <form onSubmit={handleSubmit} className="flex flex-col gap-7">
        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70 sm:p-7">
          <div className="grid gap-5 sm:grid-cols-2">
            <Input id="question-title" label="Title" required value={values.title} onChange={(event) => update('title', event.target.value)} placeholder="e.g. Merge overlapping intervals" />
            <Select id="question-difficulty" label="Difficulty" options={difficultyOptions} value={values.difficulty} onChange={(event) => update('difficulty', event.target.value as CodingQuestionDifficulty)} />
            <Select id="question-job" label="Job (optional)" options={[{ value: '', label: 'No job association' }, ...jobs.map((job) => ({ value: String(job.id), label: job.title }))]} value={values.job_id} onChange={(event) => update('job_id', event.target.value)} />
          </div>
          <div className="mt-5"><TextArea id="question-description" label="Description" required rows={7} value={values.description} onChange={(event) => update('description', event.target.value)} placeholder="Describe the problem and constraints…" /></div>
        </section>

        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70 sm:p-7">
          <div className="flex items-start justify-between gap-4"><div><h2 className="text-base font-bold text-slate-900">Starter code</h2><p className="mt-1 text-sm text-slate-500">Optional starter snippets keyed by language.</p></div><Button type="button" variant="secondary" onClick={() => update('starterCode', [...values.starterCode, newStarterCode()])}>Add language</Button></div>
          <div className="mt-5 flex flex-col gap-4">
            {values.starterCode.length === 0 && <p className="rounded-xl border border-dashed border-slate-200 px-4 py-5 text-sm text-slate-500">No starter code added.</p>}
            {values.starterCode.map((entry, index) => <div key={entry.localId} className="grid gap-3 sm:grid-cols-[160px_1fr_auto]"><Input id={`starter-language-${entry.localId}`} label={index === 0 ? 'Language' : undefined} value={entry.language} onChange={(event) => update('starterCode', values.starterCode.map((item) => item.localId === entry.localId ? { ...item, language: event.target.value } : item))} placeholder="python" /><TextArea id={`starter-code-${entry.localId}`} label={index === 0 ? 'Code' : undefined} rows={3} value={entry.code} onChange={(event) => update('starterCode', values.starterCode.map((item) => item.localId === entry.localId ? { ...item, code: event.target.value } : item))} placeholder="def solve():" /><button type="button" className="self-end pb-2 text-sm font-semibold text-red-600 hover:text-red-700" onClick={() => update('starterCode', values.starterCode.filter((item) => item.localId !== entry.localId))}>Remove</button></div>)}
          </div>
        </section>

        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70 sm:p-7">
          <div className="flex items-start justify-between gap-4"><div><h2 className="text-base font-bold text-slate-900">Test cases</h2><p className="mt-1 text-sm text-slate-500">Add sample and hidden cases in the same request as the question.</p></div><Button type="button" variant="secondary" onClick={() => update('testCases', [...values.testCases, newTestCase()])}>Add test case</Button></div>
          <div className="mt-5 flex flex-col gap-4">
            {values.testCases.length === 0 && <p className="rounded-xl border border-dashed border-slate-200 px-4 py-5 text-sm text-slate-500">No test cases added.</p>}
            {values.testCases.map((testCase, index) => <div key={testCase.localId} className="rounded-xl border border-slate-200 p-4"><div className="mb-4 flex items-center justify-between"><p className="text-sm font-bold text-slate-800">Case {index + 1}</p><button type="button" className="text-sm font-semibold text-red-600 hover:text-red-700" onClick={() => update('testCases', values.testCases.filter((item) => item.localId !== testCase.localId))}>Remove</button></div><div className="grid gap-4 sm:grid-cols-2"><TextArea id={`test-input-${testCase.localId}`} label="Input" required rows={4} value={testCase.input} onChange={(event) => update('testCases', values.testCases.map((item) => item.localId === testCase.localId ? { ...item, input: event.target.value } : item))} /><TextArea id={`test-output-${testCase.localId}`} label="Expected output" required rows={4} value={testCase.expected_output} onChange={(event) => update('testCases', values.testCases.map((item) => item.localId === testCase.localId ? { ...item, expected_output: event.target.value } : item))} /></div><label className="mt-4 flex items-center gap-2 text-sm font-semibold text-slate-700"><input type="checkbox" checked={testCase.is_sample} onChange={(event) => update('testCases', values.testCases.map((item) => item.localId === testCase.localId ? { ...item, is_sample: event.target.checked } : item))} /> Sample case</label></div>)}
          </div>
        </section>

        <div className="flex justify-end gap-3 border-t border-slate-200 pt-6"><Button type="button" variant="secondary" onClick={() => navigate('/question-bank')}>Cancel</Button><Button type="submit" disabled={isSaving}>{isSaving ? 'Saving…' : isEditing ? 'Save changes' : 'Create question'}</Button></div>
      </form>
    </div>
  )
}

function toFormValues(question: CodingQuestion): FormValues {
  return {
    title: question.title,
    description: question.description,
    difficulty: question.difficulty,
    job_id: question.job_id ? String(question.job_id) : '',
    starterCode: Object.entries(question.starter_code ?? {}).map(([language, code]) => ({ language, code, localId: nextLocalId() })),
    testCases: question.test_cases.map((testCase) => ({ ...testCase, localId: nextLocalId() })),
  }
}
