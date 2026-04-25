import { useCallback, useEffect, useMemo, useState } from 'react'
import { isSupabaseConfigured, supabase } from '../lib/supabaseClient.ts'
import { AuthContext, type Profile, type AuthContextValue } from './authContext.ts'
import type { User } from '@supabase/supabase-js'

function isMissingRelationError(message?: string): boolean {
  if (!message) return false
  return (
    message.includes('relation "profiles" does not exist') ||
    message.includes('Could not find the table') ||
    message.includes('schema cache') ||
    message.includes('column "first_name" does not exist') ||
    message.includes('column profiles.first_name does not exist') ||
    message.includes('column "last_name" does not exist') ||
    message.includes('column profiles.last_name does not exist') ||
    message.includes('column "id_number" does not exist') ||
    message.includes('column profiles.id_number does not exist') ||
    message.includes('column "address" does not exist') ||
    message.includes('column profiles.address does not exist') ||
    message.includes('column "accepted_regulations" does not exist') ||
    message.includes('column profiles.accepted_regulations does not exist') ||
    message.includes('column "accepted_regulations_at" does not exist') ||
    message.includes('column profiles.accepted_regulations_at does not exist')
  )
}

function normalizeProfile(row: Partial<Profile> | null): Profile | null {
  if (!row?.id) return null
  return {
    id: row.id,
    email: row.email ?? null,
    full_name: row.full_name ?? null,
    first_name: row.first_name ?? null,
    last_name: row.last_name ?? null,
    id_number: row.id_number ?? null,
    address: row.address ?? null,
    accepted_regulations: row.accepted_regulations ?? false,
    accepted_regulations_at: row.accepted_regulations_at ?? null,
    is_admin: row.is_admin ?? false,
  }
}

function metaString(meta: Record<string, unknown>, key: string): string | null {
  const value = meta[key]
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

function metaBoolean(meta: Record<string, unknown>, key: string): boolean | null {
  const value = meta[key]
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') {
    if (value.toLowerCase() === 'true') return true
    if (value.toLowerCase() === 'false') return false
  }
  return null
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState<AuthContextValue['session']>(null)
  const [user, setUser] = useState<AuthContextValue['user']>(null)
  const [profile, setProfile] = useState<Profile | null>(null)

  const ensureProfileFromUser = useCallback(async (nextUser: User) => {
    if (!isSupabaseConfigured()) return

    const meta = (nextUser.user_metadata ?? {}) as Record<string, unknown>
    const firstName = metaString(meta, 'first_name')
    const lastName = metaString(meta, 'last_name')
    const fullName =
      (metaString(meta, 'full_name') ??
        `${firstName ?? ''} ${lastName ?? ''}`.trim()) ||
      null
    const idNumber = metaString(meta, 'id_number')
    const address = metaString(meta, 'address')
    const accepted = metaBoolean(meta, 'accepted_regulations')
    const acceptedAt = metaString(meta, 'accepted_regulations_at')

    const payload: Record<string, unknown> = { id: nextUser.id }
    if (typeof nextUser.email === 'string' && nextUser.email.trim()) payload.email = nextUser.email
    if (fullName) payload.full_name = fullName
    if (firstName) payload.first_name = firstName
    if (lastName) payload.last_name = lastName
    if (idNumber) payload.id_number = idNumber
    if (address) payload.address = address
    if (accepted !== null) payload.accepted_regulations = accepted
    if (acceptedAt) payload.accepted_regulations_at = acceptedAt

    // If we only have an id, don't write.
    if (Object.keys(payload).length <= 1) return

    const { error } = await supabase.from('profiles').upsert(payload, { onConflict: 'id' })
    if (error && !isMissingRelationError(error.message)) {
      console.error(error)
    }
  }, [])

  const fetchProfile = useCallback(async (uid: string) => {
    if (!isSupabaseConfigured()) return
    let { data, error } = await supabase
      .from('profiles')
      .select(
        'id, email, full_name, first_name, last_name, id_number, address, accepted_regulations, accepted_regulations_at, is_admin',
      )
      .eq('id', uid)
      .maybeSingle()

    if (error && error.message.includes('column')) {
      ;({ data, error } = await supabase
        .from('profiles')
        .select('id, full_name, is_admin')
        .eq('id', uid)
        .maybeSingle())
    }

    if (error) {
      if (!isMissingRelationError(error.message)) {
        console.error(error)
      }
      setProfile(null)
      return
    }

    setProfile(normalizeProfile((data ?? null) as Partial<Profile> | null))
  }, [])

  useEffect(() => {
    let cancelled = false

    async function init() {
      if (!isSupabaseConfigured()) {
        setLoading(false)
        return
      }

      try {
        const { data, error } = await supabase.auth.getSession()
        if (cancelled) return
        if (error) console.error(error)
        const nextSession = data.session ?? null
        setSession(nextSession)
        setUser(nextSession?.user ?? null)
        if (!nextSession?.user) {
          setProfile(null)
        } else {
          await ensureProfileFromUser(nextSession.user)
          await fetchProfile(nextSession.user.id)
        }
      } catch (e) {
        console.error(e)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    init()

    if (!isSupabaseConfigured()) {
      return () => {
        cancelled = true
      }
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setUser(nextSession?.user ?? null)
      if (!nextSession?.user) {
        setProfile(null)
      } else {
        ;(async () => {
          await ensureProfileFromUser(nextSession.user)
          await fetchProfile(nextSession.user.id)
        })().catch((e) => console.error(e))
      }
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [ensureProfileFromUser, fetchProfile])

  const value = useMemo<AuthContextValue>(
    () => ({
      loading,
      session,
      user,
      profile,
      async refreshProfile() {
        if (!user?.id) return
        await fetchProfile(user.id)
      },
      async signIn({ email, password }) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
      },
      async signUp({
        email,
        password,
        firstName,
        lastName,
        idNumber,
        address,
        acceptedRegulations,
      }) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: `${firstName} ${lastName}`.trim(),
              first_name: firstName,
              last_name: lastName,
              id_number: idNumber,
              address,
              accepted_regulations: acceptedRegulations,
              accepted_regulations_at: new Date().toISOString(),
            },
          },
        })
        if (error) throw error
      },
      async signOut() {
        const { error } = await supabase.auth.signOut()
        if (error) throw error
      },
    }),
    [loading, session, user, profile, fetchProfile],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
