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
  Users,
  Clock,
  Package,
  AlertTriangle,
  Lightbulb,
  Calendar,
  CheckCircle,
  XCircle
} from 'lucide-react'

interface Sjåfør {
  id: number
  navn: string
  epost: string
  telefon: string
  aktiv: boolean
  admin: boolean
}

interface Skift {
  id: number
  dato: string
  start_tid: string
  slutt_tid: string
  pause_minutter: number
  antall_sendinger: number
  kommentarer: string
  bil_registreringsnummer: string
  bil_merke: string
  bil_modell: string
  sone_navn: string
  opprettet?: string
  sist_endret?: string
  registrering_type?: string
  godkjent?: boolean
  godkjent_av?: number
  godkjent_dato?: string
  godkjent_av_navn?: string
}

interface Avvik {
  id: number
  dato: string
  type: string
  beskrivelse: string
  status: string
  admin_kommentar: string
  bil_registreringsnummer: string
}

interface Forbedringsforslag {
  id: number
  opprettet: string
  tittel: string
  beskrivelse: string
  status: string
  admin_kommentar: string
}

export default function SjåførDetailPage() {
  const { sjåfør, isLoading } = useAuth()
  const router = useRouter()
  const params = useParams()
  const sjåførId = params.id as string
  
  const [sjåførData, setSjåførData] = useState<Sjåfør | null>(null)
  const [skift, setSkift] = useState<Skift[]>([])
  const [avvik, setAvvik] = useState<Avvik[]>([])
  const [forbedringsforslag, setForbedringsforslag] = useState<Forbedringsforslag[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  
  // Filter states
  const [skiftFilter, setSkiftFilter] = useState('alle')
  const [avvikFilter, setAvvikFilter] = useState('alle')
  const [forslagFilter, setForslagFilter] = useState('alle')
  const [fraDato, setFraDato] = useState('')
  const [tilDato, setTilDato] = useState('')

  useEffect(() => {
    if (!isLoading && !sjåfør) {
      router.push('/login')
    } else if (sjåfør) {
      if (!sjåfør.admin) {
        router.push('/')
        return
      }
      loadSjåførData()
    }
  }, [sjåfør, isLoading, router, sjåførId])

  const loadSjåførData = async () => {
    setLoading(true)
    try {
      const token = document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1]
      
      // Hent sjåførdata
      const sjåførResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/crud/drivers`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (sjåførResponse.ok) {
        const sjåfører = await sjåførResponse.json()
        const sjåfør = sjåfører.find((s: Sjåfør) => s.id === parseInt(sjåførId))
        setSjåførData(sjåfør)
      }

      // Hent skift for denne sjåføreren
      const skiftResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/skift?sjåfør_id=${sjåførId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (skiftResponse.ok) {
        const skiftData = await skiftResponse.json()
        setSkift(skiftData.filter((s: any) => s.sjåfør_id === parseInt(sjåførId)))
      }

      // Hent avvik for denne sjåføreren
      const avvikResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/avvik?sjåfør_id=${sjåførId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (avvikResponse.ok) {
        const avvikData = await avvikResponse.json()
        setAvvik(avvikData.filter((a: any) => a.sjåfør_id === parseInt(sjåførId)))
      }

      // Hent forbedringsforslag for denne sjåføreren
      const forslagResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/forbedringsforslag?sjåfør_id=${sjåførId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (forslagResponse.ok) {
        const forslagData = await forslagResponse.json()
        setForbedringsforslag(forslagData.filter((f: any) => f.sjåfør_id === parseInt(sjåførId)))
      }

    } catch (error) {
      logger.error('Feil ved lasting av sjåførdata:', error)
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
    const filtrerteAvvik = filtrerAvvik(avvik)
    const filtrerteForslag = filtrerForslag(forbedringsforslag)
    
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
    
    return {
      totalSendinger,
      totalTimer,
      gjenværendeMinutter,
      totalSkift: filtrerteSkift.length,
      aktiveAvvik: filtrerteAvvik.filter(a => a.status === 'ny' || a.status === 'under_behandling').length,
      nyeForslag: filtrerteForslag.filter(f => f.status === 'ny').length
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

    if (skiftFilter === 'pågående') {
      filtrerte = filtrerte.filter(s => !s.slutt_tid)
    } else if (skiftFilter === 'fullført') {
      filtrerte = filtrerte.filter(s => s.slutt_tid)
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

  const filtrerAvvik = (avvik: Avvik[]) => {
    let filtrerte = avvik

    if (avvikFilter !== 'alle') {
      filtrerte = filtrerte.filter(a => a.status === avvikFilter)
    }

    if (fraDato) {
      const fraDatoObj = new Date(fraDato)
      filtrerte = filtrerte.filter(a => {
        const avvikDato = new Date(a.dato)
        return avvikDato >= fraDatoObj
      })
    }

    if (tilDato) {
      const tilDatoObj = new Date(tilDato)
      filtrerte = filtrerte.filter(a => {
        const avvikDato = new Date(a.dato)
        return avvikDato <= tilDatoObj
      })
    }

    return filtrerte
  }

  const filtrerForslag = (forslag: Forbedringsforslag[]) => {
    let filtrerte = forslag

    if (forslagFilter !== 'alle') {
      filtrerte = filtrerte.filter(f => f.status === forslagFilter)
    }

    if (fraDato) {
      const fraDatoObj = new Date(fraDato)
      filtrerte = filtrerte.filter(f => {
        const forslagDato = new Date(f.opprettet)
        return forslagDato >= fraDatoObj
      })
    }

    if (tilDato) {
      const tilDatoObj = new Date(tilDato)
      filtrerte = filtrerte.filter(f => {
        const forslagDato = new Date(f.opprettet)
        return forslagDato <= tilDatoObj
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

  if (!sjåfør || !sjåførData) {
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
                onClick={() => router.push('/admin/drivers')}
                className="flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm"
              >
                <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Tilbake</span>
              </Button>
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-gray-900">{sjåførData.navn}</h1>
                <p className="text-gray-600 text-xs sm:text-sm">Detaljert oversikt</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {sjåførData.admin && (
                <Badge variant="destructive" className="text-xs sm:text-sm">Admin</Badge>
              )}
              <Badge variant={sjåførData.aktiv ? 'default' : 'secondary'} className="text-xs sm:text-sm">
                {sjåførData.aktiv ? 'Aktiv' : 'Inaktiv'}
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

        {/* Filter Controls */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Filtre</CardTitle>
            <CardDescription>Filtrer data for bedre oversikt</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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

              {/* Skift filter */}
              <div>
                <label className="block text-sm font-medium mb-2">Skift</label>
                <select
                  value={skiftFilter}
                  onChange={(e) => setSkiftFilter(e.target.value)}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="alle">Alle skift</option>
                  <option value="pågående">Pågående</option>
                  <option value="fullført">Fullført</option>
                </select>
              </div>

              {/* Avvik filter */}
              <div>
                <label className="block text-sm font-medium mb-2">Avvik</label>
                <select
                  value={avvikFilter}
                  onChange={(e) => setAvvikFilter(e.target.value)}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="alle">Alle avvik</option>
                  <option value="ny">Nye</option>
                  <option value="under_behandling">Under behandling</option>
                  <option value="løst">Løst</option>
                  <option value="avvist">Avvist</option>
                </select>
              </div>

              {/* Forslag filter */}
              <div>
                <label className="block text-sm font-medium mb-2">Forslag</label>
                <select
                  value={forslagFilter}
                  onChange={(e) => setForslagFilter(e.target.value)}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="alle">Alle forslag</option>
                  <option value="ny">Nye</option>
                  <option value="under_behandling">Under behandling</option>
                  <option value="godkjent">Godkjent</option>
                  <option value="avvist">Avvist</option>
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
                  setSkiftFilter('alle')
                  setAvvikFilter('alle')
                  setForslagFilter('alle')
                }}
              >
                Nullstill filtre
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Statistikk */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
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
              <CardTitle className="text-sm font-medium">Aktive Avvik</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.aktiveAvvik}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Nye Forslag</CardTitle>
              <Lightbulb className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.nyeForslag}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">E-post</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-sm font-medium">{sjåførData.epost}</div>
              {sjåførData.telefon && (
                <div className="text-xs text-gray-500">{sjåførData.telefon}</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Nylige Skift */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Nylige Skift</CardTitle>
            <CardDescription>De siste registrerte skiftene</CardDescription>
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
                <p className="text-sm">Ingen skift registrert</p>
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
                            <span className="font-medium">Bil:</span> {skiftItem.bil_registreringsnummer}
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
                        {skiftItem.godkjent && skiftItem.godkjent_dato && (
                          <p className="text-xs text-green-600 mt-2">
                            <span className="font-medium">Godkjent:</span> {new Date(skiftItem.godkjent_dato).toLocaleString('no-NO', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit'
                            })} {skiftItem.godkjent_av_navn && `av ${skiftItem.godkjent_av_navn}`}
                          </p>
                        )}
                      </div>
                      <div className="ml-4">
                        <Button
                          variant={skiftItem.godkjent ? "outline" : "default"}
                          size="sm"
                          onClick={async () => {
                            try {
                              const token = document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1]
                              const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/skift/${skiftItem.id}/godkjenn`, {
                                method: 'PUT',
                                headers: {
                                  'Content-Type': 'application/json',
                                  'Authorization': `Bearer ${token}`
                                },
                                body: JSON.stringify({ godkjent: !skiftItem.godkjent })
                              })
                              
                              if (response.ok) {
                                loadSjåførData()
                                setMessage({ type: 'success', text: skiftItem.godkjent ? 'Skift avgodkjent' : 'Skift godkjent' })
                              } else {
                                setMessage({ type: 'error', text: 'Feil ved godkjenning' })
                              }
                            } catch (error) {
                              logger.error('Feil ved godkjenning:', error)
                              setMessage({ type: 'error', text: 'Feil ved godkjenning' })
                            }
                          }}
                          className="text-xs"
                        >
                          {skiftItem.godkjent ? (
                            <>
                              <XCircle className="h-3 w-3 mr-1" />
                              Avgodkjenn
                            </>
                          ) : (
                            <>
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Godkjenn
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Avvik */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Avvik</CardTitle>
            <CardDescription>Registrerte avvik for denne sjåføreren</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="text-sm text-gray-500 mt-2">Laster avvik...</p>
              </div>
            ) : avvik.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <AlertTriangle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p className="text-sm">Ingen avvik registrert</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filtrerAvvik(avvik).slice(0, 10).map((avvikItem) => (
                  <div key={avvikItem.id} className="border rounded-lg p-4 bg-gray-50">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h3 className="font-medium">{avvikItem.type}</h3>
                          <Badge variant={
                            avvikItem.status === 'ny' ? 'default' :
                            avvikItem.status === 'under_behandling' ? 'secondary' :
                            avvikItem.status === 'løst' ? 'outline' : 'destructive'
                          }>
                            {avvikItem.status.charAt(0).toUpperCase() + avvikItem.status.slice(1)}
                          </Badge>
                          <span className="text-sm text-gray-500">{formatDato(avvikItem.dato)}</span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{avvikItem.beskrivelse}</p>
                        {avvikItem.admin_kommentar && (
                          <p className="text-sm text-blue-600">
                            <span className="font-medium">Admin kommentar:</span> {avvikItem.admin_kommentar}
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

        {/* Forbedringsforslag */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Forbedringsforslag</CardTitle>
            <CardDescription>Innsendte forslag fra denne sjåføreren</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="text-sm text-gray-500 mt-2">Laster forslag...</p>
              </div>
            ) : forbedringsforslag.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Lightbulb className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p className="text-sm">Ingen forslag innsendt</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filtrerForslag(forbedringsforslag).slice(0, 10).map((forslagItem) => (
                  <div key={forslagItem.id} className="border rounded-lg p-4 bg-gray-50">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h3 className="font-medium">{forslagItem.tittel}</h3>
                          <Badge variant={
                            forslagItem.status === 'ny' ? 'default' :
                            forslagItem.status === 'under_behandling' ? 'secondary' :
                            forslagItem.status === 'godkjent' ? 'outline' : 'destructive'
                          }>
                            {forslagItem.status.charAt(0).toUpperCase() + forslagItem.status.slice(1)}
                          </Badge>
                          <span className="text-sm text-gray-500">{formatDato(forslagItem.opprettet)}</span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{forslagItem.beskrivelse}</p>
                        {forslagItem.admin_kommentar && (
                          <p className="text-sm text-blue-600">
                            <span className="font-medium">Admin kommentar:</span> {forslagItem.admin_kommentar}
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
