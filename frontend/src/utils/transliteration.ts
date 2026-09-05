// Direct transliteration mappings for frequent grocery items & words
export const FREQUENT_MARATHI_TERMS: Record<string, string> = {
  tata: 'टाटा',
  mith: 'मीठ',
  meet: 'मीठ',
  tel: 'तेल',
  oil: 'तेल',
  tandul: 'तांदूळ',
  taandul: 'तांदूळ',
  rice: 'तांदूळ',
  kapus: 'कापूस',
  kaapus: 'कापूस',
  cotton: 'कापूस',
  kanda: 'कांदा',
  onion: 'कांदा',
  dal: 'डाळ',
  daal: 'डाळ',
  dall: 'डाळ',
  sakhar: 'साखर',
  sugar: 'साखर',
  chaha: 'चहा',
  chai: 'चहा',
  tea: 'चहा',
  gahu: 'गहू',
  gehu: 'गहू',
  wheat: 'गहू',
  jira: 'जिरे',
  jeera: 'जीरा',
  halad: 'हळद',
  haldi: 'हळद',
  turmeric: 'हळद',
  biscuit: 'बिस्कीट',
  biskit: 'बिस्कीट',
  batata: 'बटाटा',
  potato: 'बटाटा',
  dhanya: 'धान्य',
  grain: 'धान्य',
  masala: 'मसाला',
  spices: 'मसाला',
  kilo: 'किलो',
  kg: 'किलो',
  liter: 'लिटर',
  ltr: 'लिटर',
  gram: 'ग्रॅम',
  gm: 'ग्रॅम',
  godsep: 'गोडसेप',
  sabudana: 'साबुदाणा',
  pohe: 'पोहे',
  rava: 'रवा',
  maida: 'मैदा',
  atta: 'आटा',
  besan: 'बेसन',
  shree: 'श्री',
  vaibhav: 'वैभव',
  store: 'स्टोअर',
  bhaji: 'भाजी',
  mirchi: 'मिरची',
  lasun: 'लसूण',
  aale: 'आले',
}

const DEVA_TO_ROMAN_MAP: Record<string, string> = {
  'अ': 'a', 'आ': 'aa', 'इ': 'i', 'ई': 'ee', 'उ': 'u', 'ऊ': 'oo', 'ऋ': 'ru',
  'ए': 'e', 'ऐ': 'ai', 'ओ': 'o', 'औ': 'au', 'अं': 'am', 'अः': 'ah',
  'क': 'k', 'ख': 'kh', 'ग': 'g', 'घ': 'gh', 'ङ': 'ng',
  'च': 'ch', 'छ': 'chh', 'ज': 'j', 'झ': 'jh', 'ञ': 'ny',
  'ट': 't', 'ठ': 'th', 'ड': 'd', 'ढ': 'dh', 'ण': 'n',
  'त': 't', 'थ': 'th', 'द': 'd', 'ध': 'dh', 'न': 'n',
  'प': 'p', 'फ': 'ph', 'ब': 'b', 'भ': 'bh', 'म': 'm',
  'य': 'y', 'र': 'r', 'ल': 'l', 'व': 'v', 'श': 'sh', 'ष': 'sh', 'स': 's', 'ह': 'h', 'ळ': 'l',
  'क्ष': 'ksh', 'ज्ञ': 'dny',
  'ा': 'a', 'ि': 'i', 'ी': 'i', 'ु': 'u', 'ू': 'u', 'े': 'e', 'ै': 'ai', 'ो': 'o', 'ौ': 'au',
  '्': '', 'ं': 'n', 'ः': 'h', '़': '', 'ॅ': 'e', 'ॉ': 'o',
  '०': '0', '१': '1', '२': '2', '३': '3', '४': '4', '५': '5', '६': '6', '७': '7', '८': '8', '९': '9',
}

const CONSONANT_RULES: Array<[string, string]> = [
  ['ksha', 'क्षा'], ['ksh', 'क्ष'], ['dnya', 'ज्ञा'], ['dny', 'ज्ञ'], ['gya', 'ज्ञा'], ['gy', 'ज्ञ'],
  ['shra', 'श्रा'], ['shr', 'श्र'], ['chh', 'छ'], ['kh', 'ख'], ['gh', 'घ'], ['ch', 'च'],
  ['jh', 'झ'], ['th', 'थ'], ['dh', 'ध'], ['ph', 'फ'], ['bh', 'भ'], ['sh', 'श'],
  ['shh', 'ष'], ['ny', 'ञ'], ['ng', 'ङ'], ['ld', 'ळ'],
  ['k', 'क'], ['g', 'ग'], ['j', 'ज'], ['t', 'ट'], ['d', 'ड'], ['n', 'न'],
  ['p', 'प'], ['f', 'फ'], ['b', 'ब'], ['m', 'म'], ['y', 'य'], ['r', 'र'],
  ['l', 'ल'], ['v', 'व'], ['w', 'व'], ['s', 'स'], ['h', 'ह'], ['z', 'झ'],
]

const MATRA_RULES: Array<[string, string]> = [
  ['aa', 'ा'], ['a', 'ा'], ['ee', 'ी'], ['ii', 'ी'], ['i', 'ि'],
  ['oo', 'ू'], ['uu', 'ू'], ['u', 'ु'], ['ai', 'ै'], ['au', 'ौ'],
  ['ou', 'ौ'], ['e', 'े'], ['o', 'ो'],
]

const INDEP_VOWEL_RULES: Array<[string, string]> = [
  ['aa', 'आ'], ['a', 'अ'], ['ee', 'ई'], ['ii', 'ई'], ['i', 'इ'],
  ['oo', 'ऊ'], ['uu', 'ऊ'], ['u', 'उ'], ['ai', 'ऐ'], ['au', 'औ'],
  ['ou', 'औ'], ['e', 'ए'], ['o', 'ओ'],
]

export function devanagariToPhonetic(text: string | null | undefined): string {
  if (!text) return ''
  let out = ''
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    out += DEVA_TO_ROMAN_MAP[ch] !== undefined ? DEVA_TO_ROMAN_MAP[ch] : ch.toLowerCase()
  }
  return out
}

export function transliterateWord(word: string): string {
  const w = word.toLowerCase().trim()
  if (!w) return ''
  if (FREQUENT_MARATHI_TERMS[w]) {
    return FREQUENT_MARATHI_TERMS[w]
  }

  let i = 0
  let out = ''
  const n = w.length

  while (i < n) {
    if (i === 0 || out.endsWith(' ')) {
      let matchedVowel = false
      for (const [v, dev] of INDEP_VOWEL_RULES) {
        if (w.startsWith(v, i)) {
          out += dev
          i += v.length
          matchedVowel = true
          break
        }
      }
      if (matchedVowel) continue
    }

    let matchedConsonant = false
    for (const [c, dev] of CONSONANT_RULES) {
      if (w.startsWith(c, i)) {
        i += c.length
        let matchedMatra = false
        for (const [v, matra] of MATRA_RULES) {
          if (w.startsWith(v, i)) {
            out += dev + (v === 'a' && c !== 't' ? '' : matra)
            i += v.length
            matchedMatra = true
            break
          }
        }
        if (!matchedMatra) {
          out += dev
        }
        matchedConsonant = true
        break
      }
    }
    if (matchedConsonant) continue

    let matchedV = false
    for (const [v, dev] of INDEP_VOWEL_RULES) {
      if (w.startsWith(v, i)) {
        out += dev
        i += v.length
        matchedV = true
        break
      }
    }
    if (matchedV) continue

    out += w[i]
    i++
  }

  return out
}

export function transliterateText(text: string): string {
  if (!text) return ''
  return text
    .split(/(\s+)/)
    .map((part) => {
      if (/^\s+$/.test(part)) return part
      return transliterateWord(part)
    })
    .join('')
}

export type MatchableProduct = {
  id: number
  name_mr: string
  barcode: string | null
  sku: string | null
  category_mr?: string | null
}

export function searchMatchesProduct(product: MatchableProduct, rawQuery: string): boolean {
  const query = rawQuery.trim()
  if (!query) return true

  const qLower = query.toLowerCase()
  const barcode = (product.barcode ?? '').toLowerCase()
  const sku = (product.sku ?? '').toLowerCase()
  const nameMr = product.name_mr ?? ''
  const catMr = product.category_mr ?? ''

  // 1. Direct barcode / sku match
  if (barcode.includes(qLower) || sku.includes(qLower)) {
    return true
  }

  // 2. Direct Marathi query match
  if (nameMr.toLowerCase().includes(qLower) || catMr.toLowerCase().includes(qLower)) {
    return true
  }

  // 3. Transliterated query match (e.g. 'tata' -> 'टाटा')
  const transliterated = transliterateText(query)
  if (transliterated && (nameMr.includes(transliterated) || catMr.includes(transliterated))) {
    return true
  }

  // 4. Romanized product match (e.g. 'टाटा मीठ' -> 'tata mith')
  const namePhonetic = devanagariToPhonetic(nameMr)
  const catPhonetic = devanagariToPhonetic(catMr)
  if (namePhonetic.includes(qLower) || catPhonetic.includes(qLower)) {
    return true
  }

  return false
}

