import React, { useState, useMemo, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { LuSearch, LuX } from './Icons'
import {
  liveMarathiPhoneticInput,
  transliterateText,
  devanagariToPhonetic,
} from '../utils/transliteration'

export interface PredictiveSuggestion {
  id: string | number
  /** Primary text used for word prediction and main display (e.g. "sahil bhalekar" or "Tata Salt 1 kg") */
  primaryText: string
  /** Optional secondary text (e.g. "INV-000099 • 9975839029" or barcode/category) */
  secondaryText?: string
  /** Optional right-side badge (e.g. "₹ 19.40" or "Stock: 37") */
  badgeText?: string
  /** Optional search tokens that also match this suggestion */
  keywords?: string[]
  /** Action when clicking or pressing Enter on this suggestion */
  onSelect?: () => void
}

interface PredictiveSearchInputProps {
  value: string
  onChange: (value: string) => void
  suggestions: PredictiveSuggestion[]
  placeholder?: string
  onEnter?: () => void
  inputRef?: React.RefObject<HTMLInputElement | null>
  autoFocus?: boolean
  className?: string
  inputClassName?: string
}

export const PredictiveSearchInput: React.FC<PredictiveSearchInputProps> = ({
  value,
  onChange,
  suggestions,
  placeholder,
  onEnter,
  inputRef: externalRef,
  autoFocus,
  className = '',
  inputClassName = '',
}) => {
  const { i18n } = useTranslation()
  const isMarathi = (i18n.language || 'mr').startsWith('mr')

  const internalRef = useRef<HTMLInputElement | null>(null)
  const inputRef = externalRef || internalRef
  const containerRef = useRef<HTMLDivElement | null>(null)

  const [isFocused, setIsFocused] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1)

  // Compute matching suggestions as the user types (without needing Enter)
  const matchingSuggestions = useMemo(() => {
    const q = value.trim().toLowerCase()
    if (!q) return []
    const qDeva = transliterateText(q).toLowerCase()
    const qPhonetic = devanagariToPhonetic(q).toLowerCase()

    const startsWithMatches: PredictiveSuggestion[] = []
    const containsMatches: PredictiveSuggestion[] = []

    for (const item of suggestions) {
      const primaryLower = (item.primaryText || '').toLowerCase()
      const primaryDeva = transliterateText(item.primaryText || '').toLowerCase()
      const primaryPhonetic = devanagariToPhonetic(item.primaryText || '').toLowerCase()
      const secondaryLower = (item.secondaryText || '').toLowerCase()
      const keywordMatch = (item.keywords || []).some((k) => {
        const kl = (k || '').toLowerCase()
        return (
          kl.includes(q) ||
          (qDeva && kl.includes(qDeva)) ||
          (qPhonetic && kl.includes(qPhonetic))
        )
      })

      if (
        primaryLower.startsWith(q) ||
        (qDeva && primaryLower.startsWith(qDeva)) ||
        (qDeva && primaryDeva.startsWith(qDeva)) ||
        (qPhonetic && primaryPhonetic.startsWith(qPhonetic)) ||
        primaryLower.split(/\s+/).some((word) => word.startsWith(q))
      ) {
        startsWithMatches.push(item)
      } else if (
        primaryLower.includes(q) ||
        (qDeva && primaryLower.includes(qDeva)) ||
        (qDeva && primaryDeva.includes(qDeva)) ||
        (qPhonetic && primaryPhonetic.includes(qPhonetic)) ||
        secondaryLower.includes(q) ||
        keywordMatch
      ) {
        containsMatches.push(item)
      }
    }

    return [...startsWithMatches, ...containsMatches].slice(0, 6)
  }, [value, suggestions])

  // Compute inline ghost-text completion
  const predictedCompletion = useMemo(() => {
    const raw = value
    const trimmed = raw.trim()
    if (!trimmed) return ''
    const lower = trimmed.toLowerCase()

    for (const item of matchingSuggestions) {
      const candidate = (item.primaryText || '').trim()
      const candidateDeva = isMarathi ? transliterateText(candidate) : candidate

      if (candidate.toLowerCase().startsWith(lower) && candidate.length > trimmed.length) {
        return raw + candidate.slice(trimmed.length)
      }
      if (
        isMarathi &&
        candidateDeva.toLowerCase().startsWith(lower) &&
        candidateDeva.length > trimmed.length
      ) {
        return raw + candidateDeva.slice(trimmed.length)
      }

      const words = (isMarathi ? candidateDeva : candidate).split(/\s+/)
      for (const word of words) {
        if (word.toLowerCase().startsWith(lower) && word.length > trimmed.length) {
          return raw + word.slice(trimmed.length)
        }
      }

      for (const kw of item.keywords || []) {
        const cleanKw = (kw || '').trim()
        if (cleanKw.toLowerCase().startsWith(lower) && cleanKw.length > trimmed.length) {
          return raw + cleanKw.slice(trimmed.length)
        }
      }
    }
    return ''
  }, [value, matchingSuggestions, isMarathi])

  useEffect(() => {
    setHighlightedIndex(-1)
  }, [value])

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsFocused(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (
      (e.key === 'Tab' || e.key === 'ArrowRight') &&
      predictedCompletion &&
      predictedCompletion.toLowerCase() !== value.toLowerCase()
    ) {
      const el = inputRef.current
      const atEnd = !el || el.selectionStart === value.length
      if (atEnd) {
        e.preventDefault()
        onChange(predictedCompletion)
        return
      }
    }

    if (e.key === 'ArrowDown') {
      if (matchingSuggestions.length > 0) {
        e.preventDefault()
        setHighlightedIndex((prev) =>
          prev < matchingSuggestions.length - 1 ? prev + 1 : 0,
        )
      }
      return
    }

    if (e.key === 'ArrowUp') {
      if (matchingSuggestions.length > 0) {
        e.preventDefault()
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : matchingSuggestions.length - 1,
        )
      }
      return
    }

    if (e.key === 'Escape') {
      setIsFocused(false)
      setHighlightedIndex(-1)
      return
    }

    if (e.key === 'Enter') {
      e.preventDefault()
      if (
        highlightedIndex >= 0 &&
        highlightedIndex < matchingSuggestions.length
      ) {
        const chosen = matchingSuggestions[highlightedIndex]
        if (chosen.onSelect) {
          chosen.onSelect()
        } else {
          onChange(isMarathi ? transliterateText(chosen.primaryText) : chosen.primaryText)
        }
        setIsFocused(false)
        return
      }
      if (onEnter) {
        onEnter()
      }
      setIsFocused(false)
    }
  }

  const ghostSuffix =
    predictedCompletion &&
    predictedCompletion.toLowerCase().startsWith(value.toLowerCase())
      ? predictedCompletion.slice(value.length)
      : ''

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative flex items-center w-full">
        <LuSearch className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-[#7A6258]" />

        {/* Ghost completion layer aligned behind the transparent input text */}
        {isFocused && value && ghostSuffix && (
          <div
            aria-hidden="true"
            className={`pointer-events-none absolute inset-0 flex items-center overflow-hidden whitespace-pre pl-8 pr-20 text-xs font-medium ${inputClassName}`}
            style={{ borderColor: 'transparent', background: 'transparent' }}
          >
            <span className="invisible">{value}</span>
            <span className="text-[#8C7368] opacity-80">{ghostSuffix}</span>
          </div>
        )}

        <input
          ref={inputRef}
          type="text"
          autoFocus={autoFocus}
          value={value}
          onFocus={() => setIsFocused(true)}
          onChange={(e) => {
            const rawVal = e.target.value
            const nextVal = isMarathi ? liveMarathiPhoneticInput(rawVal, true) : rawVal
            onChange(nextVal)
            setIsFocused(true)
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={`w-full rounded-md border border-[#ECB390] bg-[#FCF8E8] pl-8 pr-20 py-1.5 text-xs font-semibold text-[#3D251E] placeholder-[#8C7368] focus:border-[#DF7861] focus:bg-[#FCF8E8] focus:outline-none ${inputClassName}`}
        />

        {/* Right controls: Tab autocomplete chip or Clear button */}
        <div className="absolute right-2 flex items-center gap-1">
          {isFocused && ghostSuffix && (
            <button
              type="button"
              tabIndex={-1}
              onClick={() => onChange(predictedCompletion)}
              className="rounded border border-[#ECB390] bg-[#ECDFC8] px-1.5 py-0.5 text-[10px] font-bold text-[#3D251E] hover:bg-[#ECB390]"
              title="Press Tab to complete word"
            >
              Tab ↵
            </button>
          )}
          {value && (
            <button
              type="button"
              tabIndex={-1}
              onClick={() => {
                onChange('')
                inputRef.current?.focus()
              }}
              className="flex h-5 w-5 items-center justify-center rounded text-[#5C4338] hover:bg-[#ECB390]/50 hover:text-[#3D251E]"
              title="Clear search"
            >
              <LuX className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Live Predictive Dropdown List (No Enter key required) */}
      {isFocused && value.trim().length > 0 && matchingSuggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-40 mt-1 max-h-48 overflow-y-auto rounded-md border border-[#ECB390] bg-[#FCF8E8] shadow-lg">
          {matchingSuggestions.map((item, idx) => {
            const isHighlighted = idx === highlightedIndex
            const displayPrimary = isMarathi
              ? transliterateText(item.primaryText)
              : item.primaryText
            return (
              <button
                key={item.id}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault()
                  if (item.onSelect) {
                    item.onSelect()
                  } else {
                    onChange(displayPrimary)
                  }
                  setIsFocused(false)
                }}
                onMouseEnter={() => setHighlightedIndex(idx)}
                className={`flex w-full items-center justify-between gap-2 border-b border-[#ECDFC8] px-3 py-1.5 text-left text-xs transition last:border-b-0 ${
                  isHighlighted
                    ? 'bg-[#ECB390]/60 text-[#3D251E]'
                    : 'bg-[#FCF8E8] text-[#3D251E] hover:bg-[#ECDFC8]'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate font-bold text-[#3D251E]">
                    {displayPrimary}
                  </div>
                  {item.secondaryText && (
                    <div className="truncate text-[10px] font-medium text-[#5C4338]">
                      {item.secondaryText}
                    </div>
                  )}
                </div>
                {item.badgeText && (
                  <span className="shrink-0 rounded border border-[#ECB390] bg-[#ECDFC8] px-1.5 py-0.5 text-[10px] font-bold text-[#3D251E] tabular-nums">
                    {item.badgeText}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
