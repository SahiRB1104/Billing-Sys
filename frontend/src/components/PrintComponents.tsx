import React, { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import bwipjs from 'bwip-js'
import { localizeDynamicText } from '../utils/transliteration'
import { formatProductName, formatUnitDisplay } from '../constants/productOptions'
import type { InvoiceDetail, Product, StoreSettings } from '../types'

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

export const QrCodeCanvas: React.FC<{ value: string; size?: number; className?: string }> = ({
  value,
  size = 180,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    if (!canvasRef.current || !value) return
    try {
      bwipjs.toCanvas(canvasRef.current, {
        bcid: 'qrcode',
        text: value,
        scale: 3,
        height: Math.round(size / 8),
        width: Math.round(size / 8),
        paddingtop: 2,
        paddingbottom: 2,
        paddingleft: 2,
        paddingright: 2,
      })
    } catch (error) {
      console.error('QR code render failed', error)
    }
  }, [value, size])

  return <canvas ref={canvasRef} className={`mx-auto block ${className}`} />
}

interface ReceiptPrintProps {
  invoice: InvoiceDetail | null
  cashierName?: string
  storeSettings?: StoreSettings | null
}

export const ReceiptPrint: React.FC<ReceiptPrintProps> = ({
  invoice,
  cashierName,
  storeSettings,
}) => {
  const { t, i18n } = useTranslation()
  const isMarathi = (i18n.language || 'mr').startsWith('mr')

  if (!invoice) return null

  const receiptCashier = localizeDynamicText(
    invoice.created_by_username || cashierName || 'Admin',
    isMarathi,
  )
  const isCancelled = invoice.status === 'CANCELLED'

  const rawShopName = storeSettings?.store_name || 'श्री वैभव स्टोअर'
  const shopName = localizeDynamicText(rawShopName, isMarathi)
  const rawAddress =
    [storeSettings?.address, storeSettings?.city, storeSettings?.state]
      .filter(Boolean)
      .join(', ') || 'सोलापूर, महाराष्ट्र'
  const shopAddress = localizeDynamicText(rawAddress, isMarathi)
  const shopPhone = storeSettings?.phone || '+91 98765 43210'
  const gstin = storeSettings?.gst_enabled && storeSettings?.gstin ? storeSettings.gstin : null
  const headerMessage = localizeDynamicText(
    storeSettings?.receipt_header || '|| श्री गणेशाय नमः ||',
    isMarathi,
  )
  const footerMessage = localizeDynamicText(
    storeSettings?.receipt_footer || 'धन्यवाद! पुन्हा भेट द्या.',
    isMarathi,
  )

  return (
    <div className="receipt-print-only" aria-live="polite">
      <div className="receipt-shell">
        <div className="receipt-header">
          {headerMessage && (
            <div className="font-marathi text-[7.5px] font-bold text-slate-600 mb-0.5">
              {headerMessage}
            </div>
          )}
          <div className="receipt-shop-name font-marathi">{shopName}</div>
          <div className="receipt-shop-meta">{shopAddress}</div>
          <div className="receipt-shop-meta font-english">
            {t('settings.phone')}: {shopPhone}
          </div>
          {gstin && <div className="receipt-shop-meta font-bold font-english">GSTIN: {gstin}</div>}
        </div>

        <div className="receipt-divider" />

        <div className="receipt-info">
          <div className="info-row">
            <span className="info-label">{t('bills.billNo')}:</span>
            <span className="info-value font-bold font-english">{invoice.invoice_number}</span>
          </div>
          <div className="info-row">
            <span className="info-label">{t('bills.date')}:</span>
            <span className="info-value font-english">
              {new Date(invoice.date).toLocaleString(isMarathi ? 'mr-IN' : 'en-GB', {
                dateStyle: 'short',
                timeStyle: 'short',
              })}
            </span>
          </div>
          <div className="info-row">
            <span className="info-label">{t('bills.createdBy')}:</span>
            <span className="info-value">{receiptCashier}</span>
          </div>
          {invoice.customer_name && (
            <div className="info-row">
              <span className="info-label">{t('bills.customer')}:</span>
              <span className="info-value">
                {localizeDynamicText(invoice.customer_name, isMarathi)}
              </span>
            </div>
          )}
          {invoice.customer_phone && (
            <div className="info-row">
              <span className="info-label">{t('billing.customerPhone')}:</span>
              <span className="info-value font-english">{invoice.customer_phone}</span>
            </div>
          )}
        </div>

        {isCancelled && (
          <div className="receipt-status text-red-600 font-black">
            {t('bills.cancelledBadge')}
          </div>
        )}

        <div className="receipt-divider" />

        <div className="receipt-table-header" aria-label="Receipt item table heading">
          <span className="item-name-col">{t('bills.items')}</span>
          <span className="qty-col font-english">QTY</span>
          <span className="mult-col font-english">×</span>
          <span className="rate-col font-english">RATE</span>
          <span className="amount-col font-english">TOTAL</span>
        </div>

        <div className="receipt-divider" />

        {invoice.items.map((item) => (
          <div key={item.id} className="receipt-item-row">
            <div className="receipt-item-name">
              <div>{formatProductName(item.product_name_mr, isMarathi)}</div>
              {item.unit_display ? (
                <div className="receipt-item-unit">
                  {formatUnitDisplay(item.unit_display, isMarathi)}
                </div>
              ) : null}
            </div>
            <span className="qty-col font-english">
              {Number(item.quantity).toFixed(item.quantity % 1 === 0 ? 0 : 2)}
            </span>
            <span className="mult-col font-english">×</span>
            <span className="rate-col font-english">₹{Number(item.unit_price).toFixed(2)}</span>
            <span className="amount-col font-bold font-english">
              ₹{Number(item.total).toFixed(2)}
            </span>
          </div>
        ))}

        <div className="receipt-divider" />

        <div className="receipt-total-row">
          <span className="total-label">{t('bills.subtotal')}:</span>
          <span className="total-value font-english">
            ₹{Number(invoice.subtotal ?? 0).toFixed(2)}
          </span>
        </div>

        {Number(invoice.discount ?? 0) > 0 && (
          <div className="receipt-total-row">
            <span className="total-label">{t('bills.discount')}:</span>
            <span className="total-value text-slate-700 font-english">
              -₹{Number(invoice.discount).toFixed(2)}
            </span>
          </div>
        )}

        {Number(invoice.taxable_amount ?? 0) > 0 && (
          <div className="receipt-total-row">
            <span className="total-label">{t('cart.taxable')}:</span>
            <span className="total-value font-english">
              ₹{Number(invoice.taxable_amount).toFixed(2)}
            </span>
          </div>
        )}

        {Number(invoice.cgst_amount ?? 0) > 0 && (
          <div className="receipt-total-row font-english">
            <span className="total-label">CGST:</span>
            <span className="total-value">₹{Number(invoice.cgst_amount).toFixed(2)}</span>
          </div>
        )}

        {Number(invoice.sgst_amount ?? 0) > 0 && (
          <div className="receipt-total-row font-english">
            <span className="total-label">SGST:</span>
            <span className="total-value">₹{Number(invoice.sgst_amount).toFixed(2)}</span>
          </div>
        )}

        <div className="receipt-divider" />

        <div className="receipt-grand-total">
          <span className="total-label font-black">{t('bills.grandTotal')}:</span>
          <span className="total-value font-black text-[10px] font-english">
            ₹{Number(invoice.grand_total ?? invoice.amount ?? 0).toFixed(2)}
          </span>
        </div>

        <div className="receipt-divider" />

        <div className="receipt-payment-row">
          <span className="total-label">{t('bills.payment')}:</span>
          <span className="total-value font-bold font-english">{invoice.payment_method}</span>
        </div>

        {(invoice.payment_method === 'CREDIT' || Number(invoice.balance_due ?? 0) > 0) && (
          <>
            <div className="receipt-payment-row text-[7.5px]">
              <span className="total-label">{t('bills.paidAmount')}:</span>
              <span className="total-value font-bold font-english">
                ₹{Number(invoice.paid_amount ?? 0).toFixed(2)}
              </span>
            </div>
            <div className="receipt-payment-row text-[7.5px]">
              <span className="total-label">{t('bills.balanceDue')}:</span>
              <span className="total-value font-black font-english">
                ₹{Number(invoice.balance_due ?? 0).toFixed(2)}
              </span>
            </div>
          </>
        )}

        {invoice.cash_tendered !== null && invoice.cash_tendered !== undefined && (
          <div className="receipt-payment-row text-[7.5px]">
            <span className="total-label">{t('billing.cashTendered')}:</span>
            <span className="total-value font-english">
              ₹{Number(invoice.cash_tendered).toFixed(2)}
            </span>
          </div>
        )}

        {invoice.change_returned !== null && invoice.change_returned !== undefined && (
          <div className="receipt-payment-row text-[7.5px]">
            <span className="total-label">{t('billing.changeReturn')}:</span>
            <span className="total-value font-bold font-english">
              ₹{Number(invoice.change_returned).toFixed(2)}
            </span>
          </div>
        )}

        {invoice.payment_reference && (
          <div className="receipt-payment-row text-[7.5px] font-english">
            <span className="total-label">Ref/UTR:</span>
            <span className="total-value">{invoice.payment_reference}</span>
          </div>
        )}

        <div className="receipt-divider" />
        <div className="receipt-footer font-marathi">{footerMessage}</div>
      </div>
    </div>
  )
}

export const BarcodeLabelPrint: React.FC<{ product: Product | null; count?: number }> = ({
  product,
  count = 1,
}) => {
  const { i18n } = useTranslation()
  const isMarathi = (i18n.language || 'mr').startsWith('mr')

  if (!product || !product.barcode) return null

  return (
    <div className="barcode-label-print-root" aria-live="polite">
      <div className="barcode-label-sheet">
        {Array.from({ length: Math.max(1, count) }, (_, index) => (
          <div key={`${product.id}-${index}`} className="barcode-label-card">
            <div className="barcode-label-name">
              <div>{formatProductName(product.name_mr, isMarathi)}</div>
              {product.unit_display ? (
                <div className="barcode-label-unit">
                  {formatUnitDisplay(product.unit_display, isMarathi)}
                </div>
              ) : null}
            </div>
            <div className="barcode-label-body">
              <BarcodeCanvas value={product.barcode ?? ''} />
              <div className="barcode-label-number">{product.barcode}</div>
              {product.selling_price !== null && product.selling_price !== undefined && (
                <div className="barcode-label-price">
                  ₹{Number(product.selling_price).toFixed(2)}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
