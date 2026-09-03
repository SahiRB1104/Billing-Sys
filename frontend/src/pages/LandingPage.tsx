import React from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'

export const LandingPage: React.FC = () => {
  const { t, i18n } = useTranslation()
  const { currentUser } = useAuth()

  const isMarathi = i18n.language === 'mr' || i18n.language.startsWith('mr')

  return (
    <div className="flex w-full flex-1 flex-col items-center justify-center gap-6 py-16">
      <div className="text-center">
        <h2 className="text-3xl font-black text-stone-900">
          {t('app.shopPoint')}
        </h2>
        <p className="mt-3 text-lg font-medium text-stone-600">
          {isMarathi ? 'स्वागत आहे' : 'Welcome'}
          {currentUser ? `, ${currentUser.username}` : ''}
        </p>
      </div>
    </div>
  )
}
