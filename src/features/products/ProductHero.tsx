import { resolveProductMedia } from '../../lib/productCatalog.ts'
import {
  formatZar,
  getProductBrand,
  isProductInStock,
  productCategoryLabel,
  productConsumptionLabel,
  productStrainLabel,
} from './productFormat.ts'
import type { ProductDetail } from './types.ts'

function ProductBadge({ children, tone = 'neutral' }: { children: string; tone?: 'neutral' | 'success' | 'warn' }) {
  const toneClasses = {
    neutral: 'border-slate-200 bg-white text-slate-600',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    warn: 'border-amber-200 bg-amber-50 text-amber-700',
  }

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-[0.68rem] font-extrabold uppercase tracking-[0.14em] ${toneClasses[tone]}`}
    >
      {children}
    </span>
  )
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-[0.68rem] font-extrabold uppercase tracking-[0.14em] text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-sm font-bold text-slate-800">{value}</p>
    </div>
  )
}

function ProductHeroMedia({
  media,
  name,
}: {
  media: ReturnType<typeof resolveProductMedia>
  name: string
}) {
  if (!media?.url) {
    return (
      <div className="flex aspect-[4/3] items-center justify-center bg-slate-100">
        <div className="text-sm font-extrabold uppercase tracking-[0.14em] text-slate-400">
          No image
        </div>
      </div>
    )
  }

  return (
    <div className="flex aspect-[4/3] items-center justify-center bg-slate-100 p-4">
      <img
        className={`rounded-2xl ${
          media.source === 'product'
            ? 'h-full w-full object-cover shadow-sm'
            : 'max-h-full max-w-full object-contain p-6'
        }`}
        src={media.url}
        alt={name}
        loading="eager"
      />
    </div>
  )
}

export function ProductHero({ product }: { product: ProductDetail }) {
  const brand = getProductBrand(product)
  const inStock = isProductInStock(product)
  const stockQty = product.stock_qty ?? 0
  const description = product.description?.trim() || 'No description has been added for this product yet.'
  const media = resolveProductMedia({
    imageUrl: product.image_url,
    category: product.category,
    brandLogoUrl: brand?.logo_url,
  })

  return (
    <section className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <ProductHeroMedia media={media} name={product.name} />
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap gap-2">
          <ProductBadge>{productCategoryLabel(product)}</ProductBadge>
          {product.featured_on_landing && <ProductBadge tone="success">Featured</ProductBadge>}
          <ProductBadge tone={inStock ? 'success' : 'warn'}>{inStock ? 'In stock' : 'Out of stock'}</ProductBadge>
        </div>

        <div className="mt-5">
          {brand?.name && (
            <p className="text-sm font-extrabold uppercase tracking-[0.14em] text-emerald-700">
              {brand.name}
            </p>
          )}
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
            {product.name}
          </h1>
          <p className="mt-3 text-3xl font-black tracking-tight text-slate-950">
            {formatZar(product.price_cents)}
          </p>
        </div>

        <p className="mt-5 text-sm font-medium leading-7 text-slate-600">{description}</p>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <InfoTile label="Stock" value={`${stockQty} available`} />
          <InfoTile label="Type" value={productStrainLabel(product)} />
          <InfoTile label="Method" value={productConsumptionLabel(product)} />
        </div>

        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-medium leading-6 text-amber-900">
          <strong className="font-black text-amber-950">18+ only.</strong> Cannabis products are only available
          to verified customers who meet local legal requirements.
        </div>
      </div>
    </section>
  )
}
