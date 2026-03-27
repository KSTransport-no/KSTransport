'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { logger } from '@/lib/logger'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { 
  Package, 
  Plus, 
  Edit, 
  Trash,
  ArrowLeft,
  MapPin,
  Scale,
  Box
} from 'lucide-react'

interface Oppdrag {
  id: number
  fra: string
  til: string
  vekt: number
  volum: number
  kommentar?: string
  aktiv: boolean
  opprettet: string
  sist_endret: string
}

export default function OppdragPage() {
  const { sjåfør, isLoading } = useAuth()
  const router = useRouter()
  const [oppdrag, setOppdrag] = useState<Oppdrag[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [showOppdragForm, setShowOppdragForm] = useState(false)
  const [editingOppdrag, setEditingOppdrag] = useState<Oppdrag | null>(null)
  const [oppdragForm, setOppdragForm] = useState({
    fra: '',
    til: '',
    vekt: '',
    volum: '',
    kommentar: '',
    aktiv: true
  })

  useEffect(() => {
    if (!isLoading && !sjåfør) {
      router.push('/login')
    } else if (sjåfør) {
      if (!sjåfør.admin) {
        router.push('/')
        return
      }
      loadOppdrag()
    }
  }, [sjåfør, isLoading, router])

  const loadOppdrag = async () => {
    setLoading(true)
    try {
      const token = document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1]
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/crud/oppdrag`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (response.ok) {
        const data = await response.json()
        setOppdrag(data)
      } else {
        logger.error(`Feil ved henting av oppdrag: ${response.status} ${await response.text()}`)
      }
    } catch (error) {
      logger.error('Feil ved lasting av oppdrag:', error)
      setMessage({ type: 'error', text: 'Feil ved lasting av oppdrag' })
    } finally {
      setLoading(false)
    }
  }

  const openOppdragForm = (oppdragItem?: Oppdrag) => {
    if (oppdragItem) {
      setEditingOppdrag(oppdragItem)
      setOppdragForm({
        fra: oppdragItem.fra,
        til: oppdragItem.til,
        vekt: oppdragItem.vekt.toString(),
        volum: oppdragItem.volum.toString(),
        kommentar: oppdragItem.kommentar || '',
        aktiv: oppdragItem.aktiv
      })
    } else {
      setEditingOppdrag(null)
      setOppdragForm({
        fra: '',
        til: '',
        vekt: '',
        volum: '',
        kommentar: '',
        aktiv: true
      })
    }
    setShowOppdragForm(true)
  }

  const closeOppdragForm = () => {
    setShowOppdragForm(false)
    setEditingOppdrag(null)
    setOppdragForm({
      fra: '',
      til: '',
      vekt: '',
      volum: '',
      kommentar: '',
      aktiv: true
    })
  }

  const saveOppdrag = async () => {
    if (!oppdragForm.fra || !oppdragForm.til) {
      setMessage({ type: 'error', text: 'Fra og Til er påkrevde felt' })
      return
    }

    try {
      const token = document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1]
      const url = `${process.env.NEXT_PUBLIC_API_URL}/crud/oppdrag`
      
      const body = {
        fra: oppdragForm.fra,
        til: oppdragForm.til,
        vekt: oppdragForm.vekt ? parseInt(oppdragForm.vekt) : 0,
        volum: oppdragForm.volum ? parseFloat(oppdragForm.volum) : 0,
        kommentar: oppdragForm.kommentar || null,
        aktiv: oppdragForm.aktiv
      }
      
      let response
      if (editingOppdrag) {
        // Oppdater eksisterende
        response = await fetch(`${url}/${editingOppdrag.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(body)
        })
      } else {
        // Opprett ny
        response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(body)
        })
      }

      if (response.ok) {
        setMessage({ type: 'success', text: `Oppdrag ${editingOppdrag ? 'oppdatert' : 'opprettet'}!` })
        loadOppdrag()
        closeOppdragForm()
      } else {
        const error = await response.json()
        setMessage({ type: 'error', text: error.feil || 'Feil ved lagring' })
      }
    } catch (error) {
      logger.error('Error in saveOppdrag:', error)
      setMessage({ type: 'error', text: 'Feil ved lagring' })
    }
  }

  const deleteOppdrag = async (id: number) => {
    if (!confirm('Er du sikker på at du vil slette dette oppdraget?')) return

    try {
      const token = document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1]
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/crud/oppdrag/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        setMessage({ type: 'success', text: 'Oppdrag slettet!' })
        loadOppdrag()
      } else {
        const error = await response.json()
        setMessage({ type: 'error', text: error.feil || 'Feil ved sletting' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Feil ved sletting' })
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!sjåfør) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 p-3">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => router.push('/admin')}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Tilbake</span>
              </Button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Oppdrag</h1>
                <p className="text-gray-600 text-sm">Administrer alle oppdrag</p>
              </div>
            </div>
            <img src="/logo.png" alt="KS Transport" className="h-24 sm:h-30 w-auto ml-2 sm:ml-3 flex-shrink-0" />
          </div>
        </div>

        {/* Message */}
        {message && (
          <Alert className={message.type === 'error' ? 'border-red-500' : 'border-green-500'}>
            <AlertDescription>{message.text}</AlertDescription>
          </Alert>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Totalt</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{oppdrag.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Aktive</CardTitle>
              <Package className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {oppdrag.filter(o => o.aktiv).length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Inaktive</CardTitle>
              <Package className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {oppdrag.filter(o => !o.aktiv).length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Oppdrag Liste */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-lg">Alle oppdrag</CardTitle>
                <CardDescription>Administrer alle registrerte oppdrag</CardDescription>
              </div>
              <Button onClick={() => openOppdragForm()}>
                <Plus className="h-4 w-4 mr-2" />
                Legg til oppdrag
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="text-sm text-gray-500 mt-2">Laster oppdrag...</p>
              </div>
            ) : oppdrag.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Package className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p className="text-sm">Ingen oppdrag registrert</p>
                <Button 
                  className="mt-3" 
                  onClick={() => openOppdragForm()}
                >
                  Legg til første oppdrag
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {oppdrag.map((oppdragItem) => (
                  <div key={oppdragItem.id} className="border rounded-lg p-4 bg-gray-50 hover:bg-gray-100 transition-colors">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h3 className="font-medium text-lg">Oppdrag #{oppdragItem.id}</h3>
                          <Badge variant={oppdragItem.aktiv ? 'default' : 'secondary'} className="text-xs">
                            {oppdragItem.aktiv ? 'Aktiv' : 'Inaktiv'}
                          </Badge>
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <MapPin className="h-4 w-4" />
                            <span className="font-medium">Fra:</span> {oppdragItem.fra}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <MapPin className="h-4 w-4" />
                            <span className="font-medium">Til:</span> {oppdragItem.til}
                          </div>
                          {oppdragItem.vekt > 0 && (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Scale className="h-4 w-4" />
                              <span className="font-medium">Vekt:</span> {oppdragItem.vekt} kg
                            </div>
                          )}
                          {oppdragItem.volum > 0 && (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Box className="h-4 w-4" />
                              <span className="font-medium">Volum:</span> {oppdragItem.volum} m³
                            </div>
                          )}
                          {oppdragItem.kommentar && (
                            <div className="text-sm text-gray-600 mt-2">
                              <span className="font-medium">Kommentar:</span> {oppdragItem.kommentar}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => openOppdragForm(oppdragItem)}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Rediger
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => deleteOppdrag(oppdragItem.id)}
                        >
                          <Trash className="h-4 w-4 mr-1" />
                          Slett
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Oppdrag Form Modal */}
        {showOppdragForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
              <h2 className="text-lg font-semibold mb-4">
                {editingOppdrag ? 'Rediger oppdrag' : 'Legg til nytt oppdrag'}
              </h2>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="fra">Fra *</Label>
                  <Input
                    id="fra"
                    value={oppdragForm.fra}
                    onChange={(e) => setOppdragForm({ ...oppdragForm, fra: e.target.value })}
                    placeholder="F.eks. Oslo, Sandnes, etc."
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="til">Til *</Label>
                  <Input
                    id="til"
                    value={oppdragForm.til}
                    onChange={(e) => setOppdragForm({ ...oppdragForm, til: e.target.value })}
                    placeholder="F.eks. Bergen, Stavanger, etc."
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="vekt">Vekt (kg)</Label>
                  <Input
                    id="vekt"
                    type="number"
                    min="0"
                    value={oppdragForm.vekt}
                    onChange={(e) => setOppdragForm({ ...oppdragForm, vekt: e.target.value })}
                    placeholder="0"
                  />
                </div>
                
                <div>
                  <Label htmlFor="volum">Volum (m³)</Label>
                  <Input
                    id="volum"
                    type="number"
                    step="0.01"
                    min="0"
                    value={oppdragForm.volum}
                    onChange={(e) => setOppdragForm({ ...oppdragForm, volum: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
                
                <div>
                  <Label htmlFor="kommentar">Kommentar (beskrivelse av kolli)</Label>
                  <Textarea
                    id="kommentar"
                    value={oppdragForm.kommentar}
                    onChange={(e) => setOppdragForm({ ...oppdragForm, kommentar: e.target.value })}
                    placeholder="Beskrivelse av kolli..."
                    rows={3}
                  />
                </div>
                
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="aktiv"
                    checked={oppdragForm.aktiv}
                    onChange={(e) => setOppdragForm({ ...oppdragForm, aktiv: e.target.checked })}
                  />
                  <Label htmlFor="aktiv">Aktiv</Label>
                </div>
              </div>
              
              <div className="flex justify-end space-x-2 mt-6">
                <Button variant="outline" onClick={closeOppdragForm}>
                  Avbryt
                </Button>
                <Button onClick={saveOppdrag}>
                  {editingOppdrag ? 'Oppdater' : 'Opprett'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

