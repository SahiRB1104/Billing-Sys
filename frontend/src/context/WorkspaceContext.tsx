import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
  type ReactNode,
} from 'react'
import { useTranslation } from 'react-i18next'
import type {
  Product,
  Bill,
  InvoiceDetail,
  CartItem,
  HeldBillEntry,
  FrequentProduct,
  CurrentUser,
  StoreSettings,
  PaymentSettings,
  StaffUser,
  DashboardStats,
  ToastMessage,
  ToastType,
} from '../types'
import {
  searchMatchesProduct,
  transliterateText,
  devanagariToEnglishApprox,
  localizeDynamicText,
} from '../utils/transliteration'
import {
  CUSTOM_PACK_OPTION,
  PACK_QUANTITY_OPTIONS,
  isValidPackQuantity,
  formatProductName,
} from '../constants/productOptions'

const API_URL = 'http://localhost:8000'

interface WorkspaceContextType {
  // Store & Payment Configuration
  storeSettings: StoreSettings | null
  paymentSettings: PaymentSettings | null
  fetchStoreSettings: () => Promise<void>
  updateStoreSettings: (payload: Partial<StoreSettings>) => Promise<boolean>
  fetchPaymentSettings: () => Promise<void>
  updatePaymentSettings: (payload: Partial<PaymentSettings>) => Promise<boolean>

  // Staff Management
  staffList: StaffUser[]
  staffLoading: boolean
  fetchStaffList: () => Promise<void>
  fetchNextEmployeeCode: (role: string) => Promise<string>
  createStaffMember: (data: any) => Promise<boolean>
  updateStaffMember: (userId: number, data: any) => Promise<boolean>
  toggleStaffStatus: (userId: number) => Promise<boolean>
  sendStaffResetOtp: (
    userId: number,
  ) => Promise<{ sent: boolean; otp_preview?: string; masked_mobile?: string } | null>
  resetStaffPassword: (userId: number, newPass: string, otpCode?: string) => Promise<boolean>
  uploadStaffDocument: (
    userId: number,
    fileData: { original_name: string; mime_type: string; document_data: string },
  ) => Promise<boolean>
  downloadDatabaseBackup: () => Promise<void>

  // Dashboard Stats
  dashboardStats: DashboardStats | null
  dashboardLoading: boolean
  fetchDashboardStats: () => Promise<void>

  // Products & Catalog
  products: Product[]
  bills: Bill[]
  filteredBills: Bill[]
  creditBills: Bill[]
  frequentProducts: FrequentProduct[]
  cart: CartItem[]
  heldCart: CartItem[]
  heldBills: HeldBillEntry[]
  lastAddedItem: CartItem | null

  // Search
  search: string
  setSearch: (val: string) => void
  filteredProducts: Product[]
  searchPreviewDevanagari: string

  // Cart actions
  addToCart: (product: Product, customQty?: number) => void
  updateCartQty: (productId: number, quantity: number) => void
  updateCartDiscount: (productId: number, discount: number) => void
  clearCart: () => void
  holdCurrentBill: () => void
  recallHeldBill: (id?: string) => void
  discardHeldBill: (id: string) => void

  // Cart & Tax Calculations
  cartSubtotal: number
  taxableTotal: number
  cgstTotal: number
  sgstTotal: number
  gstTotal: number
  cartTotal: number
  totalMrpSavings: number
  totalQtyCount: number
  billDiscount: number
  setBillDiscount: (d: number) => void

  // Customer & Payment Checkout Details
  customerName: string
  setCustomerName: (val: string) => void
  customerPhone: string
  setCustomerPhone: (val: string) => void
  cashTendered: string
  setCashTendered: (val: string) => void
  changeReturned: number
  paymentReference: string
  setPaymentReference: (val: string) => void
  selectedPayment: string
  setSelectedPayment: (method: string) => void
  initialPaidAmount: string
  setInitialPaidAmount: (val: string) => void
  initialPaymentMode: string
  setInitialPaymentMode: (val: string) => void

  // UPI Flow & Modal
  upiModalOpen: boolean
  setUpiModalOpen: (open: boolean) => void
  upiUriData: {
    upi_uri: string
    payee_name: string
    upi_id: string
    amount: number
    has_static_qr?: boolean
    static_qr_image?: string
  } | null
  openUpiPaymentModal: () => Promise<void>

  // Checkout commit
  saveBill: (overrideOptions?: {
    payment_method?: string
    payment_reference?: string
  }) => Promise<void>

  // Invoices & History
  invoiceSearch: string
  setInvoiceSearch: (val: string) => void
  invoiceDateFilter: 'all' | 'today' | 'range'
  setInvoiceDateFilter: (val: 'all' | 'today' | 'range') => void
  invoiceStartDate: string
  setInvoiceStartDate: (val: string) => void
  invoiceEndDate: string
  setInvoiceEndDate: (val: string) => void
  invoiceLoading: boolean
  fetchInvoices: (
    filterOverride?: 'all' | 'today' | 'range',
    startOverride?: string,
    endOverride?: string,
  ) => Promise<void>
  selectedInvoice: InvoiceDetail | null
  setSelectedInvoice: (inv: InvoiceDetail | null) => void
  invoiceToPrint: InvoiceDetail | null
  setInvoiceToPrint: (inv: InvoiceDetail | null) => void
  openInvoiceDetail: (invoice: Bill) => void
  cancelInvoice: (invoiceId: number) => void
  returnInvoiceItems: (
    invoiceId: number,
    items: Array<{ invoice_item_id: number; return_quantity: number }>,
    reason?: string,
  ) => Promise<boolean>
  fetchCreditBills: () => Promise<void>
  settleCreditBill: (
    invoiceId: number,
    amount: number,
    paymentMode: string,
    note?: string,
  ) => Promise<boolean>
  printInvoice: (invoice?: InvoiceDetail | null) => void
  exportInvoicesCsv: () => Promise<void>

  // Custom Confirmation Modal (replaces browser window.confirm)
  confirmDialog: {
    open: boolean
    title: string
    message: string
    confirmLabel?: string
    cancelLabel?: string
    danger?: boolean
    onConfirm: () => void
  } | null
  requestConfirm: (options: {
    title: string
    message: string
    confirmLabel?: string
    cancelLabel?: string
    danger?: boolean
    onConfirm: () => void
  }) => void
  closeConfirmDialog: () => void

  // Label / Barcode
  labelToPrint: Product | null
  setLabelToPrint: (p: Product | null) => void
  labelCount: number
  setLabelCount: (n: number) => void
  labelDialogProduct: Product | null
  setLabelDialogProduct: (p: Product | null) => void
  labelDialogCount: number
  setLabelDialogCount: (n: number) => void
  barcodeGenerating: boolean
  generateProductBarcode: () => void
  openLabelDialog: (product: Product) => void
  confirmLabelPrint: () => void

  // Price Modal
  priceModalProduct: Product | null
  setPriceModalProduct: (p: Product | null) => void
  newSellingPrice: string
  setNewSellingPrice: (val: string) => void
  priceChangeReason: string
  setPriceChangeReason: (val: string) => void
  priceModalError: string
  setPriceModalError: (val: string) => void
  openPriceModal: (product: Product) => void
  submitPriceUpdate: (e: React.FormEvent) => void

  // Product Form
  formNameMr: string
  setFormNameMr: (val: string) => void
  formCategoryMr: string
  setFormCategoryMr: (val: string) => void
  formUnitType: string
  setFormUnitType: (val: string) => void
  formPackQtyPreset: string
  setFormPackQtyPreset: (val: string) => void
  formPackQtyCustom: string
  setFormPackQtyCustom: (val: string) => void
  formBarcode: string
  setFormBarcode: (val: string) => void
  formSku: string
  setFormSku: (val: string) => void
  formPurchasePrice: number
  setFormPurchasePrice: (val: number) => void
  formSellingPrice: number
  setFormSellingPrice: (val: number) => void
  formMrp: number
  setFormMrp: (val: number) => void
  formGstRate: number
  setFormGstRate: (val: number) => void
  formCurrentStock: number
  setFormCurrentStock: (val: number) => void
  formLowStockLevel: number
  setFormLowStockLevel: (val: number) => void
  createProduct: (e: React.FormEvent<HTMLFormElement>) => void

  // Cashier Form (legacy backward compatibility)
  cashierName: string
  setCashierName: (val: string) => void
  cashierUsername: string
  setCashierUsername: (val: string) => void
  cashierPassword: string
  setCashierPassword: (val: string) => void
  submitCashierForm: (event: React.FormEvent<HTMLFormElement>) => void

  // Floating Toasts & Status
  statusText: string
  setStatusText: (val: string, type?: ToastType) => void
  notify: (message: string, type?: ToastType) => void
  toasts: ToastMessage[]
  dismissToast: (id: string) => void

  // Auth
  token: string
  currentUser: CurrentUser | null

  // Actions
  refreshWorkspaceData: () => void
  isCurrentLangMr: boolean
  handleSearchAdd: () => void
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined)

export const useWorkspace = () => {
  const ctx = useContext(WorkspaceContext)
  if (!ctx) throw new Error('useWorkspace must be used within WorkspaceProvider')
  return ctx
}

function inferToastType(message: string): ToastType {
  const lower = message.toLowerCase()
  if (
    lower.includes('error') ||
    lower.includes('failed') ||
    lower.includes('insufficient') ||
    lower.includes('not found') ||
    lower.includes('invalid') ||
    lower.includes('त्रुटी') ||
    lower.includes('अपुरा') ||
    lower.includes('नाही') ||
    lower.includes('अयशस्वी')
  ) {
    return 'error'
  }
  if (
    lower.includes('required') ||
    lower.includes('empty') ||
    lower.includes('only admin') ||
    lower.includes('hold') ||
    lower.includes('रिकाम') ||
    lower.includes('आवश्यक') ||
    lower.includes('थांबव')
  ) {
    return 'warning'
  }
  if (lower.includes('printing') || lower.includes('saving') || lower.includes('प्रिंट होत')) {
    return 'info'
  }
  return 'success'
}

export const WorkspaceProvider: React.FC<{
  children: ReactNode
  token: string
  currentUser: CurrentUser | null
}> = ({ children, token, currentUser }) => {
  const { t, i18n } = useTranslation()
  const isCurrentLangMr = i18n.language === 'mr' || i18n.language.startsWith('mr')

  // Floating Toast Notifications State
  const [statusText, setRawStatusText] = useState('')
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((item) => item.id !== id))
  }, [])

  const notify = useCallback(
    (message: string, explicitType?: ToastType) => {
      if (!message || !message.trim()) {
        setRawStatusText('')
        return
      }
      const type = explicitType || inferToastType(message)
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
      setRawStatusText(message)
      setToasts((prev) => [{ id, message, type, createdAt: Date.now() }, ...prev].slice(0, 3))

      window.setTimeout(() => {
        setToasts((prev) => prev.filter((item) => item.id !== id))
      }, 3400)
    },
    [],
  )

  const setStatusText = useCallback(
    (val: string, type?: ToastType) => {
      if (!val) {
        setRawStatusText('')
        setToasts([])
        return
      }
      notify(val, type)
    },
    [notify],
  )

  // Store & Payment Configuration
  const [storeSettings, setStoreSettings] = useState<StoreSettings | null>(null)
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings | null>(null)

  // Staff Management
  const [staffList, setStaffList] = useState<StaffUser[]>([])
  const [staffLoading, setStaffLoading] = useState(false)

  // Dashboard Stats
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null)
  const [dashboardLoading, setDashboardLoading] = useState(false)

  // Catalog Products & Invoices
  const [products, setProducts] = useState<Product[]>([])
  const [bills, setBills] = useState<Bill[]>([])
  const [creditBills, setCreditBills] = useState<Bill[]>([])
  const [frequentProducts, setFrequentProducts] = useState<FrequentProduct[]>([])

  // Cart & Held Bills Queue (Up to 5 held bills)
  const [cart, setCart] = useState<CartItem[]>([])
  const [heldBills, setHeldBills] = useState<HeldBillEntry[]>([])
  const heldCart = useMemo(() => heldBills[0]?.items || [], [heldBills])
  const [lastAddedItem, setLastAddedItem] = useState<CartItem | null>(null)
  const [billDiscount, setBillDiscount] = useState<number>(0)

  // Custom Confirmation Dialog State (replaces native browser window.confirm)
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    title: string
    message: string
    confirmLabel?: string
    cancelLabel?: string
    danger?: boolean
    onConfirm: () => void
  } | null>(null)

  const requestConfirm = useCallback(
    (options: {
      title: string
      message: string
      confirmLabel?: string
      cancelLabel?: string
      danger?: boolean
      onConfirm: () => void
    }) => {
      setConfirmDialog({
        open: true,
        ...options,
      })
    },
    [],
  )

  const closeConfirmDialog = useCallback(() => {
    setConfirmDialog(null)
  }, [])

  // Checkout Customer & Payment
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [cashTendered, setCashTendered] = useState('')
  const [paymentReference, setPaymentReference] = useState('')
  const [selectedPayment, setSelectedPayment] = useState('CASH')
  const [initialPaidAmount, setInitialPaidAmount] = useState('')
  const [initialPaymentMode, setInitialPaymentMode] = useState('CASH')

  // UPI Flow & Modal
  const [upiModalOpen, setUpiModalOpen] = useState(false)
  const [upiUriData, setUpiUriData] = useState<{
    upi_uri: string
    payee_name: string
    upi_id: string
    amount: number
    has_static_qr?: boolean
    static_qr_image?: string
  } | null>(null)

  // Search & Filters
  const [search, setSearch] = useState('')
  const [invoiceSearch, setInvoiceSearch] = useState('')
  const [invoiceDateFilter, setInvoiceDateFilter] = useState<'all' | 'today' | 'range'>('all')
  const [invoiceStartDate, setInvoiceStartDate] = useState('')
  const [invoiceEndDate, setInvoiceEndDate] = useState('')
  const [invoiceLoading, setInvoiceLoading] = useState(false)
  const invoicesReqIdRef = useRef(0)
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceDetail | null>(null)
  const [invoiceToPrint, setInvoiceToPrint] = useState<InvoiceDetail | null>(null)

  // Barcode Label Print
  const [labelToPrint, setLabelToPrint] = useState<Product | null>(null)
  const [labelCount, setLabelCount] = useState(1)
  const [labelDialogProduct, setLabelDialogProduct] = useState<Product | null>(null)
  const [labelDialogCount, setLabelDialogCount] = useState(1)
  const [barcodeGenerating, setBarcodeGenerating] = useState(false)

  // Price Modal
  const [priceModalProduct, setPriceModalProduct] = useState<Product | null>(null)
  const [newSellingPrice, setNewSellingPrice] = useState('')
  const [priceChangeReason, setPriceChangeReason] = useState('')
  const [priceModalError, setPriceModalError] = useState('')

  // Product Form
  const [formNameMr, setFormNameMr] = useState('')
  const [formCategoryMr, setFormCategoryMr] = useState('')
  const [formUnitType, setFormUnitType] = useState('किलो')
  const [formPackQtyPreset, setFormPackQtyPreset] = useState('1')
  const [formPackQtyCustom, setFormPackQtyCustom] = useState('')
  const [formBarcode, setFormBarcode] = useState('')
  const [formSku, setFormSku] = useState('')
  const [formPurchasePrice, setFormPurchasePrice] = useState(0)
  const [formSellingPrice, setFormSellingPrice] = useState(0)
  const [formMrp, setFormMrp] = useState(0)
  const [formGstRate, setFormGstRate] = useState(5)
  const [formCurrentStock, setFormCurrentStock] = useState(0)
  const [formLowStockLevel, setFormLowStockLevel] = useState(0)

  // Legacy cashier form fields
  const [cashierName, setCashierName] = useState('')
  const [cashierUsername, setCashierUsername] = useState('')
  const [cashierPassword, setCashierPassword] = useState('')

  // ── Store Settings API ─────────────────────────────────────────────

  const fetchStoreSettings = async () => {
    if (!token) return
    try {
      const res = await fetch(`${API_URL}/api/settings/store`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setStoreSettings(data)
      }
    } catch (err) {
      console.error('Failed to load store settings', err)
    }
  }

  const updateStoreSettings = async (payload: Partial<StoreSettings>): Promise<boolean> => {
    if (!token) return false
    try {
      const res = await fetch(`${API_URL}/api/settings/store`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: t('msg.storeSaveError') }))
        notify(localizeDynamicText(err.detail, isCurrentLangMr) || t('msg.storeSaveError'), 'error')
        return false
      }
      const data = await res.json()
      setStoreSettings(data)
      notify(t('msg.storeSaved'), 'success')
      return true
    } catch (err) {
      console.error(err)
      notify(t('msg.storeSaveError'), 'error')
      return false
    }
  }

  // ── Payment Settings API ───────────────────────────────────────────

  const fetchPaymentSettings = async () => {
    if (!token) return
    try {
      const res = await fetch(`${API_URL}/api/settings/payment`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setPaymentSettings(data)
      }
    } catch (err) {
      console.error('Failed to load payment settings', err)
    }
  }

  const updatePaymentSettings = async (payload: Partial<PaymentSettings>): Promise<boolean> => {
    if (!token) return false
    try {
      const res = await fetch(`${API_URL}/api/settings/payment`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: t('msg.paymentSaveError') }))
        notify(localizeDynamicText(err.detail, isCurrentLangMr) || t('msg.paymentSaveError'), 'error')
        return false
      }
      const data = await res.json()
      setPaymentSettings(data)
      notify(t('msg.paymentSaved'), 'success')
      return true
    } catch (err) {
      console.error(err)
      notify(t('msg.paymentSaveError'), 'error')
      return false
    }
  }

  // ── Staff Management API ───────────────────────────────────────────

  const fetchStaffList = async () => {
    if (!token || currentUser?.role !== 'ADMIN') return
    try {
      setStaffLoading(true)
      const res = await fetch(`${API_URL}/admin/staff`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setStaffList(data)
      }
    } catch (err) {
      console.error('Failed to load staff list', err)
    } finally {
      setStaffLoading(false)
    }
  }

  const createStaffMember = async (data: any): Promise<boolean> => {
    if (!token || currentUser?.role !== 'ADMIN') return false
    try {
      const res = await fetch(`${API_URL}/admin/staff`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: t('msg.staffCreateError') }))
        notify(localizeDynamicText(err.detail, isCurrentLangMr) || t('msg.staffCreateError'), 'error')
        return false
      }
      await fetchStaffList()
      notify(t('msg.staffCreated', { name: data.name }), 'success')
      return true
    } catch (err) {
      console.error(err)
      notify(t('msg.staffCreateError'), 'error')
      return false
    }
  }

  const updateStaffMember = async (userId: number, data: any): Promise<boolean> => {
    if (!token || currentUser?.role !== 'ADMIN') return false
    try {
      const res = await fetch(`${API_URL}/admin/staff/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: t('msg.staffUpdateError') }))
        notify(localizeDynamicText(err.detail, isCurrentLangMr) || t('msg.staffUpdateError'), 'error')
        return false
      }
      await fetchStaffList()
      notify(t('msg.staffUpdated'), 'success')
      return true
    } catch (err) {
      console.error(err)
      notify(t('msg.staffUpdateError'), 'error')
      return false
    }
  }

  const toggleStaffStatus = async (userId: number): Promise<boolean> => {
    if (!token || currentUser?.role !== 'ADMIN') return false
    try {
      const res = await fetch(`${API_URL}/admin/staff/${userId}/status`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: t('msg.staffUpdateError') }))
        notify(localizeDynamicText(err.detail, isCurrentLangMr) || t('msg.staffUpdateError'), 'error')
        return false
      }
      await fetchStaffList()
      notify(t('msg.staffStatusChanged'), 'success')
      return true
    } catch (err) {
      console.error(err)
      return false
    }
  }

  const sendStaffResetOtp = async (
    userId: number,
  ): Promise<{ sent: boolean; otp_preview?: string; masked_mobile?: string } | null> => {
    if (!token || currentUser?.role !== 'ADMIN') return null
    try {
      const res = await fetch(`${API_URL}/admin/staff/${userId}/send-reset-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: t('msg.passwordResetError') }))
        notify(localizeDynamicText(err.detail, isCurrentLangMr) || t('msg.passwordResetError'), 'error')
        return null
      }
      const data = await res.json()
      notify(
        isCurrentLangMr
          ? `कॅशियरच्या मोबाईलवर OTP पाठवला (${data.masked_mobile || ''})`
          : `OTP sent to cashier mobile (${data.masked_mobile || ''})`,
        'info',
      )
      return data
    } catch (err) {
      console.error(err)
      notify(t('msg.passwordResetError'), 'error')
      return null
    }
  }

  const resetStaffPassword = async (
    userId: number,
    newPass: string,
    otpCode?: string,
  ): Promise<boolean> => {
    if (!token || currentUser?.role !== 'ADMIN') return false
    try {
      const res = await fetch(`${API_URL}/admin/staff/${userId}/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ new_password: newPass, otp_code: otpCode || '' }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: t('msg.passwordResetError') }))
        notify(localizeDynamicText(err.detail, isCurrentLangMr) || t('msg.passwordResetError'), 'error')
        return false
      }
      notify(t('msg.passwordResetSuccess'), 'success')
      return true
    } catch (err) {
      console.error(err)
      return false
    }
  }

  const uploadStaffDocument = async (
    userId: number,
    fileData: { original_name: string; mime_type: string; document_data: string },
  ): Promise<boolean> => {
    if (!token || currentUser?.role !== 'ADMIN') return false
    try {
      const res = await fetch(`${API_URL}/admin/staff/${userId}/documents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(fileData),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: t('msg.docUploadError') }))
        notify(localizeDynamicText(err.detail, isCurrentLangMr) || t('msg.docUploadError'), 'error')
        return false
      }
      await fetchStaffList()
      notify(t('msg.docUploaded', { name: fileData.original_name }), 'success')
      return true
    } catch (err) {
      console.error(err)
      return false
    }
  }

  const fetchNextEmployeeCode = async (role: string = 'CASHIER'): Promise<string> => {
    if (!token || currentUser?.role !== 'ADMIN') return 'EMP-001'
    try {
      const res = await fetch(
        `${API_URL}/admin/staff/next-code?role=${encodeURIComponent(role)}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      )
      if (res.ok) {
        const data = await res.json()
        if (data?.staff_id) return String(data.staff_id)
      }
    } catch (err) {
      console.error('Failed to fetch next employee code', err)
    }
    return role === 'ADMIN' ? 'ADM-001' : 'EMP-001'
  }

  const downloadDatabaseBackup = async (): Promise<void> => {
    if (!token || currentUser?.role !== 'ADMIN') return
    try {
      const res = await fetch(`${API_URL}/admin/database/backup`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Backup failed')
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `store_backup_${new Date().toISOString().slice(0, 10)}.db`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
      notify('Offline SQLite database backup downloaded.', 'success')
    } catch (err) {
      console.error(err)
      notify('Failed to download database backup.', 'error')
    }
  }

  // ── Dashboard Stats API ────────────────────────────────────────────

  const fetchDashboardStats = async () => {
    if (!token) return
    try {
      setDashboardLoading(true)
      const res = await fetch(`${API_URL}/api/dashboard/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setDashboardStats(data)
      }
    } catch (err) {
      console.error('Failed to load dashboard stats', err)
    } finally {
      setDashboardLoading(false)
    }
  }

  // ── Products & Invoices API ────────────────────────────────────────

  const fetchProducts = async () => {
    if (!token) return
    try {
      const res = await fetch(`${API_URL}/products`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setProducts(data)
      }
    } catch (err) {
      console.error(err)
    }
  }

  const loadFrequentProducts = async () => {
    if (!token) return
    try {
      const res = await fetch(`${API_URL}/products/frequent?limit=8`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setFrequentProducts(data)
      }
    } catch (err) {
      console.error(err)
    }
  }

  const fetchInvoices = async (
    filterOverride?: 'all' | 'today' | 'range',
    startOverride?: string,
    endOverride?: string,
  ) => {
    if (!token) return
    const activeReqId = ++invoicesReqIdRef.current
    setInvoiceLoading(true)
    try {
      const activeFilter = filterOverride !== undefined ? filterOverride : invoiceDateFilter
      const activeStart = startOverride !== undefined ? startOverride : invoiceStartDate
      const activeEnd = endOverride !== undefined ? endOverride : invoiceEndDate

      const params = new URLSearchParams()
      if (activeFilter === 'today') {
        params.append('date_filter', 'today')
      } else if (activeFilter === 'range') {
        if (activeStart) params.append('start_date', activeStart)
        if (activeEnd) params.append('end_date', activeEnd)
      }
      const res = await fetch(`${API_URL}/invoices?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        if (activeReqId === invoicesReqIdRef.current) {
          setBills(data)
        }
      }
    } catch (err) {
      console.error(err)
    } finally {
      if (activeReqId === invoicesReqIdRef.current) {
        setInvoiceLoading(false)
      }
    }
  }

  const fetchCreditBills = async () => {
    if (!token) return
    try {
      const res = await fetch(`${API_URL}/credits`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setCreditBills(data)
      }
    } catch (err) {
      console.error('Failed to load credit bills', err)
    }
  }

  // Live instant client-side filter for Bills (updates on every keystroke without hitting Enter)
  const filteredBills = useMemo(() => {
    const q = invoiceSearch.trim().toLowerCase()
    if (!q) return bills
    const devanagariQ = transliterateText(q).toLowerCase()
    const phoneticQ = devanagariToEnglishApprox(q).toLowerCase()

    return bills.filter((bill) => {
      const invNum = (bill.invoice_number || '').toLowerCase()
      const custName = (bill.customer_name || '').toLowerCase()
      const custNameMr = transliterateText(bill.customer_name || '').toLowerCase()
      const custNameEn = devanagariToEnglishApprox(bill.customer_name || '').toLowerCase()
      const custPhone = (bill.customer_phone || '').toLowerCase()
      const payMethod = (bill.payment_method || '').toLowerCase()
      const status = (bill.status === 'VOIDED' ? 'cancelled' : (bill.status || '')).toLowerCase()

      return (
        invNum.includes(q) ||
        custName.includes(q) ||
        custName.includes(devanagariQ) ||
        custNameMr.includes(q) ||
        custNameMr.includes(devanagariQ) ||
        custNameEn.includes(q) ||
        (phoneticQ && custName.includes(phoneticQ)) ||
        (phoneticQ && custNameEn.includes(phoneticQ)) ||
        (phoneticQ && invNum.includes(phoneticQ)) ||
        custPhone.includes(q) ||
        payMethod.includes(q) ||
        status.includes(q)
      )
    })
  }, [bills, invoiceSearch])

  const exportInvoicesCsv = async () => {
    if (!token) return
    try {
      const params = new URLSearchParams()
      if (invoiceSearch.trim()) params.append('search', invoiceSearch.trim())
      if (invoiceDateFilter === 'today') {
        params.append('date_filter', 'today')
      } else if (invoiceDateFilter === 'range') {
        if (invoiceStartDate) params.append('start_date', invoiceStartDate)
        if (invoiceEndDate) params.append('end_date', invoiceEndDate)
      }
      const res = await fetch(`${API_URL}/invoices/export?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Export failed')
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `invoices_export_${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
      notify(t('msg.csvExported'), 'success')
    } catch (err) {
      console.error(err)
      notify(t('msg.csvExportError'), 'error')
    }
  }

  const refreshWorkspaceData = () => {
    void fetchProducts()
    void loadFrequentProducts()
    void fetchInvoices()
    void fetchCreditBills()
    void fetchStoreSettings()
    void fetchPaymentSettings()
    void fetchDashboardStats()
    if (currentUser?.role === 'ADMIN') {
      void fetchStaffList()
    }
  }

  useEffect(() => {
    if (token) {
      refreshWorkspaceData()
    }
  }, [token])

  // ── Cart & Tax Calculations ────────────────────────────────────────

  const addToCart = (product: Product, customQty?: number) => {
    const qtyToAdd = customQty !== undefined ? customQty : 1
    const available = product.current_stock ?? 0
    const existing = cart.find((item) => item.id === product.id)
    const currentCartQty = existing ? existing.qty : 0
    const displayName = formatProductName(product.name_mr, isCurrentLangMr)

    if (currentCartQty + qtyToAdd > available) {
      notify(t('msg.outOfStock', { name: displayName, stock: available }), 'error')
      return
    }

    const updatedItem: CartItem = {
      id: product.id,
      name: product.name_mr,
      barcode: product.barcode,
      unitDisplay: product.unit_display || '',
      unitPrice: Number(product.selling_price ?? 0),
      mrp: product.mrp ? Number(product.mrp) : Number(product.selling_price ?? 0),
      qty: currentCartQty + qtyToAdd,
      gst: Number(product.gst_rate ?? 0),
      discount: existing?.discount ?? 0,
      availableStock: available,
    }

    setLastAddedItem(updatedItem)

    setCart((current) => {
      if (existing) {
        return current.map((item) =>
          item.id === product.id ? updatedItem : item,
        )
      }
      return [...current, updatedItem]
    })

    notify(t('msg.addedToCart', { name: displayName }), 'success')
  }

  const updateCartQty = (productId: number, quantity: number) => {
    const product = products.find((p) => p.id === productId)
    const available = product?.current_stock ?? 999999
    const displayName = formatProductName(product?.name_mr || '', isCurrentLangMr)

    if (quantity > available) {
      notify(t('msg.outOfStock', { name: displayName, stock: available }), 'error')
      quantity = available
    }

    setCart((current) =>
      current
        .map((item) =>
          item.id === productId ? { ...item, qty: Math.max(0, quantity) } : item,
        )
        .filter((item) => item.qty > 0),
    )
  }

  const updateCartDiscount = (productId: number, discount: number) => {
    setCart((current) =>
      current.map((item) =>
        item.id === productId ? { ...item, discount: Math.max(0, discount) } : item,
      ),
    )
  }

  const clearCart = () => {
    setCart([])
    setLastAddedItem(null)
    setBillDiscount(0)
    setCustomerName('')
    setCustomerPhone('')
    setCashTendered('')
    setPaymentReference('')
    setInitialPaidAmount('')
    setInitialPaymentMode('CASH')
    notify(t('msg.cartCleared'), 'info')
  }

  const holdCurrentBill = () => {
    if (cart.length === 0) {
      if (heldBills.length > 0) {
        recallHeldBill(heldBills[0].id)
      } else {
        notify(t('msg.cartEmpty'), 'warning')
      }
      return
    }
    if (heldBills.length >= 5) {
      notify('Maximum 5 bills can be held at a time. Recall or discard one first.', 'warning')
      return
    }
    const estTotal = cart.reduce(
      (sum, item) => sum + Math.max(0, item.unitPrice * item.qty - (item.discount || 0)),
      0,
    )
    const entry: HeldBillEntry = {
      id: `hold-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      customerName: customerName.trim() || `Walk-in #${heldBills.length + 1}`,
      customerPhone: customerPhone.trim(),
      items: cart,
      discount: billDiscount || 0,
      heldAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      totalAmount: Math.max(0, Number((estTotal - (billDiscount || 0)).toFixed(2))),
    }
    setHeldBills((prev) => [entry, ...prev])
    setCart([])
    setLastAddedItem(null)
    setBillDiscount(0)
    setCustomerName('')
    setCustomerPhone('')
    notify(t('msg.billHeld', { count: cart.length }), 'warning')
  }

  const recallHeldBill = (id?: string) => {
    if (heldBills.length === 0) {
      notify(t('msg.noHeldBill'), 'warning')
      return
    }
    const target = id ? heldBills.find((b) => b.id === id) || heldBills[0] : heldBills[0]
    setCart(target.items)
    setBillDiscount(target.discount || 0)
    setCustomerName(target.customerName.startsWith('Walk-in #') ? '' : target.customerName)
    setCustomerPhone(target.customerPhone || '')
    setHeldBills((prev) => prev.filter((b) => b.id !== target.id))
    notify(t('msg.billRecalled'), 'info')
  }

  const discardHeldBill = (id: string) => {
    setHeldBills((prev) => prev.filter((b) => b.id !== id))
    notify('Held bill removed from queue.', 'info')
  }

  // Respect storeSettings tax_inclusive configuration
  const isTaxInclusive = storeSettings ? storeSettings.tax_inclusive : true

  const {
    cartSubtotal,
    taxableTotal,
    cgstTotal,
    sgstTotal,
    gstTotal,
    cartTotal,
    totalMrpSavings,
    totalQtyCount,
  } = useMemo(() => {
    let rawSubtotal = 0
    let totalTaxable = 0
    let totalGst = 0
    let mrpSavings = 0
    let qtySum = 0

    for (const item of cart) {
      const lineRaw = item.unitPrice * item.qty - (item.discount || 0)
      const lineTotal = Math.max(0, lineRaw)
      const rate = item.gst || 0
      const itemMrp = item.mrp && item.mrp > item.unitPrice ? item.mrp : item.unitPrice
      mrpSavings += (itemMrp - item.unitPrice) * item.qty + (item.discount || 0)
      qtySum += item.qty

      if (isTaxInclusive) {
        const taxable = rate > 0 ? lineTotal / (1 + rate / 100) : lineTotal
        const tax = lineTotal - taxable
        rawSubtotal += lineTotal
        totalTaxable += taxable
        totalGst += tax
      } else {
        const taxable = lineTotal
        const tax = taxable * (rate / 100)
        rawSubtotal += lineTotal + tax
        totalTaxable += taxable
        totalGst += tax
      }
    }

    const finalTotal = Math.max(0, rawSubtotal - (billDiscount || 0))
    const cgst = totalGst / 2
    const sgst = totalGst / 2

    return {
      cartSubtotal: Number(rawSubtotal.toFixed(2)),
      taxableTotal: Number(totalTaxable.toFixed(2)),
      cgstTotal: Number(cgst.toFixed(2)),
      sgstTotal: Number(sgst.toFixed(2)),
      gstTotal: Number(totalGst.toFixed(2)),
      cartTotal: Number(finalTotal.toFixed(2)),
      totalMrpSavings: Number((mrpSavings + (billDiscount || 0)).toFixed(2)),
      totalQtyCount: Number(qtySum.toFixed(2)),
    }
  }, [cart, billDiscount, isTaxInclusive])

  const changeReturned = useMemo(() => {
    const tendered = parseFloat(cashTendered)
    if (isNaN(tendered) || tendered <= 0) return 0
    return Math.max(0, Number((tendered - cartTotal).toFixed(2)))
  }, [cashTendered, cartTotal])

  // ── Product Search & Quick Add ─────────────────────────────────────

  const searchPreviewDevanagari = useMemo(() => {
    const trimmed = search.trim()
    if (!trimmed) return ''
    const transliterated = transliterateText(trimmed)
    return transliterated !== trimmed ? transliterated : ''
  }, [search])

  const filteredProducts = useMemo(() => {
    const trimmed = search.trim()
    if (!trimmed) return products
    return products.filter((product) => searchMatchesProduct(product, trimmed))
  }, [products, search])

  const resolveProductFromSearch = (): Product | null => {
    const trimmed = search.trim()
    if (!trimmed) return null
    const normalized = trimmed.toLowerCase()
    const barcodeMatch = products.find(
      (product) => (product.barcode || '').toLowerCase() === normalized,
    )
    if (barcodeMatch) return barcodeMatch
    const exactNameMatch = products.find(
      (product) => product.name_mr.trim().toLowerCase() === normalized,
    )
    if (exactNameMatch) return exactNameMatch
    return filteredProducts[0] ?? null
  }

  const handleSearchAdd = () => {
    const product = resolveProductFromSearch()
    if (!product) {
      notify(t('msg.productNotFound', { query: search.trim() }), 'error')
      return
    }
    addToCart(product)
    setSearch('')
  }

  // ── UPI Modal Flow ─────────────────────────────────────────────────

  const openUpiPaymentModal = async () => {
    if (!token || cart.length === 0) {
      notify(t('msg.cartEmpty'), 'warning')
      return
    }
    try {
      const res = await fetch(`${API_URL}/api/payments/upi-uri?amount=${cartTotal}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: t('msg.upiConfigError') }))
        notify(localizeDynamicText(err.detail, isCurrentLangMr) || t('msg.upiConfigError'), 'error')
        return
      }
      const data = await res.json()
      setUpiUriData(data)
      setUpiModalOpen(true)
    } catch (err) {
      console.error(err)
      notify(t('msg.upiConfigError'), 'error')
    }
  }

  // ── Checkout & Bill Commit ─────────────────────────────────────────

  const saveBill = async (overrideOptions?: {
    payment_method?: string
    payment_reference?: string
  }) => {
    if (!token || cart.length === 0) {
      notify(t('msg.cartEmpty'), 'warning')
      return
    }

    const payMethod = overrideOptions?.payment_method || selectedPayment
    const payRef = overrideOptions?.payment_reference || paymentReference

    if (payMethod === 'CASH' && cashTendered.trim()) {
      const tendered = parseFloat(cashTendered)
      if (tendered < cartTotal) {
        notify(t('msg.insufficientCash', { tendered, total: cartTotal }), 'error')
        return
      }
    }

    if (payMethod === 'CREDIT') {
      const cleanPhone = customerPhone.replace(/\D/g, '')
      if (!customerName.trim() || cleanPhone.length !== 10) {
        notify(
          isCurrentLangMr
            ? 'उधारी बिलासाठी ग्राहकाचे नाव आणि १० अंकी मोबाईल क्रमांक आवश्यक आहे.'
            : 'Customer Name and valid 10-digit Mobile Number are required for Udhari (Credit) bills.',
          'warning',
        )
        return
      }
    }

    const parsedInitialPaid =
      payMethod === 'CREDIT' && initialPaidAmount.trim()
        ? Math.max(0, Math.min(cartTotal, parseFloat(initialPaidAmount) || 0))
        : 0

    try {
      const payload = {
        payment_method: payMethod,
        discount: billDiscount || 0,
        items: cart.map((item) => ({
          product_id: item.id,
          quantity: item.qty,
          discount: item.discount || 0,
        })),
        customer_name: customerName.trim() || null,
        customer_phone: customerPhone.replace(/\D/g, '').slice(0, 10) || null,
        payment_reference: payRef.trim() || null,
        cash_tendered: cashTendered.trim() ? parseFloat(cashTendered) : null,
        change_returned: changeReturned > 0 ? changeReturned : null,
        initial_paid_amount: payMethod === 'CREDIT' ? parsedInitialPaid : null,
        initial_payment_mode: payMethod === 'CREDIT' ? initialPaymentMode : null,
        idempotency_key: `pos-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      }

      notify(t('msg.savingBill'), 'info')
      const response = await fetch(`${API_URL}/bills`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: t('msg.billFailed') }))
        throw new Error(errorData.detail || t('msg.billFailed'))
      }

      const data = await response.json()
      setCart([])
      setLastAddedItem(null)
      setBillDiscount(0)
      setCustomerName('')
      setCustomerPhone('')
      setCashTendered('')
      setPaymentReference('')
      setInitialPaidAmount('')
      setInitialPaymentMode('CASH')
      setUpiModalOpen(false)

      notify(t('msg.billCompleted', { number: data.invoice_number }), 'success')

      // Fetch invoice detail for receipt printing
      const detailResponse = await fetch(`${API_URL}/invoices/${data.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (detailResponse.ok) {
        const invoiceDetail: InvoiceDetail = await detailResponse.json()
        setSelectedInvoice(invoiceDetail)
        printInvoiceWithDialog(invoiceDetail)
      }

      refreshWorkspaceData()
    } catch (error: any) {
      console.error(error)
      notify(localizeDynamicText(error.message, isCurrentLangMr) || t('msg.billFailed'), 'error')
    }
  }

  const printInvoiceWithDialog = (invoice: InvoiceDetail | null, announceOpening = false) => {
    if (!invoice) return
    setInvoiceToPrint(invoice)
    if (announceOpening) {
      notify(t('msg.printingReceipt'), 'info')
    }
    if (typeof window.print !== 'function') {
      return
    }
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const afterPrint = () => {
          window.removeEventListener('afterprint', afterPrint)
          setInvoiceToPrint(null)
        }
        window.addEventListener('afterprint', afterPrint)
        window.print()
      })
    })
  }

  const openInvoiceDetail = async (invoice: Bill) => {
    if (!token) return
    try {
      const response = await fetch(`${API_URL}/invoices/${invoice.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!response.ok) throw new Error('Failed to load invoice detail')
      const detail: InvoiceDetail = await response.json()
      setSelectedInvoice(detail)
    } catch (error) {
      console.error(error)
      notify(t('msg.invoiceLoadError'), 'error')
    }
  }

  const cancelInvoice = (invoiceId: number) => {
    if (!token || currentUser?.role !== 'ADMIN') return
    requestConfirm({
      title: t('bills.cancelBill'),
      message: t('bills.cancelConfirm'),
      confirmLabel: t('bills.cancelBill'),
      cancelLabel: t('common.cancel'),
      danger: true,
      onConfirm: async () => {
        try {
          const response = await fetch(`${API_URL}/invoices/${invoiceId}/cancel`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
          })
          if (!response.ok) {
            const errorText = await response.text()
            throw new Error(errorText)
          }
          const cancelledInvoice = await response.json()
          setSelectedInvoice(cancelledInvoice)
          notify(t('msg.invoiceCancelled', { number: cancelledInvoice.invoice_number }), 'warning')
          await fetchInvoices()
          void fetchCreditBills()
          void fetchProducts()
          void fetchDashboardStats()
        } catch (error) {
          console.error(error)
          notify(t('msg.invoiceCancelError'), 'error')
        }
      },
    })
  }

  const returnInvoiceItems = async (
    invoiceId: number,
    items: Array<{ invoice_item_id: number; return_quantity: number }>,
    reason?: string,
  ): Promise<boolean> => {
    if (!token) return false
    try {
      const response = await fetch(`${API_URL}/invoices/${invoiceId}/return-items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          items,
          reason: reason || 'Customer item return',
        }),
      })
      if (!response.ok) {
        const err = await response.json().catch(() => ({ detail: 'Failed to return items' }))
        notify(err.detail || 'Failed to return items', 'error')
        return false
      }
      const data = await response.json()
      const returnInv: InvoiceDetail = data.return_invoice || data
      setSelectedInvoice(returnInv)
      notify(t('bills.returnSuccessBillCreated'), 'success')
      if (data.udhari_deducted && data.udhari_deducted > 0) {
        notify(`${t('bills.udhariDeductionNotice')} (₹${data.udhari_deducted})`, 'info')
      }
      await fetchInvoices()
      void fetchCreditBills()
      void fetchProducts()
      void fetchDashboardStats()
      return true
    } catch (error) {
      console.error(error)
      notify('Failed to process item return', 'error')
      return false
    }
  }

  const settleCreditBill = async (
    invoiceId: number,
    amount: number,
    paymentMode: string,
    note?: string,
  ): Promise<boolean> => {
    if (!token) return false
    try {
      const response = await fetch(`${API_URL}/credits/${invoiceId}/settle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount,
          payment_mode: paymentMode,
          note: note || null,
        }),
      })
      if (!response.ok) {
        const err = await response.json().catch(() => ({ detail: 'Failed to settle credit' }))
        notify(err.detail || 'Failed to settle credit', 'error')
        return false
      }
      const data = await response.json()
      if (data?.settlement_invoice) {
        setSelectedInvoice(data.settlement_invoice)
      }
      notify(
        data?.settlement_invoice_number
          ? t('msg.creditSettled', { number: data.settlement_invoice_number })
          : t('bills.settleSuccess'),
        'success',
      )
      await fetchCreditBills()
      await fetchInvoices()
      void fetchDashboardStats()
      return true
    } catch (error) {
      console.error(error)
      notify('Failed to record payment', 'error')
      return false
    }
  }

  const printInvoice = (invoice: InvoiceDetail | null = selectedInvoice) => {
    if (!invoice) return
    printInvoiceWithDialog(invoice, true)
  }

  // ── Barcode Generation & Product Label Printing ───────────────────

  const generateProductBarcode = async () => {
    if (!token || currentUser?.role !== 'ADMIN') {
      notify(t('msg.adminOnlyBarcode'), 'warning')
      return
    }
    try {
      setBarcodeGenerating(true)
      const response = await fetch(`${API_URL}/products/barcode/generate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(errorText)
      }
      const data = await response.json()
      setFormBarcode(String(data.barcode))
      notify(t('msg.barcodeGenerated', { barcode: data.barcode }), 'success')
    } catch (error) {
      console.error(error)
      notify(t('msg.barcodeError'), 'error')
    } finally {
      setBarcodeGenerating(false)
    }
  }

  const openLabelDialog = (product: Product) => {
    if (!product.barcode) {
      notify(t('msg.barcodeRequiredForLabel'), 'warning')
      return
    }
    setLabelDialogProduct(product)
    setLabelDialogCount(Math.max(1, product.current_stock || 1))
  }

  const confirmLabelPrint = () => {
    if (!labelDialogProduct || !labelDialogProduct.barcode) return
    const count = Math.max(1, Number(labelDialogCount) || 1)
    setLabelDialogProduct(null)
    setInvoiceToPrint(null)
    setLabelToPrint(labelDialogProduct)
    setLabelCount(count)
    notify(t('msg.labelPrintStart', { count }), 'info')
    if (typeof window.print !== 'function') {
      notify(t('msg.labelPrintDone', { count }), 'success')
      return
    }
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const afterLabelPrint = () => {
          window.removeEventListener('afterprint', afterLabelPrint)
          setLabelToPrint(null)
          notify(t('msg.labelPrintDone', { count }), 'success')
        }
        window.addEventListener('afterprint', afterLabelPrint)
        window.print()
      })
    })
  }

  const createProduct = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!token) return
    if (currentUser?.role !== 'ADMIN') {
      notify(t('msg.adminOnlyProduct'), 'warning')
      return
    }

    let packQuantity: number | null = null
    if (formPackQtyPreset === CUSTOM_PACK_OPTION) {
      if (!isValidPackQuantity(formPackQtyCustom)) {
        notify(t('msg.invalidPackQty'), 'error')
        return
      }
      packQuantity = Number(formPackQtyCustom.trim())
    } else {
      packQuantity = Number(formPackQtyPreset)
    }

    const payload = {
      name_mr: formNameMr.trim(),
      barcode: formBarcode.trim() || null,
      sku: formSku.trim() || null,
      category_mr: formCategoryMr.trim() || null,
      unit_type: formUnitType.trim() || null,
      pack_quantity: packQuantity,
      purchase_price: Number(formPurchasePrice),
      selling_price: Number(formSellingPrice),
      mrp: Number(formMrp),
      gst_rate: Number(formGstRate),
      current_stock: Number(formCurrentStock),
      low_stock_level: Number(formLowStockLevel),
    }

    try {
      const response = await fetch(`${API_URL}/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(errorText)
      }
      const createdProduct = await response.json()
      setProducts((current) => [createdProduct, ...current])
      const displayName = formatProductName(createdProduct.name_mr, isCurrentLangMr)
      notify(t('msg.productCreated', { name: displayName }), 'success')
      await loadFrequentProducts()
      setFormNameMr('')
      setFormCategoryMr('')
      setFormBarcode('')
      setFormSku('')
      setFormPackQtyPreset(PACK_QUANTITY_OPTIONS[formUnitType]?.[0] ?? '1')
      setFormPackQtyCustom('')
    } catch (error) {
      console.error(error)
      notify(t('msg.productCreateError'), 'error')
    }
  }

  // Legacy Cashier Creation Form Handler
  const submitCashierForm = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (currentUser?.role !== 'ADMIN' || !token) {
      notify(t('msg.adminOnlyProduct'), 'warning')
      return
    }
    const success = await createStaffMember({
      name: cashierName.trim(),
      username: cashierUsername.trim(),
      password: cashierPassword,
      role: 'CASHIER',
    })
    if (success) {
      setCashierName('')
      setCashierUsername('')
      setCashierPassword('')
    }
  }

  const submitPriceUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!priceModalProduct || !token) return
    const priceNum = parseFloat(newSellingPrice)
    if (isNaN(priceNum) || priceNum <= 0) {
      setPriceModalError(t('msg.invalidPrice'))
      return
    }
    try {
      const response = await fetch(`${API_URL}/products/${priceModalProduct.id}/price`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          new_price: priceNum,
          reason: priceChangeReason.trim() || 'Supplier rate revised',
        }),
      })
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(errorText)
      }
      setProducts((current) =>
        current.map((p) => (p.id === priceModalProduct.id ? { ...p, selling_price: priceNum } : p)),
      )
      const displayName = formatProductName(priceModalProduct.name_mr, isCurrentLangMr)
      notify(t('msg.priceUpdated', { name: displayName, price: priceNum }), 'success')
      setPriceModalProduct(null)
    } catch (error) {
      console.error(error)
      setPriceModalError(t('msg.priceUpdateError'))
    }
  }

  const openPriceModal = (product: Product) => {
    setPriceModalProduct(product)
    setNewSellingPrice(String(product.selling_price ?? ''))
    setPriceChangeReason('')
    setPriceModalError('')
  }

  const value: WorkspaceContextType = {
    storeSettings,
    paymentSettings,
    fetchStoreSettings,
    updateStoreSettings,
    fetchPaymentSettings,
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
    uploadStaffDocument,
    downloadDatabaseBackup,
    dashboardStats,
    dashboardLoading,
    fetchDashboardStats,
    products,
    bills,
    filteredBills,
    creditBills,
    frequentProducts,
    cart,
    heldCart,
    heldBills,
    lastAddedItem,
    search,
    setSearch,
    filteredProducts,
    searchPreviewDevanagari,
    addToCart,
    updateCartQty,
    updateCartDiscount,
    clearCart,
    holdCurrentBill,
    recallHeldBill,
    discardHeldBill,
    cartSubtotal,
    taxableTotal,
    cgstTotal,
    sgstTotal,
    gstTotal,
    cartTotal,
    totalMrpSavings,
    totalQtyCount,
    billDiscount,
    setBillDiscount,
    customerName,
    setCustomerName,
    customerPhone,
    setCustomerPhone,
    cashTendered,
    setCashTendered,
    changeReturned,
    paymentReference,
    setPaymentReference,
    selectedPayment,
    setSelectedPayment,
    initialPaidAmount,
    setInitialPaidAmount,
    initialPaymentMode,
    setInitialPaymentMode,
    upiModalOpen,
    setUpiModalOpen,
    upiUriData,
    openUpiPaymentModal,
    saveBill,
    invoiceSearch,
    setInvoiceSearch,
    invoiceDateFilter,
    setInvoiceDateFilter,
    invoiceStartDate,
    setInvoiceStartDate,
    invoiceEndDate,
    setInvoiceEndDate,
    invoiceLoading,
    selectedInvoice,
    setSelectedInvoice,
    invoiceToPrint,
    setInvoiceToPrint,
    openInvoiceDetail,
    cancelInvoice,
    returnInvoiceItems,
    fetchCreditBills,
    settleCreditBill,
    printInvoice,
    fetchInvoices,
    exportInvoicesCsv,
    confirmDialog,
    requestConfirm,
    closeConfirmDialog,
    labelToPrint,
    setLabelToPrint,
    labelCount,
    setLabelCount,
    labelDialogProduct,
    setLabelDialogProduct,
    labelDialogCount,
    setLabelDialogCount,
    barcodeGenerating,
    generateProductBarcode,
    openLabelDialog,
    confirmLabelPrint,
    priceModalProduct,
    setPriceModalProduct,
    newSellingPrice,
    setNewSellingPrice,
    priceChangeReason,
    setPriceChangeReason,
    priceModalError,
    setPriceModalError,
    openPriceModal,
    submitPriceUpdate,
    formNameMr,
    setFormNameMr,
    formCategoryMr,
    setFormCategoryMr,
    formUnitType,
    setFormUnitType,
    formPackQtyPreset,
    setFormPackQtyPreset,
    formPackQtyCustom,
    setFormPackQtyCustom,
    formBarcode,
    setFormBarcode,
    formSku,
    setFormSku,
    formPurchasePrice,
    setFormPurchasePrice,
    formSellingPrice,
    setFormSellingPrice,
    formMrp,
    setFormMrp,
    formGstRate,
    setFormGstRate,
    formCurrentStock,
    setFormCurrentStock,
    formLowStockLevel,
    setFormLowStockLevel,
    createProduct,
    cashierName,
    setCashierName,
    cashierUsername,
    setCashierUsername,
    cashierPassword,
    setCashierPassword,
    submitCashierForm,
    statusText,
    setStatusText,
    notify,
    toasts,
    dismissToast,
    token,
    currentUser,
    refreshWorkspaceData,
    isCurrentLangMr,
    handleSearchAdd,
  }

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
}
