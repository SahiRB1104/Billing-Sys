import React, { useEffect, useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import { WorkspaceProvider, useWorkspace } from '../context/WorkspaceContext'
import { Header } from './Header'
import { FloatingToastStack } from './FloatingToast'
import { ReceiptPrint, BarcodeLabelPrint } from './PrintComponents'
import {
  ConfirmDialogModal,
  InvoiceDetailModal,
  PriceUpdateModal,
  LabelPrintDialog,
} from './Modals'
import { FirstLoginPasswordModal } from './FirstLoginPasswordModal'
import { LuDatabase } from './Icons'
import type { SectionKey } from '../types'

const AppShellInner: React.FC = () => {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { currentUser } = useAuth()
  const { t, i18n } = useTranslation()
  const {
    notify,
    toasts,
    dismissToast,
    invoiceToPrint,
    labelToPrint,
    labelCount,
    storeSettings,
  } = useWorkspace()

  const isAdmin = currentUser?.role === 'ADMIN'
  const isMarathi = (i18n.language || 'mr').startsWith('mr')

  const availableSections: Array<{ key: SectionKey; label: string }> = isAdmin
    ? [
        { key: 'dashboard', label: t('nav.dashboard') },
        { key: 'billing', label: t('nav.billing') },
        { key: 'products', label: t('nav.productEntry') },
        { key: 'bills', label: t('nav.bills') },
        { key: 'settings', label: t('nav.settings') },
      ]
    : [
        { key: 'dashboard', label: t('nav.dashboard') },
        { key: 'billing', label: t('nav.billing') },
        { key: 'bills', label: t('nav.bills') },
      ]

  const canAccessSection = (section: SectionKey) => {
    if (isAdmin) return true
    return section === 'dashboard' || section === 'billing' || section === 'bills'
  }

  const goToSection = (section: SectionKey) => {
    if (canAccessSection(section)) {
      if (section === 'dashboard') {
        navigate('/')
      } else {
        navigate(`/${section}`)
      }
    }
  }

  const currentPath = location.pathname.replace('/', '')
  const isCurrentPath = (section: SectionKey) => {
    if (section === 'dashboard') {
      return currentPath === '' || currentPath === 'dashboard'
    }
    return currentPath === section
  }

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement))
    }
    handleFullscreenChange()
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () =>
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen()
      } else {
        await document.documentElement.requestFullscreen()
      }
    } catch (error) {
      console.error(error)
      notify(t('msg.fullscreenError'), 'warning')
    }
  }

  return (
    <>
      <div className="app-shell flex h-dvh w-full flex-col overflow-hidden bg-[#ECDFC8] text-[#3D251E]">
        <Header
          isFullscreen={isFullscreen}
          onToggleFullscreen={toggleFullscreen}
          availableSections={availableSections}
          isCurrentPath={isCurrentPath}
          canAccessSection={canAccessSection}
          goToSection={goToSection}
        />

        <main className="flex min-h-0 flex-1 flex-col overflow-hidden p-2">
          <Outlet />
        </main>

        {/* Bottom Supermarket POS Status & Shortcut Bar */}
        <footer className="flex h-6 shrink-0 items-center justify-between border-t border-[#ECB390] bg-[#FCF8E8] px-3 text-[11px] font-semibold text-[#5C4338]">
          <div
            className={`truncate ${
              isMarathi ? 'font-marathi' : 'font-english'
            }`}
          >
            {t('shortcuts.bar')}
          </div>
          <div className="flex shrink-0 items-center gap-3 font-english text-[10px] font-bold text-[#5C4338]">
            <span>{t('app.terminalBadge')}</span>
            <span className="flex items-center gap-1 text-emerald-700">
              <LuDatabase className="h-3 w-3 text-[#DF7861]" />
              <span>{t('settings.dbEngineBadge')}</span>
            </span>
          </div>
        </footer>
      </div>

      {/* Floating Toast Notification Stack */}
      <FloatingToastStack toasts={toasts} onDismiss={dismissToast} />

      {/* Thermal Print Roots */}
      <div className="print-receipt-root">
        <ReceiptPrint
          invoice={invoiceToPrint}
          storeSettings={storeSettings}
          cashierName={currentUser?.name || currentUser?.username || 'Admin'}
        />
      </div>
      <BarcodeLabelPrint product={labelToPrint} count={labelCount} />

      {/* Global POS Modals */}
      <ConfirmDialogModal />
      <FirstLoginPasswordModal />
      <InvoiceDetailModal />
      <PriceUpdateModal />
      <LabelPrintDialog />
    </>
  )
}

export const AppShell: React.FC = () => {
  const { token, currentUser } = useAuth()
  if (!token || !currentUser) return null
  return (
    <WorkspaceProvider token={token} currentUser={currentUser}>
      <AppShellInner />
    </WorkspaceProvider>
  )
}
