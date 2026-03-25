import axios from 'axios'
import React from 'react'
import { getErrorMessage } from './errorMessages'
import { toast } from '@/hooks/use-toast'

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

// Response interceptor for å håndtere feil
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Ikke vis toast for 401 hvis vi allerede er på login-siden
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : ''
    const isLoginPage = currentPath === '/login'
    
    if (error.response?.status === 401 && !isLoginPage) {
      // Token er ugyldig, redirect til login
      if (typeof window !== 'undefined') {
        document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
        const errorMsg = getErrorMessage(error)
        // Delay toast for å unngå at den vises etter redirect
        setTimeout(() => {
          toast({
            variant: errorMsg.variant || 'destructive',
            title: errorMsg.title,
            description: errorMsg.description,
            action: errorMsg.action ? React.createElement(
              'button',
              {
                onClick: errorMsg.action.onClick,
                className: 'text-sm font-medium underline'
              },
              errorMsg.action.label
            ) : undefined,
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
          'button',
          {
            onClick: errorMsg.action.onClick,
            className: 'text-sm font-medium underline'
          },
          errorMsg.action.label
        ) : undefined,
      })
    }
    return Promise.reject(error)
  }
)

export default api
