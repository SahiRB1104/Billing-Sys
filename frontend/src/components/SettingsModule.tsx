import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useWorkspace } from '../context/WorkspaceContext'
import { QrCodeCanvas } from './PrintComponents'
import {
  localizeDynamicText,
  devanagariToPhonetic,
  liveMarathiPhoneticInput,
} from '../utils/transliteration'
import {
  formatIndianMobile,
  validateIndianMobile,
  formatIdentityDocumentNumber,
  validateIdentityDocumentNumber,
  getIdentityDocumentPlaceholder,
} from '../utils/indianValidators'
import { TransliteratedInput } from './TransliteratedInput'
import {
  LuStore,
  LuUsers,
  LuQrCode,
  LuDatabase,
  LuDownload,
  LuPlus,
  LuPencil,
  LuKeyRound,
  LuEye,
  LuEyeOff,
  LuUpload,
  LuSmartphone,
  LuShieldCheck,
  LuCheck,
  LuX,
} from './Icons'
import type { StaffUser, StoreSettings, PaymentSettings } from '../types'

function buildAutoInitialPassword(fullName: string, mobile: string): string {
  const firstToken = (fullName || '').trim().split(/\s+/)[0] || ''
  const romanFirst = (/[\u0900-\u097F]/.test(firstToken)
    ? devanagariToPhonetic(firstToken)
    : firstToken
  )
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
  const cleanName = romanFirst || 'staff'
  const first4Mobile = (mobile || '').replace(/\D/g, '').slice(0, 4)
  return `${cleanName}${first4Mobile}`
}

function buildAutoUsername(fullName: string): string {
  const firstToken = (fullName || '').trim().split(/\s+/)[0] || ''
  const romanFirst = (/[\u0900-\u097F]/.test(firstToken)
    ? devanagariToPhonetic(firstToken)
    : firstToken
  )
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
  return romanFirst ? `cashier_${romanFirst}` : ''
}

export const SettingsModule: React.FC = () => {
  const { t, i18n } = useTranslation()
  const isMarathi = (i18n.language || 'mr').startsWith('mr')
  const {
    storeSettings,
    updateStoreSettings,
    paymentSettings,
    updatePaymentSettings,
    staffList,
    staffLoading,
    fetchStaffList,
    fetchNextEmployeeCode,
    createStaffMember,
    updateStaffMember,
    toggleStaffStatus,
    sendStaffResetOtp,
    resetStaffPassword,
    downloadDatabaseBackup,
    notify,
  } = useWorkspace()

  const [activeTab, setActiveTab] = useState<'store' | 'staff' | 'payment'>('store')

  // ── Store Profile Form State ───────────────────────────────────────
  const [storeForm, setStoreForm] = useState<Partial<StoreSettings>>({
    store_name: '',
    owner_name: '',
    address: '',
    city: '',
    state: '',
    pin_code: '',
    country: 'भारत',
    phone: '',
    email: '',
    gst_enabled: false,
    gstin: '',
    invoice_prefix: 'INV',
    currency_symbol: '₹',
    receipt_header: '',
    receipt_footer: '',
    tax_inclusive: true,
    default_gst_rate: 5.0,
  })

  useEffect(() => {
    if (storeSettings) {
      setStoreForm({
        store_name: storeSettings.store_name || '',
        owner_name: storeSettings.owner_name || '',
        address: storeSettings.address || '',
        city: storeSettings.city || '',
        state: storeSettings.state || '',
        pin_code: storeSettings.pin_code || '',
        country: storeSettings.country || 'भारत',
        phone: formatIndianMobile(storeSettings.phone || ''),
        email: storeSettings.email || '',
        gst_enabled: Boolean(storeSettings.gst_enabled),
        gstin: storeSettings.gstin || '',
        invoice_prefix: storeSettings.invoice_prefix || 'INV',
        currency_symbol: storeSettings.currency_symbol || '₹',
        receipt_header: storeSettings.receipt_header || '',
        receipt_footer: storeSettings.receipt_footer || '',
        tax_inclusive: Boolean(storeSettings.tax_inclusive),
        default_gst_rate: storeSettings.default_gst_rate ?? 5.0,
      })
    }
  }, [storeSettings])

  const [storeSaving, setStoreSaving] = useState(false)

  const handleSaveStore = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!storeForm.store_name?.trim()) {
      notify(t('msg.storeNameRequired'), 'warning')
      return
    }
    if (storeForm.phone && storeForm.phone.trim()) {
      const mCheck = validateIndianMobile(storeForm.phone)
      if (!mCheck.valid) {
        notify(mCheck.error || 'Store phone number must be 10 digits.', 'error')
        return
      }
    }
    setStoreSaving(true)
    await updateStoreSettings(storeForm)
    setStoreSaving(false)
  }

  const handleResetStore = () => {
    if (storeSettings) {
      setStoreForm({
        ...storeSettings,
        phone: formatIndianMobile(storeSettings.phone || ''),
      })
      notify(t('msg.storeReset'), 'info')
    }
  }

  // ── Payment / UPI Settings State ───────────────────────────────────
  const [paymentForm, setPaymentForm] = useState<Partial<PaymentSettings>>({
    upi_enabled: true,
    payee_name: '',
    upi_id: '',
    payment_description: '',
    static_qr_image: '',
    gateway_enabled: false,
    gateway_provider: 'MANUAL',
  })

  useEffect(() => {
    if (paymentSettings) {
      setPaymentForm({
        upi_enabled: Boolean(paymentSettings.upi_enabled),
        payee_name: paymentSettings.payee_name || '',
        upi_id: paymentSettings.upi_id || '',
        payment_description: paymentSettings.payment_description || '',
        static_qr_image: paymentSettings.static_qr_image || '',
        gateway_enabled: Boolean(paymentSettings.gateway_enabled),
        gateway_provider: paymentSettings.gateway_provider || 'MANUAL',
      })
    }
  }, [paymentSettings])

  const [paymentSaving, setPaymentSaving] = useState(false)

  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault()
    setPaymentSaving(true)
    await updatePaymentSettings(paymentForm)
    setPaymentSaving(false)
  }

  const handleQrUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      notify(t('msg.imageOnly'), 'error')
      return
    }
    if (file.size > 1 * 1024 * 1024) {
      notify(t('msg.qrTooLarge2MB'), 'error')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const base64 = reader.result as string
      setPaymentForm((prev) => ({ ...prev, static_qr_image: base64 }))
      notify(t('msg.qrSelected'), 'info')
    }
    reader.readAsDataURL(file)
  }

  // ── Staff Management State ─────────────────────────────────────────
  const todayIso = new Date().toISOString().slice(0, 10)
  const [addStaffOpen, setAddStaffOpen] = useState(false)
  const [usernameManuallyEdited, setUsernameManuallyEdited] = useState(false)
  const [passwordManuallyEdited, setPasswordManuallyEdited] = useState(false)
  const [previewDocOpen, setPreviewDocOpen] = useState(false)

  const [staffForm, setStaffForm] = useState({
    name: '',
    username: '',
    role: 'CASHIER',
    contact_number: '',
    email: '',
    address: '',
    staff_id: 'EMP-001',
    joining_date: todayIso,
    document_type: 'Aadhar',
    document_ref: '',
    document_status: 'VERIFIED',
    document_notes: '',
    hard_copy_collected: false,
    password: '',
  })
  const [inlineDocFile, setInlineDocFile] = useState<{
    original_name: string
    mime_type: string
    document_data: string
    size_bytes: number
  } | null>(null)

  const [editStaffModal, setEditStaffModal] = useState<StaffUser | null>(null)

  // Admin Cashier Password Reset with Mobile OTP state
  const [resetPassModal, setResetPassModal] = useState<StaffUser | null>(null)
  const [newPasswordVal, setNewPasswordVal] = useState('')
  const [resetOtpCode, setResetOtpCode] = useState('')
  const [resetOtpPreview, setResetOtpPreview] = useState('')
  const [resetOtpMaskedMobile, setResetOtpMaskedMobile] = useState('')
  const [sendingResetOtp, setSendingResetOtp] = useState(false)

  // Auto-generate next sequential Employee ID when modal opens or role changes
  useEffect(() => {
    if (!addStaffOpen) return
    let active = true
    void fetchNextEmployeeCode(staffForm.role).then((nextCode) => {
      if (active) {
        setStaffForm((prev) => ({ ...prev, staff_id: nextCode }))
      }
    })
    return () => {
      active = false
    }
  }, [addStaffOpen, staffForm.role])

  const handleOpenAddStaff = () => {
    setInlineDocFile(null)
    setPreviewDocOpen(false)
    setUsernameManuallyEdited(false)
    setPasswordManuallyEdited(false)
    setStaffForm({
      name: '',
      username: '',
      role: 'CASHIER',
      contact_number: '',
      email: '',
      address: '',
      staff_id: 'EMP-001',
      joining_date: new Date().toISOString().slice(0, 10),
      document_type: 'Aadhar',
      document_ref: '',
      document_status: 'VERIFIED',
      document_notes: '',
      hard_copy_collected: false,
      password: '',
    })
    setAddStaffOpen(true)
  }

  const handleStaffNameChange = (rawName: string) => {
    const nextName = isMarathi
      ? liveMarathiPhoneticInput(rawName, true)
      : rawName
    setStaffForm((prev) => {
      const nextUsername = usernameManuallyEdited
        ? prev.username
        : buildAutoUsername(nextName)
      const nextPassword = passwordManuallyEdited
        ? prev.password
        : buildAutoInitialPassword(nextName, prev.contact_number)
      return {
        ...prev,
        name: nextName,
        username: nextUsername,
        password: nextPassword,
      }
    })
  }

  const handleStaffMobileChange = (rawMobile: string) => {
    const formatted = formatIndianMobile(rawMobile)
    setStaffForm((prev) => {
      const nextPassword = passwordManuallyEdited
        ? prev.password
        : buildAutoInitialPassword(prev.name, formatted)
      return {
        ...prev,
        contact_number: formatted,
        password: nextPassword,
      }
    })
  }

  const handleInlineKycFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const allowedMimes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
    ]
    if (
      !allowedMimes.includes(file.type.toLowerCase()) &&
      !file.type.startsWith('image/') &&
      file.type !== 'application/pdf'
    ) {
      notify('Only PDF or Image files (JPG, PNG, WEBP) are allowed.', 'error')
      e.target.value = ''
      return
    }
    // Enforce < 1 MB limit
    if (file.size > 1 * 1024 * 1024) {
      notify(t('msg.fileTooLarge5MB'), 'error')
      e.target.value = ''
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const base64 = reader.result as string
      setInlineDocFile({
        original_name: file.name,
        mime_type: file.type || 'application/octet-stream',
        document_data: base64,
        size_bytes: file.size,
      })
      setPreviewDocOpen(false)
    }
    reader.readAsDataURL(file)
  }

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!staffForm.name.trim() || !staffForm.username.trim()) {
      notify('Full name and username are mandatory.', 'error')
      return
    }
    const mobileValidation = validateIndianMobile(staffForm.contact_number)
    if (!mobileValidation.valid) {
      notify(mobileValidation.error || 'Invalid 10-digit Indian mobile number.', 'error')
      return
    }
    if (!staffForm.joining_date) {
      notify('Joining Date is mandatory.', 'error')
      return
    }
    const docValidation = validateIdentityDocumentNumber(
      staffForm.document_type,
      staffForm.document_ref,
    )
    if (!docValidation.valid) {
      notify(docValidation.error || 'Invalid Identity Card number.', 'error')
      return
    }
    if (!inlineDocFile) {
      notify('Please upload the Identity Card PDF or Image (under 1 MB).', 'error')
      return
    }
    if (!staffForm.hard_copy_collected) {
      notify('Please confirm and check Hard Copy Print Collected & Verified.', 'error')
      return
    }
    if (staffForm.password.length < 4) {
      notify(t('msg.passwordTooShort'), 'error')
      return
    }

    const ok = await createStaffMember({
      name: staffForm.name.trim(),
      username: staffForm.username.trim(),
      password: staffForm.password,
      role: staffForm.role,
      contact_number: staffForm.contact_number.trim(),
      email: staffForm.email.trim() || null,
      address: staffForm.address.trim() || null,
      staff_id: staffForm.staff_id.trim(),
      joining_date: staffForm.joining_date,
      document_type: staffForm.document_type,
      document_ref: staffForm.document_ref.trim(),
      document_status: 'VERIFIED',
      document_notes: staffForm.document_notes.trim() || null,
      hard_copy_collected: staffForm.hard_copy_collected,
      document_file: {
        original_name: inlineDocFile.original_name,
        mime_type: inlineDocFile.mime_type,
        document_data: inlineDocFile.document_data,
      },
    })

    if (ok) {
      setAddStaffOpen(false)
      setInlineDocFile(null)
      setPreviewDocOpen(false)
    }
  }

  const handleEditStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editStaffModal) return
    if (editStaffModal.contact_number) {
      const mCheck = validateIndianMobile(editStaffModal.contact_number)
      if (!mCheck.valid) {
        notify(mCheck.error || 'Invalid mobile number', 'error')
        return
      }
    }
    if (editStaffModal.document_type && editStaffModal.document_ref) {
      const dCheck = validateIdentityDocumentNumber(
        editStaffModal.document_type,
        editStaffModal.document_ref,
      )
      if (!dCheck.valid) {
        notify(dCheck.error || 'Invalid document number', 'error')
        return
      }
    }
    const ok = await updateStaffMember(editStaffModal.id, {
      name: editStaffModal.name,
      contact_number: editStaffModal.contact_number,
      email: editStaffModal.email,
      address: editStaffModal.address,
      staff_id: editStaffModal.staff_id,
      document_type: editStaffModal.document_type,
      document_ref: editStaffModal.document_ref,
      document_status: editStaffModal.document_status,
      document_notes: editStaffModal.document_notes,
      hard_copy_collected: editStaffModal.hard_copy_collected,
    })
    if (ok) setEditStaffModal(null)
  }

  const handleOpenResetModal = (user: StaffUser) => {
    setResetPassModal(user)
    setNewPasswordVal(buildAutoInitialPassword(user.name, user.contact_number || ''))
    setResetOtpCode('')
    setResetOtpPreview('')
    setResetOtpMaskedMobile('')
  }

  const handleSendResetOtp = async () => {
    if (!resetPassModal) return
    setSendingResetOtp(true)
    const res = await sendStaffResetOtp(resetPassModal.id)
    setSendingResetOtp(false)
    if (res?.sent) {
      setResetOtpPreview(res.otp_preview || '')
      setResetOtpMaskedMobile(res.masked_mobile || '')
    }
  }

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!resetPassModal) return
    if (resetOtpCode.trim().length !== 6) {
      notify(
        isMarathi
          ? 'कृपया कॅशियरच्या मोबाईलवरील ६ अंकी OTP प्रविष्ट करा.'
          : 'Please enter the 6-digit OTP sent to the cashier mobile.',
        'error',
      )
      return
    }
    if (newPasswordVal.length < 4) {
      notify(t('msg.passwordTooShort'), 'error')
      return
    }
    const ok = await resetStaffPassword(
      resetPassModal.id,
      newPasswordVal,
      resetOtpCode.trim(),
    )
    if (ok) {
      setResetPassModal(null)
      setNewPasswordVal('')
      setResetOtpCode('')
      setResetOtpPreview('')
    }
  }

  const mobileCheck = validateIndianMobile(staffForm.contact_number)
  const docCheck = validateIdentityDocumentNumber(
    staffForm.document_type,
    staffForm.document_ref,
  )

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-2 overflow-hidden">
      {/* Settings Sub-Navigation Bar */}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-1.5 rounded-md border border-[#ECB390] bg-[#FCF8E8] p-1.5">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTab('store')}
            className={`flex items-center gap-1.5 rounded px-3.5 py-1.5 text-xs font-bold transition ${
              activeTab === 'store'
                ? 'bg-[#DF7861] text-[#FCF8E8] shadow-xs'
                : 'text-[#3D251E] hover:bg-[#ECDFC8]'
            }`}
          >
            <LuStore className="h-3.5 w-3.5" />
            <span>{t('settings.tabStore')}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('staff')
              void fetchStaffList()
            }}
            className={`flex items-center gap-1.5 rounded px-3.5 py-1.5 text-xs font-bold transition ${
              activeTab === 'staff'
                ? 'bg-[#DF7861] text-[#FCF8E8] shadow-xs'
                : 'text-[#3D251E] hover:bg-[#ECDFC8]'
            }`}
          >
            <LuUsers className="h-3.5 w-3.5" />
            <span>{t('settings.tabStaff')}</span>
            <span
              className={`rounded px-1.5 py-0.2 text-[10px] font-bold font-english ${
                activeTab === 'staff'
                  ? 'bg-[#FCF8E8] text-[#DF7861]'
                  : 'bg-[#ECDFC8] text-[#3D251E]'
              }`}
            >
              {staffList.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('payment')}
            className={`flex items-center gap-1.5 rounded px-3.5 py-1.5 text-xs font-bold transition ${
              activeTab === 'payment'
                ? 'bg-[#DF7861] text-[#FCF8E8] shadow-xs'
                : 'text-[#3D251E] hover:bg-[#ECDFC8]'
            }`}
          >
            <LuQrCode className="h-3.5 w-3.5" />
            <span>{t('settings.tabPayment')}</span>
            {paymentSettings?.upi_enabled && (
              <span className="rounded border border-emerald-300 bg-emerald-50 px-1.5 py-0.2 text-[10px] font-bold text-emerald-800 font-english">
                UPI ON
              </span>
            )}
          </button>
        </div>

        {/* Offline SQLite 3 (WAL) Status & 1-Click Backup */}
        <div className="flex items-center gap-2">
          <span className="hidden items-center gap-1 text-[11px] font-bold text-[#5C4338] md:inline-flex">
            <LuDatabase className="h-3.5 w-3.5 text-[#DF7861]" />
            <span>{t('settings.dbEngineLabel')}</span>
          </span>
          <button
            type="button"
            onClick={() => void downloadDatabaseBackup()}
            className="flex items-center gap-1.5 rounded border border-[#ECB390] bg-[#ECDFC8] px-3 py-1 text-[11px] font-bold text-[#3D251E] hover:bg-[#ECB390]"
          >
            <LuDownload className="h-3.5 w-3.5 text-[#DF7861]" />
            <span>{t('settings.backupDbBtn')}</span>
          </button>
        </div>
      </div>

      {/* ── TAB 1: STORE PROFILE (Fits 100% in Single Screen) ───────── */}
      {activeTab === 'store' && (
        <form
          onSubmit={handleSaveStore}
          className="flex min-h-0 flex-1 flex-col justify-between overflow-hidden rounded-md border border-[#ECB390] bg-[#FCF8E8] p-4"
        >
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[#ECB390] pb-2.5">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wide text-[#3D251E]">
                {t('settings.shopDetails')}
              </h3>
              <p className="text-[11px] text-[#7A6258]">
                {t('settings.shopDetailsSub')}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleResetStore}
                className="rounded border border-[#ECB390] bg-[#ECDFC8] px-3.5 py-1.5 text-xs font-bold text-[#3D251E] hover:bg-[#ECB390]"
              >
                {t('settings.reset')}
              </button>
              <button
                type="submit"
                disabled={storeSaving}
                className="rounded bg-[#DF7861] px-5 py-1.5 text-xs font-bold text-[#FCF8E8] hover:bg-[#c9624c] disabled:opacity-60"
              >
                {storeSaving ? t('settings.saving') : t('settings.save')}
              </button>
            </div>
          </div>

          <div className="pos-scroll my-2.5 min-h-0 flex-1 space-y-3 pr-1">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
              <div className="md:col-span-2">
                <TransliteratedInput
                  label={t('settings.shopName') + ' *'}
                  required
                  value={storeForm.store_name || ''}
                  onChangeValue={(val) =>
                    setStoreForm({ ...storeForm, store_name: val })
                  }
                  className="w-full rounded border border-[#ECB390] bg-white px-3 py-1.5 text-xs font-semibold text-[#3D251E] outline-none focus:border-[#DF7861]"
                  placeholder={t('settings.shopNamePlaceholder')}
                  showLiveBadge={false}
                />
              </div>

              <div>
                <TransliteratedInput
                  label={t('settings.ownerName')}
                  value={storeForm.owner_name || ''}
                  onChangeValue={(val) =>
                    setStoreForm({ ...storeForm, owner_name: val })
                  }
                  className="w-full rounded border border-[#ECB390] bg-white px-3 py-1.5 text-xs font-semibold text-[#3D251E] outline-none focus:border-[#DF7861]"
                  showLiveBadge={false}
                />
              </div>

              <label className="space-y-1">
                <span className="text-xs font-bold text-[#3D251E]">
                  {t('settings.phone')}
                </span>
                <input
                  inputMode="numeric"
                  value={storeForm.phone || ''}
                  onChange={(e) =>
                    setStoreForm({
                      ...storeForm,
                      phone: formatIndianMobile(e.target.value),
                    })
                  }
                  maxLength={10}
                  placeholder="9876543210"
                  className="w-full rounded border border-[#ECB390] bg-white px-3 py-1.5 text-xs font-semibold text-[#3D251E] outline-none focus:border-[#DF7861] font-english"
                />
              </label>

              <label className="space-y-1">
                <span className="text-xs font-bold text-[#3D251E]">
                  {t('settings.email')}
                </span>
                <input
                  type="email"
                  value={storeForm.email || ''}
                  onChange={(e) =>
                    setStoreForm({ ...storeForm, email: e.target.value })
                  }
                  className="w-full rounded border border-[#ECB390] bg-white px-3 py-1.5 text-xs font-semibold text-[#3D251E] outline-none focus:border-[#DF7861] font-english"
                />
              </label>

              <div className="md:col-span-2">
                <TransliteratedInput
                  label={t('settings.address')}
                  value={storeForm.address || ''}
                  onChangeValue={(val) =>
                    setStoreForm({ ...storeForm, address: val })
                  }
                  className="w-full rounded border border-[#ECB390] bg-white px-3 py-1.5 text-xs font-semibold text-[#3D251E] outline-none focus:border-[#DF7861]"
                  showLiveBadge={false}
                />
              </div>

              <div>
                <TransliteratedInput
                  label={t('settings.city')}
                  value={storeForm.city || ''}
                  onChangeValue={(val) =>
                    setStoreForm({ ...storeForm, city: val })
                  }
                  className="w-full rounded border border-[#ECB390] bg-white px-3 py-1.5 text-xs font-semibold text-[#3D251E] outline-none focus:border-[#DF7861]"
                  showLiveBadge={false}
                />
              </div>

              <div>
                <TransliteratedInput
                  label={t('settings.state')}
                  value={storeForm.state || ''}
                  onChangeValue={(val) =>
                    setStoreForm({ ...storeForm, state: val })
                  }
                  className="w-full rounded border border-[#ECB390] bg-white px-3 py-1.5 text-xs font-semibold text-[#3D251E] outline-none focus:border-[#DF7861]"
                  showLiveBadge={false}
                />
              </div>

              <label className="space-y-1">
                <span className="text-xs font-bold text-[#3D251E]">
                  {t('settings.pinCode')}
                </span>
                <input
                  value={storeForm.pin_code || ''}
                  onChange={(e) =>
                    setStoreForm({
                      ...storeForm,
                      pin_code: e.target.value.replace(/\D/g, '').slice(0, 6),
                    })
                  }
                  maxLength={6}
                  className="w-full rounded border border-[#ECB390] bg-white px-3 py-1.5 text-xs font-semibold text-[#3D251E] outline-none focus:border-[#DF7861] font-english"
                />
              </label>

              <div>
                <TransliteratedInput
                  label={t('settings.receiptHeader')}
                  value={storeForm.receipt_header || ''}
                  onChangeValue={(val) =>
                    setStoreForm({ ...storeForm, receipt_header: val })
                  }
                  placeholder={t('settings.receiptHeaderPlaceholder')}
                  className="w-full rounded border border-[#ECB390] bg-white px-3 py-1.5 text-xs font-semibold text-[#3D251E] outline-none focus:border-[#DF7861]"
                  showLiveBadge={false}
                />
              </div>

              <div>
                <TransliteratedInput
                  label={t('settings.receiptFooter')}
                  value={storeForm.receipt_footer || ''}
                  onChangeValue={(val) =>
                    setStoreForm({ ...storeForm, receipt_footer: val })
                  }
                  placeholder={t('settings.receiptFooterPlaceholder')}
                  className="w-full rounded border border-[#ECB390] bg-white px-3 py-1.5 text-xs font-semibold text-[#3D251E] outline-none focus:border-[#DF7861]"
                  showLiveBadge={false}
                />
              </div>
            </div>

            {/* GST & Tax Configuration Section */}
            <div className="rounded-md border border-[#ECB390] bg-[#ECDFC8]/60 p-3">
              <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-[#3D251E]">
                {t('settings.taxConfigTitle')}
              </h4>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                <div className="flex items-center gap-2 pt-4">
                  <input
                    type="checkbox"
                    id="gst_toggle"
                    checked={Boolean(storeForm.gst_enabled)}
                    onChange={(e) =>
                      setStoreForm({ ...storeForm, gst_enabled: e.target.checked })
                    }
                    className="h-4 w-4 rounded border-[#ECB390] accent-[#DF7861]"
                  />
                  <label
                    htmlFor="gst_toggle"
                    className="cursor-pointer text-xs font-bold text-[#3D251E]"
                  >
                    {t('settings.gstEnable')}
                  </label>
                </div>

                {storeForm.gst_enabled && (
                  <label className="space-y-1">
                    <span className="text-xs font-bold text-[#3D251E]">
                      {t('settings.gstin')} *
                    </span>
                    <input
                      value={storeForm.gstin || ''}
                      onChange={(e) =>
                        setStoreForm({
                          ...storeForm,
                          gstin: e.target.value.toUpperCase(),
                        })
                      }
                      placeholder="27ABCDE1234F1Z5"
                      maxLength={15}
                      className="w-full rounded border border-[#ECB390] bg-white px-3 py-1.5 text-xs font-mono font-bold uppercase text-[#3D251E] outline-none focus:border-[#DF7861] font-english"
                    />
                  </label>
                )}

                <label className="space-y-1">
                  <span className="text-xs font-bold text-[#3D251E]">
                    {t('settings.taxPricingPolicy')}
                  </span>
                  <select
                    value={storeForm.tax_inclusive ? 'inclusive' : 'exclusive'}
                    onChange={(e) =>
                      setStoreForm({
                        ...storeForm,
                        tax_inclusive: e.target.value === 'inclusive',
                      })
                    }
                    className="w-full rounded border border-[#ECB390] bg-white px-3 py-1.5 text-xs font-bold text-[#3D251E] outline-none focus:border-[#DF7861]"
                  >
                    <option value="inclusive">{t('settings.taxInclusive')}</option>
                    <option value="exclusive">{t('settings.taxExclusive')}</option>
                  </select>
                </label>

                <div className="grid grid-cols-2 gap-2">
                  <label className="space-y-1">
                    <span className="text-xs font-bold text-[#3D251E]">
                      {t('settings.invoicePrefix')}
                    </span>
                    <input
                      value={storeForm.invoice_prefix || 'INV'}
                      onChange={(e) =>
                        setStoreForm({
                          ...storeForm,
                          invoice_prefix: e.target.value.toUpperCase(),
                        })
                      }
                      maxLength={8}
                      className="w-full rounded border border-[#ECB390] bg-white px-2.5 py-1.5 text-xs font-bold text-[#3D251E] outline-none focus:border-[#DF7861] font-english"
                    />
                  </label>

                  <label className="space-y-1">
                    <span className="text-xs font-bold text-[#3D251E]">
                      {t('settings.currency')}
                    </span>
                    <input
                      value={storeForm.currency_symbol || '₹'}
                      onChange={(e) =>
                        setStoreForm({
                          ...storeForm,
                          currency_symbol: e.target.value,
                        })
                      }
                      className="w-full rounded border border-[#ECB390] bg-white px-2.5 py-1.5 text-xs font-bold text-[#3D251E] outline-none focus:border-[#DF7861] font-english"
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>

          {storeForm.store_name && (
            <div className="flex shrink-0 items-center justify-between rounded border border-[#ECB390] bg-[#ECDFC8]/70 px-3.5 py-1.5 text-xs">
              <span className="font-bold text-[#5C4338]">
                {t('settings.fontPreview')}
              </span>
              <span className="text-sm font-black text-[#3D251E]">
                {localizeDynamicText(storeForm.store_name, isMarathi)}
              </span>
            </div>
          )}
        </form>
      )}

      {/* ── TAB 2: STAFF & CASHIER MANAGEMENT ─────────────────────── */}
      {activeTab === 'staff' && (
        <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-hidden rounded-md border border-[#ECB390] bg-[#FCF8E8] p-4">
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[#ECB390] pb-2.5">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wide text-[#3D251E]">
                {t('settings.staffTitle')}
              </h3>
              <p className="text-[11px] text-[#7A6258]">
                {t('settings.staffSubtitle')}
              </p>
            </div>
            <button
              type="button"
              onClick={handleOpenAddStaff}
              className="flex items-center gap-1.5 rounded bg-[#DF7861] px-4 py-1.5 text-xs font-bold text-[#FCF8E8] hover:bg-[#c9624c]"
            >
              <LuPlus className="h-4 w-4" />
              <span>{t('settings.addStaff')}</span>
            </button>
          </div>

          {/* Bounded Scrollable Staff List Table (Clean headers without "(10 Digits)" or "(Auto-generated)") */}
          <div
            tabIndex={0}
            role="region"
            aria-label={t('settings.staffTitle')}
            className="pos-scroll min-h-0 flex-1 rounded border border-[#ECB390] bg-[#FCF8E8]"
          >
            {staffLoading ? (
              <div className="flex h-full items-center justify-center py-12 text-center text-xs font-bold text-[#7A6258]">
                {t('status.loading')}
              </div>
            ) : staffList.length === 0 ? (
              <div className="flex h-full items-center justify-center py-12 text-center text-xs font-bold text-[#7A6258]">
                {t('settings.noStaffFound')}
              </div>
            ) : (
              <table className="pos-table text-left text-xs">
                <thead className="bg-[#ECB390] text-[11px] font-bold text-[#3D251E]">
                  <tr>
                    <th className="px-3 py-2">{t('settings.staffId')}</th>
                    <th className="px-3 py-2">{t('settings.staffName')}</th>
                    <th className="px-3 py-2">{t('settings.staffUsername')}</th>
                    <th className="px-3 py-2">{t('settings.staffRole')}</th>
                    <th className="px-3 py-2">{t('settings.staffPhone')}</th>
                    <th className="px-3 py-2">{t('settings.docStatus')}</th>
                    <th className="px-3 py-2">{t('settings.accountStatus')}</th>
                    <th className="px-3 py-2 text-right">{t('settings.actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#ECDFC8] bg-[#FCF8E8]">
                  {staffList.map((user) => (
                    <tr key={user.id} className="hover:bg-[#ECDFC8]/60">
                      <td className="px-3 py-2 font-mono text-xs font-bold text-[#3D251E] font-english">
                        {user.staff_id || '—'}
                      </td>
                      <td className="px-3 py-2 font-bold text-[#3D251E]">
                        {localizeDynamicText(user.name, isMarathi)}
                        {user.must_change_password && (
                          <span className="ml-1.5 rounded border border-[#ECB390] bg-[#ECDFC8] px-1.5 py-0.5 text-[9px] font-bold text-[#DF7861]">
                            OTP Pending
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs text-[#5C4338] font-english">
                        {user.username}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`rounded border px-2 py-0.5 text-[10px] font-bold ${
                            user.role === 'ADMIN'
                              ? 'border-[#DF7861] bg-[#DF7861] text-[#FCF8E8]'
                              : 'border-[#ECB390] bg-[#ECDFC8] text-[#3D251E]'
                          }`}
                        >
                          {user.role === 'ADMIN'
                            ? t('user.roleAdmin')
                            : t('user.roleCashier')}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-[#3D251E] font-english">
                        {user.contact_number || '—'}
                      </td>
                      {/* ID Status column: Hide document_ref (Doc Number) as requested */}
                      <td className="px-3 py-2">
                        <div className="flex flex-col gap-0.5">
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#3D251E]">
                            <LuShieldCheck className="h-3.5 w-3.5 text-emerald-700" />
                            <span>
                              {user.document_type
                                ? `${user.document_type} • ${user.document_status || 'VERIFIED'}`
                                : user.document_status || 'VERIFIED'}
                            </span>
                          </span>
                          {user.hard_copy_collected && (
                            <span className="text-[10px] font-semibold text-[#5C4338]">
                              Hard Copy Verified
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`rounded border px-2 py-0.5 text-[10px] font-bold ${
                            user.is_active
                              ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                              : 'border-[#DF7861] bg-[#ECB390]/40 text-[#B93829]'
                          }`}
                        >
                          {user.is_active ? t('status.active') : t('status.inactive')}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setEditStaffModal(user)}
                            className="inline-flex items-center gap-1 rounded border border-[#ECB390] bg-[#ECDFC8] px-2.5 py-1 text-[11px] font-bold text-[#3D251E] hover:bg-[#ECB390] font-english"
                          >
                            <LuPencil className="h-3 w-3 text-[#DF7861]" />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenResetModal(user)}
                            className="inline-flex items-center gap-1 rounded border border-[#ECB390] bg-[#ECDFC8] px-2.5 py-1 text-[11px] font-bold text-[#3D251E] hover:bg-[#ECB390]"
                          >
                            <LuKeyRound className="h-3 w-3 text-[#DF7861]" />
                            <span>{t('settings.resetPassword')}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleStaffStatus(user.id)}
                            className={`rounded px-2.5 py-1 text-[11px] font-bold ${
                              user.is_active
                                ? 'border border-[#DF7861]/60 bg-[#ECB390]/35 text-[#B93829] hover:bg-[#ECB390]/70'
                                : 'border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                            }`}
                          >
                            {user.is_active
                              ? t('settings.deactivate')
                              : t('settings.activate')}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Add Staff Modal (<1MB Upload, Inline View Document, Plain-Text Auto Password, AUTO Badge Kept) */}
          {addStaffOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#3D251E]/60 p-4 backdrop-blur-xs">
              <div className="flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-md border-2 border-[#ECB390] bg-[#FCF8E8] p-5 shadow-2xl">
                <div className="flex shrink-0 items-center justify-between border-b border-[#ECB390] pb-2.5">
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wide text-[#3D251E]">
                      {t('settings.addStaff')}
                    </h3>
                    <p className="text-[11px] text-[#7A6258]">
                      {t('settings.mandatoryNotice')}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAddStaffOpen(false)}
                    className="rounded border border-[#ECB390] bg-[#ECDFC8] px-2 py-0.5 text-xs font-bold text-[#3D251E] hover:bg-[#ECB390]"
                  >
                    <LuX className="h-3.5 w-3.5" />
                  </button>
                </div>

                <form
                  onSubmit={handleCreateStaff}
                  autoComplete="off"
                  className="pos-scroll mt-3 min-h-0 flex-1 space-y-3 pr-1"
                >
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {/* Full Name */}
                    <div>
                      <TransliteratedInput
                        label={t('settings.staffName') + ' *'}
                        required
                        value={staffForm.name}
                        onChangeValue={(val) => handleStaffNameChange(val)}
                        placeholder={
                          isMarathi ? 'उदा. साहिल भालेकर' : 'e.g. Sahil Bhalekar'
                        }
                        className="w-full rounded border border-[#ECB390] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#3D251E] outline-none focus:border-[#DF7861]"
                        showLiveBadge={false}
                      />
                    </div>

                    {/* Login Username (autoComplete="off" prevents browser autofilling "admin") */}
                    <label className="space-y-1">
                      <span className="text-xs font-bold text-[#3D251E]">
                        {t('settings.staffUsername')} *
                      </span>
                      <input
                        required
                        name="new_cashier_login_id"
                        autoComplete="off"
                        value={staffForm.username}
                        onChange={(e) => {
                          setUsernameManuallyEdited(true)
                          setStaffForm({
                            ...staffForm,
                            username: e.target.value.toLowerCase().replace(/\s+/g, ''),
                          })
                        }}
                        placeholder="e.g. cashier_sahil"
                        className="w-full rounded border border-[#ECB390] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#3D251E] outline-none focus:border-[#DF7861] font-english"
                      />
                    </label>

                    {/* Role */}
                    <label className="space-y-1">
                      <span className="text-xs font-bold text-[#3D251E]">
                        {t('settings.staffRole')} *
                      </span>
                      <select
                        required
                        value={staffForm.role}
                        onChange={(e) =>
                          setStaffForm({ ...staffForm, role: e.target.value })
                        }
                        className="w-full rounded border border-[#ECB390] bg-white px-2.5 py-1.5 text-xs font-bold text-[#3D251E] outline-none focus:border-[#DF7861]"
                      >
                        <option value="CASHIER">
                          {t('settings.roleCashierOption')}
                        </option>
                        <option value="ADMIN">
                          {t('settings.roleAdminOption')}
                        </option>
                      </select>
                    </label>

                    {/* Mobile Number (Strict 10-digit Indian Validation + Helper Badge only in creation form) */}
                    <label className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#3D251E]">
                          {t('settings.staffPhone')} *
                        </span>
                        <span
                          className={`text-[10px] font-bold font-english ${
                            staffForm.contact_number
                              ? mobileCheck.valid
                                ? 'text-emerald-700'
                                : 'text-[#B93829]'
                              : 'text-[#7A6258]'
                          }`}
                        >
                          {staffForm.contact_number
                            ? mobileCheck.valid
                              ? '10/10 Valid'
                              : `${staffForm.contact_number.length}/10 digits`
                            : '10 digits'}
                        </span>
                      </div>
                      <input
                        required
                        inputMode="numeric"
                        maxLength={10}
                        value={staffForm.contact_number}
                        onChange={(e) => handleStaffMobileChange(e.target.value)}
                        placeholder="9876543210"
                        className="w-full rounded border border-[#ECB390] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#3D251E] outline-none focus:border-[#DF7861] font-english"
                      />
                    </label>

                    {/* Auto-Generated Employee ID (Keep AUTO Badge inside Add Staff Modal) */}
                    <label className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#3D251E]">
                          {t('settings.staffId')} *
                        </span>
                        <span className="rounded bg-[#DF7861] px-1.5 py-0.2 text-[10px] font-bold text-[#FCF8E8] font-english">
                          AUTO
                        </span>
                      </div>
                      <input
                        required
                        readOnly
                        value={staffForm.staff_id}
                        className="w-full cursor-not-allowed rounded border border-[#ECB390] bg-[#ECDFC8]/70 px-2.5 py-1.5 font-mono text-xs font-bold text-[#3D251E] font-english"
                      />
                    </label>

                    {/* Joining Date */}
                    <label className="space-y-1">
                      <span className="text-xs font-bold text-[#3D251E]">
                        {t('settings.joiningDate')} *
                      </span>
                      <input
                        type="date"
                        required
                        value={staffForm.joining_date}
                        onChange={(e) =>
                          setStaffForm({
                            ...staffForm,
                            joining_date: e.target.value,
                          })
                        }
                        className="w-full rounded border border-[#ECB390] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#3D251E] outline-none focus:border-[#DF7861] font-english"
                      />
                    </label>

                    {/* Identity Card Type */}
                    <label className="space-y-1">
                      <span className="text-xs font-bold text-[#3D251E]">
                        {t('settings.docType')} *
                      </span>
                      <select
                        required
                        value={staffForm.document_type}
                        onChange={(e) => {
                          const newType = e.target.value
                          setStaffForm({
                            ...staffForm,
                            document_type: newType,
                            document_ref: formatIdentityDocumentNumber(
                              newType,
                              staffForm.document_ref,
                            ),
                          })
                        }}
                        className="w-full rounded border border-[#ECB390] bg-white px-2.5 py-1.5 text-xs font-bold text-[#3D251E] outline-none focus:border-[#DF7861]"
                      >
                        <option value="Aadhar">{t('settings.docAadhar')}</option>
                        <option value="PAN">{t('settings.docPan')}</option>
                        <option value="Voter ID">{t('settings.docVoter')}</option>
                        <option value="Driving License">
                          {t('settings.docLicense')}
                        </option>
                      </select>
                    </label>

                    {/* Identity Card Number (Strict Indian Gov Format & Clamping) */}
                    <label className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#3D251E]">
                          {t('settings.docRef')} *
                        </span>
                        {staffForm.document_ref && (
                          <span
                            className={`text-[10px] font-bold ${
                              docCheck.valid ? 'text-emerald-700' : 'text-[#B93829]'
                            }`}
                          >
                            {docCheck.valid ? 'Valid Gov ID' : docCheck.error}
                          </span>
                        )}
                      </div>
                      <input
                        required
                        value={staffForm.document_ref}
                        onChange={(e) =>
                          setStaffForm({
                            ...staffForm,
                            document_ref: formatIdentityDocumentNumber(
                              staffForm.document_type,
                              e.target.value,
                            ),
                          })
                        }
                        placeholder={getIdentityDocumentPlaceholder(
                          staffForm.document_type,
                        )}
                        className="w-full rounded border border-[#ECB390] bg-white px-2.5 py-1.5 font-mono text-xs font-bold text-[#3D251E] outline-none focus:border-[#DF7861] font-english"
                      />
                    </label>
                  </div>

                  {/* Inline Identity Card Upload (<1MB PDF/Image) + View Document Preview + Hard Copy Checkbox */}
                  <div className="rounded-md border border-[#ECB390] bg-[#ECDFC8]/60 p-3">
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <div>
                        <label className="block text-xs font-bold text-[#3D251E]">
                          {t('settings.uploadIdCardLabel')}
                        </label>
                        <p className="mt-0.5 text-[10px] text-[#5C4338]">
                          {t('settings.uploadDocHint')}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded bg-[#DF7861] px-3 py-1.5 text-xs font-bold text-[#FCF8E8] hover:bg-[#c9624c]">
                            <LuUpload className="h-3.5 w-3.5" />
                            <span>
                              {inlineDocFile ? 'Change File' : 'Select PDF / Image'}
                            </span>
                            <input
                              type="file"
                              accept="application/pdf,image/jpeg,image/png,image/webp"
                              onChange={handleInlineKycFileSelect}
                              className="hidden"
                            />
                          </label>
                          {inlineDocFile ? (
                            <>
                              <span className="max-w-[160px] truncate text-[11px] font-bold text-emerald-800 font-english">
                                {inlineDocFile.original_name} (
                                {(inlineDocFile.size_bytes / 1024).toFixed(0)} KB)
                              </span>
                              <button
                                type="button"
                                onClick={() => setPreviewDocOpen((prev) => !prev)}
                                className="inline-flex items-center gap-1 rounded border border-[#ECB390] bg-[#FCF8E8] px-2.5 py-1 text-[11px] font-bold text-[#3D251E] hover:bg-[#ECB390]"
                              >
                                {previewDocOpen ? (
                                  <>
                                    <LuEyeOff className="h-3.5 w-3.5 text-[#DF7861]" />
                                    <span>{t('settings.hideUploadedDoc')}</span>
                                  </>
                                ) : (
                                  <>
                                    <LuEye className="h-3.5 w-3.5 text-[#DF7861]" />
                                    <span>{t('settings.viewUploadedDoc')}</span>
                                  </>
                                )}
                              </button>
                            </>
                          ) : (
                            <span className="text-[11px] font-bold text-[#B93829]">
                              Required (&lt; 1 MB) *
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col justify-center rounded border border-[#ECB390] bg-[#FCF8E8] p-2.5">
                        <label className="flex cursor-pointer items-start gap-2.5">
                          <input
                            type="checkbox"
                            required
                            checked={staffForm.hard_copy_collected}
                            onChange={(e) =>
                              setStaffForm({
                                ...staffForm,
                                hard_copy_collected: e.target.checked,
                              })
                            }
                            className="mt-0.5 h-4 w-4 rounded border-[#ECB390] accent-[#DF7861]"
                          />
                          <div>
                            <div className="text-xs font-bold text-[#3D251E]">
                              {t('settings.hardCopyCollected')} *
                            </div>
                            <div className="text-[10px] text-[#5C4338]">
                              Signed physical photocopy of {staffForm.document_type}{' '}
                              collected in store file.
                            </div>
                          </div>
                        </label>
                      </div>
                    </div>

                    {/* Inline Uploaded Document Preview Box */}
                    {inlineDocFile && previewDocOpen && (
                      <div className="mt-3 rounded border border-[#ECB390] bg-[#FCF8E8] p-2.5">
                        <div className="mb-1.5 flex items-center justify-between text-[11px] font-bold text-[#3D251E]">
                          <span>{inlineDocFile.original_name}</span>
                          <button
                            type="button"
                            onClick={() => setPreviewDocOpen(false)}
                            className="text-xs font-bold text-[#7A6258] hover:text-[#3D251E]"
                          >
                            <LuX className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        {inlineDocFile.mime_type === 'application/pdf' ? (
                          <iframe
                            src={inlineDocFile.document_data}
                            title="Uploaded ID PDF Preview"
                            className="h-48 w-full rounded border border-[#ECB390] bg-white"
                          />
                        ) : (
                          <img
                            src={inlineDocFile.document_data}
                            alt="Uploaded ID Card Preview"
                            className="max-h-48 w-full rounded border border-[#ECB390] bg-white object-contain p-1"
                          />
                        )}
                      </div>
                    )}
                  </div>

                  {/* Single Auto-Generated Plain-Text Initial Password (No Confirm Password needed) */}
                  <div className="rounded-md border border-[#ECB390] bg-[#ECDFC8]/40 p-3">
                    <label className="block space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#3D251E]">
                          {t('settings.password')} *
                        </span>
                        <span className="rounded bg-[#ECDFC8] px-2 py-0.5 text-[10px] font-bold text-[#5C4338]">
                          {t('settings.autoPasswordHint')}
                        </span>
                      </div>
                      <input
                        type="text"
                        required
                        name="new_cashier_initial_pass"
                        autoComplete="off"
                        value={staffForm.password}
                        onChange={(e) => {
                          setPasswordManuallyEdited(true)
                          setStaffForm({ ...staffForm, password: e.target.value })
                        }}
                        placeholder="e.g. sahil9876"
                        className="w-full rounded border border-[#ECB390] bg-white px-2.5 py-1.5 font-mono text-xs font-bold text-[#3D251E] outline-none focus:border-[#DF7861] font-english"
                      />
                    </label>
                  </div>

                  <div className="flex justify-end gap-2 border-t border-[#ECB390] pt-3">
                    <button
                      type="button"
                      onClick={() => setAddStaffOpen(false)}
                      className="rounded border border-[#ECB390] bg-[#ECDFC8] px-4 py-1.5 text-xs font-bold text-[#3D251E] hover:bg-[#ECB390]"
                    >
                      {t('settings.cancel')}
                    </button>
                    <button
                      type="submit"
                      className="rounded bg-[#DF7861] px-5 py-1.5 text-xs font-bold text-[#FCF8E8] hover:bg-[#c9624c]"
                    >
                      {t('settings.addStaff')}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Edit Staff Modal */}
          {editStaffModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#3D251E]/60 p-4 backdrop-blur-xs">
              <div className="w-full max-w-md rounded-md border-2 border-[#ECB390] bg-[#FCF8E8] p-5 shadow-2xl">
                <div className="flex items-center justify-between border-b border-[#ECB390] pb-2.5">
                  <h3 className="text-sm font-bold uppercase text-[#3D251E]">
                    {t('settings.editStaffTitle')} ({editStaffModal.staff_id})
                  </h3>
                  <button
                    type="button"
                    onClick={() => setEditStaffModal(null)}
                    className="rounded border border-[#ECB390] bg-[#ECDFC8] px-2 py-0.5 text-xs font-bold text-[#3D251E]"
                  >
                    <LuX className="h-3.5 w-3.5" />
                  </button>
                </div>
                <form onSubmit={handleEditStaffSubmit} className="mt-3 space-y-3">
                  <div>
                    <TransliteratedInput
                      label={t('settings.staffName') + ' *'}
                      required
                      value={editStaffModal.name}
                      onChangeValue={(val) =>
                        setEditStaffModal({
                          ...editStaffModal,
                          name: val,
                        })
                      }
                      className="w-full rounded border border-[#ECB390] bg-white p-2 text-xs font-semibold text-[#3D251E] outline-none focus:border-[#DF7861]"
                      showLiveBadge={false}
                    />
                  </div>
                  <label className="block space-y-1">
                    <span className="text-xs font-bold text-[#3D251E]">
                      {t('settings.staffPhone')} *
                    </span>
                    <input
                      required
                      inputMode="numeric"
                      maxLength={10}
                      value={editStaffModal.contact_number || ''}
                      onChange={(e) =>
                        setEditStaffModal({
                          ...editStaffModal,
                          contact_number: formatIndianMobile(e.target.value),
                        })
                      }
                      className="w-full rounded border border-[#ECB390] bg-white p-2 text-xs font-semibold text-[#3D251E] outline-none focus:border-[#DF7861] font-english"
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-xs font-bold text-[#3D251E]">
                      {t('settings.docRef')} ({editStaffModal.document_type || 'ID'})
                    </span>
                    <input
                      value={editStaffModal.document_ref || ''}
                      onChange={(e) =>
                        setEditStaffModal({
                          ...editStaffModal,
                          document_ref: formatIdentityDocumentNumber(
                            editStaffModal.document_type || 'Aadhar',
                            e.target.value,
                          ),
                        })
                      }
                      className="w-full rounded border border-[#ECB390] bg-white p-2 font-mono text-xs font-bold text-[#3D251E] outline-none focus:border-[#DF7861] font-english"
                    />
                  </label>
                  <label className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      checked={Boolean(editStaffModal.hard_copy_collected)}
                      onChange={(e) =>
                        setEditStaffModal({
                          ...editStaffModal,
                          hard_copy_collected: e.target.checked,
                        })
                      }
                      className="h-4 w-4 rounded border-[#ECB390] accent-[#DF7861]"
                    />
                    <span className="text-xs font-bold text-[#3D251E]">
                      {t('settings.hardCopyCollected')}
                    </span>
                  </label>
                  <div className="flex justify-end gap-2 border-t border-[#ECB390] pt-3">
                    <button
                      type="button"
                      onClick={() => setEditStaffModal(null)}
                      className="rounded border border-[#ECB390] bg-[#ECDFC8] px-4 py-1.5 text-xs font-bold text-[#3D251E]"
                    >
                      {t('settings.cancel')}
                    </button>
                    <button
                      type="submit"
                      className="rounded bg-[#DF7861] px-5 py-1.5 text-xs font-bold text-[#FCF8E8] hover:bg-[#c9624c]"
                    >
                      {t('settings.save')}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Admin Reset Cashier Password Modal (Requires Cashier Mobile OTP) */}
          {resetPassModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#3D251E]/60 p-4 backdrop-blur-xs">
              <div className="w-full max-w-md rounded-md border-2 border-[#ECB390] bg-[#FCF8E8] p-5 shadow-2xl">
                <div className="flex items-center justify-between border-b border-[#ECB390] pb-2.5">
                  <div>
                    <h3 className="text-sm font-bold text-[#3D251E]">
                      {t('settings.resetPassword')}:{' '}
                      {localizeDynamicText(resetPassModal.name, isMarathi)}
                    </h3>
                    <p className="text-[11px] text-[#7A6258]">
                      {t('settings.otpResetNotice')}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setResetPassModal(null)}
                    className="rounded border border-[#ECB390] bg-[#ECDFC8] px-2 py-0.5 text-xs font-bold text-[#3D251E]"
                  >
                    <LuX className="h-3.5 w-3.5" />
                  </button>
                </div>

                <form onSubmit={handleResetPasswordSubmit} className="mt-3 space-y-3">
                  {/* Step 1: Send Mobile OTP to Cashier's Registered 10-digit Mobile */}
                  <div className="rounded border border-[#ECB390] bg-[#ECDFC8]/60 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="text-[10px] font-bold uppercase text-[#5C4338]">
                          {t('settings.staffPhone')}
                        </div>
                        <div className="text-xs font-black text-[#3D251E] font-english">
                          {resetPassModal.contact_number || 'Not Set'}
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={sendingResetOtp || !resetPassModal.contact_number}
                        onClick={() => void handleSendResetOtp()}
                        className="inline-flex items-center gap-1.5 rounded bg-[#DF7861] px-3 py-1.5 text-xs font-bold text-[#FCF8E8] hover:bg-[#c9624c] disabled:opacity-50"
                      >
                        <LuSmartphone className="h-3.5 w-3.5" />
                        <span>{t('settings.sendResetOtpBtn')}</span>
                      </button>
                    </div>

                    {resetOtpPreview && (
                      <div className="mt-2 flex items-center justify-between rounded border border-[#DF7861] bg-[#FCF8E8] px-2.5 py-1.5 text-xs">
                        <span className="font-bold text-[#5C4338]">
                          Offline Terminal OTP ({resetOtpMaskedMobile}):
                        </span>
                        <span className="font-mono text-sm font-black tracking-widest text-[#DF7861] font-english">
                          {resetOtpPreview}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Step 2: Enter 6-Digit OTP */}
                  <label className="block space-y-1">
                    <span className="text-xs font-bold text-[#3D251E]">
                      {t('settings.enterResetOtpLabel')} *
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      required
                      value={resetOtpCode}
                      onChange={(e) =>
                        setResetOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))
                      }
                      placeholder="6-digit OTP"
                      className="w-full rounded border border-[#ECB390] bg-white p-2 font-mono text-xs font-bold tracking-widest text-[#3D251E] outline-none focus:border-[#DF7861] font-english"
                    />
                  </label>

                  {/* Step 3: New Password (shown in plain text) */}
                  <label className="block space-y-1">
                    <span className="text-xs font-bold text-[#3D251E]">
                      {t('settings.newPasswordLabel')} *
                    </span>
                    <input
                      type="text"
                      required
                      value={newPasswordVal}
                      onChange={(e) => setNewPasswordVal(e.target.value)}
                      className="w-full rounded border border-[#ECB390] bg-white p-2 font-mono text-xs font-bold text-[#3D251E] outline-none focus:border-[#DF7861] font-english"
                    />
                  </label>

                  <div className="flex justify-end gap-2 border-t border-[#ECB390] pt-3">
                    <button
                      type="button"
                      onClick={() => setResetPassModal(null)}
                      className="rounded border border-[#ECB390] bg-[#ECDFC8] px-4 py-1.5 text-xs font-bold text-[#3D251E]"
                    >
                      {t('settings.cancel')}
                    </button>
                    <button
                      type="submit"
                      className="inline-flex items-center gap-1.5 rounded bg-[#DF7861] px-4 py-1.5 text-xs font-bold text-[#FCF8E8] hover:bg-[#c9624c]"
                    >
                      <LuCheck className="h-3.5 w-3.5" />
                      <span>{t('settings.updatePasswordBtn')}</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 3: PAYMENT & UPI SETTINGS ─────────────────────────── */}
      {activeTab === 'payment' && (
        <form
          onSubmit={handleSavePayment}
          className="flex min-h-0 flex-1 flex-col justify-between overflow-hidden rounded-md border border-[#ECB390] bg-[#FCF8E8] p-4"
        >
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[#ECB390] pb-2.5">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wide text-[#3D251E]">
                {t('settings.paymentTitle')}
              </h3>
              <p className="text-[11px] text-[#7A6258]">
                {t('settings.paymentSubtitle')}
              </p>
            </div>
            <button
              type="submit"
              disabled={paymentSaving}
              className="rounded bg-[#DF7861] px-5 py-1.5 text-xs font-bold text-[#FCF8E8] hover:bg-[#c9624c] disabled:opacity-60"
            >
              {paymentSaving ? t('settings.saving') : t('settings.save')}
            </button>
          </div>

          <div className="my-2.5 grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-hidden lg:grid-cols-2">
            <div className="pos-scroll space-y-3 pr-1">
              <div className="flex items-center gap-2.5 rounded border border-[#ECB390] bg-[#ECDFC8]/60 p-3">
                <input
                  type="checkbox"
                  id="upi_toggle"
                  checked={Boolean(paymentForm.upi_enabled)}
                  onChange={(e) =>
                    setPaymentForm({
                      ...paymentForm,
                      upi_enabled: e.target.checked,
                    })
                  }
                  className="h-4 w-4 rounded border-[#ECB390] accent-[#DF7861]"
                />
                <label
                  htmlFor="upi_toggle"
                  className="cursor-pointer text-xs font-bold text-[#3D251E]"
                >
                  {t('settings.upiEnabled')}
                </label>
              </div>

              <label className="block space-y-1">
                <span className="text-xs font-bold text-[#3D251E]">
                  {t('settings.payeeName')}
                </span>
                <input
                  value={paymentForm.payee_name || ''}
                  onChange={(e) =>
                    setPaymentForm({
                      ...paymentForm,
                      payee_name: isMarathi
                        ? liveMarathiPhoneticInput(e.target.value, true)
                        : e.target.value,
                    })
                  }
                  placeholder={t('app.shopPoint')}
                  className="w-full rounded border border-[#ECB390] bg-white px-3 py-1.5 text-xs font-semibold text-[#3D251E] outline-none focus:border-[#DF7861]"
                />
              </label>

              <label className="block space-y-1">
                <span className="text-xs font-bold text-[#3D251E]">
                  {t('settings.upiId')}
                </span>
                <input
                  value={paymentForm.upi_id || ''}
                  onChange={(e) =>
                    setPaymentForm({
                      ...paymentForm,
                      upi_id: e.target.value.toLowerCase(),
                    })
                  }
                  placeholder="vaibhavstore@okhdfcbank"
                  className="w-full rounded border border-[#ECB390] bg-white px-3 py-1.5 text-xs font-mono font-bold text-[#3D251E] outline-none focus:border-[#DF7861] font-english"
                />
              </label>

              <label className="block space-y-1">
                <span className="text-xs font-bold text-[#3D251E]">
                  {t('settings.paymentDesc')}
                </span>
                <input
                  value={paymentForm.payment_description || ''}
                  onChange={(e) =>
                    setPaymentForm({
                      ...paymentForm,
                      payment_description: e.target.value,
                    })
                  }
                  placeholder="Retail Store Payment"
                  className="w-full rounded border border-[#ECB390] bg-white px-3 py-1.5 text-xs font-semibold text-[#3D251E] outline-none focus:border-[#DF7861]"
                />
              </label>

              <div className="rounded border border-[#ECB390] bg-[#ECDFC8]/60 p-3">
                <div className="text-xs font-bold text-[#3D251E]">
                  {t('settings.staticQrTitle')}
                </div>
                <p className="mt-0.5 text-[11px] text-[#7A6258]">
                  {t('settings.staticQrHint')}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <label className="inline-flex cursor-pointer items-center gap-1.5 rounded bg-[#DF7861] px-3.5 py-1.5 text-xs font-bold text-[#FCF8E8] hover:bg-[#c9624c]">
                    <LuUpload className="h-3.5 w-3.5" />
                    <span>{t('settings.staticQrUpload')}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleQrUpload}
                      className="hidden"
                    />
                  </label>
                  {paymentForm.static_qr_image && (
                    <button
                      type="button"
                      onClick={() =>
                        setPaymentForm({ ...paymentForm, static_qr_image: '' })
                      }
                      className="rounded border border-[#DF7861] bg-[#ECB390]/40 px-3 py-1.5 text-xs font-bold text-[#B93829] hover:bg-[#ECB390]"
                    >
                      {t('settings.staticQrRemove')}
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col items-center justify-center rounded border border-[#ECB390] bg-[#ECDFC8]/40 p-4 text-center">
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#7A6258]">
                {t('settings.qrPreview')}
              </div>

              {paymentForm.static_qr_image ? (
                <div className="mt-3 flex flex-col items-center">
                  <img
                    src={paymentForm.static_qr_image}
                    alt="Static UPI QR"
                    className="h-40 w-40 rounded border border-[#ECB390] bg-white object-contain p-2"
                  />
                  <div className="mt-1.5 text-xs font-bold text-[#5C4338]">
                    {t('billing.UploadedStaticQr')}
                  </div>
                </div>
              ) : paymentForm.upi_id ? (
                <div className="mt-3 flex flex-col items-center">
                  <div className="rounded border border-[#ECB390] bg-white p-2.5">
                    <QrCodeCanvas
                      value={`upi://pay?pa=${paymentForm.upi_id}&pn=${encodeURIComponent(
                        paymentForm.payee_name || 'Store',
                      )}&cu=INR`}
                      size={150}
                    />
                  </div>
                  <div className="mt-1.5 text-xs font-mono font-bold text-[#3D251E] font-english">
                    {paymentForm.upi_id}
                  </div>
                  <div className="text-[11px] text-[#7A6258]">
                    {t('billing.autoDynamicQr')}
                  </div>
                </div>
              ) : (
                <div className="mt-4 flex h-40 w-48 items-center justify-center rounded border border-dashed border-[#ECB390] p-4 text-xs font-bold text-[#7A6258]">
                  {t('settings.qrEmptyPrompt')}
                </div>
              )}
            </div>
          </div>
        </form>
      )}
    </div>
  )
}
