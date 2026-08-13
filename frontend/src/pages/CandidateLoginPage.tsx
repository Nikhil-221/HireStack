import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { AuthCard } from './CandidateRegisterPage'

export function CandidateLoginPage() {
  const { isAuthenticated, role, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (isAuthenticated) return <Navigate to={role === 'candidate' ? '/candidate/jobs' : '/dashboard'} replace />

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      const loggedInRole = await login(username, password)
      if (loggedInRole !== 'candidate') {
        navigate('/dashboard', { replace: true })
        return
      }
      navigate('/candidate/jobs', { replace: true })
    } catch {
      setError('Invalid username or password')
    } finally {
      setIsSubmitting(false)
    }
  }

  return <AuthCard title="Candidate sign in" subtitle="Continue your job application.">
    {Boolean((location.state as { registered?: boolean } | null)?.registered) && <p className="mt-4 text-sm text-green-700">Account created. Sign in below.</p>}
    <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
      <Input id="username" label="Username" value={username} onChange={(e) => setUsername(e.target.value)} required autoFocus />
      <Input id="password" label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Signing in…' : 'Sign in'}</Button>
    </form>
    <p className="mt-6 text-center text-sm text-slate-500">New candidate? <Link to="/candidate/register" className="font-semibold text-brand-600">Create an account</Link></p>
    <p className="mt-3 text-center text-sm text-slate-500">Hiring for a role? <Link to="/login" className="font-semibold text-brand-600">Admin login</Link></p>
  </AuthCard>
}
