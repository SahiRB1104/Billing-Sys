import React, { useEffect, useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import { WorkspaceProvider, useWorkspace } from '../context/WorkspaceContext'
import { Header } from './Header'
import { ReceiptPrint, BarcodeLabelPrint } from './PrintComponents'
import { InvoiceDetailModal, PriceUpdateModal, LabelPrintDialog } from './Modals'
import type { SectionKey } from '../types'

const AppShellInner: React.FC = () => {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { currentUser } = useAuth()
  const { t } = useTranslation()
  const { statusText, setStatusText, invoiceToPrint, labelToPrint, labelCount } = useWorkspace()

  const isAdmin = currentUser?.role === 'ADMIN'

  const availableSections: Array<{ key: SectionKey; label: string }> = isAdmin
    ? [
        { key: 'products', label: t('nav.productEntry') },
        { key: 'bills', label: t('nav.bills') },
        { key: 'settings', label: t('nav.settings') },
      ]
    : [
        { key: 'billing', label: t('nav.billing') },
        { key: 'bills', label: t('nav.bills') },
      ]

  const canAccessSection = (section: SectionKey) => {
    if (isAdmin) return true
    return section === 'billing' || section === 'bills'
  }

  const goToSection = (section: SectionKey) => {
    if (canAccessSection(section)) {
      navigate(`/${section}`)
    }
  }

  const currentPath = location.pathname.replace('/', '') || 'billing'
  const isCurrentPath = (section: SectionKey) => currentPath === section

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement))
    }
    handleFullscreenChange()
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
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
      setStatusText('Fullscreen toggle failed.')
    }
  }

  return (
    <>
      <div className="app-shell min-h-screen bg-[#f3efe8] px-5 py-6 text-stone-800">
        <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-[1920px] flex-col rounded-[28px] border border-stone-200 bg-[#fbfaf8] shadow-[0_30px_80px_rgba(71,52,34,0.12)]">
          <Header
            statusText={statusText}
            onClearStatus={() => setStatusText('')}
            isFullscreen={isFullscreen}
            onToggleFullscreen={toggleFullscreen}
          />

          <main className="flex flex-1 flex-col gap-5 px-6 py-5">
            <nav className="flex flex-wrap items-center gap-2 rounded-2xl border border-stone-200 bg-white p-2 shadow-sm">
              {availableSections.map((section) => (
                <button
                  key={section.key}
                  type="button"
                  onClick={() => goToSection(section.key)}
                  disabled={!canAccessSection(section.key)}
                  className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                    isCurrentPath(section.key)
                      ? 'bg-stone-900 text-white shadow'
                      : 'bg-stone-50 text-stone-700 hover:bg-stone-100'
                  }`}
                >
                  {section.label}
                </button>
              ))}
            </nav>

            <Outlet />
          </main>
        </div>
      </div>

      <div className="print-receipt-root">
        <ReceiptPrint invoice={invoiceToPrint} cashierName={currentUser?.username || 'Admin'} />
      </div>
      <BarcodeLabelPrint product={labelToPrint} count={labelCount} />

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
