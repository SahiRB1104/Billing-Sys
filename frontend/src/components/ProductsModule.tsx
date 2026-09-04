import React from 'react'
import { useTranslation } from 'react-i18next'
import { useWorkspace } from '../context/WorkspaceContext'
import { TransliteratedInput } from './TransliteratedInput'

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
    setFormUnit,
    setFormSku: _setFormSku,
    setFormHsnCode,
    setFormPurchasePrice,
    setFormSellingPrice,
    setFormMrp,
    setFormGstRate,
    setFormCurrentStock,
    setFormLowStockLevel,
    formBarcode,
    formNameMr,
    formCategoryMr,
    formUnit,
    formSku,
    formHsnCode,
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
    openLabelDialog({
      id: 0,
      name_mr: formNameMr.trim() || 'उत्पादन',
      barcode: formBarcode.trim(),
      sku: formSku.trim() || null,
      category_mr: formCategoryMr.trim() || null,
      unit: formUnit.trim() || null,
      hsn_code: formHsnCode.trim() || null,
      purchase_price: Number(formPurchasePrice) || null,
      selling_price: Number(formSellingPrice) || null,
      mrp: Number(formMrp) || null,
      gst_rate: Number(formGstRate) || null,
      current_stock: Number(formCurrentStock) || 1,
      low_stock_level: Number(formLowStockLevel) || 0,
      is_active: true,
    })
  }

  return (
    <div className="grid flex-1 grid-cols-1 gap-5 xl:grid-cols-[1.12fr_0.88fr]">
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
                <th className="px-4 py-3 font-bold">{t('products.barcode')}</th>
                <th className="px-4 py-3 font-bold">{t('cart.stock')}</th>
                <th className="px-4 py-3 font-bold">{t('products.sellingPrice')}</th>
                <th className="px-4 py-3 font-bold">{t('products.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id} className="border-t border-stone-200 hover:bg-stone-50">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-stone-900">{product.name_mr}</div>
                    <div className="text-xs text-stone-500">{product.category_mr || '—'}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-stone-700">{product.barcode || '—'}</td>
                  <td className="px-4 py-3 font-semibold">{product.current_stock}</td>
                  <td className="px-4 py-3 font-semibold">
                    ₹ {Number(product.selling_price ?? 0).toFixed(2)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
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
              placeholder="उदा. साखर १ किलो (sakhar 1 kilo)"
              required
              className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm"
            />
          </div>

          <label className="space-y-1 text-sm font-semibold text-stone-700 md:col-span-2">
            <span>{t('products.barcode')}</span>
            <input
              value={formBarcode}
              onChange={(e) => setFormBarcode(e.target.value)}
              placeholder="8901234567890"
              className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm"
            />
          </label>

          <div>
            <TransliteratedInput
              label={t('products.category')}
              value={formCategoryMr}
              onChangeValue={setFormCategoryMr}
              placeholder="उदा. धान्य"
              className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm"
            />
          </div>

          <div>
            <TransliteratedInput
              label={t('products.unit')}
              value={formUnit}
              onChangeValue={setFormUnit}
              placeholder="उदा. किलो"
              className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm"
            />
          </div>

          <label className="space-y-1 text-sm font-semibold text-stone-700">
            <span>{t('products.hsn')}</span>
            <input
              value={formHsnCode}
              onChange={(e) => setFormHsnCode(e.target.value)}
              className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm"
            />
          </label>

          <label className="space-y-1 text-sm font-semibold text-stone-700">
            <span>{t('products.gst')} (%)</span>
            <input
              type="number"
              value={formGstRate}
              onChange={(e) => setFormGstRate(Number(e.target.value))}
              className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm"
            />
          </label>

          <label className="space-y-1 text-sm font-semibold text-stone-700">
            <span>{t('products.purchasePrice')} (₹)</span>
            <input
              type="number"
              value={formPurchasePrice}
              onChange={(e) => setFormPurchasePrice(Number(e.target.value))}
              className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm"
            />
          </label>

          <label className="space-y-1 text-sm font-semibold text-stone-700">
            <span>{t('products.sellingPrice')} (₹)</span>
            <input
              type="number"
              value={formSellingPrice}
              onChange={(e) => setFormSellingPrice(Number(e.target.value))}
              className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm"
              required
            />
          </label>

          <label className="space-y-1 text-sm font-semibold text-stone-700">
            <span>{t('products.mrp')} (₹)</span>
            <input
              type="number"
              value={formMrp}
              onChange={(e) => setFormMrp(Number(e.target.value))}
              className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm"
            />
          </label>

          <label className="space-y-1 text-sm font-semibold text-stone-700">
            <span>{t('products.openingStock')}</span>
            <input
              type="number"
              value={formCurrentStock}
              onChange={(e) => setFormCurrentStock(Number(e.target.value))}
              className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm"
            />
          </label>

          <label className="space-y-1 text-sm font-semibold text-stone-700">
            <span>{t('products.minimumStock')}</span>
            <input
              type="number"
              value={formLowStockLevel}
              onChange={(e) => setFormLowStockLevel(Number(e.target.value))}
              className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm"
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
