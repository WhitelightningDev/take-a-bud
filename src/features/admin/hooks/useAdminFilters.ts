import { useMemo, useState } from 'react'
import type { Brand, Product, ProfileRow, View } from '../types'
import {
  APPAREL_CATEGORIES,
  CANNABIS_CATEGORIES,
  brandName,
  isApparelCategory,
  isCannabisCategory,
} from '../utils'

type StockTab = 'all' | 'apparel' | 'cannabis' | 'featured'
type StatusFilter = 'all' | 'active' | 'hidden'

export function useAdminFilters({
  products,
  brands,
  profiles,
  view,
}: {
  products: Product[]
  brands: Brand[]
  profiles: ProfileRow[]
  view: View
}) {
  const [query, setQuery] = useState('')
  const [tab, setTab] = useState<StockTab>('all')
  const [filterOpen, setFilterOpen] = useState(false)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [brandFilter, setBrandFilter] = useState<'all' | string>('all')
  const [categoryFilter, setCategoryFilter] = useState<'all' | Product['category']>('all')

  const stockScope = view === 'apparel' || view === 'cannabis' ? view : tab

  const categoryCounts = useMemo(() => {
    const counts = new Map<Product['category'], number>()

    for (const product of products) {
      counts.set(product.category, (counts.get(product.category) ?? 0) + 1)
    }

    return counts
  }, [products])

  const stockFilterCategories = useMemo(() => {
    if (stockScope === 'apparel') return [...APPAREL_CATEGORIES]
    if (stockScope === 'cannabis') return [...CANNABIS_CATEGORIES]

    return [...APPAREL_CATEGORIES, ...CANNABIS_CATEGORIES, 'other' as const]
  }, [stockScope])

  const filteredProducts = useMemo(() => {
    const q = query.trim().toLowerCase()

    return products.filter((product) => {
      if (stockScope === 'featured' && !product.featured_on_landing) return false
      if (stockScope === 'apparel' && !isApparelCategory(product.category)) return false
      if (stockScope === 'cannabis' && !isCannabisCategory(product.category)) return false
      if (statusFilter === 'active' && !product.active) return false
      if (statusFilter === 'hidden' && product.active) return false
      if (brandFilter !== 'all' && product.brand_id !== brandFilter) return false
      if (categoryFilter !== 'all' && product.category !== categoryFilter) return false

      if (!q) return true

      const brand = brandName(product) ?? ''

      return (
        product.name.toLowerCase().includes(q) ||
        (product.description ?? '').toLowerCase().includes(q) ||
        brand.toLowerCase().includes(q)
      )
    })
  }, [products, query, stockScope, statusFilter, brandFilter, categoryFilter])

  const filteredBrands = useMemo(() => {
    const q = query.trim().toLowerCase()

    if (!q) return brands

    return brands.filter((brand) => {
      return brand.name.toLowerCase().includes(q) || (brand.logo_url ?? '').toLowerCase().includes(q)
    })
  }, [brands, query])

  const filteredProfiles = useMemo(() => {
    const q = query.trim().toLowerCase()

    if (!q) return profiles

    return profiles.filter((profile) => {
      const name = (
        profile.full_name ?? `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim()
      ).toLowerCase()

      const email = (profile.email ?? '').toLowerCase()

      return name.includes(q) || email.includes(q)
    })
  }, [profiles, query])

  function clearStockFilters() {
    setStatusFilter('all')
    setBrandFilter('all')
    setCategoryFilter('all')
    setQuery('')
  }

  return {
    query,
    setQuery,

    tab,
    setTab,

    filterOpen,
    setFilterOpen,

    statusFilter,
    setStatusFilter,

    brandFilter,
    setBrandFilter,

    categoryFilter,
    setCategoryFilter,

    stockScope,
    categoryCounts,
    stockFilterCategories,

    filteredProducts,
    filteredBrands,
    filteredProfiles,

    clearStockFilters,
  }
}
