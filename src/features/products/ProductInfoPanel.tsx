

import { Link } from 'react-router-dom'
import {
  getProductBrand,
  productCategoryLabel,
  productConsumptionLabel,
  productStrainLabel,
} from './productFormat.ts'
import type { ProductDetail } from './types.ts'

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="text-[0.68rem] font-extrabold uppercase tracking-[0.14em] text-slate-400">
        {label}
      </div>
      <div className="mt-1 break-words text-sm font-bold text-slate-800">{value}</div>
    </div>
  )
}

function DetailSection({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-lg font-black tracking-tight text-slate-950">{title}</h2>
        <p className="mt-1 text-sm font-medium leading-6 text-slate-500">{description}</p>
      </div>
      {children}
    </section>
  )
}

export function ProductInfoPanel({ product }: { product: ProductDetail }) {
  const brand = getProductBrand(product)

  return (
    <section className="grid gap-5 lg:grid-cols-3">
      <DetailSection
        title="Product details"
        description="Core product information pulled from your catalog record."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <InfoTile label="Category" value={productCategoryLabel(product)} />
          <InfoTile label="Brand" value={brand?.name ?? 'Unbranded'} />
          <InfoTile label="Stock" value={`${product.stock_qty ?? 0} available`} />
          <InfoTile label="Status" value={product.active ? 'Active' : 'Hidden'} />
          <InfoTile label="Featured" value={product.featured_on_landing ? 'Yes' : 'No'} />
          <InfoTile label="Created" value={new Date(product.created_at).toLocaleDateString()} />
        </div>
      </DetailSection>

      <DetailSection
        title="Usage profile"
        description="Cannabis-specific details help users understand the product before taking action."
      >
        <div className="grid gap-3">
          <InfoTile label="Strain type" value={productStrainLabel(product)} />
          <InfoTile label="Consumption method" value={productConsumptionLabel(product)} />
          <InfoTile label="Product ID" value={product.id} />
        </div>
      </DetailSection>

      <DetailSection
        title="Next actions"
        description="Customer actions that support conversion and account completion."
      >
        <div className="grid gap-2">
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
      </DetailSection>
    </section>
  )
}