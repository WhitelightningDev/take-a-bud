

import type { FormEvent } from 'react'
import type { Brand } from '../types'

type BrandFormValues = Pick<Brand, 'name' | 'logo_url'>

type BrandFormProps = {
  values: BrandFormValues
  onChange: (values: BrandFormValues) => void
  onSubmit: () => void | Promise<void>
  submitLabel?: string
  isSubmitting?: boolean
}

export function BrandForm({
  values,
  onChange,
  onSubmit,
  submitLabel = 'Save brand',
  isSubmitting = false,
}: BrandFormProps) {
  const updateField = (field: keyof BrandFormValues, value: string) => {
    onChange({
      ...values,
      [field]: value,
    })
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    await onSubmit()
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div>
        <label className="text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500">
          Brand name
        </label>
        <input
          className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
          value={values.name}
          onChange={(event) => updateField('name', event.target.value)}
          placeholder="e.g. Lifted, Cheech & Chong"
          required
        />
      </div>

      <div>
        <label className="text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500">
          Logo URL
        </label>
        <input
          className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
          value={values.logo_url ?? ''}
          onChange={(event) => updateField('logo_url', event.target.value)}
          placeholder="https://example.com/logo.png"
          type="url"
        />
        <p className="mt-2 text-xs font-medium leading-5 text-slate-500">
          Optional. Leave this empty if the brand does not have a logo yet.
        </p>
      </div>

      <button
        className="inline-flex w-full items-center justify-center rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-extrabold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        type="submit"
        disabled={isSubmitting || !values.name.trim()}
      >
        {isSubmitting ? 'Saving...' : submitLabel}
      </button>
    </form>
  )
}

export type { BrandFormValues }