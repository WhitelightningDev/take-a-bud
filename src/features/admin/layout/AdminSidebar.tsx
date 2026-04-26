import { Link, useNavigate } from 'react-router-dom'
import { SidebarItem } from '../components'
import type { View } from '../types'
import logoImg from '../../../assets/take-a-bud-logo.png'

type AdminSidebarProps = {
  view: View
  query: string
  userEmail?: string | null
  userName?: string | null
  onQueryChange: (value: string) => void
  onViewChange: (view: View) => void
  onSignOut: () => Promise<void>
}

export function AdminSidebar({
  view,
  query,
  userEmail,
  userName,
  onQueryChange,
  onViewChange,
  onSignOut,
}: AdminSidebarProps) {
  const navigate = useNavigate()

  async function handleSignOut() {
    await onSignOut()
    navigate('/', { replace: true })
  }

  return (
    <aside
      className="flex min-h-screen w-[280px] shrink-0 flex-col justify-between border-r border-slate-200/80 bg-gradient-to-b from-white to-slate-50 px-4 py-6 shadow-[10px_0_30px_rgba(15,23,42,0.035)] max-lg:min-h-0 max-lg:w-full max-lg:border-b max-lg:border-r-0 max-lg:px-4 max-lg:py-4"
      aria-label="Admin navigation"
    >
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-3 border-b border-slate-200/80 px-2 pb-5">
          <img
            className="h-11 w-11 rounded-2xl border border-slate-200 bg-white object-contain p-1 shadow-sm"
            src={logoImg}
            alt="Take A Bud"
          />

          <div className="min-w-0">
            <span className="block text-[0.68rem] font-extrabold uppercase tracking-[0.16em] text-slate-400">
              Admin console
            </span>
            <span className="block truncate text-base font-extrabold tracking-tight text-slate-950">
              Take A Bud
            </span>
          </div>
        </div>

        <label className="block px-1">
          <span className="sr-only">Search</span>
          <input
            className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/10"
            placeholder="Search catalog, brands, users…"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
          />
        </label>

        <nav className="flex flex-col gap-1.5 max-lg:grid max-lg:grid-cols-2" aria-label="Admin sections">
          <SidebarItem
            active={view === 'dashboard'}
            label="Dashboard"
            onClick={() => onViewChange('dashboard')}
            icon={
              <svg viewBox="0 0 24 24" role="presentation" aria-hidden="true">
                <path d="M4 13h7V4H4v9Zm0 7h7v-5H4v5Zm9 0h7V11h-7v9Zm0-18v7h7V2h-7Z" />
              </svg>
            }
          />

          <div className="mt-4 px-3 pb-1 text-[0.68rem] font-extrabold uppercase tracking-[0.14em] text-slate-400 max-lg:col-span-2">
            Catalog
          </div>

          <SidebarItem
            active={view === 'stock'}
            label="All stock"
            onClick={() => onViewChange('stock')}
            icon={
              <svg viewBox="0 0 24 24" role="presentation" aria-hidden="true">
                <path d="M20 6H4v2h16V6Zm0 5H4v2h16v-2Zm0 5H4v2h16v-2Z" />
              </svg>
            }
          />

          <SidebarItem
            active={view === 'apparel'}
            label="Apparel"
            onClick={() => onViewChange('apparel')}
            icon={
              <svg viewBox="0 0 24 24" role="presentation" aria-hidden="true">
                <path d="M16 3h-2a2 2 0 0 1-4 0H8L4 6v5h3v10h10V11h3V6l-4-3Z" />
              </svg>
            }
          />

          <SidebarItem
            active={view === 'cannabis'}
            label="Cannabis"
            onClick={() => onViewChange('cannabis')}
            icon={
              <svg viewBox="0 0 24 24" role="presentation" aria-hidden="true">
                <path d="M12 2c1.2 2.7 1.3 5.2 0 7.4C10.7 7.2 10.8 4.7 12 2Zm-5 3.8c2.8 1 4.4 2.7 4.7 5.3-2.5-.6-4.1-2.4-4.7-5.3Zm10 0c-.6 2.9-2.2 4.7-4.7 5.3.3-2.6 1.9-4.3 4.7-5.3ZM4 11c3.1-.2 5.3.8 6.6 3.1-2.7.5-4.9-.5-6.6-3.1Zm16 0c-1.7 2.6-3.9 3.6-6.6 3.1C14.7 11.8 16.9 10.8 20 11Zm-8 3.7c1.2 1.1 1.8 2.5 1.8 4.3h-3.6c0-1.8.6-3.2 1.8-4.3Z" />
              </svg>
            }
          />

          <SidebarItem
            active={view === 'brands'}
            label="Brands"
            onClick={() => onViewChange('brands')}
            icon={
              <svg viewBox="0 0 24 24" role="presentation" aria-hidden="true">
                <path d="M12 2 2 7l10 5 10-5-10-5Zm0 8L2 5v12l10 5 10-5V5l-10 5Z" />
              </svg>
            }
          />

          <div className="mt-4 px-3 pb-1 text-[0.68rem] font-extrabold uppercase tracking-[0.14em] text-slate-400 max-lg:col-span-2">
            Admin
          </div>

          <SidebarItem
            active={view === 'users'}
            label="Users"
            onClick={() => onViewChange('users')}
            icon={
              <svg viewBox="0 0 24 24" role="presentation" aria-hidden="true">
                <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-4.4 0-8 2-8 4.5V21h16v-2.5C20 16 16.4 14 12 14Z" />
              </svg>
            }
          />
        </nav>
      </div>

      <div className="mt-6 flex flex-col gap-3 border-t border-slate-200/80 pt-5">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-sm font-black text-emerald-700">
            {userEmail?.slice(0, 1).toUpperCase() ?? 'U'}
          </div>

          <div className="min-w-0">
            <div className="truncate text-sm font-extrabold text-slate-950">{userName ?? 'Admin'}</div>
            <div className="truncate text-xs font-medium text-slate-500">{userEmail ?? ''}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2">
          <Link
            className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-extrabold text-slate-900 shadow-sm transition hover:bg-slate-50"
            to="/store"
          >
            Open store
          </Link>

          <button
            className="inline-flex h-11 items-center justify-center rounded-2xl border border-red-200 bg-red-50/80 px-4 text-sm font-extrabold text-red-700 transition hover:bg-red-100"
            type="button"
            onClick={handleSignOut}
          >
            Sign out
          </button>
        </div>
      </div>
    </aside>
  )
}