import { Link } from 'react-router-dom'
import '../App.css'

export function NotFoundPage() {
  return (
    <div className="page">
      <div className="card">
        <h1 className="card__title">Page not found</h1>
        <p className="card__subtitle">
          Go back to the <Link to="/">landing page</Link>.
        </p>
      </div>
    </div>
  )
}

