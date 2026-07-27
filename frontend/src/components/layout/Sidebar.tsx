import { NavLink } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'

const navItems = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/jobs', label: 'Jobs' },
]

export function Sidebar() {
  const { logout } = useAuth()

  return (
    <aside className="flex h-screen w-60 shrink-0 flex-col justify-between border-r border-slate-200 bg-white">
      <div>
        <div className="px-5 py-5">
          <span className="text-lg font-semibold text-slate-900">HireStack</span>
          <p className="text-xs text-slate-500">Admin</p>
        </div>
        <nav className="flex flex-col gap-1 px-3">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>
      <div className="border-t border-slate-200 p-3">
        <button
          onClick={logout}
          className="w-full rounded-md px-3 py-2 text-left text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
        >
          Log out
        </button>
      </div>
    </aside>
  )
}
