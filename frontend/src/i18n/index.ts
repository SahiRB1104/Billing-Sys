import i18next from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './en.json'
import mr from './mr.json'

const savedLanguage = typeof window !== 'undefined' ? localStorage.getItem('pos_language') || 'mr' : 'mr'

const applyLanguageClass = (lng: string) => {
  const root = document.documentElement
  root.setAttribute('lang', lng)
  root.classList.remove('lang-mr', 'lang-en')
  root.classList.add(lng === 'mr' ? 'lang-mr' : 'lang-en')
}

if (typeof window !== 'undefined') {
  applyLanguageClass(savedLanguage)
}

void i18next.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    mr: { translation: mr },
  },
  lng: savedLanguage,
  fallbackLng: 'mr',
  interpolation: {
    escapeValue: false,
  },
  onLanguageChanged: (lng) => {
    applyLanguageClass(lng)
    localStorage.setItem('pos_language', lng)
  },
})

export default i18next
