import { NavLink, Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { useAuth } from '@/context/AuthContext'
import { useNavigate } from 'react-router-dom'

export function AdminLayout() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const leave = () => { logout(); navigate('/', { replace: true }) }
  return (
    <div className="app-surface flex min-h-screen">
      <Sidebar />
      <main className="min-w-0 flex-1 overflow-y-auto">
        <header className="flex items-center justify-between border-b border-slate-200/70 bg-white/80 px-5 py-3 backdrop-blur lg:hidden"><span className="font-bold tracking-tight text-slate-900">HireStack</span><nav className="flex items-center gap-1"><NavLink to="/dashboard" className="rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-600">Dashboard</NavLink><NavLink to="/jobs" className="rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-600">Jobs</NavLink><button onClick={leave} className="rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-600">Log out</button></nav></header>
        <div className="px-5 py-7 sm:px-8 lg:px-10 lg:py-10">
        <Outlet />
        </div>
      </main>
    </div>
  )
}
