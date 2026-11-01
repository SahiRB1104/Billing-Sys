import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useWorkspace } from '../context/WorkspaceContext'
import { formatProductName, formatUnitDisplay } from '../constants/productOptions'
import {
  LuPrinter,
  LuRotateCcw,
  LuBan,
  LuX,
  LuClock,
  LuPlus,
  LuMinus,
  LuCheck,
} from './Icons'
import { TransliteratedInput } from './TransliteratedInput'
import type { InvoiceDetail } from '../types'

export const ConfirmDialogModal: React.FC = () => {
  const { confirmDialog, closeConfirmDialog } = useWorkspace()

  if (!confirmDialog || !confirmDialog.open) return null

  return (
    <div
      className="fixed inset-0 z-80 flex items-center justify-center bg-[#3D251E]/70 p-4 backdrop-blur-xs"
      style={{ zIndex: 80 }}
    >
      <div className="w-full max-w-md rounded-md border-2 border-[#ECB390] bg-[#FCF8E8] p-5 shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#ECB390] pb-2.5">
          <h4 className="text-sm font-bold uppercase tracking-wide text-[#3D251E]">
            {confirmDialog.title}
          </h4>
          <button
            type="button"
            onClick={closeConfirmDialog}
            className="rounded border border-[#ECB390] bg-[#ECDFC8] px-2 py-0.5 text-xs font-bold text-[#3D251E] hover:bg-[#ECB390]"
          >
            <LuX className="h-3.5 w-3.5" />
          </button>
        </div>

        <p className="mt-3 text-xs font-medium leading-relaxed text-[#5C4338]">
          {confirmDialog.message}
        </p>

        <div className="mt-5 flex justify-end gap-2 border-t border-[#ECB390] pt-3">
          <button
            type="button"
            onClick={closeConfirmDialog}
            className="rounded-md border border-[#ECB390] bg-[#ECDFC8] px-4 py-1.5 text-xs font-bold text-[#3D251E] hover:bg-[#ECB390]"
          >
            {confirmDialog.cancelLabel || 'Cancel'}
          </button>
          <button
            type="button"
            onClick={() => {
              const fn = confirmDialog.onConfirm
              closeConfirmDialog()
              fn()
            }}
            className={`rounded-md px-4 py-1.5 text-xs font-bold text-[#FCF8E8] ${
              confirmDialog.danger
                ? 'bg-[#B93829] hover:bg-[#9f2e20]'
                : 'bg-[#DF7861] hover:bg-[#c9624c]'
            }`}
          >
            {confirmDialog.confirmLabel || 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  )
}

export const ReturnItemsFloatingModal: React.FC<{
  invoice: InvoiceDetail
  isOpen: boolean
  onClose: () => void
}> = ({ invoice, isOpen, onClose }) => {
  const { t, i18n } = useTranslation()
  const isCurrentLangMr = (i18n.language || 'mr').startsWith('mr')
  const { returnInvoiceItems } = useWorkspace()

  const [returnQtys, setReturnQtys] = useState<Record<number, number>>({})
  const [returnReason, setReturnReason] = useState('')
  const [submittingReturn, setSubmittingReturn] = useState(false)

  if (!isOpen) return null

  const quickReasons = [
    { label: t('bills.reasonDamaged') },
    { label: t('bills.reasonExpired') },
    { label: t('bills.reasonWrongItem') },
    { label: t('bills.reasonExchange') },
  ]

  const totalReturnQty = Object.values(returnQtys).reduce(
    (a, b) => a + (Number(b) || 0),
    0,
  )

  const totalRefundAmount = invoice.items.reduce((sum, item) => {
    const qty = returnQtys[item.id] || 0
    if (qty <= 0) return sum
    const unitPrice = Number(item.unit_price || 0)
    return sum + qty * unitPrice
  }, 0)

  const canSubmit =
    totalReturnQty > 0 && returnReason.trim().length >= 3 && !submittingReturn

  const handleConfirmReturn = async () => {
    if (!canSubmit) return
    const itemsPayload = Object.entries(returnQtys)
      .map(([itemId, qty]) => ({
        invoice_item_id: Number(itemId),
        return_quantity: Number(qty),
      }))
      .filter((entry) => entry.return_quantity > 0)

    if (itemsPayload.length === 0) return

    setSubmittingReturn(true)
    const ok = await returnInvoiceItems(
      invoice.id,
      itemsPayload,
      returnReason.trim(),
    )
    setSubmittingReturn(false)
    if (ok) {
      onClose()
    }
  }

  return (
    <div
      className="fixed inset-0 z-70 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs"
      style={{ zIndex: 70 }}
    >
      <div className="flex max-h-[90dvh] w-full max-w-2xl flex-col overflow-hidden rounded-md border-2 border-[#ECB390] bg-[#FCF8E8] p-5 shadow-2xl">
        <div className="mb-3 flex shrink-0 items-center justify-between border-b border-[#ECB390] pb-2.5">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#DF7861]">
              {t('bills.floatingReturnTitle')}
            </div>
            <h4 className="text-base font-black text-[#3D251E] font-english">
              {invoice.invoice_number} • {invoice.customer_name || 'Customer'}
            </h4>
            <div className="mt-0.5 flex items-center gap-1.5 text-[11px] font-semibold text-[#7A6258]">
              <LuClock className="h-3.5 w-3.5 text-[#DF7861]" />
              <span>{t('bills.returnWindowNotice')}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-[#ECB390] bg-[#ECDFC8] px-2 py-0.5 text-xs font-bold text-[#3D251E] hover:bg-[#ECB390]"
          >
            <LuX className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable table of returnable items */}
        <div className="pos-scroll mb-3 min-h-0 flex-1 overflow-y-auto rounded-md border border-[#ECB390] bg-white">
          <table className="pos-table w-full text-left text-xs">
            <thead className="sticky top-0 z-10 bg-[#ECB390] text-[#3D251E]">
              <tr>
                <th className="px-3 py-2 font-bold">{t('bills.items')}</th>
                <th className="px-3 py-2 text-center font-bold">{t('bills.colSoldQty')}</th>
                <th className="px-3 py-2 text-center font-bold">{t('bills.colAlreadyReturned')}</th>
                <th className="px-3 py-2 text-center font-bold">{t('bills.colAvailableReturn')}</th>
                <th className="px-3 py-2 text-center font-bold">{t('bills.returnQty')}</th>
                <th className="px-3 py-2 text-right font-bold">{t('bills.totalRefundAmount')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#ECDFC8]">
              {invoice.items.map((item) => {
                const soldQty = Number(item.quantity)
                const alreadyReturned = Number(item.returned_quantity || 0)
                const maxReturnable = Math.max(0, soldQty - alreadyReturned)
                const currentQty = returnQtys[item.id] ?? 0
                const lineRefund = currentQty * Number(item.unit_price)

                return (
                  <tr
                    key={item.id}
                    className={maxReturnable <= 0 ? 'bg-[#ECDFC8]/30 opacity-60' : ''}
                  >
                    <td className="px-3 py-2">
                      <div className="font-bold text-[#3D251E]">
                        {formatProductName(item.product_name_mr, isCurrentLangMr)}
                      </div>
                      <div className="text-[10px] text-[#7A6258] font-english">
                        ₹ {Number(item.unit_price).toFixed(2)} / unit
                      </div>
                    </td>
                    <td className="px-3 py-2 text-center font-bold font-english text-[#3D251E]">
                      {soldQty}
                    </td>
                    <td className="px-3 py-2 text-center font-semibold font-english text-[#7A6258]">
                      {alreadyReturned}
                    </td>
                    <td className="px-3 py-2 text-center font-black font-english text-emerald-800">
                      {maxReturnable}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <div className="inline-flex items-center gap-1 rounded border border-[#ECB390] bg-[#FCF8E8] p-0.5">
                        <button
                          type="button"
                          disabled={currentQty <= 0}
                          onClick={() =>
                            setReturnQtys((prev) => ({
                              ...prev,
                              [item.id]: Math.max(0, currentQty - 1),
                            }))
                          }
                          className="rounded bg-[#ECDFC8] p-1 text-[#3D251E] hover:bg-[#ECB390] disabled:opacity-40"
                        >
                          <LuMinus className="h-3 w-3" />
                        </button>
                        <input
                          type="number"
                          min={0}
                          max={maxReturnable}
                          step="any"
                          disabled={maxReturnable <= 0}
                          value={currentQty}
                          onChange={(e) => {
                            const val = Math.min(
                              maxReturnable,
                              Math.max(0, Number(e.target.value) || 0),
                            )
                            setReturnQtys((prev) => ({
                              ...prev,
                              [item.id]: val,
                            }))
                          }}
                          className="w-12 text-center text-xs font-black font-english text-[#3D251E] outline-none"
                        />
                        <button
                          type="button"
                          disabled={currentQty >= maxReturnable}
                          onClick={() =>
                            setReturnQtys((prev) => ({
                              ...prev,
                              [item.id]: Math.min(maxReturnable, currentQty + 1),
                            }))
                          }
                          className="rounded bg-[#ECDFC8] p-1 text-[#3D251E] hover:bg-[#ECB390] disabled:opacity-40"
                        >
                          <LuPlus className="h-3 w-3" />
                        </button>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right font-black font-english text-[#DF7861]">
                      ₹ {lineRefund.toFixed(2)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Total refund and credit notice */}
        <div className="mb-3 shrink-0 rounded-md border border-[#ECB390] bg-[#ECDFC8]/60 p-2.5 text-xs">
          <div className="flex items-center justify-between font-black text-[#3D251E]">
            <span>{t('bills.totalRefundAmount')}:</span>
            <span className="font-english text-base text-[#DF7861]">
              ₹ {totalRefundAmount.toFixed(2)}
            </span>
          </div>
          {invoice.payment_method === 'CREDIT' && (
            <p className="mt-1 text-[11px] font-semibold text-[#7A6258]">
              💡 {t('bills.udhariDeductionNotice')}
            </p>
          )}
        </div>

        {/* Mandatory Return Reason with Quick Chips and TransliteratedInput */}
        <div className="mb-3 shrink-0 space-y-1.5">
          <div className="flex items-center justify-between text-xs font-bold text-[#3D251E]">
            <span>
              {t('bills.returnReasonLabel')} *{' '}
              <span className="text-[10px] font-normal text-[#DF7861]">
                ({t('bills.returnReasonRequired')})
              </span>
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-bold text-[#7A6258]">
              {t('bills.returnReasonChipsTitle')}
            </span>
            {quickReasons.map((chip) => (
              <button
                key={chip.label}
                type="button"
                onClick={() => setReturnReason(chip.label)}
                className="rounded border border-[#ECB390] bg-[#ECDFC8] px-2 py-0.5 text-[10px] font-bold text-[#3D251E] hover:bg-[#ECB390]"
              >
                {chip.label}
              </button>
            ))}
          </div>

          <TransliteratedInput
            value={returnReason}
            onChangeValue={setReturnReason}
            placeholder={t('bills.returnReasonPlaceholder')}
            required
            showLiveBadge={false}
            className="w-full rounded border border-[#ECB390] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#3D251E] outline-none focus:border-[#DF7861]"
          />
        </div>

        {/* Actions */}
        <div className="flex shrink-0 justify-end gap-2 border-t border-[#ECB390] pt-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-[#ECB390] bg-[#ECDFC8] px-4 py-1.5 text-xs font-bold text-[#3D251E] hover:bg-[#ECB390]"
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            disabled={!canSubmit}
            onClick={() => void handleConfirmReturn()}
            className="inline-flex items-center gap-1.5 rounded bg-[#DF7861] px-5 py-1.5 text-xs font-bold text-[#FCF8E8] hover:bg-[#c9624c] disabled:opacity-40"
          >
            <LuCheck className="h-3.5 w-3.5" />
            <span>
              {submittingReturn
                ? t('billing.processingBill')
                : t('bills.confirmReturnDone')}
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}

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

  const [showFloatingReturn, setShowFloatingReturn] = useState(false)

  if (!selectedInvoice) return null

  const paymentLabels: Record<string, string> = {
    CASH: t('billing.payCash'),
    UPI: 'UPI QR',
    CARD: t('billing.payCard'),
    CREDIT: t('billing.payCredit'),
  }

  const isCancelled =
    selectedInvoice.status === 'CANCELLED' || selectedInvoice.status === 'VOIDED'
  const isReturnBill = selectedInvoice.payment_status === 'RETURN'
  const isUdhariPaid =
    selectedInvoice.payment_status === 'UDHARI_PAID' ||
    selectedInvoice.payment_status === 'UDHARI_PARTIAL_PAID'

  const grandTotal = Number(
    selectedInvoice.grand_total ?? selectedInvoice.amount ?? 0,
  )
  const balanceDue = Number(selectedInvoice.balance_due ?? 0)
  const paidAmt = Number(
    selectedInvoice.paid_amount !== undefined
      ? selectedInvoice.paid_amount
      : Math.max(0, grandTotal - balanceDue),
  )

  const elapsedHours =
    selectedInvoice.elapsed_hours !== undefined
      ? selectedInvoice.elapsed_hours
      : Math.max(0, Date.now() - new Date(selectedInvoice.date).getTime()) / 3600000

  const isReturnWindowExpired = elapsedHours > 7.0

  const hasReturnableItems = selectedInvoice.items.some((item) => {
    const soldQty = Number(item.quantity)
    const alreadyReturned = Number(item.returned_quantity || 0)
    return soldQty - alreadyReturned > 0
  })

  return (
    <>
      <div className="receipt-print fixed inset-0 z-50 flex items-center justify-center bg-[#3D251E]/60 p-4 backdrop-blur-xs">
        <div className="flex max-h-[88dvh] w-full max-w-3xl flex-col overflow-hidden rounded-md border-2 border-[#ECB390] bg-[#FCF8E8] p-5 shadow-2xl">
          <div className="mb-3 flex shrink-0 items-center justify-between border-b border-[#ECB390] pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#7A6258]">
                  {isReturnBill
                    ? t('bills.returnedBadge')
                    : t('bills.detailsTitle')}
                </span>
                {isReturnBill && (
                  <span className="rounded bg-[#DF7861] px-2 py-0.5 text-[10px] font-bold text-[#FCF8E8]">
                    {t('bills.returnedBadge')}
                  </span>
                )}
                {selectedInvoice.parent_invoice_number && (
                  <span className="text-[11px] font-semibold text-[#7A6258]">
                    (मूळ बिल: {selectedInvoice.parent_invoice_number})
                  </span>
                )}
              </div>
              <h4 className="text-lg font-black text-[#3D251E] font-english">
                {selectedInvoice.invoice_number}
              </h4>
            </div>
            <button
              type="button"
              onClick={() => setSelectedInvoice(null)}
              className="rounded border border-[#ECB390] bg-[#ECDFC8] px-2.5 py-1 text-xs font-bold text-[#3D251E] hover:bg-[#ECB390]"
            >
              <LuX className="h-4 w-4" />
            </button>
          </div>

          <div className="mb-3 grid shrink-0 grid-cols-3 gap-3">
            <div className="rounded-md border border-[#ECB390] bg-[#ECDFC8]/60 p-2.5">
              <div className="text-[10px] font-bold uppercase text-[#7A6258]">
                {t('bills.date')}
              </div>
              <div className="mt-0.5 text-xs font-bold text-[#3D251E] font-english">
                {new Date(selectedInvoice.date).toLocaleString(
                  isCurrentLangMr ? 'mr-IN' : 'en-GB',
                )}
              </div>
            </div>
            <div className="rounded-md border border-[#ECB390] bg-[#ECDFC8]/60 p-2.5">
              <div className="text-[10px] font-bold uppercase text-[#7A6258]">
                {t('bills.payment')}
              </div>
              <div className="mt-0.5 text-xs font-bold text-[#3D251E]">
                {paymentLabels[selectedInvoice.payment_method] ||
                  selectedInvoice.payment_method}
              </div>
            </div>
            <div className="rounded-md border border-[#ECB390] bg-[#ECDFC8]/60 p-2.5">
              <div className="text-[10px] font-bold uppercase text-[#7A6258]">
                {t('bills.status')}
              </div>
              <div className="mt-0.5 text-xs font-black text-[#3D251E]">
                {isCancelled
                  ? t('bills.cancelledBadge')
                  : isReturnBill
                  ? t('bills.returnedBadge')
                  : isUdhariPaid
                  ? t('bills.udhariPaidBadge')
                  : t('bills.completedBadge')}
              </div>
            </div>
          </div>

          {/* Clean, spacious items table */}
          <div className="pos-scroll mb-3 min-h-0 flex-1 overflow-y-auto rounded-md border border-[#ECB390] bg-[#FCF8E8]">
            <table className="pos-table text-left text-xs">
              <thead className="sticky top-0 bg-[#ECB390] text-[#3D251E]">
                <tr>
                  <th className="px-3 py-2 font-bold">{t('bills.items')}</th>
                  <th className="px-3 py-2 font-bold">{t('bills.quantity')}</th>
                  <th className="px-3 py-2 font-bold">{t('bills.unitPrice')}</th>
                  <th className="px-3 py-2 font-bold">{t('bills.discount')}</th>
                  <th className="px-3 py-2 font-bold">{t('bills.tax')}</th>
                  <th className="px-3 py-2 text-right font-bold">
                    {t('bills.itemTotal')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ECDFC8] bg-[#FCF8E8]">
                {selectedInvoice.items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-3 py-2">
                      <div className="font-bold text-[#3D251E]">
                        {formatProductName(item.product_name_mr, isCurrentLangMr)}
                      </div>
                      <div className="flex items-center gap-2">
                        {item.unit_display ? (
                          <span className="text-[10px] font-semibold text-[#7A6258]">
                            {formatUnitDisplay(item.unit_display, isCurrentLangMr)}
                          </span>
                        ) : null}
                        {Number(item.returned_quantity || 0) > 0 && (
                          <span className="rounded border border-[#ECB390] bg-[#ECDFC8] px-1.5 py-0.5 text-[10px] font-bold text-[#3D251E]">
                            {t('bills.returnedBadge')}: {Number(item.returned_quantity)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2 font-bold font-english text-[#3D251E]">
                      {Number(item.quantity)}
                    </td>
                    <td className="px-3 py-2 font-english text-[#3D251E]">
                      ₹ {Number(item.unit_price).toFixed(2)}
                    </td>
                    <td className="px-3 py-2 font-english text-[#3D251E]">
                      ₹ {Number(item.discount).toFixed(2)}
                    </td>
                    <td className="px-3 py-2 font-english text-[#3D251E]">
                      ₹ {Number(item.tax_amount).toFixed(2)}
                    </td>
                    <td className="px-3 py-2 text-right font-black font-english text-[#3D251E]">
                      ₹ {Number(item.total).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Subtotals & Grand Total */}
          <div className="shrink-0 rounded-md border border-[#ECB390] bg-[#ECDFC8]/60 p-3 text-xs text-[#5C4338]">
            <div className="flex justify-between py-0.5">
              <span>{t('bills.subtotal')}</span>
              <span className="font-bold font-english">
                ₹ {Number(selectedInvoice.subtotal ?? 0).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between py-0.5">
              <span>{t('bills.discount')}</span>
              <span className="font-bold font-english">
                ₹ {Number(selectedInvoice.discount ?? 0).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between py-0.5">
              <span>{t('bills.tax')}</span>
              <span className="font-bold font-english">
                ₹ {Number(selectedInvoice.tax_amount ?? 0).toFixed(2)}
              </span>
            </div>
            <div className="mt-1.5 flex justify-between border-t border-[#ECB390] pt-2 text-sm font-black text-[#3D251E]">
              <span>{t('bills.grandTotal')}</span>
              <span className="font-english">₹ {grandTotal.toFixed(2)}</span>
            </div>

            {(selectedInvoice.payment_method === 'CREDIT' || balanceDue > 0) && (
              <div className="mt-1.5 grid grid-cols-2 gap-2 border-t border-[#ECB390] pt-2">
                <div className="flex justify-between font-bold text-emerald-800">
                  <span>{t('bills.paidAmount')}:</span>
                  <span className="font-english">₹ {paidAmt.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-black text-[#DF7861]">
                  <span>{t('bills.balanceDue')}:</span>
                  <span className="font-english">₹ {balanceDue.toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Udhari Settlement History Ledger on Original Bill */}
          {selectedInvoice.settlement_history &&
            selectedInvoice.settlement_history.length > 0 && (
              <div className="mt-2.5 max-h-36 overflow-y-auto rounded-md border border-[#ECB390] bg-[#ECDFC8]/40 p-2 text-xs">
                <div className="mb-1 text-[11px] font-bold uppercase text-[#3D251E]">
                  {t('bills.settlementHistoryTitle')}
                </div>
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-[#ECB390] text-[#3D251E]">
                    <tr>
                      <th className="px-2 py-1 font-bold">{t('bills.settlementDate')}</th>
                      <th className="px-2 py-1 font-bold">{t('bills.settlementAmount')}</th>
                      <th className="px-2 py-1 font-bold">{t('bills.settlementMode')}</th>
                      <th className="px-2 py-1 font-bold">{t('billing.paymentRef')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#ECDFC8] bg-white">
                    {selectedInvoice.settlement_history.map((s) => (
                      <tr key={s.id}>
                        <td className="px-2 py-1 font-english text-[#3D251E]">
                          {s.settled_at
                            ? new Date(s.settled_at).toLocaleString(
                                isCurrentLangMr ? 'mr-IN' : 'en-GB',
                              )
                            : '-'}
                        </td>
                        <td className="px-2 py-1 font-bold font-english text-emerald-800">
                          ₹ {Number(s.amount).toFixed(2)}
                        </td>
                        <td className="px-2 py-1 font-semibold text-[#3D251E]">
                          {s.payment_mode === 'UPI' ? 'UPI QR' : s.payment_mode}
                        </td>
                        <td className="px-2 py-1 text-[#7A6258]">
                          {s.reference_note || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

          {/* Linked Bills (Returns, Cancellations, Settlements) */}
          {selectedInvoice.linked_bills && selectedInvoice.linked_bills.length > 0 && (
            <div className="mt-2.5 max-h-28 overflow-y-auto rounded-md border border-[#ECB390] bg-[#ECDFC8]/40 p-2 text-xs">
              <div className="mb-1 text-[11px] font-bold uppercase text-[#3D251E]">
                {t('bills.linkedBillsTitle')}
              </div>
              <div className="space-y-1">
                {selectedInvoice.linked_bills.map((lb) => (
                  <div
                    key={lb.id}
                    className="flex items-center justify-between rounded border border-[#ECB390] bg-white px-2.5 py-1 text-[11px]"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-bold font-english text-[#3D251E]">
                        {lb.invoice_number}
                      </span>
                      <span
                        className={`rounded px-1.5 py-0.2 text-[10px] font-bold ${
                          lb.type === 'RETURN'
                            ? 'bg-[#DF7861] text-[#FCF8E8]'
                            : 'bg-[#ECDFC8] text-[#3D251E]'
                        }`}
                      >
                        {lb.type === 'RETURN'
                          ? t('bills.returnedBadge')
                          : lb.type}
                      </span>
                      <span className="text-[10px] text-[#7A6258] font-english">
                        {new Date(lb.date).toLocaleDateString(
                          isCurrentLangMr ? 'mr-IN' : 'en-GB',
                        )}
                      </span>
                    </div>
                    <div className="font-bold font-english text-[#3D251E]">
                      ₹ {Number(lb.amount).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Modal Actions */}
          <div className="mt-3 flex shrink-0 flex-wrap justify-between gap-2">
            <div>
              {/* 7-Hour Return Logic */}
              {!isCancelled &&
                !isReturnBill &&
                !selectedInvoice.has_cancel_record &&
                selectedInvoice.items.length > 0 && (
                  <>
                    {isReturnWindowExpired ? (
                      <div className="inline-flex items-center gap-1.5 rounded-md border border-[#ECB390] bg-[#ECDFC8] px-3 py-1.5 text-xs font-bold text-[#7A6258]">
                        <LuClock className="h-3.5 w-3.5 text-[#DF7861]" />
                        <span>{t('bills.returnWindowExpired')}</span>
                      </div>
                    ) : !hasReturnableItems ? (
                      <div className="inline-flex items-center gap-1.5 rounded-md border border-[#ECB390] bg-[#ECDFC8] px-3 py-1.5 text-xs font-bold text-[#7A6258]">
                        <LuRotateCcw className="h-3.5 w-3.5 text-[#7A6258]" />
                        <span>{t('bills.allAlreadyReturned')}</span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowFloatingReturn(true)}
                        className="inline-flex items-center gap-1.5 rounded-md border border-[#ECB390] bg-[#ECDFC8] px-3.5 py-1.5 text-xs font-bold text-[#3D251E] hover:bg-[#ECB390]"
                      >
                        <LuRotateCcw className="h-3.5 w-3.5 text-[#DF7861]" />
                        <span>{t('bills.returnItems')}</span>
                      </button>
                    )}
                  </>
                )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => printInvoice(selectedInvoice)}
                className="inline-flex items-center gap-1.5 rounded-md bg-[#DF7861] px-4 py-1.5 text-xs font-bold text-[#FCF8E8] hover:bg-[#c9624c]"
              >
                <LuPrinter className="h-3.5 w-3.5" />
                <span>{t('bills.reprint')}</span>
              </button>
              {currentUser?.role === 'ADMIN' &&
                !isCancelled &&
                !isReturnBill &&
                !selectedInvoice.has_cancel_record && (
                  <button
                    type="button"
                    onClick={() => cancelInvoice(selectedInvoice.id)}
                    className="inline-flex items-center gap-1.5 rounded-md border border-[#DF7861] bg-[#ECB390]/50 px-4 py-1.5 text-xs font-bold text-[#B93829] hover:bg-[#ECB390]"
                  >
                    <LuBan className="h-3.5 w-3.5" />
                    <span>{t('bills.cancelBill')}</span>
                  </button>
                )}
            </div>
          </div>
        </div>
      </div>

      {/* Floating Return Items Modal */}
      {showFloatingReturn && (
        <ReturnItemsFloatingModal
          invoice={selectedInvoice}
          isOpen={showFloatingReturn}
          onClose={() => setShowFloatingReturn(false)}
        />
      )}
    </>
  )
}

export const PriceUpdateModal: React.FC = () => {
  const { t, i18n } = useTranslation()
  const isMarathi = (i18n.language || 'mr').startsWith('mr')
  const {
    priceModalProduct,
    setPriceModalProduct,
    newSellingPrice,
    setNewSellingPrice,
    priceChangeReason,
    setPriceChangeReason,
    priceModalError,
    submitPriceUpdate,
  } = useWorkspace()

  if (!priceModalProduct) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#3D251E]/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-md border-2 border-[#ECB390] bg-[#FCF8E8] p-5 shadow-2xl">
        <div className="mb-3 flex items-center justify-between border-b border-[#ECB390] pb-2.5">
          <h4 className="text-sm font-bold text-[#3D251E]">
            {t('products.updatePrice')} —{' '}
            {formatProductName(priceModalProduct.name_mr, isMarathi)}
          </h4>
          <button
            type="button"
            onClick={() => setPriceModalProduct(null)}
            className="rounded border border-[#ECB390] bg-[#ECDFC8] px-2 py-0.5 text-xs font-bold text-[#3D251E] hover:bg-[#ECB390]"
          >
            <LuX className="h-3.5 w-3.5" />
          </button>
        </div>

        {priceModalError && (
          <div className="mb-3 rounded border border-[#DF7861] bg-[#ECB390]/40 p-2.5 text-xs font-bold text-[#B93829]">
            {priceModalError}
          </div>
        )}

        <form onSubmit={submitPriceUpdate} className="space-y-3">
          <div className="rounded-md border border-[#ECB390] bg-[#ECDFC8]/60 p-3">
            <div className="text-[11px] font-bold text-[#7A6258]">
              {t('products.currentPrice')}
            </div>
            <div className="text-lg font-black text-[#3D251E] font-english">
              ₹ {Number(priceModalProduct.selling_price ?? 0).toFixed(2)}
            </div>
          </div>

          <label className="block space-y-1">
            <span className="text-xs font-bold text-[#3D251E]">
              {t('products.newPrice')} (₹)
            </span>
            <input
              type="number"
              step="0.01"
              value={newSellingPrice}
              onChange={(e) => setNewSellingPrice(e.target.value)}
              required
              className="w-full rounded-md border border-[#ECB390] bg-white px-3 py-2 text-sm font-black text-[#3D251E] outline-none focus:border-[#DF7861] font-english"
            />
          </label>

          <label className="block space-y-1">
            <span className="text-xs font-bold text-[#3D251E]">
              {t('products.priceReason')}
            </span>
            <input
              value={priceChangeReason}
              onChange={(e) => setPriceChangeReason(e.target.value)}
              placeholder={t('products.priceReasonPlaceholder')}
              className="w-full rounded-md border border-[#ECB390] bg-white px-3 py-2 text-xs text-[#3D251E] outline-none focus:border-[#DF7861]"
            />
          </label>

          <div className="mt-4 flex justify-end gap-2 border-t border-[#ECB390] pt-3">
            <button
              type="button"
              onClick={() => setPriceModalProduct(null)}
              className="rounded-md border border-[#ECB390] bg-[#ECDFC8] px-4 py-1.5 text-xs font-bold text-[#3D251E] hover:bg-[#ECB390]"
            >
              {t('products.cancel')}
            </button>
            <button
              type="submit"
              className="rounded-md bg-[#DF7861] px-5 py-1.5 text-xs font-bold text-[#FCF8E8] hover:bg-[#c9624c]"
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
  const { t, i18n } = useTranslation()
  const isMarathi = (i18n.language || 'mr').startsWith('mr')
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
        <div className="label-dialog-title">{t('products.labelDialogTitle')}</div>
        <div className="label-dialog-field">
          <span>{t('products.productName')}:</span>
          <strong>{formatProductName(labelDialogProduct.name_mr, isMarathi)}</strong>
        </div>
        <div className="label-dialog-field">
          <span>{t('products.barcode')}:</span>
          <strong className="font-english">{labelDialogProduct.barcode}</strong>
        </div>
        <div className="label-dialog-field">
          <span>{t('cart.stock')}:</span>
          <strong className="font-english">{labelDialogProduct.current_stock}</strong>
        </div>
        <label className="label-dialog-field input-field">
          <span>{t('products.labelCount')}:</span>
          <input
            type="number"
            min={1}
            value={labelDialogCount}
            onChange={(e) =>
              setLabelDialogCount(Math.max(1, Number(e.target.value) || 1))
            }
            className="font-english"
          />
        </label>
        <div className="label-dialog-actions">
          <button
            type="button"
            className="label-dialog-cancel"
            onClick={() => setLabelDialogProduct(null)}
          >
            {t('products.cancel')}
          </button>
          <button
            type="button"
            className="label-dialog-confirm"
            onClick={confirmLabelPrint}
          >
            {t('products.printLabelsNow')}
          </button>
        </div>
      </div>
    </div>
  )
}
