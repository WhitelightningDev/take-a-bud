

import type { CartItem, ProductDetail } from './types.ts'

export const CART_KEY = 'take-a-bud-cart'
export const FAVOURITES_KEY = 'take-a-bud-favourites'
export const LAST_ORDER_REQUEST_KEY = 'take-a-bud-last-order-request'

export function formatZar(cents: number) {
  return (cents / 100).toLocaleString(undefined, { style: 'currency', currency: 'ZAR' })
}

export function titleCase(value: string) {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(' ')
}

export function getProductBrand(product: ProductDetail) {
  if (Array.isArray(product.brand)) return product.brand[0] ?? null
  return product.brand
}

export function isProductInStock(product: Pick<ProductDetail, 'stock_qty'> | null | undefined) {
  return Boolean(product && (product.stock_qty ?? 0) > 0)
}

export function productMaxQuantity(product: Pick<ProductDetail, 'stock_qty'> | null | undefined) {
  return Math.max(1, product?.stock_qty ?? 0)
}

export function productCategoryLabel(product: Pick<ProductDetail, 'category'>) {
  return titleCase(product.category)
}

export function productStrainLabel(product: Pick<ProductDetail, 'strain_type'>) {
  return product.strain_type ? titleCase(product.strain_type) : 'Not specified'
}

export function productConsumptionLabel(product: Pick<ProductDetail, 'consumption_method'>) {
  return product.consumption_method ? titleCase(product.consumption_method) : 'Not specified'
}

export function getLocalStorageArray<T>(key: string): T[] {
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return []

    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveLocalStorageArray<T>(key: string, value: T[]) {
  window.localStorage.setItem(key, JSON.stringify(value))
}

export function productIsSaved(productId: string) {
  return getLocalStorageArray<string>(FAVOURITES_KEY).includes(productId)
}

export function toggleProductSaved(productId: string) {
  const favourites = getLocalStorageArray<string>(FAVOURITES_KEY)
  const nextSaved = !favourites.includes(productId)
  const next = nextSaved
    ? [...favourites, productId]
    : favourites.filter((id) => id !== productId)

  saveLocalStorageArray(FAVOURITES_KEY, next)
  return nextSaved
}

export function addProductToCart({
  product,
  imageUrl,
  quantity,
}: {
  product: ProductDetail
  imageUrl: string | null
  quantity: number
}) {
  const cart = getLocalStorageArray<CartItem>(CART_KEY)
  const maxQuantity = productMaxQuantity(product)
  const nextQuantity = Math.min(maxQuantity, Math.max(1, quantity))
  const existing = cart.find((item) => item.productId === product.id)

  const nextCart = existing
    ? cart.map((item) =>
        item.productId === product.id
          ? { ...item, quantity: Math.min(maxQuantity, item.quantity + nextQuantity) }
          : item,
      )
    : [
        ...cart,
        {
          productId: product.id,
          name: product.name,
          priceCents: product.price_cents,
          imageUrl,
          quantity: nextQuantity,
        },
      ]

  saveLocalStorageArray(CART_KEY, nextCart)
  return nextCart
}

export function saveLastOrderRequest(message: string) {
  window.localStorage.setItem(LAST_ORDER_REQUEST_KEY, message)
}

export function buildOrderRequestMessage(product: ProductDetail, quantity: number) {
  return `Hi, I am interested in ${product.name} (${formatZar(product.price_cents)}). Quantity: ${quantity}.`
}