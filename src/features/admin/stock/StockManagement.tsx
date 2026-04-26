import type { Brand, ConfirmDialogState, Product, View } from '../types'
import { StockCategoryGrid } from './StockCategoryGrid'
import { StockFilters } from './StockFilters'
import { StockTable } from './StockTable'
import { useStockActions } from './useStockActions'

type StockManagementProps = {
  view: View
  products: Product[]
  brands: Brand[]
  loading: boolean
  error: string | null
  tab: 'all' | 'apparel' | 'cannabis' | 'featured'
  filterOpen: boolean
  statusFilter: 'all' | 'active' | 'hidden'
  brandFilter: 'all' | string
  categoryFilter: 'all' | Product['category']
  categoryCounts: Map<Product['category'], number>
  stockFilterCategories: Product['category'][]
  filteredProducts: Product[]
  onTabChange: (tab: 'all' | 'apparel' | 'cannabis' | 'featured') => void
  onViewChange: (view: View) => void
  onFilterOpenChange: (value: boolean) => void
  onStatusFilterChange: (value: 'all' | 'active' | 'hidden') => void
  onBrandFilterChange: (value: 'all' | string) => void
  onCategoryFilterChange: (value: 'all' | Product['category']) => void
  onClearFilters: () => void
  onOpenAddStock: (mode: 'apparel' | 'cannabis') => void
  onStockAdjust: (product: Product) => void
  onConfirm: (dialog: ConfirmDialogState) => void
  reloadProducts: () => Promise<void>
}

export function StockManagement({
  view,
  brands,
  loading,
  error,
  tab,
  filterOpen,
  statusFilter,
  brandFilter,
  categoryFilter,
  categoryCounts,
  stockFilterCategories,
  filteredProducts,
  onTabChange,
  onViewChange,
  onFilterOpenChange,
  onStatusFilterChange,
  onBrandFilterChange,
  onCategoryFilterChange,
  onClearFilters,
  onOpenAddStock,
  onStockAdjust,
  onConfirm,
  reloadProducts,
}: StockManagementProps) {
  const { toggleFeatured, toggleActive, deleteProduct } = useStockActions({
    reload: reloadProducts,
  })

  const stockScope = view === 'apparel' || view === 'cannabis' ? view : tab

  return (
    <section
      className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm ring-1 ring-slate-950/[0.02]"
      aria-label="Stock items"
    >
      <div className="flex flex-col gap-4 border-b border-slate-200/80 bg-gradient-to-br from-white via-white to-slate-50 px-4 py-4 sm:flex-row sm:items-start sm:justify-between lg:px-5">
        <div className="min-w-0 space-y-1.5">
          <h2 className="text-lg font-extrabold tracking-tight text-slate-950">
            {stockScope === 'apparel'
              ? 'Apparel management'
              : stockScope === 'cannabis'
                ? 'Cannabis management'
                : 'Stock management'}
          </h2>

          <p className="max-w-3xl text-sm font-medium leading-6 text-slate-500">
            {stockScope === 'apparel'
              ? 'Use apparel-specific placeholders and keep caps and shirts separate from cannabis products.'
              : stockScope === 'cannabis'
                ? 'Manage flower, edibles, beverages, smokables, vape items, and concentrates with cannabis-specific fields.'
                : 'Search, filter, and manage apparel and cannabis stock with separate handlers.'}
          </p>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[0.68rem] font-extrabold uppercase tracking-[0.14em] text-slate-500 shadow-sm">
              {stockScope === 'apparel'
                ? 'Apparel only'
                : stockScope === 'cannabis'
                  ? 'Cannabis only'
                  : stockScope === 'featured'
                    ? 'Featured stock'
                    : 'All stock'}
            </span>
            <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[0.68rem] font-extrabold uppercase tracking-[0.14em] text-emerald-700">
              {filteredProducts.length} items
            </span>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
          <button
            className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-extrabold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            type="button"
            onClick={() => onFilterOpenChange(!filterOpen)}
          >
            Filters
          </button>

          <button
            className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-950 bg-slate-950 px-3.5 text-xs font-extrabold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            type="button"
            onClick={() => onOpenAddStock(stockScope === 'cannabis' ? 'cannabis' : 'apparel')}
          >
            {stockScope === 'cannabis' ? 'Add cannabis' : 'Add apparel'}
          </button>
        </div>
      </div>

      {view === 'stock' ? (
        <div className="mx-4 mt-4 flex flex-wrap gap-1.5 rounded-2xl border border-slate-200 bg-slate-50/80 p-1.5 lg:mx-5" role="tablist" aria-label="Stock tabs">
          <button
            className={
              tab === 'all'
                ? 'rounded-xl bg-slate-950 px-3.5 py-2 text-xs font-extrabold text-white shadow-sm'
                : 'rounded-xl px-3.5 py-2 text-xs font-extrabold text-slate-600 transition hover:bg-white hover:text-slate-950 hover:shadow-sm'
            }
            type="button"
            onClick={() => onTabChange('all')}
          >
            All stock
          </button>

          <button
            className={
              tab === 'apparel'
                ? 'rounded-xl bg-slate-950 px-3.5 py-2 text-xs font-extrabold text-white shadow-sm'
                : 'rounded-xl px-3.5 py-2 text-xs font-extrabold text-slate-600 transition hover:bg-white hover:text-slate-950 hover:shadow-sm'
            }
            type="button"
            onClick={() => onViewChange('apparel')}
          >
            Apparel management
          </button>

          <button
            className={
              tab === 'cannabis'
                ? 'rounded-xl bg-slate-950 px-3.5 py-2 text-xs font-extrabold text-white shadow-sm'
                : 'rounded-xl px-3.5 py-2 text-xs font-extrabold text-slate-600 transition hover:bg-white hover:text-slate-950 hover:shadow-sm'
            }
            type="button"
            onClick={() => onViewChange('cannabis')}
          >
            Cannabis management
          </button>

          <button
            className={
              tab === 'featured'
                ? 'rounded-xl bg-slate-950 px-3.5 py-2 text-xs font-extrabold text-white shadow-sm'
                : 'rounded-xl px-3.5 py-2 text-xs font-extrabold text-slate-600 transition hover:bg-white hover:text-slate-950 hover:shadow-sm'
            }
            type="button"
            onClick={() => onTabChange('featured')}
          >
            Featured
          </button>
        </div>
      ) : null}

      <div className="space-y-4 px-4 py-4 lg:px-5">
        <StockCategoryGrid
          view={view}
          categoryFilter={categoryFilter}
          categoryCounts={categoryCounts}
          onCategoryFilterChange={onCategoryFilterChange}
        />

        <StockFilters
          open={filterOpen}
          brands={brands}
          statusFilter={statusFilter}
          brandFilter={brandFilter}
          categoryFilter={categoryFilter}
          stockFilterCategories={stockFilterCategories}
          onStatusFilterChange={onStatusFilterChange}
          onBrandFilterChange={onBrandFilterChange}
          onCategoryFilterChange={onCategoryFilterChange}
          onClear={onClearFilters}
        />

        <StockTable
          products={filteredProducts}
          loading={loading}
          error={error}
          onStockAdjust={onStockAdjust}
          onToggleFeatured={toggleFeatured}
          onToggleActive={toggleActive}
          onDelete={deleteProduct}
          onConfirm={onConfirm}
        />
      </div>
    </section>
  )
}