import {
  APPAREL_CATEGORIES,
  CANNABIS_CATEGORIES,
  apparelPlaceholderForCategory,
  isApparelCategory,
  isCannabisCategory,
  resolveProductMedia,
} from '../../../lib/productCatalog'
import type { Brand, Product, StockMode, View } from '../types'
import { titleCase } from './format'

export function stockModeForCategory(category: Product['category']): StockMode {
  return isApparelCategory(category) ? 'apparel' : 'cannabis'
}

export function defaultCategoryForMode(mode: StockMode): Product['category'] {
  return mode === 'apparel' ? 'shirts' : 'flower'
}

export function viewTitle(view: View) {
  switch (view) {
    case 'dashboard':
      return 'Site overview'
    case 'stock':
      return 'All stock'
    case 'apparel':
      return 'Apparel'
    case 'cannabis':
      return 'Cannabis'
    case 'brands':
      return 'Brands'
    case 'users':
      return 'Users'
  }
}

export function brandName(product: Product) {
  if (Array.isArray(product.brand)) return product.brand[0]?.name ?? null
  return product.brand?.name ?? null
}

export function brandLogo(product: Product) {
  if (Array.isArray(product.brand)) return product.brand[0]?.logo_url ?? null
  return product.brand?.logo_url ?? null
}

export function productMedia(product: Product) {
  return resolveProductMedia({
    imageUrl: product.image_url,
    category: product.category,
    brandLogoUrl: brandLogo(product),
  })
}

export function stockFallbackHint(category: Product['category'], brand?: Brand | null) {
  const placeholder = apparelPlaceholderForCategory(category)

  if (placeholder) {
    return `${titleCase(category)} placeholder artwork will be used until you add a real product image.`
  }

  if (brand?.logo_url) {
    return `${brand.name}'s logo will be used as the fallback when no product image is supplied.`
  }

  return 'Upload a product image or choose a brand logo fallback.'
}

export function allStockCategories() {
  return [...APPAREL_CATEGORIES, ...CANNABIS_CATEGORIES, 'other' as const]
}

export { APPAREL_CATEGORIES, CANNABIS_CATEGORIES, isApparelCategory, isCannabisCategory }