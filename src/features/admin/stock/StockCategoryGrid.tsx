import type { Product, View } from '../types'
import { APPAREL_CATEGORIES, CANNABIS_CATEGORIES, titleCase } from '../utils'

type StockCategoryGridProps = {
  view: View
  categoryFilter: 'all' | Product['category']
  categoryCounts: Map<Product['category'], number>
  onCategoryFilterChange: (category: 'all' | Product['category']) => void
}

export function StockCategoryGrid({
  view,
  categoryFilter,
  categoryCounts,
  onCategoryFilterChange,
}: StockCategoryGridProps) {
  if (view !== 'apparel' && view !== 'cannabis') return null

  const categories = view === 'apparel' ? APPAREL_CATEGORIES : CANNABIS_CATEGORIES

  return (
    <div className="adminCategoryGrid" aria-label={`${view} categories`}>
      {categories.map((category) => (
        <button
          key={category}
          className={
            categoryFilter === category
              ? 'adminCategoryCard adminCategoryCard--active'
              : 'adminCategoryCard'
          }
          type="button"
          onClick={() => onCategoryFilterChange(categoryFilter === category ? 'all' : category)}
        >
          <span className="adminCategoryCard__label">{titleCase(category)}</span>
          <span className="adminCategoryCard__count">{categoryCounts.get(category) ?? 0}</span>
        </button>
      ))}
    </div>
  )
}