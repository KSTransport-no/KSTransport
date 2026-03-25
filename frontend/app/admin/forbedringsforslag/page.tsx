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
import { Lightbulb, Plus, Clock, CheckCircle, XCircle, Search, Filter, ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Forbedringsforslag {
  id: number
  tittel: string
  beskrivelse: string
  opprettet: string
  status: 'ny' | 'under behandling' | 'besvart'
  admin_kommentar?: string
  admin_navn?: string
  sjåfør_navn: string
  behandlet_av_navn?: string
}

const STATUS_OPTIONS = [
  { value: 'ny', label: 'Ny' },
  { value: 'under behandling', label: 'Under behandling' },
  { value: 'besvart', label: 'Besvart' }
]

export default function ForbedringsforslagAdminPage() {
  const { sjåfør } = useAuth()
  const router = useRouter()
  const [forslag, setForslag] = useState<Forbedringsforslag[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [showDialog, setShowDialog] = useState(false)
  const [editingForslag, setEditingForslag] = useState<Forbedringsforslag | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('alle')
  const [sjåførFilter, setSjåførFilter] = useState('alle')
  const [sjåfører, setSjåfører] = useState<{id: number, navn: string}[]>([])

  const [formData, setFormData] = useState({
    status: 'ny',
    admin_kommentar: ''
  })

  useEffect(() => {
    if (sjåfør) {
      loadForslag()
      loadSjåfører()
    }
  }, [sjåfør])

  const loadForslag = async () => {
    try {
      setLoading(true)
      const token = document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1]
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/forbedringsforslag`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (response.ok) {
        const data = await response.json()
        setForslag(data)
      } else {
        setMessage({ type: 'error', text: 'Feil ved henting av forbedringsforslag' })
      }
    } catch (error) {
      logger.error('Feil ved henting av forbedringsforslag:', error)
      setMessage({ type: 'error', text: 'Feil ved henting av forbedringsforslag' })
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

  const handleEdit = (forslagItem: Forbedringsforslag) => {
    setEditingForslag(forslagItem)
    setFormData({
      status: forslagItem.status || 'ny',
      admin_kommentar: forslagItem.admin_kommentar || ''
    })
    setShowDialog(true)
  }

  const handleSubmit = async () => {
    if (!editingForslag) return

    try {
      setLoading(true)
      const token = document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1]
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/crud/forbedringsforslag/${editingForslag.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        setMessage({ type: 'success', text: 'Forbedringsforslag oppdatert!' })
        setShowDialog(false)
        setEditingForslag(null)
        loadForslag()
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
      case 'ny': return 'text-blue-600 bg-blue-100'
      case 'under_behandling': return 'text-yellow-600 bg-yellow-100'
      case 'godkjent': return 'text-green-600 bg-green-100'
      case 'avvist': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ny': return <Lightbulb className="h-4 w-4" />
      case 'under_behandling': return <Clock className="h-4 w-4" />
      case 'godkjent': return <CheckCircle className="h-4 w-4" />
      case 'avvist': return <XCircle className="h-4 w-4" />
      default: return <Lightbulb className="h-4 w-4" />
    }
  }

  const filtrerForslag = () => {
    let filtrerte = forslag

    if (searchTerm) {
      filtrerte = filtrerte.filter(f => 
        f.tittel.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.beskrivelse.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.sjåfør_navn.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (statusFilter !== 'alle') {
      filtrerte = filtrerte.filter(f => f.status === statusFilter)
    }

    if (sjåførFilter !== 'alle') {
      const sjåførNavn = sjåfører.find(s => s.id === parseInt(sjåførFilter))?.navn
      filtrerte = filtrerte.filter(f => f.sjåfør_navn === sjåførNavn)
    }

    return filtrerte
  }

  const filtrerteForslag = filtrerForslag()

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
                <h1 className="text-lg sm:text-xl font-bold text-gray-900">Forbedringsforslag-håndtering</h1>
                <p className="text-gray-600 text-xs sm:text-sm">Administrer forbedringsforslag fra sjåfører</p>
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="search">Søk</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="search"
                    placeholder="Søk i forslag..."
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
                  setSjåførFilter('alle')
                }}
              >
                Nullstill filtre
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Forslag liste */}
        <div className="space-y-4">
          {filtrerteForslag.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Lightbulb className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p className="text-gray-500">
                  {forslag.length === 0 ? 'Ingen forbedringsforslag mottatt' : 'Ingen forslag matcher filtrene'}
                </p>
              </CardContent>
            </Card>
          ) : (
            filtrerteForslag.map((forslagItem) => (
              <Card key={forslagItem.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <CardTitle className="text-lg">{forslagItem.tittel}</CardTitle>
                        <Badge className={getStatusColor(forslagItem.status || 'ny')}>
                          {getStatusIcon(forslagItem.status || 'ny')}
                          <span className="ml-1">
                            {(forslagItem.status || 'ny').charAt(0).toUpperCase() + (forslagItem.status || 'ny').slice(1).replace('_', ' ')}
                          </span>
                        </Badge>
                      </div>
                      <CardDescription>
                        <div className="space-y-1">
                          <div>Sjåfør: {forslagItem.sjåfør_navn}</div>
                          <div>Opprettet: {new Date(forslagItem.opprettet).toLocaleDateString('no-NO')}</div>
                          {forslagItem.behandlet_av_navn && (
                            <div>Behandlet av: {forslagItem.behandlet_av_navn}</div>
                          )}
                        </div>
                      </CardDescription>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleEdit(forslagItem)}
                    >
                      Rediger
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <Label className="text-sm font-medium">Beskrivelse:</Label>
                      <p className="text-gray-700 mt-1">{forslagItem.beskrivelse}</p>
                    </div>
                    {forslagItem.admin_kommentar && (
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <Label className="text-sm font-medium text-gray-600">{forslagItem.admin_navn || 'Admin'}:</Label>
                        <p className="text-sm text-gray-700 mt-1">{forslagItem.admin_kommentar}</p>
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
              <DialogTitle>Rediger forbedringsforslag</DialogTitle>
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
