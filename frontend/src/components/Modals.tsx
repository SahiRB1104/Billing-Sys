import React from 'react'
import { useTranslation } from 'react-i18next'
import { useWorkspace } from '../context/WorkspaceContext'

export const InvoiceDetailModal: React.FC = () => {
  const { t, i18n } = useTranslation()
  const isCurrentLangMr = i18n.language === 'mr' || i18n.language.startsWith('mr')
  const {
    selectedInvoice,
    setSelectedInvoice,
    printInvoice,
    cancelInvoice,
    currentUser,
  } = useWorkspace()

  if (!selectedInvoice) return null

  return (
    <div className="receipt-print fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-auto rounded-[28px] border border-stone-200 bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between border-b border-stone-100 pb-4">
          <div>
            <div className="text-xs font-bold text-stone-500">
              {t('bills.detailsTitle')}
            </div>
            <h4 className="mt-1 text-2xl font-black text-stone-900">{selectedInvoice.invoice_number}</h4>
          </div>
          <button
            type="button"
            onClick={() => setSelectedInvoice(null)}
            className="rounded-full p-2 text-stone-400 hover:bg-stone-100"
          >
            ✕
          </button>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
            <div className="text-xs font-bold text-stone-500">{t('bills.date')}</div>
            <div className="mt-2 text-sm font-bold text-stone-800">
              {new Date(selectedInvoice.date).toLocaleString(isCurrentLangMr ? 'mr-IN' : 'en-GB')}
            </div>
          </div>
          <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
            <div className="text-xs font-bold text-stone-500">{t('bills.payment')}</div>
            <div className="mt-2 text-sm font-bold text-stone-800">{selectedInvoice.payment_method}</div>
          </div>
          <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
            <div className="text-xs font-bold text-stone-500">{t('bills.status')}</div>
            <div className="mt-2 text-sm font-black text-stone-800">
              {selectedInvoice.status === 'CANCELLED' ? t('bills.cancelledBadge') : t('bills.completedBadge')}
            </div>
          </div>
        </div>

        <div className="mb-5 overflow-auto rounded-2xl border border-stone-200">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-stone-100 text-stone-700">
              <tr>
                <th className="px-4 py-3 font-bold">{t('bills.items')}</th>
                <th className="px-4 py-3 font-bold">{t('bills.quantity')}</th>
                <th className="px-4 py-3 font-bold">{t('bills.unitPrice')}</th>
                <th className="px-4 py-3 font-bold">{t('bills.discount')}</th>
                <th className="px-4 py-3 font-bold">{t('bills.tax')}</th>
                <th className="px-4 py-3 font-bold">{t('bills.itemTotal')}</th>
              </tr>
            </thead>
            <tbody>
              {selectedInvoice.items.map((item) => (
                <tr key={item.id} className="border-t border-stone-200">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-stone-800">{item.product_name_mr}</div>
                    {item.unit_display ? (
                      <div className="text-xs font-bold text-stone-500">{item.unit_display}</div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">{Number(item.quantity).toFixed(0)}</td>
                  <td className="px-4 py-3">₹ {Number(item.unit_price).toFixed(2)}</td>
                  <td className="px-4 py-3">₹ {Number(item.discount).toFixed(2)}</td>
                  <td className="px-4 py-3">₹ {Number(item.tax_amount).toFixed(2)}</td>
                  <td className="px-4 py-3 font-bold text-stone-900">₹ {Number(item.total).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="rounded-2xl bg-stone-50 p-4 text-sm text-stone-700">
          <div className="flex justify-between py-1">
            <span>{t('bills.subtotal')}</span>
            <span>₹ {Number(selectedInvoice.subtotal ?? 0).toFixed(2)}</span>
          </div>
          <div className="flex justify-between py-1">
            <span>{t('bills.discount')}</span>
            <span>₹ {Number(selectedInvoice.discount ?? 0).toFixed(2)}</span>
          </div>
          <div className="flex justify-between py-1">
            <span>{t('bills.tax')}</span>
            <span>₹ {Number(selectedInvoice.tax_amount ?? 0).toFixed(2)}</span>
          </div>
          <div className="mt-2 flex justify-between border-t border-stone-200 pt-3 text-base font-black text-stone-900">
            <span>{t('bills.grandTotal')}</span>
            <span>₹ {Number(selectedInvoice.grand_total ?? selectedInvoice.amount ?? 0).toFixed(2)}</span>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={() => printInvoice(selectedInvoice)}
            className="rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm font-semibold text-stone-700 hover:bg-stone-100"
          >
            {t('bills.reprint')}
          </button>
          {currentUser?.role === 'ADMIN' && selectedInvoice.status !== 'CANCELLED' && (
            <button
              type="button"
              onClick={() => void cancelInvoice(selectedInvoice.id)}
              className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-700"
            >
              {t('bills.cancelBill')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export const PriceUpdateModal: React.FC = () => {
  const { t } = useTranslation()
  const {
    priceModalProduct,
    setPriceModalProduct,
    newSellingPrice,
    setNewSellingPrice,
    priceChangeReason,
    setPriceChangeReason,
    priceModalError,
    setPriceModalError: _setPriceModalError,
    submitPriceUpdate,
  } = useWorkspace()

  if (!priceModalProduct) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-3xl border border-stone-200 bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between border-b border-stone-100 pb-3">
          <h4 className="text-xl font-black text-stone-900">
            {t('products.updatePrice')} — {priceModalProduct.name_mr}
          </h4>
          <button
            type="button"
            onClick={() => setPriceModalProduct(null)}
            className="rounded-full p-2 text-stone-400 hover:bg-stone-100"
          >
            ✕
          </button>
        </div>

        {priceModalError && (
          <div className="mb-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">
            {priceModalError}
          </div>
        )}

        <form onSubmit={submitPriceUpdate} className="space-y-4">
          <div className="rounded-xl border border-stone-200 bg-stone-50 p-3">
            <div className="text-xs font-semibold text-stone-500">{t('products.currentPrice')}</div>
            <div className="text-xl font-black text-stone-800">
              ₹ {Number(priceModalProduct.selling_price ?? 0)}
            </div>
          </div>

          <label className="block space-y-1">
            <span className="text-sm font-bold text-stone-700">{t('products.newPrice')} (₹)</span>
            <input
              type="number"
              step="0.01"
              value={newSellingPrice}
              onChange={(e) => setNewSellingPrice(e.target.value)}
              required
              className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-base font-bold outline-none focus:border-stone-500"
            />
          </label>

          <div>
            <label className="block space-y-1">
              <span className="text-sm font-bold text-stone-700">{t('products.priceReason')}</span>
              <input
                value={priceChangeReason}
                onChange={(e) => setPriceChangeReason(e.target.value)}
                placeholder={t('products.priceReasonPlaceholder')}
                className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-stone-500"
              />
            </label>
          </div>

          <div className="mt-6 flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setPriceModalProduct(null)}
              className="rounded-xl border border-stone-300 px-4 py-2.5 text-sm font-semibold text-stone-700 hover:bg-stone-100"
            >
              {t('products.cancel')}
            </button>
            <button
              type="submit"
              className="rounded-xl bg-amber-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-amber-700"
            >
              {t('products.savePrice')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export const LabelPrintDialog: React.FC = () => {
  const {
    labelDialogProduct,
    setLabelDialogProduct,
    labelDialogCount,
    setLabelDialogCount,
    confirmLabelPrint,
  } = useWorkspace()

  if (!labelDialogProduct) return null

  return (
    <div className="label-dialog-backdrop" role="dialog" aria-modal="true">
      <div className="label-dialog-card">
        <div className="label-dialog-title">बारकोड लेबल प्रिंट</div>
        <div className="label-dialog-field">
          <span>उत्पादन:</span>
          <strong>{labelDialogProduct.name_mr}</strong>
        </div>
        <div className="label-dialog-field">
          <span>बारकोड:</span>
          <strong>{labelDialogProduct.barcode}</strong>
        </div>
        <div className="label-dialog-field">
          <span>उपलब्ध स्टॉक:</span>
          <strong>{labelDialogProduct.current_stock}</strong>
        </div>
        <label className="label-dialog-field input-field">
          <span>लेबल संख्या:</span>
          <input
            type="number"
            min={1}
            value={labelDialogCount}
            onChange={(e) => setLabelDialogCount(Math.max(1, Number(e.target.value) || 1))}
          />
        </label>
        <div className="label-dialog-actions">
          <button type="button" className="label-dialog-cancel" onClick={() => setLabelDialogProduct(null)}>
            रद्द
          </button>
          <button type="button" className="label-dialog-confirm" onClick={confirmLabelPrint}>
            प्रिंट लेबल
          </button>
        </div>
      </div>
    </div>
  )
}
