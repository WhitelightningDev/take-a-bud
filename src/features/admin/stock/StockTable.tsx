import { AdminCatalogMedia, AdminLogoPreview } from '../components'
import type { ConfirmDialogState, Product } from '../types'
import { brandLogo, brandName, formatZar, productMedia } from '../utils'

type StockTableProps = {
  products: Product[]
  loading: boolean
  error: string | null
  onStockAdjust: (product: Product) => void
  onToggleFeatured: (product: Product) => Promise<void>
  onToggleActive: (product: Product) => Promise<void>
  onDelete: (product: Product) => Promise<void>
  onConfirm: (dialog: ConfirmDialogState) => void
}

export function StockTable({
  products,
  loading,
  error,
  onStockAdjust,
  onToggleFeatured,
  onToggleActive,
  onDelete,
  onConfirm,
}: StockTableProps) {
  if (loading) return <p className="adminHint">Loading…</p>

  if (error) {
    return (
      <div className="notice notice--warn">
        <p className="notice__title">Stock isn’t ready yet</p>
        <p className="notice__body">{error}</p>
      </div>
    )
  }

  if (products.length === 0) {
    return <p className="adminHint">No items yet. Add your first stock item.</p>
  }

  return (
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

      {products.map((product) => {
        const media = productMedia(product)

        return (
          <div key={product.id} className="adminTable2__row" role="row">
            <div role="cell" className="adminTable2__item adminTable2__item--withMedia">
              <div className="adminTable2__thumb">
                <AdminCatalogMedia src={media?.url} source={media?.source ?? null} alt={product.name} />
              </div>

              <div>
                <div className="adminTable2__itemTitle">{product.name}</div>
                <div className="adminTable2__itemSub">
                  <span className="tag">{product.category}</span>
                  {product.featured_on_landing ? <span className="tag">featured</span> : null}
                  {product.consumption_method ? <span className="tag">{product.consumption_method}</span> : null}
                  {product.strain_type ? <span className="tag">{product.strain_type}</span> : null}
                </div>
              </div>
            </div>

            <div role="cell" className="adminTable2__brand">
              <AdminLogoPreview src={brandLogo(product)} fallback={brandName(product) ?? '—'} />
              <span>{brandName(product) ?? '—'}</span>
            </div>

            <div role="cell">{formatZar(product.price_cents)}</div>

            <div role="cell">
              <span className={(product.stock_qty ?? 0) <= 0 ? 'pill pill--off' : 'pill pill--on'}>
                {product.stock_qty ?? 0}
              </span>
            </div>

            <div role="cell">
              <span className={product.active ? 'pill pill--on' : 'pill pill--off'}>
                {product.active ? 'Active' : 'Hidden'}
              </span>
            </div>

            <div role="cell" className="adminTable2__actions">
              <button className="chipButton" type="button" onClick={() => onStockAdjust(product)}>
                Stock
              </button>

              <button className="chipButton" type="button" onClick={() => onToggleFeatured(product)}>
                {product.featured_on_landing ? 'Unfeature' : 'Feature'}
              </button>

              <button className="chipButton" type="button" onClick={() => onToggleActive(product)}>
                {product.active ? 'Hide' : 'Activate'}
              </button>

              <button
                className="chipButton chipButton--danger"
                type="button"
                onClick={() =>
                  onConfirm({
                    title: 'Delete stock item?',
                    description: `Delete "${product.name}"? This cannot be undone.`,
                    confirmLabel: 'Delete item',
                    destructive: true,
                    onConfirm: () => onDelete(product),
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
  )
}