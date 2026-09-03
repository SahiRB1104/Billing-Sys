import React from 'react'
import { Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { LoginPage } from './pages/LoginPage'
import { LandingPage } from './pages/LandingPage'
import { AppShell } from './components/AppShell'
import { BillingModule } from './components/BillingModule'
import { ProductsModule } from './components/ProductsModule'
import { BillsModule } from './components/BillsModule'
import { SettingsModule } from './components/SettingsModule'
import { useAuth } from './context/AuthContext'

const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth()
  if (currentUser?.role !== 'ADMIN') return <Navigate to="/" replace />
  return <>{children}</>
}

const RequireAuth: React.FC = () => {
  const { currentUser, loading } = useAuth()
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f3efe8]">
        <div className="text-stone-700">लोड होत आहे...</div>
      </div>
    )
  }
  return currentUser ? <Outlet /> : <Navigate to="/login" replace />
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireAuth />}>
        <Route element={<AppShell />}>
          <Route index element={<LandingPage />} />
          <Route path="landing" element={<Navigate to="/" replace />} />
          <Route path="billing" element={<BillingModule />} />
          <Route path="products" element={<AdminRoute><ProductsModule /></AdminRoute>} />
          <Route path="bills" element={<BillsModule />} />
          <Route path="settings" element={<AdminRoute><SettingsModule /></AdminRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Route>
    </Routes>
  )
}

export default App
