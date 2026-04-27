

import type { FormEvent } from 'react'

type UserRole = 'user' | 'admin'

type UserFormValues = {
  email: string
  password: string
  firstName: string
  lastName: string
  role: UserRole
  idNumber: string
}

type UserFormProps = {
  values: UserFormValues
  onChange: (values: UserFormValues) => void
  onSubmit: () => void | Promise<void>
  submitLabel?: string
  isSubmitting?: boolean
}

export function UserForm({
  values,
  onChange,
  onSubmit,
  submitLabel = 'Create user',
  isSubmitting = false,
}: UserFormProps) {
  const updateField = <Field extends keyof UserFormValues>(field: Field, value: UserFormValues[Field]) => {
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
    <form className="space-y-5" onSubmit={handleSubmit}>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500">
            First name
          </label>
          <input
            className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
            value={values.firstName}
            onChange={(event) => updateField('firstName', event.target.value)}
            placeholder="First name"
            required
          />
        </div>

        <div>
          <label className="text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500">
            Last name
          </label>
          <input
            className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
            value={values.lastName}
            onChange={(event) => updateField('lastName', event.target.value)}
            placeholder="Last name"
            required
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500">
            Email
          </label>
          <input
            className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
            value={values.email}
            onChange={(event) => updateField('email', event.target.value)}
            placeholder="customer@example.com"
            type="email"
            required
          />
        </div>

        <div>
          <label className="text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500">
            Password
          </label>
          <input
            className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
            value={values.password}
            onChange={(event) => updateField('password', event.target.value)}
            placeholder="Temporary password"
            type="password"
            required
            minLength={6}
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500">
            South African ID number
          </label>
          <input
            className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
            value={values.idNumber}
            onChange={(event) => updateField('idNumber', event.target.value.replace(/\D/g, '').slice(0, 13))}
            placeholder="YYMMDDxxxxxxx"
            inputMode="numeric"
            minLength={13}
            maxLength={13}
            required
          />
          <p className="mt-2 text-xs font-medium leading-5 text-slate-500">
            Required for 18+ validation. Only numbers are stored.
          </p>
        </div>

        <div>
          <label className="text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500">
            Role
          </label>
          <select
            className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
            value={values.role}
            onChange={(event) => updateField('role', event.target.value as UserRole)}
          >
            <option value="user">Customer</option>
            <option value="admin">Admin</option>
          </select>
          <p className="mt-2 text-xs font-medium leading-5 text-slate-500">
            Admin users can access the admin dashboard.
          </p>
        </div>
      </div>

      <button
        className="inline-flex w-full items-center justify-center rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-extrabold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        type="submit"
        disabled={isSubmitting || values.idNumber.length !== 13 || !values.email.trim() || !values.password.trim()}
      >
        {isSubmitting ? 'Creating...' : submitLabel}
      </button>
    </form>
  )
}

export type { UserFormValues, UserRole }
