import { logger } from './logger'

// Cache busting utility
export const CACHE_VERSION = 'v6'
export const CACHE_TIMESTAMP = Date.now()

// Legg til cache-busting parameter til URL
export function addCacheBusting(url: string): string {
  const urlObj = new URL(url, window.location.origin)
  urlObj.searchParams.set('v', CACHE_TIMESTAMP.toString())
  return urlObj.toString()
}

// Sjekk om service worker er tilgjengelig og oppdater den
export async function updateServiceWorker(): Promise<boolean> {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.getRegistration()
      if (registration) {
        // Sjekk om det er en ny service worker tilgjengelig
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // Ny service worker er installert, be om reload
                if (confirm('En ny versjon av appen er tilgjengelig. Vil du oppdatere nå?')) {
                  window.location.reload()
                }
              }
            })
          }
        })
        
        // Sjekk for oppdateringer
        await registration.update()
        return true
      }
    } catch (error) {
      logger.error('Service worker update failed', error)
    }
  }
  return false
}

// Force refresh av cache
export async function forceRefreshCache(): Promise<void> {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.getRegistration()
      if (registration) {
        // Slett alle caches
        const cacheNames = await caches.keys()
        await Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        )
        
        // Oppdater service worker
        await registration.update()
        
        // Reload siden
        window.location.reload()
      }
    } catch (error) {
      logger.error('Force refresh failed', error)
    }
  }
}

// Sjekk om appen kjører offline
export function isOffline(): boolean {
  return !navigator.onLine
}

// Håndter offline/online events
export function setupOfflineHandling(): void {
  // Online/offline handling håndteres nå i PWAContext
  // Denne funksjonen er beholdt for backwards compatibility
}
