import React, { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import type { ToastMessage, ToastType } from '../types'
import { localizeDynamicText } from '../utils/transliteration'
import {
  LuCircleCheck,
  LuTriangleAlert,
  LuCircleX,
  LuInfo,
  LuX,
} from './Icons'

interface FloatingToastProps {
  toasts: ToastMessage[]
  onDismiss: (id: string) => void
}

const TOAST_STYLES: Record<
  ToastType,
  {
    bg: string
    border: string
    accentBar: string
    iconBg: string
    iconText: string
    text: string
    Icon: React.ComponentType<{ className?: string }>
  }
> = {
  success: {
    bg: 'bg-[#FCF8E8]',
    border: 'border-[#ECB390]',
    accentBar: 'bg-[#DF7861]',
    iconBg: 'bg-[#ECDFC8]',
    iconText: 'text-[#DF7861]',
    text: 'text-[#3D251E]',
    Icon: LuCircleCheck,
  },
  error: {
    bg: 'bg-[#FCF8E8]',
    border: 'border-[#DF7861]',
    accentBar: 'bg-red-600',
    iconBg: 'bg-red-100',
    iconText: 'text-red-700',
    text: 'text-[#3D251E]',
    Icon: LuCircleX,
  },
  warning: {
    bg: 'bg-[#FCF8E8]',
    border: 'border-[#ECB390]',
    accentBar: 'bg-amber-600',
    iconBg: 'bg-[#ECDFC8]',
    iconText: 'text-amber-800',
    text: 'text-[#3D251E]',
    Icon: LuTriangleAlert,
  },
  info: {
    bg: 'bg-[#FCF8E8]',
    border: 'border-[#ECB390]',
    accentBar: 'bg-[#DF7861]',
    iconBg: 'bg-[#ECDFC8]',
    iconText: 'text-[#DF7861]',
    text: 'text-[#3D251E]',
    Icon: LuInfo,
  },
}

export const FloatingToastStack: React.FC<FloatingToastProps> = ({ toasts, onDismiss }) => {
  const { i18n } = useTranslation()
  const isMarathi = (i18n.language || 'mr').startsWith('mr')
  const popoverRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const el = popoverRef.current as (HTMLDivElement & {
      showPopover?: () => void
      hidePopover?: () => void
    }) | null
    if (!el) return

    try {
      if (toasts.length > 0) {
        if (typeof el.showPopover === 'function' && !el.matches(':popover-open')) {
          el.showPopover()
        }
      } else {
        if (typeof el.hidePopover === 'function' && el.matches(':popover-open')) {
          el.hidePopover()
        }
      }
    } catch {
      // Fallback to fixed positioning when Popover API is not active
    }
  }, [toasts.length])

  if (toasts.length === 0) return null

  return (
    <div
      ref={popoverRef}
      {...({ popover: 'manual' } as any)}
      role="region"
      aria-live="polite"
      aria-label="System Notifications"
      className="toast-popover-stack flex flex-col gap-2"
    >
      {toasts.map((toast) => {
        const style = TOAST_STYLES[toast.type] || TOAST_STYLES.info
        const displayMsg = localizeDynamicText(toast.message, isMarathi)
        const IconComp = style.Icon

        return (
          <div
            key={toast.id}
            role={toast.type === 'error' ? 'alert' : 'status'}
            className={`toast-card relative flex items-center gap-3 overflow-hidden rounded-md border-2 ${style.border} ${style.bg} px-3.5 py-2.5 shadow-xl`}
          >
            <div className={`absolute inset-y-0 left-0 w-1.5 ${style.accentBar}`} />
            <span
              className={`ml-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${style.iconBg} ${style.iconText}`}
              aria-hidden="true"
            >
              <IconComp className="h-4 w-4" />
            </span>

            <p
              className={`min-w-0 flex-1 text-xs font-bold leading-snug ${style.text} ${
                isMarathi ? 'font-marathi' : 'font-english'
              }`}
            >
              {displayMsg}
            </p>

            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              aria-label="Dismiss notification"
              className="shrink-0 rounded border border-[#ECB390] bg-[#ECDFC8] p-1 text-[#3D251E] transition hover:bg-[#ECB390]"
            >
              <LuX className="h-3.5 w-3.5" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
