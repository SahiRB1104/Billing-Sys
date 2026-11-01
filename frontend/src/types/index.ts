export type SectionKey = 'dashboard' | 'billing' | 'products' | 'bills' | 'settings'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export type ToastMessage = {
  id: string
  message: string
  type: ToastType
  createdAt: number
}

export type Product = {
  id: number
  name_mr: string
  barcode: string | null
  sku: string | null
  category_mr: string | null
  unit: string | null
  unit_type: string | null
  pack_quantity: number | null
  unit_display: string | null
  purchase_price: number | null
  selling_price: number | null
  mrp: number | null
  gst_rate: number | null
  current_stock: number
  low_stock_level: number
  is_active: boolean
  created_at: string | null
}

export type Bill = {
  id: number
  invoice_number: string
  date: string
  amount: number
  subtotal: number
  tax_amount: number
  taxable_amount?: number
  cgst_amount?: number
  sgst_amount?: number
  discount: number
  grand_total: number
  payment_method: string
  payment_status?: string
  status: string
  created_by_username?: string
  created_by_name?: string
  items_count?: number
  customer_name?: string | null
  customer_phone?: string | null
  payment_reference?: string | null
  cash_tendered?: number | null
  change_returned?: number | null
  notes?: string | null
  paid_amount?: number
  balance_due?: number
  is_settled?: boolean
  parent_invoice_id?: number | null
  has_cancel_record?: boolean
  days_pending?: number
  is_returnable?: boolean
  elapsed_hours?: number
  return_window_hours?: number
  parent_invoice_number?: string | null
}

export type InvoiceItem = {
  id: number
  product_id: number
  product_name_mr: string
  unit_display?: string | null
  quantity: number
  returned_quantity?: number
  unit_price: number
  discount: number
  gst_rate: number
  tax_amount: number
  total: number
}

export type HeldBillEntry = {
  id: string
  label?: string
  customerName: string
  customerPhone: string
  items: CartItem[]
  discount?: number
  heldAt: string
  totalAmount: number
}

export type InvoiceDetail = Bill & {
  items: InvoiceItem[]
  settlement_history?: Array<{
    id: number
    amount: number
    payment_mode: string
    reference_note?: string
    settled_at?: string
  }>
  linked_bills?: Array<{
    id: number
    invoice_number: string
    date: string
    type: string
    amount: number
    payment_method: string
    payment_status?: string
    notes?: string
  }>
}

export type CartItem = {
  id: number
  name: string
  barcode?: string | null
  unitDisplay: string
  unitPrice: number
  mrp?: number
  qty: number
  gst: number
  discount?: number
  availableStock: number
}

export type CurrentUser = {
  id?: number
  username: string
  name?: string
  role: 'ADMIN' | 'CASHIER'
  contact_number?: string | null
  email?: string | null
  staff_id?: string | null
  must_change_password?: boolean
}

export type FrequentProduct = Product & {
  frequency: number
}

export type AuthToken = {
  access_token: string
  token_type: string
}

export type StoreSettings = {
  id: number
  store_name: string
  owner_name?: string | null
  address?: string | null
  city?: string | null
  state?: string | null
  pin_code?: string | null
  country?: string | null
  phone?: string | null
  email?: string | null
  gst_enabled: boolean
  gstin?: string | null
  business_logo?: string | null
  invoice_prefix: string
  currency_symbol: string
  locale: string
  receipt_header?: string | null
  receipt_footer?: string | null
  tax_inclusive: boolean
  default_gst_rate: number | null
  updated_at?: string | null
}

export type PaymentSettings = {
  id: number
  upi_enabled: boolean
  payee_name?: string | null
  upi_id?: string | null
  payment_description?: string | null
  has_static_qr?: boolean
  static_qr_image?: string | null
  gateway_enabled: boolean
  gateway_provider?: string | null
  updated_at?: string | null
}

export type StaffUser = {
  id: number
  name: string
  username: string
  role: 'ADMIN' | 'CASHIER'
  is_active: boolean
  contact_number?: string | null
  email?: string | null
  address?: string | null
  staff_id?: string | null
  joining_date?: string | null
  document_type?: string | null
  document_ref?: string | null
  document_status?: string | null
  document_notes?: string | null
  document_submitted_at?: string | null
  hard_copy_collected?: boolean
  must_change_password?: boolean
  documents_count?: number
  created_at?: string | null
  updated_at?: string | null
}

export type StaffDocument = {
  id: number
  original_name: string
  mime_type: string
  file_size: number
  document_data?: string | null
  uploaded_at: string
}

export type DashboardStats = {
  today_sales: number
  today_bills_count: number
  total_products_count: number
  low_stock_count: number
  low_stock_products: Product[]
  payment_breakdown: Record<string, { count: number; amount: number }>
  recent_invoices: Bill[]
  daily_trend: Array<{ date: string; day_name: string; sales: number; count: number }>
  total_udhari_due?: number
  udhari_bills_count?: number
  priority_udhari_bills?: Bill[]
}
