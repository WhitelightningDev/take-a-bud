import type { ReactNode } from 'react'
import { AdminSidebar } from './AdminSidebar'
import { AdminTopbar } from './AdminTopbar'
import type { View } from '../types'

type AdminShellProps = {
  view: View
  query: string
  userEmail?: string | null
  userName?: string | null
  exportRows: Array<Record<string, string | number | boolean | null | undefined>>
  onQueryChange: (value: string) => void
  onViewChange: (view: View) => void
  onSignOut: () => Promise<void>
  children: ReactNode
}

export function AdminShell({
  view,
  query,
  userEmail,
  userName,
  exportRows,
  onQueryChange,
  onViewChange,
  onSignOut,
  children,
}: AdminShellProps) {
  return (
    <div className="flex w-full min-h-screen bg-slate-50">
      <AdminSidebar
        view={view}
        query={query}
        userEmail={userEmail}
        userName={userName}
        onQueryChange={onQueryChange}
        onViewChange={onViewChange}
        onSignOut={onSignOut}
      />

      <main className="flex-1 min-w-0 flex flex-col px-4 py-6 lg:px-6">
        <AdminTopbar view={view} exportRows={exportRows} />

        <div className="flex-1 min-w-0 overflow-x-hidden">
          {children}
        </div>
      </main>
    </div>
  )
}
