import { Link } from 'react-router-dom'

export function TestSubmittedPage() {
  return (
    <div className="grid min-h-screen place-items-center bg-[#101827] px-6 text-center text-slate-100">
      <div className="max-w-md">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-emerald-300 text-2xl font-black text-slate-950">✓</div>
        <p className="mt-7 text-xs font-bold uppercase tracking-[.18em] text-cyan-300">Assessment complete</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">Test submitted</h1>
        <p className="mt-4 text-sm leading-7 text-slate-400">Your coding assessment has been submitted. You can safely close this window.</p>
        <Link to="/candidate/notifications" className="mt-7 inline-flex rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-slate-900 transition hover:bg-cyan-50">Back to notifications</Link>
      </div>
    </div>
  )
}