import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { deleteCodingTest, fetchCodingTests } from '@/api/codingTests'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import type { CodingTest } from '@/types/codingTest'

export function CodingTestsPage() {
  const navigate = useNavigate()
  const [tests, setTests] = useState<CodingTest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [testToDelete, setTestToDelete] = useState<CodingTest | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const loadTests = () => {
    setIsLoading(true)
    setError(null)
    fetchCodingTests()
      .then(setTests)
      .catch(() => setError('Could not load coding tests.'))
      .finally(() => setIsLoading(false))
  }

  useEffect(loadTests, [])

  const handleDelete = async () => {
    if (!testToDelete) return
    setIsDeleting(true)
    try {
      await deleteCodingTest(testToDelete.id)
      setTests((current) => current.filter((test) => test.id !== testToDelete.id))
      setTestToDelete(null)
    } catch {
      setError('Could not delete that coding test.')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.16em] text-brand-600">Assessment delivery</p>
          <h1 className="page-heading mt-2">Coding tests</h1>
          <p className="page-subtitle">Package question-bank content into timed assessments for each job.</p>
        </div>
        <Button onClick={() => navigate('/coding-tests/new')}>Create test</Button>
      </div>

      <div className="overflow-hidden rounded-2xl bg-white shadow-[0_12px_35px_rgba(15,23,42,.06)] ring-1 ring-slate-200/70">
        {isLoading ? (
          <p className="px-5 py-6 text-sm text-slate-500">Loading coding tests…</p>
        ) : error ? (
          <p className="px-5 py-6 text-sm text-red-600">{error}</p>
        ) : tests.length === 0 ? (
          <div className="px-5 py-10 text-center"><p className="text-sm font-semibold text-slate-900">No coding tests yet</p><p className="mt-1 text-sm text-slate-500">Create a test and select questions from the bank.</p></div>
        ) : (
          <div className="overflow-x-auto"><table className="min-w-full divide-y divide-slate-200"><thead className="bg-slate-50/80"><tr><Th>Title</Th><Th>Job</Th><Th>Duration</Th><Th>Questions</Th><Th><span className="sr-only">Actions</span></Th></tr></thead><tbody className="divide-y divide-slate-200 bg-white">{tests.map((test) => <tr key={test.id} className="hover:bg-brand-50/30"><td className="px-5 py-4 text-sm font-semibold text-slate-900">{test.title}</td><td className="px-5 py-4 text-sm text-slate-600">{test.job_title ?? 'Applicable to all jobs'}</td><td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">{test.duration_minutes} min</td><td className="px-5 py-4 text-sm text-slate-600">{test.question_count}</td><td className="whitespace-nowrap px-5 py-4 text-right"><div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => navigate(`/coding-tests/${test.id}/edit`)}>Edit</Button><Button variant="ghost" className="text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => setTestToDelete(test)}>Delete</Button></div></td></tr>)}</tbody></table></div>
        )}
      </div>

      <ConfirmDialog open={testToDelete !== null} title="Delete coding test?" description="This removes the test and its question selections. The questions themselves stay in the question bank." confirmLabel="Delete test" onConfirm={handleDelete} onCancel={() => setTestToDelete(null)} isLoading={isDeleting} />
    </div>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-[.12em] text-slate-400">{children}</th>
}
