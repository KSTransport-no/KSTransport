// Offline-aware API wrapper
import { saveOfflineRequest, getPendingCount } from './offlineStorage'
import { logger } from './logger'
import { toast } from '@/hooks/use-toast'

interface OfflineApiOptions {
  url: string
  method: string
  headers?: Record<string, string>
  body?: any
  type?: 'skift' | 'avvik' | 'oppdrag' | 'other'
  showToast?: boolean
}

// Determine request type from URL
function getRequestType(url: string): 'skift' | 'avvik' | 'oppdrag' | 'other' {
  if (url.includes('/skift') || url.includes('/tidregistrering')) {
    return 'skift'
  }
  if (url.includes('/avvik')) {
    return 'avvik'
  }
  if (url.includes('/oppdrag')) {
    return 'oppdrag'
  }
  return 'other'
}

// Make API request with offline support
export async function offlineFetch(options: OfflineApiOptions): Promise<Response> {
  const { url, method, headers = {}, body, type, showToast = true } = options

  // Only handle POST, PUT, DELETE for offline storage
  const shouldStoreOffline = ['POST', 'PUT', 'DELETE'].includes(method.toUpperCase())

  // Ensure Content-Type is set when body is present
  const requestHeaders: Record<string, string> = {
    ...headers
  }
  
  if (body) {
    requestHeaders['Content-Type'] = 'application/json'
  }

  try {
    const response = await fetch(url, {
      method,
      headers: requestHeaders,
      body: body ? JSON.stringify(body) : undefined
    })

    if (response.ok) {
      return response
    }

    // If response is not ok, but we're online, return the error
    if (navigator.onLine) {
      return response
    }

    // If offline and should store, save to IndexedDB
    if (shouldStoreOffline && !navigator.onLine) {
      const requestType = type || getRequestType(url)
      const token = typeof window !== 'undefined' 
        ? document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1] 
        : null

      const requestHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        ...headers
      }

      if (token) {
        requestHeaders['Authorization'] = `Bearer ${token}`
      }

      await saveOfflineRequest(url, method, requestHeaders, body, requestType)

      if (showToast) {
        toast({
          variant: 'default',
          title: 'Lagret offline',
          description: 'Din handling er lagret lokalt og vil sendes når tilkoblingen gjenopprettes.',
        })
      }

      // Return a mock success response
      return new Response(
        JSON.stringify({ 
          melding: 'Lagret offline - vil sendes når tilkoblingen gjenopprettes',
          offline: true 
        }),
        {
          status: 200,
          statusText: 'OK',
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    return response
  } catch (error) {
    // Network error - if offline and should store, save to IndexedDB
    if (shouldStoreOffline && !navigator.onLine) {
      const requestType = type || getRequestType(url)
      const token = typeof window !== 'undefined' 
        ? document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1] 
        : null

      const requestHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        ...headers
      }

      if (token) {
        requestHeaders['Authorization'] = `Bearer ${token}`
      }

      await saveOfflineRequest(url, method, requestHeaders, body, requestType)

      if (showToast) {
        toast({
          variant: 'default',
          title: 'Lagret offline',
          description: 'Din handling er lagret lokalt og vil sendes når tilkoblingen gjenopprettes.',
        })
      }

      // Return a mock success response
      return new Response(
        JSON.stringify({ 
          melding: 'Lagret offline - vil sendes når tilkoblingen gjenopprettes',
          offline: true 
        }),
        {
          status: 200,
          statusText: 'OK',
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    throw error
  }
}

