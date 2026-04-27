import { Navigate, Route, Routes } from 'react-router-dom'
import { RequireAdmin } from './components/RequireAdmin.tsx'
import { RequireAuth } from './components/RequireAuth.tsx'
import { AdminDashboardPage } from './pages/AdminDashboardPage.tsx'
import { LandingPage } from './pages/LandingPage.tsx'
import { LoginPage } from './pages/LoginPage.tsx'
import { NotFoundPage } from './pages/NotFoundPage.tsx'
import { ProfilePage } from './pages/ProfilePage.tsx'
import { SignupPage } from './pages/SignupPage.tsx'
import { StorePage } from './pages/StorePage.tsx'
import { ProductDetailPage } from './pages/ProductDetailPage.tsx'

function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route
          path="/store"
          element={
            <RequireAuth>
              <StorePage />
            </RequireAuth>
          }
        />
        <Route
          path="/products/:productId"
          element={
            <RequireAuth>
              <ProductDetailPage />
            </RequireAuth>
          }
        />
        <Route
          path="/profile"
          element={
            <RequireAuth>
              <ProfilePage />
            </RequireAuth>
          }
        />
        <Route
          path="/admin"
          element={
            <RequireAdmin>
              <AdminDashboardPage />
            </RequireAdmin>
          }
        />
        <Route path="/dashboard" element={<Navigate to="/store" replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </>
  )
}

export default App
