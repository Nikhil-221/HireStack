import { NavLink } from 'react-router-dom'

const navItems = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/jobs', label: 'Jobs' },
  { to: '/candidates', label: 'Candidates' },
  { to: '/question-bank', label: 'Question Bank' },
  { to: '/coding-tests', label: 'Coding Tests' },
]

export function Sidebar() {
  return (
    <aside className="hidden min-h-screen w-64 shrink-0 border-r border-slate-200/80 bg-white/90 p-3 backdrop-blur lg:block">
      <p className="mb-3 px-3 text-[11px] font-bold uppercase tracking-[.16em] text-slate-400">Recruiter workspace</p>
      <nav className="flex flex-col gap-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `rounded-xl px-3 py-2.5 text-sm font-semibold transition-all ${
                isActive
                  ? 'bg-brand-50 text-brand-600 shadow-sm ring-1 ring-brand-100'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
