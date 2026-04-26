import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth.ts'
import { toast } from '../hooks/use-toast.ts'
import { toAppError } from '../lib/appError.ts'
import {
  APPAREL_CATEGORIES,
  CANNABIS_CATEGORIES,
  apparelPlaceholderForCategory,
  isApparelCategory,
  isCannabisCategory,
  resolveProductMedia,
} from '../lib/productCatalog.ts'
import { isSupabaseConfigured, supabase } from '../lib/supabaseClient.ts'
import logoImg from '../assets/take-a-bud-logo.png'



/**
 * Refactor target:
 * This page currently owns admin data loading, catalog helpers, filters, forms, dialogs,
 * dashboard analytics, and all rendered sections. Keep this file as the route/container,
 * then move feature-specific logic into src/features/admin/* modules.
 */
const PRODUCT_IMAGES_BUCKET = 'product-images'

type Brand = {
  id: string
  name: string
  logo_url: string | null
  active: boolean
  created_at: string
}

type ProfileRow = {
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

type Product = {
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

type NewUserRole = 'admin' | 'user'
type StockMode = 'apparel' | 'cannabis'

type CreatedUserCredentials = {
  email: string
  password: string
  role: NewUserRole
  firstName: string
  lastName: string
  shareText: string
}

type ConfirmDialog = {
  title: string
  description: string
  confirmLabel: string
  destructive?: boolean
  onConfirm: () => Promise<void> | void
}

type View = 'dashboard' | 'stock' | 'apparel' | 'cannabis' | 'brands' | 'users'

function formatZar(cents: number) {
  return (cents / 100).toLocaleString(undefined, { style: 'currency', currency: 'ZAR' })
}

function titleCase(value: string) {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(' ')
}

function stockModeForCategory(category: Product['category']): StockMode {
  return isApparelCategory(category) ? 'apparel' : 'cannabis'
}

function defaultCategoryForMode(mode: StockMode): Product['category'] {
  return mode === 'apparel' ? 'shirts' : 'flower'
}

function viewTitle(view: View) {
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

function brandName(product: Product) {
  if (Array.isArray(product.brand)) return product.brand[0]?.name ?? null
  return product.brand?.name ?? null
}

function brandLogo(product: Product) {
  if (Array.isArray(product.brand)) return product.brand[0]?.logo_url ?? null
  return product.brand?.logo_url ?? null
}

function productMedia(product: Product) {
  return resolveProductMedia({
    imageUrl: product.image_url,
    category: product.category,
    brandLogoUrl: brandLogo(product),
  })
}

function stockFallbackHint(nextCategory: Product['category'], nextBrand?: Brand | null) {
  const apparelPlaceholder = apparelPlaceholderForCategory(nextCategory)
  if (apparelPlaceholder) {
    return `${titleCase(nextCategory)} placeholder artwork will be used until you add a real product image.`
  }

  if (nextBrand?.logo_url) {
    return `${nextBrand.name}'s logo will be used as the fallback when no product image is supplied.`
  }

  return 'Upload a product image or choose a brand logo fallback.'
}

function downloadCsv(filename: string, rows: Array<Record<string, string | number | null>>) {
  const columns = Array.from(
    rows.reduce((set, row) => {
      for (const key of Object.keys(row)) set.add(key)
      return set
    }, new Set<string>()),
  )

  const escape = (value: unknown) => {
    const stringValue = value === null || value === undefined ? '' : String(value)
    if (/[",\n]/.test(stringValue)) return `"${stringValue.replace(/"/g, '""')}"`
    return stringValue
  }

  const csv = [
    columns.map(escape).join(','),
    ...rows.map((row) => columns.map((column) => escape(row[column])).join(',')),
  ].join('\n')

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function Sparkline({ points }: { points: number[] }) {
  const w = 220
  const h = 56
  const safePoints = points.length > 1 ? points : [points[0] ?? 0, points[0] ?? 0]
  const min = Math.min(...safePoints)
  const max = Math.max(...safePoints)

  const d = safePoints
    .map((value, index) => {
      const x = (index / (safePoints.length - 1)) * w
      const y = max === min ? h / 2 : h - ((value - min) / (max - min)) * h
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`
    })
    .join(' ')

  return (
    <svg className="adminSpark" viewBox={`0 0 ${w} ${h}`} role="presentation" aria-hidden="true">
      <path className="adminSpark__path" d={d} />
    </svg>
  )
}

function SidebarItem({
  active,
  icon,
  label,
  onClick,
}: {
  active?: boolean
  icon: ReactNode
  label: string
  onClick: () => void
}) {
  return (
    <button
      className={[
        'group flex min-h-11 w-full items-center gap-3 rounded-2xl border px-3 py-2.5 text-left text-sm font-extrabold transition',
        active
          ? 'border-slate-900 bg-slate-950 text-white shadow-[0_14px_30px_rgba(15,23,42,0.18)]'
          : 'border-transparent bg-transparent text-slate-600 hover:border-slate-200 hover:bg-white hover:text-slate-950 hover:shadow-sm',
      ].join(' ')}
      type="button"
      onClick={onClick}
    >
      <span
        className={[
          'flex h-5 w-5 shrink-0 items-center justify-center [&_svg]:h-5 [&_svg]:w-5 [&_svg]:fill-current',
          active ? 'text-white' : 'text-slate-400 group-hover:text-slate-700',
        ].join(' ')}
        aria-hidden="true"
      >
        {icon}
      </span>
      <span className="truncate leading-none">{label}</span>
    </button>
  )
}

function AdminLogoPreview({ src, fallback }: { src?: string | null; fallback: string }) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const failed = Boolean(src && failedSrc === src)

  if (!src || failed) {
    const letters = fallback
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((word) => word[0]?.toUpperCase())
      .join('')

    return <div className="adminBrandLogo__fallback">{letters || '—'}</div>
  }

  return (
    <img
      className="adminBrandLogo__img"
      src={src}
      alt=""
      loading="lazy"
      onError={() => setFailedSrc(src)}
    />
  )
}

function AdminCatalogMedia({
  src,
  alt,
  source,
}: {
  src?: string | null
  alt: string
  source?: 'product' | 'placeholder' | 'brand' | null
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const failed = Boolean(src && failedSrc === src)

  if (!src || failed) {
    return <div className="adminCatalogMedia adminCatalogMedia--empty">No image</div>
  }

  return (
    <img
      className={
        source === 'product'
          ? 'adminCatalogMedia__img'
          : 'adminCatalogMedia__img adminCatalogMedia__img--contained'
      }
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailedSrc(src)}
    />
  )
}

function AdminSidebar({
  view,
  query,
  userEmail,
  profileName,
  onQueryChange,
  onViewChange,
  onSignOut,
}: {
  view: View
  query: string
  userEmail?: string | null
  profileName?: string | null
  onQueryChange: (value: string) => void
  onViewChange: (view: View) => void
  onSignOut: () => Promise<void> | void
}) {
  return (
    <aside
      className="flex min-h-screen w-[248px] shrink-0 flex-col justify-between border-r border-slate-200/80 bg-gradient-to-b from-white to-slate-50 px-3 py-4 shadow-sm max-lg:min-h-0 max-lg:w-full max-lg:border-b max-lg:border-r-0 max-lg:px-3 max-lg:py-3"
      aria-label="Admin navigation"
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2.5 border-b border-slate-200/80 px-2 pb-3">
          <img
            className="h-9 w-9 rounded-xl border border-slate-200 bg-white object-contain p-0.5 shadow-sm"
            src={logoImg}
            alt="Take A Bud"
          />
          <div className="min-w-0">
            <span className="block text-[0.62rem] font-bold uppercase tracking-[0.16em] text-slate-400">
              Admin console
            </span>
            <span className="block truncate text-sm font-bold tracking-tight text-slate-950">
              Take A Bud
            </span>
          </div>
        </div>

        <label className="block px-1">
          <span className="sr-only">Search</span>
          <input
            className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/10"
            placeholder="Search catalog, brands, users…"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
          />
        </label>

        <nav className="flex flex-col gap-1 max-lg:grid max-lg:grid-cols-2" aria-label="Admin sections">
          <SidebarItem
            active={view === 'dashboard'}
            label="Dashboard"
            onClick={() => onViewChange('dashboard')}
            icon={
              <svg viewBox="0 0 24 24" role="presentation" aria-hidden="true">
                <path d="M4 13h7V4H4v9Zm0 7h7v-5H4v5Zm9 0h7V11h-7v9Zm0-18v7h7V2h-7Z" />
              </svg>
            }
          />
          <div className="mt-3 px-3 pb-1 text-[0.68rem] font-bold uppercase tracking-[0.14em] text-slate-400 max-lg:col-span-2">
            Catalog
          </div>
          <SidebarItem
            active={view === 'stock'}
            label="All stock"
            onClick={() => onViewChange('stock')}
            icon={
              <svg viewBox="0 0 24 24" role="presentation" aria-hidden="true">
                <path d="M20 6H4v2h16V6Zm0 5H4v2h16v-2Zm0 5H4v2h16v-2Z" />
              </svg>
            }
          />
          <SidebarItem
            active={view === 'apparel'}
            label="Apparel"
            onClick={() => onViewChange('apparel')}
            icon={
              <svg viewBox="0 0 24 24" role="presentation" aria-hidden="true">
                <path d="M16 3h-2a2 2 0 0 1-4 0H8L4 6v5h3v10h10V11h3V6l-4-3Z" />
              </svg>
            }
          />
          <SidebarItem
            active={view === 'cannabis'}
            label="Cannabis"
            onClick={() => onViewChange('cannabis')}
            icon={
              <svg viewBox="0 0 24 24" role="presentation" aria-hidden="true">
                <path d="M12 2c1.2 2.7 1.3 5.2 0 7.4C10.7 7.2 10.8 4.7 12 2Zm-5 3.8c2.8 1 4.4 2.7 4.7 5.3-2.5-.6-4.1-2.4-4.7-5.3Zm10 0c-.6 2.9-2.2 4.7-4.7 5.3.3-2.6 1.9-4.3 4.7-5.3ZM4 11c3.1-.2 5.3.8 6.6 3.1-2.7.5-4.9-.5-6.6-3.1Zm16 0c-1.7 2.6-3.9 3.6-6.6 3.1C14.7 11.8 16.9 10.8 20 11Zm-8 3.7c1.2 1.1 1.8 2.5 1.8 4.3h-3.6c0-1.8.6-3.2 1.8-4.3Z" />
              </svg>
            }
          />
          <SidebarItem
            active={view === 'brands'}
            label="Brands"
            onClick={() => onViewChange('brands')}
            icon={
              <svg viewBox="0 0 24 24" role="presentation" aria-hidden="true">
                <path d="M12 2 2 7l10 5 10-5-10-5Zm0 8L2 5v12l10 5 10-5V5l-10 5Z" />
              </svg>
            }
          />
          <div className="mt-3 px-3 pb-1 text-[0.68rem] font-bold uppercase tracking-[0.14em] text-slate-400 max-lg:col-span-2">
            Admin
          </div>
          <SidebarItem
            active={view === 'users'}
            label="Users"
            onClick={() => onViewChange('users')}
            icon={
              <svg viewBox="0 0 24 24" role="presentation" aria-hidden="true">
                <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-4.4 0-8 2-8 4.5V21h16v-2.5C20 16 16.4 14 12 14Z" />
              </svg>
            }
          />
        </nav>
      </div>

      <div className="mt-4 flex flex-col gap-2.5 border-t border-slate-200/80 pt-3">
        <div className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-xs font-extrabold text-emerald-700">
            {userEmail?.slice(0, 1).toUpperCase() ?? 'U'}
          </div>
          <div className="min-w-0">
            <div className="truncate text-xs font-bold text-slate-950">{profileName ?? 'Admin'}</div>
            <div className="truncate text-[0.72rem] font-medium text-slate-500">{userEmail ?? ''}</div>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-1.5">
          <Link
            className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-900 shadow-sm transition hover:bg-slate-50"
            to="/store"
          >
            Open store
          </Link>
          <button
            className="inline-flex h-9 items-center justify-center rounded-xl border border-red-200 bg-red-50/80 px-3 text-xs font-bold text-red-700 transition hover:bg-red-100"
            type="button"
            onClick={() => void onSignOut()}
          >
            Sign out
          </button>
        </div>
      </div>
    </aside>
  )
}


/**
 * AdminDashboardPage should become a thin route shell after the split:
 * - auth + navigation ownership stays here
 * - Supabase reads/writes move into admin hooks/services
 * - dashboard, stock, brands, users, and dialogs move into dedicated components
 */
export function AdminDashboardPage() {
  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [view, setView] = useState<View>('dashboard')

  const [productsLoading, setProductsLoading] = useState(true)
  const [productsError, setProductsError] = useState<string | null>(null)
  const [products, setProducts] = useState<Product[]>([])

  const [brandsLoading, setBrandsLoading] = useState(true)
  const [brandsError, setBrandsError] = useState<string | null>(null)
  const [brands, setBrands] = useState<Brand[]>([])

  const [profilesLoading, setProfilesLoading] = useState(true)
  const [profilesError, setProfilesError] = useState<string | null>(null)
  const [profiles, setProfiles] = useState<ProfileRow[]>([])
  const [selectedProfile, setSelectedProfile] = useState<ProfileRow | null>(null)

  // Stock item form state. Move into src/features/admin/stock/useStockForm.ts.
  const [addStockOpen, setAddStockOpen] = useState(false)
  const [stockMode, setStockMode] = useState<StockMode>('apparel')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [price, setPrice] = useState('')
  const [brandId, setBrandId] = useState('')
  const [category, setCategory] = useState<Product['category']>('shirts')
  const [strainType, setStrainType] = useState<Product['strain_type']>(null)
  const [consumptionMethod, setConsumptionMethod] = useState<Product['consumption_method']>(null)
  const [stockQty, setStockQty] = useState('0')
  const [featuredOnLanding, setFeaturedOnLanding] = useState(false)
  const [creatingStock, setCreatingStock] = useState(false)
  const [stockFormHint, setStockFormHint] = useState<string | null>(null)
  const [stockAdjusting, setStockAdjusting] = useState<Product | null>(null)
  const [stockAdjustQty, setStockAdjustQty] = useState('')
  const [savingStockAdjust, setSavingStockAdjust] = useState(false)

  // Brand form state. Move into src/features/admin/brands/useBrandForm.ts.
  const [newBrandName, setNewBrandName] = useState('')
  const [newBrandLogoUrl, setNewBrandLogoUrl] = useState('')
  const [newBrandLogoFile, setNewBrandLogoFile] = useState<File | null>(null)
  const [addBrandOpen, setAddBrandOpen] = useState(false)
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null)
  const [editBrandName, setEditBrandName] = useState('')
  const [editBrandLogoUrl, setEditBrandLogoUrl] = useState('')
  const [editBrandLogoFile, setEditBrandLogoFile] = useState<File | null>(null)
  const [creatingBrand, setCreatingBrand] = useState(false)
  const [savingBrand, setSavingBrand] = useState(false)

  // User form state. Move into src/features/admin/users/useUserForm.ts.
  const [newUserFirstName, setNewUserFirstName] = useState('')
  const [newUserLastName, setNewUserLastName] = useState('')
  const [newUserEmail, setNewUserEmail] = useState('')
  const [newUserIdNumber, setNewUserIdNumber] = useState('')
  const [newUserPassword, setNewUserPassword] = useState('')
  const [newUserRole, setNewUserRole] = useState<NewUserRole>('user')
  const [creatingUser, setCreatingUser] = useState(false)
  const [addUserOpen, setAddUserOpen] = useState(false)
  const [createdUserCredentials, setCreatedUserCredentials] =
    useState<CreatedUserCredentials | null>(null)

  // Cross-admin filters. Move into src/features/admin/hooks/useAdminFilters.ts.
  const [query, setQuery] = useState('')
  const [tab, setTab] = useState<'all' | 'apparel' | 'cannabis' | 'featured'>('all')
  const [filterOpen, setFilterOpen] = useState(false)
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'hidden'>('all')
  const [brandFilter, setBrandFilter] = useState<'all' | string>('all')
  const [categoryFilter, setCategoryFilter] = useState<'all' | Product['category']>('all')
  const [analyticsNow] = useState(() => Date.now())
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialog | null>(null)
  const [confirmingDialog, setConfirmingDialog] = useState(false)

  const loadProfiles = useCallback(async () => {
    setProfilesLoading(true)
    setProfilesError(null)
    try {
      const primary = (await supabase
        .from('profiles')
        .select(
          'id, email, full_name, first_name, last_name, id_number, address, accepted_regulations, accepted_regulations_at, is_admin, created_at',
        )
        .order('created_at', { ascending: false })) as unknown as {
        data: ProfileRow[] | null
        error: { message: string } | null
      }

      const result =
        primary.error && primary.error.message.includes('column')
          ? ((await supabase
              .from('profiles')
              .select(
                'id, full_name, first_name, last_name, id_number, address, accepted_regulations, accepted_regulations_at, is_admin, created_at',
              )
              .order('created_at', { ascending: false })) as unknown as {
              data: Omit<ProfileRow, 'email'>[] | null
              error: { message: string } | null
            })
          : primary

      if (result.error) throw result.error
      setProfiles((result.data ?? []) as unknown as ProfileRow[])
    } catch (err) {
      const appErr = toAppError(err)
      setProfilesError(appErr.message)
      setProfiles([])
    } finally {
      setProfilesLoading(false)
    }
  }, [])

  const loadBrands = useCallback(async () => {
    setBrandsLoading(true)
    setBrandsError(null)
    try {
      const { data, error } = await supabase
        .from('brands')
        .select('id, name, logo_url, active, created_at')
        .order('created_at', { ascending: false })
      if (error) throw error
      setBrands((data ?? []) as Brand[])
    } catch (err) {
      const appErr = toAppError(err)
      setBrandsError(appErr.message)
      setBrands([])
    } finally {
      setBrandsLoading(false)
    }
  }, [])

  const loadProducts = useCallback(async () => {
    setProductsLoading(true)
    setProductsError(null)
    try {
      const { data, error } = await supabase
        .from('products')
        .select(
          'id, name, description, price_cents, image_url, active, created_at, brand_id, strain_type, consumption_method, stock_qty, category, featured_on_landing, brand:brands(id, name, logo_url)',
        )
        .order('created_at', { ascending: false })
      if (error) throw error
      setProducts((data ?? []) as unknown as Product[])
    } catch (err) {
      const appErr = toAppError(err)
      setProductsError(appErr.message)
      setProducts([])
    } finally {
      setProductsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!isSupabaseConfigured()) return
    void (async () => {
      await loadBrands()
      await loadProducts()
      await loadProfiles()
    })()
  }, [loadBrands, loadProducts, loadProfiles])

  const imagePreviewUrl = useMemo(
    () => (imageFile ? URL.createObjectURL(imageFile) : null),
    [imageFile],
  )

  useEffect(() => {
    return () => {
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl)
    }
  }, [imagePreviewUrl])

  const newBrandLogoPreviewUrl = useMemo(
    () => (newBrandLogoFile ? URL.createObjectURL(newBrandLogoFile) : null),
    [newBrandLogoFile],
  )

  useEffect(() => {
    return () => {
      if (newBrandLogoPreviewUrl) URL.revokeObjectURL(newBrandLogoPreviewUrl)
    }
  }, [newBrandLogoPreviewUrl])

  const editBrandLogoPreviewUrl = useMemo(
    () => (editBrandLogoFile ? URL.createObjectURL(editBrandLogoFile) : null),
    [editBrandLogoFile],
  )

  useEffect(() => {
    return () => {
      if (editBrandLogoPreviewUrl) URL.revokeObjectURL(editBrandLogoPreviewUrl)
    }
  }, [editBrandLogoPreviewUrl])

  const effectiveNewBrandLogoPreview = newBrandLogoPreviewUrl || newBrandLogoUrl.trim() || null
  const effectiveEditBrandLogoPreview = editBrandLogoPreviewUrl || editBrandLogoUrl.trim() || null

  const selectedBrand = useMemo(
    () => brands.find((brand) => brand.id === brandId) ?? null,
    [brands, brandId],
  )

  const effectiveProductPreview = useMemo(
    () =>
      resolveProductMedia({
        imageUrl: imagePreviewUrl || imageUrl.trim() || null,
        category,
        brandLogoUrl: selectedBrand?.logo_url ?? null,
      }),
    [imagePreviewUrl, imageUrl, category, selectedBrand],
  )

  const latestProductByBrand = useMemo(() => {
    const map = new Map<string, Product>()
    for (const product of products) {
      if (product.brand_id && !map.has(product.brand_id)) {
        map.set(product.brand_id, product)
      }
    }
    return map
  }, [products])

  const metrics = useMemo(() => {
    const summary = {
      total: products.length,
      active: 0,
      featured: 0,
      outOfStock: 0,
      apparel: 0,
      cannabis: 0,
      activeBrands: 0,
      totalUsers: profiles.length,
      admins: 0,
    }

    for (const product of products) {
      if (product.active) summary.active += 1
      if (product.featured_on_landing && product.active) summary.featured += 1
      if ((product.stock_qty ?? 0) <= 0 && product.active) summary.outOfStock += 1
      if (isApparelCategory(product.category)) summary.apparel += 1
      if (isCannabisCategory(product.category)) summary.cannabis += 1
    }

    for (const brand of brands) {
      if (brand.active) summary.activeBrands += 1
    }

    for (const profileRow of profiles) {
      if (profileRow.is_admin) summary.admins += 1
    }

    return summary
  }, [products, brands, profiles])

  const stockScope = view === 'apparel' || view === 'cannabis' ? view : tab

  const categoryCounts = useMemo(() => {
    const counts = new Map<Product['category'], number>()
    for (const product of products) {
      counts.set(product.category, (counts.get(product.category) ?? 0) + 1)
    }
    return counts
  }, [products])

  const dashboardAnalytics = useMemo(() => {
    const now = analyticsNow
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

    const categoryRows = [...APPAREL_CATEGORIES, ...CANNABIS_CATEGORIES].map((stockCategory) => {
      const items = products.filter((product) => product.category === stockCategory)
      return {
        category: stockCategory,
        count: items.length,
        active: items.filter((product) => product.active).length,
        units: stockUnits(items),
        out: items.filter((product) => product.active && (product.stock_qty ?? 0) <= 0).length,
      }
    })

    const signupAge = (profileRow: ProfileRow, windowMs: number) => {
      const createdAt = new Date(profileRow.created_at).getTime()
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
      signups7: profiles.filter((profileRow) => signupAge(profileRow, sevenDaysMs)).length,
      signups30: profiles.filter((profileRow) => signupAge(profileRow, thirtyDaysMs)).length,
      incompleteProfiles: profiles.filter(
        (profileRow) =>
          !profileRow.accepted_regulations ||
          !profileRow.id_number ||
          !profileRow.address ||
          !(profileRow.full_name ?? `${profileRow.first_name ?? ''} ${profileRow.last_name ?? ''}`.trim()),
      ),
    }
  }, [products, profiles, analyticsNow])

  const filteredProducts = useMemo(() => {
    const q = query.trim().toLowerCase()
    return products.filter((p) => {
      if (stockScope === 'featured' && !p.featured_on_landing) return false
      if (stockScope === 'apparel' && !isApparelCategory(p.category)) return false
      if (stockScope === 'cannabis' && !isCannabisCategory(p.category)) return false
      if (statusFilter === 'active' && !p.active) return false
      if (statusFilter === 'hidden' && p.active) return false
      if (brandFilter !== 'all' && p.brand_id !== brandFilter) return false
      if (categoryFilter !== 'all' && p.category !== categoryFilter) return false
      if (!q) return true
      const b = brandName(p) ?? ''
      return (
        p.name.toLowerCase().includes(q) ||
        (p.description ?? '').toLowerCase().includes(q) ||
        b.toLowerCase().includes(q)
      )
    })
  }, [products, query, stockScope, statusFilter, brandFilter, categoryFilter])

  const stockFilterCategories = useMemo(() => {
    if (stockScope === 'apparel') return [...APPAREL_CATEGORIES]
    if (stockScope === 'cannabis') return [...CANNABIS_CATEGORIES]
    return [...APPAREL_CATEGORIES, ...CANNABIS_CATEGORIES, 'other']
  }, [stockScope])

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
    return profiles.filter((p) => {
      const name =
        (p.full_name ?? `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim()).toLowerCase()
      const email = (p.email ?? '').toLowerCase()
      return name.includes(q) || email.includes(q)
    })
  }, [profiles, query])


  function resetStockForm(nextMode: StockMode = stockMode) {
    setStockMode(nextMode)
    setName('')
    setDescription('')
    setImageUrl('')
    setImageFile(null)
    setPrice('')
    setBrandId('')
    setCategory(defaultCategoryForMode(nextMode))
    setStrainType(null)
    setConsumptionMethod(null)
    setStockQty('0')
    setFeaturedOnLanding(false)
    setStockFormHint(stockFallbackHint(defaultCategoryForMode(nextMode), null))
  }

  function clearStockFilters() {
    setStatusFilter('all')
    setBrandFilter('all')
    setCategoryFilter('all')
    setQuery('')
    if (view === 'stock' || view === 'dashboard') setTab('all')
  }

  function setAdminView(nextView: View) {
    setView(nextView)
    if (nextView === 'stock') setTab('all')
    if (nextView === 'apparel') {
      setTab('apparel')
      if (categoryFilter !== 'all' && !isApparelCategory(categoryFilter)) {
        setCategoryFilter('all')
      }
    }
    if (nextView === 'cannabis') {
      setTab('cannabis')
      if (categoryFilter !== 'all' && !isCannabisCategory(categoryFilter)) {
        setCategoryFilter('all')
      }
    }
  }

  function openAddStock(nextMode: StockMode) {
    resetStockForm(nextMode)
    setAdminView(nextMode)
    setTab(nextMode)
    setAddStockOpen(true)
  }

  function openStockAdjust(product: Product) {
    setStockAdjusting(product)
    setStockAdjustQty(String(product.stock_qty ?? 0))
  }

  function openConfirmDialog(nextDialog: ConfirmDialog) {
    setConfirmDialog(nextDialog)
  }

  async function handleConfirmDialog() {
    if (!confirmDialog) return
    setConfirmingDialog(true)
    try {
      await confirmDialog.onConfirm()
      setConfirmDialog(null)
    } finally {
      setConfirmingDialog(false)
    }
  }

  async function handleSaveStockAdjust() {
    if (!stockAdjusting) return
    const nextQty = Math.trunc(Number(stockAdjustQty))
    if (!Number.isFinite(nextQty) || nextQty < 0) {
      toast({
        variant: 'destructive',
        title: 'Invalid stock quantity',
        description: 'Enter a whole number of 0 or higher.',
      })
      return
    }

    setSavingStockAdjust(true)
    try {
      const { error } = await supabase
        .from('products')
        .update({ stock_qty: nextQty })
        .eq('id', stockAdjusting.id)
      if (error) throw error
      await loadProducts()
      toast({
        title: 'Stock updated',
        description: `${stockAdjusting.name} now has ${nextQty} units in stock.`,
      })
      setStockAdjusting(null)
    } catch (err) {
      const appErr = toAppError(err)
      toast({
        variant: 'destructive',
        title: appErr.title,
        description: appErr.message,
      })
    } finally {
      setSavingStockAdjust(false)
    }
  }

  function handleCategoryChange(nextCategory: Product['category']) {
    setCategory(nextCategory)
    setStockMode(stockModeForCategory(nextCategory))
    if (isApparelCategory(nextCategory)) {
      setStrainType(null)
      setConsumptionMethod(null)
    }
    setStockFormHint(stockFallbackHint(nextCategory, selectedBrand))
  }

  function handleBrandSelect(nextBrandId: string) {
    setBrandId(nextBrandId)
    const nextBrand = brands.find((brand) => brand.id === nextBrandId) ?? null
    const latestForBrand = latestProductByBrand.get(nextBrandId)

    if (!latestForBrand || stockModeForCategory(latestForBrand.category) !== stockMode) {
      setStockFormHint(stockFallbackHint(category, nextBrand))
      return
    }

    const applied: string[] = []

    if (latestForBrand.category && stockModeForCategory(latestForBrand.category) === stockMode) {
      setCategory(latestForBrand.category)
      applied.push(`${stockMode} category`)
    }
    if (stockMode === 'cannabis' && !strainType && latestForBrand.strain_type) {
      setStrainType(latestForBrand.strain_type)
      applied.push('strain')
    }
    if (stockMode === 'cannabis' && !consumptionMethod && latestForBrand.consumption_method) {
      setConsumptionMethod(latestForBrand.consumption_method)
      applied.push('consumption')
    }
    if (!description.trim() && latestForBrand.description) {
      setDescription(latestForBrand.description)
      applied.push('description')
    }

    if (applied.length > 0) {
      setStockFormHint(`Loaded ${applied.join(', ')} from the latest ${nextBrand?.name ?? 'brand'} item.`)
      return
    }

    setStockFormHint(stockFallbackHint(category, nextBrand))
  }

  async function uploadCatalogImage(file: File, folder: string) {
    const extension = file.name.includes('.') ? file.name.split('.').pop()?.toLowerCase() : null
    const safeExtension = extension && /^[a-z0-9]+$/.test(extension) ? extension : 'jpg'
    const safeFolder = folder.replace(/[^a-z0-9-]/gi, '-').toLowerCase() || 'catalog'
    const objectPath = `${safeFolder}/${Date.now()}-${crypto.randomUUID()}.${safeExtension}`

    const { error } = await supabase.storage.from(PRODUCT_IMAGES_BUCKET).upload(objectPath, file, {
      cacheControl: '3600',
      contentType: file.type || undefined,
      upsert: false,
    })
    if (error) throw error

    const { data } = supabase.storage.from(PRODUCT_IMAGES_BUCKET).getPublicUrl(objectPath)
    return data.publicUrl
  }

  async function uploadProductImage(file: File, currentBrandId: string) {
    return uploadCatalogImage(file, currentBrandId || 'unbranded')
  }

  async function createStockRecord({
    nextCategory,
    nextConsumptionMethod,
    nextStrainType,
  }: {
    nextCategory: Product['category']
    nextConsumptionMethod: Product['consumption_method']
    nextStrainType: Product['strain_type']
  }) {
    setCreatingStock(true)
    try {
      if (!name.trim()) throw new Error('Enter a product name')
      if (!price.trim()) throw new Error('Enter a price')
      const priceCents = Math.round(Number(price) * 100)
      if (!Number.isFinite(priceCents) || priceCents < 0) throw new Error('Enter a valid price')
      const nextStockQty = Math.trunc(Number(stockQty))
      if (!Number.isFinite(nextStockQty) || nextStockQty < 0) {
        throw new Error('Enter a valid stock quantity')
      }
      if (!brandId.trim()) throw new Error('Select a brand')

      let uploadedImageUrl: string | null = null
      if (imageFile) {
        uploadedImageUrl = await uploadProductImage(imageFile, brandId.trim())
      }

      const { error } = await supabase.from('products').insert({
        name: name.trim(),
        description: description.trim() || null,
        image_url: uploadedImageUrl ?? (imageUrl.trim() || null),
        price_cents: priceCents,
        active: true,
        brand_id: brandId.trim(),
        category: nextCategory,
        strain_type: nextStrainType,
        consumption_method: nextConsumptionMethod,
        stock_qty: nextStockQty,
        featured_on_landing: featuredOnLanding,
      })
      if (error) throw error

      const completedMode = stockMode
      resetStockForm(completedMode)
      await loadProducts()
      setAddStockOpen(false)
      toast({ title: 'Stock item created', description: 'It is now visible in your list.' })
    } catch (err) {
      const appErr = toAppError(err)
      toast({
        variant: 'destructive',
        title: appErr.title,
        description: appErr.fix ? `${appErr.message} Fix: ${appErr.fix}` : appErr.message,
      })
    } finally {
      setCreatingStock(false)
    }
  }

  async function handleCreateApparelStock() {
    if (!isApparelCategory(category)) {
      toast({
        variant: 'destructive',
        title: 'Apparel category required',
        description: 'Choose caps, shirts, apparel, or accessory for the apparel stock handler.',
      })
      return
    }

    await createStockRecord({
      nextCategory: category,
      nextConsumptionMethod: null,
      nextStrainType: null,
    })
  }

  async function handleCreateCannabisStock() {
    if (!isCannabisCategory(category)) {
      toast({
        variant: 'destructive',
        title: 'Cannabis category required',
        description:
          'Choose flower, edible, edibles, beverages, smokables, vape, or concentrate for the cannabis stock handler.',
      })
      return
    }

    const nextConsumptionMethod =
      (category === 'edible' || category === 'edibles') && consumptionMethod === 'edible'
        ? null
        : category === 'smokables' && consumptionMethod === 'smokable'
          ? null
          : consumptionMethod

    await createStockRecord({
      nextCategory: category,
      nextConsumptionMethod,
      nextStrainType: strainType,
    })
  }

  async function handleCreateUser() {
    setCreatingUser(true)
    try {
      if (!newUserEmail.trim()) throw new Error('Enter an email address')
      if (newUserPassword.trim().length < 8) throw new Error('Password must be at least 8 characters')

      const { data, error } = await supabase.functions.invoke('create-user', {
        body: {
          email: newUserEmail.trim(),
          password: newUserPassword,
          idNumber: newUserIdNumber.trim() || null,
          firstName: newUserFirstName.trim(),
          lastName: newUserLastName.trim(),
          role: newUserRole,
        },
      })

      if (error) {
        const response = (error as { context?: Response }).context
        if (response) {
          try {
            const parsed = (await response.json()) as { error?: string }
            throw new Error(parsed.error || error.message)
          } catch {
            throw new Error(error.message)
          }
        }
        throw error
      }

      const created = (data as { user?: CreatedUserCredentials }).user
      if (!created) throw new Error('User creation did not return credentials.')

      setCreatedUserCredentials(created)
      setNewUserFirstName('')
      setNewUserLastName('')
      setNewUserEmail('')
      setNewUserIdNumber('')
      setNewUserPassword('')
      setNewUserRole('user')
      setAddUserOpen(false)
      await loadProfiles()
      toast({
        title: 'User created',
        description:
          created.role === 'admin'
            ? 'The account is active and can sign in to /admin immediately.'
            : 'The account is active and can sign in immediately.',
      })
    } catch (err) {
      const appErr = toAppError(err)
      toast({
        variant: 'destructive',
        title: appErr.title,
        description: appErr.message,
      })
    } finally {
      setCreatingUser(false)
    }
  }

  async function handleCreateBrand() {
    setCreatingBrand(true)
    try {
      if (!newBrandName.trim()) throw new Error('Enter a brand name')
      let uploadedLogoUrl: string | null = null
      if (newBrandLogoFile) {
        uploadedLogoUrl = await uploadCatalogImage(newBrandLogoFile, 'brands')
      }

      const { error } = await supabase.from('brands').insert({
        name: newBrandName.trim(),
        logo_url: uploadedLogoUrl ?? (newBrandLogoUrl.trim() || null),
        active: true,
      })
      if (error) throw error
      setNewBrandName('')
      setNewBrandLogoUrl('')
      setNewBrandLogoFile(null)
      setAddBrandOpen(false)
      await loadBrands()
      toast({ title: 'Brand created', description: 'It is now selectable for stock items.' })
    } catch (err) {
      const appErr = toAppError(err)
      toast({
        variant: 'destructive',
        title: appErr.title,
        description: appErr.fix ? `${appErr.message} Fix: ${appErr.fix}` : appErr.message,
      })
    } finally {
      setCreatingBrand(false)
    }
  }

  function openEditBrand(brand: Brand) {
    setEditingBrand(brand)
    setEditBrandName(brand.name)
    setEditBrandLogoUrl(brand.logo_url ?? '')
    setEditBrandLogoFile(null)
  }

  function closeEditBrand() {
    setEditingBrand(null)
    setEditBrandName('')
    setEditBrandLogoUrl('')
    setEditBrandLogoFile(null)
  }

  async function handleUpdateBrand() {
    if (!editingBrand) return
    setSavingBrand(true)
    try {
      if (!editBrandName.trim()) throw new Error('Enter a brand name')
      let uploadedLogoUrl: string | null = null
      if (editBrandLogoFile) {
        uploadedLogoUrl = await uploadCatalogImage(editBrandLogoFile, 'brands')
      }

      const { error } = await supabase
        .from('brands')
        .update({
          name: editBrandName.trim(),
          logo_url: uploadedLogoUrl ?? (editBrandLogoUrl.trim() || null),
        })
        .eq('id', editingBrand.id)
      if (error) throw error

      closeEditBrand()
      await loadBrands()
      await loadProducts()
      toast({ title: 'Brand updated', description: 'The storefront fallback images are up to date.' })
    } catch (err) {
      const appErr = toAppError(err)
      toast({
        variant: 'destructive',
        title: appErr.title,
        description: appErr.fix ? `${appErr.message} Fix: ${appErr.fix}` : appErr.message,
      })
    } finally {
      setSavingBrand(false)
    }
  }

  const exportRows = useMemo(
    () =>
      filteredProducts.map((p) => ({
        name: p.name,
        brand: brandName(p) ?? '',
        category: p.category,
        price_zar: (p.price_cents / 100).toFixed(2),
        stock_qty: p.stock_qty,
        active: p.active ? 'true' : 'false',
        featured_on_landing: p.featured_on_landing ? 'true' : 'false',
      })),
    [filteredProducts],
  )

  const canShowAdminUi = Boolean(user && profile?.is_admin)

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950 lg:flex">
      <AdminSidebar
        view={view}
        query={query}
        userEmail={user?.email ?? null}
        profileName={profile?.full_name ?? 'Admin'}
        onQueryChange={setQuery}
        onViewChange={setAdminView}
        onSignOut={async () => {
          await signOut()
          navigate('/', { replace: true })
        }}
      />

      <main className="min-w-0 flex-1 space-y-4 px-3 py-4 sm:px-5 lg:px-6">
        <header className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-lg font-bold tracking-tight text-slate-950">{viewTitle(view)}</h1>
            <p className="mt-1 text-xs font-medium text-slate-500">Admin-only controls for your catalog.</p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              className="inline-flex min-h-9 items-center justify-center rounded-xl border border-slate-950 bg-slate-950 px-3 text-xs font-bold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              type="button"
              onClick={() => {
                downloadCsv(`take-a-bud-export-${new Date().toISOString().slice(0, 10)}.csv`, exportRows)
              }}
              disabled={!filteredProducts.length}
            >
              Export report
            </button>
          </div>
        </header>

        {!isSupabaseConfigured() ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900 shadow-sm">
            <p className="font-bold text-amber-950">Supabase is not configured</p>
            <p className="mt-1 text-xs font-medium leading-5 text-amber-900">
              Add <code>VITE_SUPABASE_URL</code> and either <code>VITE_SUPABASE_ANON_KEY</code> or{' '}
              <code>VITE_SUPABASE_PUBLISHABLE_KEY</code> to <code>.env.local</code>, then restart{' '}
              <code>npm run dev</code>.
            </p>
          </div>
        ) : null}

        {!canShowAdminUi ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900 shadow-sm">
            <p className="font-bold text-amber-950">Admin access required</p>
            <p className="mt-1 text-xs font-medium leading-5 text-amber-900">
              Your account is signed in, but it does not have admin permissions.
            </p>
          </div>
        ) : null}

        {view === 'dashboard' ? (
          <>
            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-label="Metrics">
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-2 flex items-center justify-between">
                  <div className="text-[0.72rem] font-bold uppercase tracking-[0.16em] text-slate-400">Total items</div>
                </div>
                <div className="text-2xl font-bold tracking-tight text-slate-950">{metrics.total}</div>
                <div className="mt-1 text-xs font-medium text-slate-500">Across all categories</div>
                <Sparkline points={Array.from({ length: 12 }, () => metrics.total)} />
              </div>
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-2 flex items-center justify-between">
                  <div className="text-[0.72rem] font-bold uppercase tracking-[0.16em] text-slate-400">Active items</div>
                </div>
                <div className="text-2xl font-bold tracking-tight text-slate-950">{metrics.active}</div>
                <div className="mt-1 text-xs font-medium text-slate-500">Visible to customers</div>
                <Sparkline points={Array.from({ length: 12 }, () => metrics.active)} />
              </div>
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-2 flex items-center justify-between">
                  <div className="text-[0.72rem] font-bold uppercase tracking-[0.16em] text-slate-400">Apparel</div>
                </div>
                <div className="text-2xl font-bold tracking-tight text-slate-950">{metrics.apparel}</div>
                <div className="mt-1 text-xs font-medium text-slate-500">Caps, shirts, and merch</div>
                <Sparkline points={Array.from({ length: 12 }, () => metrics.apparel)} />
              </div>
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-2 flex items-center justify-between">
                  <div className="text-[0.72rem] font-bold uppercase tracking-[0.16em] text-slate-400">Cannabis</div>
                </div>
                <div className="text-2xl font-bold tracking-tight text-slate-950">{metrics.cannabis}</div>
                <div className="mt-1 text-xs font-medium text-slate-500">Flower, edibles, beverages, smokables</div>
                <Sparkline points={Array.from({ length: 12 }, () => metrics.cannabis)} />
              </div>
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-2 flex items-center justify-between">
                  <div className="text-[0.72rem] font-bold uppercase tracking-[0.16em] text-slate-400">Featured items</div>
                </div>
                <div className="text-2xl font-bold tracking-tight text-slate-950">{metrics.featured}</div>
                <div className="mt-1 text-xs font-medium text-slate-500">Shown on public landing</div>
                <Sparkline points={Array.from({ length: 12 }, () => metrics.featured)} />
              </div>
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-2 flex items-center justify-between">
                  <div className="text-[0.72rem] font-bold uppercase tracking-[0.16em] text-slate-400">Out of stock</div>
                </div>
                <div className="text-2xl font-bold tracking-tight text-slate-950">{metrics.outOfStock}</div>
                <div className="mt-1 text-xs font-medium text-slate-500">Active items with 0 qty</div>
                <Sparkline points={Array.from({ length: 12 }, () => metrics.outOfStock)} />
              </div>
            </section>

            <section className="grid gap-3 xl:grid-cols-2" aria-label="Dashboard insights">
              <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm" aria-label="Catalog split">
                <div className="mb-3 flex flex-col gap-2.5 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="text-base font-bold tracking-tight text-slate-950">Catalog split</h2>
                    <p className="mt-1 max-w-2xl text-xs font-medium leading-5 text-slate-500">Apparel and cannabis stay separated in management.</p>
                  </div>
                </div>
                <div className="grid gap-2.5 sm:grid-cols-3">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <div className="text-[0.72rem] font-bold uppercase tracking-[0.14em] text-slate-400">Active catalog</div>
                    <div className="mt-2 text-2xl font-bold tracking-tight text-slate-950">{dashboardAnalytics.activeProducts.length}</div>
                    <button className="inline-flex min-h-8 items-center justify-center rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50" type="button" onClick={() => setAdminView('stock')}>
                      Review all stock
                    </button>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <div className="text-[0.72rem] font-bold uppercase tracking-[0.14em] text-slate-400">Apparel units</div>
                    <div className="mt-2 text-2xl font-bold tracking-tight text-slate-950">{dashboardAnalytics.apparelStockUnits}</div>
                    <button className="inline-flex min-h-8 items-center justify-center rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50" type="button" onClick={() => setAdminView('apparel')}>
                      Manage apparel
                    </button>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <div className="text-[0.72rem] font-bold uppercase tracking-[0.14em] text-slate-400">Cannabis units</div>
                    <div className="mt-2 text-2xl font-bold tracking-tight text-slate-950">{dashboardAnalytics.cannabisStockUnits}</div>
                    <button className="inline-flex min-h-8 items-center justify-center rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50" type="button" onClick={() => setAdminView('cannabis')}>
                      Manage cannabis
                    </button>
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm" aria-label="Customer signups">
                <div className="mb-3 flex flex-col gap-2.5 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="text-base font-bold tracking-tight text-slate-950">Signups and profiles</h2>
                    <p className="mt-1 max-w-2xl text-xs font-medium leading-5 text-slate-500">
                      {dashboardAnalytics.signups7} new in 7 days • {dashboardAnalytics.signups30} new in 30 days
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button className="inline-flex min-h-9 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-900 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50" type="button" onClick={() => setAdminView('users')}>
                      Manage users
                    </button>
                  </div>
                </div>
                <div className="grid gap-2.5 sm:grid-cols-3">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <div className="text-[0.72rem] font-bold uppercase tracking-[0.14em] text-slate-400">Total users</div>
                    <div className="mt-2 text-2xl font-bold tracking-tight text-slate-950">{metrics.totalUsers}</div>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <div className="text-[0.72rem] font-bold uppercase tracking-[0.14em] text-slate-400">Profiles needing attention</div>
                    <div className="mt-2 text-2xl font-bold tracking-tight text-slate-950">{dashboardAnalytics.incompleteProfiles.length}</div>
                  </div>
                </div>
              </section>
            </section>

            <section className="grid gap-3 xl:grid-cols-2" aria-label="Stock levels">
              <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm" aria-label="Apparel stock levels">
                <div className="mb-3 flex flex-col gap-2.5 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="text-base font-bold tracking-tight text-slate-950">Apparel stock levels</h2>
                    <p className="mt-1 max-w-2xl text-xs font-medium leading-5 text-slate-500">Caps, shirts, apparel, and accessories only.</p>
                  </div>
                </div>
                <div className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
                  {dashboardAnalytics.categoryRows
                    .filter((row) => isApparelCategory(row.category))
                    .map((row) => (
                      <div key={row.category} className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-2.5 px-3 py-2.5 text-xs [&_span]:font-bold [&_strong]:font-bold [&_small]:text-slate-500 [&_em]:not-italic [&_em]:text-red-600">
                        <span>{titleCase(row.category)}</span>
                        <strong>{row.units} units</strong>
                        <small>{row.active}/{row.count} active</small>
                        <em>{row.out} out</em>
                      </div>
                    ))}
                </div>
                <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="mb-2 text-[0.72rem] font-bold uppercase tracking-[0.14em] text-slate-400">Low stock</div>
                  {dashboardAnalytics.apparelLowStock.length > 0 ? (
                    dashboardAnalytics.apparelLowStock.map((product) => (
                      <div key={product.id} className="flex items-center justify-between gap-2.5 rounded-lg bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 [&_strong]:text-slate-950">
                        <span>{product.name}</span>
                        <strong>{product.stock_qty ?? 0}</strong>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs font-medium text-slate-500">No apparel items are low.</p>
                  )}
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm" aria-label="Cannabis stock levels">
                <div className="mb-3 flex flex-col gap-2.5 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="text-base font-bold tracking-tight text-slate-950">Cannabis stock levels</h2>
                    <p className="mt-1 max-w-2xl text-xs font-medium leading-5 text-slate-500">Flower, edibles, beverages, smokables, vapes, concentrates.</p>
                  </div>
                </div>
                <div className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
                  {dashboardAnalytics.categoryRows
                    .filter((row) => isCannabisCategory(row.category))
                    .map((row) => (
                      <div key={row.category} className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-2.5 px-3 py-2.5 text-xs [&_span]:font-bold [&_strong]:font-bold [&_small]:text-slate-500 [&_em]:not-italic [&_em]:text-red-600">
                        <span>{titleCase(row.category)}</span>
                        <strong>{row.units} units</strong>
                        <small>{row.active}/{row.count} active</small>
                        <em>{row.out} out</em>
                      </div>
                    ))}
                </div>
                <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="mb-2 text-[0.72rem] font-bold uppercase tracking-[0.14em] text-slate-400">Low stock</div>
                  {dashboardAnalytics.cannabisLowStock.length > 0 ? (
                    dashboardAnalytics.cannabisLowStock.map((product) => (
                      <div key={product.id} className="flex items-center justify-between gap-2.5 rounded-lg bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 [&_strong]:text-slate-950">
                        <span>{product.name}</span>
                        <strong>{product.stock_qty ?? 0}</strong>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs font-medium text-slate-500">No cannabis items are low.</p>
                  )}
                </div>
              </section>
            </section>

            <section className="grid gap-3 xl:grid-cols-2" aria-label="Customers and sales">
              <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm" aria-label="Recent signups">
                <div className="mb-3 flex flex-col gap-2.5 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="text-base font-bold tracking-tight text-slate-950">Recent signups</h2>
                    <p className="mt-1 max-w-2xl text-xs font-medium leading-5 text-slate-500">Latest account activity from profiles.</p>
                  </div>
                </div>
                <div className="space-y-1.5">
                  {dashboardAnalytics.recentProfiles.length > 0 ? (
                    dashboardAnalytics.recentProfiles.map((profileRow) => (
                      <button
                        key={profileRow.id}
                        className="flex w-full items-center justify-between gap-2.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-left text-xs font-bold text-slate-700 transition hover:bg-slate-50 [&_em]:not-italic [&_em]:text-slate-400"
                        type="button"
                        onClick={() => setSelectedProfile(profileRow)}
                      >
                        <span>
                          {(profileRow.full_name ??
                            `${profileRow.first_name ?? ''} ${profileRow.last_name ?? ''}`.trim()) ||
                            profileRow.email ||
                            'User'}
                        </span>
                        <em>{profileRow.created_at ? new Date(profileRow.created_at).toLocaleDateString() : '—'}</em>
                      </button>
                    ))
                  ) : (
                    <p className="text-xs font-medium text-slate-500">No signups yet.</p>
                  )}
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm" aria-label="Sales analytics">
                <div className="mb-3 flex flex-col gap-2.5 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="text-base font-bold tracking-tight text-slate-950">Sales analytics</h2>
                    <p className="mt-1 max-w-2xl text-xs font-medium leading-5 text-slate-500">Buyer spend and product purchase mix need order data.</p>
                  </div>
                </div>
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                  <p className="font-bold text-amber-950">Orders are not connected yet</p>
                  <p className="mt-1 text-xs font-medium leading-5 text-amber-900">
                    The current database has products, brands, and profiles, but no orders or order_items table.
                    Once checkout/order capture exists, this panel can show who buys, how much they spend,
                    purchase timing, and product-type demand.
                  </p>
                </div>
              </section>
            </section>
          </>
        ) : null}

        {view === 'stock' || view === 'apparel' || view === 'cannabis' ? (
          <section className="adminPanel" aria-label="Stock items">
            <div className="adminPanel__head">
              <div>
                <h2 className="adminPanel__title">
                  {stockScope === 'apparel'
                    ? 'Apparel management'
                    : stockScope === 'cannabis'
                      ? 'Cannabis management'
                      : 'Stock management'}
                </h2>
                <p className="adminPanel__sub">
                  {stockScope === 'apparel'
                    ? 'Use apparel-specific placeholders and keep caps and shirts separate from cannabis products.'
                    : stockScope === 'cannabis'
                      ? 'Manage flower, edibles, beverages, smokables, vape items, and concentrates with cannabis-specific fields.'
                      : 'Search, filter, and manage apparel and cannabis stock with separate handlers.'}
                </p>
              </div>
              <div className="adminPanel__actions">
                <button
                  className="adminButton"
                  type="button"
                  onClick={() => setFilterOpen((v) => !v)}
                >
                  Filters
                </button>
                <button
                  className="adminButton"
                  type="button"
                  onClick={() => openAddStock('apparel')}
                >
                  Add apparel
                </button>
                <button
                  className="adminButton adminButton--primary"
                  type="button"
                  onClick={() => openAddStock('cannabis')}
                >
                  Add cannabis
                </button>
              </div>
            </div>

            {view === 'stock' ? (
            <div className="mb-5 flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-2" role="tablist" aria-label="Stock tabs">
                <button
                  className={tab === 'all' ? 'rounded-xl bg-slate-950 px-4 py-2 text-sm font-black text-white shadow-sm' : 'rounded-xl px-4 py-2 text-sm font-black text-slate-600 transition hover:bg-white hover:text-slate-950'}
                  type="button"
                  onClick={() => setTab('all')}
                >
                  All stock
                </button>
                <button
                  className={tab === 'apparel' ? 'rounded-xl bg-slate-950 px-4 py-2 text-sm font-black text-white shadow-sm' : 'rounded-xl px-4 py-2 text-sm font-black text-slate-600 transition hover:bg-white hover:text-slate-950'}
                  type="button"
                  onClick={() => setAdminView('apparel')}
                >
                  Apparel management
                </button>
                <button
                  className={tab === 'cannabis' ? 'rounded-xl bg-slate-950 px-4 py-2 text-sm font-black text-white shadow-sm' : 'rounded-xl px-4 py-2 text-sm font-black text-slate-600 transition hover:bg-white hover:text-slate-950'}
                  type="button"
                  onClick={() => setAdminView('cannabis')}
                >
                  Cannabis management
                </button>
                <button
                  className={tab === 'featured' ? 'rounded-xl bg-slate-950 px-4 py-2 text-sm font-black text-white shadow-sm' : 'rounded-xl px-4 py-2 text-sm font-black text-slate-600 transition hover:bg-white hover:text-slate-950'}
                  type="button"
                  onClick={() => setTab('featured')}
                >
                  Featured
                </button>
              </div>
            ) : null}

            {view === 'apparel' || view === 'cannabis' ? (
              <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label={`${viewTitle(view)} categories`}>
                {(view === 'apparel' ? APPAREL_CATEGORIES : CANNABIS_CATEGORIES).map((stockCategory) => (
                  <button
                    key={stockCategory}
                    className={
                      categoryFilter === stockCategory
                        ? 'rounded-2xl border border-slate-950 bg-slate-950 p-4 text-left text-white shadow-sm'
                        : 'rounded-2xl border border-slate-200 bg-white p-4 text-left text-slate-700 shadow-sm transition hover:bg-slate-50'
                    }
                    type="button"
                    onClick={() =>
                      setCategoryFilter(categoryFilter === stockCategory ? 'all' : stockCategory)
                    }
                  >
                    <span className="block text-sm font-black">{titleCase(stockCategory)}</span>
                    <span className="mt-2 block text-2xl font-black">
                      {categoryCounts.get(stockCategory) ?? 0}
                    </span>
                  </button>
                ))}
              </div>
            ) : null}

            {filterOpen ? (
              <div className="mb-5 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-[1fr_1fr_1fr_auto] md:items-end">
                <label className="block">
                  <span className="mb-1 block text-xs font-black uppercase tracking-[0.14em] text-slate-400">Status</span>
                  <select
                    className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/10"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                  >
                    <option value="all">All</option>
                    <option value="active">Active</option>
                    <option value="hidden">Hidden</option>
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-black uppercase tracking-[0.14em] text-slate-400">Brand</span>
                  <select
                    className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/10"
                    value={brandFilter}
                    onChange={(e) => setBrandFilter(e.target.value)}
                  >
                    <option value="all">All</option>
                    {brands.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-black uppercase tracking-[0.14em] text-slate-400">Category</span>
                  <select
                    className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/10"
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value as typeof categoryFilter)}
                  >
                    <option value="all">All</option>
                    {stockFilterCategories.map((stockCategory) => (
                      <option key={stockCategory} value={stockCategory}>
                        {titleCase(stockCategory)}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-extrabold text-slate-900 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  type="button"
                  onClick={clearStockFilters}
                >
                  Clear
                </button>
              </div>
            ) : null}

            {productsLoading ? <p className="text-sm font-semibold text-slate-500">Loading…</p> : null}
            {!productsLoading && productsError ? (
              <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-amber-900 shadow-sm">
                <p className="font-black text-amber-950">Stock isn’t ready yet</p>
                <p className="mt-1 text-sm font-medium leading-6 text-amber-900">{productsError}</p>
              </div>
            ) : null}

            {!productsLoading && !productsError ? (
              <div className="adminTable2" role="table" aria-label="Stock table">
                <div className="adminTable2__head" role="row">
                  <div role="columnheader">Item</div>
                  <div role="columnheader">Brand</div>
                  <div role="columnheader">Price</div>
                  <div role="columnheader">Stock</div>
                  <div role="columnheader">Status</div>
                  <div role="columnheader" className="adminTable2__actionsHead">
                    Actions
                  </div>
                </div>
                {filteredProducts.map((p) => {
                  const media = productMedia(p)

                  return (
                    <div key={p.id} className="adminTable2__row" role="row">
                    <div role="cell" className="adminTable2__item adminTable2__item--withMedia">
                      <div className="adminTable2__thumb">
                        <AdminCatalogMedia src={media?.url} source={media?.source ?? null} alt={p.name} />
                      </div>
                      <div>
                        <div className="adminTable2__itemTitle">{p.name}</div>
                        <div className="adminTable2__itemSub">
                          <span className="tag">{p.category}</span>
                          {p.featured_on_landing ? <span className="tag">featured</span> : null}
                          {p.consumption_method ? (
                            <span className="tag">{p.consumption_method}</span>
                          ) : null}
                          {p.strain_type ? <span className="tag">{p.strain_type}</span> : null}
                        </div>
                      </div>
                    </div>
                    <div role="cell" className="adminTable2__brand">
                      <AdminLogoPreview src={brandLogo(p)} fallback={brandName(p) ?? '—'} />
                      <span>{brandName(p) ?? '—'}</span>
                    </div>
                    <div role="cell">{formatZar(p.price_cents)}</div>
                    <div role="cell">
                      <span className={(p.stock_qty ?? 0) <= 0 ? 'pill pill--off' : 'pill pill--on'}>
                        {p.stock_qty ?? 0}
                      </span>
                    </div>
                    <div role="cell">
                      <span className={p.active ? 'pill pill--on' : 'pill pill--off'}>
                        {p.active ? 'Active' : 'Hidden'}
                      </span>
                    </div>
                    <div role="cell" className="adminTable2__actions">
                      <button
                        className="chipButton"
                        type="button"
                        onClick={() => openStockAdjust(p)}
                      >
                        Stock
                      </button>
                      <button
                        className="chipButton"
                        type="button"
                        onClick={async () => {
                          try {
                            const { error } = await supabase
                              .from('products')
                              .update({ featured_on_landing: !p.featured_on_landing })
                              .eq('id', p.id)
                            if (error) throw error
                            await loadProducts()
                            toast({
                              title: p.featured_on_landing ? 'Item unfeatured' : 'Item featured',
                              description: `${p.name} was updated for the landing page.`,
                            })
                          } catch (err) {
                            const appErr = toAppError(err)
                            toast({
                              variant: 'destructive',
                              title: appErr.title,
                              description: appErr.message,
                            })
                          }
                        }}
                      >
                        {p.featured_on_landing ? 'Unfeature' : 'Feature'}
                      </button>
                      <button
                        className="chipButton"
                        type="button"
                        onClick={async () => {
                          try {
                            const { error } = await supabase
                              .from('products')
                              .update({ active: !p.active })
                              .eq('id', p.id)
                            if (error) throw error
                            await loadProducts()
                            toast({
                              title: p.active ? 'Item hidden' : 'Item activated',
                              description: `${p.name} is ${p.active ? 'hidden from' : 'visible in'} the store.`,
                            })
                          } catch (err) {
                            const appErr = toAppError(err)
                            toast({
                              variant: 'destructive',
                              title: appErr.title,
                              description: appErr.message,
                            })
                          }
                        }}
                      >
                        {p.active ? 'Hide' : 'Activate'}
                      </button>
                      <button
                        className="chipButton chipButton--danger"
                        type="button"
                        onClick={() =>
                          openConfirmDialog({
                            title: 'Delete stock item?',
                            description: `Delete "${p.name}"? This cannot be undone.`,
                            confirmLabel: 'Delete item',
                            destructive: true,
                            onConfirm: async () => {
                              try {
                                const { error } = await supabase
                                  .from('products')
                                  .delete()
                                  .eq('id', p.id)
                                if (error) throw error
                                await loadProducts()
                                toast({
                                  title: 'Item deleted',
                                  description: `${p.name} was removed from stock.`,
                                })
                              } catch (err) {
                                const appErr = toAppError(err)
                                toast({
                                  variant: 'destructive',
                                  title: appErr.title,
                                  description: appErr.message,
                                })
                              }
                            },
                          })
                        }
                      >
                        Delete
                      </button>
                    </div>
                    </div>
                  )
                })}
              </div>
            ) : null}

            {!productsLoading && !productsError && filteredProducts.length === 0 ? (
              <p className="text-sm font-semibold text-slate-500">No items yet. Add your first stock item.</p>
            ) : null}
          </section>
        ) : null}

        {view === 'brands' ? (
          <section className="adminPanel" aria-label="Brands management">
            <div className="adminPanel__head">
              <div>
                <h2 className="adminPanel__title">Brands</h2>
                <p className="adminPanel__sub">Manage brand names and logos.</p>
              </div>
              <div className="adminPanel__actions">
                <button className="adminButton adminButton--primary" type="button" onClick={() => setAddBrandOpen(true)}>
                  Add brand
                </button>
              </div>
            </div>

            {brandsLoading ? <p className="adminHint">Loading…</p> : null}
            {!brandsLoading && brandsError ? (
              <div className="notice notice--warn">
                <p className="notice__title">Brands aren’t ready yet</p>
                <p className="notice__body">{brandsError}</p>
              </div>
            ) : null}

            {!brandsLoading && !brandsError ? (
              <div className="adminTable2" role="table" aria-label="Brands table">
                <div className="adminTable2__head adminTable2__head--brands" role="row">
                  <div role="columnheader">Brand</div>
                  <div role="columnheader">Status</div>
                  <div role="columnheader" className="adminTable2__actionsHead">
                    Actions
                  </div>
                </div>
                {filteredBrands.map((b) => (
                  <div key={b.id} className="adminTable2__row adminTable2__row--brands" role="row">
                    <div role="cell" className="adminTable2__brand">
                      <AdminLogoPreview src={b.logo_url} fallback={b.name} />
                      <div className="adminTable2__brandMeta">
                        <div className="adminTable2__itemTitle">{b.name}</div>
                        {b.logo_url ? (
                          <div className="adminTable2__itemSub adminTable2__itemSub--url">
                            {b.logo_url}
                          </div>
                        ) : (
                          <div className="adminTable2__itemSub adminTable2__itemSub--muted">
                            No logo yet
                          </div>
                        )}
                      </div>
                    </div>
                    <div role="cell">
                      <span className={b.active ? 'pill pill--on' : 'pill pill--off'}>
                        {b.active ? 'Active' : 'Hidden'}
                      </span>
                    </div>
                    <div role="cell" className="adminTable2__actions">
                      <button className="chipButton" type="button" onClick={() => openEditBrand(b)}>
                        Edit
                      </button>
                      <button
                        className="chipButton"
                        type="button"
                        onClick={async () => {
                          try {
                            const { error } = await supabase
                              .from('brands')
                              .update({ active: !b.active })
                              .eq('id', b.id)
                            if (error) throw error
                            await loadBrands()
                            await loadProducts()
                            toast({
                              title: b.active ? 'Brand hidden' : 'Brand activated',
                              description: `${b.name} is ${b.active ? 'hidden from' : 'available for'} catalog use.`,
                            })
                          } catch (err) {
                            const appErr = toAppError(err)
                            toast({
                              variant: 'destructive',
                              title: appErr.title,
                              description: appErr.message,
                            })
                          }
                        }}
                      >
                        {b.active ? 'Hide' : 'Activate'}
                      </button>
                      <button
                        className="chipButton chipButton--danger"
                        type="button"
                        onClick={() =>
                          openConfirmDialog({
                            title: 'Delete brand?',
                            description: `Delete "${b.name}"? Products using this brand will keep working, but their brand will be cleared.`,
                            confirmLabel: 'Delete brand',
                            destructive: true,
                            onConfirm: async () => {
                              try {
                                const { error } = await supabase.from('brands').delete().eq('id', b.id)
                                if (error) throw error
                                await loadBrands()
                                await loadProducts()
                                toast({
                                  title: 'Brand deleted',
                                  description: `${b.name} was removed from the catalog.`,
                                })
                              } catch (err) {
                                const appErr = toAppError(err)
                                toast({
                                  variant: 'destructive',
                                  title: appErr.title,
                                  description: appErr.message,
                                })
                              }
                            },
                          })
                        }
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            {!brandsLoading && !brandsError && brands.length === 0 ? (
              <p className="adminHint">No brands yet. Add the first brand with a logo or fallback initials.</p>
            ) : null}
            {!brandsLoading && !brandsError && brands.length > 0 && filteredBrands.length === 0 ? (
              <p className="adminHint">No brands match your search.</p>
            ) : null}
          </section>
        ) : null}

        {view === 'users' ? (
          <section className="adminPanel" aria-label="Users management">
            <div className="adminPanel__head">
              <div>
                <h2 className="adminPanel__title">Users</h2>
                <p className="adminPanel__sub">
                  Create active accounts, choose whether they are admins, and manage existing users.
                </p>
              </div>
              <div className="adminPanel__actions">
                <button className="adminButton adminButton--primary" type="button" onClick={() => setAddUserOpen(true)}>
                  Add user
                </button>
                <button className="adminButton" type="button" onClick={() => void loadProfiles()}>
                  Refresh
                </button>
              </div>
            </div>

            {createdUserCredentials ? (
              <div className="adminShareCard">
                <div>
                  <div className="adminShareCard__title">Login details ready to share</div>
                  <div className="adminShareCard__sub">
                    Copy these details and send them to the user using your normal channel.
                  </div>
                </div>
                <pre className="adminShareCard__text">{createdUserCredentials.shareText}</pre>
                <div className="adminShareCard__actions">
                  <button
                    className="adminButton"
                    type="button"
                    onClick={async () => {
                      await navigator.clipboard.writeText(createdUserCredentials.shareText)
                      toast({ title: 'Copied', description: 'Login details copied to clipboard.' })
                    }}
                  >
                    Copy details
                  </button>
                </div>
              </div>
            ) : null}

            {profilesLoading ? <p className="adminHint">Loading…</p> : null}
            {!profilesLoading && profilesError ? (
              <div className="notice notice--warn">
                <p className="notice__title">User list unavailable</p>
                <p className="notice__body">
                  {profilesError.includes('policy') ||
                  profilesError.toLowerCase().includes('permission')
                    ? 'Apply the latest profiles migration (admin select/update policy) then refresh.'
                    : profilesError}
                </p>
              </div>
            ) : null}

            {!profilesLoading && !profilesError ? (
              <div className="adminTable2" role="table" aria-label="Users table">
                <div className="adminTable2__head adminTable2__head--usersWide" role="row">
                  <div role="columnheader">User</div>
                  <div role="columnheader">Created</div>
                  <div role="columnheader">Consent</div>
                  <div role="columnheader">Role</div>
                  <div role="columnheader" className="adminTable2__actionsHead">
                    Actions
                  </div>
                </div>
                {filteredProfiles.map((p) => (
                  <div key={p.id} className="adminTable2__row adminTable2__row--usersWide" role="row">
                    <div role="cell" className="adminTable2__user">
                      <div className="adminUserPill" aria-hidden="true">
                        {(p.email ?? p.full_name ?? 'U').slice(0, 1).toUpperCase()}
                      </div>
                      <div>
                        <div className="adminTable2__itemTitle">
                          {(p.full_name ??
                            `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim()) ||
                            '—'}
                        </div>
                        <div className="adminTable2__itemSub">{p.email ?? p.id}</div>
                      </div>
                    </div>
                    <div role="cell">
                      {p.created_at ? new Date(p.created_at).toLocaleDateString() : '—'}
                    </div>
                    <div role="cell">
                      <span className={p.accepted_regulations ? 'pill pill--on' : 'pill pill--off'}>
                        {p.accepted_regulations ? 'Accepted' : 'Missing'}
                      </span>
                    </div>
                    <div role="cell">
                      <span className={p.is_admin ? 'pill pill--on' : 'pill pill--off'}>
                        {p.is_admin ? 'Admin' : 'User'}
                      </span>
                    </div>
                    <div role="cell" className="adminTable2__actions">
                      <button className="chipButton" type="button" onClick={() => setSelectedProfile(p)}>
                        Details
                      </button>
                      <button
                        className="chipButton"
                        type="button"
                        disabled={p.id === user?.id}
                        onClick={() =>
                          openConfirmDialog({
                            title: p.is_admin ? 'Remove admin access?' : 'Grant admin access?',
                            description: `${p.is_admin ? 'Remove admin' : 'Make admin'} for "${p.email ?? p.full_name ?? p.id}"?`,
                            confirmLabel: p.is_admin ? 'Remove admin' : 'Make admin',
                            onConfirm: async () => {
                              try {
                                const { error } = await supabase
                                  .from('profiles')
                                  .update({ is_admin: !p.is_admin })
                                  .eq('id', p.id)
                                if (error) throw error
                                await loadProfiles()
                                toast({
                                  title: p.is_admin ? 'Admin removed' : 'Admin granted',
                                  description: 'User permissions updated.',
                                })
                              } catch (err) {
                                const appErr = toAppError(err)
                                toast({
                                  variant: 'destructive',
                                  title: appErr.title,
                                  description: appErr.message,
                                })
                              }
                            },
                          })
                        }
                      >
                        {p.is_admin ? 'Remove admin' : 'Make admin'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            {!profilesLoading && !profilesError && filteredProfiles.length === 0 ? (
              <p className="adminHint">No users match your search.</p>
            ) : null}
          </section>
        ) : null}

        {addBrandOpen ? (
          <div className="adminModal" role="dialog" aria-modal="true" aria-label="Add brand">
            <div
              className="adminModal__backdrop"
              onClick={() => {
                if (!creatingBrand) setAddBrandOpen(false)
              }}
            />
            <form
              className="adminModal__card"
              onSubmit={(event) => {
                event.preventDefault()
                void handleCreateBrand()
              }}
            >
              <div className="adminModal__head">
                <div>
                  <div className="adminModal__title">Add brand</div>
                  <div className="adminModal__sub">Create a brand logo fallback for catalog cards.</div>
                </div>
                <button
                  className="adminButton"
                  type="button"
                  disabled={creatingBrand}
                  onClick={() => setAddBrandOpen(false)}
                >
                  Close
                </button>
              </div>

              <div className="adminFormGrid">
                <label className="field">
                  <span className="field__label">Brand name</span>
                  <input
                    className="field__input"
                    value={newBrandName}
                    onChange={(e) => setNewBrandName(e.target.value)}
                    placeholder="e.g. Lifted"
                    autoFocus
                  />
                </label>
                <label className="field">
                  <span className="field__label">Logo URL fallback</span>
                  <input
                    className="field__input"
                    value={newBrandLogoUrl}
                    onChange={(e) => setNewBrandLogoUrl(e.target.value)}
                    placeholder="https://... or /brands/..."
                  />
                  <span className="field__hint">Use this when the logo already lives elsewhere.</span>
                </label>
                <label className="field">
                  <span className="field__label">Upload logo</span>
                  <input
                    className="field__input field__input--file"
                    type="file"
                    accept="image/*"
                    onChange={(e) => setNewBrandLogoFile(e.target.files?.[0] ?? null)}
                  />
                  <span className="field__hint">Overrides the URL field and becomes the product fallback.</span>
                </label>
                <div className="adminFormGrid__full">
                  <div className="adminBrandComposer">
                    <div className="adminBrandComposer__preview">
                      <AdminLogoPreview
                        src={effectiveNewBrandLogoPreview}
                        fallback={newBrandName || 'Brand'}
                      />
                    </div>
                    <div className="adminBrandComposer__copy">
                      <div className="adminBrandComposer__title">
                        {newBrandName.trim() || 'New brand preview'}
                      </div>
                      <div className="adminBrandComposer__body">
                        Products without their own image can use this logo as the cannabis fallback.
                        Apparel still uses cap and shirt placeholders when no product image is supplied.
                      </div>
                    </div>
                  </div>
                </div>
                <div className="adminFormGrid__full adminModal__actionsRow">
                  <button
                    className="adminButton"
                    type="button"
                    disabled={creatingBrand}
                    onClick={() => setAddBrandOpen(false)}
                  >
                    Cancel
                  </button>
                  <button className="adminButton adminButton--primary" type="submit" disabled={creatingBrand}>
                    {creatingBrand ? 'Adding...' : 'Add brand'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        ) : null}

        {addUserOpen ? (
          <div className="adminModal" role="dialog" aria-modal="true" aria-label="Add user">
            <div
              className="adminModal__backdrop"
              onClick={() => {
                if (!creatingUser) setAddUserOpen(false)
              }}
            />
            <form
              className="adminModal__card"
              onSubmit={(event) => {
                event.preventDefault()
                void handleCreateUser()
              }}
            >
              <div className="adminModal__head">
                <div>
                  <div className="adminModal__title">Add user</div>
                  <div className="adminModal__sub">Create an active account and assign the correct role.</div>
                </div>
                <button
                  className="adminButton"
                  type="button"
                  disabled={creatingUser}
                  onClick={() => setAddUserOpen(false)}
                >
                  Close
                </button>
              </div>

              <div className="adminFormGrid">
                <label className="field">
                  <span className="field__label">First name</span>
                  <input
                    className="field__input"
                    value={newUserFirstName}
                    onChange={(e) => setNewUserFirstName(e.target.value)}
                    placeholder="Optional"
                    autoFocus
                  />
                </label>
                <label className="field">
                  <span className="field__label">Last name</span>
                  <input
                    className="field__input"
                    value={newUserLastName}
                    onChange={(e) => setNewUserLastName(e.target.value)}
                    placeholder="Optional"
                  />
                </label>
                <label className="field">
                  <span className="field__label">Role</span>
                  <select
                    className="field__input"
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value as NewUserRole)}
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </label>
                <label className="field">
                  <span className="field__label">Id Number</span>
                  <input
                    className="field__input"
                    type="Id Number"
                    value={newUserIdNumber}
                    onChange={(e) => setNewUserIdNumber(e.target.value)}
                    placeholder="1234567890987"
                  />
                </label>
                <label className="field">
                  <span className="field__label">Email</span>
                  <input
                    className="field__input"
                    type="email"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    placeholder="user@example.com"
                  />
                </label>
                <label className="field">
                  <span className="field__label">Password</span>
                  <input
                    className="field__input"
                    type="text"
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                  />
                  <span className="field__hint">The account is created active and can sign in immediately.</span>
                </label>
                <div className="adminFormGrid__full adminModal__actionsRow">
                  <button
                    className="adminButton"
                    type="button"
                    disabled={creatingUser}
                    onClick={() => setAddUserOpen(false)}
                  >
                    Cancel
                  </button>
                  <button className="adminButton adminButton--primary" type="submit" disabled={creatingUser}>
                    {creatingUser ? 'Creating...' : 'Create user'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        ) : null}

        {addStockOpen ? (
          <div className="adminModal" role="dialog" aria-modal="true" aria-label="Add stock item">
            <div
              className="adminModal__backdrop"
              onClick={() => {
                resetStockForm()
                setAddStockOpen(false)
              }}
            />
            <div className="adminModal__card adminModal__card--wide">
              <div className="adminModal__head">
                <div>
                  <div className="adminModal__title">
                    {stockMode === 'apparel' ? 'Add apparel item' : 'Add cannabis item'}
                  </div>
                  <div className="adminModal__sub">
                    {stockMode === 'apparel'
                      ? 'Use caps and shirts placeholders when real product images are not ready yet.'
                      : 'Flower, edibles, beverages, smokables, vapes, and concentrates keep their own strain and consumption controls.'}
                  </div>
                </div>
                <button
                  className="adminButton"
                  type="button"
                  onClick={() => {
                    resetStockForm()
                    setAddStockOpen(false)
                  }}
                >
                  Close
                </button>
              </div>

              <div className="adminFormGrid">
                <label className="field">
                  <span className="field__label">Name</span>
                  <input
                    className="field__input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </label>

                <label className="field">
                  <span className="field__label">Brand</span>
                  <select
                    className="field__input"
                    value={brandId}
                    onChange={(e) => handleBrandSelect(e.target.value)}
                  >
                    <option value="" disabled>
                      Select…
                    </option>
                    {brands.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                        {!b.active ? ' (Hidden)' : ''}
                      </option>
                    ))}
                  </select>
                  {brandsLoading ? <span className="field__hint">Loading brands…</span> : null}
                  {brandsError ? <span className="field__hint">{brandsError}</span> : null}
                </label>

                <label className="field">
                  <span className="field__label">Category</span>
                  <select
                    className="field__input"
                    value={category}
                    onChange={(e) => handleCategoryChange(e.target.value as Product['category'])}
                  >
                    {(stockMode === 'apparel' ? APPAREL_CATEGORIES : CANNABIS_CATEGORIES).map((option) => (
                      <option key={option} value={option}>
                        {titleCase(option)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  <span className="field__label">Price (ZAR)</span>
                  <input
                    className="field__input"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    inputMode="decimal"
                    placeholder="0.00"
                  />
                </label>

                <label className="field">
                  <span className="field__label">Stock qty</span>
                  <input
                    className="field__input"
                    value={stockQty}
                    onChange={(e) => setStockQty(e.target.value)}
                    inputMode="numeric"
                    placeholder="0"
                  />
                </label>

                <label className="field">
                  <span className="field__label">Image URL</span>
                  <input
                    className="field__input"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://…"
                  />
                  <span className="field__hint">
                    {stockMode === 'apparel'
                      ? 'Optional. If left blank, the storefront will use the built-in category placeholder for this apparel item.'
                      : 'Optional. If left blank, the storefront falls back to the selected brand logo where available.'}
                  </span>
                </label>

                <label className="field">
                  <span className="field__label">Upload image</span>
                  <input
                    className="field__input field__input--file"
                    type="file"
                    accept="image/*"
                    onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
                  />
                  <span className="field__hint">
                    Uploads to Supabase Storage and overrides the URL field.
                  </span>
                </label>

                {stockMode === 'cannabis' ? (
                  <>
                    <label className="field">
                      <span className="field__label">Strain</span>
                      <select
                        className="field__input"
                        value={strainType ?? ''}
                        onChange={(e) =>
                          setStrainType(
                            e.target.value ? (e.target.value as Product['strain_type']) : null,
                          )
                        }
                      >
                        <option value="">—</option>
                        <option value="sativa">Sativa</option>
                        <option value="indica">Indica</option>
                        <option value="hybrid">Hybrid</option>
                      </select>
                    </label>

                    <label className="field">
                      <span className="field__label">Consumption</span>
                      <select
                        className="field__input"
                        value={consumptionMethod ?? ''}
                        onChange={(e) =>
                          setConsumptionMethod(
                            e.target.value
                              ? (e.target.value as Product['consumption_method'])
                              : null,
                          )
                        }
                      >
                        <option value="">—</option>
                        <option value="smokable">Smokable</option>
                        <option value="edible">Edible</option>
                        <option value="dab">Dab</option>
                      </select>
                      <span className="field__hint">
                        If category is already <code>edible</code>, <code>edibles</code>, or <code>smokables</code>,
                        this value won’t be saved again when it matches.
                      </span>
                    </label>
                  </>
                ) : (
                  <div className="adminStockModeNote">
                    <div className="adminStockModeNote__title">Apparel placeholders ready</div>
                    <div className="adminStockModeNote__body">
                      Caps and shirts can publish with built-in placeholder artwork until the real product shots are uploaded.
                    </div>
                  </div>
                )}

                <label className="field adminFormGrid__full">
                  <span className="field__label">Description</span>
                  <textarea
                    className="field__textarea"
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Optional"
                  />
                </label>

                <div className="adminFormGrid__full">
                  <div className="adminProductPreview">
                    <div className="adminProductPreview__media">
                      {effectiveProductPreview?.url ? (
                        <img
                          className={
                            effectiveProductPreview.source === 'brand'
                              ? 'adminProductPreview__img adminProductPreview__img--brand'
                              : 'adminProductPreview__img'
                          }
                          src={effectiveProductPreview.url}
                          alt=""
                        />
                      ) : (
                        <div className="adminProductPreview__placeholder">No product image yet</div>
                      )}
                    </div>
                    <div className="adminProductPreview__meta">
                      <div className="adminProductPreview__title">Product image preview</div>
                      <div className="adminProductPreview__sub">
                        {imageFile
                          ? 'Using the uploaded file preview.'
                          : imageUrl.trim()
                            ? 'Using the direct image URL.'
                            : effectiveProductPreview?.source === 'placeholder'
                              ? `${titleCase(category)} placeholder will be shown until a real product image is added.`
                              : selectedBrand?.logo_url
                                ? `No product image supplied, so ${selectedBrand.name}'s logo will be used as the fallback.`
                                : 'Pick a brand or upload an image to preview the storefront card.'}
                      </div>
                      {stockFormHint ? <div className="adminHint adminHint--compact">{stockFormHint}</div> : null}
                    </div>
                  </div>
                </div>

                <label className="check adminFormGrid__full">
                  <input
                    className="check__input"
                    type="checkbox"
                    checked={featuredOnLanding}
                    onChange={(e) => setFeaturedOnLanding(e.target.checked)}
                  />
                  <span className="check__label">Feature on landing (public)</span>
                </label>

                <div className="adminFormGrid__full adminModal__actionsRow">
                  <button
                    className="adminButton"
                    type="button"
                    disabled={creatingStock}
                    onClick={() => resetStockForm()}
                  >
                    Reset
                  </button>
                  <button
                    className="adminButton adminButton--primary"
                    type="button"
                    disabled={creatingStock}
                    onClick={() =>
                      void (stockMode === 'apparel' ? handleCreateApparelStock() : handleCreateCannabisStock())
                    }
                  >
                    {creatingStock
                      ? 'Creating…'
                      : stockMode === 'apparel'
                        ? 'Create apparel item'
                        : 'Create cannabis item'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {editingBrand ? (
          <div className="adminModal" role="dialog" aria-modal="true" aria-label="Edit brand">
            <div className="adminModal__backdrop" onClick={closeEditBrand} />
            <div className="adminModal__card">
              <div className="adminModal__head">
                <div>
                  <div className="adminModal__title">Edit brand</div>
                  <div className="adminModal__sub">
                    Update the name or logo used by product cards without their own image.
                  </div>
                </div>
                <button className="adminButton" type="button" onClick={closeEditBrand}>
                  Close
                </button>
              </div>

              <div className="adminFormGrid">
                <label className="field">
                  <span className="field__label">Brand name</span>
                  <input
                    className="field__input"
                    value={editBrandName}
                    onChange={(e) => setEditBrandName(e.target.value)}
                  />
                </label>

                <label className="field">
                  <span className="field__label">Logo URL fallback</span>
                  <input
                    className="field__input"
                    value={editBrandLogoUrl}
                    onChange={(e) => setEditBrandLogoUrl(e.target.value)}
                    placeholder="https://… or /brands/…"
                  />
                </label>

                <label className="field">
                  <span className="field__label">Replace logo</span>
                  <input
                    className="field__input field__input--file"
                    type="file"
                    accept="image/*"
                    onChange={(e) => setEditBrandLogoFile(e.target.files?.[0] ?? null)}
                  />
                  <span className="field__hint">Uploaded logos override the current URL.</span>
                </label>

                <div className="adminFormGrid__full">
                  <div className="adminBrandComposer">
                    <div className="adminBrandComposer__preview">
                      <AdminLogoPreview
                        src={effectiveEditBrandLogoPreview}
                        fallback={editBrandName || editingBrand.name}
                      />
                    </div>
                    <div className="adminBrandComposer__copy">
                      <div className="adminBrandComposer__title">
                        {editBrandName.trim() || editingBrand.name}
                      </div>
                      <div className="adminBrandComposer__body">
                        This logo is used as the fallback for cannabis products with no product image.
                      </div>
                    </div>
                  </div>
                </div>

                <div className="adminFormGrid__full adminModal__actionsRow">
                  <button
                    className="adminButton"
                    type="button"
                    disabled={savingBrand}
                    onClick={closeEditBrand}
                  >
                    Cancel
                  </button>
                  <button
                    className="adminButton adminButton--primary"
                    type="button"
                    disabled={savingBrand}
                    onClick={() => void handleUpdateBrand()}
                  >
                    {savingBrand ? 'Saving…' : 'Save brand'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {stockAdjusting ? (
          <div className="adminModal" role="dialog" aria-modal="true" aria-label="Set stock quantity">
            <div
              className="adminModal__backdrop"
              onClick={() => {
                if (!savingStockAdjust) setStockAdjusting(null)
              }}
            />
            <form
              className="adminModal__card adminModal__card--compact"
              onSubmit={(event) => {
                event.preventDefault()
                void handleSaveStockAdjust()
              }}
            >
              <div className="adminModal__head">
                <div>
                  <div className="adminModal__title">Set stock quantity</div>
                  <div className="adminModal__sub">{stockAdjusting.name}</div>
                </div>
                <button
                  className="adminButton"
                  type="button"
                  disabled={savingStockAdjust}
                  onClick={() => setStockAdjusting(null)}
                >
                  Close
                </button>
              </div>
              <div className="adminConfirmBody">
                <label className="field">
                  <span className="field__label">Quantity in stock</span>
                  <input
                    className="field__input"
                    type="number"
                    min="0"
                    step="1"
                    inputMode="numeric"
                    value={stockAdjustQty}
                    onChange={(event) => setStockAdjustQty(event.target.value)}
                    autoFocus
                  />
                  <span className="field__hint">Use a whole number of 0 or higher.</span>
                </label>
              </div>
              <div className="adminModal__actionsRow adminConfirmActions">
                <button
                  className="adminButton"
                  type="button"
                  disabled={savingStockAdjust}
                  onClick={() => setStockAdjusting(null)}
                >
                  Cancel
                </button>
                <button className="adminButton adminButton--primary" type="submit" disabled={savingStockAdjust}>
                  {savingStockAdjust ? 'Saving...' : 'Save stock'}
                </button>
              </div>
            </form>
          </div>
        ) : null}

        {confirmDialog ? (
          <div className="adminModal" role="alertdialog" aria-modal="true" aria-label={confirmDialog.title}>
            <div
              className="adminModal__backdrop"
              onClick={() => {
                if (!confirmingDialog) setConfirmDialog(null)
              }}
            />
            <div className="adminModal__card adminModal__card--compact">
              <div className="adminModal__head">
                <div>
                  <div className="adminModal__title">{confirmDialog.title}</div>
                  <div className="adminModal__sub">Please confirm this action.</div>
                </div>
                <button
                  className="adminButton"
                  type="button"
                  disabled={confirmingDialog}
                  onClick={() => setConfirmDialog(null)}
                >
                  Close
                </button>
              </div>
              <div className="adminConfirmBody">
                <p>{confirmDialog.description}</p>
              </div>
              <div className="adminModal__actionsRow adminConfirmActions">
                <button
                  className="adminButton"
                  type="button"
                  disabled={confirmingDialog}
                  onClick={() => setConfirmDialog(null)}
                >
                  Cancel
                </button>
                <button
                  className={
                    confirmDialog.destructive
                      ? 'adminButton adminButton--danger'
                      : 'adminButton adminButton--primary'
                  }
                  type="button"
                  disabled={confirmingDialog}
                  onClick={() => void handleConfirmDialog()}
                >
                  {confirmingDialog ? 'Working...' : confirmDialog.confirmLabel}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {selectedProfile ? (
          <div className="adminModal" role="dialog" aria-modal="true" aria-label="User details">
            <div className="adminModal__backdrop" onClick={() => setSelectedProfile(null)} />
            <div className="adminModal__card">
              <div className="adminModal__head">
                <div>
                  <div className="adminModal__title">
                    {(selectedProfile.full_name ??
                      `${selectedProfile.first_name ?? ''} ${selectedProfile.last_name ?? ''}`.trim()) ||
                      'User'}
                  </div>
                  <div className="adminModal__sub">{selectedProfile.email ?? selectedProfile.id}</div>
                </div>
                <button className="adminButton" type="button" onClick={() => setSelectedProfile(null)}>
                  Close
                </button>
              </div>

              <div className="adminModal__grid">
                <div className="adminModal__field">
                  <div className="adminModal__label">Role</div>
                  <div className="adminModal__value">{selectedProfile.is_admin ? 'Admin' : 'User'}</div>
                </div>
                <div className="adminModal__field">
                  <div className="adminModal__label">Consent</div>
                  <div className="adminModal__value">
                    {selectedProfile.accepted_regulations ? 'Accepted' : 'Missing'}
                    {selectedProfile.accepted_regulations_at
                      ? ` (${new Date(selectedProfile.accepted_regulations_at).toLocaleString()})`
                      : ''}
                  </div>
                </div>
                <div className="adminModal__field adminModal__field--full">
                  <div className="adminModal__label">Address</div>
                  <div className="adminModal__value">{selectedProfile.address ?? '—'}</div>
                </div>
                <div className="adminModal__field">
                  <div className="adminModal__label">ID number</div>
                  <div className="adminModal__value">
                    {selectedProfile.id_number ? `•••••${selectedProfile.id_number.slice(-4)}` : '—'}
                  </div>
                </div>
                <div className="adminModal__field">
                  <div className="adminModal__label">Created</div>
                  <div className="adminModal__value">
                    {selectedProfile.created_at ? new Date(selectedProfile.created_at).toLocaleString() : '—'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  )
}
