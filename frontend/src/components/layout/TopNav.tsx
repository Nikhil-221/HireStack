import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'

function linkClass(isDark: boolean, active: boolean) {
  return `rounded-lg px-3 py-2 text-sm font-semibold transition ${active
    ? isDark ? 'bg-white/12 text-white' : 'bg-brand-50 text-brand-600'
    : isDark ? 'text-slate-300 hover:bg-white/8 hover:text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'}`
}

export function TopNav() {
  const { isAuthenticated, role, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const isDark = location.pathname === '/'
  const isCandidate = role === 'candidate'
  const recruiter = role === 'recruiter' || role === 'admin'

  const leave = () => {
    logout()
    navigate('/', { replace: true })
  }

  if (location.pathname === '/') return null

  return (
    <header className={`sticky top-0 z-50 border-b backdrop-blur ${isDark ? 'border-white/10 bg-slate-950/85 text-white' : 'border-slate-200/80 bg-white/85 text-slate-900'}`}>
      <div className="mx-auto flex min-h-16 max-w-[1440px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex shrink-0 items-center gap-2.5"><span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-xs font-black text-white shadow-lg shadow-brand-500/25">H</span><span className="text-base font-bold tracking-tight">HireStack</span></Link>
        <nav className="flex min-w-0 items-center justify-end gap-0.5 overflow-x-auto py-2">
          <NavLink to="/" className={({ isActive }) => linkClass(isDark, isActive)}>Home</NavLink>
          {isCandidate && <><NavLink to="/candidate/jobs" className={({ isActive }) => linkClass(isDark, isActive)}>Jobs</NavLink><NavLink to="/candidate/applications" className={({ isActive }) => linkClass(isDark, isActive)}>Applications</NavLink><NavLink to="/candidate/profile" className={({ isActive }) => linkClass(isDark, isActive)}>Profile</NavLink></>}
          {recruiter && <><NavLink to="/dashboard" className={({ isActive }) => linkClass(isDark, isActive)}>Dashboard</NavLink><NavLink to="/jobs" className={({ isActive }) => linkClass(isDark, isActive)}>Jobs</NavLink></>}
          {!isAuthenticated && <><NavLink to="/candidate/login" className={({ isActive }) => linkClass(isDark, isActive)}>Candidate login</NavLink><Link to="/register" className={`ml-1 rounded-xl px-3.5 py-2 text-sm font-bold transition ${isDark ? 'border border-white/20 text-white hover:bg-white/10' : 'border border-slate-200 text-slate-700 hover:bg-slate-50'}`}>Sign up</Link></>}
          {isAuthenticated && <button onClick={leave} className={`ml-1 rounded-xl px-3.5 py-2 text-sm font-bold transition ${isDark ? 'border border-white/20 text-white hover:bg-white/10' : 'border border-slate-200 text-slate-700 hover:bg-slate-50'}`}>Log out</button>}
        </nav>
      </div>
    </header>
  )
}
