import type { JobStatus } from '@/types/job'

const statusClasses: Record<JobStatus, string> = {
  Draft: 'bg-slate-100 text-slate-700 ring-slate-500/20',
  Open: 'bg-green-50 text-green-700 ring-green-600/20',
  Closed: 'bg-red-50 text-red-700 ring-red-600/20',
}

export function StatusBadge({ status }: { status: JobStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${statusClasses[status]}`}
    >
      {status}
    </span>
  )
}
