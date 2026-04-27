

export type ProductCategory =
  | 'caps'
  | 'shirts'
  | 'apparel'
  | 'accessory'
  | 'flower'
  | 'edible'
  | 'edibles'
  | 'beverages'
  | 'smokables'
  | 'vape'
  | 'concentrate'
  | 'other'

export type ProductStrainType = 'sativa' | 'indica' | 'hybrid'
export type ProductConsumptionMethod = 'smokable' | 'edible' | 'dab'

export type ProductBrand = {
  id: string
  name: string
  logo_url: string | null
}

export type ProductDetail = {
  id: string
  name: string
  description: string | null
  price_cents: number
  image_url: string | null
  active: boolean
  created_at: string
  brand_id: string | null
  brand: ProductBrand | ProductBrand[] | null
  strain_type: ProductStrainType | null
  consumption_method: ProductConsumptionMethod | null
  stock_qty: number
  category: ProductCategory
  featured_on_landing: boolean
}

export type CartItem = {
  productId: string
  name: string
  priceCents: number
  imageUrl: string | null
  quantity: number
}

export type ProductActionNotice = {
  tone: 'success' | 'warning' | 'error' | 'neutral'
  message: string
}