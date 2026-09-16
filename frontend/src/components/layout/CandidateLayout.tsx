import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'

const navItems = [
  { to: '/candidate/jobs', label: 'Open Jobs' },
  { to: '/candidate/applications', label: 'My Applications' },
  { to: '/candidate/profile', label: 'My Profile' },
  { to: '/candidate/notifications', label: 'Notifications' },
]

export function CandidateLayout() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const leave = () => { navigate('/', { replace: true }); logout() }
  return (
    <div className="app-surface flex min-h-screen">
      <aside className="hidden min-h-screen w-64 shrink-0 flex-col justify-between border-r border-slate-200/80 bg-white/90 p-3 backdrop-blur lg:flex">
        <div>
          <div className="mb-7 flex items-center gap-3 px-3 py-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-600 text-sm font-black text-white shadow-[0_8px_18px_rgba(23,101,233,.25)]">H</span><div><span className="text-base font-bold tracking-tight text-slate-900">HireStack</span><p className="text-xs font-medium text-slate-400">Candidate space</p></div></div>
          <p className="mb-2 px-3 text-[11px] font-bold uppercase tracking-[.14em] text-slate-400">Explore</p>
          <nav className="flex flex-col gap-1">
            {navItems.map((item) => <NavLink key={item.to} to={item.to} className={({ isActive }) => `rounded-xl px-3 py-2.5 text-sm font-semibold transition ${isActive ? 'bg-brand-50 text-brand-600 shadow-sm ring-1 ring-brand-100' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'}`}>{item.label}</NavLink>)}
          </nav>
        </div>
        <div className="border-t border-slate-100 pt-3"><button onClick={leave} className="w-full rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-slate-500 transition hover:bg-red-50 hover:text-red-600">Log out</button></div>
      </aside>
      <main className="min-w-0 flex-1 overflow-y-auto"><header className="flex items-center justify-between border-b border-slate-200/70 bg-white/80 px-5 py-3 backdrop-blur lg:hidden"><span className="font-bold tracking-tight text-slate-900">HireStack</span><nav className="flex items-center gap-1"><NavLink to="/candidate/jobs" className="rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-600">Jobs</NavLink><NavLink to="/candidate/applications" className="rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-600">Applications</NavLink><NavLink to="/candidate/notifications" className="rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-600">Notifications</NavLink><button onClick={leave} className="rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-600">Log out</button></nav></header><div className="px-5 py-7 sm:px-8 lg:px-10 lg:py-10"><Outlet /></div></main>
    </div>
  )
}
