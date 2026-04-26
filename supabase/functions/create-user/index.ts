import { createClient } from "@supabase/supabase-js/dist/index.cjs"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, accept, origin, referer',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

type CreateUserPayload = {
  email?: string
  password?: string
  firstName?: string
  lastName?: string
  idNumber?: string
  address?: string
  role?: 'admin' | 'user'
}

function normalizeZaId(value: string) {
  return value.replace(/\D/g, '')
}

function isValidZaIdBirthDate(idNumber: string) {
  if (!/^\d{13}$/.test(idNumber)) return false

  const yy = Number(idNumber.slice(0, 2))
  const mm = Number(idNumber.slice(2, 4))
  const dd = Number(idNumber.slice(4, 6))
  const currentYear = new Date().getFullYear()
  const currentCentury = Math.floor(currentYear / 100) * 100
  const currentYY = currentYear % 100
  const fullYear = yy <= currentYY ? currentCentury + yy : currentCentury - 100 + yy
  const birthDate = new Date(Date.UTC(fullYear, mm - 1, dd))

  return (
    birthDate.getUTCFullYear() === fullYear &&
    birthDate.getUTCMonth() === mm - 1 &&
    birthDate.getUTCDate() === dd
  )
}

function isZaId18Plus(idNumber: string) {
  if (!isValidZaIdBirthDate(idNumber)) return false

  const yy = Number(idNumber.slice(0, 2))
  const mm = Number(idNumber.slice(2, 4))
  const dd = Number(idNumber.slice(4, 6))
  const today = new Date()
  const currentYear = today.getFullYear()
  const currentCentury = Math.floor(currentYear / 100) * 100
  const currentYY = currentYear % 100
  const fullYear = yy <= currentYY ? currentCentury + yy : currentCentury - 100 + yy
  const eighteenthBirthday = new Date(fullYear + 18, mm - 1, dd)

  return today >= eighteenthBirthday
}

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  })
}

async function findUserByEmail(
  admin: ReturnType<typeof createClient>['auth']['admin'],
  email: string,
) {
  let page = 1
  const perPage = 200

  while (page <= 20) {
    const { data, error } = await admin.listUsers({ page, perPage })
    if (error) throw error

    const users = data?.users ?? []
    const existing = users.find((user) => (user.email ?? '').toLowerCase() === email)
    if (existing) return existing
    if (users.length < perPage) break
    page += 1
  }

  return null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    })
  }
  try {
    if (req.method !== 'POST') {
      return json(405, { error: 'Method not allowed' })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
      return json(500, { error: 'Supabase function secrets are not configured.' })
    }

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return json(401, { error: 'Missing authorization header.' })
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser()

    if (authError || !user) {
      return json(401, { error: 'You must be signed in to create users.' })
    }

    const { data: profile, error: profileError } = await userClient
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .maybeSingle()

    if (profileError) {
      return json(500, { error: profileError.message })
    }

    if (!profile?.is_admin) {
      return json(403, { error: 'Only admins can create users.' })
    }

    let payload: CreateUserPayload
    try {
      payload = (await req.json()) as CreateUserPayload
    } catch {
      return json(400, { error: 'Invalid JSON body.' })
    }

    const email = payload.email?.trim().toLowerCase() ?? ''
    const password = payload.password?.trim() ?? ''
    const firstName = payload.firstName?.trim() ?? ''
    const lastName = payload.lastName?.trim() ?? ''
    const role = payload.role === 'admin' ? 'admin' : 'user'
    const idNumber = normalizeZaId(payload.idNumber?.trim() ?? '')
    const address = payload.address?.trim() || null

    if (!email) return json(400, { error: 'Email is required.' })
    if (!password || password.length < 8) {
      return json(400, { error: 'Password must be at least 8 characters.' })
    }
    if (!idNumber) return json(400, { error: 'South African ID number is required.' })
    if (!/^\d{13}$/.test(idNumber)) {
      return json(400, { error: 'South African ID number must be 13 digits.' })
    }
    if (!isValidZaIdBirthDate(idNumber)) {
      return json(400, { error: 'South African ID number has an invalid birth date.' })
    }
    if (!isZaId18Plus(idNumber)) {
      return json(400, { error: 'User must be 18+ to use Take A Bud.' })
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const existing = await findUserByEmail(adminClient.auth.admin, email)
    if (existing) {
      return json(409, { error: 'A user with that email already exists.' })
    }

    const metadata = {
      full_name: `${firstName} ${lastName}`.trim(),
      first_name: firstName || null,
      last_name: lastName || null,
    }

    const { data: created, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: metadata,
    })

    if (createError || !created.user) {
      return json(400, { error: createError?.message ?? 'Failed to create user.' })
    }

    const { error: upsertError } = await adminClient.from('profiles').upsert(
      {
        id: created.user.id,
        email,
        full_name: metadata.full_name || null,
        first_name: metadata.first_name,
        last_name: metadata.last_name,
        id_number: idNumber,
        address,
        accepted_regulations: true,
        accepted_regulations_at: new Date().toISOString(),
        is_admin: role === 'admin',
      },
      { onConflict: 'id' },
    )

    if (upsertError) {
      await adminClient.auth.admin.deleteUser(created.user.id)
      return json(500, { error: upsertError.message })
    }

    return json(200, {
      user: {
        id: created.user.id,
        email,
        firstName,
        lastName,
        role,
        shareText: [
          'Your Take A Bud account is ready.',
          `Email: ${email}`,
          `Password: ${password}`,
          `ID number: ${idNumber}`,
          role === 'admin'
            ? 'Role: Admin (you can sign in and go straight to /admin).'
            : 'Role: User',
        ].join('\n'),
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected create-user function error.'
    return json(500, { error: message })
  }
})
