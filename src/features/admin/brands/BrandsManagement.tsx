

import { useMemo, useState } from 'react'
import type { Brand } from '../types'
import { AdminLogoPreview } from '../components/AdminLogoPreview'
import { BrandForm, type BrandFormValues } from './BrandForm'

type BrandsManagementProps = {
  brands: Brand[]
  isLoading?: boolean
  isSaving?: boolean
  onCreateBrand: (values: BrandFormValues) => void | Promise<void>
  onUpdateBrand: (brandId: string, values: BrandFormValues) => void | Promise<void>
  onDeleteBrand?: (brand: Brand) => void | Promise<void>
}

const EMPTY_BRAND_FORM: BrandFormValues = {
  name: '',
  logo_url: '',
}

function normaliseBrandValues(values: BrandFormValues): BrandFormValues {
  return {
    name: values.name.trim(),
    logo_url: values.logo_url?.trim() || null,
  }
}

export function BrandsManagement({
  brands,
  isLoading = false,
  isSaving = false,
  onCreateBrand,
  onUpdateBrand,
  onDeleteBrand,
}: BrandsManagementProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null)
  const [createValues, setCreateValues] = useState<BrandFormValues>(EMPTY_BRAND_FORM)
  const [editValues, setEditValues] = useState<BrandFormValues>(EMPTY_BRAND_FORM)

  const filteredBrands = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()

    if (!query) return brands

    return brands.filter((brand) => brand.name.toLowerCase().includes(query))
  }, [brands, searchTerm])

  const openCreate = () => {
    setCreateValues(EMPTY_BRAND_FORM)
    setIsCreateOpen(true)
  }

  const closeCreate = () => {
    setIsCreateOpen(false)
    setCreateValues(EMPTY_BRAND_FORM)
  }

  const openEdit = (brand: Brand) => {
    setEditingBrand(brand)
    setEditValues({
      name: brand.name,
      logo_url: brand.logo_url ?? '',
    })
  }

  const closeEdit = () => {
    setEditingBrand(null)
    setEditValues(EMPTY_BRAND_FORM)
  }

  const handleCreateBrand = async () => {
    await onCreateBrand(normaliseBrandValues(createValues))
    closeCreate()
  }

  const handleUpdateBrand = async () => {
    if (!editingBrand) return

    await onUpdateBrand(editingBrand.id, normaliseBrandValues(editValues))
    closeEdit()
  }

  return (
    <section className="space-y-5">
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-emerald-700">
              Brand management
            </p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">
              Product brands
            </h2>
            <p className="mt-1 max-w-2xl text-sm font-medium leading-6 text-slate-500">
              Manage brand names and logo assets used across the admin catalog and public product pages.
            </p>
          </div>

          <button
            className="inline-flex items-center justify-center rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-extrabold text-white shadow-sm transition hover:bg-emerald-700"
            type="button"
            onClick={openCreate}
          >
            Add brand
          </button>
        </div>

        <div className="mt-5">
          <label className="text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500">
            Search brands
          </label>
          <input
            className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-100"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search by brand name..."
          />
        </div>
      </div>

      {isCreateOpen && (
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-black text-slate-950">Add new brand</h3>
              <p className="mt-1 text-sm font-medium text-slate-500">
                Create a reusable brand record for catalog products.
              </p>
            </div>
            <button
              className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-extrabold uppercase tracking-[0.12em] text-slate-500 transition hover:bg-slate-50"
              type="button"
              onClick={closeCreate}
            >
              Close
            </button>
          </div>

          <BrandForm
            values={createValues}
            onChange={setCreateValues}
            onSubmit={handleCreateBrand}
            submitLabel="Create brand"
            isSubmitting={isSaving}
          />
        </div>
      )}

      {editingBrand && (
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-black text-slate-950">Edit brand</h3>
              <p className="mt-1 text-sm font-medium text-slate-500">
                Update the brand details used by linked products.
              </p>
            </div>
            <button
              className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-extrabold uppercase tracking-[0.12em] text-slate-500 transition hover:bg-slate-50"
              type="button"
              onClick={closeEdit}
            >
              Close
            </button>
          </div>

          <BrandForm
            values={editValues}
            onChange={setEditValues}
            onSubmit={handleUpdateBrand}
            submitLabel="Update brand"
            isSubmitting={isSaving}
          />
        </div>
      )}

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-4">
          <div>
            <h3 className="text-sm font-black uppercase tracking-[0.14em] text-slate-600">
              Brands
            </h3>
            <p className="mt-1 text-xs font-semibold text-slate-400">
              {filteredBrands.length} of {brands.length} shown
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-sm font-bold text-slate-500">Loading brands...</div>
        ) : filteredBrands.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm font-black text-slate-800">No brands found</p>
            <p className="mt-1 text-sm font-medium text-slate-500">
              Add your first brand or adjust your search term.
            </p>
          </div>
        ) : (
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
                {filteredBrands.map((brand) => (
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
                          onClick={() => openEdit(brand)}
                        >
                          Edit
                        </button>
                        {onDeleteBrand && (
                          <button
                            className="rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-extrabold uppercase tracking-[0.12em] text-red-700 transition hover:bg-red-100"
                            type="button"
                            onClick={() => onDeleteBrand(brand)}
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
        )}
      </div>
    </section>
  )
}
