'use client'

import { useEffect, useState } from 'react'
import { usePWA } from '@/contexts/PWAContext'
import { getPendingCount } from '@/lib/offlineStorage'
import { logger } from '@/lib/logger'
import { WifiOff, CloudOff, UploadCloud } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'

export function OfflineIndicator() {
  const { isOnline } = usePWA()
  const [pendingCount, setPendingCount] = useState(0)
  const [isSyncing, setIsSyncing] = useState(false)

  useEffect(() => {
    if (isOnline) {
      // Update pending count periodically when online
      const updateCount = async () => {
        try {
          const count = await getPendingCount()
          setPendingCount(count)
        } catch (error) {
          logger.error('Failed to get pending count', error)
        }
      }

      updateCount()
      const interval = setInterval(updateCount, 5000) // Update every 5 seconds

      return () => clearInterval(interval)
    } else {
      // Update pending count when offline
      getPendingCount().then(setPendingCount).catch((e) => logger.error('Failed to get pending count', e))
    }
  }, [isOnline])

  // Listen for sync events
  useEffect(() => {
    const handleSync = async () => {
      setIsSyncing(true)
      try {
        const count = await getPendingCount()
        setPendingCount(count)
      } catch (error) {
        logger.error('Failed to update pending count', error)
      } finally {
        setIsSyncing(false)
      }
    }

    window.addEventListener('offline-sync-complete', handleSync)
    return () => window.removeEventListener('offline-sync-complete', handleSync)
  }, [])

  if (!isOnline) {
    return (
      <Alert className="border-yellow-500 bg-yellow-50 mb-4">
        <WifiOff className="h-4 w-4 text-yellow-600" />
        <AlertDescription className="flex items-center justify-between">
          <span className="text-yellow-800">
            Du er offline. Data lagres lokalt og sendes når tilkoblingen gjenopprettes.
          </span>
        </AlertDescription>
      </Alert>
    )
  }

  if (pendingCount > 0) {
    return (
      <Alert className="border-blue-500 bg-blue-50 mb-4">
        <CloudOff className="h-4 w-4 text-blue-600" />
        <AlertDescription className="flex items-center justify-between flex-wrap gap-2">
          <span className="text-blue-800">
            {pendingCount} {pendingCount === 1 ? 'forespørsel' : 'forespørsler'} venter på synkronisering.
            {isSyncing && ' Synkroniserer...'}
          </span>
          {!isSyncing && (
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                const { syncPendingRequests } = await import('@/lib/offlineSync')
                setIsSyncing(true)
                try {
                  await syncPendingRequests()
                  const count = await getPendingCount()
                  setPendingCount(count)
                  window.dispatchEvent(new Event('offline-sync-complete'))
                } catch (error) {
                  logger.error('Sync failed', error)
                } finally {
                  setIsSyncing(false)
                }
              }}
            >
              <UploadCloud className="h-3 w-3 mr-1" />
              Synkroniser nå
            </Button>
          )}
        </AlertDescription>
      </Alert>
    )
  }

  return null
}

