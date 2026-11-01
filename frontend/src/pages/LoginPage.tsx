import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { LuStore, LuUserCheck, LuKeyRound } from '../components/Icons'

interface LoginPageProps {
  onLoginSuccess?: () => void
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { login, loading, currentUser } = useAuth()

  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('admin123')
  const [loginError, setLoginError] = useState('')

  const isMarathi = (i18n.language || 'mr').startsWith('mr')

  const handleLanguageChange = (lng: string) => {
    void i18n.changeLanguage(lng)
    localStorage.setItem('pos_language', lng)
    document.documentElement.lang = lng
  }

  if (currentUser) {
    return (
      <Navigate
        to={currentUser.role === 'ADMIN' ? '/' : '/billing'}
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
      navigate(user.role === 'ADMIN' ? '/' : '/billing')
    } else {
      setLoginError(t('login.error'))
    }
  }

  const handleQuickLogin = async (userArg: string, pass: string) => {
    setLoginError('')
    const user = await login(userArg, pass)
    if (user) {
      onLoginSuccess?.()
      navigate(user.role === 'ADMIN' ? '/' : '/billing')
    } else {
      setLoginError(t('login.error'))
    }
  }

  return (
    <div className="flex h-dvh w-full flex-col items-center justify-center overflow-hidden bg-[#ECDFC8] p-4">
      <div className="w-full max-w-md rounded-md border-2 border-[#ECB390] bg-[#FCF8E8] p-6 shadow-2xl">
        {/* Top Bar with Strict Language Switcher */}
        <div className="mb-4 flex items-center justify-between border-b border-[#ECB390] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-md border border-[#ECB390] bg-[#DF7861] text-base font-black text-[#FCF8E8]">
              <LuStore className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-base font-black leading-tight text-[#3D251E]">
                {t('app.shopPoint')}
              </h1>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#7A6258]">
                {t('app.title')}
              </p>
            </div>
          </div>

          <div className="flex items-center rounded-md border border-[#ECB390] bg-[#ECDFC8] p-0.5">
            <button
              type="button"
              onClick={() => handleLanguageChange('mr')}
              className={`rounded px-2.5 py-1 text-xs font-bold transition font-marathi ${
                isMarathi
                  ? 'bg-[#DF7861] text-[#FCF8E8] shadow-xs'
                  : 'text-[#3D251E] hover:bg-[#ECB390]/50'
              }`}
            >
              मराठी
            </button>
            <button
              type="button"
              onClick={() => handleLanguageChange('en')}
              className={`rounded px-2.5 py-1 text-xs font-bold transition font-english ${
                !isMarathi
                  ? 'bg-[#DF7861] text-[#FCF8E8] shadow-xs'
                  : 'text-[#3D251E] hover:bg-[#ECB390]/50'
              }`}
            >
              English
            </button>
          </div>
        </div>

        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-[#3D251E]">
          {t('login.title')}
        </h2>

        {loginError && (
          <div className="mb-3 rounded border border-[#DF7861] bg-[#ECB390]/40 p-2.5 text-xs font-bold text-[#B93829]">
            {loginError}
          </div>
        )}

        {/* Quick Switch Buttons */}
        <div className="mb-4 space-y-1.5">
          <div className="text-[11px] font-bold text-[#7A6258]">
            {t('login.quickSwitch')}
          </div>
          <button
            type="button"
            onClick={() => void handleQuickLogin('admin', 'admin123')}
            disabled={loading}
            className="flex w-full items-center justify-between rounded border border-[#ECB390] bg-[#ECDFC8] px-3.5 py-2 text-left text-xs font-bold text-[#3D251E] hover:bg-[#ECB390] disabled:opacity-60"
          >
            <span className="flex items-center gap-1.5">
              <LuUserCheck className="h-3.5 w-3.5 text-[#DF7861]" />
              <span>{t('user.quickAdmin')}</span>
            </span>
            <span className="rounded bg-[#DF7861] px-2 py-0.5 text-[10px] font-bold text-[#FCF8E8] font-english">
              {t('user.roleAdmin')}
            </span>
          </button>
          <button
            type="button"
            onClick={() => void handleQuickLogin('cashier', 'cashier123')}
            disabled={loading}
            className="flex w-full items-center justify-between rounded border border-[#ECB390] bg-[#ECDFC8]/60 px-3.5 py-2 text-left text-xs font-bold text-[#3D251E] hover:bg-[#ECB390] disabled:opacity-60"
          >
            <span className="flex items-center gap-1.5">
              <LuUserCheck className="h-3.5 w-3.5 text-[#5C4338]" />
              <span>{t('user.quickCashier')}</span>
            </span>
            <span className="rounded border border-[#ECB390] bg-[#FCF8E8] px-2 py-0.5 text-[10px] font-bold text-[#3D251E] font-english">
              {t('user.roleCashier')}
            </span>
          </button>
        </div>

        <div className="relative my-3 text-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#ECB390]" />
          </div>
          <span className="relative bg-[#FCF8E8] px-2 text-[11px] font-bold text-[#7A6258]">
            {t('login.orCredentials')}
          </span>
        </div>

        <form onSubmit={handleLogin} className="space-y-3">
          <label className="block space-y-1">
            <span className="text-xs font-bold text-[#3D251E]">
              {t('user.username')}
            </span>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full rounded border border-[#ECB390] bg-white px-3 py-2 text-xs font-semibold text-[#3D251E] outline-none focus:border-[#DF7861] font-english"
            />
          </label>

          <label className="block space-y-1">
            <span className="text-xs font-bold text-[#3D251E]">
              {t('user.password')}
            </span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded border border-[#ECB390] bg-white px-3 py-2 text-xs font-semibold text-[#3D251E] outline-none focus:border-[#DF7861]"
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-1.5 rounded bg-[#DF7861] px-5 py-2.5 text-xs font-bold text-[#FCF8E8] hover:bg-[#c9624c] disabled:opacity-60"
          >
            <LuKeyRound className="h-3.5 w-3.5" />
            <span>{loading ? t('login.loading') : t('user.loginButton')}</span>
          </button>
        </form>
      </div>
    </div>
  )
}
