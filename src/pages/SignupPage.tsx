import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth.ts'
import { toast } from '../hooks/use-toast.ts'
import { toAppError } from '../lib/appError.ts'
import { assertZaIdIs18Plus, isZaId18Plus } from '../lib/zaId.ts'
import logoImg from '../assets/take-a-bud-logo.png'
import '../App.css'

export function SignupPage() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [idNumber, setIdNumber] = useState('')
  const [address, setAddress] = useState('')
  const [acceptedRegulations, setAcceptedRegulations] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const idOk = isZaId18Plus(idNumber)

  return (
    <div className="authPage">
      <section className="authShell authShell--wide" aria-label="Create account">
        <div className="authHero">
          <Link className="authHero__logoLink" to="/" aria-label="Take A Bud">
            <img className="authHero__logo" src={logoImg} alt="Take A Bud" />
          </Link>
          <p className="authHero__eyebrow">Adults only</p>
          <h1 className="authHero__title">Create your Take A Bud account.</h1>
          <p className="authHero__body">
            Accounts keep access controlled and let you browse the live catalog once your age details are captured.
          </p>
          <div className="authHero__list" aria-label="Signup requirements">
            <span>South African ID age check</span>
            <span>Responsible-use confirmation</span>
            <span>Immediate store access after signup</span>
          </div>
        </div>

        <div className="authPanel">
          <p className="authPanel__eyebrow">Join</p>
          <h2 className="authPanel__title">Create account</h2>
          <p className="authPanel__sub">
            Already have an account? <Link to="/login">Login</Link>
          </p>

          <form
            className="form authForm authForm--twoCol"
            onSubmit={async (e) => {
              e.preventDefault()
              setSubmitting(true)
              setError(null)
              setNotice(null)
              try {
                if (!acceptedRegulations) {
                  throw new Error('You must accept the regulations to continue.')
                }
                assertZaIdIs18Plus(idNumber)
                await signUp({
                  email,
                  password,
                  firstName: firstName.trim(),
                  lastName: lastName.trim(),
                  idNumber: idNumber.trim(),
                  address: address.trim(),
                  acceptedRegulations: true,
                })
                setNotice(
                  'Account created. If email confirmation is enabled, check your inbox.',
                )
                toast({
                  title: 'Account created',
                  description: 'You can now continue to the store.',
                })
                navigate('/store', { replace: true })
              } catch (err) {
                const appErr = toAppError(err)
                setError(appErr.message)
                toast({
                  variant: 'destructive',
                  title: appErr.title,
                  description: (
                    <span className="block">
                      <span className="block">{appErr.message}</span>
                      {appErr.fix ? (
                        <span className="mt-2 block font-semibold text-destructive-foreground/90">
                          Fix: {appErr.fix}
                        </span>
                      ) : null}
                    </span>
                  ),
                })
              } finally {
                setSubmitting(false)
              }
            }}
          >
            <label className="field">
              <span className="field__label">Name</span>
              <input
                className="field__input"
                type="text"
                autoComplete="given-name"
                placeholder="Your name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
            </label>

          <label className="field">
            <span className="field__label">Surname</span>
            <input
              className="field__input"
              type="text"
              autoComplete="family-name"
              placeholder="Your surname"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
            />
          </label>

          <label className="field">
            <span className="field__label">ID number</span>
            <div className="field__control">
              <input
                className="field__input field__input--withStatus"
                type="text"
                inputMode="numeric"
                value={idNumber}
                data-age-ok={idOk ? 'true' : 'false'}
                onChange={(e) =>
                  setIdNumber(e.target.value.replace(/\\D/g, '').slice(0, 13))
                }
                required
              />
              <span className="field__status" aria-hidden="true">
                <svg viewBox="0 0 20 20" role="presentation" aria-hidden="true">
                  <path d="M7.8 13.2 4.9 10.3l-1.4 1.4 4.3 4.3L16.7 7.1l-1.4-1.4-7.5 7.5z" />
                </svg>
              </span>
            </div>
            <span className="field__hint">13 digits (numbers only).</span>
          </label>

          <label className="field">
            <span className="field__label">Address</span>
            <textarea
              className="field__textarea"
              placeholder="Street, suburb, city, postal code"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              rows={3}
              required
            />
          </label>

          <label className="field">
            <span className="field__label">Email</span>
            <input
              className="field__input"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>

          <label className="field">
            <span className="field__label">Password</span>
            <input
              className="field__input"
              type="password"
              autoComplete="new-password"
              placeholder="Minimum 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
            />
            <span className="field__hint">Minimum 8 characters.</span>
          </label>

          <label className="check">
            <input
              className="check__input"
              type="checkbox"
              checked={acceptedRegulations}
              onChange={(e) => setAcceptedRegulations(e.target.checked)}
              required
            />
            <span className="check__label">
              I confirm I’ve read and accept Cape Town’s cannabis regulations and
              will use cannabis responsibly and lawfully.
            </span>
          </label>

          {error ? (
            <p className="form__error">
              {error}
              {error.toLowerCase().includes('supabase') ? (
                <>
                  {' '}
                  Check <code>.env.local</code> for <code>VITE_SUPABASE_URL</code> plus an anon or
                  publishable key, then restart <code>npm run dev</code>.
                </>
              ) : null}
            </p>
          ) : null}
          {notice ? <p className="form__notice">{notice}</p> : null}

          <button className="primaryButton authForm__full" type="submit" disabled={submitting}>
            {submitting ? 'Creating…' : 'Create account'}
          </button>

          <div className="authPanel__footer authForm__full">
            <Link className="textLink" to="/">
              Back to landing
            </Link>
            <Link className="textLink" to="/login">
              Login instead
            </Link>
          </div>
          </form>
        </div>
      </section>
    </div>
  )
}
