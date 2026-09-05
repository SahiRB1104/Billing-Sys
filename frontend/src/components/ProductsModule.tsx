import React from 'react'
import { useTranslation } from 'react-i18next'
import { useWorkspace } from '../context/WorkspaceContext'
import { TransliteratedInput } from './TransliteratedInput'
import {
  CUSTOM_PACK_OPTION,
  PACK_QUANTITY_OPTIONS,
  PRODUCT_CATEGORIES,
  UNIT_TYPES,
  isCustomPackOption,
  isProductRecent,
} from '../constants/productOptions'

export const ProductsModule: React.FC = () => {
  const { t } = useTranslation()
  const ws = useWorkspace()
  const {
    products,
    barcodeGenerating,
    generateProductBarcode,
    openPriceModal,
    openLabelDialog,
    setStatusText,
    setFormBarcode,
    setFormNameMr,
    setFormCategoryMr,
    setFormUnitType,
    setFormPackQtyPreset,
    setFormPackQtyCustom,
    setFormSku: _setFormSku,
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

  const openLabelDialogFromForm = () => {
    if (!formBarcode.trim()) {
      setStatusText('प्रथम बारकोड तयार करा किंवा मॅन्युअली भरा.')
      return
    }
    const packQuantity = isCustomPackOption(formPackQtyPreset)
      ? Number(formPackQtyCustom) || null
      : Number(formPackQtyPreset) || null
    openLabelDialog({
      id: 0,
      name_mr: formNameMr.trim() || 'उत्पादन',
      barcode: formBarcode.trim(),
      sku: formSku.trim() || null,
      category_mr: formCategoryMr.trim() || null,
      unit: null,
      unit_type: formUnitType.trim() || null,
      pack_quantity: packQuantity,
      unit_display: packQuantity ? `${packQuantity} ${formUnitType}`.trim() : formUnitType.trim() || null,
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
    <div className="grid flex-1 grid-cols-1 gap-5 xl:grid-cols-[1.16fr_0.84fr]">
      <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <div className="text-xs font-bold text-stone-500">
              {t('nav.productEntry')}
            </div>
            <h2 className="mt-1 text-2xl font-black text-stone-900">{t('products.list')}</h2>
          </div>
          <button
            type="button"
            onClick={generateProductBarcode}
            disabled={barcodeGenerating}
            className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {barcodeGenerating ? 'तयार करत आहे...' : 'बारकोड तयार करा'}
          </button>
        </div>

        <div className="max-h-[640px] overflow-auto rounded-2xl border border-stone-200">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-stone-50 text-stone-700">
              <tr>
                <th className="px-4 py-3 font-bold">{t('products.productName')}</th>
                <th className="whitespace-nowrap px-4 py-3 font-bold">{t('products.barcode')}</th>
                <th className="whitespace-nowrap px-4 py-3 font-bold">{t('cart.stock')}</th>
                <th className="whitespace-nowrap px-4 py-3 font-bold">{t('products.sellingPrice')}</th>
                <th className="whitespace-nowrap px-4 py-3 font-bold">{t('products.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id} className="border-t border-stone-200 hover:bg-stone-50">
                  <td className="px-4 py-3 align-middle">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-stone-900">{product.name_mr}</span>
                      {isProductRecent(product.created_at) ? (
                        <span className="rounded bg-emerald-100 px-1.5 py-[1px] text-[9px] font-semibold text-emerald-700">
                          नुकतेच जोडले
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-0.5 text-xs text-stone-500">
                      {product.unit_display ? (
                        <span className="font-semibold text-stone-600">{product.unit_display}</span>
                      ) : null}
                      {product.unit_display && product.category_mr ? (
                        <span className="mx-1 text-stone-300">·</span>
                      ) : null}
                      {product.category_mr || ''}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 align-middle text-sm text-stone-700">{product.barcode || '—'}</td>
                  <td className="whitespace-nowrap px-4 py-3 align-middle font-semibold">{product.current_stock}</td>
                  <td className="whitespace-nowrap px-4 py-3 align-middle font-semibold">
                    ₹ {Number(product.selling_price ?? 0).toFixed(2)}
                    {product.mrp !== null && product.mrp !== undefined ? (
                      <span className="ml-1 text-[10px] font-bold text-stone-400">
                        MRP ₹ {Number(product.mrp).toFixed(2)}
                      </span>
                    ) : null}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 align-middle">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openPriceModal(product)}
                        className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-bold text-stone-700 hover:bg-stone-100"
                      >
                        ₹ {t('products.updatePrice')}
                      </button>
                      <button
                        type="button"
                        onClick={() => openLabelDialog(product)}
                        className="rounded-lg bg-stone-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-stone-800"
                      >
                        प्रिंट बारकोड लेबल
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <form onSubmit={createProduct} className="rounded-2xl border border-stone-200 bg-stone-50 p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <div className="text-xs font-bold text-stone-500">
              {t('products.newProduct')}
            </div>
            <h2 className="mt-1 text-2xl font-black text-stone-900">नवीन उत्पादन</h2>
          </div>
          <span className="rounded-full border border-stone-200 bg-white px-3 py-1 text-xs font-bold text-stone-700">
            प्रशासक
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <TransliteratedInput
              label={t('products.productName')}
              value={formNameMr}
              onChangeValue={setFormNameMr}
              placeholder="उदा. साखर (sakhar)"
              required
              className="w-full rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-sm"
            />
          </div>

          <label className="space-y-1 text-sm font-semibold text-stone-700 md:col-span-2">
            <span>{t('products.barcode')}</span>
            <input
              value={formBarcode}
              onChange={(e) => setFormBarcode(e.target.value)}
              placeholder="8901234567890"
              className="w-full rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-sm"
            />
          </label>

          <label className="space-y-1 text-sm font-semibold text-stone-700">
            <span>{t('products.category')}</span>
            <select
              value={formCategoryMr}
              onChange={(e) => setFormCategoryMr(e.target.value)}
              className="w-full rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-sm"
            >
              <option value="">— वर्ग निवडा —</option>
              {PRODUCT_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1 text-sm font-semibold text-stone-700">
            <span>{t('products.unit')}</span>
            <select
              value={formUnitType}
              onChange={(e) => {
                const nextUnit = e.target.value
                setFormUnitType(nextUnit)
                setFormPackQtyPreset(PACK_QUANTITY_OPTIONS[nextUnit]?.[0] ?? '1')
                setFormPackQtyCustom('')
              }}
              className="w-full rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-sm"
            >
              {UNIT_TYPES.map((unitType) => (
                <option key={unitType} value={unitType}>
                  {unitType}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1 text-sm font-semibold text-stone-700">
            <span>पॅक प्रमाण</span>
            {formPackQtyPreset === CUSTOM_PACK_OPTION ? (
              <input
                type="number"
                min={0.01}
                step="0.01"
                inputMode="decimal"
                value={formPackQtyCustom}
                onChange={(e) => setFormPackQtyCustom(e.target.value)}
                placeholder="उदा. 0.75, 3, 5"
                className="w-full rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-sm"
              />
            ) : (
              <select
                value={formPackQtyPreset}
                onChange={(e) => setFormPackQtyPreset(e.target.value)}
                className="w-full rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-sm"
              >
                {(PACK_QUANTITY_OPTIONS[formUnitType] ?? []).map((quantity) => (
                  <option key={quantity} value={quantity}>
                    {quantity}
                  </option>
                ))}
                <option value={CUSTOM_PACK_OPTION}>{CUSTOM_PACK_OPTION}</option>
              </select>
            )}
          </label>

          <label className="space-y-1 text-sm font-semibold text-stone-700">
            <span>{t('products.gst')} (%)</span>
            <input
              type="number"
              min={0}
              step="0.01"
              inputMode="decimal"
              value={formGstRate}
              onChange={(e) => setFormGstRate(Number(e.target.value))}
              className="w-full rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-sm"
            />
          </label>

          <label className="space-y-1 text-sm font-semibold text-stone-700">
            <span>{t('products.purchasePrice')} (₹)</span>
            <input
              type="number"
              min={0}
              step="0.01"
              inputMode="decimal"
              value={formPurchasePrice}
              onChange={(e) => setFormPurchasePrice(Number(e.target.value))}
              className="w-full rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-sm"
            />
          </label>

          <label className="space-y-1 text-sm font-semibold text-stone-700">
            <span>{t('products.sellingPrice')} (₹)</span>
            <input
              type="number"
              min={0}
              step="0.01"
              inputMode="decimal"
              value={formSellingPrice}
              onChange={(e) => setFormSellingPrice(Number(e.target.value))}
              className="w-full rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-sm"
              required
            />
          </label>

          <label className="space-y-1 text-sm font-semibold text-stone-700">
            <span>{t('products.mrp')} (₹)</span>
            <input
              type="number"
              min={0}
              step="0.01"
              inputMode="decimal"
              value={formMrp}
              onChange={(e) => setFormMrp(Number(e.target.value))}
              className="w-full rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-sm"
            />
          </label>

          <label className="space-y-1 text-sm font-semibold text-stone-700">
            <span>{t('products.openingStock')}</span>
            <input
              type="number"
              min={0}
              step={1}
              inputMode="numeric"
              value={formCurrentStock}
              onChange={(e) => setFormCurrentStock(Number(e.target.value))}
              className="w-full rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-sm"
            />
          </label>

          <label className="space-y-1 text-sm font-semibold text-stone-700">
            <span>{t('products.minimumStock')}</span>
            <input
              type="number"
              min={0}
              step={1}
              inputMode="numeric"
              value={formLowStockLevel}
              onChange={(e) => setFormLowStockLevel(Number(e.target.value))}
              className="w-full rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-sm"
            />
          </label>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={openLabelDialogFromForm}
            className="rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm font-bold text-stone-700 hover:bg-stone-100"
          >
            प्रिंट बारकोड लेबल
          </button>
          <button
            type="submit"
            className="rounded-xl bg-stone-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-stone-800"
          >
            {t('products.createButton')}
          </button>
        </div>
      </form>
    </div>
  )
}