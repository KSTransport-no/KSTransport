'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { updateServiceWorker, setupOfflineHandling, forceRefreshCache } from '@/lib/cacheUtils'
import { initOfflineStorage } from '@/lib/offlineStorage'
import { syncPendingRequests, registerBackgroundSync } from '@/lib/offlineSync'
import { logger } from '@/lib/logger'

interface PWAContextType {
  isOnline: boolean
  isInstalled: boolean
  canInstall: boolean
  installPrompt: any
  installApp: () => void
  showInstallPrompt: boolean
  dismissInstallPrompt: () => void
  forceRefresh: () => void
  hasUpdate: boolean
}

const PWAContext = createContext<PWAContextType | undefined>(undefined)

export function PWAProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState(true)
  const [isInstalled, setIsInstalled] = useState(false)
  const [canInstall, setCanInstall] = useState(false)
  const [installPrompt, setInstallPrompt] = useState<any>(null)
  const [showInstallPrompt, setShowInstallPrompt] = useState(false)

  const [hasUpdate, setHasUpdate] = useState(false)

  useEffect(() => {
    // Initialize IndexedDB for offline storage
    initOfflineStorage().catch((error) => {
      logger.error('Failed to initialize offline storage:', error)
    })

    // Registrer service worker med cache-busting
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          logger.log('Service Worker registrert:', registration)
          
          // Register background sync
          registerBackgroundSync().catch((error) => {
            logger.error('Failed to register background sync:', error)
          })

          // Listen for sync events from service worker
          navigator.serviceWorker.addEventListener('message', (event) => {
            if (event.data && event.data.type === 'SYNC_PENDING_REQUESTS') {
              syncPendingRequests().catch((error) => {
                logger.error('Failed to sync pending requests:', error)
              })
            }
          })
          
          // Sjekk for oppdateringer
          updateServiceWorker().then((updated) => {
            if (updated) {
              setHasUpdate(true)
            }
          })
        })
        .catch((error) => {
          logger.error('Service Worker registrering feilet:', error)
        })
    }

    // Sett opp offline handling
    setupOfflineHandling()
    
    // Sjekk online status
    const handleOnline = async () => {
      setIsOnline(true)
      // Sync pending requests when coming back online
      try {
        await syncPendingRequests()
        window.dispatchEvent(new Event('offline-sync-complete'))
      } catch (error) {
        logger.error('Failed to sync on reconnect:', error)
      }
    }
    const handleOffline = () => setIsOnline(false)
    
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    setIsOnline(navigator.onLine)

    // Sjekk om appen er installert
    const checkIfInstalled = () => {
      if (window.matchMedia('(display-mode: standalone)').matches) {
        setIsInstalled(true)
      }
    }
    
    checkIfInstalled()

    // Håndter install prompt
    const handleBeforeInstallPrompt = (e: any) => {
      // Ikke prevent default med en gang - la brukeren bestemme
      setInstallPrompt(e)
      setCanInstall(true)
      
      // Vis install prompt etter 5 sekunder hvis ikke allerede installert
      if (!isInstalled) {
        setTimeout(() => {
          setShowInstallPrompt(true)
        }, 5000)
      }
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    // Håndter app installert
    const handleAppInstalled = () => {
      setIsInstalled(true)
      setCanInstall(false)
      setShowInstallPrompt(false)
      setInstallPrompt(null)
    }

    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [isInstalled])

  const installApp = async () => {
    if (installPrompt) {
      // Prevent default først når vi faktisk skal vise prompt
      installPrompt.preventDefault()
      
      const result = await installPrompt.prompt()
      console.log('Install prompt result:', result)
      
      if (result.outcome === 'accepted') {
        console.log('App installert')
      } else {
        console.log('App installasjon avvist')
      }
      
      setInstallPrompt(null)
      setCanInstall(false)
      setShowInstallPrompt(false)
    }
  }

  const dismissInstallPrompt = () => {
    setShowInstallPrompt(false)
    // Ikke vis igjen i denne sessionen
    sessionStorage.setItem('pwa-install-dismissed', 'true')
  }

  const forceRefresh = () => {
    forceRefreshCache()
  }

  return (
    <PWAContext.Provider value={{
      isOnline,
      isInstalled,
      canInstall,
      installPrompt,
      installApp,
      showInstallPrompt,
      dismissInstallPrompt,
      forceRefresh,
      hasUpdate
    }}>
      {children}
    </PWAContext.Provider>
  )
}

export function usePWA() {
  const context = useContext(PWAContext)
  if (context === undefined) {
    throw new Error('usePWA må brukes innenfor en PWAProvider')
  }
  return context
}
