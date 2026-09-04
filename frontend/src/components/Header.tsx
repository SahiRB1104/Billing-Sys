import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'

interface HeaderProps {
  statusText: string
  onClearStatus: () => void
  isFullscreen: boolean
  onToggleFullscreen: () => void
}

export const Header: React.FC<HeaderProps> = ({
  statusText,
  onClearStatus,
  isFullscreen,
  onToggleFullscreen,
}) => {
  const { t, i18n } = useTranslation()
  const { currentUser, logout } = useAuth()
  const navigate = useNavigate()

  const isCurrentLangMr = i18n.language === 'mr' || i18n.language.startsWith('mr')

  const handleLanguageChange = (lng: string) => {
    void i18n.changeLanguage(lng)
    localStorage.setItem('pos_language', lng)
  }

  const handleSwitchUser = () => {
    logout()
    navigate('/login')
  }

  return (
    <header className="flex flex-col gap-4 border-b border-stone-200 bg-stone-50 px-6 py-4 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <div className="text-[11px] font-semibold text-stone-500">
          {t('app.title')}
        </div>
        <h1 className="mt-1 text-2xl font-black text-stone-900">{t('app.shopPoint')}</h1>
      </div>

      <div className="flex flex-wrap items-center gap-3 lg:justify-end">
        <div className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-white px-3 py-2 shadow-sm">
          <div className="flex flex-col leading-tight">
            <span className="text-xs font-bold text-stone-700">
              {currentUser?.username || 'admin'}
            </span>
            <span className="text-[10px] font-black text-stone-500">
              {currentUser?.role === 'ADMIN' ? t('user.roleAdmin') : t('user.roleCashier')}
            </span>
          </div>
          <button
            type="button"
            onClick={handleSwitchUser}
            className="rounded-lg border border-stone-200 bg-stone-50 px-2.5 py-1 text-xs font-semibold text-stone-700 hover:bg-stone-100"
          >
            {t('user.switchUser')}
          </button>
        </div>

        <div className="flex items-center rounded-full border border-stone-200 bg-white p-1 shadow-sm">
          <button
            type="button"
            onClick={() => handleLanguageChange('mr')}
            className={`rounded-full px-4 py-2 text-sm font-bold transition ${
              isCurrentLangMr
                ? 'bg-stone-900 text-white shadow'
                : 'text-stone-700 hover:bg-stone-100'
            }`}
          >
            मराठी
          </button>
          <button
            type="button"
            onClick={() => handleLanguageChange('en')}
            className={`rounded-full px-4 py-2 text-sm font-bold transition ${
              !isCurrentLangMr
                ? 'bg-stone-900 text-white shadow'
                : 'text-stone-700 hover:bg-stone-100'
            }`}
          >
            English
          </button>
        </div>

        <div className="rounded-full border border-stone-200 bg-white px-3 py-2 text-xs font-bold text-stone-600 shadow-sm">
          {t('status.active')}
        </div>

        <button
          type="button"
          onClick={onToggleFullscreen}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-stone-200 bg-white text-sm font-black text-stone-700 shadow-sm hover:bg-stone-100"
          aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
        >
          {isFullscreen ? '⤢' : '⛶'}
        </button>
      </div>

      {statusText && (
        <div className="mt-2 flex items-center justify-between rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900 lg:mt-0 lg:ml-4 lg:max-w-md">
          <span className="truncate">{statusText}</span>
          <button
            type="button"
            onClick={onClearStatus}
            className="ml-4 font-bold text-amber-900 hover:opacity-75"
          >
            ✕
          </button>
        </div>
      )}
    </header>
  )
}
