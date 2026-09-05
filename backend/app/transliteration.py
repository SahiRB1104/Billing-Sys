from __future__ import annotations

import re

# Direct mappings for frequent Marathi grocery items & terms
FREQUENT_TERMS: dict[str, str] = {
    'tata': 'टाटा',
    'mith': 'मीठ',
    'meet': 'मीठ',
    'tel': 'तेल',
    'tandul': 'तांदूळ',
    'taandul': 'तांदूळ',
    'kapus': 'कापूस',
    'kaapus': 'कापूस',
    'kanda': 'कांदा',
    'dal': 'डाळ',
    'daal': 'डाळ',
    'dall': 'डाळ',
    'sakhar': 'साखर',
    'chaha': 'चहा',
    'chai': 'चाय',
    'gahu': 'गहू',
    'gehu': 'गहू',
    'jira': 'जिरे',
    'jeera': 'जीरा',
    'halad': 'हळद',
    'haldi': 'हळद',
    'biscuit': 'बिस्कीट',
    'biskit': 'बिस्कीट',
    'batata': 'बटाटा',
    'dhanya': 'धान्य',
    'masala': 'मसाला',
    'kilo': 'किलो',
    'liter': 'लिटर',
    'godsep': 'गोडसेप',
    'shree': 'श्री',
    'vaibhav': 'वैभव',
    'store': 'स्टोअर',
}

DEVA_TO_ROMAN_MAP: dict[str, str] = {
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

CONSONANT_RULES: list[tuple[str, str]] = [
    ('ksha', 'क्षा'), ('ksh', 'क्ष'), ('dnya', 'ज्ञा'), ('dny', 'ज्ञ'), ('gya', 'ज्ञा'), ('gy', 'ज्ञ'),
    ('shra', 'श्रा'), ('shr', 'श्र'), ('chh', 'छ'), ('kh', 'ख'), ('gh', 'घ'), ('ch', 'च'),
    ('jh', 'झ'), ('th', 'थ'), ('dh', 'ध'), ('ph', 'फ'), ('bh', 'भ'), ('sh', 'श'),
    ('shh', 'ष'), ('ny', 'ञ'), ('ng', 'ङ'), ('ld', 'ळ'),
    ('k', 'क'), ('g', 'ग'), ('j', 'ज'), ('t', 'ट'), ('d', 'ड'), ('n', 'न'),
    ('p', 'प'), ('f', 'फ'), ('b', 'ब'), ('m', 'म'), ('y', 'य'), ('r', 'र'),
    ('l', 'ल'), ('v', 'व'), ('w', 'व'), ('s', 'स'), ('h', 'ह'), ('z', 'झ'),
]

MATRA_RULES: list[tuple[str, str]] = [
    ('aa', 'ा'), ('a', 'ा'), ('ee', 'ी'), ('ii', 'ी'), ('i', 'ि'),
    ('oo', 'ू'), ('uu', 'ू'), ('u', 'ु'), ('ai', 'ै'), ('au', 'ौ'),
    ('ou', 'ौ'), ('e', 'े'), ('o', 'ो'),
]

INDEP_VOWEL_RULES: list[tuple[str, str]] = [
    ('aa', 'आ'), ('a', 'अ'), ('ee', 'ई'), ('ii', 'ई'), ('i', 'इ'),
    ('oo', 'ऊ'), ('uu', 'ऊ'), ('u', 'उ'), ('ai', 'ऐ'), ('au', 'औ'),
    ('ou', 'औ'), ('e', 'ए'), ('o', 'ओ'),
]


def devanagari_to_roman(text: str | None) -> str:
    if not text:
        return ''
    out: list[str] = []
    for char in text:
        out.append(DEVA_TO_ROMAN_MAP.get(char, char.lower()))
    return ''.join(out)


def transliterate_word(word: str) -> str:
    w = word.lower().strip()
    if not w:
        return ''
    if w in FREQUENT_TERMS:
        return FREQUENT_TERMS[w]

    i = 0
    out: list[str] = []
    n = len(w)

    while i < n:
        if i == 0 or (out and out[-1] == ' '):
            matched_vowel = False
            for v, dev in INDEP_VOWEL_RULES:
                if w.startswith(v, i):
                    out.append(dev)
                    i += len(v)
                    matched_vowel = True
                    break
            if matched_vowel:
                continue

        matched_consonant = False
        for c, dev in CONSONANT_RULES:
            if w.startswith(c, i):
                i += len(c)
                matched_matra = False
                for v, matra in MATRA_RULES:
                    if w.startswith(v, i):
                        out.append(dev + ('' if v == 'a' and c != 't' else matra))
                        i += len(v)
                        matched_matra = True
                        break
                if not matched_matra:
                    out.append(dev)
                matched_consonant = True
                break
        if matched_consonant:
            continue

        matched_v = False
        for v, dev in INDEP_VOWEL_RULES:
            if w.startswith(v, i):
                out.append(dev)
                i += len(v)
                matched_v = True
                break
        if matched_v:
            continue

        out.append(w[i])
        i += 1

    return ''.join(out)


def transliterate_text(text: str) -> str:
    if not text:
        return ''
    parts = re.split(r'(\s+)', text)
    result: list[str] = []
    for part in parts:
        if re.match(r'^\s+$', part):
            result.append(part)
        else:
            result.append(transliterate_word(part))
    return ''.join(result)

