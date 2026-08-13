import type { JobStatus } from '@/types/job'

const statusClasses: Record<JobStatus, string> = {
  Draft: 'bg-slate-100 text-slate-700 ring-slate-500/20',
  Open: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  Closed: 'bg-rose-50 text-rose-700 ring-rose-600/20',
}

export function StatusBadge({ status }: { status: JobStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset ${statusClasses[status]}`}
    >
      {status}
    </span>
  )
}
