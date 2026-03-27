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
import { 
  Truck, 
  Plus, 
  Edit, 
  Trash,
  ArrowLeft
} from 'lucide-react'

interface Bil {
  id: number
  registreringsnummer: string
  merke: string
  modell: string
  årsmodell: number
  aktiv: boolean
}

export default function BilerPage() {
  const { sjåfør, isLoading } = useAuth()
  const router = useRouter()
  const [biler, setBiler] = useState<Bil[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [showBilForm, setShowBilForm] = useState(false)
  const [editingBil, setEditingBil] = useState<Bil | null>(null)
  const [bilForm, setBilForm] = useState({
    registreringsnummer: '',
    merke: '',
    modell: '',
    årsmodell: new Date().getFullYear(),
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
      loadBiler()
    }
  }, [sjåfør, isLoading, router])

  const loadBiler = async () => {
    setLoading(true)
    try {
      const token = document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1]
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/crud/biler`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (response.ok) {
        const data = await response.json()
        setBiler(data)
      } else {
        logger.error(`Feil ved henting av biler: ${response.status} ${await response.text()}`)
      }
    } catch (error) {
      logger.error('Feil ved lasting av biler:', error)
      setMessage({ type: 'error', text: 'Feil ved lasting av biler' })
    } finally {
      setLoading(false)
    }
  }

  const openBilForm = (bil?: Bil) => {
    if (bil) {
      setEditingBil(bil)
      setBilForm({
        registreringsnummer: bil.registreringsnummer,
        merke: bil.merke || '',
        modell: bil.modell || '',
        årsmodell: bil.årsmodell || new Date().getFullYear(),
        aktiv: bil.aktiv
      })
    } else {
      setEditingBil(null)
      setBilForm({
        registreringsnummer: '',
        merke: '',
        modell: '',
        årsmodell: new Date().getFullYear(),
        aktiv: true
      })
    }
    setShowBilForm(true)
  }

  const closeBilForm = () => {
    setShowBilForm(false)
    setEditingBil(null)
    setBilForm({
      registreringsnummer: '',
      merke: '',
      modell: '',
      årsmodell: new Date().getFullYear(),
      aktiv: true
    })
  }

  const saveBil = async () => {
    try {
      const token = document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1]
      const url = `${process.env.NEXT_PUBLIC_API_URL}/crud/biler`
      
      let response
      if (editingBil) {
        // Oppdater eksisterende
        response = await fetch(`${url}/${editingBil.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(bilForm)
        })
      } else {
        // Opprett ny
        response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(bilForm)
        })
      }

      if (response.ok) {
        setMessage({ type: 'success', text: `Bil ${editingBil ? 'oppdatert' : 'opprettet'}!` })
        loadBiler()
        closeBilForm()
      } else {
        const error = await response.json()
        setMessage({ type: 'error', text: error.feil || 'Feil ved lagring' })
      }
    } catch (error) {
      logger.error('Error in saveBil:', error)
      setMessage({ type: 'error', text: 'Feil ved lagring' })
    }
  }

  const deleteBil = async (id: number) => {
    if (!confirm('Er du sikker på at du vil slette denne bilen?')) return

    try {
      const token = document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1]
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/crud/biler/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        setMessage({ type: 'success', text: 'Bil slettet!' })
        loadBiler()
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
                <h1 className="text-xl font-bold text-gray-900">Biler</h1>
                <p className="text-gray-600 text-sm">Administrer alle biler</p>
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
              <Truck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{biler.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Aktive</CardTitle>
              <Truck className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {biler.filter(b => b.aktiv).length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Inaktive</CardTitle>
              <Truck className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {biler.filter(b => !b.aktiv).length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Biler Liste */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-lg">Alle biler</CardTitle>
                <CardDescription>Administrer alle registrerte biler</CardDescription>
              </div>
              <Button onClick={() => openBilForm()}>
                <Plus className="h-4 w-4 mr-2" />
                Legg til bil
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="text-sm text-gray-500 mt-2">Laster biler...</p>
              </div>
            ) : biler.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Truck className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p className="text-sm">Ingen biler registrert</p>
                <Button 
                  className="mt-3" 
                  onClick={() => openBilForm()}
                >
                  Legg til første bil
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {biler.map((bilItem) => (
                  <div key={bilItem.id} className="border rounded-lg p-4 bg-gray-50 hover:bg-gray-100 transition-colors">
                    <div className="flex justify-between items-start">
                      <div 
                        className="flex-1 cursor-pointer"
                        onClick={() => router.push(`/admin/biler/${bilItem.id}`)}
                      >
                        <div className="flex items-center space-x-2 mb-2">
                          <h3 className="font-medium text-lg hover:text-blue-600">{bilItem.registreringsnummer}</h3>
                          <Badge variant={bilItem.aktiv ? 'default' : 'secondary'} className="text-xs">
                            {bilItem.aktiv ? 'Aktiv' : 'Inaktiv'}
                          </Badge>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">Merke:</span> {bilItem.merke || 'Ikke oppgitt'}
                          </p>
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">Modell:</span> {bilItem.modell || 'Ikke oppgitt'}
                          </p>
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">Årsmodell:</span> {bilItem.årsmodell}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => router.push(`/admin/biler/${bilItem.id}`)}
                        >
                          <Truck className="h-4 w-4 mr-1" />
                          Se oversikt
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => openBilForm(bilItem)}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Rediger
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => deleteBil(bilItem.id)}
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

        {/* Bil Form Modal */}
        {showBilForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
              <h2 className="text-lg font-semibold mb-4">
                {editingBil ? 'Rediger bil' : 'Legg til ny bil'}
              </h2>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="registreringsnummer">Registreringsnummer *</Label>
                  <Input
                    id="registreringsnummer"
                    value={bilForm.registreringsnummer}
                    onChange={(e) => setBilForm({ ...bilForm, registreringsnummer: e.target.value })}
                    placeholder="AB12345"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="merke">Merke</Label>
                  <Input
                    id="merke"
                    value={bilForm.merke}
                    onChange={(e) => setBilForm({ ...bilForm, merke: e.target.value })}
                    placeholder="Volvo, Scania, etc."
                  />
                </div>
                
                <div>
                  <Label htmlFor="modell">Modell</Label>
                  <Input
                    id="modell"
                    value={bilForm.modell}
                    onChange={(e) => setBilForm({ ...bilForm, modell: e.target.value })}
                    placeholder="FH, Actros, etc."
                  />
                </div>
                
                <div>
                  <Label htmlFor="årsmodell">Årsmodell</Label>
                  <Input
                    id="årsmodell"
                    type="number"
                    value={bilForm.årsmodell}
                    onChange={(e) => setBilForm({ ...bilForm, årsmodell: parseInt(e.target.value) })}
                    min="1900"
                    max="2030"
                  />
                </div>
                
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="aktiv"
                    checked={bilForm.aktiv}
                    onChange={(e) => setBilForm({ ...bilForm, aktiv: e.target.checked })}
                  />
                  <Label htmlFor="aktiv">Aktiv</Label>
                </div>
              </div>
              
              <div className="flex justify-end space-x-2 mt-6">
                <Button variant="outline" onClick={closeBilForm}>
                  Avbryt
                </Button>
                <Button onClick={saveBil}>
                  {editingBil ? 'Oppdater' : 'Opprett'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
