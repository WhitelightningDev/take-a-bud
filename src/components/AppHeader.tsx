import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth.ts'
import logoImg from '../assets/take-a-bud-logo.png'
import '../App.css'

export function AppHeader() {
  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()

  return (
    <header className="appHeader">
      <div className="appHeader__inner">
        <Link className="appHeader__brand" to="/store" aria-label="Take A Bud">
          <img className="appHeader__logo" src={logoImg} alt="" />
        </Link>

        <nav className="appHeader__nav" aria-label="Main">
          <NavLink
            className={({ isActive }) =>
              isActive ? 'appHeader__link appHeader__link--active' : 'appHeader__link'
            }
            to="/store"
          >
            Store
          </NavLink>
          {user ? (
            <>
              <NavLink
                className={({ isActive }) =>
                  isActive ? 'appHeader__link appHeader__link--active' : 'appHeader__link'
                }
                to="/profile"
              >
                Profile
              </NavLink>
              {profile?.is_admin ? (
                <NavLink
                  className={({ isActive }) =>
                    isActive ? 'appHeader__link appHeader__link--active' : 'appHeader__link'
                  }
                  to="/admin"
                >
                  Admin
                </NavLink>
              ) : null}
              <button
                className="appHeader__button"
                type="button"
                onClick={async () => {
                  await signOut()
                  navigate('/')
                }}
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link className="appHeader__link" to="/login">
                Login
              </Link>
              <Link className="appHeader__button" to="/signup">
                Sign up
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}
