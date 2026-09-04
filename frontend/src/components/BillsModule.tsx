import React from 'react'
import { useTranslation } from 'react-i18next'
import { useWorkspace } from '../context/WorkspaceContext'

export const BillsModule: React.FC = () => {
  const { t } = useTranslation()
  const {
    bills,
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
    openInvoiceDetail,
    cancelInvoice,
    currentUser,
    isCurrentLangMr,
  } = useWorkspace()

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <h3 className="text-2xl font-black text-stone-800">{t('bills.title')}</h3>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setInvoiceDateFilter('all')
              setInvoiceStartDate('')
              setInvoiceEndDate('')
              void fetchInvoices()
            }}
            className={`rounded-xl px-3 py-2 text-xs font-bold ${
              invoiceDateFilter === 'all'
                ? 'bg-stone-900 text-white'
                : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
            }`}
          >
            {t('bills.filterAll')}
          </button>
          <button
            type="button"
            onClick={() => {
              setInvoiceDateFilter('today')
              setInvoiceStartDate('')
              setInvoiceEndDate('')
              void fetchInvoices()
            }}
            className={`rounded-xl px-3 py-2 text-xs font-bold ${
              invoiceDateFilter === 'today'
                ? 'bg-emerald-600 text-white'
                : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
            }`}
          >
            {t('bills.filterToday')}
          </button>
        </div>
      </div>

      <div className="mb-5 grid gap-3 rounded-2xl border border-stone-200 bg-stone-50 p-4 md:grid-cols-[1.2fr_1fr_1fr_auto]">
        <label className="space-y-1 text-xs font-bold text-stone-600">
          <span>{t('bills.billNo')}</span>
          <input
            value={invoiceSearch}
            onChange={(e) => setInvoiceSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                void fetchInvoices()
              }
            }}
            placeholder={t('bills.searchPlaceholder')}
            className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-stone-500"
          />
        </label>

        <label className="space-y-1 text-xs font-bold text-stone-600">
          <span>{t('bills.fromDate')}</span>
          <input
            type="date"
            value={invoiceStartDate}
            onChange={(e) => setInvoiceStartDate(e.target.value)}
            className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-stone-500"
          />
        </label>

        <label className="space-y-1 text-xs font-bold text-stone-600">
          <span>{t('bills.toDate')}</span>
          <input
            type="date"
            value={invoiceEndDate}
            onChange={(e) => setInvoiceEndDate(e.target.value)}
            className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-stone-500"
          />
        </label>

        <button
          type="button"
          onClick={() => {
            setInvoiceDateFilter('range')
            void fetchInvoices()
          }}
          className="self-end rounded-xl bg-stone-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-stone-800"
        >
          {t('bills.filterRange')}
        </button>
      </div>

      <div className="max-h-[620px] overflow-auto rounded-2xl border border-stone-200">
        {invoiceLoading ? (
          <div className="px-4 py-10 text-center text-sm text-stone-500">
            {t('status.loading')}
          </div>
        ) : (
          <table className="min-w-full text-left text-sm">
            <thead className="bg-stone-100 text-stone-700">
              <tr>
                <th className="px-4 py-3 font-bold">{t('bills.billNo')}</th>
                <th className="px-4 py-3 font-bold">{t('bills.date')}</th>
                <th className="px-4 py-3 font-bold">{t('bills.amount')}</th>
                <th className="px-4 py-3 font-bold">{t('bills.payment')}</th>
                <th className="px-4 py-3 font-bold">{t('bills.status')}</th>
                <th className="px-4 py-3 font-bold">{t('bills.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {bills.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-stone-500">
                    {t('bills.noBillsFound')}
                  </td>
                </tr>
              ) : (
                bills.map((bill) => (
                  <tr key={bill.id} className="border-t border-stone-200 hover:bg-stone-50">
                    <td className="px-4 py-3 font-semibold text-stone-800">{bill.invoice_number}</td>
                    <td className="px-4 py-3">
                      {new Date(bill.date).toLocaleString(isCurrentLangMr ? 'mr-IN' : 'en-GB')}
                    </td>
                    <td className="px-4 py-3 font-semibold">₹ {Number(bill.amount ?? 0).toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-md bg-stone-100 px-2 py-1 font-bold text-stone-800">
                        {bill.payment_method}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-1 text-[10px] font-black ${
                          bill.status === 'CANCELLED'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {bill.status === 'CANCELLED' ? t('bills.cancelledBadge') : t('bills.completedBadge')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => void openInvoiceDetail(bill)}
                          className="rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-xs font-bold text-stone-700 hover:bg-stone-100"
                        >
                          {t('bills.view')}
                        </button>
                        {currentUser?.role === 'ADMIN' && bill.status !== 'CANCELLED' && (
                          <button
                            type="button"
                            onClick={() => void cancelInvoice(bill.id)}
                            className="rounded-lg bg-red-600 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-red-700"
                          >
                            {t('bills.cancelBill')}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
