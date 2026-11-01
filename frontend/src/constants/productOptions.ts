import { toStrictEnglish, toStrictMarathi } from '../utils/transliteration'

export const UNIT_TYPES = [
  'ग्रॅम',
  'किलो',
  'मिली',
  'लिटर',
  'नग',
  'डझन',
  'पॅकेट',
  'बॉक्स',
  'बाटली',
] as const

export type UnitType = (typeof UNIT_TYPES)[number]

export const UNIT_LABELS_EN: Record<string, string> = {
  ग्रॅम: 'Gram (g)',
  किलो: 'Kilogram (kg)',
  मिली: 'Millilitre (ml)',
  लिटर: 'Litre (Ltr)',
  नग: 'Piece (pcs)',
  डझन: 'Dozen (doz)',
  पॅकेट: 'Packet (pkt)',
  बॉक्स: 'Box',
  बाटली: 'Bottle (btl)',
}

export const PACK_QUANTITY_OPTIONS: Record<string, string[]> = {
  ग्रॅम: ['50', '100', '200', '250', '500', '750', '1000'],
  किलो: ['0.5', '1', '2', '5', '10'],
  मिली: ['50', '100', '200', '250', '500', '750', '1000'],
  लिटर: ['0.25', '0.5', '1', '2', '5', '10'],
  नग: ['1', '2', '3', '5', '10', '20'],
  डझन: ['1', '2', '3', '5', '10'],
  पॅकेट: ['1', '2', '5', '10', '20'],
  बॉक्स: ['1', '2', '5', '10', '20'],
  बाटली: ['1', '2', '5', '10', '20'],
}

export const CUSTOM_PACK_OPTION = 'कस्टम'

export const PRODUCT_CATEGORIES = [
  'धान्य',
  'डाळी',
  'तेल',
  'मसाला',
  'साखर',
  'मीठ',
  'चहा / कॉफी',
  'बिस्किटे',
  'स्नॅक्स',
  'पेये',
  'दुग्धजन्य पदार्थ',
  'भाज्या',
  'फळे',
  'साबण',
  'डिटर्जंट',
  'घरगुती वस्तू',
  'वैयक्तिक वापर',
  'इतर',
]

export const CATEGORY_LABELS_EN: Record<string, string> = {
  धान्य: 'Grains & Cereals',
  डाळी: 'Pulses & Lentils',
  तेल: 'Edible Oil',
  मसाला: 'Spices & Masala',
  साखर: 'Sugar & Jaggery',
  मीठ: 'Salt',
  'चहा / कॉफी': 'Tea & Coffee',
  बिस्किटे: 'Biscuits & Bakery',
  स्नॅक्स: 'Snacks & Namkeen',
  पेये: 'Beverages & Cold Drinks',
  'दुग्धजन्य पदार्थ': 'Dairy Products',
  भाज्या: 'Vegetables',
  फळे: 'Fruits',
  साबण: 'Bath & Laundry Soap',
  डिटर्जंट: 'Detergent & Cleaners',
  'घरगुती वस्तू': 'Household Essentials',
  'वैयक्तिक वापर': 'Personal Care',
  इतर: 'Other Grocery',
  'daily items': 'Daily Essentials',
}

export function formatCategoryDisplay(category: string | null | undefined, isMarathi: boolean): string {
  if (!category) return ''
  const trimmed = category.trim()
  if (isMarathi) {
    return toStrictMarathi(trimmed)
  }
  return CATEGORY_LABELS_EN[trimmed] || toStrictEnglish(trimmed)
}

export function formatUnitDisplay(unitDisplay: string | null | undefined, isMarathi: boolean): string {
  if (!unitDisplay) return ''
  const trimmed = unitDisplay.trim()
  if (isMarathi) {
    return toStrictMarathi(trimmed)
  }
  return toStrictEnglish(trimmed)
}

export function formatProductName(nameMr: string | null | undefined, isMarathi: boolean): string {
  if (!nameMr) return ''
  const trimmed = nameMr.trim()
  if (isMarathi) {
    return trimmed
  }
  return toStrictEnglish(trimmed)
}

export const RECENT_PRODUCT_DAYS = 7

export function formatPackQuantity(value: number | null | undefined): string {
  if (value === null || value === undefined) return ''
  const parsed = Number(value)
  if (Number.isNaN(parsed)) return String(value)
  if (Number.isInteger(parsed)) return String(parsed)
  return parsed.toFixed(2).replace(/\.?0+$/, '')
}

export function isProductRecent(createdAt: string | null | undefined, now: Date = new Date()): boolean {
  if (!createdAt) return false
  const created = new Date(createdAt)
  if (Number.isNaN(created.getTime())) return false
  const diffMs = now.getTime() - created.getTime()
  if (diffMs < 0) return false
  return diffMs <= RECENT_PRODUCT_DAYS * 24 * 60 * 60 * 1000
}

export function isCustomPackOption(value: string): boolean {
  return value === CUSTOM_PACK_OPTION
}

export function isValidPackQuantity(value: string): boolean {
  const trimmed = value.trim()
  if (!trimmed) return false
  if (!/^\d+(\.\d+)?$/.test(trimmed)) return false
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) && parsed > 0
}
