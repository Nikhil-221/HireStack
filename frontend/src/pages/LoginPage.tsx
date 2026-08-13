import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

interface LoginLocationState {
  from?: string
  registered?: boolean
}

export function LoginPage() {
  const { isAuthenticated, role, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const locationState = (location.state as LoginLocationState) ?? {}
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (isAuthenticated) {
    return <Navigate to={role === 'candidate' ? '/candidate/jobs' : locationState.from ?? '/dashboard'} replace />
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      const loggedInRole = await login(username, password)
      navigate(loggedInRole === 'candidate' ? '/candidate/jobs' : '/dashboard', { replace: true })
    } catch {
      setError('Invalid username or password')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="app-surface flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-3xl bg-white p-7 shadow-[0_24px_70px_rgba(15,23,42,.12)] ring-1 ring-slate-200/70 sm:p-9">
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-600 font-black text-white shadow-lg shadow-brand-500/25">H</div>
        <p className="mt-6 text-xs font-bold uppercase tracking-[.16em] text-brand-600">Recruiter workspace</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">Welcome back</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">Sign in to manage your hiring pipeline.</p>

        {locationState.registered && (
          <p className="mt-4 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700 ring-1 ring-inset ring-green-200">
            Account created. Sign in below.
          </p>
        )}

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <Input
            id="username"
            label="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoFocus
            required
          />
          <Input
            id="password"
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" disabled={isSubmitting} className="mt-2 w-full">
            {isSubmitting ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>

        <p className="mt-7 text-center text-sm text-slate-500">
          Don&apos;t have an account?{' '}
          <Link to="/register?role=recruiter" className="font-semibold text-brand-600 hover:text-brand-500">
            Register
          </Link>
        </p>
        <p className="mt-3 text-center text-sm text-slate-500">Looking for a job? <Link to="/candidate/login" className="font-semibold text-brand-600 hover:text-brand-500">Candidate login</Link></p>
      </div>
    </div>
  )
}
