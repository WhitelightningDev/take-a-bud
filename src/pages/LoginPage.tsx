import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth.ts'
import { toast } from '../hooks/use-toast.ts'
import { toAppError } from '../lib/appError.ts'
import { supabase } from '../lib/supabaseClient.ts'
import logoImg from '../assets/take-a-bud-logo.png'
import '../App.css'

export function LoginPage() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const from = (location.state as { from?: string } | null)?.from ?? '/store'

  return (
    <div className="authPage">
      <section className="authShell" aria-label="Login">
        <div className="authHero">
          <Link className="authHero__logoLink" to="/" aria-label="Take A Bud">
            <img className="authHero__logo" src={logoImg} alt="Take A Bud" />
          </Link>
          <p className="authHero__eyebrow">Member access</p>
          <h1 className="authHero__title">Welcome back to the catalog.</h1>
          <p className="authHero__body">
            Sign in to browse live stock, manage your profile, and access the full Take A Bud range.
          </p>
          <div className="authHero__list" aria-label="Account benefits">
            <span>Live stock visibility</span>
            <span>Apparel and cannabis categories</span>
            <span>Admin redirect when permitted</span>
          </div>
        </div>

        <div className="authPanel">
          <p className="authPanel__eyebrow">Sign in</p>
          <h2 className="authPanel__title">Login</h2>
          <p className="authPanel__sub">
            New here? <Link to="/signup">Create an account</Link>
          </p>

          <form
            className="form authForm"
            onSubmit={async (e) => {
              e.preventDefault()
              setSubmitting(true)
              setError(null)
              try {
                await signIn({ email, password })
                toast({ title: 'Signed in', description: 'Welcome back.' })
                try {
                  const { data } = await supabase.auth.getUser()
                  const uid = data.user?.id
                  if (uid) {
                    const { data: prof } = await supabase
                      .from('profiles')
                      .select('is_admin')
                      .eq('id', uid)
                      .maybeSingle()
                    if (prof?.is_admin) {
                      navigate('/admin', { replace: true })
                      return
                    }
                  }
                } catch {
                  // Ignore and fall back to normal redirect.
                }

                navigate(from, { replace: true })
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
                autoComplete="current-password"
                placeholder="Your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </label>

            {error ? (
              <p className="form__error">
                {error}
                {error.toLowerCase().includes('supabase') ? (
                  <>
                    {' '}
                    Check `.env.local` and restart `npm run dev`.
                  </>
                ) : null}
              </p>
            ) : null}

            <button className="primaryButton" type="submit" disabled={submitting}>
              {submitting ? 'Signing in…' : 'Sign in'}
            </button>

            <div className="authPanel__footer">
              <Link className="textLink" to="/">
                Back to landing
              </Link>
              <Link className="textLink" to="/signup">
                Create account
              </Link>
            </div>
          </form>
        </div>
      </section>
    </div>
  )
}
