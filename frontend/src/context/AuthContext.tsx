import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { CurrentUser } from '../types'

const API_URL = 'http://localhost:8000'

interface AuthContextType {
  token: string | null
  currentUser: CurrentUser | null
  loading: boolean
  login: (username: string, password: string) => Promise<CurrentUser | null>
  logout: () => void
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(null)
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const savedToken = localStorage.getItem('pos_token')
    if (savedToken) {
      setToken(savedToken)
    } else {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (token && !currentUser) {
      fetchProfile(token)
    }
  }, [token, currentUser])

  const fetchProfile = async (authToken: string) => {
    try {
      const res = await fetch(`${API_URL}/profile`, {
        headers: { Authorization: `Bearer ${authToken}` },
      })
      if (res.ok) {
        const profile = await res.json()
        setCurrentUser(profile)
        localStorage.setItem('pos_token', authToken)
      } else {
        localStorage.removeItem('pos_token')
        setToken(null)
      }
    } catch {
      localStorage.removeItem('pos_token')
      setToken(null)
    } finally {
      setLoading(false)
    }
  }

  const login = async (username: string, password: string): Promise<CurrentUser | null> => {
    try {
      const loginResponse = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })

      if (!loginResponse.ok) return null

      const loginData = await loginResponse.json()
      const nextToken = loginData.access_token
      setToken(nextToken)

       const profileResponse = await fetch(`${API_URL}/profile`, {
        headers: { Authorization: `Bearer ${nextToken}` },
      })
      if (profileResponse.ok) {
        const profile = await profileResponse.json()
        setCurrentUser(profile)
        localStorage.setItem('pos_token', nextToken)
        return profile
      }

      localStorage.removeItem('pos_token')
      setToken(null)
      return null
    } catch {
      return null
    }
  }

  const logout = () => {
    localStorage.removeItem('pos_token')
    setToken(null)
    setCurrentUser(null)
  }

  const value: AuthContextType = {
    token,
    currentUser,
    loading,
    login,
    logout,
    isAuthenticated: !!currentUser,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
