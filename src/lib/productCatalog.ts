export const APPAREL_CATEGORIES = ['caps', 'shirts', 'apparel', 'accessory'] as const
export const CANNABIS_CATEGORIES = [
  'flower',
  'edible',
  'edibles',
  'beverages',
  'smokables',
  'vape',
  'concentrate',
] as const

const APPAREL_PLACEHOLDERS: Partial<Record<string, string>> = {
  caps: '/placeholders/cap-placeholder.png',
  shirts: '/placeholders/shirt-placeholder.png',
  apparel: '/placeholders/shirt-placeholder.png',
  accessory: '/placeholders/shirt-placeholder.png',
}

export type ProductMediaSource = 'product' | 'placeholder' | 'brand'

export function isApparelCategory(category?: string | null) {
  return Boolean(category && APPAREL_CATEGORIES.includes(category as (typeof APPAREL_CATEGORIES)[number]))
}

export function isCannabisCategory(category?: string | null) {
  return Boolean(category && CANNABIS_CATEGORIES.includes(category as (typeof CANNABIS_CATEGORIES)[number]))
}

export function apparelPlaceholderForCategory(category?: string | null) {
  if (!category) return null
  return APPAREL_PLACEHOLDERS[category] ?? null
}

export function resolveProductMedia({
  imageUrl,
  category,
  brandLogoUrl,
}: {
  imageUrl?: string | null
  category?: string | null
  brandLogoUrl?: string | null
}) {
  if (imageUrl) return { url: imageUrl, source: 'product' as ProductMediaSource }

  const apparelPlaceholder = apparelPlaceholderForCategory(category)
  if (apparelPlaceholder) return { url: apparelPlaceholder, source: 'placeholder' as ProductMediaSource }

  if (brandLogoUrl) return { url: brandLogoUrl, source: 'brand' as ProductMediaSource }

  return null
}
