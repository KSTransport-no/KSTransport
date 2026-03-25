// IndexedDB utility for offline storage
const DB_NAME = 'kstransport-offline'
const DB_VERSION = 1
const STORE_NAME = 'pending-requests'

interface PendingRequest {
  id: string
  url: string
  method: string
  headers: Record<string, string>
  body: any
  timestamp: number
  retries: number
  type: 'skift' | 'avvik' | 'oppdrag' | 'other'
}

let db: IDBDatabase | null = null

// Initialize IndexedDB
export async function initOfflineStorage(): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => {
      reject(new Error('Failed to open IndexedDB'))
    }

    request.onsuccess = () => {
      db = request.result
      resolve()
    }

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result
      
      // Create object store if it doesn't exist
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const objectStore = database.createObjectStore(STORE_NAME, { keyPath: 'id' })
        objectStore.createIndex('timestamp', 'timestamp', { unique: false })
        objectStore.createIndex('type', 'type', { unique: false })
      }
    }
  })
}

// Save request to IndexedDB
export async function saveOfflineRequest(
  url: string,
  method: string,
  headers: Record<string, string>,
  body: any,
  type: PendingRequest['type'] = 'other'
): Promise<string> {
  if (!db) {
    await initOfflineStorage()
  }

  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('Database not initialized'))
      return
    }

    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const request: PendingRequest = {
      id,
      url,
      method,
      headers,
      body,
      timestamp: Date.now(),
      retries: 0,
      type
    }

    const transaction = db.transaction([STORE_NAME], 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    const addRequest = store.add(request)

    addRequest.onsuccess = () => {
      resolve(id)
    }

    addRequest.onerror = () => {
      reject(new Error('Failed to save offline request'))
    }
  })
}

// Get all pending requests
export async function getPendingRequests(): Promise<PendingRequest[]> {
  if (!db) {
    await initOfflineStorage()
  }

  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('Database not initialized'))
      return
    }

    const transaction = db.transaction([STORE_NAME], 'readonly')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.getAll()

    request.onsuccess = () => {
      resolve(request.result || [])
    }

    request.onerror = () => {
      reject(new Error('Failed to get pending requests'))
    }
  })
}

// Get pending requests by type
export async function getPendingRequestsByType(type: PendingRequest['type']): Promise<PendingRequest[]> {
  const allRequests = await getPendingRequests()
  return allRequests.filter(req => req.type === type)
}

// Remove request from IndexedDB
export async function removeOfflineRequest(id: string): Promise<void> {
  if (!db) {
    await initOfflineStorage()
  }

  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('Database not initialized'))
      return
    }

    const transaction = db.transaction([STORE_NAME], 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    const deleteRequest = store.delete(id)

    deleteRequest.onsuccess = () => {
      resolve()
    }

    deleteRequest.onerror = () => {
      reject(new Error('Failed to remove offline request'))
    }
  })
}

// Update retry count
export async function updateRetryCount(id: string, retries: number): Promise<void> {
  if (!db) {
    await initOfflineStorage()
  }

  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('Database not initialized'))
      return
    }

    const transaction = db.transaction([STORE_NAME], 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    const getRequest = store.get(id)

    getRequest.onsuccess = () => {
      const request = getRequest.result
      if (request) {
        request.retries = retries
        const updateRequest = store.put(request)
        updateRequest.onsuccess = () => resolve()
        updateRequest.onerror = () => reject(new Error('Failed to update retry count'))
      } else {
        resolve()
      }
    }

    getRequest.onerror = () => {
      reject(new Error('Failed to get request for update'))
    }
  })
}

// Clear all pending requests
export async function clearPendingRequests(): Promise<void> {
  if (!db) {
    await initOfflineStorage()
  }

  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('Database not initialized'))
      return
    }

    const transaction = db.transaction([STORE_NAME], 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    const clearRequest = store.clear()

    clearRequest.onsuccess = () => {
      resolve()
    }

    clearRequest.onerror = () => {
      reject(new Error('Failed to clear pending requests'))
    }
  })
}

// Get count of pending requests
export async function getPendingCount(): Promise<number> {
  const requests = await getPendingRequests()
  return requests.length
}

