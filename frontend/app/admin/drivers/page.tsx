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
  Users, 
  Plus, 
  Edit, 
  Trash,
  ArrowLeft
} from 'lucide-react'

interface Sjåfør {
  id: number
  navn: string
  epost: string
  telefon: string
  aktiv: boolean
  admin: boolean
}

export default function DriversPage() {
  const { sjåfør, isLoading } = useAuth()
  const router = useRouter()
  const [sjåfører, setSjåfører] = useState<Sjåfør[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [showSjåførForm, setShowSjåførForm] = useState(false)
  const [editingSjåfør, setEditingSjåfør] = useState<Sjåfør | null>(null)
  const [sjåførForm, setSjåførForm] = useState({
    navn: '',
    epost: '',
    passord: '',
    telefon: '',
    aktiv: true,
    admin: false
  })

  useEffect(() => {
    if (!isLoading && !sjåfør) {
      router.push('/login')
    } else if (sjåfør) {
      if (!sjåfør.admin) {
        router.push('/')
        return
      }
      loadSjåfører()
    }
  }, [sjåfør, isLoading, router])

  const loadSjåfører = async () => {
    setLoading(true)
    try {
      const token = document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1]
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/crud/drivers`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (response.ok) {
        const data = await response.json()
        setSjåfører(data)
      } else {
        logger.error('Feil ved henting av sjåfører:', response.status, await response.text())
      }
    } catch (error) {
      logger.error('Feil ved lasting av sjåfører:', error)
      setMessage({ type: 'error', text: 'Feil ved lasting av sjåfører' })
    } finally {
      setLoading(false)
    }
  }

  const openSjåførForm = (sjåfør?: Sjåfør) => {
    if (sjåfør) {
      setEditingSjåfør(sjåfør)
      setSjåførForm({
        navn: sjåfør.navn,
        epost: sjåfør.epost,
        passord: '',
        telefon: sjåfør.telefon || '',
        aktiv: sjåfør.aktiv,
        admin: sjåfør.admin
      })
    } else {
      setEditingSjåfør(null)
      setSjåførForm({
        navn: '',
        epost: '',
        passord: '',
        telefon: '',
        aktiv: true,
        admin: false
      })
    }
    setShowSjåførForm(true)
  }

  const closeSjåførForm = () => {
    setShowSjåførForm(false)
    setEditingSjåfør(null)
    setSjåførForm({
      navn: '',
      epost: '',
      passord: '',
      telefon: '',
      aktiv: true,
      admin: false
    })
  }

  const saveSjåfør = async () => {
    try {
      const token = document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1]
      const url = `${process.env.NEXT_PUBLIC_API_URL}/crud/drivers`
      
      let response
      if (editingSjåfør) {
        // Oppdater eksisterende
        response = await fetch(`${url}/${editingSjåfør.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(sjåførForm)
        })
      } else {
        // Opprett ny
        response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(sjåførForm)
        })
      }

      if (response.ok) {
        setMessage({ type: 'success', text: `Sjåfør ${editingSjåfør ? 'oppdatert' : 'opprettet'}!` })
        loadSjåfører()
        closeSjåførForm()
      } else {
        const error = await response.json()
        setMessage({ type: 'error', text: error.feil || 'Feil ved lagring' })
      }
    } catch (error) {
      logger.error('Error in saveSjåfør:', error)
      setMessage({ type: 'error', text: 'Feil ved lagring' })
    }
  }

  const deleteSjåfør = async (id: number) => {
    if (!confirm('Er du sikker på at du vil slette denne sjåføreren?')) return

    try {
      const token = document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1]
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/crud/drivers/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        setMessage({ type: 'success', text: 'Sjåfør slettet!' })
        loadSjåfører()
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
                <h1 className="text-xl font-bold text-gray-900">Sjåfører</h1>
                <p className="text-gray-600 text-sm">Administrer alle sjåfører</p>
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
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{sjåfører.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Aktive</CardTitle>
              <Users className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {sjåfører.filter(s => s.aktiv).length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Admin</CardTitle>
              <Users className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {sjåfører.filter(s => s.admin).length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sjåfører Liste */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-lg">Alle sjåfører</CardTitle>
                <CardDescription>Administrer alle registrerte sjåfører</CardDescription>
              </div>
              <Button onClick={() => openSjåførForm()}>
                <Plus className="h-4 w-4 mr-2" />
                Legg til sjåfør
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="text-sm text-gray-500 mt-2">Laster sjåfører...</p>
              </div>
            ) : sjåfører.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p className="text-sm">Ingen sjåfører registrert</p>
                <Button 
                  className="mt-3" 
                  onClick={() => openSjåførForm()}
                >
                  Legg til første sjåfør
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {sjåfører.map((sjåførItem) => (
                  <div key={sjåførItem.id} className="border rounded-lg p-4 bg-gray-50 hover:bg-gray-100 transition-colors">
                    <div className="flex justify-between items-start">
                      <div 
                        className="flex-1 cursor-pointer"
                        onClick={() => router.push(`/admin/drivers/${sjåførItem.id}`)}
                      >
                        <div className="flex items-center space-x-2 mb-2">
                          <h3 className="font-medium text-lg hover:text-blue-600">{sjåførItem.navn}</h3>
                          {sjåførItem.admin && (
                            <Badge variant="destructive" className="text-xs">Admin</Badge>
                          )}
                          <Badge variant={sjåførItem.aktiv ? 'default' : 'secondary'} className="text-xs">
                            {sjåførItem.aktiv ? 'Aktiv' : 'Inaktiv'}
                          </Badge>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">E-post:</span> {sjåførItem.epost}
                          </p>
                          {sjåførItem.telefon && (
                            <p className="text-sm text-gray-600">
                              <span className="font-medium">Telefon:</span> {sjåførItem.telefon}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => router.push(`/admin/drivers/${sjåførItem.id}`)}
                        >
                          <Users className="h-4 w-4 mr-1" />
                          Se oversikt
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => openSjåførForm(sjåførItem)}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Rediger
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => deleteSjåfør(sjåførItem.id)}
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

        {/* Sjåfør Form Modal */}
        {showSjåførForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
              <h2 className="text-lg font-semibold mb-4">
                {editingSjåfør ? 'Rediger sjåfør' : 'Legg til ny sjåfør'}
              </h2>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="navn">Navn *</Label>
                  <Input
                    id="navn"
                    value={sjåførForm.navn}
                    onChange={(e) => setSjåførForm({ ...sjåførForm, navn: e.target.value })}
                    placeholder="Fullt navn"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="epost">E-post *</Label>
                  <Input
                    id="epost"
                    type="email"
                    value={sjåførForm.epost}
                    onChange={(e) => setSjåførForm({ ...sjåførForm, epost: e.target.value })}
                    placeholder="epost@eksempel.no"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="passord">
                    Passord {editingSjåfør ? '(la stå tomt for å beholde nåværende)' : '*'}
                  </Label>
                  <Input
                    id="passord"
                    type="password"
                    value={sjåførForm.passord}
                    onChange={(e) => setSjåførForm({ ...sjåførForm, passord: e.target.value })}
                    placeholder="Minimum 6 tegn"
                    required={!editingSjåfør}
                  />
                </div>
                
                <div>
                  <Label htmlFor="telefon">Telefon</Label>
                  <Input
                    id="telefon"
                    value={sjåførForm.telefon}
                    onChange={(e) => setSjåførForm({ ...sjåførForm, telefon: e.target.value })}
                    placeholder="+47 123 45 678"
                  />
                </div>
                
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="aktiv"
                      checked={sjåførForm.aktiv}
                      onChange={(e) => setSjåførForm({ ...sjåførForm, aktiv: e.target.checked })}
                    />
                    <Label htmlFor="aktiv">Aktiv</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="admin"
                      checked={sjåførForm.admin}
                      onChange={(e) => setSjåførForm({ ...sjåførForm, admin: e.target.checked })}
                    />
                    <Label htmlFor="admin">Admin</Label>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end space-x-2 mt-6">
                <Button variant="outline" onClick={closeSjåførForm}>
                  Avbryt
                </Button>
                <Button onClick={saveSjåfør}>
                  {editingSjåfør ? 'Oppdater' : 'Opprett'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
