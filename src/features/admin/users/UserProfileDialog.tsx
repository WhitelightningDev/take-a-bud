

import type { ProfileRow } from '../types'

type UserProfileDialogProps = {
  user: ProfileRow
  onClose: () => void
}

function formatValue(value: string | number | boolean | null | undefined) {
  if (value === null || value === undefined || value === '') return 'Not provided'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  return String(value)
}

function DetailItem({ label, value }: { label: string; value: string | number | boolean | null | undefined }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-[0.68rem] font-extrabold uppercase tracking-[0.14em] text-slate-400">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-bold text-slate-800">{formatValue(value)}</p>
    </div>
  )
}

export function UserProfileDialog({ user, onClose }: UserProfileDialogProps) {
  const fullName = `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim() || 'No name'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-5">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-emerald-700">
              User profile
            </p>
            <h3 className="mt-2 text-2xl font-black tracking-tight text-slate-950">{fullName}</h3>
            <p className="mt-1 text-sm font-semibold text-slate-500">{formatValue(user.email)}</p>
          </div>

          <button
            className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-extrabold uppercase tracking-[0.12em] text-slate-500 transition hover:bg-slate-50"
            type="button"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        <div className="max-h-[calc(90vh-110px)] overflow-y-auto p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <DetailItem label="First name" value={user.first_name} />
            <DetailItem label="Last name" value={user.last_name} />
            <DetailItem label="Email" value={user.email} />
            <DetailItem label="South African ID" value={user.id_number} />
            <DetailItem label="Address" value={user.address} />
            <DetailItem label="Accepted regulations" value={user.accepted_regulations} />
            <DetailItem label="Accepted regulations at" value={user.accepted_regulations_at} />
            <DetailItem label="Admin access" value={user.is_admin} />
            <DetailItem label="Created at" value={user.created_at} />
          </div>
        </div>
      </div>
    </div>
  )
}
