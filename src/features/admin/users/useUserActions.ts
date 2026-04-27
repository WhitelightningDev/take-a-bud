

import { useState } from 'react'
import type { CreatedUserCredentials, ProfileRow } from '../types'
import type { UserFormValues } from './UserForm'
import { supabase } from '../../../lib/supabaseClient'

type CreateUserPayload = {
  email: string
  password: string
  firstName: string
  lastName: string
  role: UserFormValues['role']
  idNumber: string
}

function mapFormToPayload(values: UserFormValues): CreateUserPayload {
  return {
    email: values.email.trim(),
    password: values.password,
    firstName: values.firstName.trim(),
    lastName: values.lastName.trim(),
    role: values.role,
    idNumber: values.idNumber.replace(/\D/g, '').slice(0, 13),
  }
}

export function useUserActions(initialUsers: ProfileRow[] = []) {
  const [users, setUsers] = useState<ProfileRow[]>(initialUsers)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [createdUser, setCreatedUser] = useState<CreatedUserCredentials | null>(null)

  const loadUsers = async () => {
    setIsLoading(true)

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (!error && data) {
      setUsers(data)
    }

    setIsLoading(false)
  }

  const createUser = async (values: UserFormValues) => {
    setIsSaving(true)
    setCreatedUser(null)

    const payload = mapFormToPayload(values)

    const { data, error } = await supabase.functions.invoke('create-user', {
      body: payload,
    })

    if (!error) {
      const returned = (data as { user?: Omit<CreatedUserCredentials, 'password'> } | null)?.user

      setCreatedUser({
        email: payload.email,
        password: payload.password,
        role: returned?.role ?? payload.role,
        firstName: returned?.firstName ?? payload.firstName,
        lastName: returned?.lastName ?? payload.lastName,
        shareText:
          returned?.shareText ??
          [
            'Your Take A Bud account is ready.',
            `Email: ${payload.email}`,
            `Password: ${payload.password}`,
            `ID number: ${payload.idNumber}`,
            payload.role === 'admin'
              ? 'Role: Admin (you can sign in and go straight to /admin).'
              : 'Role: User',
          ].join('\n'),
      })

      await loadUsers()
    }

    setIsSaving(false)
  }

  const clearCreatedUser = () => {
    setCreatedUser(null)
  }

  return {
    users,
    isLoading,
    isSaving,
    createdUser,
    loadUsers,
    createUser,
    clearCreatedUser,
  }
}
