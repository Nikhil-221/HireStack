import { useEffect, useState } from 'react'
import { fetchCandidateProfile, saveCandidateProfile } from '@/api/candidate'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { TagListInput } from '@/components/ui/TagListInput'
import { TextArea } from '@/components/ui/TextArea'
import type { CandidateProfilePayload } from '@/types/candidate'

const emptyProfile: CandidateProfilePayload = { phone: null, location: null, education: null, experience: null, skills: [] }

export function CandidateProfilePage() {
  const [values, setValues] = useState<CandidateProfilePayload>(emptyProfile)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => { fetchCandidateProfile().then((profile) => setValues({ phone: profile.phone, location: profile.location, education: profile.education, experience: profile.experience, skills: profile.skills })).catch(() => undefined).finally(() => setIsLoading(false)) }, [])

  const save = async () => {
    setIsSaving(true); setMessage(null)
    try { await saveCandidateProfile(values); setMessage('Profile saved.') } catch { setMessage('Could not save profile.') } finally { setIsSaving(false) }
  }

  if (isLoading) return <p className="text-sm text-slate-500">Loading profile…</p>
  return <div className="max-w-3xl"><p className="text-xs font-bold uppercase tracking-[.16em] text-brand-600">Candidate profile</p><h1 className="page-heading mt-2">My profile</h1><p className="page-subtitle">Complete this before applying for a job.</p>
    <div className="mt-8 rounded-2xl bg-white p-5 shadow-[0_12px_35px_rgba(15,23,42,.06)] ring-1 ring-slate-200/70 sm:p-7"><div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
      <Input id="phone" label="Phone" value={values.phone ?? ''} onChange={(e) => setValues({ ...values, phone: e.target.value || null })} />
      <Input id="location" label="Location" value={values.location ?? ''} onChange={(e) => setValues({ ...values, location: e.target.value || null })} />
    </div>
    <div className="mt-4"><TextArea id="education" label="Education" rows={3} value={values.education ?? ''} onChange={(e) => setValues({ ...values, education: e.target.value || null })} /></div>
    <div className="mt-4"><TextArea id="experience" label="Experience" rows={4} value={values.experience ?? ''} onChange={(e) => setValues({ ...values, experience: e.target.value || null })} /></div>
    <div className="mt-4"><TagListInput label="Skills" placeholder="Add a skill and press Enter" items={values.skills} onChange={(skills) => setValues({ ...values, skills })} /></div>
    {message && <p className={`mt-4 text-sm ${message === 'Profile saved.' ? 'text-green-700' : 'text-red-600'}`}>{message}</p>}
    <div className="mt-6 flex justify-end"><Button onClick={save} disabled={isSaving}>{isSaving ? 'Saving…' : 'Save profile'}</Button></div></div></div>
}
