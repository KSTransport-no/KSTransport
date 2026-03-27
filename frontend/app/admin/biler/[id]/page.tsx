'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter, useParams } from 'next/navigation'
import { logger } from '@/lib/logger'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  ArrowLeft,
  Truck,
  Clock,
  Package,
  Calendar,
  User,
} from 'lucide-react'

interface Bil {
  id: number
  registreringsnummer: string
  merke: string
  modell: string
  årsmodell: number
  aktiv: boolean
}

interface Skift {
  id: number
  dato: string
  start_tid: string
  slutt_tid: string
  pause_minutter: number
  antall_sendinger: number
  kommentarer: string
  sjåfør_navn: string
  sjåfør_epost: string
  sone_navn: string
  opprettet?: string
  sist_endret?: string
  registrering_type?: string
}

export default function BilDetailPage() {
  const { sjåfør, isLoading } = useAuth()
  const router = useRouter()
  const params = useParams()
  const bilId = params.id as string
  
  const [bilData, setBilData] = useState<Bil | null>(null)
  const [skift, setSkift] = useState<Skift[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  
  // Filter states
  const [sjåførFilter, setSjåførFilter] = useState('alle')
  const [fraDato, setFraDato] = useState('')
  const [tilDato, setTilDato] = useState('')
  const [sjåfører, setSjåfører] = useState<{id: number, navn: string}[]>([])

  useEffect(() => {
    if (!isLoading && !sjåfør) {
      router.push('/login')
    } else if (sjåfør) {
      if (!sjåfør.admin) {
        router.push('/')
        return
      }
      loadBilData()
    }
  }, [sjåfør, isLoading, router, bilId])

  const loadBilData = async () => {
    setLoading(true)
    try {
      const token = document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1]
      
      // Hent bildata
      const bilResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/crud/biler`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (bilResponse.ok) {
        const biler = await bilResponse.json()
        const bil = biler.find((b: Bil) => b.id === parseInt(bilId))
        setBilData(bil)
      }

      // Hent skift for denne bilen
      const skiftResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/skift?bil_id=${bilId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (skiftResponse.ok) {
        const skiftData = await skiftResponse.json()
        setSkift(skiftData.filter((s: any) => s.bil_id === parseInt(bilId)))
      }

      // Hent sjåfører for filter
      const sjåførResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/crud/drivers`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (sjåførResponse.ok) {
        const sjåførData = await sjåførResponse.json()
        setSjåfører(sjåførData.map((s: any) => ({ id: s.id, navn: s.navn })))
      }

    } catch (error) {
      logger.error('Feil ved lasting av bildata:', error)
      setMessage({ type: 'error', text: 'Feil ved lasting av data' })
    } finally {
      setLoading(false)
    }
  }

  const beregnArbeidstid = (skift: Skift) => {
    if (!skift.slutt_tid) return 'Pågående'
    
    const start = new Date(skift.start_tid)
    const slutt = new Date(skift.slutt_tid)
    const diffMs = slutt.getTime() - start.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
    // Ikke trekk fra pause - vis total tid
    const totalMinutes = (diffHours * 60) + diffMinutes
    const arbeidstimer = Math.floor(totalMinutes / 60)
    const arbeidsminutter = totalMinutes % 60
    
    return `${arbeidstimer}t ${arbeidsminutter}m`
  }

  const beregnStatistikk = () => {
    const filtrerteSkift = filtrerSkift(skift)
    const totalSendinger = filtrerteSkift.reduce((sum, s) => sum + (s.antall_sendinger || 0), 0)
    
    let totalMinutter = 0
    filtrerteSkift.forEach(s => {
      if (s.slutt_tid) {
        const start = new Date(s.start_tid)
        const slutt = new Date(s.slutt_tid)
        const diffMs = slutt.getTime() - start.getTime()
        const diffMinutes = Math.floor(diffMs / (1000 * 60))
        totalMinutter += diffMinutes
      }
    })
    
    const totalTimer = Math.floor(totalMinutter / 60)
    const gjenværendeMinutter = totalMinutter % 60
    
    // Unike sjåfører som har kjørt denne bilen
    const unikeSjåfører = new Set(filtrerteSkift.map(s => s.sjåfør_navn)).size
    
    return {
      totalSendinger,
      totalTimer,
      gjenværendeMinutter,
      totalSkift: filtrerteSkift.length,
      unikeSjåfører
    }
  }

  const formatDato = (dato: string) => {
    return new Date(dato).toLocaleDateString('no-NO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatTid = (tid: string) => {
    const date = new Date(tid)
    return date.toLocaleTimeString('no-NO', { 
      hour: '2-digit', 
      minute: '2-digit',
      timeZone: 'UTC'
    })
  }

  // Filter functions
  const filtrerSkift = (skift: Skift[]) => {
    let filtrerte = skift

    if (sjåførFilter !== 'alle') {
      filtrerte = filtrerte.filter(s => s.sjåfør_navn === sjåfører.find(sj => sj.id === parseInt(sjåførFilter))?.navn)
    }

    if (fraDato) {
      const fraDatoObj = new Date(fraDato)
      filtrerte = filtrerte.filter(s => {
        const skiftDato = new Date(s.dato)
        return skiftDato >= fraDatoObj
      })
    }

    if (tilDato) {
      const tilDatoObj = new Date(tilDato)
      filtrerte = filtrerte.filter(s => {
        const skiftDato = new Date(s.dato)
        return skiftDato <= tilDatoObj
      })
    }

    return filtrerte
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!sjåfør || !bilData) {
    return null
  }

  const stats = beregnStatistikk()

  return (
    <div className="min-h-screen bg-gray-50 p-3">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 sm:space-x-4">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => router.push('/admin/biler')}
                className="flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm"
              >
                <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Tilbake</span>
              </Button>
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-gray-900">{bilData.registreringsnummer}</h1>
                <p className="text-gray-600 text-xs sm:text-sm">Detaljert oversikt</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant={bilData.aktiv ? 'default' : 'secondary'} className="text-xs sm:text-sm">
                {bilData.aktiv ? 'Aktiv' : 'Inaktiv'}
              </Badge>
              <img src="/logo.png" alt="KS Transport" className="h-24 sm:h-30 w-auto ml-2 sm:ml-3 flex-shrink-0" />
            </div>
          </div>
        </div>

        {/* Message */}
        {message && (
          <Alert className={message.type === 'error' ? 'border-red-500' : 'border-green-500'}>
            <AlertDescription>{message.text}</AlertDescription>
          </Alert>
        )}

        {/* Bil Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Bilinformasjon</CardTitle>
            <CardDescription>Detaljer om denne bilen</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Registreringsnummer</p>
                <p className="text-lg font-semibold">{bilData.registreringsnummer}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Merke</p>
                <p className="text-lg font-semibold">{bilData.merke || 'Ikke oppgitt'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Modell</p>
                <p className="text-lg font-semibold">{bilData.modell || 'Ikke oppgitt'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Årsmodell</p>
                <p className="text-lg font-semibold">{bilData.årsmodell}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Filter Controls */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Filtre</CardTitle>
            <CardDescription>Filtrer skift for bedre oversikt</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Fra dato filter */}
              <div>
                <label className="block text-sm font-medium mb-2">Fra dato</label>
                <input
                  type="date"
                  value={fraDato}
                  onChange={(e) => setFraDato(e.target.value)}
                  className="w-full p-2 border rounded-md"
                />
              </div>

              {/* Til dato filter */}
              <div>
                <label className="block text-sm font-medium mb-2">Til dato</label>
                <input
                  type="date"
                  value={tilDato}
                  onChange={(e) => setTilDato(e.target.value)}
                  className="w-full p-2 border rounded-md"
                />
              </div>

              {/* Sjåfør filter */}
              <div>
                <label className="block text-sm font-medium mb-2">Sjåfør</label>
                <select
                  value={sjåførFilter}
                  onChange={(e) => setSjåførFilter(e.target.value)}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="alle">Alle sjåfører</option>
                  {sjåfører.map(sjåfør => (
                    <option key={sjåfør.id} value={sjåfør.id.toString()}>
                      {sjåfør.navn}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            {/* Clear filters button */}
            <div className="mt-4">
              <Button 
                variant="outline" 
                onClick={() => {
                  setFraDato('')
                  setTilDato('')
                  setSjåførFilter('alle')
                }}
              >
                Nullstill filtre
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Statistikk */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sendinger</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalSendinger}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Arbeidstid</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalTimer}t {stats.gjenværendeMinutter}m</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Skift</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalSkift}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sjåfører</CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.unikeSjåfører}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Status</CardTitle>
              <Truck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-sm font-medium">
                <Badge variant={bilData.aktiv ? 'default' : 'secondary'}>
                  {bilData.aktiv ? 'Aktiv' : 'Inaktiv'}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Nylige Skift */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Nylige Skift</CardTitle>
            <CardDescription>Skift registrert med denne bilen</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="text-sm text-gray-500 mt-2">Laster skift...</p>
              </div>
            ) : skift.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Calendar className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p className="text-sm">Ingen skift registrert med denne bilen</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filtrerSkift(skift).slice(0, 10).map((skiftItem) => (
                  <div key={skiftItem.id} className="border rounded-lg p-4 bg-gray-50">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h3 className="font-medium">{formatDato(skiftItem.dato)}</h3>
                          <Badge variant="outline">
                            {formatTid(skiftItem.start_tid)} - {skiftItem.slutt_tid ? formatTid(skiftItem.slutt_tid) : 'Pågående'}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="font-medium">Arbeidstid:</span> {beregnArbeidstid(skiftItem)}
                          </div>
                          <div>
                            <span className="font-medium">Sendinger:</span> {skiftItem.antall_sendinger}
                          </div>
                          <div>
                            <span className="font-medium">Sjåfør:</span> {skiftItem.sjåfør_navn}
                          </div>
                          <div>
                            <span className="font-medium">Sone:</span> {skiftItem.sone_navn}
                          </div>
                        </div>
                        {skiftItem.kommentarer && (
                          <p className="text-sm text-gray-600 mt-2">
                            <span className="font-medium">Kommentar:</span> {skiftItem.kommentarer}
                          </p>
                        )}
                        {skiftItem.opprettet && (
                          <p className="text-xs text-gray-500 mt-2">
                            <span className="font-medium">Registrert:</span> {new Date(skiftItem.opprettet).toLocaleString('no-NO', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
