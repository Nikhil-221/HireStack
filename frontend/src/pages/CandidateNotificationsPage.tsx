import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchNotifications, markNotificationRead } from '@/api/notifications'
import type { CandidateNotification } from '@/types/notification'

export function CandidateNotificationsPage() {
  const [notifications, setNotifications] = useState<CandidateNotification[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchNotifications()
      .then(setNotifications)
      .catch(() => setError('Could not load notifications.'))
      .finally(() => setIsLoading(false))
  }, [])

  const handleOpen = async (notification: CandidateNotification) => {
    if (notification.is_read) return
    try {
      const updated = await markNotificationRead(notification.id)
      setNotifications((current) => current.map((item) => item.id === updated.id ? updated : item))
    } catch {
      setError('Could not mark that notification as read.')
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <p className="text-xs font-bold uppercase tracking-[.16em] text-brand-600">Candidate space</p>
      <h1 className="page-heading mt-2">Notifications</h1>
      <p className="page-subtitle">Stay up to date with your application and assessment activity.</p>
      {error && <p className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      <div className="mt-6 flex flex-col gap-3">
        {isLoading ? <p className="text-sm text-slate-500">Loading notifications…</p> : notifications.length === 0 ? <div className="rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200"><p className="text-sm font-semibold text-slate-900">You’re all caught up</p><p className="mt-1 text-sm text-slate-500">New activity will appear here.</p></div> : notifications.map((notification) => <article key={notification.id} onClick={() => handleOpen(notification)} className={`rounded-2xl bg-white p-5 shadow-sm ring-1 transition hover:ring-brand-200 ${notification.is_read ? 'ring-slate-200' : 'ring-brand-200'}`}><div className="flex items-start gap-3"><span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${notification.is_read ? 'bg-slate-200' : 'bg-brand-600'}`} aria-label={notification.is_read ? 'Read' : 'Unread'} /><div className="min-w-0 flex-1"><div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between"><h2 className="text-sm font-bold text-slate-900">{notification.title}</h2><time className="shrink-0 text-xs text-slate-400">{relativeTime(notification.created_at)}</time></div><p className="mt-2 text-sm leading-6 text-slate-600">{notification.message}</p>{notification.type === 'coding_test' && notification.related_token && <div className="mt-4"><Link to={`/test/attempt/${notification.related_token}`} onClick={(event) => { event.stopPropagation(); void handleOpen(notification) }} className="inline-flex rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(23,101,233,.22)] hover:bg-brand-500">Start test</Link></div>}</div></div></article>)}
      </div>
    </div>
  )
}

function relativeTime(value: string) {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000))
  if (seconds < 60) return 'Just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value))
}
