import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'
import React from 'react'
import { getErrorMessage } from './errorMessages'
import { toast } from '@/hooks/use-toast'
import { ToastAction, type ToastActionElement } from '@/components/ui/toast'
import { saveOfflineRequest } from './offlineStorage'
import { logger } from './logger'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor for å legge til token og oppdatere aktivitet
api.interceptors.request.use(
  (config) => {
    const token = typeof window !== 'undefined' ? document.cookie
      .split('; ')
      .find(row => row.startsWith('token='))
      ?.split('=')[1] : null
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
      // Oppdater aktivitetstidspunkt ved hver API-kall
      if (typeof window !== 'undefined') {
        localStorage.setItem('lastActivity', Date.now().toString())
      }
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Determine request type from URL for offline storage categorization
function getRequestType(url: string): 'skift' | 'avvik' | 'oppdrag' | 'other' {
  if (url.includes('/skift') || url.includes('/tidregistrering')) return 'skift'
  if (url.includes('/avvik')) return 'avvik'
  if (url.includes('/oppdrag')) return 'oppdrag'
  return 'other'
}

// Response interceptor for å håndtere feil
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as InternalAxiosRequestConfig | undefined

    // Offline queueing: if network error + offline + mutating request → save to IndexedDB
    const isMutating = config && ['post', 'put', 'delete'].includes((config.method || '').toLowerCase())
    const isOffline = typeof navigator !== 'undefined' && !navigator.onLine
    const isNetworkError = !error.response // no response = network failure

    if (isNetworkError && isOffline && isMutating && config) {
      try {
        const fullUrl = (config.baseURL || '') + (config.url || '')
        const requestType = getRequestType(config.url || '')
        const headers: Record<string, string> = { 'Content-Type': 'application/json' }
        if (config.headers?.Authorization) {
          headers['Authorization'] = String(config.headers.Authorization)
        }
        await saveOfflineRequest(fullUrl, config.method!.toUpperCase(), headers, config.data ? JSON.parse(config.data) : undefined, requestType)

        toast({
          variant: 'default',
          title: 'Lagret offline',
          description: 'Din handling er lagret lokalt og vil sendes når tilkoblingen gjenopprettes.',
        })

        // Return a resolved promise with a mock response so callers don't see an error
        return {
          data: { melding: 'Lagret offline - vil sendes når tilkoblingen gjenopprettes', offline: true },
          status: 200,
          statusText: 'OK (offline)',
          headers: {},
          config,
        }
      } catch (saveError) {
        logger.error('Failed to save request offline:', saveError)
      }
    }

    // Ikke vis toast for 401 hvis vi allerede er på login-siden
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : ''
    const isLoginPage = currentPath === '/login'
    
    if (error.response?.status === 401 && !isLoginPage) {
      // Token er ugyldig, redirect til login
      if (typeof window !== 'undefined') {
        document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Strict'
        const errorMsg = getErrorMessage(error)
        // Delay toast for å unngå at den vises etter redirect
        setTimeout(() => {
          toast({
            variant: errorMsg.variant || 'destructive',
            title: errorMsg.title,
            description: errorMsg.description,
            action: errorMsg.action ? React.createElement(
              ToastAction,
              {
                altText: errorMsg.action.label,
                onClick: errorMsg.action.onClick,
              },
              errorMsg.action.label
            ) as ToastActionElement : undefined,
          })
        }, 100)
        window.location.href = '/login'
      }
    } else if (!isLoginPage && error.response?.status !== 401) {
      // Vis toast for andre feil (unntatt på login-siden og 401 for å unngå duplikater)
      const errorMsg = getErrorMessage(error)
      toast({
        variant: errorMsg.variant || 'destructive',
        title: errorMsg.title,
        description: errorMsg.description,
        action: errorMsg.action ? React.createElement(
          ToastAction,
          {
            altText: errorMsg.action.label,
            onClick: errorMsg.action.onClick,
          },
          errorMsg.action.label
        ) as ToastActionElement : undefined,
      })
    }
    return Promise.reject(error)
  }
)

export default api
