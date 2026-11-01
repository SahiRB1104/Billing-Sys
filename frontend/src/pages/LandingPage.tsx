import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import { useWorkspace } from '../context/WorkspaceContext'
import { localizeDynamicText, toDevanagariDigits } from '../utils/transliteration'
import {
  formatCategoryDisplay,
  formatProductName,
  formatUnitDisplay,
} from '../constants/productOptions'
import {
  LuIndianRupee,
  LuReceipt,
  LuPackage,
  LuTriangleAlert,
  LuBookOpen,
  LuPlus,
  LuRefreshCw,
  LuArrowRight,
  LuEye,
} from '../components/Icons'

const DAY_NAME_MR: Record<string, string> = {
  Mon: 'सोम',
  Tue: 'मंगळ',
  Wed: 'बुध',
  Thu: 'गुरु',
  Fri: 'शुक्र',
  Sat: 'शनि',
  Sun: 'रवि',
}

export const LandingPage: React.FC = () => {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { currentUser } = useAuth()
  const {
    dashboardStats,
    fetchDashboardStats,
    openInvoiceDetail,
    storeSettings,
  } = useWorkspace()

  useEffect(() => {
    void fetchDashboardStats()
  }, [])

  const isMarathi = i18n.language === 'mr' || i18n.language.startsWith('mr')
  const currency = storeSettings?.currency_symbol || '₹'
  const isAdmin = currentUser?.role === 'ADMIN'

  const storeName = localizeDynamicText(
    storeSettings?.store_name || t('app.shopPoint'),
    isMarathi,
  )
  const operatorName = localizeDynamicText(
    currentUser?.name || currentUser?.username || 'Admin',
    isMarathi,
  )

  const paymentLabels: Record<string, string> = {
    CASH: t('billing.payCash'),
    UPI: t('billing.payUpi'),
    CARD: t('billing.payCard'),
    CREDIT: t('billing.payCredit'),
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-2 overflow-hidden">
      {/* Row 1: POS Terminal Header Strip */}
      <div className="flex shrink-0 items-center justify-between gap-4 rounded-md border border-[#ECB390] bg-[#FCF8E8] px-4 py-2 shadow-xs">
        <div className="min-w-0">
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#7A6258]">
            {t('dashboard.subtitle')}
          </div>
          <div className="flex flex-wrap items-baseline gap-2">
            <h2 className="text-base font-black text-[#3D251E]">
              {t('home.welcome')}, {operatorName}
            </h2>
            <span className="text-xs font-semibold text-[#5C4338]">
              • {storeName} •{' '}
              {new Date().toLocaleDateString(isMarathi ? 'mr-IN' : 'en-IN', {
                weekday: 'short',
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => navigate('/billing')}
          className="flex shrink-0 items-center gap-1.5 rounded-md bg-[#DF7861] px-4 py-2 text-xs font-bold text-[#FCF8E8] shadow-xs transition hover:bg-[#c9624c]"
        >
          <LuPlus className="h-4 w-4" />
          <span>{t('dashboard.newBillAction')}</span>
        </button>
      </div>

      {/* Row 2: Compact KPI Metric Cards (5 cards for Admin including Total Udhari, 4 for Cashier) */}
      <div
        className={`grid shrink-0 grid-cols-2 gap-2 ${
          isAdmin ? 'lg:grid-cols-5' : 'lg:grid-cols-4'
        }`}
      >
        {/* Today's Sales */}
        <div className="flex items-center justify-between rounded-md border border-[#ECB390] bg-[#FCF8E8] px-3.5 py-2">
          <div>
            <div className="text-xs font-bold text-[#5C4338]">
              {t('dashboard.todaySales')}
            </div>
            <div className="mt-0.5 text-lg font-black text-[#3D251E] font-english">
              {currency} {Number(dashboardStats?.today_sales ?? 0).toFixed(2)}
            </div>
            <div className="text-[11px] font-semibold text-[#7A6258]">
              {dashboardStats?.today_bills_count ?? 0}{' '}
              {t('dashboard.billsCompletedCount')}
            </div>
          </div>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[#ECB390] bg-[#ECDFC8] text-[#DF7861]">
            <LuIndianRupee className="h-4 w-4" />
          </span>
        </div>

        {/* Completed Bills */}
        <div className="flex items-center justify-between rounded-md border border-[#ECB390] bg-[#FCF8E8] px-3.5 py-2">
          <div>
            <div className="text-xs font-bold text-[#5C4338]">
              {t('dashboard.todayBills')}
            </div>
            <div className="mt-0.5 text-lg font-black text-[#3D251E] font-english">
              {dashboardStats?.today_bills_count ?? 0}
            </div>
            <div className="text-[11px] font-semibold text-[#7A6258]">
              {t('dashboard.todayTransactions')}
            </div>
          </div>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[#ECB390] bg-[#ECDFC8] text-[#DF7861]">
            <LuReceipt className="h-4 w-4" />
          </span>
        </div>

        {/* Active Products */}
        <div className="flex items-center justify-between rounded-md border border-[#ECB390] bg-[#FCF8E8] px-3.5 py-2">
          <div>
            <div className="text-xs font-bold text-[#5C4338]">
              {t('dashboard.activeProducts')}
            </div>
            <div className="mt-0.5 text-lg font-black text-[#3D251E] font-english">
              {dashboardStats?.total_products_count ?? 0}
            </div>
            <div className="text-[11px] font-semibold text-[#7A6258]">
              {t('dashboard.inCatalog')}
            </div>
          </div>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[#ECB390] bg-[#ECDFC8] text-[#DF7861]">
            <LuPackage className="h-4 w-4" />
          </span>
        </div>

        {/* Low Stock Alerts */}
        <div
          className={`flex items-center justify-between rounded-md border px-3.5 py-2 ${
            (dashboardStats?.low_stock_count ?? 0) > 0
              ? 'border-[#DF7861] bg-[#ECB390]/35'
              : 'border-[#ECB390] bg-[#FCF8E8]'
          }`}
        >
          <div>
            <div className="text-xs font-bold text-[#5C4338]">
              {t('dashboard.lowStockAlerts')}
            </div>
            <div
              className={`mt-0.5 text-lg font-black font-english ${
                (dashboardStats?.low_stock_count ?? 0) > 0
                  ? 'text-[#B93829]'
                  : 'text-[#3D251E]'
              }`}
            >
              {dashboardStats?.low_stock_count ?? 0}
            </div>
            <div className="text-[11px] font-semibold text-[#7A6258]">
              {(dashboardStats?.low_stock_count ?? 0) > 0
                ? t('dashboard.reorderNeeded')
                : t('dashboard.noLowStock')}
            </div>
          </div>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[#ECB390] bg-[#ECDFC8] text-[#DF7861]">
            <LuTriangleAlert className="h-4 w-4" />
          </span>
        </div>

        {/* Total Pending Udhari (Admin KPI) */}
        {isAdmin && (
          <div
            onClick={() => navigate('/bills?tab=credits')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter') navigate('/bills?tab=credits')
            }}
            className="flex cursor-pointer items-center justify-between rounded-md border border-[#DF7861] bg-[#FCF8E8] px-3.5 py-2 transition hover:bg-[#ECB390]/30"
          >
            <div>
              <div className="text-xs font-bold text-[#5C4338]">
                {t('dashboard.totalUdhariTitle')}
              </div>
              <div className="mt-0.5 text-lg font-black text-[#DF7861] font-english">
                {currency}{' '}
                {Number(dashboardStats?.total_udhari_due ?? 0).toFixed(2)}
              </div>
              <div className="text-[11px] font-semibold text-[#7A6258]">
                {dashboardStats?.udhari_bills_count ?? 0}{' '}
                {t('dashboard.udhariCountSub')}
              </div>
            </div>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[#DF7861] bg-[#DF7861] text-[#FCF8E8]">
              <LuBookOpen className="h-4 w-4" />
            </span>
          </div>
        )}
      </div>

      {/* Row 3: Payment Breakdown & 7-Day Sales Trend */}
      <div className="grid shrink-0 grid-cols-1 gap-2 lg:grid-cols-2">
        {/* Payment Methods Breakdown */}
        <div className="flex flex-col justify-between rounded-md border border-[#ECB390] bg-[#FCF8E8] p-3">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wide text-[#3D251E]">
              {t('dashboard.paymentBreakdown')}
            </h3>
            <p className="text-[11px] text-[#7A6258]">
              {t('dashboard.paymentBreakdownSub')}
            </p>
          </div>

          <div className="mt-2 grid grid-cols-4 gap-2">
            {['CASH', 'UPI', 'CARD', 'CREDIT'].map((method) => {
              const data = dashboardStats?.payment_breakdown?.[method] || {
                count: 0,
                amount: 0,
              }
              return (
                <div
                  key={method}
                  className="rounded-md border border-[#ECB390] bg-[#ECDFC8]/70 px-3 py-1.5"
                >
                  <div className="truncate text-[10px] font-bold text-[#5C4338]">
                    {paymentLabels[method] || method}
                  </div>
                  <div className="mt-0.5 text-base font-black text-[#3D251E] font-english">
                    {currency}
                    {data.amount.toFixed(0)}
                  </div>
                  <div className="text-[10px] font-semibold text-[#7A6258]">
                    {data.count} {t('dashboard.billsWord')}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* 7-Day Trend Bar Visualization */}
        <div className="flex flex-col justify-between rounded-md border border-[#ECB390] bg-[#FCF8E8] p-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wide text-[#3D251E]">
                {t('dashboard.weeklyTrend')}
              </h3>
              <p className="text-[11px] text-[#7A6258]">
                {t('dashboard.weeklyTrendSub')}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void fetchDashboardStats()}
              className="flex items-center gap-1 rounded border border-[#ECB390] bg-[#ECDFC8] px-2.5 py-1 text-[11px] font-bold text-[#3D251E] hover:bg-[#ECB390]"
            >
              <LuRefreshCw className="h-3 w-3 text-[#DF7861]" />
              <span>{t('dashboard.refresh')}</span>
            </button>
          </div>

          <div className="mt-2 flex h-20 items-end justify-between gap-2 border-b border-[#ECB390] pb-1">
            {dashboardStats?.daily_trend?.map((item) => {
              const maxSale = Math.max(
                ...dashboardStats.daily_trend.map((d) => d.sales),
                100,
              )
              const heightPct = Math.max(
                10,
                Math.round((item.sales / maxSale) * 100),
              )
              const dayLabel = isMarathi
                ? DAY_NAME_MR[item.day_name] || item.day_name
                : item.day_name
              const rawAmt =
                item.sales > 0
                  ? item.sales > 999
                    ? `${(item.sales / 1000).toFixed(1)}k`
                    : String(Math.round(item.sales))
                  : '0'
              return (
                <div
                  key={item.date}
                  className="flex h-full flex-1 flex-col items-center justify-end gap-1"
                >
                  <div className="text-[10px] font-bold text-[#5C4338] font-english">
                    {currency}
                    {isMarathi ? toDevanagariDigits(rawAmt) : rawAmt}
                  </div>
                  <div
                    className="flex w-full max-w-[28px] items-end justify-center rounded-t bg-[#ECDFC8] transition-all"
                    style={{ height: `${heightPct}%` }}
                  >
                    <div
                      className="w-full rounded-t bg-[#DF7861]"
                      style={{ height: `${Math.min(100, heightPct)}%` }}
                    />
                  </div>
                  <div className="text-[10px] font-bold text-[#3D251E]">
                    {dayLabel}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Row 4: Bounded Bottom Tables (Internal Scroll Only, Zero Window Scroll) */}
      <div
        className={`grid min-h-0 flex-1 grid-cols-1 gap-2 overflow-hidden ${
          isAdmin ? 'lg:grid-cols-3' : 'lg:grid-cols-2'
        }`}
      >
        {/* Priority Pending Udhari Table (Admin only - Highest Amount & Oldest Pending First) */}
        {isAdmin && (
          <div className="flex min-h-0 flex-col rounded-md border border-[#ECB390] bg-[#FCF8E8] p-3">
            <div className="mb-2 flex shrink-0 items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wide text-[#3D251E]">
                  {t('dashboard.priorityUdhariTitle')}
                </h3>
                <p className="text-[11px] text-[#7A6258]">
                  {t('dashboard.priorityUdhariSub')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/bills?tab=credits')}
                className="flex items-center gap-1 rounded border border-[#ECB390] bg-[#ECDFC8] px-2.5 py-1 text-xs font-bold text-[#3D251E] hover:bg-[#ECB390]"
              >
                <span>{t('dashboard.viewAll')}</span>
                <LuArrowRight className="h-3 w-3" />
              </button>
            </div>

            {!dashboardStats?.priority_udhari_bills ||
            dashboardStats.priority_udhari_bills.length === 0 ? (
              <div className="flex flex-1 items-center justify-center rounded border border-dashed border-[#ECB390] bg-[#ECDFC8]/40 p-4 text-center text-xs font-bold text-[#5C4338]">
                {t('dashboard.noPriorityUdhari')}
              </div>
            ) : (
              <div
                tabIndex={0}
                role="region"
                aria-label={t('dashboard.priorityUdhariTitle')}
                className="pos-scroll min-h-0 flex-1 rounded border border-[#ECB390] bg-[#FCF8E8]"
              >
                <table className="pos-table text-left text-xs">
                  <thead className="bg-[#ECB390] text-[11px] font-bold text-[#3D251E]">
                    <tr>
                      <th className="px-2.5 py-2">{t('bills.customer')}</th>
                      <th className="px-2 py-2 text-center">
                        {t('dashboard.colDaysPending')}
                      </th>
                      <th className="px-2.5 py-2 text-right">
                        {t('bills.balanceDue')}
                      </th>
                      <th className="px-2 py-2 text-center">
                        {t('bills.actions')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#ECDFC8] bg-[#FCF8E8]">
                    {dashboardStats.priority_udhari_bills.map((ub) => (
                      <tr key={ub.id} className="hover:bg-[#ECDFC8]/60">
                        <td className="px-2.5 py-2">
                          <div className="font-bold text-[#3D251E]">
                            {localizeDynamicText(
                              ub.customer_name || '-',
                              isMarathi,
                            )}
                          </div>
                          <div className="text-[10px] font-semibold text-[#7A6258] font-english">
                            {ub.invoice_number}
                            {ub.customer_phone ? ` • ${ub.customer_phone}` : ''}
                          </div>
                        </td>
                        <td className="px-2 py-2 text-center font-bold text-[#5C4338]">
                          <span className="rounded border border-[#ECB390] bg-[#ECDFC8] px-1.5 py-0.5 text-[10px] font-bold text-[#3D251E]">
                            {ub.days_pending ?? 0} {t('dashboard.daysAgo')}
                          </span>
                        </td>
                        <td className="px-2.5 py-2 text-right font-black text-[#DF7861] font-english">
                          {currency}
                          {Number(ub.balance_due ?? ub.grand_total).toFixed(2)}
                        </td>
                        <td className="px-2 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => openInvoiceDetail(ub)}
                            className="inline-flex items-center gap-1 rounded border border-[#ECB390] bg-[#ECDFC8] px-2 py-1 text-[10px] font-bold text-[#3D251E] hover:bg-[#ECB390]"
                          >
                            <LuEye className="h-3 w-3" />
                            <span>{t('bills.view')}</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Low Stock Alert Table */}
        <div className="flex min-h-0 flex-col rounded-md border border-[#ECB390] bg-[#FCF8E8] p-3">
          <div className="mb-2 flex shrink-0 items-center justify-between">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wide text-[#3D251E]">
                {t('dashboard.lowStockTitle')}
              </h3>
              <p className="text-[11px] text-[#7A6258]">
                {t('dashboard.lowStockSub')}
              </p>
            </div>
            {isAdmin && (
              <button
                type="button"
                onClick={() => navigate('/products')}
                className="flex items-center gap-1 rounded border border-[#ECB390] bg-[#ECDFC8] px-2.5 py-1 text-xs font-bold text-[#3D251E] hover:bg-[#ECB390]"
              >
                <span>{t('dashboard.restock')}</span>
                <LuArrowRight className="h-3 w-3" />
              </button>
            )}
          </div>

          {!dashboardStats?.low_stock_products ||
          dashboardStats.low_stock_products.length === 0 ? (
            <div className="flex flex-1 items-center justify-center rounded border border-dashed border-[#ECB390] bg-[#ECDFC8]/40 p-4 text-center text-xs font-bold text-[#5C4338]">
              {t('dashboard.noLowStock')}
            </div>
          ) : (
            <div
              tabIndex={0}
              role="region"
              aria-label={t('dashboard.lowStockTitle')}
              className="pos-scroll min-h-0 flex-1 rounded border border-[#ECB390] bg-[#FCF8E8]"
            >
              <table className="pos-table text-left text-xs">
                <thead className="bg-[#ECB390] text-[11px] font-bold text-[#3D251E]">
                  <tr>
                    <th className="px-3 py-2">{t('dashboard.colProduct')}</th>
                    <th className="px-3 py-2">{t('dashboard.colCategory')}</th>
                    <th className="px-3 py-2 text-right">
                      {t('dashboard.colCurrentStock')}
                    </th>
                    <th className="px-3 py-2 text-right">
                      {t('dashboard.colMinLimit')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#ECDFC8] bg-[#FCF8E8]">
                  {dashboardStats.low_stock_products.map((p) => (
                    <tr key={p.id} className="hover:bg-[#ECDFC8]/60">
                      <td className="px-3 py-2 font-bold text-[#3D251E]">
                        {formatProductName(p.name_mr, isMarathi)}
                      </td>
                      <td className="px-3 py-2 text-[#5C4338]">
                        {formatCategoryDisplay(p.category_mr, isMarathi) || '-'}
                      </td>
                      <td className="px-3 py-2 text-right font-black text-[#B93829] font-english">
                        {p.current_stock}{' '}
                        {formatUnitDisplay(p.unit_display, isMarathi)}
                      </td>
                      <td className="px-3 py-2 text-right font-semibold text-[#5C4338] font-english">
                        {p.low_stock_level}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Recent Invoices Table */}
        <div className="flex min-h-0 flex-col rounded-md border border-[#ECB390] bg-[#FCF8E8] p-3">
          <div className="mb-2 flex shrink-0 items-center justify-between">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wide text-[#3D251E]">
                {t('dashboard.recentBillsTitle')}
              </h3>
              <p className="text-[11px] text-[#7A6258]">
                {t('dashboard.recentBillsSub')}
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/bills')}
              className="flex items-center gap-1 rounded border border-[#ECB390] bg-[#ECDFC8] px-2.5 py-1 text-xs font-bold text-[#3D251E] hover:bg-[#ECB390]"
            >
              <span>{t('dashboard.viewAll')}</span>
              <LuArrowRight className="h-3 w-3" />
            </button>
          </div>

          {!dashboardStats?.recent_invoices ||
          dashboardStats.recent_invoices.length === 0 ? (
            <div className="flex flex-1 items-center justify-center rounded border border-dashed border-[#ECB390] bg-[#ECDFC8]/40 p-4 text-center text-xs font-bold text-[#5C4338]">
              {t('dashboard.noRecentBills')}
            </div>
          ) : (
            <div
              tabIndex={0}
              role="region"
              aria-label={t('dashboard.recentBillsTitle')}
              className="pos-scroll min-h-0 flex-1 rounded border border-[#ECB390] bg-[#FCF8E8]"
            >
              <table className="pos-table text-left text-xs">
                <thead className="bg-[#ECB390] text-[11px] font-bold text-[#3D251E]">
                  <tr>
                    <th className="px-2.5 py-2">{t('bills.billNo')}</th>
                    <th className="px-2 py-2">{t('dashboard.colTime')}</th>
                    <th className="px-2 py-2">{t('bills.payment')}</th>
                    <th className="px-2.5 py-2 text-right">{t('bills.amount')}</th>
                    <th className="px-2 py-2 text-center">
                      {t('bills.actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#ECDFC8] bg-[#FCF8E8]">
                  {dashboardStats.recent_invoices.slice(0, 10).map((inv) => (
                    <tr key={inv.id} className="hover:bg-[#ECDFC8]/60">
                      <td className="px-2.5 py-2 font-bold text-[#3D251E] font-english">
                        {inv.invoice_number}
                      </td>
                      <td className="px-2 py-2 text-[#5C4338] font-english">
                        {new Date(inv.date).toLocaleTimeString(
                          isMarathi ? 'mr-IN' : 'en-IN',
                          {
                            hour: '2-digit',
                            minute: '2-digit',
                          },
                        )}
                      </td>
                      <td className="px-2 py-2">
                        <span className="rounded border border-[#ECB390] bg-[#ECDFC8] px-2 py-0.5 text-[10px] font-bold text-[#3D251E]">
                          {paymentLabels[inv.payment_method] ||
                            inv.payment_method}
                        </span>
                      </td>
                      <td className="px-2.5 py-2 text-right font-black text-[#3D251E] font-english">
                        {currency}
                        {Number(inv.grand_total ?? inv.amount).toFixed(2)}
                      </td>
                      <td className="px-2 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => openInvoiceDetail(inv)}
                          className="inline-flex items-center gap-1 rounded border border-[#ECB390] bg-[#ECDFC8] px-2 py-1 text-[10px] font-bold text-[#3D251E] hover:bg-[#ECB390]"
                        >
                          <LuEye className="h-3 w-3" />
                          <span>{t('bills.view')}</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
