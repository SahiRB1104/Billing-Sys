export type IdentityDocType = 'Aadhar' | 'PAN' | 'Driving License' | 'Voter ID'

/**
 * Strips non-digits and clamps to max 10 digits for Indian mobile numbers.
 */
export function formatIndianMobile(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (digits.startsWith('91') && digits.length > 10) {
    return digits.slice(2, 12)
  }
  return digits.slice(0, 10)
}

/**
 * Validates that a phone number is a 10-digit Indian mobile number starting with 6, 7, 8, or 9.
 */
export function validateIndianMobile(phone: string): {
  valid: boolean
  error: string
  errorEn: string
  errorMr: string
} {
  const digits = phone.replace(/\D/g, '')
  if (digits.length !== 10) {
    return {
      valid: false,
      error: 'Mobile number must be exactly 10 digits.',
      errorEn: 'Mobile number must be exactly 10 digits.',
      errorMr: 'मोबाईल क्रमांक नेमका १० अंकी असावा.',
    }
  }
  if (!/^[6-9]\d{9}$/.test(digits)) {
    return {
      valid: false,
      error: 'Enter a valid Indian mobile number starting with 6, 7, 8, or 9.',
      errorEn: 'Enter a valid Indian mobile number starting with 6, 7, 8, or 9.',
      errorMr: '६, ७, ८ किंवा ९ ने सुरू होणारा वैध १० अंकी मोबाईल क्रमांक टाका.',
    }
  }
  return { valid: true, error: '', errorEn: '', errorMr: '' }
}

/**
 * Live-formats and length-clamps Indian government identity document numbers as the user types:
 * - Aadhar: 12 digits max, auto-mapped to XXXX-XXXX-XXXX
 * - PAN: 10 uppercase alphanumeric max (AAAAA9999A)
 * - Voter ID: 10 uppercase alphanumeric max (AAA9999999)
 * - Driving License: 15-16 chars max, formatted as SS-RR-YYYYNNNNNNN (e.g. MH-13-20180012345)
 */
export function formatIdentityDocumentNumber(docType: string, raw: string): string {
  const type = (docType || 'Aadhar').trim()

  if (type === 'Aadhar' || type === 'Aadhaar') {
    const digits = raw.replace(/\D/g, '').slice(0, 12)
    const parts: string[] = []
    if (digits.length > 0) parts.push(digits.slice(0, 4))
    if (digits.length > 4) parts.push(digits.slice(4, 8))
    if (digits.length > 8) parts.push(digits.slice(8, 12))
    return parts.join('-')
  }

  if (type === 'PAN') {
    // PAN structure: 5 letters + 4 digits + 1 letter (10 chars total)
    const clean = raw.toUpperCase().replace(/[^A-Z0-9]/g, '')
    let out = ''
    for (let i = 0; i < clean.length && out.length < 10; i++) {
      const ch = clean[i]
      const pos = out.length
      if (pos < 5 || pos === 9) {
        if (/[A-Z]/.test(ch)) out += ch
      } else {
        if (/[0-9]/.test(ch)) out += ch
      }
    }
    return out
  }

  if (type === 'Voter ID') {
    // EPIC Voter ID: 3 uppercase letters + 7 digits (10 chars total)
    const clean = raw.toUpperCase().replace(/[^A-Z0-9]/g, '')
    let out = ''
    for (let i = 0; i < clean.length && out.length < 10; i++) {
      const ch = clean[i]
      const pos = out.length
      if (pos < 3) {
        if (/[A-Z]/.test(ch)) out += ch
      } else {
        if (/[0-9]/.test(ch)) out += ch
      }
    }
    return out
  }

  if (type === 'Driving License') {
    // Indian DL: 2 state letters + 2 RTO digits + 4 year digits + 7 serial digits (15 raw chars -> 17 with hyphens)
    const clean = raw.toUpperCase().replace(/[^A-Z0-9]/g, '')
    let out = ''
    for (let i = 0; i < clean.length && out.length < 15; i++) {
      const ch = clean[i]
      const pos = out.length
      if (pos < 2) {
        if (/[A-Z]/.test(ch)) out += ch
      } else {
        if (/[0-9]/.test(ch)) out += ch
      }
    }
    if (out.length <= 2) return out
    if (out.length <= 4) return `${out.slice(0, 2)}-${out.slice(2)}`
    return `${out.slice(0, 2)}-${out.slice(2, 4)}-${out.slice(4, 15)}`
  }

  return raw.slice(0, 20)
}

/**
 * Validates the formatted Indian government identity document number.
 */
export function validateIdentityDocumentNumber(
  docType: string,
  value: string,
): {
  valid: boolean
  error: string
  errorEn: string
  errorMr: string
} {
  const type = (docType || 'Aadhar').trim()
  const trimmed = (value || '').trim().toUpperCase()

  if (type === 'Aadhar' || type === 'Aadhaar') {
    const isValid = /^\d{4}-\d{4}-\d{4}$/.test(trimmed)
    const msg = isValid ? '' : 'Aadhaar Card must be 12 digits (XXXX-XXXX-XXXX).'
    return {
      valid: isValid,
      error: msg,
      errorEn: msg,
      errorMr: isValid ? '' : 'आधार कार्ड क्रमांक १२ अंकी (XXXX-XXXX-XXXX) असावा.',
    }
  }

  if (type === 'PAN') {
    const isValid = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(trimmed)
    const msg = isValid ? '' : 'PAN must be 10 chars: ABCDE1234F.'
    return {
      valid: isValid,
      error: msg,
      errorEn: msg,
      errorMr: isValid ? '' : 'पॅन कार्ड १० अक्षरी असावे: ५ अक्षरे, ४ अंक आणि १ अक्षर (उदा. ABCDE1234F).',
    }
  }

  if (type === 'Voter ID') {
    const isValid = /^[A-Z]{3}[0-9]{7}$/.test(trimmed)
    const msg = isValid ? '' : 'Voter ID must be 10 chars: ABC1234567.'
    return {
      valid: isValid,
      error: msg,
      errorEn: msg,
      errorMr: isValid ? '' : 'मतदान ओळखपत्र १० अक्षरी असावे: ३ अक्षरे आणि ७ अंक (उदा. ABC1234567).',
    }
  }

  if (type === 'Driving License') {
    const clean = trimmed.replace(/[^A-Z0-9]/g, '')
    const isValid = /^[A-Z]{2}[0-9]{2}[0-9]{11}$/.test(clean)
    const msg = isValid ? '' : 'DL must be 15 chars: MH-13-20180012345.'
    return {
      valid: isValid,
      error: msg,
      errorEn: msg,
      errorMr: isValid
        ? ''
        : 'वाहन चालक परवाना १५ अक्षरी असावा (उदा. MH-13-20180012345).',
    }
  }

  return { valid: Boolean(trimmed), error: '', errorEn: '', errorMr: '' }
}

export function getIdentityPlaceholder(docType: string): string {
  switch (docType) {
    case 'Aadhar':
      return '1234-5678-9012'
    case 'PAN':
      return 'ABCDE1234F'
    case 'Voter ID':
      return 'ABC1234567'
    case 'Driving License':
      return 'MH-13-20180012345'
    default:
      return 'XXXX-XXXX-XXXX'
  }
}

export const getIdentityDocumentPlaceholder = getIdentityPlaceholder

export function getIdentityMaxLength(docType: string): number {
  switch (docType) {
    case 'Aadhar':
      return 14 // 12 digits + 2 hyphens
    case 'PAN':
      return 10
    case 'Voter ID':
      return 10
    case 'Driving License':
      return 17 // 15 chars + 2 hyphens
    default:
      return 20
  }
}
