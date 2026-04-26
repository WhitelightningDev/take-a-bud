import { useMemo } from 'react'
import type { Product, ProfileRow } from '../types'
import { APPAREL_CATEGORIES, CANNABIS_CATEGORIES, isApparelCategory, isCannabisCategory } from '../utils'

export function useDashboardAnalytics({
  products,
  profiles,
}: {
  products: Product[]
  profiles: ProfileRow[]
}) {
  return useMemo(() => {
    const now = Date.now()
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000

    const activeProducts = products.filter((product) => product.active)
    const apparelProducts = products.filter((product) => isApparelCategory(product.category))
    const cannabisProducts = products.filter((product) => isCannabisCategory(product.category))

    const stockUnits = (items: Product[]) =>
      items.reduce((total, product) => total + Math.max(product.stock_qty ?? 0, 0), 0)

    const lowStock = (items: Product[]) =>
      items
        .filter((product) => product.active && (product.stock_qty ?? 0) <= 3)
        .sort((a, b) => (a.stock_qty ?? 0) - (b.stock_qty ?? 0))
        .slice(0, 6)

    const categoryRows = [...APPAREL_CATEGORIES, ...CANNABIS_CATEGORIES].map((category) => {
      const items = products.filter((product) => product.category === category)

      return {
        category,
        count: items.length,
        active: items.filter((product) => product.active).length,
        units: stockUnits(items),
        out: items.filter((product) => product.active && (product.stock_qty ?? 0) <= 0).length,
      }
    })

    const signedUpWithin = (profile: ProfileRow, windowMs: number) => {
      const createdAt = new Date(profile.created_at).getTime()
      return Number.isFinite(createdAt) && now - createdAt <= windowMs
    }

    return {
      activeProducts,
      apparelProducts,
      cannabisProducts,
      apparelStockUnits: stockUnits(apparelProducts),
      cannabisStockUnits: stockUnits(cannabisProducts),
      apparelLowStock: lowStock(apparelProducts),
      cannabisLowStock: lowStock(cannabisProducts),
      categoryRows,
      recentProfiles: profiles.slice(0, 6),
      signups7: profiles.filter((profile) => signedUpWithin(profile, sevenDaysMs)).length,
      signups30: profiles.filter((profile) => signedUpWithin(profile, thirtyDaysMs)).length,
      incompleteProfiles: profiles.filter(
        (profile) =>
          !profile.accepted_regulations ||
          !profile.id_number ||
          !profile.address ||
          !(profile.full_name ?? `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim()),
      ),
    }
  }, [products, profiles])
}