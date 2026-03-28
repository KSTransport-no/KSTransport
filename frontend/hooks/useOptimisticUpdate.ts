'use client'

import { useState, useCallback } from 'react'
import { logger } from '@/lib/logger'

/**
 * Hook for optimistic updates
 * Oppdaterer UI umiddelbart, og reverserer hvis operasjonen feiler
 */
export function useOptimisticUpdate<T>(
  initialData: T[],
  updateFn: (item: T) => Promise<T>,
  onSuccess?: (item: T) => void,
  onError?: (error: Error, originalItem: T) => void
) {
  const [data, setData] = useState<T[]>(initialData)
  const [pendingUpdates, setPendingUpdates] = useState<Map<number | string, T>>(new Map())

  const addOptimistic = useCallback((item: T, tempId?: number | string) => {
    const id = tempId || (item as any).id
    setData(prev => [...prev, item])
    
    // Lagre original item for å kunne reversere
    if (id) {
      setPendingUpdates(prev => new Map(prev).set(id, item))
    }

    // Utfør faktisk oppdatering
    updateFn(item)
      .then((updatedItem) => {
        setData(prev => prev.map(i => (i as any).id === id ? updatedItem : i))
        setPendingUpdates(prev => {
          const next = new Map(prev)
          next.delete(id)
          return next
        })
        if (onSuccess) {
          onSuccess(updatedItem)
        }
      })
      .catch((error) => {
        logger.error('Optimistic update failed:', error)
        // Reverser endringen
        setData(prev => prev.filter(i => (i as any).id !== id))
        setPendingUpdates(prev => {
          const originalItem = prev.get(id)
          const next = new Map(prev)
          next.delete(id)
          if (onError && originalItem) {
            onError(error, originalItem)
          }
          return next
        })
      })
  }, [updateFn, onSuccess, onError])

  const updateOptimistic = useCallback((id: number | string, updates: Partial<T>) => {
    const originalItem = data.find((item: any) => item.id === id)
    if (!originalItem) return

    // Oppdater umiddelbart
    setData(prev => prev.map(item => 
      (item as any).id === id ? { ...item, ...updates } : item
    ))

    // Lagre original for reversering
    setPendingUpdates(prev => new Map(prev).set(id, originalItem))

    // Utfør faktisk oppdatering
    updateFn({ ...originalItem, ...updates } as T)
      .then((updatedItem) => {
        setData(prev => prev.map(item => 
          (item as any).id === id ? updatedItem : item
        ))
        setPendingUpdates(prev => {
          const next = new Map(prev)
          next.delete(id)
          return next
        })
        if (onSuccess) {
          onSuccess(updatedItem)
        }
      })
      .catch((error) => {
        logger.error('Optimistic update failed:', error)
        // Reverser endringen
        setData(prev => prev.map(item => 
          (item as any).id === id ? originalItem : item
        ))
        setPendingUpdates(prev => {
          const next = new Map(prev)
          next.delete(id)
          return next
        })
        if (onError) {
          onError(error, originalItem)
        }
      })
  }, [data, updateFn, onSuccess, onError])

  const removeOptimistic = useCallback((id: number | string) => {
    const originalItem = data.find((item: any) => item.id === id)
    if (!originalItem) return

    // Fjern umiddelbart
    setData(prev => prev.filter(item => (item as any).id !== id))
    setPendingUpdates(prev => new Map(prev).set(id, originalItem))
  }, [data])

  return {
    data,
    addOptimistic,
    updateOptimistic,
    removeOptimistic,
    setData
  }
}

