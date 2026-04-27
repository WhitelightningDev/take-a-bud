import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { Blend, MoonStar, SunMedium } from 'lucide-react'
import cannabisLeafImg from '../assets/cannabis-bg-img.png'
import logoImg from '../assets/take-a-bud-logo.png'
import { useAuth } from '../auth/useAuth.ts'
import { resolveProductMedia } from '../lib/productCatalog.ts'
import { isSupabaseConfigured, supabase } from '../lib/supabaseClient.ts'
import '../App.css'

const LANDING_AGE_GATE_KEY = 'take-a-bud.age-gate.18-plus'
const UNDER_18_REDIRECT_URL = 'https://www.disney.co.za/'

const categoryTiles = [
  {
    title: 'Lifted Delta 8 Gummies',
    body: 'Clowd 8 hybrid gummies in a 600mg pack for customers who prefer edible products.',
    href: '/store?category=edible',
  },
  {
    title: 'Take A Bud Caps',
    body: 'Branded caps with live stock counts, current pricing, and product images as they are added.',
    href: '/store?category=caps',
  },
  {
    title: 'Take A Bud Shirts',
    body: 'Store merch for customers who want the brand without buying cannabis products.',
    href: '/store?category=shirts',
  },
]

const trustPoints = [
  '18+ account verification',
  'Live inventory counts',
  'Prices shown in ZAR',
  'Cannabis and apparel separated',
]

const educationCards = [
  {
    title: 'Create an account',
    body: 'Sign up once with your details so age-restricted products stay behind verified access.',
  },
  {
    title: 'Shop live stock',
    body: 'Browse caps, shirts, edibles, flower, vapes, and concentrates with current availability.',
  },
  {
    title: 'Review before buying',
    body: 'Open each item for price, brand, category, strain type, product format, and stock status.',
  },
]

function BrandLogo({
  src,
  alt,
  fallback,
}: {
  src?: string | null
  alt: string
  fallback: string
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const failed = Boolean(src && failedSrc === src)

  if (!src) {
    return <div className="brandLogo__fallback">{fallback}</div>
  }

  if (failed) {
    return <div className="brandLogo__fallback">{fallback}</div>
  }

  return (
    <img
      className="brandLogo__img"
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailedSrc(src)}
    />
  )
}

type BrandRow = {
  id: string
  name: string
  logo_url: string | null
  active: boolean
  created_at: string
}

type FeaturedProduct = {
  id: string
  name: string
  description: string | null
  price_cents: number
  image_url: string | null
  category: string
  stock_qty?: number | null
  consumption_method?: 'smokable' | 'edible' | 'dab' | null
  strain_type?: 'sativa' | 'indica' | 'hybrid' | null
  brand:
    | { id: string; name: string; logo_url: string | null }
    | { id: string; name: string; logo_url: string | null }[]
    | null
}

function titleCase(value: string) {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(' ')
}

function strainMeta(strain: FeaturedProduct['strain_type']) {
  if (strain === 'sativa') return { label: 'Sativa', icon: SunMedium }
  if (strain === 'indica') return { label: 'Indica', icon: MoonStar }
  if (strain === 'hybrid') return { label: 'Hybrid', icon: Blend }
  return null
}

function productDescription(product: FeaturedProduct) {
  if (product.description?.trim()) return product.description.trim()

  const category = product.category.toLowerCase()
  const name = product.name.toLowerCase()

  if (name.includes('clowd 8') || name.includes('delta 8') || category === 'edible') {
    return 'Lifted hybrid edible gummies with a 600mg pack strength and current in-store availability.'
  }

  if (category === 'caps') {
    return 'Take A Bud branded cap with live stock counts and current store pricing.'
  }

  if (category === 'shirts') {
    return 'Take A Bud branded shirt for customers shopping apparel and merch.'
  }

  return `${titleCase(product.category)} item with live stock and current Take A Bud pricing.`
}

function productStockLabel(product: FeaturedProduct) {
  if (typeof product.stock_qty !== 'number') return 'Check stock'
  if (product.stock_qty <= 0) return 'Out of stock'
  if (product.stock_qty === 1) return '1 left'
  return `${product.stock_qty} in stock`
}

export function LandingPage() {
  const { user } = useAuth()
  const [brands, setBrands] = useState<BrandRow[] | null>(null)
  const [featured, setFeatured] = useState<FeaturedProduct[] | null>(null)
  const [ageConfirmed, setAgeConfirmed] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.sessionStorage.getItem(LANDING_AGE_GATE_KEY) === 'true'
  })

  useEffect(() => {
    if (!isSupabaseConfigured()) return

    let cancelled = false
    async function load() {
      try {
        const { data, error } = await supabase
          .from('brands')
          .select('id, name, logo_url, active, created_at')
          .eq('active', true)
          .order('created_at', { ascending: true })
        if (error) throw error
        if (!cancelled) setBrands((data ?? []) as BrandRow[])
      } catch {
        if (!cancelled) setBrands(null)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!isSupabaseConfigured()) return

    let cancelled = false
    async function load() {
      try {
        const { data, error } = await supabase
          .from('products')
          .select(
            'id, name, description, price_cents, image_url, category, stock_qty, consumption_method, strain_type, brand:brands(id, name, logo_url)',
          )
          .eq('active', true)
          .eq('featured_on_landing', true)
          .order('created_at', { ascending: false })
          .limit(6)
        if (error) throw error
        if (!cancelled) setFeatured((data ?? []) as FeaturedProduct[])
      } catch {
        if (!cancelled) setFeatured(null)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [])

  const brandsToShow: Array<Pick<BrandRow, 'id' | 'name' | 'logo_url'>> =
    brands && brands.length > 0
      ? brands
      : [
          { id: 'static-lifted', name: 'Lifted', logo_url: '/brands/lifted.png' },
          { id: 'static-awaken', name: 'Awaken Distillates', logo_url: '/brands/awaken.png' },
        ]

  function formatZar(cents: number) {
    return (cents / 100).toLocaleString(undefined, { style: 'currency', currency: 'ZAR' })
  }

  function featuredImage(product: FeaturedProduct) {
    const brandLogoUrl = Array.isArray(product.brand)
      ? product.brand[0]?.logo_url ?? null
      : product.brand?.logo_url ?? null

    return resolveProductMedia({
      imageUrl: product.image_url,
      category: product.category,
      brandLogoUrl,
    })
  }

  function featuredTags(product: FeaturedProduct) {
    const tags: Array<{ key: string; label: string; icon?: typeof SunMedium }> = []
    const seen = new Set<string>()

    const pushTag = (key: string, label: string, icon?: typeof SunMedium) => {
      const normalized = label.trim().toLowerCase()
      if (!normalized || seen.has(normalized)) return
      seen.add(normalized)
      tags.push({ key, label, icon })
    }

    const brand = Array.isArray(product.brand) ? product.brand[0]?.name : product.brand?.name
    if (brand) pushTag('brand', brand)
    if (product.category) pushTag('category', titleCase(product.category))
    if (product.consumption_method && product.consumption_method !== product.category) {
      pushTag('consumption', titleCase(product.consumption_method))
    }
    const strain = strainMeta(product.strain_type)
    if (strain) pushTag('strain', strain.label, strain.icon)

    return tags
  }

  function handleAgeConfirm() {
    window.sessionStorage.setItem(LANDING_AGE_GATE_KEY, 'true')
    setAgeConfirmed(true)
  }

  function handleAgeDecline() {
    window.sessionStorage.removeItem(LANDING_AGE_GATE_KEY)
    window.location.replace(UNDER_18_REDIRECT_URL)
  }

  return (
    <div className="landing">
      {!ageConfirmed ? (
        <div className="landingAgeGate" role="dialog" aria-modal="true" aria-labelledby="age-gate-title">
          <div className="landingAgeGate__backdrop" aria-hidden="true" />
          <div className="landingAgeGate__card">
            <p className="landingAgeGate__eyebrow">Age check</p>
            <h2 id="age-gate-title" className="landingAgeGate__title">
              Are you 18 or older?
            </h2>
            <p className="landingAgeGate__body">
              You must be 18 or older to continue to Take A Bud.
            </p>
            <div className="landingAgeGate__actions">
              <button
                className="landingAgeGate__button landingAgeGate__button--primary"
                type="button"
                onClick={handleAgeConfirm}
                autoFocus
              >
                Yes, I am 18+
              </button>
              <button
                className="landingAgeGate__button landingAgeGate__button--secondary"
                type="button"
                onClick={handleAgeDecline}
              >
                No
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <header className="landing__header">
        <div className="landing__notice">Adults only. Verified customers can shop live Take A Bud stock.</div>
        <nav className="landing__nav" aria-label="Primary">
          <Link className="landing__logoLink" to="/" aria-label="Take A Bud">
            <img className="landing__logo" src={logoImg} alt="Take A Bud" />
          </Link>

          <div className="landing__navLinks" aria-label="Page sections">
            <a href="#range">Product range</a>
            <a href="#featured">Featured</a>
            <a href="#brands">Brands</a>
          </div>

          <div className="landing__auth">
            <Link className="landing__authLink" to="/login">
              Login
            </Link>
            <Link className="landing__authButton" to={user ? '/store' : '/signup'}>
              {user ? 'Open store' : 'Create account'}
            </Link>
          </div>
        </nav>
      </header>

      <main className="landing__main">
        <section className="landingHero" aria-label="Intro">
          <div className="landingHero__copy">
            <p className="landingHero__eyebrow">Take A Bud Store</p>
            <h1 className="landingHero__title">Shop Take A Bud stock online.</h1>
            <p className="landingHero__body">
              Browse Take A Bud Apparel caps and shirts, plus Lifted Delta 8 gummies and other
              18+ products as they are added to the live catalog.
            </p>
            <div className="landing__cta" aria-label="Call to action">
              <Link className="landing__button landing__button--primary" to={user ? '/store' : '/signup'}>
                {user ? 'Shop now' : 'Create account to shop'}
              </Link>
              {!user ? (
                <Link className="landing__button landing__button--dark" to="/login">
                  Sign in
                </Link>
              ) : (
                <Link className="landing__button landing__button--dark" to="/profile">
                  My profile
                </Link>
              )}
            </div>
          </div>

          <div className="landingHero__visual" aria-hidden="true">
            <img className="landingHero__leaf" src={cannabisLeafImg} alt="" />
            <div className="landingHero__card landingHero__card--front">
              <span>Lifted</span>
              <strong>Delta 8 Gummies</strong>
            </div>
            <div className="landingHero__card landingHero__card--back">
              <span>Take A Bud Apparel</span>
              <strong>Caps and Shirts</strong>
            </div>
          </div>
        </section>

        <section className="landingTrust" aria-label="Store highlights">
          {trustPoints.map((point) => (
            <div key={point} className="landingTrust__item">
              {point}
            </div>
          ))}
        </section>

        <section id="range" className="landingSection" aria-label="Product range">
          <div className="landingSection__head">
            <p className="landingSection__eyebrow">Browse by range</p>
            <h2 className="landingSection__title">Start with the ranges customers are buying now.</h2>
          </div>
          <div className="landingCategoryGrid">
            {categoryTiles.map((tile) => (
              <Link key={tile.title} className="landingCategoryCard" to={tile.href}>
                <span className="landingCategoryCard__label">{tile.title}</span>
                <span className="landingCategoryCard__body">{tile.body}</span>
                <span className="landingCategoryCard__link">Browse range</span>
              </Link>
            ))}
          </div>
        </section>

        <section id="featured" className="landingSection landingSection--tinted" aria-label="Featured products">
          <div className="landingSection__head landingSection__head--split">
            <div>
              <p className="landingSection__eyebrow">Featured stock</p>
              <h2 className="landingSection__title">Current Take A Bud picks</h2>
            </div>
            <Link className="landingSection__link" to="/store">
              View more
            </Link>
          </div>

          {featured?.length ? (
            <div className="productGrid productGrid--compact">
              {featured.map((p) => {
                const media = featuredImage(p)

                return (
                  <Link key={p.id} className="productCard productCard--compact" to={`/products/${p.id}`}>
                    {media ? (
                      <img
                        className={
                          media.source === 'brand'
                            ? 'productCard__img productCard__img--logo'
                            : media.source === 'placeholder'
                              ? 'productCard__img productCard__img--placeholderAsset'
                              : 'productCard__img'
                        }
                        src={media.url}
                        alt=""
                      />
                    ) : (
                      <div
                        className="productCard__img productCard__img--placeholder"
                        aria-hidden="true"
                      />
                    )}
                    <div className="productCard__body">
                      <div className="productCard__meta">
                        <span className="tag tag--brand">{productStockLabel(p)}</span>
                        {featuredTags(p).map((tag) => {
                          const Icon = tag.icon
                          return (
                            <span key={tag.key} className="tag">
                              {Icon ? <Icon className="tag__icon" aria-hidden="true" /> : null}
                              {tag.label}
                            </span>
                          )
                        })}
                      </div>
                      <h3 className="productCard__title">{p.name}</h3>
                      <p className="productCard__desc">{productDescription(p)}</p>
                      <p className="productCard__price">{formatZar(p.price_cents)}</p>
                    </div>
                  </Link>
                )
              })}
            </div>
          ) : (
            <p className="appHint">Featured products are being updated. Open the store to browse the full catalog.</p>
          )}
        </section>

        <section id="brands" className="landingSection brands" aria-label="Brands we stock">
          <p className="landingSection__eyebrow">Brands we stock</p>
          <div className="brands__row">
            {brandsToShow.map((brand) => (
              <BrandLogo
                key={brand.id}
                src={brand.logo_url}
                alt={`${brand.name} logo`}
                fallback={brand.name}
              />
            ))}
          </div>
        </section>

        <section className="landingSection" aria-label="Catalog benefits">
          <div className="landingInfoGrid">
            {educationCards.map((card) => (
              <article key={card.title} className="landingInfoCard">
                <h2>{card.title}</h2>
                <p>{card.body}</p>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}
