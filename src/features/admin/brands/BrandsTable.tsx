import type { Brand } from '../types'
import { AdminLogoPreview } from '../components/AdminLogoPreview'

type BrandsTableProps = {
  brands: Brand[]
  isLoading?: boolean
  onEdit: (brand: Brand) => void
  onDelete?: (brand: Brand) => void
}

export function BrandsTable({ brands, isLoading = false, onEdit, onDelete }: BrandsTableProps) {
  if (isLoading) {
    return (
      <div className="p-8 text-center text-sm font-bold text-slate-500">
        Loading brands...
      </div>
    )
  }

  if (brands.length === 0) {
    return (
      <div className="p-8 text-center">
        <p className="text-sm font-black text-slate-800">No brands found</p>
        <p className="mt-1 text-sm font-medium text-slate-500">
          Add your first brand or adjust your search term.
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-100">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-5 py-3 text-left text-[0.68rem] font-extrabold uppercase tracking-[0.14em] text-slate-400">
              Brand
            </th>
            <th className="px-5 py-3 text-left text-[0.68rem] font-extrabold uppercase tracking-[0.14em] text-slate-400">
              Logo URL
            </th>
            <th className="px-5 py-3 text-right text-[0.68rem] font-extrabold uppercase tracking-[0.14em] text-slate-400">
              Actions
            </th>
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-100 bg-white">
          {brands.map((brand) => (
            <tr key={brand.id} className="transition hover:bg-slate-50/80">
              <td className="px-5 py-4">
                <div className="flex items-center gap-3">
                  <AdminLogoPreview src={brand.logo_url} fallback={brand.name} />
                  <div>
                    <p className="text-sm font-black text-slate-900">{brand.name}</p>
                    <p className="mt-0.5 text-xs font-semibold text-slate-400">ID: {brand.id}</p>
                  </div>
                </div>
              </td>

              <td className="max-w-md px-5 py-4">
                {brand.logo_url ? (
                  <p className="truncate text-sm font-semibold text-slate-600">{brand.logo_url}</p>
                ) : (
                  <p className="text-sm font-semibold text-slate-400">No logo added</p>
                )}
              </td>

              <td className="px-5 py-4">
                <div className="flex justify-end gap-2">
                  <button
                    className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-extrabold uppercase tracking-[0.12em] text-slate-600 transition hover:bg-slate-50"
                    type="button"
                    onClick={() => onEdit(brand)}
                  >
                    Edit
                  </button>

                  {onDelete && (
                    <button
                      className="rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-extrabold uppercase tracking-[0.12em] text-red-700 transition hover:bg-red-100"
                      type="button"
                      onClick={() => onDelete(brand)}
                    >
                      Delete
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
