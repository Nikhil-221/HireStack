import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'

export function HomePage() {
  return (
    <main className="min-h-[calc(100vh-4rem)] overflow-hidden bg-slate-950 px-4 text-white sm:px-8">
      <section className="relative mx-auto max-w-5xl py-20 text-center sm:py-28">
        <div className="absolute left-1/2 top-8 -z-0 h-72 w-72 -translate-x-1/2 rounded-full bg-brand-500/25 blur-[100px]" />
        <div className="relative flex items-center justify-center gap-3 text-brand-100"><span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-500 text-sm font-black text-white shadow-lg shadow-brand-500/30">H</span><span className="text-lg font-bold tracking-tight text-white">HireStack</span></div>
        <h1 className="relative mx-auto mt-5 max-w-4xl text-4xl font-bold tracking-[-.055em] sm:text-6xl lg:text-7xl">Build teams faster. Find your next opportunity.</h1>
        <p className="relative mx-auto mt-7 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">One focused platform for recruiters to manage hiring and candidates to discover, apply, and stay informed.</p>
      </section>
      <section className="relative mx-auto grid max-w-4xl gap-5 pb-16 md:grid-cols-2">
        <RoleCard title="For Candidates" description="Create your profile, explore open roles, and follow your application status." loginTo="/candidate/login" signupTo="/register?role=candidate" />
        <RoleCard title="For Admins" description="Create job openings, manage hiring, and review candidate applications." loginTo="/login" signupTo="/register?role=recruiter" />
      </section>
    </main>
  )
}

function RoleCard({ title, description, loginTo, signupTo }: { title: string; description: string; loginTo: string; signupTo: string }) {
  return <div className="rounded-2xl border border-white/10 bg-white/8 p-7 text-left shadow-2xl backdrop-blur transition duration-200 hover:-translate-y-1 hover:bg-white/12"><p className="text-xs font-bold uppercase tracking-[.15em] text-brand-100">HireStack</p><h2 className="mt-3 text-2xl font-bold tracking-tight">{title}</h2><p className="mt-3 min-h-12 text-sm leading-6 text-slate-300">{description}</p><div className="mt-7 flex flex-wrap gap-3"><Link to={loginTo}><Button className="bg-white text-slate-950 shadow-none hover:bg-brand-50">Log in</Button></Link><Link to={signupTo}><Button variant="ghost" className="border border-white/20 text-white hover:bg-white/10 hover:text-white">Sign up</Button></Link></div></div>
}
