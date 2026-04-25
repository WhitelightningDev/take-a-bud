import { useState } from 'react'
import { AppHeader } from '../components/AppHeader.tsx'
import { supabase } from '../lib/supabaseClient.ts'
import { useAuth } from '../auth/useAuth.ts'
import { assertZaIdIs18Plus, isZaId18Plus } from '../lib/zaId.ts'
import '../App.css'

export function ProfilePage() {
  const { user, profile, refreshProfile } = useAuth()
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const idOk = isZaId18Plus(profile?.id_number ?? '')

  if (!user) return null

  return (
    <div className="appPage">
      <AppHeader />
      <main className="appMain">
        <div className="appMain__head">
          <h1 className="appTitle">Profile</h1>
          <p className="appHint">{user.email}</p>
        </div>

        <div className="card card--wide">
          <h2 className="card__title card__title--small">Your details</h2>

          <form
            key={profile ? 'loaded' : 'loading'}
            className="form"
            onSubmit={async (e) => {
              e.preventDefault()
              setSaving(true)
              setNotice(null)
              setError(null)
              try {
                const form = new FormData(e.currentTarget)
                const firstName = String(form.get('first_name') ?? '').trim()
                const lastName = String(form.get('last_name') ?? '').trim()
                const idNumber = String(form.get('id_number') ?? '')
                  .replace(/\\D/g, '')
                  .slice(0, 13)
                  .trim()
                const address = String(form.get('address') ?? '').trim()
                const accepted = Boolean(form.get('accepted_regulations'))
                if (!accepted) {
                  throw new Error('You must accept the regulations to continue.')
                }
                assertZaIdIs18Plus(idNumber)

                const { error } = await supabase
                  .from('profiles')
                  .upsert(
                    {
                      id: user.id,
                      first_name: firstName || null,
                      last_name: lastName || null,
                      full_name: `${firstName} ${lastName}`.trim() || null,
                      id_number: idNumber || null,
                      address: address || null,
                      accepted_regulations: true,
                      accepted_regulations_at:
                        profile?.accepted_regulations_at ?? new Date().toISOString(),
                    },
                    { onConflict: 'id' },
                  )
                if (error) throw error
                await refreshProfile()
                setNotice('Saved.')
              } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to save')
              } finally {
                setSaving(false)
              }
            }}
          >
            <label className="field">
              <span className="field__label">Name</span>
              <input
                className="field__input"
                type="text"
                name="first_name"
                defaultValue={profile?.first_name ?? ''}
                autoComplete="given-name"
                required
              />
            </label>

            <label className="field">
              <span className="field__label">Surname</span>
              <input
                className="field__input"
                type="text"
                name="last_name"
                defaultValue={profile?.last_name ?? ''}
                autoComplete="family-name"
                required
              />
            </label>

            <label className="field">
              <span className="field__label">ID number</span>
              <div className="field__control">
                <input
                  className="field__input field__input--withStatus"
                  type="text"
                  name="id_number"
                  inputMode="numeric"
                  defaultValue={profile?.id_number ?? ''}
                  data-age-ok={idOk ? 'true' : 'false'}
                  onInput={(e) => {
                    const input = e.currentTarget
                    input.value = input.value.replace(/\\D/g, '').slice(0, 13)
                    const ok = isZaId18Plus(input.value)
                    input.dataset.ageOk = ok ? 'true' : 'false'
                  }}
                  required
                />
                <span className="field__status" aria-hidden="true">
                  <svg viewBox="0 0 20 20" role="presentation" aria-hidden="true">
                    <path d="M7.8 13.2 4.9 10.3l-1.4 1.4 4.3 4.3L16.7 7.1l-1.4-1.4-7.5 7.5z" />
                  </svg>
                </span>
              </div>
              <span className="field__hint">13 digits.</span>
            </label>

            <label className="field">
              <span className="field__label">Address</span>
              <textarea
                className="field__textarea"
                name="address"
                defaultValue={profile?.address ?? ''}
                rows={3}
                required
              />
            </label>

            <label className="check">
              <input
                className="check__input"
                type="checkbox"
                name="accepted_regulations"
                defaultChecked={profile?.accepted_regulations ?? true}
                required
              />
              <span className="check__label">
                I accept Cape Town’s cannabis regulations and will use cannabis
                responsibly and lawfully.
              </span>
            </label>

            {profile?.accepted_regulations_at ? (
              <p className="field__hint">
                Accepted:{' '}
                {new Date(profile.accepted_regulations_at).toLocaleString()}
              </p>
            ) : null}

            {profile?.is_admin ? (
              <p className="form__notice">Admin access enabled for this account.</p>
            ) : null}

            {error ? <p className="form__error">{error}</p> : null}
            {notice ? <p className="form__notice">{notice}</p> : null}

            <button className="primaryButton" type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}
