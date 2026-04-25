import { createClient } from '@supabase/supabase-js'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import readline from 'node:readline'

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return
  const text = fs.readFileSync(filePath, 'utf8')
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const idx = line.indexOf('=')
    if (idx === -1) continue
    const key = line.slice(0, idx).trim()
    let value = line.slice(idx + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (process.env[key] === undefined) {
      process.env[key] = value
    }
  }
}

function getArg(name) {
  const idx = process.argv.indexOf(name)
  if (idx === -1) return undefined
  return process.argv[idx + 1]
}

function hasFlag(name) {
  return process.argv.includes(name)
}

async function prompt(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  return await new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close()
      resolve(answer)
    })
  })
}

async function promptHidden(question) {
  if (!process.stdin.isTTY) return await prompt(question)
  process.stdout.write(question)
  process.stdin.setRawMode(true)
  process.stdin.resume()
  process.stdin.setEncoding('utf8')

  let value = ''
  return await new Promise((resolve) => {
    function onData(ch) {
      if (ch === '\r' || ch === '\n') {
        process.stdout.write('\n')
        process.stdin.setRawMode(false)
        process.stdin.pause()
        process.stdin.off('data', onData)
        resolve(value)
        return
      }
      if (ch === '\u0003') {
        process.stdout.write('\n')
        process.exit(1)
      }
      if (ch === '\u007f') {
        value = value.slice(0, -1)
        return
      }
      value += ch
    }
    process.stdin.on('data', onData)
  })
}

async function findUserByEmail(admin, email) {
  // Supabase doesn’t provide a direct get-by-email. We scan pages (enough for typical dev projects).
  let page = 1
  const perPage = 200
  while (page < 20) {
    const { data, error } = await admin.listUsers({ page, perPage })
    if (error) throw error
    const users = data?.users ?? []
    const user = users.find((u) => (u.email ?? '').toLowerCase() === email.toLowerCase())
    if (user) return user
    if (users.length < perPage) break
    page += 1
  }
  return null
}

function requireEnv(name) {
  const v = process.env[name]
  if (!v) throw new Error(`Missing env var: ${name}`)
  return v
}

async function main() {
  const repoRoot = process.cwd()
  parseEnvFile(path.join(repoRoot, '.env.local'))
  parseEnvFile(path.join(repoRoot, '.env'))

  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL
  if (!supabaseUrl) {
    throw new Error('Missing SUPABASE_URL or VITE_SUPABASE_URL in your env.')
  }

  const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY')

  const shouldGenerate = hasFlag('--generate') || process.env.ADMIN_SEED_GENERATE === '1'
  const shouldPrint = hasFlag('--print')

  let email = getArg('--email') ?? process.env.ADMIN_SEED_EMAIL
  let password = getArg('--password') ?? process.env.ADMIN_SEED_PASSWORD
  let generatedPassword = false

  if (!email) {
    email = shouldGenerate ? 'admin@takeabud.local' : String(await prompt('Admin email: ')).trim()
  }
  if (!password) {
    if (shouldGenerate) {
      password = crypto.randomBytes(18).toString('base64url')
      generatedPassword = true
    } else {
      password = String(await promptHidden('Admin password: ')).trim()
    }
  }

  if (!email || !password) {
    throw new Error('Email and password are required.')
  }

  const client = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const metadata = {
    accepted_regulations: true,
    accepted_regulations_at: new Date().toISOString(),
  }

  const admin = client.auth.admin
  const existing = await findUserByEmail(admin, email)

  let user = existing
  if (!user) {
    const { data, error } = await admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: metadata,
    })
    if (error) throw error
    user = data.user
  } else {
    const { data, error } = await admin.updateUserById(user.id, {
      password,
      email_confirm: true,
      user_metadata: { ...(user.user_metadata ?? {}), ...metadata },
    })
    if (error) throw error
    user = data.user
  }

  const { error: profileError } = await client
    .from('profiles')
    .upsert(
      {
        id: user.id,
        is_admin: true,
        accepted_regulations: true,
        accepted_regulations_at: new Date().toISOString(),
      },
      { onConflict: 'id' },
    )

  if (profileError) throw profileError

  process.stdout.write(`\n✅ Admin user ready: ${email}\n`)
  if (generatedPassword || shouldPrint) {
    process.stdout.write(`Password: ${password}\n`)
  }
  process.stdout.write('You can now log in and visit /admin.\n')
}

main().catch((err) => {
  process.stderr.write(`\n❌ seed-admin failed: ${err instanceof Error ? err.message : String(err)}\n`)
  process.stderr.write(
    'Tip: set SUPABASE_SERVICE_ROLE_KEY in .env.local (never commit it), then rerun.\n',
  )
  process.exit(1)
})
