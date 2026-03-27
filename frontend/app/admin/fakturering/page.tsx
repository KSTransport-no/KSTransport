'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { logger } from '@/lib/logger'
import { SkiftList } from '@/components/memoized/SkiftList'
import { PageSkeleton } from '@/components/loading/PageSkeleton'
import { SkeletonSkiftList } from '@/components/loading/SkeletonCard'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Clock, 
  Calendar,
  ArrowLeft,
  Users,
  Truck,
  MapPin,
  Package,
  Scale,
  CheckCircle,
  XCircle,
  Receipt,
  LogOut,
  Filter
} from 'lucide-react'

interface Skift {
  id: number
  sjåfør_id: number
  bil_id: number
  sone_id: number
  dato: string
  start_tid: string
  slutt_tid?: string
  pause_minutter: number
  antall_sendinger: number
  vekt: number
  kommentarer?: string
  sjåfør_navn?: string
  bil_registreringsnummer?: string
  bil_merke?: string
  bil_modell?: string
  sone_navn?: string
  sga_kode?: string
  sga_beskrivelse?: string
  sga_skal_faktureres?: boolean
  sga_kode_annet?: string
  fakturert?: boolean
  fakturert_dato?: string
  fakturert_av_navn?: string
}

export default function FaktureringPage() {
  const { sjåfør, isLoading, logout } = useAuth()
  const router = useRouter()
  const [skift, setSkift] = useState<Skift[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [fakturertFilter, setFakturertFilter] = useState<'alle' | 'ikke_fakturert' | 'fakturert'>('ikke_fakturert')

  useEffect(() => {
    if (!isLoading && !sjåfør) {
      router.push('/login')
    } else if (sjåfør) {
      if (!sjåfør.admin) {
        router.push('/')
        return
      }
      loadData()
    }
  }, [sjåfør, isLoading, router])

  const loadData = async () => {
    setLoading(true)
    try {
      const token = document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1]
      const headers = { 'Authorization': `Bearer ${token}` }
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/fakturering`, { headers })
      
      if (response.ok) {
        const data = await response.json()
        setSkift(data)
      } else {
        logger.error(`Feil ved henting av faktureringsskift: ${response.status} ${await response.text()}`)
        setMessage({ type: 'error', text: 'Feil ved henting av faktureringsskift' })
      }
    } catch (error) {
      logger.error('Feil ved lasting av data:', error)
      setMessage({ type: 'error', text: 'Feil ved lasting av data' })
    } finally {
      setLoading(false)
    }
  }

  // Memoized helper functions
  const formatDato = useCallback((dato: string) => {
    return new Date(dato).toLocaleDateString('no-NO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }, [])

  const formatTid = useCallback((tid: string) => {
    const date = new Date(tid)
    return date.toLocaleTimeString('no-NO', { 
      hour: '2-digit', 
      minute: '2-digit',
      timeZone: 'UTC'
    })
  }, [])

  const beregnArbeidstid = useCallback((skift: Skift) => {
    if (!skift.slutt_tid) return 'Pågående'
    
    const start = new Date(skift.start_tid)
    const slutt = new Date(skift.slutt_tid)
    const diffMs = slutt.getTime() - start.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
    // Pause skal være med i oversikten, ikke trukket fra
    const totalMinutes = (diffHours * 60) + diffMinutes
    const arbeidstimer = Math.floor(totalMinutes / 60)
    const arbeidsminutter = totalMinutes % 60
    
    return `${arbeidstimer}t ${arbeidsminutter}m`
  }, [])

  const filtrerSkift = (skift: Skift[]) => {
    let filtrerte = skift

    if (fakturertFilter === 'ikke_fakturert') {
      filtrerte = filtrerte.filter(s => !s.fakturert)
    } else if (fakturertFilter === 'fakturert') {
      filtrerte = filtrerte.filter(s => s.fakturert)
    }

    return filtrerte.sort((a, b) => {
      // Sorter etter dato (nyeste først)
      const datoA = new Date(a.dato).getTime()
      const datoB = new Date(b.dato).getTime()
      if (datoB !== datoA) return datoB - datoA
      // Hvis samme dato, sorter etter start_tid (nyeste først)
      return new Date(b.start_tid).getTime() - new Date(a.start_tid).getTime()
    })
  }

  const handleFakturer = useCallback(async (skiftId: number, fakturert: boolean) => {
    try {
      const token = document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1]
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/skift/${skiftId}/fakturer`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ fakturert })
      })
      
      if (response.ok) {
        loadData()
        setMessage({ type: 'success', text: fakturert ? 'Skift markert som fakturert' : 'Fakturering fjernet' })
        setTimeout(() => setMessage(null), 3000)
      } else {
        setMessage({ type: 'error', text: 'Feil ved oppdatering av fakturering' })
        setTimeout(() => setMessage(null), 5000)
      }
    } catch (error) {
      logger.error('Feil ved fakturering:', error)
      setMessage({ type: 'error', text: 'Feil ved fakturering' })
      setTimeout(() => setMessage(null), 5000)
    }
  }, [])

  if (isLoading) {
    return <PageSkeleton />
  }

  if (!sjåfør) {
    return null
  }

  const filtrerteSkift = filtrerSkift(skift)
  const stats = {
    total: skift.length,
    fakturert: skift.filter(s => s.fakturert).length,
    ikkeFakturert: skift.filter(s => !s.fakturert).length
  }

  return (
    <div className="min-h-screen bg-gray-50 p-2 sm:p-4">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 sm:space-x-4">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => router.push('/admin')}
                className="flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm"
              >
                <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Tilbake</span>
              </Button>
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-gray-900">Fakturering</h1>
                <p className="text-gray-600 text-xs sm:text-sm">Oversikt over skift som skal faktureres</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={logout}
                className="flex items-center gap-1 text-xs sm:text-sm"
              >
                <LogOut className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Logg ut</span>
              </Button>
              <img src="/logo.png" alt="KS Transport" className="h-24 sm:h-30 w-auto ml-2 sm:ml-3 flex-shrink-0" />
            </div>
          </div>
        </div>

        {/* Meldinger */}
        {message && (
          <Alert className={message.type === 'error' ? 'border-red-500' : 'border-green-500'}>
            <AlertDescription>{message.text}</AlertDescription>
          </Alert>
        )}

        {/* Statistikk */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 sm:gap-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-4">
              <CardTitle className="text-xs sm:text-sm font-medium">Totalt</CardTitle>
              <Receipt className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-3 sm:p-4 pt-0">
              <div className="text-xl sm:text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-4">
              <CardTitle className="text-xs sm:text-sm font-medium">Ikke fakturert</CardTitle>
              <XCircle className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent className="p-3 sm:p-4 pt-0">
              <div className="text-xl sm:text-2xl font-bold text-orange-600">{stats.ikkeFakturert}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-4">
              <CardTitle className="text-xs sm:text-sm font-medium">Fakturert</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent className="p-3 sm:p-4 pt-0">
              <div className="text-xl sm:text-2xl font-bold text-green-600">{stats.fakturert}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filter */}
        <Card>
          <CardHeader className="p-3 sm:p-6">
            <CardTitle className="text-base sm:text-lg flex items-center">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-6">
            <div className="flex items-center gap-4">
              <div>
                <label htmlFor="fakturert" className="block text-sm font-medium mb-2">Faktureringsstatus</label>
                <select
                  id="fakturert"
                  value={fakturertFilter}
                  onChange={(e) => setFakturertFilter(e.target.value as 'alle' | 'ikke_fakturert' | 'fakturert')}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="alle">Alle</option>
                  <option value="ikke_fakturert">Ikke fakturert</option>
                  <option value="fakturert">Fakturert</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Skift Liste */}
        <Card>
          <CardHeader className="p-3 sm:p-6">
            <CardTitle className="text-base sm:text-lg">Skift som skal faktureres ({filtrerteSkift.length})</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Skift med SGA-koder som skal faktureres</CardDescription>
          </CardHeader>
          <CardContent className="p-3 sm:p-6">
            {loading ? (
              <SkeletonSkiftList count={5} />
            ) : filtrerteSkift.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Receipt className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p className="text-sm">Ingen skift funnet</p>
              </div>
            ) : (
              <SkiftList
                skift={filtrerteSkift}
                onApprove={handleFakturer}
                formatDato={formatDato}
                formatTid={formatTid}
                beregnArbeidstid={beregnArbeidstid}
                useVirtualization={filtrerteSkift.length > 20}
                maxHeight={600}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

