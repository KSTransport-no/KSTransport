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
  Key, 
  Plus, 
  Edit, 
  Trash,
  ArrowLeft,
  CheckCircle,
  XCircle,
  LogOut
} from 'lucide-react'

interface SgaKode {
  id: number
  kode: string
  beskrivelse?: string
  skal_faktureres: boolean
  aktiv: boolean
  opprettet?: string
  sist_endret?: string
}

export default function SgaKoderPage() {
  const { sjåfør, isLoading, logout } = useAuth()
  const router = useRouter()
  const [sgaKoder, setSgaKoder] = useState<SgaKode[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [showSgaForm, setShowSgaForm] = useState(false)
  const [editingSga, setEditingSga] = useState<SgaKode | null>(null)
  const [sgaForm, setSgaForm] = useState({
    kode: '',
    beskrivelse: '',
    skal_faktureres: false,
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
      loadSgaKoder()
    }
  }, [sjåfør, isLoading, router])

  const loadSgaKoder = async () => {
    setLoading(true)
    try {
      const token = document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1]
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/crud/sga-koder`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (response.ok) {
        const data = await response.json()
        setSgaKoder(data)
      } else {
        logger.error(`Feil ved henting av SGA-koder: ${response.status} ${await response.text()}`)
        setMessage({ type: 'error', text: 'Feil ved henting av SGA-koder' })
      }
    } catch (error) {
      logger.error('Feil ved lasting av SGA-koder:', error)
      setMessage({ type: 'error', text: 'Feil ved lasting av SGA-koder' })
    } finally {
      setLoading(false)
    }
  }

  const openSgaForm = (sga?: SgaKode) => {
    if (sga) {
      setEditingSga(sga)
      setSgaForm({
        kode: sga.kode,
        beskrivelse: sga.beskrivelse || '',
        skal_faktureres: sga.skal_faktureres,
        aktiv: sga.aktiv
      })
    } else {
      setEditingSga(null)
      setSgaForm({
        kode: '',
        beskrivelse: '',
        skal_faktureres: false,
        aktiv: true
      })
    }
    setShowSgaForm(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!sgaForm.kode.trim()) {
      setMessage({ type: 'error', text: 'Kode er påkrevd' })
      return
    }

    try {
      const token = document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1]
      const url = editingSga 
        ? `${process.env.NEXT_PUBLIC_API_URL}/crud/sga-koder/${editingSga.id}`
        : `${process.env.NEXT_PUBLIC_API_URL}/crud/sga-koder`
      
      const response = await fetch(url, {
        method: editingSga ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          kode: sgaForm.kode.trim(),
          beskrivelse: sgaForm.beskrivelse.trim() || null,
          skal_faktureres: sgaForm.skal_faktureres,
          aktiv: sgaForm.aktiv
        })
      })

      if (response.ok) {
        setMessage({ type: 'success', text: editingSga ? 'SGA-kode oppdatert' : 'SGA-kode opprettet' })
        setShowSgaForm(false)
        loadSgaKoder()
        setTimeout(() => setMessage(null), 3000)
      } else {
        const error = await response.json()
        setMessage({ type: 'error', text: error.feil || 'Feil ved lagring' })
        setTimeout(() => setMessage(null), 5000)
      }
    } catch (error) {
      logger.error('Feil ved lagring av SGA-kode:', error)
      setMessage({ type: 'error', text: 'Serverfeil ved lagring' })
      setTimeout(() => setMessage(null), 5000)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Er du sikker på at du vil slette denne SGA-koden?')) return

    try {
      const token = document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1]
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/crud/sga-koder/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        const result = await response.json()
        setMessage({ type: 'success', text: result.melding || 'SGA-kode slettet' })
        loadSgaKoder()
        setTimeout(() => setMessage(null), 3000)
      } else {
        const error = await response.json()
        setMessage({ type: 'error', text: error.feil || 'Feil ved sletting' })
        setTimeout(() => setMessage(null), 5000)
      }
    } catch (error) {
      logger.error('Feil ved sletting av SGA-kode:', error)
      setMessage({ type: 'error', text: 'Serverfeil ved sletting' })
      setTimeout(() => setMessage(null), 5000)
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

  const aktiveKoder = sgaKoder.filter(s => s.aktiv).length
  const inaktiveKoder = sgaKoder.filter(s => !s.aktiv).length
  const fakturerbareKoder = sgaKoder.filter(s => s.skal_faktureres && s.aktiv).length

  return (
    <div className="min-h-screen bg-gray-50 p-2 sm:p-4">
      <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
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
                <h1 className="text-lg sm:text-xl font-bold text-gray-900">SGA-koder</h1>
                <p className="text-gray-600 text-xs sm:text-sm">Administrer SGA-koder for fakturering</p>
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
              <Key className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-3 sm:p-4 pt-0">
              <div className="text-xl sm:text-2xl font-bold">{sgaKoder.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-4">
              <CardTitle className="text-xs sm:text-sm font-medium">Aktive</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent className="p-3 sm:p-4 pt-0">
              <div className="text-xl sm:text-2xl font-bold text-green-600">{aktiveKoder}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-4">
              <CardTitle className="text-xs sm:text-sm font-medium">Fakturerbare</CardTitle>
              <CheckCircle className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent className="p-3 sm:p-4 pt-0">
              <div className="text-xl sm:text-2xl font-bold text-blue-600">{fakturerbareKoder}</div>
            </CardContent>
          </Card>
        </div>

        {/* SGA-koder Liste */}
        <Card>
          <CardHeader className="p-3 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base sm:text-lg">SGA-koder</CardTitle>
                <CardDescription className="text-xs sm:text-sm">Administrer alle SGA-koder</CardDescription>
              </div>
              <Button onClick={() => openSgaForm()} size="sm" className="text-xs sm:text-sm">
                <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                Legg til
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-3 sm:p-6">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="text-sm text-gray-500 mt-2">Laster SGA-koder...</p>
              </div>
            ) : sgaKoder.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Key className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p className="text-sm">Ingen SGA-koder registrert</p>
              </div>
            ) : (
              <div className="space-y-3">
                {sgaKoder.map((sga) => (
                  <div key={sga.id} className={`border rounded-lg p-4 ${sga.aktiv ? 'bg-white' : 'bg-gray-50'}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-base">{sga.kode}</h3>
                          {sga.aktiv ? (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              Aktiv
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-gray-100 text-gray-600 border-gray-200">
                              Inaktiv
                            </Badge>
                          )}
                          {sga.skal_faktureres && (
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                              Fakturerbar
                            </Badge>
                          )}
                        </div>
                        {sga.beskrivelse && (
                          <p className="text-sm text-gray-600 mb-2">{sga.beskrivelse}</p>
                        )}
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          {sga.opprettet && (
                            <span>Opprettet: {new Date(sga.opprettet).toLocaleDateString('no-NO')}</span>
                          )}
                          {sga.sist_endret && (
                            <span>Sist endret: {new Date(sga.sist_endret).toLocaleDateString('no-NO')}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex space-x-2 ml-4">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openSgaForm(sga)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(sga.id)}
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                        >
                          <Trash className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Form Dialog */}
        {showSgaForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-md">
              <CardHeader className="p-3 sm:p-6">
                <CardTitle className="text-base sm:text-lg">
                  {editingSga ? 'Rediger SGA-kode' : 'Ny SGA-kode'}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="kode">Kode *</Label>
                    <Input
                      id="kode"
                      value={sgaForm.kode}
                      onChange={(e) => setSgaForm({ ...sgaForm, kode: e.target.value })}
                      placeholder="f.eks. SGA001"
                      required
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="beskrivelse">Beskrivelse</Label>
                    <Textarea
                      id="beskrivelse"
                      value={sgaForm.beskrivelse}
                      onChange={(e) => setSgaForm({ ...sgaForm, beskrivelse: e.target.value })}
                      placeholder="Beskrivelse av SGA-koden"
                      rows={3}
                      className="mt-1"
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="skal_faktureres"
                      checked={sgaForm.skal_faktureres}
                      onChange={(e) => setSgaForm({ ...sgaForm, skal_faktureres: e.target.checked })}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <Label htmlFor="skal_faktureres" className="cursor-pointer">
                      Skal faktureres
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="aktiv"
                      checked={sgaForm.aktiv}
                      onChange={(e) => setSgaForm({ ...sgaForm, aktiv: e.target.checked })}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <Label htmlFor="aktiv" className="cursor-pointer">
                      Aktiv
                    </Label>
                  </div>

                  <div className="flex justify-end space-x-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowSgaForm(false)}
                    >
                      Avbryt
                    </Button>
                    <Button type="submit">
                      {editingSga ? 'Oppdater' : 'Opprett'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}

