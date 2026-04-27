
import { useMemo, useState } from 'react'
import { AppHeader } from '../components/AppHeader.tsx'
import { supabase } from '../lib/supabaseClient.ts'
import { useAuth } from '../auth/useAuth.ts'
import { assertZaIdIs18Plus, isZaId18Plus } from '../lib/zaId.ts'

type ProfileFormValues = {
  firstName: string
  lastName: string
  idNumber: string
  address: string
  acceptedRegulations: boolean
}

function displayName(profile: ReturnType<typeof useAuth>['profile'], fallbackEmail?: string | null) {
  const name = profile?.full_name || `${profile?.first_name ?? ''} ${profile?.last_name ?? ''}`.trim()
  return name || fallbackEmail || 'Customer'
}

function initials(value: string) {
  return value
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'U'
}

function completionScore(values: {
  firstName?: string | null
  lastName?: string | null
  idNumber?: string | null
  address?: string | null
  acceptedRegulations?: boolean | null
}) {
  const checks = [
    Boolean(values.firstName),
    Boolean(values.lastName),
    isZaId18Plus(values.idNumber ?? ''),
    Boolean(values.address),
    Boolean(values.acceptedRegulations),
  ]
  return Math.round((checks.filter(Boolean).length / checks.length) * 100)
}

function AccountBadge({ children, tone = 'neutral' }: { children: string; tone?: 'neutral' | 'success' | 'warn' }) {
  const toneClass =
    tone === 'success'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : tone === 'warn'
        ? 'border-amber-200 bg-amber-50 text-amber-700'
        : 'border-slate-200 bg-white text-slate-600'

  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-[0.68rem] font-extrabold uppercase tracking-[0.14em] ${toneClass}`}>
      {children}
    </span>
  )
}

function AccountStat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-[0.68rem] font-extrabold uppercase tracking-[0.14em] text-slate-400">{label}</div>
      <div className="mt-2 text-2xl font-black tracking-tight text-slate-950">{value}</div>
      <div className="mt-1 text-xs font-medium text-slate-500">{hint}</div>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
      <div className="text-[0.68rem] font-extrabold uppercase tracking-[0.14em] text-slate-400">{label}</div>
      <div className="mt-1 break-words text-sm font-bold text-slate-800">{value || 'Not added yet'}</div>
    </div>
  )
}

function AccountHero({
  name,
  email,
  score,
  verified,
  isAdmin,
}: {
  name: string
  email?: string | null
  score: number
  verified: boolean
  isAdmin?: boolean | null
}) {
  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm">
      <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 px-5 py-6 text-white sm:px-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-lg font-black shadow-sm">
              {initials(name)}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-2xl font-black tracking-tight">{name}</h1>
                {isAdmin ? <AccountBadge tone="success">Admin</AccountBadge> : null}
              </div>
              <p className="mt-1 truncate text-sm font-medium text-white/70">{email}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 sm:justify-end">
            <AccountBadge tone={verified ? 'success' : 'warn'}>{verified ? '18+ verified' : 'Needs verification'}</AccountBadge>
            <AccountBadge tone={score === 100 ? 'success' : 'neutral'}>{`${score}% complete`}</AccountBadge>
          </div>
        </div>
      </div>

      <div className="grid gap-3 border-t border-slate-200 bg-slate-50 p-4 sm:grid-cols-3">
        <AccountStat label="Profile" value={`${score}%`} hint="Complete your account details" />
        <AccountStat label="Verification" value={verified ? 'Passed' : 'Pending'} hint="SA ID age check" />
        <AccountStat label="Account type" value={isAdmin ? 'Admin' : 'Customer'} hint="Current access level" />
      </div>
    </section>
  )
}

function AccountPanel({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-lg font-black tracking-tight text-slate-950">{title}</h2>
        <p className="mt-1 text-sm font-medium leading-6 text-slate-500">{description}</p>
      </div>
      {children}
    </section>
  )
}

function ProfileSummaryCard({
  profile,
  email,
  idOk,
}: {
  profile: ReturnType<typeof useAuth>['profile']
  email?: string | null
  idOk: boolean
}) {
  return (
    <AccountPanel
      title="Account summary"
      description="A quick customer account view. These sections can later connect to orders, favourites, and support tickets."
    >
      <div className="grid gap-3">
        <DetailRow label="Email" value={email ?? ''} />
        <DetailRow label="Full name" value={displayName(profile, email)} />
        <DetailRow label="Address" value={profile?.address ?? ''} />
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-black text-slate-950">Age verification</div>
              <div className="mt-1 text-xs font-medium text-slate-500">Required before using the customer account properly.</div>
            </div>
            <AccountBadge tone={idOk ? 'success' : 'warn'}>{idOk ? 'Verified' : 'Required'}</AccountBadge>
          </div>
        </div>
      </div>
    </AccountPanel>
  )
}

function CustomerFeatureGrid() {
  const items = [
    {
      title: 'Orders',
      description: 'Connect this to an orders table later to show customer purchases, totals, and fulfilment status.',
    },
    {
      title: 'Saved items',
      description: 'Add a wishlist/favourites feature so customers can save products and return later.',
    },
    {
      title: 'Support',
      description: 'Add support tickets or WhatsApp handoff for account, delivery, and product questions.',
    },
  ]

  return (
    <AccountPanel
      title="Customer account features"
      description="These are ready-to-build account modules. They are shown as product placeholders until the database tables exist."
    >
      <div className="grid gap-3 sm:grid-cols-3">
        {items.map((item) => (
          <div key={item.title} className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
            <div className="text-sm font-black text-slate-950">{item.title}</div>
            <p className="mt-2 text-xs font-medium leading-5 text-slate-500">{item.description}</p>
          </div>
        ))}
      </div>
    </AccountPanel>
  )
}

function ProfileDetailsForm({
  profile,
  saving,
  error,
  notice,
  onSubmit,
}: {
  profile: ReturnType<typeof useAuth>['profile']
  saving: boolean
  error: string | null
  notice: string | null
  onSubmit: (values: ProfileFormValues) => Promise<void>
}) {
  const initialIdOk = isZaId18Plus(profile?.id_number ?? '')
  const [idStatusOk, setIdStatusOk] = useState(initialIdOk)

  return (
    <AccountPanel
      title="Profile details"
      description="Keep customer details complete so the account is ready for checkout, compliance, and delivery flows."
    >
      <form
        key={profile ? 'loaded' : 'loading'}
        className="grid gap-4"
        onSubmit={async (event) => {
          event.preventDefault()
          const form = new FormData(event.currentTarget)
          await onSubmit({
            firstName: String(form.get('first_name') ?? '').trim(),
            lastName: String(form.get('last_name') ?? '').trim(),
            idNumber: String(form.get('id_number') ?? '').replace(/\D/g, '').slice(0, 13).trim(),
            address: String(form.get('address') ?? '').trim(),
            acceptedRegulations: Boolean(form.get('accepted_regulations')),
          })
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-[0.68rem] font-extrabold uppercase tracking-[0.14em] text-slate-400">Name</span>
            <input
              className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/10"
              type="text"
              name="first_name"
              defaultValue={profile?.first_name ?? ''}
              autoComplete="given-name"
              required
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-[0.68rem] font-extrabold uppercase tracking-[0.14em] text-slate-400">Surname</span>
            <input
              className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/10"
              type="text"
              name="last_name"
              defaultValue={profile?.last_name ?? ''}
              autoComplete="family-name"
              required
            />
          </label>
        </div>

        <label className="block">
          <span className="mb-1 block text-[0.68rem] font-extrabold uppercase tracking-[0.14em] text-slate-400">South African ID number</span>
          <div className="relative">
            <input
              className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 pr-11 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/10"
              type="text"
              name="id_number"
              inputMode="numeric"
              maxLength={13}
              defaultValue={profile?.id_number ?? ''}
              placeholder="YYMMDDxxxxxxx"
              onInput={(event) => {
                const input = event.currentTarget
                input.value = input.value.replace(/\D/g, '').slice(0, 13)
                setIdStatusOk(isZaId18Plus(input.value))
              }}
              required
            />
            <span
              className={`pointer-events-none absolute right-3 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full ${
                idStatusOk ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-300'
              }`}
              aria-hidden="true"
            >
              <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20" role="presentation" aria-hidden="true">
                <path d="M7.8 13.2 4.9 10.3l-1.4 1.4 4.3 4.3L16.7 7.1l-1.4-1.4-7.5 7.5z" />
              </svg>
            </span>
          </div>
          <span className="mt-1 block text-xs font-medium text-slate-500">Must be 13 digits and confirm the customer is 18+.</span>
        </label>

        <label className="block">
          <span className="mb-1 block text-[0.68rem] font-extrabold uppercase tracking-[0.14em] text-slate-400">Address</span>
          <textarea
            className="min-h-28 w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/10"
            name="address"
            defaultValue={profile?.address ?? ''}
            rows={3}
            required
          />
        </label>

        <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-medium leading-6 text-slate-600">
          <input
            className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            type="checkbox"
            name="accepted_regulations"
            defaultChecked={profile?.accepted_regulations ?? true}
            required
          />
          <span>
            I accept Cape Town’s cannabis regulations and will use cannabis responsibly and lawfully.
          </span>
        </label>

        {profile?.accepted_regulations_at ? (
          <p className="text-xs font-medium text-slate-500">
            Accepted: {new Date(profile.accepted_regulations_at).toLocaleString()}
          </p>
        ) : null}

        {profile?.is_admin ? (
          <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
            Admin access enabled for this account.
          </p>
        ) : null}

        {error ? (
          <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</p>
        ) : null}
        {notice ? (
          <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">{notice}</p>
        ) : null}

        <div className="flex justify-end">
          <button
            className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-950 bg-slate-950 px-5 text-sm font-extrabold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            type="submit"
            disabled={saving}
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </form>
    </AccountPanel>
  )
}

export function ProfilePage() {
  const { user, profile, refreshProfile } = useAuth()
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const idOk = isZaId18Plus(profile?.id_number ?? '')
  const name = displayName(profile, user?.email)
  const score = useMemo(
    () =>
      completionScore({
        firstName: profile?.first_name,
        lastName: profile?.last_name,
        idNumber: profile?.id_number,
        address: profile?.address,
        acceptedRegulations: profile?.accepted_regulations,
      }),
    [profile],
  )

  if (!user) return null

  async function saveProfile(values: ProfileFormValues) {
    if (!user) return

    setSaving(true)
    setNotice(null)
    setError(null)

    try {
      if (!values.acceptedRegulations) {
        throw new Error('You must accept the regulations to continue.')
      }

      assertZaIdIs18Plus(values.idNumber)

      const { error: saveError } = await supabase
        .from('profiles')
        .upsert(
          {
            id: user.id,
            first_name: values.firstName || null,
            last_name: values.lastName || null,
            full_name: `${values.firstName} ${values.lastName}`.trim() || null,
            id_number: values.idNumber || null,
            address: values.address || null,
            accepted_regulations: true,
            accepted_regulations_at: profile?.accepted_regulations_at ?? new Date().toISOString(),
          },
          { onConflict: 'id' },
        )

      if (saveError) throw saveError

      await refreshProfile()
      setNotice('Profile saved successfully.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save profile.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <AppHeader />

      <main className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
        <AccountHero
          name={name}
          email={user.email}
          score={score}
          verified={idOk}
          isAdmin={profile?.is_admin}
        />

        <div className="grid gap-5 lg:grid-cols-[1fr_380px] lg:items-start">
          <ProfileDetailsForm
            profile={profile}
            saving={saving}
            error={error}
            notice={notice}
            onSubmit={saveProfile}
          />

          <div className="grid gap-5">
            <ProfileSummaryCard profile={profile} email={user.email} idOk={idOk} />
            <CustomerFeatureGrid />
          </div>
        </div>
      </main>
    </div>
  )
}
