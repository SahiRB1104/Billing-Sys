import React, { useState, useEffect, useRef, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useWorkspace } from '../context/WorkspaceContext'
import { QrCodeCanvas } from './PrintComponents'
import {
  formatCategoryDisplay,
  formatProductName,
  formatUnitDisplay,
} from '../constants/productOptions'
import {
  localizeDynamicText,
  devanagariToEnglishApprox,
} from '../utils/transliteration'
import { formatIndianMobile } from '../utils/indianValidators'
import { PredictiveSearchInput, type PredictiveSuggestion } from './PredictiveSearchInput'
import { TransliteratedInput } from './TransliteratedInput'
import {
  LuWallet,
  LuQrCode,
  LuCreditCard,
  LuBookOpen,
  LuPrinter,
  LuPause,
  LuTrash2,
  LuPlus,
  LuMinus,
  LuX,
} from './Icons'

export const BillingModule: React.FC = () => {
  const { t, i18n } = useTranslation()
  const isMarathi = (i18n.language || 'mr').startsWith('mr')
  const searchInputRef = useRef<HTMLInputElement | null>(null)

  const {
    products,
    search,
    setSearch,
    filteredProducts,
    searchPreviewDevanagari,
    handleSearchAdd,
    frequentProducts,
    addToCart,
    cart,
    heldBills,
    lastAddedItem,
    updateCartQty,
    clearCart,
    holdCurrentBill,
    recallHeldBill,
    discardHeldBill,
    cartSubtotal,
    taxableTotal,
    gstTotal,
    cartTotal,
    totalMrpSavings,
    totalQtyCount,
    billDiscount,
    setBillDiscount,
    customerName,
    setCustomerName,
    customerPhone,
    setCustomerPhone,
    cashTendered,
    setCashTendered,
    changeReturned,
    paymentReference,
    setPaymentReference,
    selectedPayment,
    setSelectedPayment,
    initialPaidAmount,
    setInitialPaidAmount,
    initialPaymentMode,
    setInitialPaymentMode,
    upiModalOpen,
    setUpiModalOpen,
    upiUriData,
    openUpiPaymentModal,
    saveBill,
    storeSettings,
    requestConfirm,
    notify,
  } = useWorkspace()

  const [qtyInput, setQtyInput] = useState<Record<number, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [heldQueueOpen, setHeldQueueOpen] = useState(false)

  const currency = storeSettings?.currency_symbol || '₹'

  const parsedPaidNow = useMemo(() => {
    const num = parseFloat(initialPaidAmount)
    if (isNaN(num) || num <= 0) return 0
    return Math.min(cartTotal, Number(num.toFixed(2)))
  }, [initialPaidAmount, cartTotal])

  const remainingUdhari = useMemo(() => {
    return Math.max(0, Number((cartTotal - parsedPaidNow).toFixed(2)))
  }, [cartTotal, parsedPaidNow])

  const commitQty = (productId: number, raw: string) => {
    if (raw === '') {
      updateCartQty(productId, 1)
      return
    }
    const parsed = parseFloat(raw)
    if (!isNaN(parsed) && parsed > 0) {
      updateCartQty(productId, parsed)
    } else {
      updateCartQty(productId, 1)
    }
  }

  const handleCheckoutClick = async () => {
    if (cart.length === 0) {
      notify(t('msg.cartEmpty'), 'warning')
      return
    }

    if (selectedPayment === 'UPI') {
      await openUpiPaymentModal()
    } else {
      setSubmitting(true)
      await saveBill()
      setSubmitting(false)
    }
  }

  const handleUpiConfirm = async () => {
    setSubmitting(true)
    await saveBill({ payment_method: 'UPI', payment_reference: paymentReference })
    setSubmitting(false)
  }

  const handleConfirmClearCart = () => {
    if (cart.length === 0) return
    requestConfirm({
      title: t('billing.clearCart'),
      message: t('billing.clearCartConfirm'),
      confirmLabel: t('billing.clearCart'),
      cancelLabel: t('common.cancel'),
      danger: true,
      onConfirm: () => clearCart(),
    })
  }

  // Supermarket Function Key Shortcuts (F1 - F7, Ctrl+Enter)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F1') {
        e.preventDefault()
        searchInputRef.current?.focus()
        searchInputRef.current?.select()
      } else if (e.key === 'F2') {
        e.preventDefault()
        setSelectedPayment('CASH')
        if (cart.length > 0 && !submitting) {
          void saveBill({ payment_method: 'CASH' })
        }
      } else if (e.key === 'F3') {
        e.preventDefault()
        setSelectedPayment('UPI')
        if (cart.length > 0 && !submitting) {
          void openUpiPaymentModal()
        }
      } else if (e.key === 'F4') {
        e.preventDefault()
        setSelectedPayment('CARD')
      } else if (e.key === 'F7') {
        e.preventDefault()
        setSelectedPayment('CREDIT')
      } else if (e.key === 'F5') {
        e.preventDefault()
        if (cart.length > 0) {
          holdCurrentBill()
        } else if (heldBills.length > 0) {
          recallHeldBill(heldBills[0].id)
        }
      } else if (e.key === 'F6') {
        e.preventDefault()
        if (cart.length > 0) {
          handleConfirmClearCart()
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault()
        if (cart.length > 0 && !submitting) {
          void handleCheckoutClick()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [cart.length, heldBills.length, submitting, selectedPayment])

  // Deduplicate display products in catalog list by name_mr + selling_price
  const uniqueDisplayProducts = useMemo(() => {
    const seen = new Set<string>()
    const result = []
    for (const p of filteredProducts) {
      const key = `${p.name_mr}-${p.selling_price}-${p.barcode || ''}`
      if (!seen.has(key)) {
        seen.add(key)
        result.push(p)
      }
      if (result.length >= 25) break
    }
    return result
  }, [filteredProducts])

  // Build predictive suggestions for the POS product search bar
  const productSuggestions: PredictiveSuggestion[] = useMemo(() => {
    const seen = new Set<string>()
    const list: PredictiveSuggestion[] = []
    for (const p of products) {
      const key = `${p.name_mr}-${p.selling_price}-${p.barcode || ''}`
      if (seen.has(key)) continue
      seen.add(key)
      const displayName = formatProductName(p.name_mr, isMarathi)
      const englishApprox = devanagariToEnglishApprox(p.name_mr)
      const displayCat = formatCategoryDisplay(p.category_mr, isMarathi)
      list.push({
        id: p.id,
        primaryText: displayName,
        secondaryText: `${p.barcode ? `${p.barcode} • ` : ''}${displayCat || ''} • ${t('billing.stockLabel')}: ${p.current_stock ?? 0}`,
        badgeText: `${currency} ${Number(p.selling_price ?? 0).toFixed(2)}`,
        keywords: [
          p.name_mr,
          englishApprox,
          p.barcode || '',
          p.sku || '',
          p.category_mr || '',
        ],
        onSelect: () => {
          addToCart(p)
          setSearch('')
        },
      })
    }
    return list
  }, [products, isMarathi, currency])

  const paymentButtons = [
    { id: 'CASH', label: t('billing.payCash'), keyHint: 'F2', Icon: LuWallet },
    { id: 'UPI', label: t('billing.payUpi'), keyHint: 'F3', Icon: LuQrCode },
    { id: 'CARD', label: t('billing.payCard'), keyHint: 'F4', Icon: LuCreditCard },
    { id: 'CREDIT', label: t('billing.payCredit'), keyHint: 'F7', Icon: LuBookOpen },
  ]

  return (
    <div className="grid h-full min-h-0 flex-1 grid-cols-1 gap-2.5 overflow-hidden lg:grid-cols-12">
      {/* ── LEFT COLUMN (5 cols): Scanner Search, Last Scanned & Product Catalog ── */}
      <section className="flex min-h-0 flex-col gap-2 overflow-hidden rounded-md border border-[#ECB390] bg-[#FCF8E8] p-3 lg:col-span-5">
        {/* Top Header & Tax Mode Badge */}
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[#ECB390] pb-2">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#7A6258]">
              {t('nav.billing')}
            </div>
            <h2 className="text-sm font-bold uppercase tracking-wide text-[#3D251E]">
              {t('billing.newBill')}
            </h2>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="rounded border border-[#ECB390] bg-[#ECDFC8] px-2.5 py-0.5 text-[11px] font-bold text-[#3D251E]">
              {selectedPayment === 'CREDIT' ? t('billing.payCredit') : selectedPayment}
            </span>
            {storeSettings?.tax_inclusive ? (
              <span className="rounded border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                {t('billing.taxInclusiveBadge')}
              </span>
            ) : (
              <span className="rounded border border-[#ECB390] bg-[#ECDFC8] px-2 py-0.5 text-[10px] font-bold text-[#5C4338]">
                {t('billing.gstExtraBadge')}
              </span>
            )}
          </div>
        </div>

        {/* Barcode / Predictive Product Search Input */}
        <div className="shrink-0 rounded-md border border-[#ECB390] bg-[#ECDFC8]/60 p-2.5">
          <div className="mb-1 flex items-center justify-between gap-2">
            <label
              htmlFor="pos-barcode-search"
              className="text-xs font-bold text-[#3D251E]"
            >
              {t('billing.searchLabel')}
            </label>
            {searchPreviewDevanagari && (
              <span className="rounded border border-[#ECB390] bg-[#FCF8E8] px-2 py-0.5 text-[11px] font-bold text-[#3D251E]">
                {t('billing.matchedMarathi')} {searchPreviewDevanagari}
              </span>
            )}
          </div>
          <PredictiveSearchInput
            inputRef={searchInputRef}
            autoFocus
            value={search}
            onChange={setSearch}
            suggestions={productSuggestions}
            onEnter={handleSearchAdd}
            placeholder={t('billing.searchPlaceholder')}
          />
          <div className="mt-1 text-[10px] font-medium text-[#5C4338]">
            {t('billing.searchTip')}
          </div>
        </div>

        {/* Last Scanned Item Confirmation Strip */}
        <div className="flex shrink-0 items-center justify-between rounded-md border border-[#ECB390] bg-[#ECDFC8] px-3 py-1.5">
          <div className="min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#5C4338]">
              {t('billing.lastScanned')}
            </div>
            {lastAddedItem ? (
              <div className="truncate text-xs font-bold text-[#3D251E]">
                {formatProductName(lastAddedItem.name, isMarathi)}
              </div>
            ) : (
              <div className="truncate text-xs font-medium text-[#7A6258]">
                {t('billing.noItemScanned')}
              </div>
            )}
          </div>
          {lastAddedItem && (
            <div className="shrink-0 text-right font-english">
              <div className="text-xs font-black text-[#3D251E]">
                {currency}
                {lastAddedItem.unitPrice.toFixed(2)} × {lastAddedItem.qty}
              </div>
              <div className="text-[11px] font-bold text-[#DF7861]">
                = {currency}
                {(lastAddedItem.unitPrice * lastAddedItem.qty).toFixed(2)}
              </div>
            </div>
          )}
        </div>

        {/* Bounded Scrollable Product Catalog List */}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border border-[#ECB390] bg-[#FCF8E8]">
          <div className="flex shrink-0 items-center justify-between border-b border-[#ECB390] bg-[#ECB390] px-3 py-1.5 text-[11px] font-bold text-[#3D251E]">
            <span>
              {search.trim()
                ? `${t('billing.searchResults')} (${uniqueDisplayProducts.length})`
                : t('billing.catalogHeader')}
            </span>
            <span>{t('billing.stockLabel')}</span>
          </div>

          <div
            tabIndex={0}
            role="region"
            aria-label={t('billing.catalogHeader')}
            className="pos-scroll min-h-0 flex-1 divide-y divide-[#ECDFC8] bg-[#FCF8E8]"
          >
            {uniqueDisplayProducts.length === 0 ? (
              <div className="py-8 text-center text-xs font-bold text-[#7A6258]">
                {search.trim()
                  ? t('billing.noProductFound')
                  : t('billing.scanOrTypePrompt')}
              </div>
            ) : (
              uniqueDisplayProducts.map((product) => {
                const isOutOfStock = (product.current_stock ?? 0) <= 0
                const displayName = formatProductName(product.name_mr, isMarathi)
                const displayUnit = formatUnitDisplay(
                  product.unit_display,
                  isMarathi,
                )
                const displayCat = formatCategoryDisplay(
                  product.category_mr,
                  isMarathi,
                )

                return (
                  <div
                    key={product.id}
                    className="flex items-center justify-between gap-2 px-3 py-1.5 transition hover:bg-[#ECDFC8]/60"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="truncate text-xs font-bold text-[#3D251E]">
                          {displayName}
                        </span>
                        {displayUnit && (
                          <span className="rounded border border-[#ECB390] bg-[#ECDFC8] px-1.5 py-0.2 text-[10px] font-bold text-[#3D251E]">
                            {displayUnit}
                          </span>
                        )}
                        {displayCat && (
                          <span className="text-[10px] font-medium text-[#7A6258]">
                            • {displayCat}
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 flex items-center gap-2.5 text-[11px] font-english">
                        <span className="font-black text-[#3D251E]">
                          {currency}
                          {Number(product.selling_price ?? 0).toFixed(2)}
                        </span>
                        {product.mrp &&
                          product.mrp > (product.selling_price ?? 0) && (
                            <span className="text-[#8C7368] line-through">
                              MRP {currency}
                              {Number(product.mrp).toFixed(2)}
                            </span>
                          )}
                        <span
                          className={`font-bold ${
                            isOutOfStock
                              ? 'text-[#B93829]'
                              : (product.current_stock ?? 0) <=
                                (product.low_stock_level ?? 0)
                              ? 'text-amber-800'
                              : 'text-[#5C4338]'
                          }`}
                        >
                          {t('billing.stockLabel')}: {product.current_stock}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={isOutOfStock}
                      onClick={() => addToCart(product)}
                      className={`flex shrink-0 items-center gap-1 rounded px-3 py-1 text-xs font-bold transition ${
                        isOutOfStock
                          ? 'cursor-not-allowed bg-[#ECDFC8] text-[#8C7368]'
                          : 'bg-[#DF7861] text-[#FCF8E8] hover:bg-[#c9624c]'
                      }`}
                    >
                      {!isOutOfStock && <LuPlus className="h-3.5 w-3.5" />}
                      <span>
                        {isOutOfStock ? t('billing.outOfStock') : t('cart.add')}
                      </span>
                    </button>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Compact Fast-Moving / Frequent Items Bar */}
        <div className="shrink-0">
          <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-[#7A6258]">
            {t('billing.frequentItems')}
          </div>
          {frequentProducts.length === 0 ? (
            <p className="text-[11px] text-[#8C7368]">
              {t('billing.noFrequentItems')}
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-1.5">
              {frequentProducts.slice(0, 6).map((product) => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => addToCart(product)}
                  className="flex flex-col items-start justify-between rounded border border-[#ECB390] bg-[#ECDFC8]/60 px-2.5 py-1.5 text-left transition hover:border-[#DF7861] hover:bg-[#ECB390]/50"
                >
                  <div className="w-full truncate text-xs font-bold text-[#3D251E]">
                    {formatProductName(product.name_mr, isMarathi)}
                  </div>
                  <div className="mt-0.5 flex w-full items-center justify-between text-[11px] font-english">
                    <span className="font-black text-[#DF7861]">
                      {currency}
                      {Number(product.selling_price ?? 0).toFixed(0)}
                    </span>
                    {product.unit_display && (
                      <span className="text-[9px] font-semibold text-[#5C4338]">
                        {formatUnitDisplay(product.unit_display, isMarathi)}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── RIGHT COLUMN (7 cols): High-Density Supermarket Cart & Checkout ── */}
      <aside className="flex min-h-0 flex-col gap-2 overflow-hidden rounded-md border border-[#ECB390] bg-[#FCF8E8] p-3 lg:col-span-7">
        {/* Cart Top Toolbar + Multi-Bill Hold Queue */}
        <div className="relative flex shrink-0 items-center justify-between gap-2 border-b border-[#ECB390] pb-2">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold uppercase tracking-wide text-[#3D251E]">
              {t('cart.title')}
            </h3>
            <span className="rounded bg-[#DF7861] px-2 py-0.5 text-xs font-bold text-[#FCF8E8] font-english">
              {cart.length} ({totalQtyCount})
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {cart.length > 0 && (
              <button
                type="button"
                onClick={holdCurrentBill}
                className="flex items-center gap-1 rounded border border-[#ECB390] bg-[#ECDFC8] px-2.5 py-1 text-xs font-bold text-[#3D251E] hover:bg-[#ECB390]"
              >
                <LuPause className="h-3.5 w-3.5 text-[#DF7861]" />
                <span>{t('billing.holdBill')} [F5]</span>
              </button>
            )}

            {heldBills.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  if (heldBills.length === 1 && cart.length === 0) {
                    recallHeldBill(heldBills[0].id)
                  } else {
                    setHeldQueueOpen((prev) => !prev)
                  }
                }}
                className="rounded border border-[#DF7861] bg-[#ECB390]/50 px-2.5 py-1 text-xs font-bold text-[#3D251E] hover:bg-[#ECB390]"
              >
                {t('billing.heldBillsQueue')} ({heldBills.length}/5)
              </button>
            )}

            {cart.length > 0 && (
              <button
                type="button"
                onClick={handleConfirmClearCart}
                className="flex items-center gap-1 rounded border border-[#DF7861]/60 bg-[#ECB390]/30 px-2.5 py-1 text-xs font-bold text-[#B93829] hover:bg-[#ECB390]/60"
              >
                <LuTrash2 className="h-3.5 w-3.5" />
                <span>{t('billing.clearCart')} [F6]</span>
              </button>
            )}
          </div>

          {/* Held Bills Queue Popover */}
          {heldQueueOpen && heldBills.length > 0 && (
            <div className="absolute right-0 top-full z-40 mt-1 w-80 rounded-md border-2 border-[#ECB390] bg-[#FCF8E8] p-2.5 shadow-xl">
              <div className="mb-1.5 flex items-center justify-between border-b border-[#ECB390] pb-1">
                <span className="text-[11px] font-bold uppercase text-[#3D251E]">
                  {t('billing.heldBillsQueue')} ({heldBills.length}/5)
                </span>
                <button
                  type="button"
                  onClick={() => setHeldQueueOpen(false)}
                  className="text-xs font-bold text-[#7A6258] hover:text-[#3D251E]"
                >
                  <LuX className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="max-h-48 space-y-1.5 overflow-y-auto">
                {heldBills.map((hb) => (
                  <div
                    key={hb.id}
                    className="flex items-center justify-between gap-2 rounded border border-[#ECB390] bg-[#ECDFC8]/60 px-2.5 py-1.5 text-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-bold text-[#3D251E]">
                        {hb.customerName}
                      </div>
                      <div className="text-[10px] font-medium text-[#5C4338] font-english">
                        {hb.items.length} items • {currency}{' '}
                        {hb.totalAmount.toFixed(2)} • {hb.heldAt}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          recallHeldBill(hb.id)
                          setHeldQueueOpen(false)
                        }}
                        className="rounded bg-[#DF7861] px-2 py-1 text-[10px] font-bold text-[#FCF8E8] hover:bg-[#c9624c]"
                      >
                        Recall
                      </button>
                      <button
                        type="button"
                        onClick={() => discardHeldBill(hb.id)}
                        className="rounded border border-[#ECB390] bg-[#FCF8E8] px-1.5 py-1 text-[10px] font-bold text-[#B93829] hover:bg-[#ECB390]"
                      >
                        <LuX className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* High-Density Supermarket Tabular Cart Grid */}
        <div
          tabIndex={0}
          role="region"
          aria-label={t('cart.title')}
          className="pos-scroll min-h-0 flex-1 rounded-md border border-[#ECB390] bg-[#FCF8E8]"
        >
          {cart.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center p-6 text-center text-xs font-bold text-[#7A6258]">
              <span>{t('cart.empty')}</span>
            </div>
          ) : (
            <table className="pos-table text-left text-xs">
              <thead className="bg-[#ECB390] text-[11px] font-bold text-[#3D251E]">
                <tr>
                  <th className="w-8 px-2.5 py-2 text-center">#</th>
                  <th className="px-2.5 py-2">{t('billing.product')}</th>
                  <th className="px-2 py-2 text-center">{t('billing.unit')}</th>
                  <th className="w-32 px-2 py-2 text-center">
                    {t('billing.quantity')}
                  </th>
                  <th className="px-2 py-2 text-right">{t('billing.mrp')}</th>
                  <th className="px-2 py-2 text-right">{t('billing.price')}</th>
                  <th className="px-2.5 py-2 text-right">{t('billing.amount')}</th>
                  <th className="w-8 px-2 py-2 text-center" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ECDFC8] bg-[#FCF8E8]">
                {cart.map((item, idx) => {
                  const lineTotal =
                    item.unitPrice * item.qty - (item.discount || 0)
                  const supportsDecimals =
                    item.unitDisplay.includes('किलो') ||
                    item.unitDisplay.includes('लिटर') ||
                    item.unitDisplay.includes('gm') ||
                    item.unitDisplay.includes('kg')
                  const stepVal = supportsDecimals ? 0.5 : 1
                  const itemMrp =
                    item.mrp && item.mrp > item.unitPrice
                      ? item.mrp
                      : item.unitPrice

                  return (
                    <tr key={item.id} className="hover:bg-[#ECDFC8]/60">
                      <td className="px-2.5 py-2 text-center font-bold text-[#7A6258] font-english">
                        {idx + 1}
                      </td>
                      <td className="px-2.5 py-2 font-bold text-[#3D251E]">
                        {formatProductName(item.name, isMarathi)}
                      </td>
                      <td className="px-2 py-2 text-center text-[11px] font-semibold text-[#5C4338]">
                        {formatUnitDisplay(item.unitDisplay, isMarathi) || '-'}
                      </td>
                      <td className="px-2 py-2">
                        <div className="flex items-center justify-center gap-1 font-english">
                          <button
                            type="button"
                            onClick={() =>
                              updateCartQty(
                                item.id,
                                Number(
                                  Math.max(0, item.qty - stepVal).toFixed(2),
                                ),
                              )
                            }
                            className="flex h-6 w-6 items-center justify-center rounded border border-[#ECB390] bg-[#ECDFC8] text-xs font-black text-[#3D251E] hover:bg-[#ECB390]"
                          >
                            <LuMinus className="h-3 w-3" />
                          </button>
                          <input
                            type="number"
                            min={0.01}
                            step={supportsDecimals ? '0.05' : '1'}
                            value={qtyInput[item.id] ?? String(item.qty)}
                            onChange={(e) => {
                              const val = e.target.value
                              setQtyInput((prev) => ({
                                ...prev,
                                [item.id]: val,
                              }))
                              const parsed = parseFloat(val)
                              if (!isNaN(parsed) && parsed > 0) {
                                updateCartQty(item.id, parsed)
                              }
                            }}
                            onBlur={(e) => {
                              commitQty(item.id, e.target.value)
                              setQtyInput((prev) => {
                                const c = { ...prev }
                                delete c[item.id]
                                return c
                              })
                            }}
                            aria-label={t('billing.quantity')}
                            className="w-14 rounded border border-[#ECB390] bg-[#FCF8E8] px-1.5 py-0.5 text-center text-xs font-black text-[#3D251E] outline-none focus:border-[#DF7861]"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              updateCartQty(
                                item.id,
                                Number((item.qty + stepVal).toFixed(2)),
                              )
                            }
                            className="flex h-6 w-6 items-center justify-center rounded border border-[#ECB390] bg-[#ECDFC8] text-xs font-black text-[#3D251E] hover:bg-[#ECB390]"
                          >
                            <LuPlus className="h-3 w-3" />
                          </button>
                        </div>
                      </td>
                      <td className="px-2 py-2 text-right text-[#8C7368] line-through font-english">
                        {currency}
                        {itemMrp.toFixed(2)}
                      </td>
                      <td className="px-2 py-2 text-right font-bold text-[#3D251E] font-english">
                        {currency}
                        {item.unitPrice.toFixed(2)}
                      </td>
                      <td className="px-2.5 py-2 text-right font-black text-[#3D251E] font-english">
                        {currency}
                        {Number(lineTotal).toFixed(2)}
                      </td>
                      <td className="px-2 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => updateCartQty(item.id, 0)}
                          className="inline-flex h-6 w-6 items-center justify-center rounded border border-[#ECB390] bg-[#ECDFC8] text-[#B93829] hover:bg-[#ECB390]"
                        >
                          <LuX className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Compact Customer & Cash / Udhari Partial Payment Row */}
        <div className="shrink-0 space-y-2 rounded-md border border-[#ECB390] bg-[#ECDFC8]/70 p-2.5">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="space-y-0.5">
              <TransliteratedInput
                label={
                  t('billing.customerName') +
                  (selectedPayment === 'CREDIT' ? ' *' : '')
                }
                value={customerName}
                onChangeValue={setCustomerName}
                placeholder={t('billing.customerName')}
                showLiveBadge={false}
                className="w-full rounded border border-[#ECB390] bg-[#FCF8E8] px-2.5 py-1 text-xs font-semibold text-[#3D251E] outline-none focus:border-[#DF7861]"
              />
            </div>

            <label className="space-y-0.5">
              <span className="block truncate text-[10px] font-bold text-[#5C4338]">
                {t('billing.customerPhone')}{' '}
                {selectedPayment === 'CREDIT' && (
                  <span className="text-[#DF7861]">*</span>
                )}
              </span>
              <input
                inputMode="numeric"
                maxLength={10}
                value={customerPhone}
                onChange={(e) =>
                  setCustomerPhone(formatIndianMobile(e.target.value))
                }
                placeholder="9876543210"
                className="w-full rounded border border-[#ECB390] bg-[#FCF8E8] px-2.5 py-1 text-xs font-semibold text-[#3D251E] outline-none focus:border-[#DF7861] font-english"
              />
            </label>

            <label className="space-y-0.5">
              <span className="block truncate text-[10px] font-bold text-[#5C4338]">
                {t('cart.billDiscount')}
              </span>
              <input
                type="number"
                min={0}
                step={1}
                value={billDiscount || ''}
                onChange={(e) =>
                  setBillDiscount(Math.max(0, parseFloat(e.target.value) || 0))
                }
                placeholder="0"
                className="w-full rounded border border-[#ECB390] bg-[#FCF8E8] px-2.5 py-1 text-xs font-black text-[#3D251E] outline-none focus:border-[#DF7861] font-english"
              />
            </label>

            {selectedPayment === 'CASH' ? (
              <div className="grid grid-cols-2 gap-1.5">
                <label className="space-y-0.5">
                  <span className="block truncate text-[10px] font-bold text-[#5C4338]">
                    {t('billing.cashTendered')}
                  </span>
                  <input
                    type="number"
                    min={0}
                    value={cashTendered}
                    onChange={(e) => setCashTendered(e.target.value)}
                    placeholder={t('billing.cashPlaceholder')}
                    className="w-full rounded border border-[#ECB390] bg-[#FCF8E8] px-2 py-1 text-xs font-black text-[#3D251E] outline-none focus:border-[#DF7861] font-english"
                  />
                </label>
                <div className="space-y-0.5">
                  <span className="block truncate text-[10px] font-bold text-[#5C4338]">
                    {t('billing.changeReturn')}
                  </span>
                  <div className="flex h-[26px] items-center rounded border border-[#ECB390] bg-[#FCF8E8] px-2 text-xs font-black text-[#3D251E] font-english">
                    {currency}
                    {changeReturned.toFixed(0)}
                  </div>
                </div>
              </div>
            ) : (
              <label className="space-y-0.5">
                <span className="block truncate text-[10px] font-bold text-[#5C4338]">
                  {t('billing.paymentRef')}
                </span>
                <input
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  placeholder={t('billing.paymentRefPlaceholder')}
                  className="w-full rounded border border-[#ECB390] bg-[#FCF8E8] px-2.5 py-1 text-xs font-semibold text-[#3D251E] outline-none focus:border-[#DF7861]"
                />
              </label>
            )}
          </div>

          {/* Udhari (Credit) Partial Payment Row: Amount Paid Now + Remaining Udhari Due */}
          {selectedPayment === 'CREDIT' && (
            <div className="grid grid-cols-1 gap-2 rounded border border-[#DF7861] bg-[#FCF8E8] p-2 sm:grid-cols-3">
              <label className="space-y-0.5">
                <span className="block truncate text-[10px] font-bold text-[#3D251E]">
                  {t('billing.paidNowLabel')}
                </span>
                <input
                  type="number"
                  min={0}
                  max={cartTotal}
                  step="1"
                  value={initialPaidAmount}
                  onChange={(e) => setInitialPaidAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full rounded border border-[#ECB390] bg-[#ECDFC8]/40 px-2.5 py-1 text-xs font-black text-[#3D251E] outline-none focus:border-[#DF7861] font-english"
                />
              </label>

              <label className="space-y-0.5">
                <span className="block truncate text-[10px] font-bold text-[#3D251E]">
                  {t('billing.paidNowModeLabel')}
                </span>
                <select
                  value={initialPaymentMode}
                  onChange={(e) => setInitialPaymentMode(e.target.value)}
                  className="w-full rounded border border-[#ECB390] bg-[#ECDFC8]/40 px-2 py-1 text-xs font-bold text-[#3D251E] outline-none focus:border-[#DF7861]"
                >
                  <option value="CASH">{t('billing.payCash')}</option>
                  <option value="UPI">{t('billing.payUpi')}</option>
                  <option value="CARD">{t('billing.payCard')}</option>
                </select>
              </label>

              <div className="space-y-0.5">
                <span className="block truncate text-[10px] font-bold text-[#DF7861]">
                  {t('billing.remainingUdhariLabel')}
                </span>
                <div className="flex h-[26px] items-center justify-between rounded border border-[#DF7861] bg-[#ECB390]/35 px-2.5 text-xs font-black text-[#3D251E] font-english">
                  <span>{currency}</span>
                  <span>{remainingUdhari.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Warm Peach/Terracotta Total Payable & Savings Banner */}
        <div className="grid shrink-0 grid-cols-2 items-center justify-between gap-2 rounded-md border-2 border-[#ECB390] bg-[#ECB390]/55 px-4 py-2 text-[#3D251E] sm:grid-cols-4">
          <div>
            <div className="text-[10px] font-bold text-[#5C4338]">
              {t('cart.subtotal')}
            </div>
            <div className="text-sm font-black text-[#3D251E] font-english">
              {currency} {cartSubtotal.toFixed(2)}
            </div>
          </div>

          <div>
            <div className="text-[10px] font-bold text-[#5C4338]">
              {t('cart.taxable')} / {t('cart.gst')}
            </div>
            <div className="text-xs font-bold text-[#3D251E] font-english">
              {currency}
              {taxableTotal.toFixed(2)} + {currency}
              {gstTotal.toFixed(2)}
            </div>
          </div>

          <div className="rounded border border-[#ECB390] bg-[#FCF8E8] px-2.5 py-1">
            <div className="text-[10px] font-bold text-[#5C4338]">
              {t('billing.customerSavings')}
            </div>
            <div className="text-sm font-black text-emerald-700 font-english">
              {currency} {totalMrpSavings.toFixed(2)}
            </div>
          </div>

          <div className="text-right">
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-[#5C4338]">
              {t('cart.total')}
            </div>
            <div className="text-2xl font-black leading-none text-[#DF7861] font-english">
              {currency} {cartTotal.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Bottom Payment Mode Selector & Primary Checkout Trigger */}
        <div className="grid shrink-0 grid-cols-1 gap-2 sm:grid-cols-12">
          <div className="grid grid-cols-4 gap-1.5 sm:col-span-7">
            {paymentButtons.map(({ id, label, keyHint, Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setSelectedPayment(id)}
                className={`flex flex-col items-center justify-center gap-0.5 rounded-md border py-1.5 px-2 text-xs font-bold transition ${
                  selectedPayment === id
                    ? 'border-[#DF7861] bg-[#DF7861] text-[#FCF8E8] shadow-xs'
                    : 'border-[#ECB390] bg-[#ECDFC8] text-[#3D251E] hover:bg-[#ECB390]'
                }`}
              >
                <div className="flex items-center gap-1">
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span>{label}</span>
                </div>
                <span
                  className={`text-[9px] font-english ${
                    selectedPayment === id ? 'text-[#FCF8E8]/90' : 'text-[#5C4338]'
                  }`}
                >
                  [{keyHint}]
                </span>
              </button>
            ))}
          </div>

          <button
            type="button"
            disabled={cart.length === 0 || submitting}
            onClick={handleCheckoutClick}
            className="flex items-center justify-center gap-2 rounded-md bg-[#DF7861] px-4 py-2.5 text-sm font-black text-[#FCF8E8] shadow-xs transition hover:bg-[#c9624c] disabled:cursor-not-allowed disabled:opacity-40 sm:col-span-5"
          >
            <LuPrinter className="h-4 w-4 shrink-0" />
            <span>
              {submitting
                ? t('billing.processingBill')
                : selectedPayment === 'UPI'
                ? t('billing.showQrAndComplete')
                : t('cart.saveBill')}
            </span>
          </button>
        </div>
      </aside>

      {/* ── UPI Payment Modal ─────────────────────────────────────── */}
      {upiModalOpen && upiUriData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#3D251E]/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-md border-2 border-[#ECB390] bg-[#FCF8E8] p-5 text-center shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#ECB390] pb-2.5">
              <h3 className="text-sm font-bold uppercase text-[#3D251E]">
                {t('billing.upiModalTitle')}
              </h3>
              <button
                type="button"
                onClick={() => setUpiModalOpen(false)}
                className="rounded border border-[#ECB390] bg-[#ECDFC8] px-2 py-0.5 text-xs font-bold text-[#3D251E]"
              >
                <LuX className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="mt-3 flex flex-col items-center">
              <div className="mb-2 text-xs font-semibold text-[#5C4338]">
                {t('billing.scanQrTip')}
              </div>

              {upiUriData.static_qr_image ? (
                <img
                  src={upiUriData.static_qr_image}
                  alt="Static UPI QR"
                  className="h-40 w-40 rounded border border-[#ECB390] bg-white object-contain p-2"
                />
              ) : (
                <div className="rounded border border-[#ECB390] bg-white p-2">
                  <QrCodeCanvas value={upiUriData.upi_uri} size={150} />
                </div>
              )}

              <div className="mt-2 text-xs font-mono font-bold text-[#3D251E] font-english">
                {upiUriData.upi_id}
              </div>
              <div className="text-xs font-semibold text-[#7A6258]">
                {localizeDynamicText(upiUriData.payee_name, isMarathi)}
              </div>

              <div className="mt-2.5 w-full rounded border border-[#ECB390] bg-[#ECDFC8]/60 p-2.5">
                <div className="text-[11px] font-bold text-[#5C4338]">
                  {t('billing.payableAmount')}
                </div>
                <div className="text-xl font-black text-[#DF7861] font-english">
                  {currency} {Number(upiUriData.amount).toFixed(2)}
                </div>
              </div>

              <input
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                placeholder={t('billing.upiRefPlaceholder')}
                className="mt-2.5 w-full rounded border border-[#ECB390] bg-white p-2 text-xs font-mono text-[#3D251E] outline-none focus:border-[#DF7861]"
              />

              <div className="mt-3 flex w-full gap-2">
                <button
                  type="button"
                  onClick={() => setUpiModalOpen(false)}
                  className="flex-1 rounded border border-[#ECB390] bg-[#ECDFC8] py-2 text-xs font-bold text-[#3D251E] hover:bg-[#ECB390]"
                >
                  {t('products.cancel')}
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleUpiConfirm}
                  className="flex-1 rounded bg-[#DF7861] py-2 text-xs font-bold text-[#FCF8E8] hover:bg-[#c9624c] disabled:opacity-50"
                >
                  {submitting
                    ? t('billing.processingBill')
                    : t('billing.confirmUpiPayment')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
