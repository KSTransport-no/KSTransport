'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  Clock, 
  Calendar,
  ArrowLeft,
  Users,
  Truck,
  MapPin,
  Package,
  Pause,
  Scale,
  MessageSquare,
  CheckCircle,
  XCircle,
  Filter,
  LogOut,
  CheckSquare,
  Square
} from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'

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
  opprettet?: string
  sist_endret?: string
  registrering_type?: string
  godkjent?: boolean
  godkjent_av?: number
  godkjent_dato?: string
  godkjent_av_navn?: string
  bomtur_venting?: string
  sga_kode?: string
  sga_beskrivelse?: string
  sga_skal_faktureres?: boolean
  sga_kode_annet?: string
}

interface Sjåfør {
  id: number
  navn: string
}

interface Bil {
  id: number
  registreringsnummer: string
  merke: string
  modell: string
}

// Hjelpefunksjon for å filtrere skift
function filtrerSkiftHelper(
  skift: Skift[],
  godkjentFilter: string,
  sjåførFilter: string,
  bilFilter: string,
  fraDato: string,
  tilDato: string
): Skift[] {
  let filtrerte = skift

  // Godkjent filter
  if (godkjentFilter === 'godkjent') {
    filtrerte = filtrerte.filter(s => s.godkjent)
  } else if (godkjentFilter === 'ikke_godkjent') {
    filtrerte = filtrerte.filter(s => !s.godkjent)
  }

  // Sjåfør filter
  if (sjåførFilter !== 'alle') {
    filtrerte = filtrerte.filter(s => s.sjåfør_id.toString() === sjåførFilter)
  }

  // Bil filter
  if (bilFilter !== 'alle') {
    filtrerte = filtrerte.filter(s => s.bil_id.toString() === bilFilter)
  }

  // Dato filter
  if (fraDato) {
    const fraDatoObj = new Date(fraDato)
    filtrerte = filtrerte.filter(s => {
      const skiftDato = new Date(s.dato)
      return skiftDato >= fraDatoObj
    })
  }

  if (tilDato) {
    const tilDatoObj = new Date(tilDato)
    tilDatoObj.setHours(23, 59, 59, 999) // Inkluder hele dagen
    filtrerte = filtrerte.filter(s => {
      const skiftDato = new Date(s.dato)
      return skiftDato <= tilDatoObj
    })
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

export default function SkiftPage() {
  const { sjåfør, isLoading, logout } = useAuth()
  const router = useRouter()
  const [skift, setSkift] = useState<Skift[]>([])
  const [sjåfører, setSjåfører] = useState<Sjåfør[]>([])
  const [biler, setBiler] = useState<Bil[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [valgteSkift, setValgteSkift] = useState<Set<number>>(new Set())
  
  // Filter states
  const [fraDato, setFraDato] = useState('')
  const [tilDato, setTilDato] = useState('')
  const [sjåførFilter, setSjåførFilter] = useState('alle')
  const [bilFilter, setBilFilter] = useState('alle')
  const [godkjentFilter, setGodkjentFilter] = useState('alle')

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

  // Rydd opp i valgte skift når filtre endres
  useEffect(() => {
    if (skift.length === 0 || valgteSkift.size === 0) return
    
    let filtrerte = skift

    // Godkjent filter
    if (godkjentFilter === 'godkjent') {
      filtrerte = filtrerte.filter(s => s.godkjent)
    } else if (godkjentFilter === 'ikke_godkjent') {
      filtrerte = filtrerte.filter(s => !s.godkjent)
    }

    // Sjåfør filter
    if (sjåførFilter !== 'alle') {
      filtrerte = filtrerte.filter(s => s.sjåfør_id.toString() === sjåførFilter)
    }

    // Bil filter
    if (bilFilter !== 'alle') {
      filtrerte = filtrerte.filter(s => s.bil_id.toString() === bilFilter)
    }

    // Dato filter
    if (fraDato) {
      const fraDatoObj = new Date(fraDato)
      filtrerte = filtrerte.filter(s => {
        const skiftDato = new Date(s.dato)
        return skiftDato >= fraDatoObj
      })
    }

    if (tilDato) {
      const tilDatoObj = new Date(tilDato)
      tilDatoObj.setHours(23, 59, 59, 999)
      filtrerte = filtrerte.filter(s => {
        const skiftDato = new Date(s.dato)
        return skiftDato <= tilDatoObj
      })
    }

    const filtrerteIds = new Set(filtrerte.map(s => s.id))
    const nyeValgte = new Set(Array.from(valgteSkift).filter(id => filtrerteIds.has(id)))
    if (nyeValgte.size !== valgteSkift.size) {
      setValgteSkift(nyeValgte)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fraDato, tilDato, sjåførFilter, bilFilter, godkjentFilter, skift])

  const loadData = async () => {
    setLoading(true)
    try {
      const token = document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1]
      const headers = { 'Authorization': `Bearer ${token}` }
      
      const [skiftRes, sjåførerRes, bilerRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/skift`, { headers }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/crud/drivers`, { headers }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/biler`, { headers })
      ])
      
      if (skiftRes.ok) {
        const skiftData = await skiftRes.json()
        setSkift(skiftData)
      } else {
        logger.error('Feil ved henting av skift:', skiftRes.status, await skiftRes.text())
        setMessage({ type: 'error', text: 'Feil ved henting av skift' })
      }
      
      if (sjåførerRes.ok) {
        const sjåførerData = await sjåførerRes.json()
        setSjåfører(sjåførerData)
      }
      
      if (bilerRes.ok) {
        const bilerData = await bilerRes.json()
        setBiler(bilerData)
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
    return filtrerSkiftHelper(skift, godkjentFilter, sjåførFilter, bilFilter, fraDato, tilDato)
  }

  const handleGodkjenn = async (skiftId: number, godkjent: boolean) => {
    try {
      const token = document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1]
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/skift/${skiftId}/godkjenn`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ godkjent })
      })
      
      if (response.ok) {
        loadData()
        setMessage({ type: 'success', text: godkjent ? 'Skift godkjent' : 'Skift avgodkjent' })
        setTimeout(() => setMessage(null), 3000)
      } else {
        setMessage({ type: 'error', text: 'Feil ved godkjenning' })
        setTimeout(() => setMessage(null), 5000)
      }
    } catch (error) {
      logger.error('Feil ved godkjenning:', error)
      setMessage({ type: 'error', text: 'Feil ved godkjenning' })
      setTimeout(() => setMessage(null), 5000)
    }
  }

  const handleBulkGodkjenn = async (godkjent: boolean) => {
    try {
      const token = document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1]
      const skiftIds = Array.from(valgteSkift)
      
      if (skiftIds.length === 0) {
        setMessage({ type: 'error', text: 'Ingen skift valgt' })
        setTimeout(() => setMessage(null), 3000)
        return
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/skift/bulk-godkjenn`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ skift_ids: skiftIds, godkjent })
      })
      
      if (response.ok) {
        const data = await response.json()
        loadData()
        setValgteSkift(new Set())
        setMessage({ type: 'success', text: data.melding || `${skiftIds.length} skift ${godkjent ? 'godkjent' : 'avgodkjent'}` })
        setTimeout(() => setMessage(null), 3000)
      } else {
        const error = await response.json()
        setMessage({ type: 'error', text: error.feil || 'Feil ved bulk godkjenning' })
        setTimeout(() => setMessage(null), 5000)
      }
    } catch (error) {
      logger.error('Feil ved bulk godkjenning:', error)
      setMessage({ type: 'error', text: 'Feil ved bulk godkjenning' })
      setTimeout(() => setMessage(null), 5000)
    }
  }

  const handleToggleSkift = (skiftId: number) => {
    const nyeValgte = new Set(valgteSkift)
    if (nyeValgte.has(skiftId)) {
      nyeValgte.delete(skiftId)
    } else {
      nyeValgte.add(skiftId)
    }
    setValgteSkift(nyeValgte)
  }

  const handleSelectAll = () => {
    const filtrerte = filtrerSkiftHelper(skift, godkjentFilter, sjåførFilter, bilFilter, fraDato, tilDato)
    const ikkeGodkjenteSkift = filtrerte.filter(s => !s.godkjent).map(s => s.id)
    if (valgteSkift.size === ikkeGodkjenteSkift.length && ikkeGodkjenteSkift.every(id => valgteSkift.has(id))) {
      setValgteSkift(new Set())
    } else {
      setValgteSkift(new Set(ikkeGodkjenteSkift))
    }
  }

  // Beregn filtrerte skift og stats - må være før early returns
  const filtrerteSkift = filtrerSkiftHelper(skift, godkjentFilter, sjåførFilter, bilFilter, fraDato, tilDato)
  const stats = {
    total: skift.length,
    godkjent: skift.filter(s => s.godkjent).length,
    ikkeGodkjent: skift.filter(s => !s.godkjent).length
  }

  if (isLoading) {
    return <PageSkeleton />
  }

  if (!sjåfør) {
    return null
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
                <h1 className="text-lg sm:text-xl font-bold text-gray-900">Skift Oversikt</h1>
                <p className="text-gray-600 text-xs sm:text-sm">Full oversikt over alle registrerte skift</p>
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
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-3 sm:p-4 pt-0">
              <div className="text-xl sm:text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-4">
              <CardTitle className="text-xs sm:text-sm font-medium">Godkjent</CardTitle>
              <CheckCircle className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent className="p-3 sm:p-4 pt-0">
              <div className="text-xl sm:text-2xl font-bold text-purple-600">{stats.godkjent}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-4">
              <CardTitle className="text-xs sm:text-sm font-medium">Ikke godkjent</CardTitle>
              <XCircle className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent className="p-3 sm:p-4 pt-0">
              <div className="text-xl sm:text-2xl font-bold text-orange-600">{stats.ikkeGodkjent}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filtre */}
        <Card>
          <CardHeader className="p-3 sm:p-6">
            <CardTitle className="text-base sm:text-lg flex items-center">
              <Filter className="h-4 w-4 mr-2" />
              Filtre
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <Label htmlFor="fra_dato">Fra dato</Label>
                <Input
                  id="fra_dato"
                  type="date"
                  value={fraDato}
                  onChange={(e) => setFraDato(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="til_dato">Til dato</Label>
                <Input
                  id="til_dato"
                  type="date"
                  value={tilDato}
                  onChange={(e) => setTilDato(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="sjåfør">Sjåfør</Label>
                <select
                  id="sjåfør"
                  value={sjåførFilter}
                  onChange={(e) => setSjåførFilter(e.target.value)}
                  className="w-full mt-1 p-2 border rounded-md"
                >
                  <option value="alle">Alle sjåfører</option>
                  {sjåfører.map(sjåfør => (
                    <option key={sjåfør.id} value={sjåfør.id.toString()}>
                      {sjåfør.navn}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="bil">Bil</Label>
                <select
                  id="bil"
                  value={bilFilter}
                  onChange={(e) => setBilFilter(e.target.value)}
                  className="w-full mt-1 p-2 border rounded-md"
                >
                  <option value="alle">Alle biler</option>
                  {biler.map(bil => (
                    <option key={bil.id} value={bil.id.toString()}>
                      {bil.registreringsnummer} {bil.merke && `- ${bil.merke} ${bil.modell}`}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="godkjent">Godkjenning</Label>
                <select
                  id="godkjent"
                  value={godkjentFilter}
                  onChange={(e) => setGodkjentFilter(e.target.value)}
                  className="w-full mt-1 p-2 border rounded-md"
                >
                  <option value="alle">Alle</option>
                  <option value="godkjent">Godkjent</option>
                  <option value="ikke_godkjent">Ikke godkjent</option>
                </select>
              </div>
            </div>
            <div className="mt-4">
              <Button 
                variant="outline" 
                onClick={() => {
                  setFraDato('')
                  setTilDato('')
                  setSjåførFilter('alle')
                  setBilFilter('alle')
                  setGodkjentFilter('alle')
                }}
              >
                Nullstill filtre
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Skift Liste */}
        <Card>
          <CardHeader className="p-3 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="text-base sm:text-lg">Alle Skift ({filtrerteSkift.length})</CardTitle>
                <CardDescription className="text-xs sm:text-sm">Klikk på et skift for å se detaljer</CardDescription>
              </div>
              {filtrerteSkift.filter(s => !s.godkjent).length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSelectAll}
                    className="text-xs sm:text-sm"
                  >
                    {valgteSkift.size === filtrerteSkift.filter(s => !s.godkjent).length && 
                     filtrerteSkift.filter(s => !s.godkjent).every(s => valgteSkift.has(s.id)) ? (
                      <>
                        <Square className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                        Avmerk alle
                      </>
                    ) : (
                      <>
                        <CheckSquare className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                        Velg alle ikke godkjente
                      </>
                    )}
                  </Button>
                  {valgteSkift.size > 0 && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleBulkGodkjenn(true)}
                      className="text-xs sm:text-sm"
                    >
                      <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                      Godkjenn valgte ({valgteSkift.size})
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      const ikkeGodkjenteIds = filtrerteSkift.filter(s => !s.godkjent).map(s => s.id)
                      if (ikkeGodkjenteIds.length === 0) {
                        setMessage({ type: 'error', text: 'Ingen ikke godkjente skift å godkjenne' })
                        setTimeout(() => setMessage(null), 3000)
                        return
                      }
                      try {
                        const token = document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1]
                        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/skift/bulk-godkjenn`, {
                          method: 'PUT',
                          headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                          },
                          body: JSON.stringify({ skift_ids: ikkeGodkjenteIds, godkjent: true })
                        })
                        
                        if (response.ok) {
                          const data = await response.json()
                          loadData()
                          setValgteSkift(new Set())
                          setMessage({ type: 'success', text: data.melding || `${ikkeGodkjenteIds.length} skift godkjent` })
                          setTimeout(() => setMessage(null), 3000)
                        } else {
                          const error = await response.json()
                          setMessage({ type: 'error', text: error.feil || 'Feil ved bulk godkjenning' })
                          setTimeout(() => setMessage(null), 5000)
                        }
                      } catch (error) {
                        logger.error('Feil ved bulk godkjenning:', error)
                        setMessage({ type: 'error', text: 'Feil ved bulk godkjenning' })
                        setTimeout(() => setMessage(null), 5000)
                      }
                    }}
                    className="text-xs sm:text-sm"
                  >
                    <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                    Godkjenn alle ikke godkjente
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-3 sm:p-6">
            {loading ? (
              <SkeletonSkiftList count={5} />
            ) : filtrerteSkift.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Clock className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p className="text-sm">Ingen skift funnet</p>
              </div>
            ) : (
              <SkiftList
                skift={filtrerteSkift}
                onApprove={handleGodkjenn}
                showCheckbox={true}
                selectedIds={valgteSkift}
                onToggle={handleToggleSkift}
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

