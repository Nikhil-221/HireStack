import { Link, useParams } from 'react-router-dom'

export function TestAttemptPlaceholderPage() {
  const { token } = useParams()

  return (
    <div className="mx-auto max-w-2xl rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
      <p className="text-xs font-bold uppercase tracking-[.16em] text-brand-600">Coding assessment</p>
      <h1 className="page-heading mt-2">Test workspace coming soon</h1>
      <p className="mt-3 text-sm leading-6 text-slate-600">The coding IDE for this assessment is not available yet.</p>
      <p className="mt-2 break-all text-xs text-slate-400">Invite token: {token}</p>
      <Link to="/candidate/notifications" className="mt-6 inline-flex rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-500">Back to notifications</Link>
    </div>
  )
}
