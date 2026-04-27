

import { useState } from 'react'
import type { ProductDetail } from './types.ts'
import {
  addProductToCart,
  buildOrderRequestMessage,
  isProductInStock,
  productMaxQuantity,
  productIsSaved,
  saveLastOrderRequest,
  toggleProductSaved,
} from './productFormat.ts'

export function ProductActions({ product }: { product: ProductDetail }) {
  const [quantity, setQuantity] = useState(1)
  const [notice, setNotice] = useState<string | null>(null)
  const [saved, setSaved] = useState(productIsSaved(product.id))

  const inStock = isProductInStock(product)
  const maxQty = productMaxQuantity(product)

  function handleAddToCart() {
    if (!inStock) {
      setNotice('This product is currently out of stock.')
      return
    }

    addProductToCart({
      product,
      imageUrl: product.image_url,
      quantity,
    })

    setNotice(`${product.name} added to cart.`)
  }

  function handleSave() {
    const next = toggleProductSaved(product.id)
    setSaved(next)
    setNotice(next ? 'Saved to favourites.' : 'Removed from favourites.')
  }

  function handleRequest() {
    const message = buildOrderRequestMessage(product, quantity)
    saveLastOrderRequest(message)
    setNotice('Order request saved.')
  }

  return (
    <div className="mt-5 flex flex-col gap-3">
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
        <label className="block">
          <span className="mb-1 block text-[0.68rem] font-extrabold uppercase tracking-[0.14em] text-slate-400">
            Quantity
          </span>
          <div className="flex items-center overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <button
              className="h-10 w-10 text-lg font-black text-slate-500 hover:bg-slate-50"
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            >
              −
            </button>
            <input
              className="h-10 w-14 border-x border-slate-200 text-center text-sm font-black text-slate-950 outline-none"
              value={quantity}
              onChange={(e) => {
                const val = Number(e.target.value.replace(/\D/g, '')) || 1
                setQuantity(Math.min(maxQty, Math.max(1, val)))
              }}
            />
            <button
              className="h-10 w-10 text-lg font-black text-slate-500 hover:bg-slate-50"
              type="button"
              onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
            >
              +
            </button>
          </div>
        </label>

        <div className="flex flex-wrap gap-2 sm:justify-end">
          <button
            className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-950 bg-slate-950 px-5 text-sm font-extrabold text-white shadow-sm hover:bg-slate-800 disabled:opacity-50"
            onClick={handleAddToCart}
            disabled={!inStock}
          >
            Add to cart
          </button>

          <button
            className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-extrabold text-slate-700 shadow-sm hover:bg-slate-50"
            onClick={handleSave}
          >
            {saved ? 'Saved' : 'Save item'}
          </button>
        </div>
      </div>

      <button
        className="inline-flex h-11 w-full items-center justify-center rounded-2xl border border-emerald-700 bg-emerald-700 px-5 text-sm font-extrabold text-white shadow-sm hover:bg-emerald-800 disabled:opacity-50"
        onClick={handleRequest}
        disabled={!inStock}
      >
        Request order
      </button>

      {notice && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
          {notice}
        </div>
      )}
    </div>
  )
}