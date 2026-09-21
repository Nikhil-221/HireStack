import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'

const searchItems = [
  { label: 'Jobs', to: '/jobs' },
  { label: 'Candidates', to: '/candidates' },
  { label: 'Question Bank', to: '/question-bank' },
  { label: 'Coding Tests', to: '/coding-tests' },
]

export function TopNav() {
  const { logout, role } = useAuth()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)
  const profileRef = useRef<HTMLDivElement>(null)

  const matchingItems = searchItems.filter((item) => item.label.toLowerCase().includes(query.trim().toLowerCase()))

  const leave = () => {
    navigate('/', { replace: true })
    logout()
  }

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        searchRef.current?.focus()
      }
    }

    document.addEventListener('keydown', handleShortcut)
    return () => document.removeEventListener('keydown', handleShortcut)
  }, [])

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false)
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  const openSearchResult = (to: string) => {
    setQuery('')
    searchRef.current?.blur()
    navigate(to)
  }

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/85 backdrop-blur">
      <div className="flex min-h-16 items-center gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex shrink-0 items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-sm font-black italic text-white shadow-[0_8px_18px_rgba(23,101,233,.25)] ring-1 ring-brand-400/40">H</span>
          <div><span className="text-base font-bold tracking-tight text-slate-900">HireStack</span><p className="text-xs font-medium text-slate-400">Recruiter workspace</p></div>
        </div>
        <div className="relative min-w-0 flex-1">
          <input
            ref={searchRef}
            type="search"
            aria-label="Search workspace"
            placeholder="Search workspace"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && matchingItems[0]) openSearchResult(matchingItems[0].to)
            }}
            className="min-w-0 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-brand-400"
          />
          {query.trim() && <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
            {matchingItems.length > 0 ? matchingItems.map((item) => <button key={item.to} type="button" onClick={() => openSearchResult(item.to)} className="block w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50">{item.label}</button>) : <p className="px-3 py-2 text-sm text-slate-400">No matching workspace area</p>}
          </div>}
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-3">
          <button type="button" aria-label="Notifications" className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-brand-600">
            <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9a6 6 0 1 0-12 0v.75a8.967 8.967 0 0 1-2.31 6.022c1.733.64 3.55 1.08 5.454 1.31m5.713 0a24.255 24.255 0 0 1-5.713 0m5.713 0a3 3 0 1 1-5.713 0" /></svg>
          </button>
          <div ref={profileRef} className="relative">
            <button type="button" aria-expanded={isProfileOpen} onClick={() => setIsProfileOpen((current) => !current)} className="flex items-center gap-2 rounded-xl px-2 py-1.5 text-left transition hover:bg-slate-50">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-brand-600 text-xs font-black text-white shadow-sm">R</span>
              <span className="hidden sm:block"><span className="block text-sm font-semibold text-slate-900">{role === 'admin' ? 'Admin' : 'Recruiter'}</span><span className="block text-xs text-slate-400">Account</span></span>
              <span className="hidden text-xs text-slate-400 sm:block">&#9662;</span>
            </button>
            {isProfileOpen && <div className="absolute right-0 top-full z-50 mt-2 w-40 rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
              <button type="button" onClick={() => setIsProfileOpen(false)} className="block w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50">Profile</button>
              <button type="button" onClick={leave} className="block w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-red-600 hover:bg-red-50">Log out</button>
            </div>}
          </div>
        </div>
      </div>
    </header>
  )
}
