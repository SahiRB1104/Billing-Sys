import React, { useEffect, useRef, useState } from 'react'
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
  const [isMarathiMode, setIsMarathiMode] = useState(true)
  const bufferRef = useRef('')
  const committedRef = useRef(value)

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
    // Shortcut Ctrl+G to toggle transliteration mode
    if (e.ctrlKey && e.key.toLowerCase() === 'g') {
      e.preventDefault()
      commitBuffer()
      setIsMarathiMode((prev) => !prev)
      return
    }

    if (!isMarathiMode) {
      return
    }

    // Ignore key combos with Alt/Ctrl/Meta (like copy/paste/select-all)
    if (e.altKey || e.ctrlKey || e.metaKey) {
      return
    }

    // 1. Letters A-Z: convert live on every keystroke
    if (/^[a-zA-Z]$/.test(e.key)) {
      e.preventDefault()
      bufferRef.current += e.key
      const liveWord = transliterateWord(bufferRef.current)
      const fullText = committedRef.current + liveWord
      onChangeValue(fullText)
      return
    }

    // 2. Space: commit buffer and append space
    if (e.key === ' ') {
      e.preventDefault()
      const word = bufferRef.current ? transliterateWord(bufferRef.current) : ''
      committedRef.current += word + ' '
      bufferRef.current = ''
      onChangeValue(committedRef.current)
      return
    }

    // 3. Numbers: convert to Devanagari digits live
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

    // 4. Backspace: remove last letter from buffer or committed
    if (e.key === 'Backspace') {
      if (bufferRef.current.length > 0) {
        e.preventDefault()
        bufferRef.current = bufferRef.current.slice(0, -1)
        const liveWord = bufferRef.current ? transliterateWord(bufferRef.current) : ''
        const fullText = committedRef.current + liveWord
        onChangeValue(fullText)
        return
      }

      // If buffer is empty, let native backspace remove character from committed
      if (committedRef.current.length > 0) {
        e.preventDefault()
        // Remove last character/code point
        const chars = Array.from(committedRef.current)
        chars.pop()
        committedRef.current = chars.join('')
        onChangeValue(committedRef.current)
        return
      }
    }

    // 5. Enter or Tab: commit buffer
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
        <div className="mb-1 flex items-center justify-between text-sm font-semibold text-stone-700">
          <span>{label}</span>
          {showToggle && (
            <button
              type="button"
              onClick={() => {
                commitBuffer()
                setIsMarathiMode((prev) => !prev)
              }}
              title="Ctrl+G to toggle"
              className={`rounded-md px-2 py-0.5 text-xs font-bold transition ${
                isMarathiMode
                  ? 'bg-amber-600 text-white'
                  : 'bg-stone-200 text-stone-600 hover:bg-stone-300'
              }`}
            >
              {isMarathiMode ? '🔤 मराठी थेट (Live EN→MR)' : 'ABC English'}
            </button>
          )}
        </div>
      )}

      <div className="relative">
        <input
          {...restProps}
          value={value}
          onChange={(e) => {
            // Fallback for direct input/IME
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
            title="Ctrl+G to toggle EN->MR"
            tabIndex={-1}
            className={`absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-[11px] font-bold transition ${
              isMarathiMode
                ? 'bg-amber-600 text-white'
                : 'bg-stone-200 text-stone-600 hover:bg-stone-300'
            }`}
          >
            {isMarathiMode ? 'EN→MR थेट' : 'EN'}
          </button>
        )}
      </div>

      {showLiveBadge && value && isMarathiMode && (
        <div className="mt-1 flex items-center gap-1.5 text-xs font-medium text-amber-800">
          <span className="font-bold">थेट रूपांतर:</span>
          <span className="rounded bg-amber-100 px-2 py-0.5 font-bold">{value}</span>
        </div>
      )}
    </div>
  )
}
