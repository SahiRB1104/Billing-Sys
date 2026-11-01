import React, { useState, useMemo, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useWorkspace } from '../context/WorkspaceContext'
import {
  localizeDynamicText,
  devanagariToEnglishApprox,
  transliterateText,
} from '../utils/transliteration'
import { PredictiveSearchInput, type PredictiveSuggestion } from './PredictiveSearchInput'
import {
  LuDownload,
  LuEye,
  LuBan,
  LuHandCoins,
  LuFileText,
  LuBookOpen,
  LuCalendar,
  LuX,
} from './Icons'
import { QrCodeCanvas } from './PrintComponents'
import type { Bill } from '../types'

export const BillsModule: React.FC = () => {
  const { t } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const {
    bills,
    filteredBills,
    creditBills,
    invoiceLoading,
    invoiceSearch,
    setInvoiceSearch,
    invoiceDateFilter,
    setInvoiceDateFilter,
    invoiceStartDate,
    setInvoiceStartDate,
    invoiceEndDate,
    setInvoiceEndDate,
    fetchInvoices,
    fetchCreditBills,
    settleCreditBill,
    openInvoiceDetail,
    cancelInvoice,
    currentUser,
    isCurrentLangMr,
    exportInvoicesCsv,
    storeSettings,
    paymentSettings,
  } = useWorkspace()

  const initialTab = searchParams.get('tab') === 'credits' ? 'credits' : 'invoices'
  const [viewMode, setViewMode] = useState<'invoices' | 'credits'>(initialTab)
  const [creditSubFilter, setCreditSubFilter] = useState<'all' | 'unpaid' | 'paid'>('unpaid')
  const [settleModalBill, setSettleModalBill] = useState<Bill | null>(null)
  const [settleAmount, setSettleAmount] = useState('')
  const [settleMode, setSettleMode] = useState('CASH')
  const [settleNote, setSettleNote] = useState('')
  const [settling, setSettling] = useState(false)

  useEffect(() => {
    if (searchParams.get('tab') === 'credits') {
      setViewMode('credits')
      void fetchCreditBills()
    }
  }, [searchParams])

  const currency = storeSettings?.currency_symbol || '₹'

  const paymentLabels: Record<string, string> = {
    CASH: t('billing.payCash'),
    UPI: 'UPI QR',
    CARD: t('billing.payCard'),
    CREDIT: t('billing.payCredit'),
  }

  const unpaidCreditBillsCount = useMemo(() => {
    return creditBills.filter(
      (b) => Number(b.balance_due ?? b.grand_total ?? b.amount ?? 0) > 0.01,
    ).length
  }, [creditBills])

  const paidCreditBillsCount = useMemo(() => {
    return creditBills.filter(
      (b) => Number(b.balance_due ?? b.grand_total ?? b.amount ?? 0) <= 0.01,
    ).length
  }, [creditBills])

  // Build predictive suggestions from bills (customer names, invoice numbers, phone numbers)
  const billSuggestions: PredictiveSuggestion[] = useMemo(() => {
    const source = viewMode === 'credits' ? creditBills : bills
    return source.map((bill) => {
      const custDisplay = bill.customer_name
        ? localizeDynamicText(bill.customer_name, isCurrentLangMr)
        : bill.invoice_number
      const custEn = bill.customer_name
        ? devanagariToEnglishApprox(bill.customer_name)
        : ''
      const custMr = bill.customer_name
        ? transliterateText(bill.customer_name)
        : ''
      const amount = Number(bill.grand_total ?? bill.amount ?? 0).toFixed(2)
      return {
        id: bill.id,
        primaryText: custDisplay || bill.invoice_number,
        secondaryText: `${bill.invoice_number}${bill.customer_phone ? ` • ${bill.customer_phone}` : ''} • ${paymentLabels[bill.payment_method] || bill.payment_method}`,
        badgeText: `${currency} ${amount}`,
        keywords: [
          bill.invoice_number,
          bill.customer_name || '',
          custEn,
          custMr,
          bill.customer_phone || '',
        ],
        onSelect: () => {
          setInvoiceSearch(custDisplay || bill.invoice_number)
          void openInvoiceDetail(bill)
        },
      }
    })
  }, [bills, creditBills, viewMode, isCurrentLangMr, currency])

  const displayedCreditBills = useMemo(() => {
    let source = creditBills
    if (creditSubFilter === 'unpaid') {
      source = source.filter(
        (b) => Number(b.balance_due ?? b.grand_total ?? b.amount ?? 0) > 0.01,
      )
    } else if (creditSubFilter === 'paid') {
      source = source.filter(
        (b) => Number(b.balance_due ?? b.grand_total ?? b.amount ?? 0) <= 0.01,
      )
    }

    const q = invoiceSearch.trim().toLowerCase()
    if (!q) return source
    const devaQ = transliterateText(q).toLowerCase()
    const phoneticQ = devanagariToEnglishApprox(q).toLowerCase()
    return source.filter((b) => {
      const invNum = (b.invoice_number || '').toLowerCase()
      const cust = (b.customer_name || '').toLowerCase()
      const custMr = transliterateText(b.customer_name || '').toLowerCase()
      const custEn = devanagariToEnglishApprox(b.customer_name || '').toLowerCase()
      const phone = (b.customer_phone || '').toLowerCase()
      return (
        invNum.includes(q) ||
        cust.includes(q) ||
        cust.includes(devaQ) ||
        custMr.includes(q) ||
        custMr.includes(devaQ) ||
        custEn.includes(q) ||
        (phoneticQ && cust.includes(phoneticQ)) ||
        (phoneticQ && custEn.includes(phoneticQ)) ||
        phone.includes(q)
      )
    })
  }, [creditBills, creditSubFilter, invoiceSearch])

  const activeRows = viewMode === 'credits' ? displayedCreditBills : filteredBills

  const handleOpenSettleModal = (bill: Bill) => {
    setSettleModalBill(bill)
    const due = Number(bill.balance_due ?? bill.grand_total ?? bill.amount ?? 0)
    setSettleAmount(String(due.toFixed(2)))
    setSettleMode('CASH')
    setSettleNote('')
  }

  const handleSettleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!settleModalBill) return
    const amt = parseFloat(settleAmount)
    if (isNaN(amt) || amt <= 0) return
    setSettling(true)
    const ok = await settleCreditBill(
      settleModalBill.id,
      amt,
      settleMode,
      settleNote.trim() || undefined,
    )
    setSettling(false)
    if (ok) {
      setSettleModalBill(null)
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-2 overflow-hidden rounded-md border border-[#ECB390] bg-[#FCF8E8] p-3.5">
      {/* Top Header & Quick Mode / Date Filter Controls */}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-[#ECB390] pb-2">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wide text-[#3D251E]">
            {t('bills.title')}
          </h2>
          <p className="text-[11px] text-[#7A6258]">{t('bills.subtitle')}</p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => void exportInvoicesCsv()}
            className="flex items-center gap-1.5 rounded border border-[#ECB390] bg-[#ECDFC8] px-3 py-1.5 text-xs font-bold text-[#3D251E] hover:bg-[#ECB390]"
          >
            <LuDownload className="h-3.5 w-3.5 text-[#DF7861]" />
            <span>{t('bills.exportCsv')}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setViewMode('invoices')
              setSearchParams({})
              setInvoiceDateFilter('all')
              setInvoiceStartDate('')
              setInvoiceEndDate('')
              void fetchInvoices('all')
            }}
            className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-bold transition ${
              viewMode === 'invoices' && invoiceDateFilter === 'all'
                ? 'bg-[#DF7861] text-[#FCF8E8] shadow-xs'
                : 'border border-[#ECB390] bg-[#ECDFC8] text-[#3D251E] hover:bg-[#ECB390]'
            }`}
          >
            <LuFileText className="h-3.5 w-3.5" />
            <span>{t('bills.filterAll')}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setViewMode('invoices')
              setSearchParams({})
              setInvoiceDateFilter('today')
              setInvoiceStartDate('')
              setInvoiceEndDate('')
              void fetchInvoices('today')
            }}
            className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-bold transition ${
              viewMode === 'invoices' && invoiceDateFilter === 'today'
                ? 'bg-[#DF7861] text-[#FCF8E8] shadow-xs'
                : 'border border-[#ECB390] bg-[#ECDFC8] text-[#3D251E] hover:bg-[#ECB390]'
            }`}
          >
            <LuCalendar className="h-3.5 w-3.5" />
            <span>{t('bills.filterToday')}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setViewMode('credits')
              setSearchParams({ tab: 'credits' })
              void fetchCreditBills()
            }}
            className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-bold transition ${
              viewMode === 'credits'
                ? 'bg-[#DF7861] text-[#FCF8E8] shadow-xs'
                : 'border border-[#ECB390] bg-[#ECDFC8] text-[#3D251E] hover:bg-[#ECB390]'
            }`}
          >
            <LuBookOpen className="h-3.5 w-3.5" />
            <span>{t('bills.creditLedgerTab')}</span>
            {unpaidCreditBillsCount > 0 && (
              <span
                className={`rounded px-1.5 py-0.2 text-[10px] font-black font-english ${
                  viewMode === 'credits'
                    ? 'bg-[#FCF8E8] text-[#DF7861]'
                    : 'bg-[#DF7861] text-[#FCF8E8]'
                }`}
              >
                {unpaidCreditBillsCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Udhari Tab Specific Sub-Filters (Unpaid / Paid / All) */}
      {viewMode === 'credits' && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-[#ECB390] bg-[#ECDFC8]/80 px-3 py-1.5 text-xs font-bold text-[#3D251E]">
          <span className="text-[11px] text-[#5C4338]">{t('bills.creditLedgerTab')}:</span>
          <button
            type="button"
            onClick={() => setCreditSubFilter('unpaid')}
            className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-xs transition ${
              creditSubFilter === 'unpaid'
                ? 'bg-[#DF7861] text-[#FCF8E8] shadow-xs'
                : 'border border-[#ECB390] bg-[#FCF8E8] text-[#3D251E] hover:bg-[#ECB390]/50'
            }`}
          >
            <span>{t('bills.filterUnpaidUdhari')}</span>
            <span
              className={`rounded px-1.5 py-0.2 text-[10px] font-black ${
                creditSubFilter === 'unpaid'
                  ? 'bg-[#FCF8E8] text-[#DF7861]'
                  : 'bg-[#DF7861] text-[#FCF8E8]'
              }`}
            >
              {unpaidCreditBillsCount}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setCreditSubFilter('paid')}
            className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-xs transition ${
              creditSubFilter === 'paid'
                ? 'bg-[#DF7861] text-[#FCF8E8] shadow-xs'
                : 'border border-[#ECB390] bg-[#FCF8E8] text-[#3D251E] hover:bg-[#ECB390]/50'
            }`}
          >
            <span>{t('bills.filterPaidUdhari')}</span>
            <span className="rounded bg-[#ECDFC8] px-1.5 py-0.2 text-[10px] font-black text-[#5C4338]">
              {paidCreditBillsCount}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setCreditSubFilter('all')}
            className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-xs transition ${
              creditSubFilter === 'all'
                ? 'bg-[#DF7861] text-[#FCF8E8] shadow-xs'
                : 'border border-[#ECB390] bg-[#FCF8E8] text-[#3D251E] hover:bg-[#ECB390]/50'
            }`}
          >
            <span>{t('bills.filterAllUdhari')}</span>
            <span className="rounded bg-[#ECDFC8] px-1.5 py-0.2 text-[10px] font-black text-[#5C4338]">
              {creditBills.length}
            </span>
          </button>
        </div>
      )}

      {/* Live Predictive Search & Date Range Filter Bar */}
      <div className="grid shrink-0 gap-2 rounded-md border border-[#ECB390] bg-[#ECDFC8]/60 p-2.5 md:grid-cols-[1.8fr_1fr_1fr_auto]">
        <div className="space-y-0.5 text-[11px] font-bold text-[#5C4338]">
          <span>
            {t('bills.billNo')} / {t('bills.customer')}
          </span>
          <PredictiveSearchInput
            value={invoiceSearch}
            onChange={setInvoiceSearch}
            suggestions={billSuggestions}
            placeholder={t('bills.searchPlaceholder')}
          />
        </div>

        <label className="space-y-0.5 text-[11px] font-bold text-[#5C4338]">
          <span>{t('bills.fromDate')}</span>
          <input
            type="date"
            value={invoiceStartDate}
            onChange={(e) => setInvoiceStartDate(e.target.value)}
            className="w-full rounded-md border border-[#ECB390] bg-[#FCF8E8] px-3 py-1.5 text-xs font-semibold text-[#3D251E] outline-none focus:border-[#DF7861] font-english"
          />
        </label>

        <label className="space-y-0.5 text-[11px] font-bold text-[#5C4338]">
          <span>{t('bills.toDate')}</span>
          <input
            type="date"
            value={invoiceEndDate}
            onChange={(e) => setInvoiceEndDate(e.target.value)}
            className="w-full rounded-md border border-[#ECB390] bg-[#FCF8E8] px-3 py-1.5 text-xs font-semibold text-[#3D251E] outline-none focus:border-[#DF7861] font-english"
          />
        </label>

        <button
          type="button"
          onClick={() => {
            setViewMode('invoices')
            setSearchParams({})
            setInvoiceDateFilter('range')
            void fetchInvoices()
          }}
          className="self-end rounded-md bg-[#DF7861] px-4 py-1.5 text-xs font-bold text-[#FCF8E8] hover:bg-[#c9624c]"
        >
          {t('bills.filterRange')}
        </button>
      </div>

      {/* Bounded Scrollable Bills Table */}
      <div
        tabIndex={0}
        role="region"
        aria-label={t('bills.title')}
        className="pos-scroll min-h-0 flex-1 rounded-md border border-[#ECB390] bg-[#FCF8E8]"
      >
        {invoiceLoading ? (
          <div className="flex h-full items-center justify-center py-12 text-center text-xs font-bold text-[#7A6258]">
            {t('status.loading')}
          </div>
        ) : activeRows.length === 0 ? (
          <div className="flex h-full items-center justify-center py-12 text-center text-xs font-bold text-[#7A6258]">
            {t('bills.noBillsFound')}
          </div>
        ) : (
          <table className="pos-table text-left text-xs">
            <thead className="bg-[#ECB390] text-[11px] font-bold text-[#3D251E]">
              <tr>
                <th className="px-3.5 py-2.5">{t('bills.billNo')}</th>
                <th className="px-3.5 py-2.5">{t('bills.date')}</th>
                <th className="px-3.5 py-2.5">{t('bills.customer')}</th>
                <th className="px-3.5 py-2.5">{t('bills.payment')}</th>
                <th className="px-3.5 py-2.5 text-right">{t('bills.amount')}</th>
                <th className="px-3.5 py-2.5 text-right">{t('bills.paidAmount')}</th>
                <th className="px-3.5 py-2.5 text-right">{t('bills.balanceDue')}</th>
                <th className="px-3.5 py-2.5 text-center">{t('bills.status')}</th>
                <th className="px-3.5 py-2.5 text-right">{t('bills.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#ECDFC8] bg-[#FCF8E8]">
              {activeRows.map((bill) => {
                const isCancelled =
                  bill.status === 'CANCELLED' || bill.status === 'VOIDED'
                const isUdhariPaidBill =
                  bill.payment_status === 'UDHARI_PAID' ||
                  bill.payment_status === 'UDHARI_PARTIAL_PAID'
                const grandTotal = Number(bill.grand_total ?? bill.amount ?? 0)
                const balanceDue = Number(bill.balance_due ?? 0)
                const paidAmt = Number(
                  bill.paid_amount !== undefined
                    ? bill.paid_amount
                    : Math.max(0, grandTotal - balanceDue),
                )

                return (
                  <tr key={bill.id} className="transition hover:bg-[#ECDFC8]/60">
                    <td className="px-3.5 py-2 font-bold text-[#3D251E] font-english">
                      <div>{bill.invoice_number}</div>
                      {bill.payment_reference && bill.parent_invoice_id && (
                        <div className="text-[10px] font-semibold text-[#7A6258]">
                          Ref: {bill.payment_reference}
                        </div>
                      )}
                    </td>
                    <td className="px-3.5 py-2 text-[#5C4338] font-english">
                      {new Date(bill.date).toLocaleString(
                        isCurrentLangMr ? 'mr-IN' : 'en-GB',
                        {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        },
                      )}
                    </td>
                    <td className="px-3.5 py-2">
                      {bill.customer_name ? (
                        <div>
                          <div className="font-bold text-[#3D251E]">
                            {localizeDynamicText(bill.customer_name, isCurrentLangMr)}
                          </div>
                          {bill.customer_phone && (
                            <div className="text-[11px] text-[#7A6258] font-english">
                              {bill.customer_phone}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-[#8C7368] font-english">—</span>
                      )}
                    </td>
                    <td className="px-3.5 py-2">
                      <span className="rounded border border-[#ECB390] bg-[#ECDFC8] px-2 py-0.5 text-[11px] font-bold text-[#3D251E]">
                        {paymentLabels[bill.payment_method] || bill.payment_method}
                      </span>
                    </td>
                    <td className="px-3.5 py-2 text-right font-black text-[#3D251E] font-english">
                      {currency} {grandTotal.toFixed(2)}
                    </td>
                    <td className="px-3.5 py-2 text-right font-bold text-emerald-800 font-english">
                      {currency} {paidAmt.toFixed(2)}
                    </td>
                    <td className="px-3.5 py-2 text-right font-black font-english">
                      {balanceDue > 0.01 ? (
                        <span className="text-[#DF7861]">
                          {currency} {balanceDue.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-[#8C7368]">₹ 0.00</span>
                      )}
                    </td>
                    <td className="px-3.5 py-2 text-center">
                      {isCancelled ? (
                        <span className="inline-block rounded border border-[#DF7861] bg-[#ECB390]/40 px-2 py-0.5 text-[10px] font-bold text-[#B93829]">
                          {t('bills.cancelledBadge')}
                        </span>
                      ) : isUdhariPaidBill ? (
                        <span className="inline-block rounded border border-emerald-400 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                          {t('bills.udhariPaidBadge')}
                        </span>
                      ) : balanceDue > 0.01 ? (
                        <span className="inline-block rounded border border-[#DF7861] bg-[#ECDFC8] px-2 py-0.5 text-[10px] font-bold text-[#DF7861]">
                          {t('billing.payCredit')}
                        </span>
                      ) : (
                        <span className="inline-block rounded border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                          {t('bills.completedBadge')}
                        </span>
                      )}
                    </td>
                    <td className="px-3.5 py-2 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {balanceDue > 0.01 && !isCancelled && !bill.has_cancel_record && (
                          <button
                            type="button"
                            onClick={() => handleOpenSettleModal(bill)}
                            className="inline-flex items-center gap-1 rounded bg-[#DF7861] px-2.5 py-1 text-[11px] font-bold text-[#FCF8E8] hover:bg-[#c9624c]"
                          >
                            <LuHandCoins className="h-3.5 w-3.5" />
                            <span>{t('bills.settleCreditBtn')}</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => void openInvoiceDetail(bill)}
                          className="inline-flex items-center gap-1 rounded border border-[#ECB390] bg-[#ECDFC8] px-2.5 py-1 text-[11px] font-bold text-[#3D251E] hover:bg-[#ECB390]"
                        >
                          <LuEye className="h-3.5 w-3.5 text-[#DF7861]" />
                          <span>{t('bills.view')}</span>
                        </button>
                        {currentUser?.role === 'ADMIN' &&
                          !isCancelled &&
                          !bill.has_cancel_record && (
                            <button
                              type="button"
                              onClick={() => cancelInvoice(bill.id)}
                              className="inline-flex items-center gap-1 rounded border border-[#DF7861]/70 bg-[#ECB390]/35 px-2.5 py-1 text-[11px] font-bold text-[#B93829] hover:bg-[#ECB390]/70"
                            >
                              <LuBan className="h-3 w-3" />
                              <span>{t('bills.cancelBill')}</span>
                            </button>
                          )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Customer Credit (Udhari) Settlement Modal -> Creates New Bill ID */}
      {settleModalBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#3D251E]/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-md border-2 border-[#ECB390] bg-[#FCF8E8] p-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#ECB390] pb-2.5">
              <div>
                <h3 className="text-sm font-bold uppercase text-[#3D251E]">
                  {t('bills.settleCreditTitle')}
                </h3>
                <p className="text-[11px] text-[#7A6258] font-english">
                  {settleModalBill.invoice_number} •{' '}
                  {settleModalBill.customer_name || 'Customer'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSettleModalBill(null)}
                className="rounded border border-[#ECB390] bg-[#ECDFC8] px-2 py-0.5 text-xs font-bold text-[#3D251E]"
              >
                <LuX className="h-3.5 w-3.5" />
              </button>
            </div>

            <form onSubmit={handleSettleSubmit} className="mt-3 space-y-3">
              <div className="flex items-center justify-between rounded border border-[#ECB390] bg-[#ECDFC8]/70 px-3 py-2 text-xs">
                <span className="font-bold text-[#5C4338]">
                  {t('bills.balanceDue')}:
                </span>
                <span className="font-mono text-sm font-black text-[#DF7861]">
                  {currency}{' '}
                  {Number(
                    settleModalBill.balance_due ??
                      settleModalBill.grand_total ??
                      0,
                  ).toFixed(2)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-1">
                  <span className="text-xs font-bold text-[#3D251E]">
                    {t('bills.settleAmount')} ({currency}) *
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    max={Number(
                      settleModalBill.balance_due ??
                        settleModalBill.grand_total ??
                        999999,
                    )}
                    required
                    value={settleAmount}
                    onChange={(e) => setSettleAmount(e.target.value)}
                    className="w-full rounded border border-[#ECB390] bg-white px-2.5 py-1.5 text-xs font-bold text-[#3D251E] outline-none focus:border-[#DF7861] font-english"
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-xs font-bold text-[#3D251E]">
                    {t('bills.settleMode')} *
                  </span>
                  <select
                    value={settleMode}
                    onChange={(e) => setSettleMode(e.target.value)}
                    className="w-full rounded border border-[#ECB390] bg-white px-2.5 py-1.5 text-xs font-bold text-[#3D251E] outline-none focus:border-[#DF7861]"
                  >
                    <option value="CASH">{t('billing.payCash')}</option>
                    <option value="UPI">UPI QR</option>
                    <option value="CARD">{t('billing.payCard')}</option>
                  </select>
                </label>
              </div>

              {settleMode === 'UPI' && (
                <div className="rounded-md border border-[#ECB390] bg-[#ECDFC8]/40 p-3 text-center">
                  <div className="mb-2 text-xs font-bold text-[#3D251E]">
                    {t('bills.qrCodeScanToPay')}
                  </div>
                  {paymentSettings?.has_static_qr && paymentSettings?.static_qr_image ? (
                    <img
                      src={paymentSettings.static_qr_image}
                      alt="Store UPI QR"
                      className="mx-auto h-36 w-36 rounded border border-[#ECB390] object-contain shadow-xs"
                    />
                  ) : paymentSettings?.upi_id ? (
                    <div className="inline-block rounded border border-[#ECB390] bg-white p-2 shadow-xs">
                      <QrCodeCanvas
                        value={`upi://pay?pa=${paymentSettings.upi_id}&pn=${encodeURIComponent(
                          paymentSettings.payee_name || storeSettings?.store_name || 'Store',
                        )}&am=${parseFloat(settleAmount) || 0}&cu=INR&tn=${encodeURIComponent(
                          `Udhari ${settleModalBill.invoice_number}`,
                        )}`}
                        size={140}
                      />
                    </div>
                  ) : (
                    <div className="text-xs font-bold text-[#DF7861]">{t('msg.upiConfigError')}</div>
                  )}
                  {paymentSettings?.upi_id && (
                    <div className="mt-2 text-xs font-bold text-[#5C4338]">
                      UPI ID:{' '}
                      <span className="font-english font-black text-[#3D251E]">
                        {paymentSettings.upi_id}
                      </span>
                    </div>
                  )}
                </div>
              )}

              <label className="block space-y-1">
                <span className="text-xs font-bold text-[#3D251E]">
                  {t('billing.paymentRef')}
                </span>
                <input
                  type="text"
                  value={settleNote}
                  onChange={(e) => setSettleNote(e.target.value)}
                  placeholder={t('billing.paymentRefPlaceholder')}
                  className="w-full rounded border border-[#ECB390] bg-white px-2.5 py-1.5 text-xs text-[#3D251E] outline-none focus:border-[#DF7861]"
                />
              </label>

              <div className="flex justify-end gap-2 border-t border-[#ECB390] pt-3">
                <button
                  type="button"
                  onClick={() => setSettleModalBill(null)}
                  className="rounded border border-[#ECB390] bg-[#ECDFC8] px-4 py-1.5 text-xs font-bold text-[#3D251E] hover:bg-[#ECB390]"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={settling}
                  className="rounded bg-[#DF7861] px-4 py-1.5 text-xs font-bold text-[#FCF8E8] hover:bg-[#c9624c] disabled:opacity-50"
                >
                  {settling ? t('billing.processingBill') : t('bills.settleSubmit')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
