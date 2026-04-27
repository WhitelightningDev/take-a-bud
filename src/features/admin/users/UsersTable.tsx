

import type { ProfileRow } from '../types'

type UsersTableProps = {
  users: ProfileRow[]
  isLoading?: boolean
  onViewProfile: (user: ProfileRow) => void
}

function formatName(user: ProfileRow) {
  const first = user.first_name ?? ''
  const last = user.last_name ?? ''
  const full = `${first} ${last}`.trim()
  return full || 'No name'
}

export function UsersTable({ users, isLoading = false, onViewProfile }: UsersTableProps) {
  if (isLoading) {
    return (
      <div className="p-8 text-center text-sm font-bold text-slate-500">
        Loading users...
      </div>
    )
  }

  if (users.length === 0) {
    return (
      <div className="p-8 text-center">
        <p className="text-sm font-black text-slate-800">No users found</p>
        <p className="mt-1 text-sm font-medium text-slate-500">
          Create your first user or adjust your search term.
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
              User
            </th>
            <th className="px-5 py-3 text-left text-[0.68rem] font-extrabold uppercase tracking-[0.14em] text-slate-400">
              Email
            </th>
            <th className="px-5 py-3 text-left text-[0.68rem] font-extrabold uppercase tracking-[0.14em] text-slate-400">
              Role
            </th>
            <th className="px-5 py-3 text-right text-[0.68rem] font-extrabold uppercase tracking-[0.14em] text-slate-400">
              Actions
            </th>
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-100 bg-white">
          {users.map((user) => (
            <tr key={user.id} className="transition hover:bg-slate-50/80">
              <td className="px-5 py-4">
                <div>
                  <p className="text-sm font-black text-slate-900">{formatName(user)}</p>
                  <p className="mt-0.5 text-xs font-semibold text-slate-400">ID: {user.id}</p>
                </div>
              </td>

              <td className="px-5 py-4">
                <p className="text-sm font-semibold text-slate-600">
                  {user.email || 'No email'}
                </p>
              </td>

              <td className="px-5 py-4">
                <span
                  className={`inline-flex rounded-full border px-2.5 py-1 text-[0.68rem] font-extrabold uppercase tracking-[0.14em] ${
                    user.is_admin
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                      : 'border-slate-200 bg-white text-slate-600'
                  }`}
                >
                  {user.is_admin ? 'admin' : 'user'}
                </span>
              </td>

              <td className="px-5 py-4">
                <div className="flex justify-end">
                  <button
                    className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-extrabold uppercase tracking-[0.12em] text-slate-600 transition hover:bg-slate-50"
                    type="button"
                    onClick={() => onViewProfile(user)}
                  >
                    View
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
