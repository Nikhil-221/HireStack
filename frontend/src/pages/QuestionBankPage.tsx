import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { deleteCodingQuestion, fetchCodingQuestions } from '@/api/codingQuestions'
import { fetchJobs } from '@/api/jobs'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import type { CodingQuestion, CodingQuestionDifficulty } from '@/types/codingQuestion'
import type { Job } from '@/types/job'

const difficultyOptions = [
  { value: '', label: 'All difficulties' },
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
]

export function QuestionBankPage() {
  const navigate = useNavigate()
  const [questions, setQuestions] = useState<CodingQuestion[]>([])
  const [jobs, setJobs] = useState<Job[]>([])
  const [difficulty, setDifficulty] = useState('')
  const [jobId, setJobId] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [questionToDelete, setQuestionToDelete] = useState<CodingQuestion | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    fetchJobs().then(setJobs).catch(() => setError('Could not load jobs.'))
  }, [])

  useEffect(() => {
    setIsLoading(true)
    setError(null)
    fetchCodingQuestions({
      difficulty: difficulty ? (difficulty as CodingQuestionDifficulty) : undefined,
      job_id: jobId ? Number(jobId) : undefined,
    })
      .then(setQuestions)
      .catch(() => setError('Could not load the question bank.'))
      .finally(() => setIsLoading(false))
  }, [difficulty, jobId])

  const handleDelete = async () => {
    if (!questionToDelete) return
    setIsDeleting(true)
    try {
      await deleteCodingQuestion(questionToDelete.id)
      setQuestions((current) => current.filter((question) => question.id !== questionToDelete.id))
      setQuestionToDelete(null)
    } catch {
      setError('Could not delete that question.')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.16em] text-brand-600">Assessment content</p>
          <h1 className="page-heading mt-2">Question bank</h1>
          <p className="page-subtitle">Build and maintain the coding questions available to candidates.</p>
        </div>
        <Button onClick={() => navigate('/question-bank/new')}>Add question</Button>
      </div>

      <div className="grid grid-cols-1 gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/70 sm:grid-cols-2">
        <Select
          id="question-difficulty-filter"
          label="Difficulty"
          options={difficultyOptions}
          value={difficulty}
          onChange={(event) => setDifficulty(event.target.value)}
        />
        <Select
          id="question-job-filter"
          label="Job"
          options={[{ value: '', label: 'All jobs' }, ...jobs.map((job) => ({ value: String(job.id), label: job.title }))]}
          value={jobId}
          onChange={(event) => setJobId(event.target.value)}
        />
      </div>

      <div className="overflow-hidden rounded-2xl bg-white shadow-[0_12px_35px_rgba(15,23,42,.06)] ring-1 ring-slate-200/70">
        {isLoading ? (
          <p className="px-5 py-6 text-sm text-slate-500">Loading questions…</p>
        ) : error ? (
          <p className="px-5 py-6 text-sm text-red-600">{error}</p>
        ) : questions.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <p className="text-sm font-semibold text-slate-900">No questions found</p>
            <p className="mt-1 text-sm text-slate-500">Add your first manual coding question to start building the bank.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50/80">
                <tr>
                  <Th>Question</Th>
                  <Th>Difficulty</Th>
                  <Th>Job</Th>
                  <Th>Test cases</Th>
                  <Th><span className="sr-only">Actions</span></Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {questions.map((question) => (
                  <tr key={question.id} className="hover:bg-brand-50/30">
                    <td className="max-w-md px-5 py-4">
                      <p className="truncate text-sm font-semibold text-slate-900">{question.title}</p>
                      <p className="mt-1 truncate text-xs text-slate-500">{question.description}</p>
                    </td>
                    <td className="whitespace-nowrap px-5 py-4">
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold capitalize text-slate-700">{question.difficulty}</span>
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">{question.job_title ?? 'Unassigned'}</td>
                    <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">{question.test_cases.length}</td>
                    <td className="whitespace-nowrap px-5 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" onClick={() => navigate(`/question-bank/${question.id}/edit`)}>Edit</Button>
                        <Button variant="ghost" className="text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => setQuestionToDelete(question)}>Delete</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={questionToDelete !== null}
        title="Delete question?"
        description="This will permanently remove the question and all of its test cases."
        confirmLabel="Delete question"
        onConfirm={handleDelete}
        onCancel={() => setQuestionToDelete(null)}
        isLoading={isDeleting}
      />
    </div>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-[.12em] text-slate-400">{children}</th>
}
