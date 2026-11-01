import type React from 'react'

/**
 * Tiro Devanagari Marathi Font Utility & Helper
 *
 * Provides typographic helpers and display class builders for Tiro Devanagari Marathi
 * as the exclusive Marathi font across Billing-Sys.
 */

export const TIRO_MARATHI_FONT_FAMILY = "'Tiro Devanagari Marathi', serif"
export const AMS_FONT_FAMILY = TIRO_MARATHI_FONT_FAMILY
export const MARATHI_CALLIGRAPHY_FONT = TIRO_MARATHI_FONT_FAMILY
export const MUKTA_FONT_FAMILY = "'Mukta', 'Segoe UI', system-ui, -apple-system, sans-serif"

/**
 * Returns Tailwind/CSS classes for Marathi headers
 */
export function getAmsHeaderClass(extraClasses = ''): string {
  return `font-marathi font-bold tracking-normal ${extraClasses}`.trim()
}

/**
 * Standard Marathi badge / pill style
 */
export function getAmsBadgeClass(extraClasses = ''): string {
  return `font-marathi font-medium tracking-normal ${extraClasses}`.trim()
}

/**
 * Receipt header styling with Tiro Devanagari Marathi font
 */
export function getAmsReceiptHeaderStyle(): React.CSSProperties {
  return {
    fontFamily: TIRO_MARATHI_FONT_FAMILY,
    letterSpacing: 'normal',
  }
}
