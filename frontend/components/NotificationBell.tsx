'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Bell, CheckCheck, Trash2, X } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface Varsling {
  id: number
  mottaker_id: number
  type: string
  tittel: string
  melding: string
  lenke: string | null
  lest: boolean
  lest_dato: string | null
  relatert_type: string | null
  relatert_id: number | null
  opprettet: string
}

export function NotificationBell() {
  const { sjåfør } = useAuth()
  const router = useRouter()
  const [varslinger, setVarslinger] = useState<Varsling[]>([])
  const [ulestAntall, setUlestAntall] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const getToken = () => {
    return document.cookie
      .split('; ')
      .find(row => row.startsWith('token='))
      ?.split('=')[1]
  }

  const fetchUlestAntall = useCallback(async () => {
    const token = getToken()
    if (!token) return
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/varslinger/ulest`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setUlestAntall(data.antall)
      }
    } catch {
      // Silently fail - non-critical
    }
  }, [])

  const fetchVarslinger = useCallback(async () => {
    const token = getToken()
    if (!token) return
    setLoading(true)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/varslinger?limit=20`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setVarslinger(data)
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false)
    }
  }, [])

  const markAsRead = async (id: number) => {
    const token = getToken()
    if (!token) return
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/varslinger/${id}/les`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      setVarslinger(prev => prev.map(v => v.id === id ? { ...v, lest: true } : v))
      setUlestAntall(prev => Math.max(0, prev - 1))
    } catch {
      // Silently fail
    }
  }

  const markAllAsRead = async () => {
    const token = getToken()
    if (!token) return
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/varslinger/les-alle`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      setVarslinger(prev => prev.map(v => ({ ...v, lest: true })))
      setUlestAntall(0)
    } catch {
      // Silently fail
    }
  }

  const deleteVarsling = async (id: number) => {
    const token = getToken()
    if (!token) return
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/varslinger/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const removed = varslinger.find(v => v.id === id)
      setVarslinger(prev => prev.filter(v => v.id !== id))
      if (removed && !removed.lest) {
        setUlestAntall(prev => Math.max(0, prev - 1))
      }
    } catch {
      // Silently fail
    }
  }

  const handleVarslingClick = (varsling: Varsling) => {
    if (!varsling.lest) {
      markAsRead(varsling.id)
    }
    if (varsling.lenke) {
      setIsOpen(false)
      router.push(varsling.lenke)
    }
  }

  // Poll for unread count every 30 seconds
  useEffect(() => {
    if (!sjåfør) return
    fetchUlestAntall()
    const interval = setInterval(fetchUlestAntall, 30000)
    return () => clearInterval(interval)
  }, [sjåfør, fetchUlestAntall])

  // Fetch full list when dropdown opens
  useEffect(() => {
    if (isOpen) {
      fetchVarslinger()
    }
  }, [isOpen, fetchVarslinger])

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  if (!sjåfør) return null

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMin = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMin < 1) return 'Nå'
    if (diffMin < 60) return `${diffMin} min siden`
    if (diffHours < 24) return `${diffHours}t siden`
    if (diffDays < 7) return `${diffDays}d siden`
    return date.toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' })
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'nytt_avvik':
      case 'avvik_oppdatering':
      case 'avvik_kommentar':
        return '⚠️'
      case 'nytt_forslag':
      case 'forslag_oppdatering':
      case 'forslag_kommentar':
        return '💡'
      default:
        return '🔔'
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
        aria-label="Varsler"
      >
        <Bell className="h-5 w-5 text-gray-600" />
        {ulestAntall > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {ulestAntall > 99 ? '99+' : ulestAntall}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="fixed inset-x-2 top-14 sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 w-auto sm:w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-[70vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b">
            <h3 className="font-semibold text-gray-900">Varsler</h3>
            <div className="flex items-center gap-1">
              {ulestAntall > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-blue-600 hover:text-blue-800 px-2 py-1 rounded hover:bg-blue-50 transition-colors"
                  title="Merk alle som lest"
                >
                  <CheckCheck className="h-4 w-4" />
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded hover:bg-gray-100"
              >
                <X className="h-4 w-4 text-gray-500" />
              </button>
            </div>
          </div>

          {/* Notifications list */}
          <div className="overflow-y-auto flex-1">
            {loading && varslinger.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">Laster varsler...</div>
            ) : varslinger.length === 0 ? (
              <div className="p-8 text-center text-gray-500 text-sm">
                <Bell className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                Ingen varsler
              </div>
            ) : (
              varslinger.map(varsling => (
                <div
                  key={varsling.id}
                  className={`group flex items-start gap-3 p-3 border-b last:border-b-0 hover:bg-gray-50 transition-colors cursor-pointer ${
                    !varsling.lest ? 'bg-blue-50/50' : ''
                  }`}
                  onClick={() => handleVarslingClick(varsling)}
                >
                  <span className="text-lg flex-shrink-0 mt-0.5">{getTypeIcon(varsling.type)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm ${!varsling.lest ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                        {varsling.tittel}
                      </p>
                      {!varsling.lest && (
                        <span className="h-2 w-2 rounded-full bg-blue-500 flex-shrink-0 mt-1.5" />
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{varsling.melding}</p>
                    <p className="text-xs text-gray-400 mt-1">{formatTime(varsling.opprettet)}</p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteVarsling(varsling.id)
                    }}
                    className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 flex-shrink-0 opacity-0 group-hover:opacity-100"
                    title="Slett"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
