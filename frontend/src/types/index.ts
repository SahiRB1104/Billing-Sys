export type SectionKey = 'billing' | 'products' | 'bills' | 'settings'

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
  subtotal?: number
  tax_amount?: number
  discount?: number
  payment_method: string
  status: string
  created_by_username?: string
  created_by_name?: string
  items_count?: number
}

export type InvoiceItem = {
  id: number
  product_id: number
  product_name_mr: string
  unit_display?: string | null
  quantity: number
  unit_price: number
  discount: number
  gst_rate: number
  tax_amount: number
  total: number
}

export type InvoiceDetail = Bill & {
  items: InvoiceItem[]
  subtotal: number
  tax_amount: number
  grand_total: number
}

export type CartItem = {
  id: number
  name: string
  unitDisplay: string
  unitPrice: number
  qty: number
  gst: number
}

export type CurrentUser = {
  username: string
  role: 'ADMIN' | 'CASHIER'
}

export type FrequentProduct = Product & {
  frequency: number
}

export type AuthToken = {
  access_token: string
  token_type: string
}
