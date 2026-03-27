'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { logger } from '@/lib/logger'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, Clock, CheckCircle, XCircle, Search, Filter, ArrowLeft, Image, RotateCw } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Avvik {
  id: number
  type: string
  beskrivelse: string
  dato: string
  status: 'ny' | 'under_behandling' | 'løst' | 'avvist'
  admin_kommentar?: string
  admin_navn?: string
  sjåfør_navn: string
  skift_dato?: string
  bil_registreringsnummer?: string
  bilde_url?: string
}

const AVVIK_TYPER = [
  'Teknisk feil',
  'Forsinkelse', 
  'Sikkerhetsproblem',
  'Kommunikasjonsfeil',
  'Værforhold',
  'Trafikk',
  'Annet'
]

const STATUS_OPTIONS = [
  { value: 'ny', label: 'Ny' },
  { value: 'under_behandling', label: 'Under behandling' },
  { value: 'løst', label: 'Løst' },
  { value: 'avvist', label: 'Avvist' }
]

export default function AvvikAdminPage() {
  const { sjåfør } = useAuth()
  const router = useRouter()
  const [avvik, setAvvik] = useState<Avvik[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [showDialog, setShowDialog] = useState(false)
  const [editingAvvik, setEditingAvvik] = useState<Avvik | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('alle')
  const [typeFilter, setTypeFilter] = useState('alle')
  const [sjåførFilter, setSjåførFilter] = useState('alle')
  const [sjåfører, setSjåfører] = useState<{id: number, navn: string}[]>([])
  const [imageRotations, setImageRotations] = useState<{ [key: number]: number }>({})

  const [formData, setFormData] = useState({
    status: 'ny',
    admin_kommentar: ''
  })

  useEffect(() => {
    if (sjåfør) {
      loadAvvik()
      loadSjåfører()
    }
  }, [sjåfør])

  const loadAvvik = async () => {
    try {
      setLoading(true)
      const token = document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1]
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/avvik`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (response.ok) {
        const data = await response.json()
        setAvvik(data)
      } else {
        setMessage({ type: 'error', text: 'Feil ved henting av avvik' })
      }
    } catch (error) {
      logger.error('Feil ved henting av avvik:', error)
      setMessage({ type: 'error', text: 'Feil ved henting av avvik' })
    } finally {
      setLoading(false)
    }
  }

  const loadSjåfører = async () => {
    try {
      const token = document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1]
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/crud/drivers`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (response.ok) {
        const data = await response.json()
        setSjåfører(data.map((s: any) => ({ id: s.id, navn: s.navn })))
      }
    } catch (error) {
      logger.error('Feil ved henting av sjåfører:', error)
    }
  }

  const rotateImage = (avvikId: number) => {
    setImageRotations(prev => ({
      ...prev,
      [avvikId]: (prev[avvikId] || 0) + 90
    }))
  }

  const handleEdit = (avvikItem: Avvik) => {
    setEditingAvvik(avvikItem)
    setFormData({
      status: avvikItem.status || 'ny',
      admin_kommentar: avvikItem.admin_kommentar || ''
    })
    setShowDialog(true)
  }

  const handleSubmit = async () => {
    if (!editingAvvik) return

    try {
      setLoading(true)
      const token = document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1]
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/crud/avvik/${editingAvvik.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        setMessage({ type: 'success', text: 'Avvik oppdatert!' })
        setShowDialog(false)
        setEditingAvvik(null)
        loadAvvik()
      } else {
        const error = await response.json()
        setMessage({ type: 'error', text: error.feil || 'Feil ved oppdatering' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Feil ved oppdatering' })
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ny': return 'text-red-600 bg-red-100'
      case 'under_behandling': return 'text-yellow-600 bg-yellow-100'
      case 'løst': return 'text-green-600 bg-green-100'
      case 'avvist': return 'text-gray-600 bg-gray-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ny': return <AlertTriangle className="h-4 w-4" />
      case 'under_behandling': return <Clock className="h-4 w-4" />
      case 'løst': return <CheckCircle className="h-4 w-4" />
      case 'avvist': return <XCircle className="h-4 w-4" />
      default: return <AlertTriangle className="h-4 w-4" />
    }
  }

  const filtrerAvvik = () => {
    let filtrerte = avvik

    if (searchTerm) {
      filtrerte = filtrerte.filter(a => 
        a.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.beskrivelse.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.sjåfør_navn.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (statusFilter !== 'alle') {
      filtrerte = filtrerte.filter(a => a.status === statusFilter)
    }

    if (typeFilter !== 'alle') {
      filtrerte = filtrerte.filter(a => a.type === typeFilter)
    }

    if (sjåførFilter !== 'alle') {
      const sjåførNavn = sjåfører.find(s => s.id === parseInt(sjåførFilter))?.navn
      filtrerte = filtrerte.filter(a => a.sjåfør_navn === sjåførNavn)
    }

    return filtrerte
  }

  const filtrerteAvvik = filtrerAvvik()

  if (!sjåfør) {
    return <div>Laster...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50 p-2 sm:p-4">
      <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 sm:space-x-4">
              <Button variant="outline" size="sm" onClick={() => router.push('/admin')} className="text-xs sm:text-sm">
                <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Tilbake</span>
              </Button>
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-gray-900">Avvik-håndtering</h1>
                <p className="text-gray-600 text-xs sm:text-sm">Administrer rapporterte avvik</p>
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

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtre
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="search">Søk</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="search"
                    placeholder="Søk i avvik..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Alle statuser" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="alle">Alle statuser</SelectItem>
                    {STATUS_OPTIONS.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="type">Type</Label>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Alle typer" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="alle">Alle typer</SelectItem>
                    {AVVIK_TYPER.map(type => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="sjåfør">Sjåfør</Label>
                <Select value={sjåførFilter} onValueChange={setSjåførFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Alle sjåfører" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="alle">Alle sjåfører</SelectItem>
                    {sjåfører.map(sjåfør => (
                      <SelectItem key={sjåfør.id} value={sjåfør.id.toString()}>
                        {sjåfør.navn}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="mt-4">
              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchTerm('')
                  setStatusFilter('alle')
                  setTypeFilter('alle')
                  setSjåførFilter('alle')
                }}
              >
                Nullstill filtre
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Avvik liste */}
        <div className="space-y-4">
          {filtrerteAvvik.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p className="text-gray-500">
                  {avvik.length === 0 ? 'Ingen avvik registrert' : 'Ingen avvik matcher filtrene'}
                </p>
              </CardContent>
            </Card>
          ) : (
            filtrerteAvvik.map((avvikItem) => (
              <Card key={avvikItem.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <CardTitle className="text-lg">{avvikItem.type}</CardTitle>
                        <Badge className={getStatusColor(avvikItem.status || 'ny')}>
                          {getStatusIcon(avvikItem.status || 'ny')}
                          <span className="ml-1">
                            {(avvikItem.status || 'ny').charAt(0).toUpperCase() + (avvikItem.status || 'ny').slice(1)}
                          </span>
                        </Badge>
                      </div>
                      <CardDescription>
                        <div className="space-y-1">
                          <div>Sjåfør: {avvikItem.sjåfør_navn}</div>
                          <div>Dato: {new Date(avvikItem.dato).toLocaleDateString('no-NO')}</div>
                          {avvikItem.bil_registreringsnummer && (
                            <div>Bil: {avvikItem.bil_registreringsnummer}</div>
                          )}
                        </div>
                      </CardDescription>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleEdit(avvikItem)}
                    >
                      Rediger
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <Label className="text-sm font-medium">Beskrivelse:</Label>
                      <p className="text-gray-700 mt-1">{avvikItem.beskrivelse}</p>
                    </div>
                    {avvikItem.admin_kommentar && (
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <Label className="text-sm font-medium text-gray-600">{avvikItem.admin_navn || 'Admin'}:</Label>
                        <p className="text-sm text-gray-700 mt-1">{avvikItem.admin_kommentar}</p>
                      </div>
                    )}
                    
                    {/* Vis bilde hvis det finnes */}
                    {avvikItem.bilde_url && (
                      <div className="mt-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Image className="h-4 w-4 text-gray-500" />
                            <span className="text-sm text-gray-600">Vedlegg:</span>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => rotateImage(avvikItem.id)}
                            className="flex items-center gap-1"
                          >
                            <RotateCw className="h-3 w-3" />
                            <span className="text-xs">Roter</span>
                          </Button>
                        </div>
                        
                        {/* Bilde med fallback */}
                        <div className="relative">
                          <img 
                            src={avvikItem.bilde_url?.replace('http://localhost:3001', '') || avvikItem.bilde_url} 
                            alt="Avvik foto" 
                            className="w-full max-w-md rounded-lg border cursor-pointer hover:opacity-80 transition-opacity hover:shadow-lg"
                            style={{
                              transform: `rotate(${imageRotations[avvikItem.id] || 0}deg)`,
                              transition: 'transform 0.3s ease'
                            }}
                            onClick={() => {
                              logger.log('Klikker på bilde:', avvikItem.bilde_url);
                              window.open(avvikItem.bilde_url, '_blank');
                            }}
                            onError={(e) => {
                              logger.error('Bilde kunne ikke lastes:', avvikItem.bilde_url);
                              // Vis fallback i stedet for å skjule bildet
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              const fallback = target.nextElementSibling as HTMLElement;
                              if (fallback) fallback.style.display = 'block';
                            }}
                          />
                          
                          {/* Fallback hvis bilde ikke kan lastes */}
                          <div 
                            className="w-full max-w-md rounded-lg border bg-gray-100 p-4 text-center cursor-pointer hover:bg-gray-200 transition-colors"
                            style={{ display: 'none' }}
                            onClick={() => window.open(avvikItem.bilde_url, '_blank')}
                          >
                            <Image className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                            <p className="text-sm text-gray-600">Klikk for å se bilde</p>
                            <p className="text-xs text-gray-500 mt-1">URL: {avvikItem.bilde_url}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Edit Dialog */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Rediger avvik</DialogTitle>
              <DialogDescription>
                Oppdater status og legg til admin kommentar
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData({...formData, status: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="admin_kommentar">Admin kommentar</Label>
                <Textarea
                  id="admin_kommentar"
                  value={formData.admin_kommentar}
                  onChange={(e) => setFormData({...formData, admin_kommentar: e.target.value})}
                  placeholder="Legg til kommentar..."
                  rows={4}
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowDialog(false)}>
                  Avbryt
                </Button>
                <Button onClick={handleSubmit} disabled={loading}>
                  {loading ? 'Lagrer...' : 'Lagre endringer'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
