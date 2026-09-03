import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useWorkspace } from '../context/WorkspaceContext'

export const BillingModule: React.FC = () => {
  const { t } = useTranslation()
  const {
    search,
    setSearch,
    filteredProducts,
    searchPreviewDevanagari,
    handleSearchAdd,
    frequentProducts,
    addToCart,
    cart,
    updateCartQty,
    cartSubtotal,
    gstTotal,
    cartTotal,
    selectedPayment,
    setSelectedPayment,
    saveBill,
  } = useWorkspace()

  const [qtyInput, setQtyInput] = useState<Record<number, string>>({})

  const commitQty = (productId: number, raw: string) => {
    if (raw === '') {
      updateCartQty(productId, 1)
      return
    }
    const parsed = Number(raw)
    if (Number.isInteger(parsed) && parsed > 0) {
      updateCartQty(productId, parsed)
    } else {
      updateCartQty(productId, 1)
    }
  }

  return (
    <div className="grid flex-1 grid-cols-1 gap-5 xl:grid-cols-[1.15fr_0.95fr]">
      <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.22em] text-stone-500">
              {t('nav.billing')}
            </div>
            <h2 className="mt-1 text-2xl font-black text-stone-900">{t('billing.newBill')}</h2>
          </div>
          <div className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-stone-700">
            {selectedPayment}
          </div>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
          <div className="mb-2 flex items-center justify-between gap-3">
            <label className="block text-sm font-semibold text-stone-700">
              {t('billing.searchLabel')}
            </label>
            {searchPreviewDevanagari && (
              <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">
                मराठी शोध: {searchPreviewDevanagari}
              </span>
            )}
          </div>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                handleSearchAdd()
              }
            }}
            placeholder={t('billing.searchPlaceholder')}
            className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-base outline-none focus:border-stone-500"
          />
          <div className="mt-2 text-xs text-stone-500">💡 {t('billing.searchTip')}</div>
        </div>

        {/* Search Results — immediately below the search field */}
        <div className="mt-4 rounded-2xl border border-stone-200 bg-white p-3 shadow-sm">
          <h3 className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-stone-500">
            शोध परिणाल
          </h3>
          {!search.trim() ? (
            <p className="text-xs text-stone-500">बारकोड स्कॅन करा किंवा उत्पादन शोधा.</p>
          ) : filteredProducts.length === 0 ? (
            <p className="text-xs text-stone-500">उत्पादन सापडले नाही.</p>
          ) : (
            <div className="space-y-1.5">
              {filteredProducts.slice(0, 12).map((product) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between">
                      <span className="font-medium text-stone-900">{product.name_mr}</span>
                      <span className="ml-3 text-sm font-semibold text-stone-900">
                        ₹ {Number(product.selling_price ?? 0).toFixed(2)}
                      </span>
                    </div>
                    <div className="mt-0.5 text-xs text-stone-500">
                      {product.barcode ? `बारकोड: ${product.barcode}` : ''}
                      {product.category_mr
                        ? `${product.barcode ? ' | ' : ''}${product.category_mr}`
                        : ''}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => addToCart(product)}
                    className="ml-3 rounded-lg bg-stone-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-stone-800"
                  >
                    {t('cart.add')}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Frequently Bought — compact quick-add, appears last */}
        <div className="mt-5">
          <h3 className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-stone-500">
            वारंवार खरेदी
          </h3>
          {frequentProducts.length === 0 ? (
            <p className="text-xs text-stone-500">अजून कोणतेही उत्पादन नाही.</p>
          ) : (
            <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
              {frequentProducts.slice(0, 6).map((product) => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => addToCart(product)}
                  className="flex flex-col items-center justify-center rounded-xl border border-stone-200 bg-white px-3 py-3 text-center transition hover:border-stone-300 hover:bg-stone-50"
                >
                  <span className="font-medium text-stone-900">{product.name_mr}</span>
                  <span className="mt-1 text-sm font-semibold text-stone-900">
                    ₹ {Number(product.selling_price ?? 0).toFixed(2)}
                  </span>
                  {product.frequency ? (
                    <span className="mt-1 text-[10px] text-stone-500">
                      {product.frequency} वेळा
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      <aside className="rounded-2xl border border-stone-200 bg-stone-50 p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-2xl font-black text-stone-900">{t('cart.title')}</h3>
          <div className="rounded-full border border-stone-200 bg-white px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-stone-700">
            {cart.length} items
          </div>
        </div>

        <div className="max-h-[360px] space-y-3 overflow-auto pr-1">
          {cart.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-5 text-sm text-stone-500">
              {t('cart.empty')}
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.id} className="rounded-2xl border border-stone-200 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-bold text-stone-900">{item.name}</div>
                    <div className="mt-1 text-xs text-stone-500">
                      ₹ {Number(item.unitPrice).toFixed(2)} / {t('cart.perUnit')}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => updateCartQty(item.id, 0)}
                    className="rounded-full px-2 py-1 text-xs font-bold text-stone-500 hover:bg-stone-100"
                  >
                    ✕
                  </button>
                </div>

                <div className="mt-3 grid grid-cols-[1fr_auto] items-end gap-3">
                  <label className="block">
                    <span className="mb-1 block text-xs font-bold uppercase tracking-[0.16em] text-stone-500">
                      प्रमाण
                    </span>
                     <input
                       type="number"
                       min={1}
                       step={1}
                       inputMode="numeric"
                       value={qtyInput[item.id] ?? String(item.qty)}
                       onChange={(e) => {
                         const raw = e.target.value
                         setQtyInput((prev) => ({ ...prev, [item.id]: raw }))
                         const parsed = Number(raw)
                         if (raw !== '' && Number.isInteger(parsed) && parsed > 0) {
                           updateCartQty(item.id, parsed)
                         }
                       }}
                       onBlur={(e) => {
                         commitQty(item.id, e.target.value)
                         setQtyInput((prev) => {
                           const copy = { ...prev }
                           delete copy[item.id]
                           return copy
                         })
                       }}
                       className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm font-bold outline-none focus:border-stone-500"
                     />
                  </label>
                  <div className="text-right">
                    <div className="text-xs font-bold uppercase tracking-[0.16em] text-stone-500">
                      Line total
                    </div>
                    <div className="text-lg font-black text-stone-900">
                      ₹ {Number(item.unitPrice * item.qty).toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="mt-5 space-y-3 rounded-2xl border border-stone-200 bg-white p-4 text-sm text-stone-700">
          <div className="flex justify-between">
            <span>{t('cart.subtotal')}</span>
            <span>₹ {cartSubtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>{t('cart.gst')}</span>
            <span>₹ {gstTotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-base font-black text-stone-900">
            <span>{t('cart.total')}</span>
            <span>₹ {cartTotal.toFixed(2)}</span>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {['CASH', 'UPI', 'CARD', 'CREDIT'].map((method) => (
            <button
              key={method}
              type="button"
              onClick={() => setSelectedPayment(method)}
              className={`rounded-xl border px-3 py-2 text-sm font-semibold ${
                selectedPayment === method
                  ? 'border-stone-900 bg-stone-900 text-white'
                  : 'border-stone-300 bg-white text-stone-700 hover:bg-stone-100'
              }`}
            >
              {method}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={saveBill}
          className="mt-5 w-full rounded-2xl bg-stone-900 px-5 py-4 text-lg font-black text-white hover:bg-stone-800"
        >
          {t('cart.saveBill')}
        </button>
      </aside>
    </div>
  )
}
