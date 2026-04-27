import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Blend, MoonStar, Search, SlidersHorizontal, SunMedium, X } from 'lucide-react'
import { useAuth } from '../auth/useAuth.ts'
import { AppHeader } from '../components/AppHeader.tsx'
import { resolveProductMedia } from '../lib/productCatalog.ts'
import { supabase } from '../lib/supabaseClient.ts'
import '../App.css'

type Product = {
  id: string
  name: string
  description: string | null
  price_cents: number
  image_url: string | null
  active: boolean
  created_at?: string
  stock_qty?: number
  strain_type?: 'sativa' | 'indica' | 'hybrid' | null
  consumption_method?: 'smokable' | 'edible' | 'dab' | null
  category?: string
  brand?:
    | { id: string; name: string; logo_url: string | null }
    | { id: string; name: string; logo_url: string | null }[]
    | null
}

type ProductImage = {
  url: string
  mode: 'product' | 'brand' | 'placeholder'
}

type FilterOption = {
  value: string
  label: string
  count: number
}

function formatPrice(cents: number) {
  const dollars = cents / 100
  return dollars.toLocaleString(undefined, { style: 'currency', currency: 'ZAR' })
}

function titleCase(value: string) {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(' ')
}

function productBrand(product: Product) {
  if (Array.isArray(product.brand)) return product.brand[0] ?? null
  return product.brand ?? null
}

function productImage(product: Product): ProductImage | null {
  const media = resolveProductMedia({
    imageUrl: product.image_url,
    category: product.category,
    brandLogoUrl: productBrand(product)?.logo_url,
  })

  if (!media) return null

  return {
    url: media.url,
    mode: media.source,
  }
}

function buildValueOptions(values: Array<string | null | undefined>): FilterOption[] {
  const counts = new Map<string, number>()

  values.forEach((value) => {
    if (!value) return
    counts.set(value, (counts.get(value) ?? 0) + 1)
  })

  return Array.from(counts.entries())
    .map(([value, count]) => ({ value, label: titleCase(value), count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
}

function strainMeta(strain: Product['strain_type']) {
  if (strain === 'sativa') return { label: 'Sativa', icon: SunMedium }
  if (strain === 'indica') return { label: 'Indica', icon: MoonStar }
  if (strain === 'hybrid') return { label: 'Hybrid', icon: Blend }
  return null
}

function productTags(product: Product) {
  const tags: Array<
    | { key: string; label: string; tone?: 'brand' | 'category' | 'warn' }
    | {
        key: string
        label: string
        tone?: 'brand' | 'category' | 'warn'
        icon: typeof SunMedium
      }
  > = []
  const seen = new Set<string>()

  const pushTag = (
    key: string,
    label: string,
    tone?: 'brand' | 'category' | 'warn',
    icon?: typeof SunMedium,
  ) => {
    const normalized = label.trim().toLowerCase()
    if (!normalized || seen.has(normalized)) return
    seen.add(normalized)
    if (icon) {
      tags.push({ key, label, tone, icon })
      return
    }
    tags.push({ key, label, tone })
  }

  const brand = productBrand(product)?.name
  if (brand) pushTag('brand', brand, 'brand')
  if (product.category) pushTag('category', titleCase(product.category), 'category')
  if (product.consumption_method && product.consumption_method !== product.category) {
    pushTag('consumption', titleCase(product.consumption_method))
  }

  const strain = strainMeta(product.strain_type)
  if (strain) pushTag('strain', strain.label, undefined, strain.icon)

  if (typeof product.stock_qty === 'number' && product.stock_qty <= 0) {
    pushTag('stock', 'Out of stock', 'warn')
  }

  return tags
}

export function StorePage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [query, setQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [brandFilter, setBrandFilter] = useState('all')
  const [strainFilter, setStrainFilter] = useState('all')
  const [methodFilter, setMethodFilter] = useState('all')
  const [stockFilter, setStockFilter] = useState<'all' | 'in-stock' | 'out-of-stock'>('all')
  const [sortBy, setSortBy] = useState<'newest' | 'price-asc' | 'price-desc' | 'name-asc' | 'stock-desc'>(
    'newest',
  )
  const deferredQuery = useDeferredValue(query)

  const stats = useMemo(() => {
    const total = products.length
    const inStock = products.filter((product) => (product.stock_qty ?? 1) > 0).length
    const brands = new Set(products.map((product) => productBrand(product)?.name ?? '').filter(Boolean)).size
    return { total, inStock, brands }
  }, [products])

  const brandOptions = useMemo(() => {
    const counts = new Map<string, { label: string; count: number }>()

    products.forEach((product) => {
      const brand = productBrand(product)
      if (!brand) return
      const entry = counts.get(brand.id)
      if (entry) {
        entry.count += 1
        return
      }
      counts.set(brand.id, { label: brand.name, count: 1 })
    })

    return Array.from(counts.entries())
      .map(([value, entry]) => ({ value, label: entry.label, count: entry.count }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
  }, [products])

  const categoryOptions = useMemo(() => buildValueOptions(products.map((product) => product.category)), [products])
  const strainOptions = useMemo(() => buildValueOptions(products.map((product) => product.strain_type)), [products])
  const methodOptions = useMemo(
    () => buildValueOptions(products.map((product) => product.consumption_method)),
    [products],
  )
  const categoryHighlights = useMemo(() => categoryOptions.slice(0, 5), [categoryOptions])

  const filteredProducts = useMemo(() => {
    const normalizedQuery = deferredQuery.trim().toLowerCase()

    const next = products.filter((product) => {
      const brand = productBrand(product)
      const stockQty = product.stock_qty ?? 1

      if (categoryFilter !== 'all' && product.category !== categoryFilter) return false
      if (brandFilter !== 'all' && brand?.id !== brandFilter) return false
      if (strainFilter !== 'all' && product.strain_type !== strainFilter) return false
      if (methodFilter !== 'all' && product.consumption_method !== methodFilter) return false
      if (stockFilter === 'in-stock' && stockQty <= 0) return false
      if (stockFilter === 'out-of-stock' && stockQty > 0) return false

      if (!normalizedQuery) return true

      const searchableText = [
        product.name,
        product.description ?? '',
        brand?.name ?? '',
        product.category ?? '',
        product.consumption_method ?? '',
        product.strain_type ?? '',
      ]
        .join(' ')
        .toLowerCase()

      return searchableText.includes(normalizedQuery)
    })

    next.sort((a, b) => {
      if (sortBy === 'price-asc') return a.price_cents - b.price_cents
      if (sortBy === 'price-desc') return b.price_cents - a.price_cents
      if (sortBy === 'name-asc') return a.name.localeCompare(b.name)
      if (sortBy === 'stock-desc') return (b.stock_qty ?? 1) - (a.stock_qty ?? 1)
      return new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime()
    })

    return next
  }, [products, deferredQuery, categoryFilter, brandFilter, strainFilter, methodFilter, stockFilter, sortBy])

  const hasActiveFilters =
    query.trim().length > 0 ||
    categoryFilter !== 'all' ||
    brandFilter !== 'all' ||
    strainFilter !== 'all' ||
    methodFilter !== 'all' ||
    stockFilter !== 'all' ||
    sortBy !== 'newest'

  const activeFilters = useMemo(() => {
    const next: string[] = []

    if (query.trim()) next.push(`Search: ${query.trim()}`)
    if (categoryFilter !== 'all') {
      next.push(
        `Category: ${categoryOptions.find((option) => option.value === categoryFilter)?.label ?? titleCase(categoryFilter)}`,
      )
    }
    if (brandFilter !== 'all') {
      next.push(`Brand: ${brandOptions.find((option) => option.value === brandFilter)?.label ?? brandFilter}`)
    }
    if (strainFilter !== 'all') {
      next.push(
        `Strain: ${strainOptions.find((option) => option.value === strainFilter)?.label ?? titleCase(strainFilter)}`,
      )
    }
    if (methodFilter !== 'all') {
      next.push(
        `Method: ${methodOptions.find((option) => option.value === methodFilter)?.label ?? titleCase(methodFilter)}`,
      )
    }
    if (stockFilter === 'in-stock') next.push('Availability: In stock')
    if (stockFilter === 'out-of-stock') next.push('Availability: Out of stock')
    if (sortBy === 'price-asc') next.push('Sort: Price low to high')
    if (sortBy === 'price-desc') next.push('Sort: Price high to low')
    if (sortBy === 'name-asc') next.push('Sort: Name A-Z')
    if (sortBy === 'stock-desc') next.push('Sort: Most stock')

    return next
  }, [
    query,
    categoryFilter,
    brandFilter,
    strainFilter,
    methodFilter,
    stockFilter,
    sortBy,
    categoryOptions,
    brandOptions,
    strainOptions,
    methodOptions,
  ])

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)

      const primary = (await supabase
        .from('products')
        .select(
          'id, name, description, price_cents, image_url, active, created_at, stock_qty, strain_type, consumption_method, category, brand:brands(id, name, logo_url)',
        )
        .eq('active', true)
        .order('created_at', { ascending: false })) as unknown as {
        data: Product[] | null
        error: { message: string } | null
      }

      const result =
        primary.error &&
        (primary.error.message.includes('column') || primary.error.message.includes('brands'))
          ? ((await supabase
              .from('products')
              .select('id, name, description, price_cents, image_url, active, created_at')
              .eq('active', true)
              .order('created_at', { ascending: false })) as unknown as {
              data: Product[] | null
              error: { message: string } | null
            })
          : primary

      if (cancelled) return

      if (result.error) {
        setError(result.error.message)
        setProducts([])
      } else {
        setProducts(result.data ?? [])
      }
      setLoading(false)
    }

    load().catch((e) => {
      if (!cancelled) {
        setError(e instanceof Error ? e.message : 'Failed to load products')
        setLoading(false)
      }
    })

    return () => {
      cancelled = true
    }
  }, [])

  function clearFilters() {
    setQuery('')
    setCategoryFilter('all')
    setBrandFilter('all')
    setStrainFilter('all')
    setMethodFilter('all')
    setStockFilter('all')
    setSortBy('newest')
  }

  return (
    <div className="appPage">
      <AppHeader />
      <main className="appMain appMain--store">
        <section className="storeHero">
          <div className="storeHero__content">
            <p className="storeHero__eyebrow">Take A Bud Store</p>
            <h1 className="storeHero__title">Browse the full shelf in one place.</h1>
            <p className="storeHero__copy">
              A cleaner catalog view for apparel, edibles, beverages, smokables, and concentrates.
            </p>
            <div className="storeHero__highlights" aria-label="Popular categories">
              {categoryHighlights.map((option) => (
                <button
                  key={option.value}
                  className={categoryFilter === option.value ? 'storeHero__chip storeHero__chip--active' : 'storeHero__chip'}
                  type="button"
                  onClick={() => setCategoryFilter(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
            {!user ? (
              <p className="appHint">
                To place orders you’ll need an account. <Link to="/signup">Sign up</Link>.
              </p>
            ) : null}
          </div>

          <div className="storeHero__panel">
            <div className="storeHero__searchWrap">
              <Search className="storeHero__searchIcon" aria-hidden="true" />
              <input
                className="storeHero__searchInput"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search products, brands, categories, strains…"
                aria-label="Search products"
              />
            </div>

            <div className="storeHero__stats" aria-label="Store summary">
              <div className="storeHero__stat">
                <span className="storeHero__statValue">{stats.total}</span>
                <span className="storeHero__statLabel">Products</span>
              </div>
              <div className="storeHero__stat">
                <span className="storeHero__statValue">{stats.inStock}</span>
                <span className="storeHero__statLabel">In stock</span>
              </div>
              <div className="storeHero__stat">
                <span className="storeHero__statValue">{stats.brands}</span>
                <span className="storeHero__statLabel">Brands</span>
              </div>
            </div>
          </div>
        </section>

        {loading ? <p className="appHint">Loading…</p> : null}

        {error ? (
          <div className="notice notice--warn">
            <p className="notice__title">Products aren’t ready yet</p>
            <p className="notice__body">
              {error.includes('relation') || error.includes('table') ? (
                <>
                  Run the Supabase migration to create the <code>products</code> table, then refresh.
                </>
              ) : (
                error
              )}
            </p>
          </div>
        ) : null}

        {!loading && !error ? (
          <section className="storeShelf" aria-label="Products">
            <div className="storeShelf__head">
              <div>
                <p className="storeShelf__eyebrow">Available now</p>
                <h2 className="storeShelf__title">Shop the current catalog</h2>
                <p className="storeShelf__sub">
                  Showing {filteredProducts.length} of {products.length} products
                </p>
              </div>
              <p className="storeShelf__count">
                {filteredProducts.length === 1 ? '1 item' : `${filteredProducts.length} items`}
              </p>
            </div>

            <div className="storeCatalog">
            <aside className="storeFilters" aria-label="Filter products">
              <div className="storeFilters__bar">
                <div className="storeFilters__barLabel">
                  <SlidersHorizontal className="storeFilters__barIcon" aria-hidden="true" />
                  <span>Filters</span>
                </div>
                {hasActiveFilters ? (
                  <button className="storeFilters__clear" type="button" onClick={clearFilters}>
                    <X className="storeFilters__clearIcon" aria-hidden="true" />
                    Clear filters
                  </button>
                ) : null}
              </div>

              <div className="storeFilters__quickRow" aria-label="Quick category filters">
                <button
                  className={categoryFilter === 'all' ? 'storeFilterChip storeFilterChip--active' : 'storeFilterChip'}
                  type="button"
                  onClick={() => setCategoryFilter('all')}
                >
                  All categories
                </button>
                {categoryHighlights.map((option) => (
                  <button
                    key={option.value}
                    className={
                      categoryFilter === option.value ? 'storeFilterChip storeFilterChip--active' : 'storeFilterChip'
                    }
                    type="button"
                    onClick={() => setCategoryFilter(option.value)}
                  >
                    {option.label}
                    <span className="storeFilterChip__count">{option.count}</span>
                  </button>
                ))}
                <button
                  className={stockFilter === 'in-stock' ? 'storeFilterChip storeFilterChip--active' : 'storeFilterChip'}
                  type="button"
                  onClick={() => setStockFilter(stockFilter === 'in-stock' ? 'all' : 'in-stock')}
                >
                  Ready now
                  <span className="storeFilterChip__count">{stats.inStock}</span>
                </button>
              </div>

              <div className="storeFilters__grid">
                <label className="storeFilters__field storeFilters__field--search">
                  <span className="storeFilters__label">Search</span>
                  <div className="storeFilters__searchWrap">
                    <Search className="storeFilters__searchIcon" aria-hidden="true" />
                    <input
                      className="storeFilters__input storeFilters__input--search"
                      type="search"
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Search by product, brand, or keyword"
                    />
                  </div>
                </label>

                <label className="storeFilters__field">
                  <span className="storeFilters__label">Brand</span>
                  <select
                    className="storeFilters__input"
                    value={brandFilter}
                    onChange={(event) => setBrandFilter(event.target.value)}
                  >
                    <option value="all">All brands</option>
                    {brandOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label} ({option.count})
                      </option>
                    ))}
                  </select>
                </label>

                <label className="storeFilters__field">
                  <span className="storeFilters__label">Category</span>
                  <select
                    className="storeFilters__input"
                    value={categoryFilter}
                    onChange={(event) => setCategoryFilter(event.target.value)}
                  >
                    <option value="all">All categories</option>
                    {categoryOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label} ({option.count})
                      </option>
                    ))}
                  </select>
                </label>

                {methodOptions.length > 0 ? (
                  <label className="storeFilters__field">
                    <span className="storeFilters__label">Method</span>
                    <select
                      className="storeFilters__input"
                      value={methodFilter}
                      onChange={(event) => setMethodFilter(event.target.value)}
                    >
                      <option value="all">Any method</option>
                      {methodOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label} ({option.count})
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}

                {strainOptions.length > 0 ? (
                  <label className="storeFilters__field">
                    <span className="storeFilters__label">Strain</span>
                    <select
                      className="storeFilters__input"
                      value={strainFilter}
                      onChange={(event) => setStrainFilter(event.target.value)}
                    >
                      <option value="all">Any strain</option>
                      {strainOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label} ({option.count})
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}

                <label className="storeFilters__field">
                  <span className="storeFilters__label">Availability</span>
                  <select
                    className="storeFilters__input"
                    value={stockFilter}
                    onChange={(event) => setStockFilter(event.target.value as typeof stockFilter)}
                  >
                    <option value="all">All stock levels</option>
                    <option value="in-stock">In stock only</option>
                    <option value="out-of-stock">Out of stock</option>
                  </select>
                </label>

                <label className="storeFilters__field">
                  <span className="storeFilters__label">Sort</span>
                  <select
                    className="storeFilters__input"
                    value={sortBy}
                    onChange={(event) => setSortBy(event.target.value as typeof sortBy)}
                  >
                    <option value="newest">Newest first</option>
                    <option value="price-asc">Price: low to high</option>
                    <option value="price-desc">Price: high to low</option>
                    <option value="name-asc">Name: A to Z</option>
                    <option value="stock-desc">Most stock</option>
                  </select>
                </label>
              </div>

              {activeFilters.length > 0 ? (
                <div className="storeFilters__active" aria-label="Active filters">
                  {activeFilters.map((filter) => (
                    <span key={filter} className="storeFilters__activeChip">
                      {filter}
                    </span>
                  ))}
                </div>
              ) : null}
            </aside>

            <div className="storeResults">
            {filteredProducts.length > 0 ? (
              <div className="productGrid productGrid--store">
                {filteredProducts.map((product) => {
                  const image = productImage(product)
                  const tags = productTags(product)
                  const brand = productBrand(product)

                  return (
                    <Link
                      key={product.id}
                      to={`/products/${product.id}`}
                      className="block transition hover:-translate-y-1"
                    >
                      <article className="productCard productCard--store h-full">
                      <div className="productCard__media">
                        {image ? (
                          <img
                            className={
                              image.mode === 'brand'
                                ? 'productCard__img productCard__img--logo'
                                : image.mode === 'placeholder'
                                  ? 'productCard__img productCard__img--placeholderAsset'
                                  : 'productCard__img'
                            }
                            src={image.url}
                            alt={product.name}
                          />
                        ) : (
                          <div className="productCard__img productCard__img--placeholder" aria-hidden="true" />
                        )}

                        {typeof product.stock_qty === 'number' ? (
                          <span
                            className={
                              (product.stock_qty ?? 0) > 0
                                ? 'pill pill--on productCard__stockPill'
                                : 'pill pill--off productCard__stockPill'
                            }
                          >
                            {product.stock_qty > 0 ? `${product.stock_qty} in stock` : 'Out of stock'}
                          </span>
                        ) : null}
                      </div>

                      <div className="productCard__body">
                        <div className="productCard__meta">
                          {tags.map((tag) => {
                            const Icon = 'icon' in tag ? tag.icon : null
                            return (
                              <span
                                key={tag.key}
                                className={
                                  tag.tone === 'warn'
                                    ? 'tag tag--warn'
                                    : tag.tone === 'brand'
                                      ? 'tag tag--brand'
                                      : tag.tone === 'category'
                                        ? 'tag tag--category'
                                        : 'tag'
                                }
                              >
                                {Icon ? <Icon className="tag__icon" aria-hidden="true" /> : null}
                                {tag.label}
                              </span>
                            )
                          })}
                        </div>

                        {brand ? <p className="productCard__brandLine">{brand.name}</p> : null}
                        <h2 className="productCard__title">{product.name}</h2>

                        {product.description ? (
                          <p className="productCard__desc">{product.description}</p>
                        ) : (
                          <p className="productCard__desc productCard__desc--muted">
                            Brand-backed listing ready for the full storefront.
                          </p>
                        )}

                        <div className="productCard__footer">
                          <p className="productCard__price">{formatPrice(product.price_cents)}</p>
                          <span className="productCard__cta">View product</span>
                        </div>
                      </div>
                      </article>
                    </Link>
                  )
                })}
              </div>
            ) : (
              <div className="storeEmpty">
                <p className="storeEmpty__eyebrow">No matches</p>
                <h3 className="storeEmpty__title">Nothing fits the current filters.</h3>
                <p className="storeEmpty__body">
                  Try another search term, switch the stock filter, or reset the shelf to see the full catalog again.
                </p>
                <button className="storeFilters__clear storeFilters__clear--empty" type="button" onClick={clearFilters}>
                  <X className="storeFilters__clearIcon" aria-hidden="true" />
                  Reset catalog filters
                </button>
              </div>
            )}
            </div>
            </div>
          </section>
        ) : null}
      </main>
    </div>
  )
}
