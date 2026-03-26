// Offline sync utility for syncing pending requests when online
import { getPendingRequests, removeOfflineRequest, updateRetryCount } from './offlineStorage'
import { logger } from './logger'
import axios from 'axios'

const MAX_RETRIES = 3
const RETRY_DELAY = 5000 // 5 seconds

// Sync a single request
async function syncRequest(request: any): Promise<boolean> {
  try {
    await axios({
      url: request.url,
      method: request.method,
      headers: request.headers,
      data: request.body,
    })

    await removeOfflineRequest(request.id)
    logger.log(`Successfully synced request: ${request.id}`)
    return true
  } catch (error: any) {
    const hasResponse = !!error.response
    const newRetries = request.retries + 1

    if (newRetries >= MAX_RETRIES) {
      await removeOfflineRequest(request.id)
      logger.error(`Max retries reached for request: ${request.id}`)
      return false
    }

    await updateRetryCount(request.id, newRetries)

    if (hasResponse) {
      logger.warn(`Request failed, retry ${newRetries}/${MAX_RETRIES}: ${request.id}`)
    } else {
      logger.warn(`Network error, retry ${newRetries}/${MAX_RETRIES}: ${request.id}`)
    }
    return false
  }
}

// Sync all pending requests
export async function syncPendingRequests(): Promise<{ success: number; failed: number }> {
  if (!navigator.onLine) {
    logger.log('Offline, skipping sync')
    return { success: 0, failed: 0 }
  }

  const requests = await getPendingRequests()
  
  if (requests.length === 0) {
    return { success: 0, failed: 0 }
  }

  logger.log(`Syncing ${requests.length} pending requests...`)

  let success = 0
  let failed = 0

  // Sync requests sequentially to avoid overwhelming the server
  for (const request of requests) {
    // Add delay between retries
    if (request.retries > 0) {
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY))
    }

    const result = await syncRequest(request)
    if (result) {
      success++
    } else {
      failed++
    }
  }

  logger.log(`Sync complete: ${success} succeeded, ${failed} failed`)
  return { success, failed }
}

// Register background sync
export async function registerBackgroundSync(): Promise<void> {
  if ('serviceWorker' in navigator && 'sync' in ServiceWorkerRegistration.prototype) {
    try {
      const registration = await navigator.serviceWorker.ready
      await registration.sync.register('sync-pending-requests')
      logger.log('Background sync registered')
    } catch (error) {
      logger.error('Failed to register background sync:', error)
    }
  }
}

