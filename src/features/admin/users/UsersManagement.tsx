

import { useMemo, useState } from 'react'
import type { CreatedUserCredentials, ProfileRow } from '../types'
import { UserForm, type UserFormValues } from './UserForm'
import { UserProfileDialog } from './UserProfileDialog'
import { UsersTable } from './UsersTable'

type UsersManagementProps = {
  users: ProfileRow[]
  isLoading?: boolean
  isSaving?: boolean
  createdUser?: CreatedUserCredentials | null
  onCreateUser: (values: UserFormValues) => void | Promise<void>
  onClearCreatedUser?: () => void
}

const EMPTY_USER_FORM: UserFormValues = {
  email: '',
  password: '',
  firstName: '',
  lastName: '',
  role: 'user',
  idNumber: '',
}

export function UsersManagement({
  users,
  isLoading = false,
  isSaving = false,
  createdUser = null,
  onCreateUser,
  onClearCreatedUser,
}: UsersManagementProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<ProfileRow | null>(null)
  const [formValues, setFormValues] = useState<UserFormValues>(EMPTY_USER_FORM)

  const filteredUsers = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()

    if (!query) return users

    return users.filter((user) => {
      const fullName = `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim().toLowerCase()
      const email = user.email?.toLowerCase() ?? ''
      const role = user.is_admin ? 'admin' : 'user'

      return fullName.includes(query) || email.includes(query) || role.includes(query)
    })
  }, [users, searchTerm])

  const openCreate = () => {
    setFormValues(EMPTY_USER_FORM)
    setIsCreateOpen(true)
  }

  const closeCreate = () => {
    setFormValues(EMPTY_USER_FORM)
    setIsCreateOpen(false)
  }

  const handleCreateUser = async () => {
    await onCreateUser({
      ...formValues,
      email: formValues.email.trim(),
      firstName: formValues.firstName.trim(),
      lastName: formValues.lastName.trim(),
      idNumber: formValues.idNumber.trim(),
    })
    closeCreate()
  }

  return (
    <section className="space-y-5">
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-emerald-700">
              User management
            </p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">
              Customers and admins
            </h2>
            <p className="mt-1 max-w-2xl text-sm font-medium leading-6 text-slate-500">
              Create users, review customer profile details, and manage admin/customer access from one place.
            </p>
          </div>

          <button
            className="inline-flex items-center justify-center rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-extrabold text-white shadow-sm transition hover:bg-emerald-700"
            type="button"
            onClick={openCreate}
          >
            Add user
          </button>
        </div>

        <div className="mt-5">
          <label className="text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500">
            Search users
          </label>
          <input
            className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-100"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search by name, email, or role..."
          />
        </div>
      </div>

      {isCreateOpen && (
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-black text-slate-950">Add new user</h3>
              <p className="mt-1 text-sm font-medium text-slate-500">
                Create a customer or admin account. South African ID number is required for age validation.
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

          <UserForm
            values={formValues}
            onChange={setFormValues}
            onSubmit={handleCreateUser}
            isSubmitting={isSaving}
          />
        </div>
      )}

      {createdUser && (
        <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-emerald-700">
                User created
              </p>
              <h3 className="mt-2 text-lg font-black text-slate-950">
                Temporary credentials generated
              </h3>
              <div className="mt-3 rounded-2xl border border-emerald-200 bg-white p-4 text-sm font-semibold text-slate-700">
                <p>Email: {createdUser.email}</p>
                <p className="mt-1">Password: {createdUser.password}</p>
              </div>
              <p className="mt-2 text-xs font-semibold text-emerald-700">
                Share these securely. Do not leave generated passwords visible longer than needed.
              </p>
            </div>

            {onClearCreatedUser && (
              <button
                className="rounded-full border border-emerald-200 bg-white px-3 py-1.5 text-xs font-extrabold uppercase tracking-[0.12em] text-emerald-700 transition hover:bg-emerald-100"
                type="button"
                onClick={onClearCreatedUser}
              >
                Dismiss
              </button>
            )}
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-4">
          <div>
            <h3 className="text-sm font-black uppercase tracking-[0.14em] text-slate-600">
              Users
            </h3>
            <p className="mt-1 text-xs font-semibold text-slate-400">
              {filteredUsers.length} of {users.length} shown
            </p>
          </div>
        </div>

        <UsersTable
          users={filteredUsers}
          isLoading={isLoading}
          onViewProfile={setSelectedUser}
        />
      </div>

      {selectedUser && (
        <UserProfileDialog user={selectedUser} onClose={() => setSelectedUser(null)} />
      )}
    </section>
  )
}
