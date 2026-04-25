import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getSupabaseConfig } from './env.ts'

let client: SupabaseClient | null = null

function getClient(): SupabaseClient {
  const config = getSupabaseConfig()
  if (!config) {
    throw new Error(
      'Supabase is not configured. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env.local` (or `VITE_SUPABASE_PUBLISHABLE_KEY` as a fallback).',
    )
  }

  if (!client) {
    client = createClient(config.url, config.anonKey)
  }

  return client
}

export function isSupabaseConfigured() {
  return getSupabaseConfig() !== null
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const c = getClient()
    const value = (c as unknown as Record<PropertyKey, unknown>)[prop] as unknown
    return typeof value === 'function'
      ? (value as (...args: unknown[]) => unknown).bind(c)
      : value
  },
})
