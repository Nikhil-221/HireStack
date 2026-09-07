import Editor from '@monaco-editor/react'
import axios from 'axios'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { endCodingAttempt, fetchCodingAttempt, runCodingAttempt, submitCodingAttempt } from '@/api/codingAttempts'
import { Button } from '@/components/ui/Button'
import type { CodingAttempt, CodingAttemptQuestion, CodingAttemptResult } from '@/types/codingAttempt'

type Draft = { code: string; language: string }
type DraftMap = Record<number, Draft>

const languages = [{ value: 'python', label: 'Python 3.10' }]

export function TestAttemptPage() {
  const { token = '' } = useParams()
  const navigate = useNavigate()
  const [attempt, setAttempt] = useState<CodingAttempt | null>(null)
  const [selectedQuestionId, setSelectedQuestionId] = useState<number | null>(null)
  const [drafts, setDrafts] = useState<DraftMap>({})
  const [result, setResult] = useState<CodingAttemptResult | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRunning, setIsRunning] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isEnding, setIsEnding] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null)
  const [timedOut, setTimedOut] = useState(false)
  const [isFullscreenWarningVisible, setIsFullscreenWarningVisible] = useState(false)
  const autoSubmitted = useRef(false)
  const serverOffset = useRef(0)
  const submitCurrentRef = useRef<() => Promise<void>>(async () => undefined)

  useEffect(() => {
    if (isLoading || loadError) return
    const enterFullscreen = () => {
      if (!document.fullscreenElement) {
        void document.documentElement.requestFullscreen?.().catch(() => undefined)
      }
    }
    const handleFullscreenChange = () => setIsFullscreenWarningVisible(!document.fullscreenElement)
    enterFullscreen()
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [isLoading, loadError])

  useEffect(() => {
    if (!token) {
      setLoadError('This assessment link is missing a token.')
      setIsLoading(false)
      return
    }
    fetchCodingAttempt(token)
      .then((data) => {
        setAttempt(data)
        setSelectedQuestionId(data.questions[0]?.id ?? null)
        setDrafts(Object.fromEntries(data.questions.map((question) => [question.id, makeDraft(question)])))
        serverOffset.current = Date.parse(data.server_time) - Date.now()
        setSecondsRemaining(Math.max(0, Math.ceil((Date.parse(data.opened_at) + data.duration_minutes * 60_000 - (Date.now() + serverOffset.current)) / 1000)))
      })
      .catch((error: unknown) => setLoadError(getAttemptError(error)))
      .finally(() => setIsLoading(false))
  }, [token])

  const selectedQuestion = attempt?.questions.find((question) => question.id === selectedQuestionId) ?? null
  const currentDraft = selectedQuestion ? drafts[selectedQuestion.id] ?? makeDraft(selectedQuestion) : null

  const submitCurrent = async () => {
    if (!token || !selectedQuestion || !currentDraft || isSubmitting || timedOut && autoSubmitted.current) return
    setIsSubmitting(true)
    setActionError(null)
    try {
      const nextResult = await submitCodingAttempt(token, {
        question_id: selectedQuestion.id,
        code: currentDraft.code,
        language: currentDraft.language,
      })
      setResult(nextResult)
      setAttempt((current) => current ? {
        ...current,
        status: nextResult.status ?? current.status,
        questions: current.questions.map((question) => question.id === selectedQuestion.id
          ? { ...question, attempted: true, submission_status: nextResult.verdict, last_code: currentDraft.code, last_language: currentDraft.language }
          : question),
      } : current)
    } catch (error: unknown) {
      setActionError(getActionError(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  submitCurrentRef.current = submitCurrent

  useEffect(() => {
    if (!attempt || secondsRemaining === null || timedOut) return
    const timer = window.setInterval(() => {
      const remaining = Math.max(0, Math.ceil((Date.parse(attempt.opened_at) + attempt.duration_minutes * 60_000 - (Date.now() + serverOffset.current)) / 1000))
      setSecondsRemaining(remaining)
      if (remaining === 0) {
        setTimedOut(true)
        if (!autoSubmitted.current) {
          autoSubmitted.current = true
          void submitCurrentRef.current()
        }
      }
    }, 1000)
    return () => window.clearInterval(timer)
  }, [attempt, secondsRemaining, timedOut])

  const updateDraft = (changes: Partial<Draft>) => {
    if (!selectedQuestion || !currentDraft) return
    setDrafts((current) => ({
      ...current,
      [selectedQuestion.id]: { ...currentDraft, ...changes },
    }))
  }

  const runSamples = async () => {
    if (!token || !selectedQuestion || !currentDraft || isRunning || timedOut) return
    setIsRunning(true)
    setActionError(null)
    try {
      setResult(await runCodingAttempt(token, {
        question_id: selectedQuestion.id,
        code: currentDraft.code,
        language: currentDraft.language,
      }))
    } catch (error: unknown) {
      setActionError(getActionError(error))
    } finally {
      setIsRunning(false)
    }
  }

  const endTest = async () => {
    if (!token || isEnding || isBusy || !window.confirm('End this test? You will not be able to edit or submit answers afterward.')) return
    setIsEnding(true)
    setActionError(null)
    try {
      await endCodingAttempt(token)
      if (document.fullscreenElement) await document.exitFullscreen()
      navigate(`/test/attempt/${token}/submitted`, { replace: true })
    } catch (error: unknown) {
      setActionError(getActionError(error))
      setIsEnding(false)
    }
  }

  if (isLoading) return <AttemptState title="Loading assessment" message="Preparing your coding workspace…" />
  if (loadError || !attempt) return <AttemptState title="Assessment unavailable" message={loadError ?? 'This assessment could not be loaded.'} />
  if (!selectedQuestion || !currentDraft) return <AttemptState title="No questions available" message="This assessment does not contain any questions." />

  const isBusy = isRunning || isSubmitting
  return (
    <div className="fixed inset-0 z-[60] flex min-h-0 min-w-0 flex-col overflow-hidden bg-[#101827] text-slate-100">
      <header className="flex min-h-16 flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#151f31] px-4 py-3 sm:px-6">
        <div className="min-w-0"><p className="truncate text-xs font-bold uppercase tracking-[.16em] text-cyan-300">Live assessment</p><h1 className="truncate text-lg font-bold text-white">{attempt.title}</h1></div>
        <div className={`flex items-center gap-3 rounded-xl border px-3 py-2 ${secondsRemaining !== null && secondsRemaining < 300 ? 'border-amber-300/40 bg-amber-300/10 text-amber-200' : 'border-white/10 bg-white/5 text-slate-200'}`}><span className="text-xs font-bold uppercase tracking-[.12em]">Time left</span><span className="font-mono text-lg font-bold tabular-nums">{formatTime(secondsRemaining ?? 0)}</span></div>
      </header>

      {isFullscreenWarningVisible && <div className="border-b border-amber-300/30 bg-amber-300/10 px-4 py-2 text-center text-sm font-semibold text-amber-100">You have exited fullscreen. Return to fullscreen to keep the assessment distraction-free.</div>}
      {timedOut && <div className="border-b border-amber-300/30 bg-amber-300/10 px-4 py-2 text-center text-sm font-semibold text-amber-100">Time is up. Your current code was submitted automatically.</div>}
      <div className="grid min-h-0 min-w-0 flex-1 overflow-hidden lg:grid-cols-[220px_minmax(0,1fr)_320px]">
        <aside className="flex min-h-0 min-w-0 flex-col overflow-y-auto border-b border-white/10 bg-[#131d2d] p-4 lg:border-b-0 lg:border-r">
          <div className="mb-4 flex items-center justify-between"><p className="text-xs font-bold uppercase tracking-[.14em] text-slate-400">Questions</p><span className="text-xs text-slate-500">{attempt.questions.length}</span></div>
          <nav className="flex gap-2 overflow-x-auto lg:flex-col">
            {attempt.questions.map((question, index) => <button key={question.id} type="button" onClick={() => { setSelectedQuestionId(question.id); setResult(null); setActionError(null) }} className={`flex min-w-[170px] items-center gap-3 rounded-xl border px-3 py-3 text-left transition lg:min-w-0 ${question.id === selectedQuestion.id ? 'border-cyan-300/50 bg-cyan-300/10 text-white' : 'border-white/8 text-slate-400 hover:border-white/20 hover:bg-white/5'}`}><span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg text-xs font-bold ${question.id === selectedQuestion.id ? 'bg-cyan-300 text-slate-950' : question.attempted ? 'bg-emerald-400/15 text-emerald-300' : 'bg-white/8 text-slate-400'}`}>{question.attempted ? '✓' : index + 1}</span><span className="min-w-0"><span className="block truncate text-sm font-semibold">{question.title}</span><span className="mt-0.5 block text-[11px] capitalize text-slate-500">{question.difficulty}{question.attempted ? ' · submitted' : ''}</span></span></button>)}
          </nav>
          <Button type="button" variant="danger" onClick={() => void endTest()} disabled={isEnding || isBusy} className="mt-auto w-full">{isEnding ? 'Ending test…' : 'End test'}</Button>
        </aside>

        <main className="flex min-h-0 min-w-0 flex-col overflow-hidden bg-[#0d1523]">
          <section className="overflow-y-auto border-b border-white/10 px-5 py-6 sm:px-7"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.14em] text-cyan-300">Question {attempt.questions.findIndex((question) => question.id === selectedQuestion.id) + 1}</p><h2 className="mt-1 text-2xl font-bold tracking-tight text-white">{selectedQuestion.title}</h2></div><span className="rounded-full border border-white/10 px-3 py-1 text-xs font-bold capitalize text-slate-400">{selectedQuestion.difficulty}</span></div><p className="mt-5 max-w-3xl whitespace-pre-wrap text-sm leading-7 text-slate-300">{selectedQuestion.description}</p></section>
          <section className="flex min-h-[420px] flex-1 flex-col"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#111b2b] px-4 py-2"><label className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.12em] text-slate-400" htmlFor="attempt-language">Language<select id="attempt-language" value={currentDraft.language} onChange={(event) => updateDraft({ language: event.target.value })} className="rounded-lg border border-white/10 bg-[#1b293d] px-2.5 py-1.5 text-xs font-semibold normal-case tracking-normal text-slate-100 outline-none"><option value="python">Python 3.10</option>{languages.filter((language) => language.value !== 'python').map((language) => <option key={language.value} value={language.value}>{language.label}</option>)}</select></label><div className="flex gap-2"><Button type="button" variant="ghost" onClick={runSamples} disabled={isBusy || timedOut} className="border border-white/10 text-slate-200 hover:bg-white/10 hover:text-white">{isRunning ? 'Running…' : 'Run samples'}</Button><Button type="button" onClick={() => void submitCurrent()} disabled={isBusy || timedOut}>{isSubmitting ? 'Submitting…' : 'Submit answer'}</Button></div></div><div className="min-h-0 flex-1"><Editor height="100%" language={currentDraft.language} theme="vs-dark" value={currentDraft.code} onChange={(value: string | undefined) => updateDraft({ code: value ?? '' })} options={{ minimap: { enabled: false }, fontSize: 14, padding: { top: 18 }, automaticLayout: true, scrollBeyondLastLine: false, wordWrap: 'on' }} /></div></section>
        </main>

        <aside className="flex min-h-0 min-w-0 flex-col overflow-hidden border-t border-white/10 bg-[#131d2d] lg:border-l lg:border-t-0"><div className="shrink-0 border-b border-white/10 px-5 py-4"><p className="text-xs font-bold uppercase tracking-[.14em] text-slate-400">Sample results</p><p className="mt-1 text-sm text-slate-500">Visible cases only. Hidden cases run on submit.</p></div>{actionError && <p className="m-4 shrink-0 rounded-xl border border-red-300/20 bg-red-400/10 px-3 py-2 text-sm text-red-200">{actionError}</p>}{result && <div className="min-h-0 flex-1 overflow-y-auto p-4"><div className={`rounded-xl border px-4 py-3 ${result.verdict === 'accepted' ? 'border-emerald-300/20 bg-emerald-300/10' : 'border-amber-300/20 bg-amber-300/10'}`}><p className="text-xs font-bold uppercase tracking-[.12em] text-slate-400">Verdict</p><p className="mt-1 text-lg font-bold capitalize text-white">{formatVerdict(result.verdict)}</p></div><div className="mt-4 flex flex-col gap-3">{result.results.map((testCase, index) => <article key={`${testCase.input}-${index}`} className="rounded-xl border border-white/8 bg-white/[.03] p-3"><div className="flex items-center justify-between"><span className="text-xs font-bold text-slate-400">Case {index + 1}</span><span className={testCase.passed ? 'text-emerald-300' : 'text-red-300'}>{testCase.passed ? 'Passed' : 'Failed'}</span></div><ResultValue label="Input" value={testCase.input} /><ResultValue label="Expected" value={testCase.expected} /><ResultValue label="Actual" value={testCase.actual || 'No output'} /></article>)}</div></div>}{!result && !actionError && <div className="grid flex-1 place-items-center p-6 text-center"><div><div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl border border-white/10 bg-white/5 text-xl text-cyan-300">⌘</div><p className="mt-4 text-sm font-semibold text-slate-300">Run the sample cases to see results.</p></div></div>}<div className="shrink-0 border-t border-white/10 p-4"><p className="text-xs leading-5 text-slate-500">Opened {new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(attempt.opened_at))}</p></div></aside>
      </div>
    </div>
  )
}

function makeDraft(question: CodingAttemptQuestion): Draft {
  const starter = question.starter_code ?? {}
  return { language: question.last_language ?? 'python', code: question.last_code ?? starter[question.last_language ?? 'python'] ?? Object.values(starter)[0] ?? '' }
}

function getAttemptError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (error.response?.status === 409) return 'This assessment has already been completed.'
    if (error.response?.status === 410) return 'This assessment link has expired.'
    if (error.response?.status === 404) return 'This assessment link is invalid or does not belong to you.'
  }
  return 'We could not load this assessment. Please try again.'
}

function getActionError(error: unknown): string {
  if (axios.isAxiosError(error) && error.response?.status === 503) return 'The evaluation service is temporarily unavailable. Your submission was not saved.'
  if (axios.isAxiosError(error) && error.response?.status === 409) return 'This test has already been submitted. Reloading the confirmation screen…'
  return 'We could not complete that request. Your code is still here.'
}

function formatTime(seconds: number): string {
  return `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`
}

function formatVerdict(verdict: string): string {
  return verdict.replaceAll('_', ' ')
}

function ResultValue({ label, value }: { label: string; value: string }) {
  return <div className="mt-3"><p className="text-[11px] font-bold uppercase tracking-[.12em] text-slate-500">{label}</p><pre className="mt-1 max-h-24 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-black/20 px-2.5 py-2 font-mono text-xs leading-5 text-slate-300">{value}</pre></div>
}

function AttemptState({ title, message }: { title: string; message: string }) {
  return <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm"><p className="text-xs font-bold uppercase tracking-[.16em] text-brand-600">Coding assessment</p><h1 className="page-heading mt-2">{title}</h1><p className="mt-3 text-sm leading-6 text-slate-600">{message}</p><Link to="/candidate/notifications" className="mt-6 inline-flex rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-500">Back to notifications</Link></div>
}
