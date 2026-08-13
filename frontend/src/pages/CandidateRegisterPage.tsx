import { useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { register } from '@/api/auth'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

export function CandidateRegisterPage() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    setIsSubmitting(true)
    try {
      await register({ name, email, username, password, role: 'candidate' })
      navigate('/candidate/login', { state: { registered: true } })
    } catch {
      setError('Could not create account. The username or email may already be taken.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return <AuthCard title="Create candidate account" subtitle="Apply for jobs and track your applications.">
    <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
      <Input id="name" label="Full name" value={name} onChange={(e) => setName(e.target.value)} required />
      <Input id="email" label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      <Input id="username" label="Username" value={username} onChange={(e) => setUsername(e.target.value)} required />
      <Input id="password" label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      <Input id="confirm-password" label="Confirm password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Creating…' : 'Create account'}</Button>
    </form>
    <p className="mt-6 text-center text-sm text-slate-500">Already have an account? <Link to="/candidate/login" className="font-medium text-indigo-600">Sign in</Link></p>
  </AuthCard>
}

export function AuthCard({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return <div className="app-surface flex min-h-screen items-center justify-center px-4 py-10"><div className="w-full max-w-md rounded-3xl bg-white p-7 shadow-[0_24px_70px_rgba(15,23,42,.12)] ring-1 ring-slate-200/70 sm:p-9"><div className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-600 font-black text-white shadow-lg shadow-brand-500/25">H</div><h1 className="mt-6 text-3xl font-bold tracking-tight text-slate-900">{title}</h1><p className="mt-2 text-sm leading-6 text-slate-500">{subtitle}</p>{children}</div></div>
}
