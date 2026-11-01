import React, { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useWorkspace } from '../context/WorkspaceContext'
import { TransliteratedInput } from './TransliteratedInput'
import { PredictiveSearchInput, type PredictiveSuggestion } from './PredictiveSearchInput'
import {
  CUSTOM_PACK_OPTION,
  PACK_QUANTITY_OPTIONS,
  PRODUCT_CATEGORIES,
  UNIT_TYPES,
  UNIT_LABELS_EN,
  formatCategoryDisplay,
  formatProductName,
  formatUnitDisplay,
  isCustomPackOption,
  isProductRecent,
} from '../constants/productOptions'
import {
  searchMatchesProduct,
  devanagariToEnglishApprox,
} from '../utils/transliteration'
import {
  LuBarcode,
  LuPrinter,
  LuIndianRupee,
  LuPlus,
} from './Icons'

export const ProductsModule: React.FC = () => {
  const { t, i18n } = useTranslation()
  const isMarathi = (i18n.language || 'mr').startsWith('mr')
  const [catalogFilter, setCatalogFilter] = useState('')

  const ws = useWorkspace()
  const {
    products,
    barcodeGenerating,
    generateProductBarcode,
    openPriceModal,
    openLabelDialog,
    notify,
    setFormBarcode,
    setFormNameMr,
    setFormCategoryMr,
    setFormUnitType,
    setFormPackQtyPreset,
    setFormPackQtyCustom,
    setFormPurchasePrice,
    setFormSellingPrice,
    setFormMrp,
    setFormGstRate,
    setFormCurrentStock,
    setFormLowStockLevel,
    formBarcode,
    formNameMr,
    formCategoryMr,
    formUnitType,
    formPackQtyPreset,
    formPackQtyCustom,
    formSku,
    formPurchasePrice,
    formSellingPrice,
    formMrp,
    formGstRate,
    formCurrentStock,
    formLowStockLevel,
    createProduct,
  } = ws

  const filteredCatalog = useMemo(() => {
    const q = catalogFilter.trim()
    if (!q) return products
    return products.filter((p) => searchMatchesProduct(p, q))
  }, [products, catalogFilter])

  const catalogSuggestions: PredictiveSuggestion[] = useMemo(() => {
    return products.map((p) => {
      const displayName = formatProductName(p.name_mr, isMarathi)
      const englishApprox = devanagariToEnglishApprox(p.name_mr)
      return {
        id: p.id,
        primaryText: displayName,
        secondaryText: `${p.barcode || 'No Barcode'} • ${formatCategoryDisplay(p.category_mr, isMarathi) || ''}`,
        badgeText: `₹ ${Number(p.selling_price ?? 0).toFixed(2)}`,
        keywords: [p.name_mr, englishApprox, p.barcode || '', p.category_mr || ''],
        onSelect: () => setCatalogFilter(displayName),
      }
    })
  }, [products, isMarathi])

  const openLabelDialogFromForm = () => {
    if (!formBarcode.trim()) {
      notify(t('msg.barcodeRequiredForLabel'), 'warning')
      return
    }
    const packQuantity = isCustomPackOption(formPackQtyPreset)
      ? Number(formPackQtyCustom) || null
      : Number(formPackQtyPreset) || null
    openLabelDialog({
      id: 0,
      name_mr: formNameMr.trim() || (isMarathi ? 'उत्पादन' : 'Product'),
      barcode: formBarcode.trim(),
      sku: formSku.trim() || null,
      category_mr: formCategoryMr.trim() || null,
      unit: null,
      unit_type: formUnitType.trim() || null,
      pack_quantity: packQuantity,
      unit_display: packQuantity
        ? `${packQuantity} ${formUnitType}`.trim()
        : formUnitType.trim() || null,
      purchase_price: Number(formPurchasePrice) || null,
      selling_price: Number(formSellingPrice) || null,
      mrp: Number(formMrp) || null,
      gst_rate: Number(formGstRate) || null,
      current_stock: Number(formCurrentStock) || 1,
      low_stock_level: Number(formLowStockLevel) || 0,
      is_active: true,
      created_at: null,
    })
  }

  return (
    <div className="grid h-full min-h-0 flex-1 grid-cols-1 gap-2.5 overflow-hidden lg:grid-cols-12">
      {/* ── LEFT PANE (7 cols): Bounded Product Catalog Table ──────── */}
      <section className="flex min-h-0 flex-col gap-2 overflow-hidden rounded-md border border-[#ECB390] bg-[#FCF8E8] p-3.5 lg:col-span-7">
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-[#ECB390] pb-2">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#7A6258]">
              {t('nav.productEntry')}
            </div>
            <h2 className="text-sm font-bold uppercase tracking-wide text-[#3D251E]">
              {t('products.list')}{' '}
              <span className="ml-1 rounded bg-[#ECDFC8] px-2 py-0.5 text-xs font-bold text-[#3D251E] font-english">
                {filteredCatalog.length}
              </span>
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <PredictiveSearchInput
              value={catalogFilter}
              onChange={setCatalogFilter}
              suggestions={catalogSuggestions}
              placeholder={t('products.searchCatalogPlaceholder')}
              className="w-60"
            />
            <button
              type="button"
              onClick={generateProductBarcode}
              disabled={barcodeGenerating}
              className="inline-flex items-center gap-1.5 rounded border border-[#ECB390] bg-[#ECDFC8] px-3 py-1.5 text-xs font-bold text-[#3D251E] hover:bg-[#ECB390] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <LuBarcode className="h-3.5 w-3.5 text-[#DF7861]" />
              <span>
                {barcodeGenerating
                  ? t('products.generating')
                  : t('products.generateBarcode')}
              </span>
            </button>
          </div>
        </div>

        <div
          tabIndex={0}
          role="region"
          aria-label={t('products.list')}
          className="pos-scroll min-h-0 flex-1 rounded-md border border-[#ECB390] bg-[#FCF8E8]"
        >
          <table className="pos-table text-left text-xs">
            <thead className="bg-[#ECB390] text-[11px] font-bold text-[#3D251E]">
              <tr>
                <th className="px-3 py-2.5">{t('products.productName')}</th>
                <th className="whitespace-nowrap px-3 py-2.5">
                  {t('products.barcode')}
                </th>
                <th className="whitespace-nowrap px-3 py-2.5 text-right">
                  {t('cart.stock')}
                </th>
                <th className="whitespace-nowrap px-3 py-2.5 text-right">
                  {t('products.sellingPrice')}
                </th>
                <th className="whitespace-nowrap px-3 py-2.5 text-right">
                  {t('products.actions')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#ECDFC8] bg-[#FCF8E8]">
              {filteredCatalog.map((product) => {
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
                  <tr key={product.id} className="hover:bg-[#ECDFC8]/60">
                    <td className="px-3 py-2 align-middle">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-bold text-[#3D251E]">
                          {displayName}
                        </span>
                        {isProductRecent(product.created_at) ? (
                          <span className="rounded border border-emerald-300 bg-emerald-50 px-1.5 py-[1px] text-[9px] font-bold text-emerald-800">
                            {t('products.recentlyAdded')}
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-0.5 text-[11px] text-[#7A6258]">
                        {displayUnit ? (
                          <span className="font-semibold text-[#5C4338]">
                            {displayUnit}
                          </span>
                        ) : null}
                        {displayUnit && displayCat ? (
                          <span className="mx-1 text-[#ECB390]">·</span>
                        ) : null}
                        {displayCat ? <span>{displayCat}</span> : null}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 align-middle text-xs font-mono font-semibold text-[#5C4338] font-english">
                      {product.barcode || '—'}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right align-middle font-bold font-english">
                      <span
                        className={
                          product.current_stock <= product.low_stock_level
                            ? 'text-[#B93829]'
                            : 'text-[#3D251E]'
                        }
                      >
                        {product.current_stock}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right align-middle font-black text-[#3D251E] font-english">
                      ₹{Number(product.selling_price ?? 0).toFixed(2)}
                      {product.mrp !== null && product.mrp !== undefined ? (
                        <div className="text-[10px] font-semibold text-[#7A6258]">
                          MRP ₹{Number(product.mrp).toFixed(2)}
                        </div>
                      ) : null}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right align-middle">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => openPriceModal(product)}
                          className="inline-flex items-center gap-1 rounded border border-[#ECB390] bg-[#ECDFC8] px-2.5 py-1 text-[11px] font-bold text-[#3D251E] hover:bg-[#ECB390]"
                        >
                          <LuIndianRupee className="h-3 w-3 text-[#DF7861]" />
                          <span>{t('products.updatePrice')}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => openLabelDialog(product)}
                          className="inline-flex items-center gap-1 rounded bg-[#DF7861] px-2.5 py-1 text-[11px] font-bold text-[#FCF8E8] hover:bg-[#c9624c]"
                        >
                          <LuPrinter className="h-3 w-3" />
                          <span>{t('products.printBarcodeLabel')}</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── RIGHT PANE (5 cols): Compact New Product Form (Fits 100% in View) ── */}
      <form
        onSubmit={createProduct}
        className="flex min-h-0 flex-col justify-between overflow-hidden rounded-md border border-[#ECB390] bg-[#FCF8E8] p-3.5 lg:col-span-5"
      >
        <div className="space-y-2.5">
          <div className="flex items-center justify-between gap-2 border-b border-[#ECB390] pb-2">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#7A6258]">
                {t('products.newProduct')}
              </div>
              <h2 className="text-sm font-bold uppercase tracking-wide text-[#3D251E]">
                {t('products.newProduct')}
              </h2>
            </div>
            <span className="rounded border border-[#ECB390] bg-[#ECDFC8] px-2.5 py-0.5 text-[11px] font-bold text-[#3D251E]">
              {t('products.adminOnly')}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <TransliteratedInput
                label={t('products.productName')}
                value={formNameMr}
                onChangeValue={setFormNameMr}
                placeholder={t('products.productNamePlaceholder')}
                required
                showLiveBadge={false}
                className="w-full rounded border border-[#ECB390] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#3D251E] outline-none focus:border-[#DF7861]"
              />
            </div>

            <label className="space-y-1 text-xs font-bold text-[#3D251E] sm:col-span-2">
              <span>{t('products.barcode')}</span>
              <div className="flex gap-1.5">
                <input
                  value={formBarcode}
                  onChange={(e) => setFormBarcode(e.target.value)}
                  placeholder="8901234567890"
                  className="flex-1 rounded border border-[#ECB390] bg-white px-2.5 py-1.5 text-xs font-mono font-semibold text-[#3D251E] outline-none focus:border-[#DF7861] font-english"
                />
                <button
                  type="button"
                  onClick={generateProductBarcode}
                  disabled={barcodeGenerating}
                  className="inline-flex shrink-0 items-center gap-1 rounded border border-[#ECB390] bg-[#ECDFC8] px-2.5 py-1 text-xs font-bold text-[#3D251E] hover:bg-[#ECB390]"
                >
                  <LuBarcode className="h-3.5 w-3.5 text-[#DF7861]" />
                  <span>{t('products.generateBarcode')}</span>
                </button>
              </div>
            </label>

            <label className="space-y-1 text-xs font-bold text-[#3D251E]">
              <span>{t('products.category')}</span>
              <select
                value={formCategoryMr}
                onChange={(e) => setFormCategoryMr(e.target.value)}
                className="w-full rounded border border-[#ECB390] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#3D251E] outline-none focus:border-[#DF7861]"
              >
                <option value="">{t('products.selectCategory')}</option>
                {PRODUCT_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {formatCategoryDisplay(category, isMarathi)}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1 text-xs font-bold text-[#3D251E]">
              <span>{t('products.unit')}</span>
              <select
                value={formUnitType}
                onChange={(e) => {
                  const nextUnit = e.target.value
                  setFormUnitType(nextUnit)
                  setFormPackQtyPreset(
                    PACK_QUANTITY_OPTIONS[nextUnit]?.[0] ?? '1',
                  )
                  setFormPackQtyCustom('')
                }}
                className="w-full rounded border border-[#ECB390] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#3D251E] outline-none focus:border-[#DF7861]"
              >
                {UNIT_TYPES.map((unitType) => (
                  <option key={unitType} value={unitType}>
                    {isMarathi ? unitType : UNIT_LABELS_EN[unitType] || unitType}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1 text-xs font-bold text-[#3D251E]">
              <span>{t('products.packQty')}</span>
              {formPackQtyPreset === CUSTOM_PACK_OPTION ? (
                <input
                  type="number"
                  min={0.01}
                  step="0.01"
                  inputMode="decimal"
                  value={formPackQtyCustom}
                  onChange={(e) => setFormPackQtyCustom(e.target.value)}
                  placeholder={t('products.packQtyCustomPlaceholder')}
                  className="w-full rounded border border-[#ECB390] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#3D251E] outline-none focus:border-[#DF7861] font-english"
                />
              ) : (
                <select
                  value={formPackQtyPreset}
                  onChange={(e) => setFormPackQtyPreset(e.target.value)}
                  className="w-full rounded border border-[#ECB390] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#3D251E] outline-none focus:border-[#DF7861] font-english"
                >
                  {(PACK_QUANTITY_OPTIONS[formUnitType] ?? []).map((quantity) => (
                    <option key={quantity} value={quantity}>
                      {quantity}
                    </option>
                  ))}
                  <option value={CUSTOM_PACK_OPTION}>
                    {t('products.customOption')}
                  </option>
                </select>
              )}
            </label>

            <label className="space-y-1 text-xs font-bold text-[#3D251E]">
              <span>{t('products.gst')} (%)</span>
              <input
                type="number"
                min={0}
                step="0.01"
                inputMode="decimal"
                value={formGstRate}
                onChange={(e) => setFormGstRate(Number(e.target.value))}
                className="w-full rounded border border-[#ECB390] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#3D251E] outline-none focus:border-[#DF7861] font-english"
              />
            </label>

            <label className="space-y-1 text-xs font-bold text-[#3D251E]">
              <span>{t('products.purchasePrice')} (₹)</span>
              <input
                type="number"
                min={0}
                step="0.01"
                inputMode="decimal"
                value={formPurchasePrice}
                onChange={(e) => setFormPurchasePrice(Number(e.target.value))}
                className="w-full rounded border border-[#ECB390] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#3D251E] outline-none focus:border-[#DF7861] font-english"
              />
            </label>

            <label className="space-y-1 text-xs font-bold text-[#3D251E]">
              <span>{t('products.sellingPrice')} (₹) *</span>
              <input
                type="number"
                min={0}
                step="0.01"
                inputMode="decimal"
                value={formSellingPrice}
                onChange={(e) => setFormSellingPrice(Number(e.target.value))}
                className="w-full rounded border border-[#ECB390] bg-white px-2.5 py-1.5 text-xs font-black text-[#3D251E] outline-none focus:border-[#DF7861] font-english"
                required
              />
            </label>

            <label className="space-y-1 text-xs font-bold text-[#3D251E]">
              <span>{t('products.mrp')} (₹)</span>
              <input
                type="number"
                min={0}
                step="0.01"
                inputMode="decimal"
                value={formMrp}
                onChange={(e) => setFormMrp(Number(e.target.value))}
                className="w-full rounded border border-[#ECB390] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#3D251E] outline-none focus:border-[#DF7861] font-english"
              />
            </label>

            <div className="grid grid-cols-2 gap-2">
              <label className="space-y-1 text-xs font-bold text-[#3D251E]">
                <span className="block truncate">
                  {t('products.openingStock')}
                </span>
                <input
                  type="number"
                  min={0}
                  step={1}
                  inputMode="numeric"
                  value={formCurrentStock}
                  onChange={(e) => setFormCurrentStock(Number(e.target.value))}
                  className="w-full rounded border border-[#ECB390] bg-white px-2 py-1.5 text-xs font-semibold text-[#3D251E] outline-none focus:border-[#DF7861] font-english"
                />
              </label>

              <label className="space-y-1 text-xs font-bold text-[#3D251E]">
                <span className="block truncate">
                  {t('products.minimumStock')}
                </span>
                <input
                  type="number"
                  min={0}
                  step={1}
                  inputMode="numeric"
                  value={formLowStockLevel}
                  onChange={(e) => setFormLowStockLevel(Number(e.target.value))}
                  className="w-full rounded border border-[#ECB390] bg-white px-2 py-1.5 text-xs font-semibold text-[#3D251E] outline-none focus:border-[#DF7861] font-english"
                />
              </label>
            </div>
          </div>
        </div>

        <div className="mt-3 flex shrink-0 items-center justify-end gap-2 border-t border-[#ECB390] pt-2.5">
          <button
            type="button"
            onClick={openLabelDialogFromForm}
            className="inline-flex items-center gap-1.5 rounded border border-[#ECB390] bg-[#ECDFC8] px-3.5 py-2 text-xs font-bold text-[#3D251E] hover:bg-[#ECB390]"
          >
            <LuPrinter className="h-3.5 w-3.5 text-[#DF7861]" />
            <span>{t('products.printBarcodeLabel')}</span>
          </button>
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 rounded bg-[#DF7861] px-5 py-2 text-xs font-bold text-[#FCF8E8] hover:bg-[#c9624c]"
          >
            <LuPlus className="h-4 w-4" />
            <span>{t('products.createButton')}</span>
          </button>
        </div>
      </form>
    </div>
  )
}
