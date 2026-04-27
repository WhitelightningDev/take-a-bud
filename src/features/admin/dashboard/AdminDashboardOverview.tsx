import { useState } from 'react'
import { Sparkline } from '../components'
import type { Product, ProfileRow, Brand } from '../types'
import { isApparelCategory, isCannabisCategory, titleCase } from '../utils'
import { UserProfileDialog } from '../users/UserProfileDialog'
import { UsersTable } from '../users/UsersTable'
import { useDashboardAnalytics } from './useDashboardAnalytics'

type AdminDashboardOverviewProps = {
  products: Product[]
  brands: Brand[]
  profiles: ProfileRow[]
  onViewChange: (view: 'stock' | 'apparel' | 'cannabis' | 'brands' | 'users') => void
  onProfileSelect?: (profile: ProfileRow) => void
}

function ActionButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-xs font-extrabold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950"
      type="button"
      onClick={onClick}
    >
      {children}
    </button>
  )
}

export function AdminDashboardOverview({
  products,
  brands,
  profiles,
  onViewChange,
  onProfileSelect,
}: AdminDashboardOverviewProps) {
  const analytics = useDashboardAnalytics({ products, profiles })
  const [selectedProfile, setSelectedProfile] = useState<ProfileRow | null>(null)

  const handleViewProfile = (profile: ProfileRow) => {
    onProfileSelect?.(profile)
    setSelectedProfile(profile)
  }

  const metrics = {
    total: products.length,
    active: products.filter((product) => product.active).length,
    featured: products.filter((product) => product.featured_on_landing && product.active).length,
    outOfStock: products.filter((product) => (product.stock_qty ?? 0) <= 0 && product.active).length,
    apparel: products.filter((product) => isApparelCategory(product.category)).length,
    cannabis: products.filter((product) => isCannabisCategory(product.category)).length,
    activeBrands: brands.filter((brand) => brand.active).length,
    totalUsers: profiles.length,
    admins: profiles.filter((profile) => profile.is_admin).length,
  }

  const stockPanels = [
    {
      title: 'Apparel stock levels',
      subtitle: 'Caps, shirts, apparel, and accessories only.',
      rows: analytics.categoryRows.filter((row) => isApparelCategory(row.category)),
      lowStock: analytics.apparelLowStock,
      empty: 'No apparel items are low.',
    },
    {
      title: 'Cannabis stock levels',
      subtitle: 'Flower, edibles, beverages, smokables, vapes, concentrates.',
      rows: analytics.categoryRows.filter((row) => isCannabisCategory(row.category)),
      lowStock: analytics.cannabisLowStock,
      empty: 'No cannabis items are low.',
    },
  ]

  return (
    <div className="w-full min-w-0 space-y-6 overflow-hidden">
      <section className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-label="Metrics">
        {[
          ['Total items', metrics.total, 'Across all categories'],
          ['Active items', metrics.active, 'Visible to customers'],
          ['Apparel', metrics.apparel, 'Caps, shirts, and merch'],
          ['Cannabis', metrics.cannabis, 'Flower, edibles, beverages, smokables'],
          ['Featured items', metrics.featured, 'Shown on public landing'],
          ['Out of stock', metrics.outOfStock, 'Active items with 0 qty'],
        ].map(([label, value, sub]) => (
          <div
            className="min-w-0 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            key={String(label)}
          >
            <div className="flex min-w-0 items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-xs font-extrabold uppercase tracking-[0.14em] text-slate-400">
                  {label}
                </p>
                <div className="mt-2 text-3xl font-black tracking-tight text-slate-950">{value}</div>
                <p className="mt-1 line-clamp-2 text-sm font-medium leading-5 text-slate-500">{sub}</p>
              </div>
            </div>
            <div className="mt-4 overflow-hidden rounded-2xl bg-slate-50 p-2">
              <Sparkline points={Array.from({ length: 12 }, () => Number(value))} />
            </div>
          </div>
        ))}
      </section>

      <section className="grid min-w-0 grid-cols-1 gap-5 xl:grid-cols-2" aria-label="Dashboard insights">
        <section className="min-w-0 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm" aria-label="Catalog split">
          <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h2 className="text-lg font-black tracking-tight text-slate-950">Catalog split</h2>
              <p className="mt-1 text-sm font-medium leading-6 text-slate-500">
                Apparel and cannabis stay separated in management.
              </p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
              <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-slate-400">Active catalog</p>
              <div className="mt-2 text-2xl font-black text-slate-950">{analytics.activeProducts.length}</div>
              <div className="mt-4">
                <ActionButton onClick={() => onViewChange('stock')}>Review all stock</ActionButton>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
              <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-slate-400">Apparel units</p>
              <div className="mt-2 text-2xl font-black text-slate-950">{analytics.apparelStockUnits}</div>
              <div className="mt-4">
                <ActionButton onClick={() => onViewChange('apparel')}>Manage apparel</ActionButton>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
              <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-slate-400">Cannabis units</p>
              <div className="mt-2 text-2xl font-black text-slate-950">{analytics.cannabisStockUnits}</div>
              <div className="mt-4">
                <ActionButton onClick={() => onViewChange('cannabis')}>Manage cannabis</ActionButton>
              </div>
            </div>
          </div>
        </section>

        <section className="min-w-0 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm" aria-label="Customer signups">
          <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h2 className="text-lg font-black tracking-tight text-slate-950">Signups and profiles</h2>
              <p className="mt-1 text-sm font-medium leading-6 text-slate-500">
                {analytics.signups7} new in 7 days • {analytics.signups30} new in 30 days
              </p>
            </div>

            <ActionButton onClick={() => onViewChange('users')}>Manage users</ActionButton>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
              <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-slate-400">Total users</p>
              <div className="mt-2 text-2xl font-black text-slate-950">{metrics.totalUsers}</div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
              <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-slate-400">
                Profiles needing attention
              </p>
              <div className="mt-2 text-2xl font-black text-slate-950">{analytics.incompleteProfiles.length}</div>
            </div>
          </div>
        </section>
      </section>

      <section className="grid min-w-0 grid-cols-1 gap-5 xl:grid-cols-2" aria-label="Stock levels">
        {stockPanels.map((panel) => (
          <section className="min-w-0 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm" aria-label={panel.title} key={panel.title}>
            <div className="min-w-0">
              <h2 className="text-lg font-black tracking-tight text-slate-950">{panel.title}</h2>
              <p className="mt-1 text-sm font-medium leading-6 text-slate-500">{panel.subtitle}</p>
            </div>

            <div className="mt-5 divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200">
              {panel.rows.map((row) => (
                <div key={row.category} className="grid grid-cols-2 gap-3 bg-white px-4 py-3 text-sm sm:grid-cols-[1fr_auto_auto_auto]">
                  <span className="min-w-0 truncate font-extrabold text-slate-800">{titleCase(row.category)}</span>
                  <strong className="font-black text-slate-950">{row.units} units</strong>
                  <small className="font-bold text-slate-500">
                    {row.active}/{row.count} active
                  </small>
                  <em className="not-italic font-bold text-red-600">{row.out} out</em>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-2xl bg-slate-50 p-4">
              <div className="mb-3 text-xs font-extrabold uppercase tracking-[0.14em] text-slate-400">Low stock</div>

              {panel.lowStock.length > 0 ? (
                <div className="space-y-2">
                  {panel.lowStock.map((product) => (
                    <div key={product.id} className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2 shadow-sm">
                      <span className="min-w-0 truncate text-sm font-bold text-slate-700">{product.name}</span>
                      <strong className="shrink-0 text-sm font-black text-slate-950">{product.stock_qty ?? 0}</strong>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm font-medium text-slate-500">{panel.empty}</p>
              )}
            </div>
          </section>
        ))}
      </section>

      <section className="grid min-w-0 grid-cols-1 gap-5 xl:grid-cols-2" aria-label="Customers and sales">
        <section className="min-w-0 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm" aria-label="Recent signups">
          <div className="min-w-0">
            <h2 className="text-lg font-black tracking-tight text-slate-950">Recent signups</h2>
            <p className="mt-1 text-sm font-medium leading-6 text-slate-500">Latest account activity from profiles.</p>
          </div>

          <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
            <UsersTable users={analytics.recentProfiles} onViewProfile={handleViewProfile} />
          </div>
        </section>

        <section className="min-w-0 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm" aria-label="Sales analytics">
          <div className="min-w-0">
            <h2 className="text-lg font-black tracking-tight text-slate-950">Sales analytics</h2>
            <p className="mt-1 text-sm font-medium leading-6 text-slate-500">
              Buyer spend and product purchase mix need order data.
            </p>
          </div>

          <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-black text-amber-900">Orders are not connected yet</p>
            <p className="mt-2 text-sm font-medium leading-6 text-amber-800">
              The current database has products, brands, and profiles, but no orders or order_items table.
              Once checkout/order capture exists, this panel can show who buys, how much they spend,
              purchase timing, and product-type demand.
            </p>
          </div>
        </section>
      </section>

      {selectedProfile ? (
        <UserProfileDialog user={selectedProfile} onClose={() => setSelectedProfile(null)} />
      ) : null}
    </div>
  )
}
