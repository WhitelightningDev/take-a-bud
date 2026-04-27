

import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AppHeader } from '../components/AppHeader.tsx'
import { resolveProductMedia } from '../lib/productCatalog.ts'
import { supabase } from '../lib/supabaseClient.ts'

type ProductDetail = {
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

type CartItem = {
  productId: string
  name: string
  priceCents: number
  imageUrl: string | null
  quantity: number
}

const CART_KEY = 'take-a-bud-cart'
const FAVOURITES_KEY = 'take-a-bud-favourites'

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

function getBrand(product: ProductDetail) {
  if (Array.isArray(product.brand)) return product.brand[0] ?? null
  return product.brand
}

function getLocalStorageArray<T>(key: string): T[] {
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveLocalStorageArray<T>(key: string, value: T[]) {
  window.localStorage.setItem(key, JSON.stringify(value))
}

function ProductBadge({ children, tone = 'neutral' }: { children: string; tone?: 'neutral' | 'success' | 'warn' }) {
  const toneClass =
    tone === 'success'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : tone === 'warn'
        ? 'border-amber-200 bg-amber-50 text-amber-700'
        : 'border-slate-200 bg-white text-slate-600'

  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-[0.68rem] font-extrabold uppercase tracking-[0.14em] ${toneClass}`}>
      {children}
    </span>
  )
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="text-[0.68rem] font-extrabold uppercase tracking-[0.14em] text-slate-400">{label}</div>
      <div className="mt-1 text-sm font-bold text-slate-800">{value}</div>
    </div>
  )
}

function ProductDetailMedia({ media, name }: { media: ReturnType<typeof resolveProductMedia> | null; name: string }) {
  if (!media?.src) {
    return (
      <div className="flex aspect-[4/3] items-center justify-center bg-slate-100">
        <div className="text-sm font-extrabold uppercase tracking-[0.14em] text-slate-400">No image</div>
      </div>
    )
  }

  return (
    <div className="flex aspect-[4/3] items-center justify-center bg-slate-100 p-4">
      <img
        className={
          media.source === 'product'
            ? 'h-full w-full rounded-2xl object-cover shadow-sm'
            : 'max-h-full max-w-full rounded-2xl object-contain p-6'
        }
        src={media.src}
        alt={name}
        loading="eager"
      />
    </div>
  )
}

export function ProductDetailPage() {
  const { productId } = useParams()
  const navigate = useNavigate()
  const [product, setProduct] = useState<ProductDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [notice, setNotice] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function loadProduct() {
      if (!productId) {
        setError('Product not found.')
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)

      const { data, error: loadError } = await supabase
        .from('products')
        .select('*, brand:brands(id, name, logo_url)')
        .eq('id', productId)
        .eq('active', true)
        .maybeSingle()

      if (cancelled) return

      if (loadError) {
        setError(loadError.message)
        setProduct(null)
      } else if (!data) {
        setError('This product is unavailable or no longer active.')
        setProduct(null)
      } else {
        setProduct(data as ProductDetail)
        const favourites = getLocalStorageArray<string>(FAVOURITES_KEY)
        setSaved(favourites.includes(data.id))
      }

      setLoading(false)
    }

    void loadProduct()

    return () => {
      cancelled = true
    }
  }, [productId])

  const brand = product ? getBrand(product) : null
  const media = useMemo(() => {
    if (!product) return null
    return resolveProductMedia({
      imageUrl: product.image_url,
      category: product.category,
      brandLogoUrl: brand?.logo_url ?? null,
    })
  }, [brand?.logo_url, product])

  const inStock = Boolean(product && (product.stock_qty ?? 0) > 0)
  const maxQuantity = product ? Math.max(1, product.stock_qty ?? 0) : 1

  function addToCart() {
    if (!product) return
    if (!inStock) {
      setNotice('This product is currently out of stock.')
      return
    }

    const cart = getLocalStorageArray<CartItem>(CART_KEY)
    const existing = cart.find((item) => item.productId === product.id)
    const nextQuantity = Math.min(maxQuantity, Math.max(1, quantity))

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
            imageUrl: media?.src ?? product.image_url,
            quantity: nextQuantity,
          },
        ]

    saveLocalStorageArray(CART_KEY, nextCart)
    setNotice(`${product.name} was added to your cart.`)
  }

  function toggleSaved() {
    if (!product) return
    const favourites = getLocalStorageArray<string>(FAVOURITES_KEY)
    const nextSaved = !favourites.includes(product.id)
    const next = nextSaved
      ? [...favourites, product.id]
      : favourites.filter((id) => id !== product.id)

    saveLocalStorageArray(FAVOURITES_KEY, next)
    setSaved(nextSaved)
    setNotice(nextSaved ? 'Product saved.' : 'Product removed from saved items.')
  }

  function requestOrder() {
    if (!product) return
    const message = `Hi, I am interested in ${product.name} (${formatZar(product.price_cents)}). Quantity: ${quantity}.`
    window.localStorage.setItem('take-a-bud-last-order-request', message)
    setNotice('Order request saved. Connect this to WhatsApp or checkout next.')
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <AppHeader />

      <main className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            className="inline-flex h-10 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-extrabold text-slate-700 shadow-sm transition hover:bg-slate-50"
            type="button"
            onClick={() => navigate(-1)}
          >
            ← Back
          </button>

          <Link
            className="inline-flex h-10 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-extrabold text-slate-700 shadow-sm transition hover:bg-slate-50"
            to="/store"
          >
            Store
          </Link>
        </div>

        {loading ? (
          <section className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <p className="text-sm font-bold text-slate-500">Loading product…</p>
          </section>
        ) : error ? (
          <section className="rounded-3xl border border-red-200 bg-red-50 p-8 text-center shadow-sm">
            <h1 className="text-xl font-black text-red-900">Product unavailable</h1>
            <p className="mt-2 text-sm font-medium text-red-700">{error}</p>
            <Link
              className="mt-5 inline-flex h-11 items-center justify-center rounded-2xl border border-red-200 bg-white px-5 text-sm font-extrabold text-red-700 shadow-sm transition hover:bg-red-100"
              to="/store"
            >
              Go back to store
            </Link>
          </section>
        ) : product ? (
          <>
            <section className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
              <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                <ProductDetailMedia media={media} name={product.name} />
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap gap-2">
                  <ProductBadge>{titleCase(product.category)}</ProductBadge>
                  {product.featured_on_landing ? <ProductBadge tone="success">Featured</ProductBadge> : null}
                  <ProductBadge tone={inStock ? 'success' : 'warn'}>{inStock ? 'In stock' : 'Out of stock'}</ProductBadge>
                </div>

                <div className="mt-5">
                  {brand?.name ? (
                    <div className="text-sm font-extrabold uppercase tracking-[0.14em] text-emerald-700">{brand.name}</div>
                  ) : null}
                  <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">{product.name}</h1>
                  <p className="mt-3 text-3xl font-black tracking-tight text-slate-950">{formatZar(product.price_cents)}</p>
                </div>

                <p className="mt-5 text-sm font-medium leading-7 text-slate-600">
                  {product.description || 'No description has been added for this product yet.'}
                </p>

                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <InfoTile label="Stock" value={`${product.stock_qty ?? 0} available`} />
                  <InfoTile label="Type" value={product.strain_type ? titleCase(product.strain_type) : 'Not specified'} />
                  <InfoTile label="Method" value={product.consumption_method ? titleCase(product.consumption_method) : 'Not specified'} />
                </div>

                <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-medium leading-6 text-amber-900">
                  <strong className="font-black text-amber-950">18+ only.</strong> Cannabis products are only available to verified customers who meet local legal requirements.
                </div>

                <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <label className="block">
                    <span className="mb-1 block text-[0.68rem] font-extrabold uppercase tracking-[0.14em] text-slate-400">Quantity</span>
                    <div className="flex items-center overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                      <button
                        className="h-10 w-10 text-lg font-black text-slate-500 transition hover:bg-slate-50"
                        type="button"
                        onClick={() => setQuantity((current) => Math.max(1, current - 1))}
                      >
                        −
                      </button>
                      <input
                        className="h-10 w-14 border-x border-slate-200 bg-white text-center text-sm font-black text-slate-950 outline-none"
                        value={quantity}
                        onChange={(event) => {
                          const next = Number(event.target.value.replace(/\D/g, '')) || 1
                          setQuantity(Math.min(maxQuantity, Math.max(1, next)))
                        }}
                        inputMode="numeric"
                      />
                      <button
                        className="h-10 w-10 text-lg font-black text-slate-500 transition hover:bg-slate-50"
                        type="button"
                        onClick={() => setQuantity((current) => Math.min(maxQuantity, current + 1))}
                      >
                        +
                      </button>
                    </div>
                  </label>

                  <div className="flex flex-wrap gap-2 sm:justify-end">
                    <button
                      className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-950 bg-slate-950 px-5 text-sm font-extrabold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                      type="button"
                      onClick={addToCart}
                      disabled={!inStock}
                    >
                      Add to cart
                    </button>
                    <button
                      className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-extrabold text-slate-700 shadow-sm transition hover:bg-slate-50"
                      type="button"
                      onClick={toggleSaved}
                    >
                      {saved ? 'Saved' : 'Save item'}
                    </button>
                  </div>
                </div>

                <button
                  className="mt-3 inline-flex h-11 w-full items-center justify-center rounded-2xl border border-emerald-700 bg-emerald-700 px-5 text-sm font-extrabold text-white shadow-sm transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
                  type="button"
                  onClick={requestOrder}
                  disabled={!inStock}
                >
                  Request order
                </button>

                {notice ? (
                  <p className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
                    {notice}
                  </p>
                ) : null}
              </div>
            </section>

            <section className="grid gap-5 lg:grid-cols-3">
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
                <h2 className="text-lg font-black tracking-tight text-slate-950">Product details</h2>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <InfoTile label="Category" value={titleCase(product.category)} />
                  <InfoTile label="Brand" value={brand?.name ?? 'Unbranded'} />
                  <InfoTile label="Created" value={new Date(product.created_at).toLocaleDateString()} />
                  <InfoTile label="Product ID" value={product.id} />
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-black tracking-tight text-slate-950">Next actions</h2>
                <div className="mt-4 grid gap-2">
                  <Link
                    className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-extrabold text-slate-700 shadow-sm transition hover:bg-slate-50"
                    to="/profile"
                  >
                    Verify profile
                  </Link>
                  <Link
                    className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-extrabold text-slate-700 shadow-sm transition hover:bg-slate-50"
                    to="/store"
                  >
                    Continue shopping
                  </Link>
                </div>
              </div>
            </section>
          </>
        ) : null}
      </main>
    </div>
  )
}