import React, { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { transliterateText, transliterateWord } from '../utils/transliteration'

interface TransliteratedInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value: string
  onChangeValue: (val: string) => void
  showToggle?: boolean
  label?: string
  showLiveBadge?: boolean
}

export const TransliteratedInput: React.FC<TransliteratedInputProps> = ({
  value,
  onChangeValue,
  showToggle = true,
  label,
  showLiveBadge = true,
  placeholder,
  className = '',
  ...restProps
}) => {
  const { t, i18n } = useTranslation()
  const isGlobalMarathi = (i18n.language || 'mr').startsWith('mr')
  const [isMarathiMode, setIsMarathiMode] = useState(isGlobalMarathi)
  const bufferRef = useRef('')
  const committedRef = useRef(value)

  // Sync default input mode when global language toggles
  useEffect(() => {
    setIsMarathiMode(isGlobalMarathi)
  }, [isGlobalMarathi])

  // Keep committed text in sync with external value resets
  useEffect(() => {
    if (!value) {
      committedRef.current = ''
      bufferRef.current = ''
    }
  }, [value])

  const commitBuffer = () => {
    if (bufferRef.current) {
      const converted = transliterateWord(bufferRef.current)
      committedRef.current += converted
      bufferRef.current = ''
      onChangeValue(committedRef.current)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.ctrlKey && e.key.toLowerCase() === 'g') {
      e.preventDefault()
      commitBuffer()
      setIsMarathiMode((prev) => !prev)
      return
    }

    if (!isMarathiMode) {
      return
    }

    if (e.altKey || e.ctrlKey || e.metaKey) {
      return
    }

    if (/^[a-zA-Z]$/.test(e.key)) {
      e.preventDefault()
      bufferRef.current += e.key
      const liveWord = transliterateWord(bufferRef.current)
      const fullText = committedRef.current + liveWord
      onChangeValue(fullText)
      return
    }

    if (e.key === ' ') {
      e.preventDefault()
      const word = bufferRef.current ? transliterateWord(bufferRef.current) : ''
      committedRef.current += word + ' '
      bufferRef.current = ''
      onChangeValue(committedRef.current)
      return
    }

    if (/^[0-9]$/.test(e.key)) {
      e.preventDefault()
      const devDigits = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९']
      const digit = devDigits[parseInt(e.key, 10)] ?? e.key
      const word = bufferRef.current ? transliterateWord(bufferRef.current) : ''
      committedRef.current += word + digit
      bufferRef.current = ''
      onChangeValue(committedRef.current)
      return
    }

    if (e.key === 'Backspace') {
      if (bufferRef.current.length > 0) {
        e.preventDefault()
        bufferRef.current = bufferRef.current.slice(0, -1)
        const liveWord = bufferRef.current ? transliterateWord(bufferRef.current) : ''
        const fullText = committedRef.current + liveWord
        onChangeValue(fullText)
        return
      }

      if (committedRef.current.length > 0) {
        e.preventDefault()
        const chars = Array.from(committedRef.current)
        chars.pop()
        committedRef.current = chars.join('')
        onChangeValue(committedRef.current)
        return
      }
    }

    if (e.key === 'Enter' || e.key === 'Tab') {
      commitBuffer()
    }
  }

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    commitBuffer()
    if (restProps.onBlur) {
      restProps.onBlur(e)
    }
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    if (!isMarathiMode) return
    e.preventDefault()
    const pasted = e.clipboardData.getData('text')
    const converted = transliterateText(pasted)
    committedRef.current += converted
    bufferRef.current = ''
    onChangeValue(committedRef.current)
  }

  return (
    <div className="relative w-full">
      {label && (
        <div className="mb-1 flex items-center justify-between text-xs font-bold text-[#3D251E]">
          <span>{label}</span>
          {showToggle && (
            <button
              type="button"
              onClick={() => {
                commitBuffer()
                setIsMarathiMode((prev) => !prev)
              }}
              title="Ctrl+G"
              className={`rounded px-2 py-0.5 text-[10px] font-bold transition ${
                isMarathiMode
                  ? 'bg-[#DF7861] text-[#FCF8E8]'
                  : 'border border-[#ECB390] bg-[#ECDFC8] text-[#3D251E] hover:bg-[#ECB390]/50'
              }`}
            >
              {isMarathiMode ? t('translit.liveMode') : t('translit.enMode')}
            </button>
          )}
        </div>
      )}

      <div className="relative">
        <input
          {...restProps}
          value={value}
          onChange={(e) => {
            committedRef.current = e.target.value
            bufferRef.current = ''
            onChangeValue(e.target.value)
          }}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          onPaste={handlePaste}
          placeholder={placeholder}
          className={`${className} ${showToggle && !label ? 'pr-24' : ''}`}
        />
        {showToggle && !label && (
          <button
            type="button"
            onClick={() => {
              commitBuffer()
              setIsMarathiMode((prev) => !prev)
            }}
            title="Ctrl+G"
            tabIndex={-1}
            className={`absolute right-2 top-1/2 -translate-y-1/2 rounded px-2 py-0.5 text-[10px] font-bold transition ${
              isMarathiMode
                ? 'bg-[#DF7861] text-[#FCF8E8]'
                : 'border border-[#ECB390] bg-[#ECDFC8] text-[#5C4338] hover:bg-[#ECB390]/50'
            }`}
          >
            {isMarathiMode ? t('translit.liveMode') : t('translit.enMode')}
          </button>
        )}
      </div>

      {showLiveBadge && value && isMarathiMode && (
        <div className="mt-1 flex items-center gap-1.5 text-[11px] font-medium text-[#5C4338]">
          <span className="font-bold">{t('translit.livePreview')}</span>
          <span className="rounded border border-[#ECB390] bg-[#ECDFC8] px-1.5 py-0.2 font-bold text-[#3D251E]">{value}</span>
        </div>
      )}
    </div>
  )
}
