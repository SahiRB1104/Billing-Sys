import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

interface LoginPageProps {
  onLoginSuccess?: () => void
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { login, loading, currentUser } = useAuth()

  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('admin123')
  const [loginError, setLoginError] = useState('')

  if (currentUser) {
    return (
      <Navigate
        to={currentUser.role === 'ADMIN' ? '/products' : '/billing'}
        replace
      />
    )
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginError('')
    const user = await login(username, password)
    if (user) {
      onLoginSuccess?.()
      navigate(user.role === 'ADMIN' ? '/products' : '/billing')
    } else {
      setLoginError(t('login.error'))
    }
  }

  const handleQuickLogin = async (userArg: string, pass: string) => {
    setLoginError('')
    const user = await login(userArg, pass)
    if (user) {
      onLoginSuccess?.()
      navigate(user.role === 'ADMIN' ? '/products' : '/billing')
    } else {
      setLoginError(t('login.error'))
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f3efe8] p-4">
      <div className="w-full max-w-md rounded-[28px] border border-stone-200 bg-[#fbfaf8] shadow-[0_30px_80px_rgba(71,52,34,0.12)]">
        <div className="p-8">
          <div className="mb-6 text-center">
            <h1 className="text-3xl font-black text-stone-900">{t('app.shopPoint')}</h1>
            <p className="mt-1 text-sm text-stone-500">{t('app.title')}</p>
          </div>

          <h2 className="mb-6 text-2xl font-black text-stone-900">{t('login.title')}</h2>

          {loginError && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
              {loginError}
            </div>
          )}

          {/* Quick Switch Buttons */}
          <div className="mb-5 space-y-2">
            <div className="text-xs font-bold text-stone-500">
              {t('login.quickSwitch')}
            </div>
            <button
              type="button"
              onClick={() => void handleQuickLogin('admin', 'admin123')}
              disabled={loading}
              className="flex w-full items-center justify-between rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-left font-bold text-amber-900 hover:bg-amber-100 disabled:opacity-60"
            >
              <span>👑                 {t('user.quickAdmin')}</span>
              <span className="text-xs font-mono">ADMIN</span>
            </button>
            <button
              type="button"
              onClick={() => void handleQuickLogin('cashier', 'cashier123')}
              disabled={loading}
              className="flex w-full items-center justify-between rounded-xl border border-blue-300 bg-blue-50 px-4 py-3 text-left font-bold text-blue-900 hover:bg-blue-100 disabled:opacity-60"
            >
              <span>🧾                 {t('user.quickCashier')}</span>
              <span className="text-xs font-mono">CASHIER</span>
            </button>
          </div>

          <div className="relative my-4 text-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-stone-200" />
            </div>
            <span className="relative bg-[#fbfaf8] px-2 text-xs font-bold text-stone-400">
              {t('login.orCredentials')}
            </span>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <label className="block space-y-1">
              <span className="text-sm font-bold text-stone-700">              {t('user.username')}</span>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-stone-500"
              />
            </label>

            <label className="block space-y-1">
              <span className="text-sm font-bold text-stone-700">              {t('user.password')}</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-stone-500"
              />
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-stone-900 px-5 py-3 text-sm font-black text-white hover:bg-stone-800 disabled:opacity-60"
            >
              {loading ? t('login.loading') : t('user.loginButton')}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
