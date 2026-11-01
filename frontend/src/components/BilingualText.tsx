import React from 'react'
import i18next from '../i18n'
import { localizeDynamicText } from '../utils/transliteration'

/**
 * Renders text strictly in the active language:
 * - When Marathi ('mr') is active: renders with Tiro Devanagari Marathi (.font-marathi)
 * - When English ('en') is active: converts any Marathi dynamic tokens to English and renders with .font-english
 */
export function renderBilingualText(text: string | null | undefined): React.ReactNode {
  if (!text) return null
  const isMarathi = (i18next.language || 'mr').startsWith('mr')
  const output = localizeDynamicText(text, isMarathi)

  return (
    <span className={isMarathi ? 'font-marathi' : 'font-english'}>
      {output}
    </span>
  )
}

export const BilingualText: React.FC<{ text: string | null | undefined; className?: string }> = ({
  text,
  className = '',
}) => {
  return <span className={className}>{renderBilingualText(text)}</span>
}
