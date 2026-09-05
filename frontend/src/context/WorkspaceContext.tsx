import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  type ReactNode,
} from 'react'
import { useTranslation } from 'react-i18next'
import type { Product, Bill, InvoiceDetail, CartItem, FrequentProduct, CurrentUser } from '../types'
import { searchMatchesProduct, transliterateText } from '../utils/transliteration'
import {
  CUSTOM_PACK_OPTION,
  PACK_QUANTITY_OPTIONS,
  isValidPackQuantity,
} from '../constants/productOptions'

const API_URL = 'http://localhost:8000'

interface WorkspaceContextType {
  // Data
  products: Product[]
  bills: Bill[]
  frequentProducts: FrequentProduct[]
  cart: CartItem[]

  // Search
  search: string
  setSearch: (val: string) => void
  filteredProducts: Product[]
  searchPreviewDevanagari: string

  // Cart actions
  addToCart: (product: Product) => void
  updateCartQty: (productId: number, quantity: number) => void

  // Cart calculations
  cartSubtotal: number
  gstTotal: number
  cartTotal: number

  // Payment
  selectedPayment: string
  setSelectedPayment: (method: string) => void
  saveBill: () => void

  // Invoices
  invoiceSearch: string
  setInvoiceSearch: (val: string) => void
  invoiceDateFilter: 'all' | 'today' | 'range'
  setInvoiceDateFilter: (val: 'all' | 'today' | 'range') => void
  invoiceStartDate: string
  setInvoiceStartDate: (val: string) => void
  invoiceEndDate: string
  setInvoiceEndDate: (val: string) => void
  invoiceLoading: boolean
  selectedInvoice: InvoiceDetail | null
  setSelectedInvoice: (inv: InvoiceDetail | null) => void
  invoiceToPrint: InvoiceDetail | null
  setInvoiceToPrint: (inv: InvoiceDetail | null) => void
  openInvoiceDetail: (invoice: Bill) => void
  cancelInvoice: (invoiceId: number) => void
  printInvoice: (invoice: InvoiceDetail | null) => void
  fetchInvoices: () => void

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

  // Cashier Form
  cashierName: string
  setCashierName: (val: string) => void
  cashierUsername: string
  setCashierUsername: (val: string) => void
  cashierPassword: string
  setCashierPassword: (val: string) => void
  submitCashierForm: (event: React.FormEvent<HTMLFormElement>) => void

  // Status
  statusText: string
  setStatusText: (val: string) => void

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

export const WorkspaceProvider: React.FC<{
  children: ReactNode
  token: string
  currentUser: CurrentUser | null
}> = ({ children, token, currentUser }) => {
  // Data
  const [products, setProducts] = useState<Product[]>([])
  const [bills, setBills] = useState<Bill[]>([])
  const [frequentProducts, setFrequentProducts] = useState<FrequentProduct[]>([])
  const [cart, setCart] = useState<CartItem[]>([])

  // Search
  const [search, setSearch] = useState('')
  const [invoiceSearch, setInvoiceSearch] = useState('')
  const [invoiceDateFilter, setInvoiceDateFilter] = useState<'all' | 'today' | 'range'>('all')
  const [invoiceStartDate, setInvoiceStartDate] = useState('')
  const [invoiceEndDate, setInvoiceEndDate] = useState('')
  const [invoiceLoading, setInvoiceLoading] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceDetail | null>(null)
  const [invoiceToPrint, setInvoiceToPrint] = useState<InvoiceDetail | null>(null)

  // Payment
  const [selectedPayment, setSelectedPayment] = useState('CASH')

  // Label / Barcode
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
  const [formCurrentStock, setFormCurrentStock] = useState(10)
  const [formLowStockLevel, setFormLowStockLevel] = useState(2)

  // Cashier Form
  const [cashierName, setCashierName] = useState('')
  const [cashierUsername, setCashierUsername] = useState('')
  const [cashierPassword, setCashierPassword] = useState('')

  // Status
  const [statusText, setStatusText] = useState('')

  const { i18n } = useTranslation()
  const isCurrentLangMr = i18n.language === 'mr' || i18n.language.startsWith('mr')

  const loadFrequentProducts = async (authToken: string = token) => {
    if (!authToken) return
    try {
      const response = await fetch(`${API_URL}/products/frequent`, {
        headers: { Authorization: `Bearer ${authToken}` },
      })
      if (!response.ok) return
      const data: FrequentProduct[] = await response.json()
      setFrequentProducts(data)
    } catch (error) {
      console.error(error)
    }
  }

  const fetchInvoices = async () => {
    if (!token) return
    setInvoiceLoading(true)
    try {
      const params = new URLSearchParams()
      if (invoiceSearch.trim()) params.set('search', invoiceSearch.trim())
      if (invoiceDateFilter === 'today') params.set('date_filter', 'today')
      if (invoiceDateFilter === 'range') {
        if (invoiceStartDate) params.set('start_date', invoiceStartDate)
        if (invoiceEndDate) params.set('end_date', invoiceEndDate)
      }

      const response = await fetch(`${API_URL}/invoices${params.toString() ? `?${params.toString()}` : ''}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!response.ok) throw new Error('Failed to load invoices')

      const data: Bill[] = await response.json()
      setBills(
        data.map((invoice) => ({
          ...invoice,
          amount: Number(invoice.amount ?? invoice.subtotal ?? 0),
          payment_method: invoice.payment_method ?? 'CASH',
          status: invoice.status ?? 'COMPLETED',
          date: invoice.date ?? new Date().toISOString(),
        })),
      )
    } catch (error) {
      console.error(error)
      setStatusText('बिल इतिहास लोड करण्यत त्रुटी आली.')
    } finally {
      setInvoiceLoading(false)
    }
  }

  const refreshWorkspaceData = async () => {
    if (!token) return
    const productsResponse = await fetch(`${API_URL}/products`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (productsResponse.ok) {
      setProducts(await productsResponse.json())
    }
    await fetchInvoices()
    await loadFrequentProducts()
  }

  // Load data when token becomes available
  useEffect(() => {
    if (token) {
      void refreshWorkspaceData()
    }
  }, [token])

  // Smart search
  const filteredProducts = useMemo(() => {
    if (!search.trim()) return []
    return products.filter((product) => searchMatchesProduct(product, search)).slice(0, 12)
  }, [products, search])

  const searchPreviewDevanagari = useMemo(() => {
    const trimmed = search.trim()
    if (!trimmed || /[\u0900-\u097F]/.test(trimmed)) return ''
    const converted = transliterateText(trimmed)
    return converted !== trimmed ? converted : ''
  }, [search])

  // Cart
  const addToCart = (product: Product) => {
    const unitPrice = Number(product.selling_price ?? 0)
    setCart((current) => {
      const existing = current.find((item) => item.id === product.id)
      if (existing) {
        return current.map((item) =>
          item.id === product.id ? { ...item, qty: item.qty + 1 } : item,
        )
      }
      return [
        ...current,
        {
          id: product.id,
          name: product.name_mr,
          unitDisplay: product.unit_display || '',
          unitPrice,
          qty: 1,
          gst: Number(product.gst_rate ?? 0),
        },
      ]
    })
  }

  const updateCartQty = (productId: number, quantity: number) => {
    setCart((current) =>
      current
        .map((item) =>
          item.id === productId ? { ...item, qty: Math.max(0, Math.floor(quantity) || 0) } : item,
        )
        .filter((item) => item.qty > 0),
    )
  }

  const cartSubtotal = cart.reduce((sum, item) => sum + item.unitPrice * item.qty, 0)
  const gstTotal = cart.reduce((sum, item) => sum + (item.unitPrice * item.qty * item.gst) / 100, 0)
  const cartTotal = cartSubtotal + gstTotal

  const resolveProductFromSearch = (): Product | null => {
    const trimmed = search.trim()
    if (!trimmed) return null
    const normalized = trimmed.toLowerCase()
    const barcodeMatch = products.find((product) => (product.barcode || '').toLowerCase() === normalized)
    if (barcodeMatch) return barcodeMatch
    const exactNameMatch = products.find((product) => product.name_mr.trim().toLowerCase() === normalized)
    if (exactNameMatch) return exactNameMatch
    return filteredProducts[0] ?? null
  }

  const handleSearchAdd = () => {
    const product = resolveProductFromSearch()
    if (!product) {
      setStatusText('उत्पादन सापडले नाही.')
      return
    }
    addToCart(product)
    setSearch('')
    setStatusText(`${product.name_mr} कार्टमध्ये जोडले.`)
  }

  const saveBill = async () => {
    if (!token || cart.length === 0) {
      setStatusText('कार्ट रिकामी आहे.')
      return
    }
    try {
      const payload = {
        payment_method: selectedPayment,
        discount: 0,
        items: cart.map((item) => ({ product_id: item.id, quantity: item.qty, discount: 0 })),
      }
      const response = await fetch(`${API_URL}/bills`, {
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
      const data = await response.json()
      setCart([])

      const invoiceListResponse = await fetch(`${API_URL}/invoices?search=${encodeURIComponent(data.invoice_number)}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (invoiceListResponse.ok) {
        const invoiceMatches = await invoiceListResponse.json()
        const latestInvoice = invoiceMatches.find((item: Bill) => item.invoice_number === data.invoice_number)
        if (latestInvoice) {
          const detailResponse = await fetch(`${API_URL}/invoices/${latestInvoice.id}`, {
            headers: { Authorization: `Bearer ${token}` },
          })
          if (detailResponse.ok) {
            const invoiceDetail: InvoiceDetail = await detailResponse.json()
            setSelectedInvoice(invoiceDetail)
            printInvoiceWithDialog(invoiceDetail, `बिल जतन झाले: ${data.invoice_number}`)
          }
        }
      }
      void refreshWorkspaceData()
    } catch (error) {
      console.error(error)
      setStatusText('बिल तयार करण्यात त्रुटी आली.')
    }
  }

  /**
   * Renders the print-only receipt (already mounted off-screen in AppShell),
   * waits for React to commit the DOM, then invokes the browser print dialog.
   * The receipt stays mounted until afterprint (print or cancel) restores the UI.
   */
  const printInvoiceWithDialog = (invoice: InvoiceDetail | null, successMessage: string) => {
    if (!invoice) return
    setInvoiceToPrint(invoice)
    setStatusText('प्रिंट होत आहे...')
    if (typeof window.print !== 'function') {
      console.error('window.print is not available')
      setStatusText(successMessage)
      return
    }
    // Wait two frames so the receipt is rendered/laid out before capturing for print.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const afterPrint = () => {
          window.removeEventListener('afterprint', afterPrint)
          setInvoiceToPrint(null)
          setStatusText(successMessage)
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
      setStatusText('बिल तपशील पाहण्यात त्रुटी आली.')
    }
  }

  const cancelInvoice = async (invoiceId: number) => {
    if (!token || currentUser?.role !== 'ADMIN') return
    const confirmed = window.confirm('तुम्हाला हे बिल रद्द करायचे आहे का? साठा परत जोडला जाईल.')
    if (!confirmed) return
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
      setInvoiceToPrint(cancelledInvoice)
      setStatusText(`बिल रद्द झाला: ${cancelledInvoice.invoice_number}`)
      await fetchInvoices()
    } catch (error) {
      console.error(error)
      setStatusText('बिल रद्द करण्यात त्रुटी आली.')
    }
  }

  const printInvoice = (invoice: InvoiceDetail | null = selectedInvoice) => {
    if (!invoice) return
    printInvoiceWithDialog(invoice, `प्रिंटिंग पूर्ण: ${invoice.invoice_number}`)
  }

  const generateProductBarcode = async () => {
    if (!token || currentUser?.role !== 'ADMIN') {
      setStatusText('केवळ प्रशासक बारकोड तयार करू शकतात.')
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
      setStatusText(`बारकोड तयार झाला: ${data.barcode}`)
    } catch (error) {
      console.error(error)
      setStatusText('बारकोड तयार करण्यात त्रुटी आली.')
    } finally {
      setBarcodeGenerating(false)
    }
  }

  const openLabelDialog = (product: Product) => {
    if (!product.barcode) {
      setStatusText('प्रथम उत्पादनासाठी बारकोड जोडा किंवा तयार करा.')
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
    setStatusText(`लेबल प्रिंटिंग सुरू: ${count} काप्या`)
    if (typeof window.print !== 'function') {
      console.error('window.print is not available')
      setStatusText(`लेबल प्रिंटिंग पूर्ण: ${count} काप्या`)
      return
    }
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const afterLabelPrint = () => {
          window.removeEventListener('afterprint', afterLabelPrint)
          setLabelToPrint(null)
          setStatusText(`लेबल प्रिंटिंग पूर्ण: ${count} काप्या`)
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
      setStatusText('केवळ प्रशासक नवीन उत्पादने जोडू शकतात (403 Forbidden).')
      return
    }

    let packQuantity: number | null = null
    if (formPackQtyPreset === CUSTOM_PACK_OPTION) {
      if (!isValidPackQuantity(formPackQtyCustom)) {
        setStatusText('पॅक प्रमाण योग्य नाही. 0 पेक्षा मोठी संख्या प्रविष्ट करा.')
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
      setStatusText(`उत्पाद जोडला: ${createdProduct.name_mr}`)
      await loadFrequentProducts()
      setFormNameMr('')
      setFormCategoryMr('')
      setFormBarcode('')
      setFormSku('')
      setFormPackQtyPreset(PACK_QUANTITY_OPTIONS[formUnitType]?.[0] ?? '1')
      setFormPackQtyCustom('')
    } catch (error) {
      console.error(error)
      setStatusText('उत्पाद तयार करण्यात त्रुटी आली.')
    }
  }

  const submitCashierForm = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (currentUser?.role !== 'ADMIN' || !token) {
      setStatusText('केवळ प्रशासक नवीन कॅशियर तयार करू शकतात.')
      return
    }
    try {
      const response = await fetch(`${API_URL}/admin/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: cashierName.trim(),
          username: cashierUsername.trim(),
          password: cashierPassword,
        }),
      })
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(errorText)
      }
      setCashierName('')
      setCashierUsername('')
      setCashierPassword('')
      setStatusText('नवीन कॅशियर तयार झाला.')
    } catch (error) {
      console.error(error)
      setStatusText('कॅशियर तयार करण्यात त्रुटी आली.')
    }
  }

  const submitPriceUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!priceModalProduct || !token) return
    const priceNum = parseFloat(newSellingPrice)
    if (isNaN(priceNum) || priceNum <= 0) {
      setPriceModalError('कृपया योग्य नवीन किंमत प्रविष्ट करा.')
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
          reason: priceChangeReason.trim() || 'पुरवठादार दर बदलला',
        }),
      })
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(errorText)
      }
      setProducts((current) =>
        current.map((p) => (p.id === priceModalProduct.id ? { ...p, selling_price: priceNum } : p)),
      )
      setStatusText(`किंमत अद्यतनित झाली: ${priceModalProduct.name_mr} → ₹${priceNum}`)
      setPriceModalProduct(null)
    } catch (error) {
      console.error(error)
      setPriceModalError('किंमत बदलण्यात त्रुटी आली. केवळ प्रशासक किंमत बदलू शकतात.')
    }
  }

  const openPriceModal = (product: Product) => {
    setPriceModalProduct(product)
    setNewSellingPrice(String(product.selling_price ?? ''))
    setPriceChangeReason('')
    setPriceModalError('')
  }

  const value: WorkspaceContextType = {
    products,
    bills,
    frequentProducts,
    cart,
    search,
    setSearch,
    filteredProducts,
    searchPreviewDevanagari,
    addToCart,
    updateCartQty,
    cartSubtotal,
    gstTotal,
    cartTotal,
    selectedPayment,
    setSelectedPayment,
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
    printInvoice,
    fetchInvoices,
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
    token,
    currentUser,
    refreshWorkspaceData,
    isCurrentLangMr,
    handleSearchAdd,
  }

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
}
