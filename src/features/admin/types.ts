export type View = 'dashboard' | 'stock' | 'apparel' | 'cannabis' | 'brands' | 'users'

export type StockMode = 'apparel' | 'cannabis'
export type NewUserRole = 'admin' | 'user'

export type Brand = {
  id: string
  name: string
  logo_url: string | null
  active: boolean
  created_at: string
}

export type ProfileRow = {
  id: string
  email: string | null
  full_name: string | null
  first_name: string | null
  last_name: string | null
  id_number: string | null
  address: string | null
  accepted_regulations: boolean
  accepted_regulations_at: string | null
  is_admin: boolean
  created_at: string
}

export type Product = {
  id: string
  name: string
  description: string | null
  price_cents: number
  image_url: string | null
  active: boolean
  created_at: string
  brand_id: string | null
  brand:
    | { id: string; name: string; logo_url: string | null }
    | { id: string; name: string; logo_url: string | null }[]
    | null
  strain_type: 'sativa' | 'indica' | 'hybrid' | null
  consumption_method: 'smokable' | 'edible' | 'dab' | null
  stock_qty: number
  category:
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
  featured_on_landing: boolean
}

export type CreatedUserCredentials = {
  email: string
  password: string
  role: NewUserRole
  firstName: string
  lastName: string
  shareText: string
}

export type ConfirmDialogState = {
  title: string
  description: string
  confirmLabel: string
  destructive?: boolean
  onConfirm: () => Promise<void> | void
}