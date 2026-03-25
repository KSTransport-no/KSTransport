'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { logger } from '@/lib/logger'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Calendar, Clock, Truck, MapPin, Package, MessageSquare, AlertTriangle, Lightbulb } from 'lucide-react'

interface Bil {
  id: number
  registreringsnummer: string
  merke: string
  modell: string
  årsmodell: number
}

interface Sone {
  id: number
  navn: string
  beskrivelse: string
}

interface Skift {
  id?: number
  start_tid: string
  slutt_tid?: string
  pause_minutter?: number
  bil_id: number
  sone_id: number
  antall_sendinger: number
  kommentarer?: string
  dato: string
}

export default function Dashboard() {
  const { sjåfør, logout } = useAuth()
  const router = useRouter()
  const [biler, setBiler] = useState<Bil[]>([])
  const [soner, setSoner] = useState<Sone[]>([])
  const [skift, setSkift] = useState<Skift>({
    start_tid: '',
    slutt_tid: '',
    pause_minutter: 0,
    bil_id: 0,
    sone_id: 0,
    antall_sendinger: 0,
    kommentarer: '',
    dato: new Date().toISOString().split('T')[0]
  })
  const [isActiveShift, setIsActiveShift] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  // Redirect til hjemmesiden
  useEffect(() => {
    router.push('/')
  }, [router])

  useEffect(() => {
    if (sjåfør) {
      loadData()
      checkActiveShift()
    }
  }, [sjåfør])

  const loadData = async () => {
    try {
      const token = document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1]
      const [bilerResponse, sonerResponse] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/data/biler`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/data/soner`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ])
      
      const bilerData = await bilerResponse.json()
      const sonerData = await sonerResponse.json()
      
      setBiler(bilerData)
      setSoner(sonerData)
    } catch (error) {
      logger.error('Feil ved lasting av data:', error)
    }
  }

  const checkActiveShift = async () => {
    try {
      const token = document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1]
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/skift/active`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (response.ok) {
        const activeShift = await response.json()
        if (activeShift) {
          setIsActiveShift(true)
          setSkift(activeShift)
        }
      }
    } catch (error) {
      logger.error('Feil ved sjekk av aktivt skift:', error)
    }
  }

  const startSkift = async () => {
    if (!skift.bil_id || !skift.sone_id) {
      setMessage({ type: 'error', text: 'Vennligst velg bil og sone før du starter skiftet' })
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/skift`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1]}`
        },
        body: JSON.stringify({
          bil_id: skift.bil_id,
          sone_id: skift.sone_id,
          dato: skift.dato,
          start_tid: new Date().toISOString()
        })
      })

      if (response.ok) {
        const newShift = await response.json()
        setSkift(newShift)
        setIsActiveShift(true)
        setMessage({ type: 'success', text: 'Skift startet!' })
      } else {
        const error = await response.json()
        setMessage({ type: 'error', text: error.feil || 'Feil ved start av skift' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Feil ved start av skift' })
    } finally {
      setLoading(false)
    }
  }

  const sluttSkift = async () => {
    setLoading(true)
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/skift/${skift.id}/slutt`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1]}`
        },
        body: JSON.stringify({
          slutt_tid: new Date().toISOString(),
          pause_minutter: skift.pause_minutter,
          antall_sendinger: skift.antall_sendinger,
          kommentarer: skift.kommentarer
        })
      })

      if (response.ok) {
        setIsActiveShift(false)
        setSkift({
          start_tid: '',
          slutt_tid: '',
          pause_minutter: 0,
          bil_id: 0,
          sone_id: 0,
          antall_sendinger: 0,
          kommentarer: '',
          dato: new Date().toISOString().split('T')[0]
        })
        setMessage({ type: 'success', text: 'Skift avsluttet!' })
      } else {
        const error = await response.json()
        setMessage({ type: 'error', text: error.feil || 'Feil ved avslutning av skift' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Feil ved avslutning av skift' })
    } finally {
      setLoading(false)
    }
  }

  const updateSkift = async (updates: Partial<Skift>) => {
    if (!isActiveShift || !skift.id) return

    setLoading(true)
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/skift/${skift.id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1]}`
        },
        body: JSON.stringify(updates)
      })

      if (response.ok) {
        const updatedShift = await response.json()
        setSkift(updatedShift)
        setMessage({ type: 'success', text: 'Skift oppdatert!' })
      } else {
        const error = await response.json()
        setMessage({ type: 'error', text: error.feil || 'Feil ved oppdatering av skift' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Feil ved oppdatering av skift' })
    } finally {
      setLoading(false)
    }
  }

  if (!sjåfør) {
    return <div>Laster...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">KS Transport</h1>
            <p className="text-gray-600">Velkommen, {sjåfør.navn}</p>
          </div>
          <Button onClick={logout} variant="outline">
            Logg ut
          </Button>
        </div>

        {/* Message */}
        {message && (
          <Alert className={message.type === 'error' ? 'border-red-500' : 'border-green-500'}>
            <AlertDescription>{message.text}</AlertDescription>
          </Alert>
        )}

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Skiftregistrering */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                {isActiveShift ? 'Aktivt Skift' : 'Start Skift'}
              </CardTitle>
              <CardDescription>
                {isActiveShift ? 'Registrer informasjon for ditt pågående skift' : 'Velg bil og sone for å starte skiftet'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Bil velger */}
              <div>
                <Label htmlFor="bil">Bil</Label>
                <Select 
                  value={skift.bil_id.toString()} 
                  onValueChange={(value) => setSkift({...skift, bil_id: parseInt(value)})}
                  disabled={isActiveShift}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Velg bil" />
                  </SelectTrigger>
                  <SelectContent>
                    {biler.map((bil) => (
                      <SelectItem key={bil.id} value={bil.id.toString()}>
                        {bil.registreringsnummer} - {bil.merke} {bil.modell} ({bil.årsmodell})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Sone velger */}
              <div>
                <Label htmlFor="sone">Sone</Label>
                <Select 
                  value={skift.sone_id.toString()} 
                  onValueChange={(value) => setSkift({...skift, sone_id: parseInt(value)})}
                  disabled={isActiveShift}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Velg sone" />
                  </SelectTrigger>
                  <SelectContent>
                    {soner.map((sone) => (
                      <SelectItem key={sone.id} value={sone.id.toString()}>
                        {sone.navn}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Antall sendinger */}
              <div>
                <Label htmlFor="sendinger">Antall sendinger</Label>
                <Input
                  id="sendinger"
                  type="number"
                  value={skift.antall_sendinger}
                  onChange={(e) => updateSkift({ antall_sendinger: parseInt(e.target.value) || 0 })}
                  disabled={!isActiveShift}
                />
              </div>

              {/* Pause */}
              <div>
                <Label htmlFor="pause">Pause (minutter)</Label>
                <Input
                  id="pause"
                  type="number"
                  value={skift.pause_minutter}
                  onChange={(e) => updateSkift({ pause_minutter: parseInt(e.target.value) || 0 })}
                  disabled={!isActiveShift}
                />
              </div>

              {/* Kommentar */}
              <div>
                <Label htmlFor="kommentar">Kommentar</Label>
                <Textarea
                  id="kommentar"
                  value={skift.kommentarer}
                  onChange={(e) => updateSkift({ kommentarer: e.target.value })}
                  disabled={!isActiveShift}
                  placeholder="Legg til kommentarer om skiftet..."
                />
              </div>

              {/* Knapper */}
              <div className="flex gap-2">
                {!isActiveShift ? (
                  <Button onClick={startSkift} disabled={loading} className="flex-1">
                    <Clock className="h-4 w-4 mr-2" />
                    Start Skift
                  </Button>
                ) : (
                  <Button onClick={sluttSkift} disabled={loading} variant="destructive" className="flex-1">
                    <Clock className="h-4 w-4 mr-2" />
                    Avslutt Skift
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Hurtigfunksjoner */}
          <Card>
            <CardHeader>
              <CardTitle>Hurtigfunksjoner</CardTitle>
              <CardDescription>Registrer avvik og send forbedringsforslag</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => window.location.href = '/avvik'}
              >
                <AlertTriangle className="h-4 w-4 mr-2" />
                Registrer Avvik
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => window.location.href = '/forbedringsforslag'}
              >
                <Lightbulb className="h-4 w-4 mr-2" />
                Send Forbedringsforslag
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => window.location.href = '/kalender'}
              >
                <Calendar className="h-4 w-4 mr-2" />
                Se Kalender
              </Button>
              {sjåfør.epost === 'admin@kstransport.no' && (
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => window.location.href = '/admin'}
                >
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Admin Panel
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Nylig Aktivitet</CardTitle>
            <CardDescription>Oversikt over dine siste registreringer</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <Clock className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500">Ingen nylig aktivitet</p>
              <p className="text-sm text-gray-400 mt-2">Start et skift for å se aktivitet her</p>
            </div>
          </CardContent>
        </Card>

        {/* Status info */}
        {isActiveShift && (
          <Card>
            <CardHeader>
              <CardTitle>Skift Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="font-medium">Startet:</p>
                  <p>{new Date(skift.start_tid).toLocaleString('no-NO')}</p>
                </div>
                <div>
                  <p className="font-medium">Bil:</p>
                  <p>{biler.find(b => b.id === skift.bil_id)?.registreringsnummer}</p>
                </div>
                <div>
                  <p className="font-medium">Sone:</p>
                  <p>{soner.find(s => s.id === skift.sone_id)?.navn}</p>
                </div>
                <div>
                  <p className="font-medium">Sendinger:</p>
                  <p>{skift.antall_sendinger}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
