// Direct transliteration mappings for frequent grocery items & words (EN -> MR)
export const FREQUENT_MARATHI_TERMS: Record<string, string> = {
  tata: 'टाटा',
  mith: 'मीठ',
  meet: 'मीठ',
  salt: 'मीठ',
  tel: 'तेल',
  oil: 'तेल',
  tandul: 'तांदूळ',
  taandul: 'तांदूळ',
  rice: 'तांदूळ',
  kapus: 'कापूस',
  kaapus: 'कापूस',
  cotton: 'कापूस',
  soyabin: 'सोयाबीन',
  soyabean: 'सोयाबीन',
  soybean: 'सोयाबीन',
  parashut: 'पराशुट',
  parachute: 'पराशुट',
  parle: 'परले',
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
  dudh: 'दूध',
  milk: 'दूध',
  tup: 'तूप',
  ghee: 'तूप',
  saban: 'साबण',
  soap: 'साबण',
  sahil: 'साहिल',
  bhalekar: 'भालेकर',
  om: 'ओम',
  rahul: 'राहुल',
  rohit: 'रोहित',
  amit: 'अमित',
  sachin: 'सचिन',
  ganesh: 'गणेश',
  suresh: 'सुरेश',
  ramesh: 'रमेश',
  mahesh: 'महेश',
  prashant: 'प्रशांत',
  patil: 'पाटील',
  shinde: 'शिंदे',
  jadhav: 'जाधव',
  pawar: 'पवार',
  deshmukh: 'देशमुख',
  kulkarni: 'कुलकर्णी',
  joshi: 'जोशी',
  more: 'मोरे',
  chavan: 'चव्हाण',
  kadam: 'कदम',
  gaikwad: 'गायकवाड',
  sawant: 'सावंत',
  jash: 'जश',
  akash: 'आकाश',
  vikas: 'विकास',
  sandip: 'संदीप',
  sandeep: 'संदीप',
  deepak: 'दीपक',
  dipak: 'दीपक',
  sunil: 'सुनील',
  anil: 'अनील',
   किरण: 'किरण',
  kiran: 'किरण',
  pooja: 'पूजा',
  puja: 'पूजा',
  arati: 'आरती',
  arti: 'आरती',
  priya: 'प्रिया',
  neha: 'नेहा',
  sneha: 'स्नेहा',
}

// Strict Marathi -> English phrase & word dictionary for 100% English mode
const MARATHI_PHRASE_TO_ENGLISH: Record<string, string> = {
  'तांदूळ १ किलो': 'Rice 1 kg',
  'तांदूळ 1 किलो': 'Rice 1 kg',
  'कापूस तेल': 'Cottonseed Oil',
  'टाटा मीठ १ किलो': 'Tata Salt 1 kg',
  'टाटा मीठ 1 किलो': 'Tata Salt 1 kg',
  'कांदा': 'Onion',
  'सोयाबीन तेल १ लिटर': 'Soybean Oil 1 Ltr',
  'सोयाबीन तेल 1 लिटर': 'Soybean Oil 1 Ltr',
  'पराशुट तेल': 'Parachute Coconut Oil',
  'परले G': 'Parle-G Biscuit',
  'परले g': 'Parle-G Biscuit',
  'श्री वैभव स्टोअर': 'Shree Vaibhav Store',
  'शॉप पॉइंट': 'Shop Point',
  'वैभव पाटील': 'Vaibhav Patil',
  'दुकान क्र. १२, मार्केट यार्ड, नवी पेठ': 'Shop No. 12, Market Yard, Navi Peth',
  'सोलापूर, महाराष्ट्र': 'Solapur, Maharashtra',
  'सोलापूर': 'Solapur',
  'महाराष्ट्र': 'Maharashtra',
  'भारत': 'India',
  '|| श्री गणेशाय नमः ||': '|| Shree Ganeshay Namah ||',
  'धन्यवाद! पुन्हा भेट द्या.': 'Thank You! Please Visit Again.',
  'किराणा आणि जनरल स्टोअर्स': 'Kirana & General Stores',
  'पुरवठादार दर बदलला': 'Supplier rate revised',
}

const MARATHI_WORD_TO_ENGLISH: Record<string, string> = {
  'तांदूळ': 'Rice',
  'कापूस': 'Cottonseed',
  'तेल': 'Oil',
  'टाटा': 'Tata',
  'मीठ': 'Salt',
  'कांदा': 'Onion',
  'सोयाबीन': 'Soybean',
  'पराशुट': 'Parachute',
  'परले': 'Parle',
  'साखर': 'Sugar',
  'गहू': 'Wheat',
  'ज्वारी': 'Jowar',
  'बाजरी': 'Bajra',
  'डाळ': 'Dal',
  'डाळी': 'Pulses',
  'तूर': 'Toor',
  'मूग': 'Moong',
  'हरभरा': 'Chana',
  'उडीद': 'Urad',
  'मसूर': 'Masoor',
  'चहा': 'Tea',
  'कॉफी': 'Coffee',
  'हळद': 'Turmeric',
  'मिरची': 'Chilli',
  'जिरे': 'Cumin',
  'जीरा': 'Cumin',
  'मोहरी': 'Mustard',
  'धने': 'Coriander',
  'लसूण': 'Garlic',
  'आले': 'Ginger',
  'बटाटा': 'Potato',
  'भाजी': 'Vegetables',
  'भाज्या': 'Vegetables',
  'फळे': 'Fruits',
  'धान्य': 'Grains',
  'मसाला': 'Spices',
  'बिस्किटे': 'Biscuits',
  'बिस्कीट': 'Biscuit',
  'स्नॅक्स': 'Snacks',
  'पेये': 'Beverages',
  'दुग्धजन्य': 'Dairy',
  'पदार्थ': 'Products',
  'दूध': 'Milk',
  'दही': 'Curd',
  'तूप': 'Ghee',
  'लोणी': 'Butter',
  'पनीर': 'Paneer',
  'साबण': 'Soap',
  'डिटर्जंट': 'Detergent',
  'निर्मा': 'Nirma',
  'सर्फ': 'Surf',
  'घरगुती': 'Household',
  'वस्तू': 'Items',
  'वैयक्तिक': 'Personal',
  'वापर': 'Care',
  'इतर': 'Other',
  'साबुदाणा': 'Sabudana',
  'पोहे': 'Poha',
  'रवा': 'Suji / Rava',
  'मैदा': 'Maida',
  'आटा': 'Atta',
  'पीठ': 'Flour',
  'बेसन': 'Besan',
  'शेंगदाणा': 'Groundnut',
  'शेंगदाणे': 'Groundnuts',
  'खोबरे': 'Dry Coconut',
  'खोबरेल': 'Coconut',
  'गूळ': 'Jaggery',
  'पाणी': 'Water',
  'किलो': 'kg',
  'ग्रॅम': 'g',
  'लिटर': 'Ltr',
  'मिली': 'ml',
  'नग': 'pcs',
  'डझन': 'doz',
  'पॅकेट': 'pkt',
  'बॉक्स': 'box',
  'बाटली': 'btl',
  'कस्टम': 'Custom',
  'श्री': 'Shree',
  'वैभव': 'Vaibhav',
  'स्टोअर': 'Store',
  'स्टोअर्स': 'Stores',
  'किराणा': 'Kirana',
  'जनरल': 'General',
  'सुपरमार्केट': 'Supermarket',
  'मार्ट': 'Mart',
  'उत्पादन': 'Product',
}

const ENGLISH_TO_MARATHI_PHRASE: Record<string, string> = {
  'daily items': 'दैनंदिन वस्तू',
  'grains': 'धान्य',
  'pulses': 'डाळी',
  'oil': 'तेल',
  'edible oil': 'तेल',
  'spices': 'मसाला',
  'sugar': 'साखर',
  'salt': 'मीठ',
  'tea / coffee': 'चहा / कॉफी',
  'biscuits': 'बिस्किटे',
  'snacks': 'स्नॅक्स',
  'beverages': 'पेये',
  'dairy products': 'दुग्धजन्य पदार्थ',
  'vegetables': 'भाज्या',
  'fruits': 'फळे',
  'soap': 'साबण',
  'detergent': 'डिटर्जंट',
  'household items': 'घरगुती वस्तू',
  'personal care': 'वैयक्तिक वापर',
  'other': 'इतर',
  'kg': 'किलो',
  'g': 'ग्रॅम',
  'gm': 'ग्रॅम',
  'ltr': 'लिटर',
  'ml': 'मिली',
  'pcs': 'नग',
  'doz': 'डझन',
  'pkt': 'पॅकेट',
  'box': 'बॉक्स',
  'btl': 'बाटली',
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

const LATIN_DIGIT_TO_DEVA: Record<string, string> = {
  '0': '०', '1': '१', '2': '२', '3': '३', '4': '४',
  '5': '५', '6': '६', '7': '७', '8': '८', '9': '९',
}

const DEVA_DIGIT_TO_LATIN: Record<string, string> = {
  '०': '0', '१': '1', '२': '2', '३': '3', '४': '4',
  '५': '5', '६': '6', '७': '7', '८': '8', '९': '9',
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

export function devanagariToEnglishApprox(text: string | null | undefined): string {
  if (!text) return ''
  return `${toStrictEnglish(text)} ${devanagariToPhonetic(text)}`.trim()
}

export function toLatinDigits(text: string): string {
  return text.replace(/[०-९]/g, (d) => DEVA_DIGIT_TO_LATIN[d] ?? d)
}

export function toDevanagariDigits(text: string): string {
  return text.replace(/[0-9]/g, (d) => LATIN_DIGIT_TO_DEVA[d] ?? d)
}

function capitalizeWord(w: string): string {
  if (!w) return w
  if (/^(kg|g|ml|pcs|doz|pkt|box|btl|Ltr)$/i.test(w)) return w
  return w.charAt(0).toUpperCase() + w.slice(1)
}

/**
 * Converts any Marathi/mixed string strictly into English when in English mode,
 * or strictly into Marathi when in Marathi mode.
 */
export function toStrictEnglish(text: string | null | undefined): string {
  if (!text) return ''
  const trimmed = text.trim()
  if (!trimmed) return ''

  // Direct phrase match
  if (MARATHI_PHRASE_TO_ENGLISH[trimmed]) {
    return MARATHI_PHRASE_TO_ENGLISH[trimmed]
  }

  // If no Devanagari characters exist at all, return as-is
  if (!/[\u0900-\u097F]/.test(trimmed)) {
    return trimmed
  }

  // Convert Devanagari digits first
  const digitNormalized = toLatinDigits(trimmed)
  if (MARATHI_PHRASE_TO_ENGLISH[digitNormalized]) {
    return MARATHI_PHRASE_TO_ENGLISH[digitNormalized]
  }

  // Word-by-word translation/transliteration
  return digitNormalized
    .split(/(\s+|[/•·,()-]+)/)
    .map((token) => {
      if (!token || /^\s+$/.test(token) || /^[/•·,()-]+$/.test(token)) {
        return token
      }
      if (MARATHI_WORD_TO_ENGLISH[token]) {
        return MARATHI_WORD_TO_ENGLISH[token]
      }
      if (/[\u0900-\u097F]/.test(token)) {
        const phonetic = devanagariToPhonetic(token)
        return capitalizeWord(phonetic)
      }
      return token
    })
    .join('')
}

export function toStrictMarathi(text: string | null | undefined): string {
  if (!text) return ''
  const trimmed = text.trim()
  if (!trimmed) return ''

  const lower = trimmed.toLowerCase()
  if (ENGLISH_TO_MARATHI_PHRASE[lower]) {
    return ENGLISH_TO_MARATHI_PHRASE[lower]
  }

  // Replace standalone English unit tokens inside unit_display (e.g., "1 किलो" -> "१ किलो")
  return trimmed
    .split(/(\s+)/)
    .map((part) => {
      const pLower = part.toLowerCase()
      if (ENGLISH_TO_MARATHI_PHRASE[pLower]) {
        return ENGLISH_TO_MARATHI_PHRASE[pLower]
      }
      return part
    })
    .join('')
}

export function localizeDynamicText(text: string | null | undefined, isMarathi: boolean): string {
  if (!text) return ''
  return isMarathi ? toStrictMarathi(text) : toStrictEnglish(text)
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

const DEVA_CONSONANT_SET = new Set([
  'क', 'ख', 'ग', 'घ', 'ङ',
  'च', 'छ', 'ज', 'झ', 'ञ',
  'ट', 'ठ', 'ड', 'ढ', 'ण',
  'त', 'थ', 'द', 'ध', 'न',
  'प', 'फ', 'ब', 'भ', 'म',
  'य', 'र', 'ल', 'व', 'श', 'ष', 'स', 'ह', 'ळ',
])

const ASPIRATED_UPGRADE_MAP: Record<string, string> = {
  'क': 'ख',
  'ग': 'घ',
  'च': 'छ',
  'ज': 'झ',
  'ट': 'ठ',
  'ड': 'ढ',
  'त': 'थ',
  'द': 'ध',
  'प': 'फ',
  'ब': 'भ',
  'स': 'श',
}

const SINGLE_LATIN_TO_DEVA: Record<string, string> = {
  a: 'अ',
  b: 'ब',
  c: 'च',
  d: 'द',
  e: 'ए',
  f: 'फ',
  g: 'ग',
  h: 'ह',
  i: 'इ',
  j: 'ज',
  k: 'क',
  l: 'ल',
  m: 'म',
  n: 'न',
  o: 'ओ',
  p: 'प',
  q: 'क',
  r: 'र',
  s: 'स',
  t: 'त',
  u: 'उ',
  v: 'व',
  w: 'व',
  x: 'क्ष',
  y: 'य',
  z: 'झ',
}

const VOWEL_TO_MATRA_LIVE: Record<string, string> = {
  a: 'ा',
  i: 'ि',
  e: 'े',
  u: 'ु',
  o: 'ो',
}

/**
 * Live incremental phonetic converter for Marathi mode:
 * When the user types English letters while Marathi toggle is selected
 * (e.g. s -> स, a -> सा, h -> साह, i -> साहि, l -> साहिल),
 * it converts them to Devanagari in real time.
 */
export function liveMarathiPhoneticInput(raw: string, isMarathi: boolean): string {
  if (!isMarathi || !raw) return raw

  // Do not transliterate invoice codes or employee IDs (e.g. INV-0001, EMP-001)
  if (/^(inv|emp|adm)[-\d]/i.test(raw.trim())) {
    return raw
  }

  // If the user pasted a multi-character Latin word, transliterate it directly
  if (/^[a-zA-Z\s]{2,}$/.test(raw)) {
    return transliterateText(raw)
  }

  let out = ''
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i]
    const lower = ch.toLowerCase()

    if (/[a-z]/.test(lower)) {
      const prevChar = out.length > 0 ? out[out.length - 1] : ''

      // 1. Consonant + 'h' -> Aspirated consonant (e.g. स+h -> श, क+h -> ख, प+h -> फ, भ, थ, ध...)
      if (lower === 'h' && ASPIRATED_UPGRADE_MAP[prevChar]) {
        out = out.slice(0, -1) + ASPIRATED_UPGRADE_MAP[prevChar]
        continue
      }

      // 2. Consonant + vowel ('a', 'i', 'e', 'u', 'o') -> Matra on consonant (e.g. स+a -> सा, ह+i -> हि)
      if (VOWEL_TO_MATRA_LIVE[lower] && DEVA_CONSONANT_SET.has(prevChar)) {
        out += VOWEL_TO_MATRA_LIVE[lower]
        continue
      }

      // 3. Matra lengthening (e.g. ि+i -> ी, ु+u -> ू, ा+i -> ै, ा+u -> ौ)
      if (lower === 'i' && prevChar === 'ि') {
        out = out.slice(0, -1) + 'ी'
        continue
      }
      if (lower === 'e' && prevChar === 'े') {
        out = out.slice(0, -1) + 'ी'
        continue
      }
      if (lower === 'u' && prevChar === 'ु') {
        out = out.slice(0, -1) + 'ू'
        continue
      }
      if (lower === 'o' && prevChar === 'ो') {
        out = out.slice(0, -1) + 'ू'
        continue
      }
      if (lower === 'i' && prevChar === 'ा') {
        out = out.slice(0, -1) + 'ै'
        continue
      }
      if (lower === 'u' && prevChar === 'ा') {
        out = out.slice(0, -1) + 'ौ'
        continue
      }
      if (lower === 'a' && prevChar === 'अ') {
        out = out.slice(0, -1) + 'आ'
        continue
      }
      if (lower === 'a' && prevChar === 'ा') {
        // Double 'aa' after consonant keeps 'ा'
        continue
      }

      // 4. Default single letter mapping to Devanagari
      out += SINGLE_LATIN_TO_DEVA[lower] ?? ch
    } else {
      out += ch
    }
  }

  return out
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

  // 3. Direct English translated name match (e.g. 'rice', 'cottonseed', 'soybean', 'salt')
  const nameEn = toStrictEnglish(nameMr).toLowerCase()
  const catEn = toStrictEnglish(catMr).toLowerCase()
  if (nameEn.includes(qLower) || catEn.includes(qLower)) {
    return true
  }

  // 4. Transliterated query match (e.g. 'tata' -> 'टाटा')
  const transliterated = transliterateText(query)
  if (transliterated && (nameMr.includes(transliterated) || catMr.includes(transliterated))) {
    return true
  }

  // 5. Romanized product match (e.g. 'टाटा मीठ' -> 'tata mith')
  const namePhonetic = devanagariToPhonetic(nameMr)
  const catPhonetic = devanagariToPhonetic(catMr)
  if (namePhonetic.includes(qLower) || catPhonetic.includes(qLower)) {
    return true
  }

  return false
}
