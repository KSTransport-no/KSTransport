'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Cookies from 'js-cookie'
import * as Sentry from '@sentry/nextjs'
import { api } from '@/lib/api'
import { logger } from '@/lib/logger'

interface Sjåfør {
  id: number
  navn: string
  epost: string
  admin: boolean
}

interface AuthContextType {
  sjåfør: Sjåfør | null
  isLoading: boolean
  isHydrated: boolean
  login: (epost: string, passord: string) => Promise<void>
  logout: () => void
  updateSjåfør: (sjåfør: Sjåfør) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [sjåfør, setSjåfør] = useState<Sjåfør | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isHydrated, setIsHydrated] = useState(false)
  const router = useRouter()

  // Oppdater aktivitetstidspunkt
  const updateActivity = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('lastActivity', Date.now().toString())
    }
  }

  // Update Sentry user context
  const updateSentryUser = (sjåførData: Sjåfør | null) => {
    if (sjåførData) {
      Sentry.setUser({
        id: sjåførData.id.toString(),
        email: sjåførData.epost,
        username: sjåførData.navn,
        admin: sjåførData.admin,
      })
    } else {
      Sentry.setUser(null)
    }
  }

  const logout = () => {
    Cookies.remove('token')
    if (typeof window !== 'undefined') {
      localStorage.removeItem('lastActivity')
    }
    delete api.defaults.headers.common['Authorization']
    setSjåfør(null)
    updateSentryUser(null) // Clear Sentry user context
    router.push('/login')
  }

  // Sjekk idle timeout (2 dager)
  const checkIdleTimeout = () => {
    if (typeof window === 'undefined') return false
    
    const lastActivity = localStorage.getItem('lastActivity')
    if (!lastActivity) return false
    
    const lastActivityTime = parseInt(lastActivity, 10)
    const now = Date.now()
    const twoDaysInMs = 2 * 24 * 60 * 60 * 1000 // 2 dager i millisekunder
    
    // Hvis mer enn 2 dager siden sist aktivitet, logg ut
    if (now - lastActivityTime > twoDaysInMs) {
      logout()
      return true
    }
    
    return false
  }

  useEffect(() => {
    // Markerer at komponenten er hydrert (client-side)
    setIsHydrated(true)
    
    const token = Cookies.get('token')
    if (token) {
      // Sjekk idle timeout først
      if (checkIdleTimeout()) {
        setIsLoading(false)
        return
      }
      
      // Verifiser token og hent brukerinfo
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`
      fetchSjåførInfo()
      updateActivity() // Oppdater aktivitet ved oppstart
    } else {
      setIsLoading(false)
    }

    // Legg til event listeners for brukerinteraksjoner
    if (typeof window !== 'undefined') {
      const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click']
      const handleActivity = () => {
        updateActivity()
      }

      events.forEach(event => {
        window.addEventListener(event, handleActivity, { passive: true })
      })

      // Sjekk idle timeout periodisk (hver time)
      const idleCheckInterval = setInterval(() => {
        if (Cookies.get('token')) {
          checkIdleTimeout()
        }
      }, 60 * 60 * 1000) // Hver time

      return () => {
        events.forEach(event => {
          window.removeEventListener(event, handleActivity)
        })
        clearInterval(idleCheckInterval)
      }
    }
  }, [])

  const fetchSjåførInfo = async () => {
    try {
      const response = await api.get('/auth/me')
      const sjåførData = response.data.sjåfør
      setSjåfør(sjåførData)
      updateSentryUser(sjåførData) // Update Sentry user context
      updateActivity() // Oppdater aktivitet ved vellykket API-kall
    } catch (error) {
      logger.error('Feil ved henting av brukerinfo:', error)
      // Token er ugyldig, fjern det
      Cookies.remove('token')
      if (typeof window !== 'undefined') {
        localStorage.removeItem('lastActivity')
      }
      delete api.defaults.headers.common['Authorization']
    } finally {
      setIsLoading(false)
    }
  }

  const login = async (epost: string, passord: string) => {
    try {
      const response = await api.post('/auth/login', { epost, passord })
      const { token, sjåfør: sjåførData } = response.data
      
      // Lagre token i cookie
      Cookies.set('token', token, {
        expires: 2,
        secure: window.location.protocol === 'https:',
        sameSite: 'strict',
        path: '/',
      })
      
      // Lagre sist aktivitet
      if (typeof window !== 'undefined') {
        localStorage.setItem('lastActivity', Date.now().toString())
      }
      
      // Sett authorization header
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`
      
      setSjåfør(sjåførData)
      updateSentryUser(sjåførData) // Update Sentry user context
    } catch (error: any) {
      logger.error('Login feil:', error)
      
      let errorMessage = 'Påloggingsfeil'
      
      if (error.response?.data?.feil) {
        errorMessage = error.response.data.feil
      } else if (error.response?.status === 401) {
        errorMessage = 'Ugyldig e-post eller passord'
      } else if (error.response?.status === 400) {
        errorMessage = 'Ugyldig input'
      } else if (error.response?.status === 500) {
        errorMessage = 'Serverfeil'
      } else if (error.message) {
        errorMessage = error.message
      }
      
      throw new Error(errorMessage)
    }
  }

  const updateSjåfør = (sjåførData: Sjåfør) => {
    setSjåfør(sjåførData)
    updateSentryUser(sjåførData) // Update Sentry user context
  }

  return (
    <AuthContext.Provider value={{
      sjåfør,
      isLoading,
      isHydrated,
      login,
      logout,
      updateSjåfør
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth må brukes innenfor en AuthProvider')
  }
  return context
}
