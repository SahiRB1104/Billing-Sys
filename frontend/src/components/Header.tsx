import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import { useWorkspace } from '../context/WorkspaceContext'
import { localizeDynamicText } from '../utils/transliteration'
import {
  LuLayoutDashboard,
  LuShoppingCart,
  LuPackage,
  LuFileText,
  LuSettings,
  LuLogOut,
  LuMaximize2,
  LuMinimize2,
  LuStore,
} from './Icons'
import type { SectionKey } from '../types'

interface HeaderProps {
  isFullscreen: boolean
  onToggleFullscreen: () => void
  availableSections: Array<{ key: SectionKey; label: string; icon?: string }>
  isCurrentPath: (section: SectionKey) => boolean
  canAccessSection: (section: SectionKey) => boolean
  goToSection: (section: SectionKey) => void
}

const SECTION_ICONS: Record<SectionKey, React.ComponentType<{ className?: string }>> = {
  dashboard: LuLayoutDashboard,
  billing: LuShoppingCart,
  products: LuPackage,
  bills: LuFileText,
  settings: LuSettings,
}

export const Header: React.FC<HeaderProps> = ({
  isFullscreen,
  onToggleFullscreen,
  availableSections,
  isCurrentPath,
  canAccessSection,
  goToSection,
}) => {
  const { t, i18n } = useTranslation()
  const { currentUser, logout } = useAuth()
  const { storeSettings, cart } = useWorkspace()
  const navigate = useNavigate()

  const isCurrentLangMr = i18n.language === 'mr' || i18n.language.startsWith('mr')

  const handleLanguageChange = (lng: string) => {
    void i18n.changeLanguage(lng)
    localStorage.setItem('pos_language', lng)
    document.documentElement.lang = lng
  }

  const handleSwitchUser = () => {
    logout()
    navigate('/login')
  }

  const rawStoreName = storeSettings?.store_name || t('app.shopPoint')
  const storeName = localizeDynamicText(rawStoreName, isCurrentLangMr)
  const operatorName = localizeDynamicText(
    currentUser?.name || currentUser?.username || 'Admin',
    isCurrentLangMr,
  )

  return (
    <header className="flex h-13 shrink-0 items-center justify-between gap-3 border-b-2 border-[#ECB390] bg-[#FCF8E8] px-4 text-[#3D251E] shadow-xs">
      {/* Left: Brand & Store Name */}
      <div className="flex min-w-0 items-center gap-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-[#ECB390] bg-[#DF7861] text-sm font-black text-[#FCF8E8] shadow-xs">
          <LuStore className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <div className="truncate text-[9px] font-bold uppercase tracking-widest text-[#7A6258]">
            {t('app.title')}
          </div>
          <h1
            className={`truncate text-sm font-black leading-tight text-[#3D251E] ${
              isCurrentLangMr ? 'font-marathi' : 'font-english'
            }`}
          >
            {storeName}
          </h1>
        </div>
      </div>

      {/* Center: Single Unified POS Navigation Tabs with react-icons */}
      <nav
        aria-label="Main POS Navigation"
        className="flex items-center gap-1 rounded-md border border-[#ECB390] bg-[#ECDFC8] p-1"
      >
        {availableSections.map((section) => {
          const active = isCurrentPath(section.key)
          const IconComp = SECTION_ICONS[section.key] || LuLayoutDashboard
          return (
            <button
              key={section.key}
              type="button"
              onClick={() => goToSection(section.key)}
              disabled={!canAccessSection(section.key)}
              className={`relative flex items-center gap-1.5 rounded px-3.5 py-1 text-xs font-bold transition ${
                active
                  ? 'bg-[#DF7861] text-[#FCF8E8] shadow-xs'
                  : 'text-[#3D251E] hover:bg-[#ECB390]/60'
              }`}
            >
              <IconComp className="h-3.5 w-3.5 shrink-0" />
              <span className={isCurrentLangMr ? 'font-marathi' : 'font-english'}>
                {section.label}
              </span>
              {section.key === 'billing' && cart.length > 0 && (
                <span
                  className={`ml-0.5 rounded px-1.5 py-0.2 text-[10px] font-black font-english ${
                    active
                      ? 'bg-[#FCF8E8] text-[#DF7861]'
                      : 'bg-[#DF7861] text-[#FCF8E8]'
                  }`}
                >
                  {cart.length}
                </span>
              )}
            </button>
          )
        })}
      </nav>

      {/* Right: Language Toggle, Offline Badge, Operator & Fullscreen */}
      <div className="flex shrink-0 items-center gap-2">
        {/* Strict Language Switcher */}
        <div
          role="group"
          aria-label="Language Switcher"
          className="flex items-center rounded-md border border-[#ECB390] bg-[#ECDFC8] p-0.5"
        >
          <button
            type="button"
            onClick={() => handleLanguageChange('mr')}
            className={`rounded px-2.5 py-1 text-xs font-bold transition font-marathi ${
              isCurrentLangMr
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
              !isCurrentLangMr
                ? 'bg-[#DF7861] text-[#FCF8E8] shadow-xs'
                : 'text-[#3D251E] hover:bg-[#ECB390]/50'
            }`}
          >
            English
          </button>
        </div>

        {/* Offline Active Status */}
        <div className="hidden xl:flex items-center gap-1.5 rounded-md border border-[#ECB390] bg-[#ECDFC8] px-2.5 py-1 text-[11px] font-bold text-[#3D251E]">
          <span className="h-2 w-2 rounded-full bg-emerald-600" />
          <span>{t('status.active')}</span>
        </div>

        {/* User / Operator Card */}
        <div className="flex items-center gap-2 rounded-md border border-[#ECB390] bg-[#ECDFC8] px-2.5 py-1">
          <div className="flex flex-col leading-none">
            <span className="text-xs font-bold text-[#3D251E]">
              {operatorName}
            </span>
            <span className="mt-0.5 text-[9px] font-bold text-[#5C4338] font-english">
              {currentUser?.staff_id
                ? `${currentUser.staff_id} • `
                : ''}
              {currentUser?.role === 'ADMIN'
                ? t('user.roleAdmin')
                : t('user.roleCashier')}
            </span>
          </div>
          <button
            type="button"
            onClick={handleSwitchUser}
            className="flex items-center gap-1 rounded border border-[#ECB390] bg-[#FCF8E8] px-2 py-1 text-[11px] font-bold text-[#3D251E] transition hover:bg-[#ECB390]"
          >
            <LuLogOut className="h-3 w-3 text-[#DF7861]" />
            <span>{t('user.switchUser')}</span>
          </button>
        </div>

        {/* Fullscreen Button */}
        <button
          type="button"
          onClick={onToggleFullscreen}
          className="flex h-8 w-8 items-center justify-center rounded-md border border-[#ECB390] bg-[#ECDFC8] text-xs font-bold text-[#3D251E] transition hover:bg-[#ECB390]"
          aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
        >
          {isFullscreen ? (
            <LuMinimize2 className="h-3.5 w-3.5" />
          ) : (
            <LuMaximize2 className="h-3.5 w-3.5" />
          )}
        </button>
      </div>
    </header>
  )
}
