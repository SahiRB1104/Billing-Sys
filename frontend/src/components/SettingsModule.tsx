import React from 'react'
import { useTranslation } from 'react-i18next'
import { useWorkspace } from '../context/WorkspaceContext'

export const SettingsModule: React.FC = () => {
  const { t } = useTranslation()
  const {
    cashierName,
    setCashierName,
    cashierUsername,
    setCashierUsername,
    cashierPassword,
    setCashierPassword,
    submitCashierForm,
  } = useWorkspace()

  return (
    <div className="grid flex-1 grid-cols-1 gap-5 xl:grid-cols-[1fr_0.95fr]">
      <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-2xl font-black text-stone-900">{t('settings.shopDetails')}</h3>
        <div className="space-y-3 text-sm text-stone-700">
          <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
            <div className="text-xs font-bold text-stone-500">{t('settings.shopName')}</div>
            <div className="mt-2 text-lg font-black text-stone-900">श्री वैभव स्टोअर</div>
          </div>
          <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
            <div className="text-xs font-bold text-stone-500">{t('settings.address')}</div>
            <div className="mt-2 text-base font-semibold text-stone-800">सोलापूर, महाराष्ट्र</div>
          </div>
          <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
            <div className="text-xs font-bold text-stone-500">{t('settings.phone')}</div>
            <div className="mt-2 text-base font-semibold text-stone-800">+91 98765 43210</div>
          </div>
          <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
            <div className="text-xs font-bold text-stone-500">{t('settings.gstin')}</div>
            <div className="mt-2 text-base font-semibold text-stone-800">27ABCDE1234F1Z5</div>
          </div>
        </div>
      </section>

      <form onSubmit={submitCashierForm} className="rounded-2xl border border-stone-200 bg-stone-50 p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <div className="text-xs font-bold text-stone-500">{t('settings.addCashier')}</div>
            <h3 className="mt-1 text-2xl font-black text-stone-900">नवीन कॅशियर</h3>
          </div>
          <span className="rounded-full border border-stone-200 bg-white px-3 py-1 text-xs font-bold text-stone-700">
            Role = CASHIER
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <label className="space-y-1 text-sm font-semibold text-stone-700">
            <span>{t('settings.cashierName')}</span>
            <input
              value={cashierName}
              onChange={(e) => setCashierName(e.target.value)}
              required
              className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-stone-500"
            />
          </label>

          <label className="space-y-1 text-sm font-semibold text-stone-700">
            <span>{t('settings.cashierUsername')}</span>
            <input
              value={cashierUsername}
              onChange={(e) => setCashierUsername(e.target.value)}
              required
              className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-stone-500"
            />
          </label>

          <label className="space-y-1 text-sm font-semibold text-stone-700">
            <span>{t('settings.cashierPassword')}</span>
            <input
              type="password"
              value={cashierPassword}
              onChange={(e) => setCashierPassword(e.target.value)}
              required
              className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-stone-500"
            />
          </label>
        </div>

        <button
          type="submit"
          className="mt-5 w-full rounded-xl bg-stone-900 px-5 py-3 text-sm font-bold text-white hover:bg-stone-800"
        >
          {t('settings.createCashier')}
        </button>
      </form>
    </div>
  )
}
