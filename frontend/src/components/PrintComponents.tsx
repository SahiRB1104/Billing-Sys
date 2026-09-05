import React, { useEffect, useRef } from 'react'
import bwipjs from 'bwip-js'
import type { InvoiceDetail, Product } from '../types'

export const BarcodeCanvas: React.FC<{ value: string }> = ({ value }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    if (!canvasRef.current || !value) return
    try {
      bwipjs.toCanvas(canvasRef.current, {
        bcid: 'code128',
        text: value,
        scale: 1.8,
        height: 18,
        width: 1.2,
        includetext: true,
        textxalign: 'center',
        textsize: 10,
        paddingbottom: 4,
        paddingtop: 4,
      })
    } catch (error) {
      console.error('Barcode render failed', error)
    }
  }, [value])

  return <canvas ref={canvasRef} className="barcode-canvas" />
}

interface ReceiptPrintProps {
  invoice: InvoiceDetail | null
  cashierName?: string
}

export const ReceiptPrint: React.FC<ReceiptPrintProps> = ({ invoice, cashierName }) => {
  if (!invoice) return null

  const receiptCashier = invoice.created_by_username || cashierName || 'Admin'
  const isCancelled = invoice.status === 'CANCELLED'

  return (
    <div className="receipt-print-only" aria-live="polite">
      <div className="receipt-shell">
        <div className="receipt-header">
          <div className="receipt-shop-name">श्री वैभव स्टोअर</div>
          <div className="receipt-shop-name-en">SHOP NAME</div>
          <div className="receipt-shop-meta">सोलापूर, महाराष्ट्र</div>
          <div className="receipt-shop-meta">फोन: +91 98765 43210</div>
          <div className="receipt-shop-meta">GSTIN: 27ABCDE1234F1Z5</div>
        </div>

        <div className="receipt-divider" />

        <div className="receipt-info">
          <div className="info-row">
            <span className="info-label">बिल क्र.:</span>
            <span className="info-value">{invoice.invoice_number}</span>
          </div>
          <div className="info-row">
            <span className="info-label">दिनांक:</span>
            <span className="info-value">{new Date(invoice.date).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' })}</span>
          </div>
          <div className="info-row">
            <span className="info-label">कॅशियर:</span>
            <span className="info-value">{receiptCashier}</span>
          </div>
        </div>

        {isCancelled && <div className="receipt-status">रद्द / CANCELLED</div>}

        <div className="receipt-divider" />

        <div className="receipt-table-header" aria-label="Receipt item table heading">
          <span className="item-name-col">उत्पादन</span>
          <span className="qty-col">प्रमाण</span>
          <span className="mult-col">×</span>
          <span className="rate-col">दर</span>
          <span className="amount-col">रक्कम</span>
        </div>

        <div className="receipt-divider" />

        {invoice.items.map((item) => (
          <div key={item.id} className="receipt-item-row">
            <div className="receipt-item-name">
              <div>{item.product_name_mr}</div>
              {item.unit_display ? (
                <div className="receipt-item-unit">{item.unit_display}</div>
              ) : null}
            </div>
            <span className="qty-col">{Number(item.quantity).toFixed(0)}</span>
            <span className="mult-col">×</span>
            <span className="rate-col">₹{Number(item.unit_price).toFixed(2)}</span>
            <span className="amount-col">₹{Number(item.total).toFixed(2)}</span>
          </div>
        ))}

        <div className="receipt-divider" />

        <div className="receipt-total-row">
          <span className="total-label">उपएकूण:</span>
          <span className="total-value">₹{Number(invoice.subtotal ?? 0).toFixed(2)}</span>
        </div>
        <div className="receipt-total-row">
          <span className="total-label">सूट:</span>
          <span className="total-value">₹{Number(invoice.discount ?? 0).toFixed(2)}</span>
        </div>
        <div className="receipt-total-row">
          <span className="total-label">कर / GST:</span>
          <span className="total-value">₹{Number(invoice.tax_amount ?? 0).toFixed(2)}</span>
        </div>

        <div className="receipt-divider" />

        <div className="receipt-grand-total">
          <span className="total-label">एकूण देय:</span>
          <span className="total-value">₹{Number(invoice.grand_total ?? invoice.amount ?? 0).toFixed(2)}</span>
        </div>

        <div className="receipt-divider" />

        <div className="receipt-payment-row">
          <span className="total-label">पेमेंट:</span>
          <span className="total-value">{invoice.payment_method}</span>
        </div>

        <div className="receipt-divider" />
        <div className="receipt-footer">धन्यवाद! पुन्हा भेट द्या</div>
      </div>
    </div>
  )
}

export const BarcodeLabelPrint: React.FC<{ product: Product | null; count?: number }> = ({
  product,
  count = 1,
}) => {
  if (!product || !product.barcode) return null

  return (
    <div className="barcode-label-print-root" aria-live="polite">
      <div className="barcode-label-sheet">
        {Array.from({ length: Math.max(1, count) }, (_, index) => (
          <div key={`${product.id}-${index}`} className="barcode-label-card">
            <div className="barcode-label-name">
              <div>{product.name_mr}</div>
              {product.unit_display ? (
                <div className="barcode-label-unit">{product.unit_display}</div>
              ) : null}
            </div>
            <div className="barcode-label-body">
              <BarcodeCanvas value={product.barcode ?? ''} />
              <div className="barcode-label-number">{product.barcode}</div>
              {product.selling_price !== null && product.selling_price !== undefined && (
                <div className="barcode-label-price">₹{Number(product.selling_price).toFixed(2)}</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
