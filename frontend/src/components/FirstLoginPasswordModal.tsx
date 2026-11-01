import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import { useWorkspace } from '../context/WorkspaceContext'
import { LuSmartphone, LuShieldCheck, LuLogOut, LuCheck } from './Icons'

const API_URL = 'http://localhost:8000'

export const FirstLoginPasswordModal: React.FC = () => {
  const { t } = useTranslation()
  const { token, currentUser, refreshProfile, logout } = useAuth()
  const { notify } = useWorkspace()

  const [otpSent, setOtpSent] = useState(false)
  const [maskedPhone, setMaskedPhone] = useState('')
  const [terminalOtpPreview, setTerminalOtpPreview] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  if (!currentUser || !currentUser.must_change_password) {
    return null
  }

  const handleSendOtp = async () => {
    if (!token) return
    setLoading(true)
    setErrorMsg('')
    try {
      const res = await fetch(`${API_URL}/auth/first-login/send-otp`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setErrorMsg(data.detail || 'Failed to generate OTP')
        return
      }
      setOtpSent(true)
      setMaskedPhone(data.masked_phone || currentUser.contact_number || '')
      setTerminalOtpPreview(data.offline_otp_preview || '')
      notify(t('otp.sentNotice', { phone: data.masked_phone || '' }), 'info')
    } catch (err) {
      console.error(err)
      setErrorMsg('Failed to connect to POS server')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')

    if (otpCode.trim().length !== 6) {
      setErrorMsg('Please enter the 6-digit OTP code.')
      return
    }
    if (newPassword.length < 4) {
      setErrorMsg(t('msg.passwordTooShort'))
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/auth/first-login/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          otp_code: otpCode.trim(),
          new_password: newPassword,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setErrorMsg(data.detail || 'OTP verification failed')
        return
      }
      notify(t('otp.success'), 'success')
      await refreshProfile()
    } catch (err) {
      console.error(err)
      setErrorMsg('Failed to update password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#3D251E]/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-md border-2 border-[#ECB390] bg-[#FCF8E8] p-5 shadow-2xl">
        <div className="border-b border-[#ECB390] pb-3">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1 rounded border border-[#ECB390] bg-[#ECDFC8] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#3D251E]">
              <LuShieldCheck className="h-3.5 w-3.5 text-[#DF7861]" />
              <span>MANDATORY SECURITY STEP</span>
            </span>
            <span className="text-[11px] font-bold text-[#7A6258] font-english">
              {currentUser.staff_id || currentUser.username}
            </span>
          </div>
          <h3 className="mt-2 text-base font-bold text-[#3D251E]">
            {t('otp.title')}
          </h3>
          <p className="mt-1 text-xs text-[#5C4338]">
            {t('otp.subtitle')}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <div className="rounded-md border border-[#ECB390] bg-[#ECDFC8]/60 p-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-[11px] font-bold text-[#3D251E]">
                  Registered Mobile: {currentUser.contact_number || maskedPhone || 'N/A'}
                </div>
                <div className="text-[10px] text-[#5C4338]">
                  {otpSent
                    ? t('otp.sentNotice', { phone: maskedPhone })
                    : 'Request a 6-digit verification OTP to unlock your new password setup.'}
                </div>
              </div>
              <button
                type="button"
                disabled={loading}
                onClick={() => void handleSendOtp()}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-[#DF7861] px-3 py-1.5 text-xs font-bold text-[#FCF8E8] hover:bg-[#c9624c] disabled:opacity-50"
              >
                <LuSmartphone className="h-3.5 w-3.5" />
                <span>{otpSent ? 'Resend OTP' : t('otp.sendBtn')}</span>
              </button>
            </div>

            {terminalOtpPreview && (
              <div className="mt-2.5 flex items-center justify-between rounded border border-[#DF7861] bg-[#FCF8E8] px-2.5 py-1.5">
                <span className="text-[11px] font-bold text-[#5C4338]">
                  {t('otp.offlinePreview')}:
                </span>
                <span className="font-mono text-sm font-black tracking-widest text-[#DF7861]">
                  {terminalOtpPreview}
                </span>
              </div>
            )}
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-[#3D251E]">
              {t('otp.codeLabel')} *
            </label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              required
              disabled={!otpSent}
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder={t('otp.codePlaceholder')}
              className="w-full rounded-md border border-[#ECB390] bg-white px-3 py-2 font-mono text-sm font-bold tracking-widest text-[#3D251E] focus:border-[#DF7861] focus:outline-none disabled:bg-[#ECDFC8]/50 font-english"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-[#3D251E]">
              {t('otp.newPass')} *
            </label>
            <input
              type="text"
              required
              disabled={!otpSent}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Min 4 characters"
              className="w-full rounded-md border border-[#ECB390] bg-white px-3 py-2 font-mono text-xs font-bold text-[#3D251E] focus:border-[#DF7861] focus:outline-none disabled:bg-[#ECDFC8]/50 font-english"
            />
          </div>

          {errorMsg && (
            <div className="rounded border border-[#DF7861] bg-[#ECB390]/40 px-3 py-2 text-xs font-bold text-[#B93829]">
              {errorMsg}
            </div>
          )}

          <div className="flex items-center justify-between border-t border-[#ECB390] pt-3">
            <button
              type="button"
              onClick={logout}
              className="inline-flex items-center gap-1 rounded-md border border-[#ECB390] bg-[#ECDFC8] px-3 py-2 text-xs font-bold text-[#3D251E] hover:bg-[#ECB390]"
            >
              <LuLogOut className="h-3.5 w-3.5 text-[#DF7861]" />
              <span>Sign Out</span>
            </button>
            <button
              type="submit"
              disabled={!otpSent || loading}
              className="inline-flex items-center gap-1.5 rounded-md bg-[#DF7861] px-4 py-2 text-xs font-bold text-[#FCF8E8] hover:bg-[#c9624c] disabled:opacity-50"
            >
              <LuCheck className="h-3.5 w-3.5" />
              <span>{loading ? 'Verifying...' : t('otp.submitBtn')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
