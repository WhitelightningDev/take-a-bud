import type { Brand, Product } from '../types'
import { titleCase } from '../utils'

type StockFiltersProps = {
  open: boolean
  brands: Brand[]
  statusFilter: 'all' | 'active' | 'hidden'
  brandFilter: 'all' | string
  categoryFilter: 'all' | Product['category']
  stockFilterCategories: Product['category'][]
  onStatusFilterChange: (value: 'all' | 'active' | 'hidden') => void
  onBrandFilterChange: (value: 'all' | string) => void
  onCategoryFilterChange: (value: 'all' | Product['category']) => void
  onClear: () => void
}

export function StockFilters({
  open,
  brands,
  statusFilter,
  brandFilter,
  categoryFilter,
  stockFilterCategories,
  onStatusFilterChange,
  onBrandFilterChange,
  onCategoryFilterChange,
  onClear,
}: StockFiltersProps) {
  if (!open) return null

  return (
    <div className="adminFilters">
      <label className="adminFilters__field">
        <span className="adminFilters__label">Status</span>
        <select
          className="adminFilters__input"
          value={statusFilter}
          onChange={(event) => onStatusFilterChange(event.target.value as 'all' | 'active' | 'hidden')}
        >
          <option value="all">All</option>
          <option value="active">Active</option>
          <option value="hidden">Hidden</option>
        </select>
      </label>

      <label className="adminFilters__field">
        <span className="adminFilters__label">Brand</span>
        <select
          className="adminFilters__input"
          value={brandFilter}
          onChange={(event) => onBrandFilterChange(event.target.value)}
        >
          <option value="all">All</option>
          {brands.map((brand) => (
            <option key={brand.id} value={brand.id}>
              {brand.name}
            </option>
          ))}
        </select>
      </label>

      <label className="adminFilters__field">
        <span className="adminFilters__label">Category</span>
        <select
          className="adminFilters__input"
          value={categoryFilter}
          onChange={(event) => onCategoryFilterChange(event.target.value as 'all' | Product['category'])}
        >
          <option value="all">All</option>
          {stockFilterCategories.map((category) => (
            <option key={category} value={category}>
              {titleCase(category)}
            </option>
          ))}
        </select>
      </label>

      <button className="adminButton" type="button" onClick={onClear}>
        Clear
      </button>
    </div>
  )
}