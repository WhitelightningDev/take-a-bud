import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

type CreateUserPayload = {
  email?: string
  password?: string
  firstName?: string
  lastName?: string
  role?: 'admin' | 'user'
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
    return new Response('ok', { headers: corsHeaders })
  }

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

  if (!email) return json(400, { error: 'Email is required.' })
  if (!password || password.length < 8) {
    return json(400, { error: 'Password must be at least 8 characters.' })
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
      is_admin: role === 'admin',
    },
    { onConflict: 'id' },
  )

  if (upsertError) {
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
        role === 'admin'
          ? 'Role: Admin (you can sign in and go straight to /admin).'
          : 'Role: User',
      ].join('\n'),
    },
  })
})
