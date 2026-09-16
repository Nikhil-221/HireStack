import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { TopNav } from './TopNav'

export function AdminLayout() {
  return (
    <div className="app-surface min-h-screen lg:grid lg:grid-cols-[16rem_minmax(0,1fr)]">
      <Sidebar />
      <div className="flex min-h-screen min-w-0 flex-col">
        <TopNav />
        <main className="min-w-0 flex-1 overflow-y-auto">
          <div className="px-5 py-7 sm:px-8 lg:px-10 lg:py-10">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
