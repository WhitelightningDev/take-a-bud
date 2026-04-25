import type { Session, User } from '@supabase/supabase-js'
import { createContext } from 'react'

export type Profile = {
  id: string
  email?: string | null
  full_name: string | null
  first_name: string | null
  last_name: string | null
  id_number: string | null
  address: string | null
  accepted_regulations: boolean
  accepted_regulations_at: string | null
  is_admin: boolean
}

export type AuthContextValue = {
  loading: boolean
  session: Session | null
  user: User | null
  profile: Profile | null
  refreshProfile: () => Promise<void>
  signIn: (args: { email: string; password: string }) => Promise<void>
  signUp: (args: {
    email: string
    password: string
    firstName: string
    lastName: string
    idNumber: string
    address: string
    acceptedRegulations: true
  }) => Promise<void>
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
