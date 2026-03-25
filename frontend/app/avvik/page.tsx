'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import Cookies from 'js-cookie'
import { logger } from '@/lib/logger'
import { offlineFetch } from '@/lib/offlineApi'
import { useToast } from '@/hooks/use-toast'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, Plus, Clock, CheckCircle, Camera, X, Image, RotateCw, Grid3X3, List, Calendar, Edit, MessageCircle } from 'lucide-react'

interface Avvik {
  id: number
  type: string
  beskrivelse: string
  dato: string
  tid: string
  status: 'ny' | 'under_behandling' | 'løst'
  sjåfør_navn: string
  bilde_url?: string
  bilder?: Array<{
    id: number
    url: string
    navn: string
    størrelse: number
  }>
  admin_kommentar?: string
  admin_navn?: string
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

export default function AvvikPage() {
  const { sjåfør } = useAuth()
  const { toast } = useToast()
  const [avvik, setAvvik] = useState<Avvik[]>([])
  const [loading, setLoading] = useState(false)
  const [showDialog, setShowDialog] = useState(false)
  const [newAvvik, setNewAvvik] = useState({
    type: '',
    beskrivelse: '',
    bilde: null as File | null,
    bilder: [] as File[]
  })
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [capturedImages, setCapturedImages] = useState<string[]>([])
  const [imageRotations, setImageRotations] = useState<{ [key: number]: number }>({})
  const [editingAvvik, setEditingAvvik] = useState<number | null>(null)
  const [editFormData, setEditFormData] = useState({ type: '', beskrivelse: '' })
  const [kommentarer, setKommentarer] = useState<{[key: number]: any[]}>({})
  const [nyKommentar, setNyKommentar] = useState<{[key: number]: string}>({})
  const [visKommentarer, setVisKommentarer] = useState<{[key: number]: boolean}>({})
  const [selectedStatus, setSelectedStatus] = useState<'alle' | 'ny' | 'under_behandling' | 'løst'>('alle')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest')
  const [expandedAvvik, setExpandedAvvik] = useState<number | null>(null)

  useEffect(() => {
    if (sjåfør) {
      loadAvvik()
    }
  }, [sjåfør])

  useEffect(() => {
    if (sjåfør) {
      loadAvvik()
    }
  }, [selectedStatus])

  const loadAvvik = async () => {
    try {
      const token = document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1]
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/avvik`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (response.ok) {
        const data = await response.json()
        setAvvik(data)
      }
    } catch (error) {
      logger.error('Feil ved lasting av avvik:', error)
    }
  }

  const capturePhoto = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.multiple = true
    
    // iOS Safari fix: Ikke bruk capture attributt på iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    if (!isIOS) {
      input.capture = 'environment' // Bruk bakkamera på Android
    }
    
    input.onchange = (e) => {
      const files = Array.from((e.target as HTMLInputElement).files || [])
      if (files.length > 0) {
        logger.log('Files selected:', files.length)
        setNewAvvik({ ...newAvvik, bilder: [...newAvvik.bilder, ...files] })
        
        // Vis preview for alle bilder
        files.forEach(file => {
          const reader = new FileReader()
          reader.onload = (e) => {
            const result = e.target?.result as string
            logger.log('FileReader result length:', result?.length)
            setCapturedImages(prev => [...prev, result])
          }
          reader.onerror = (e) => {
            logger.error('FileReader error:', e)
          }
          reader.readAsDataURL(file)
        })
      } else {
        logger.log('No files selected')
      }
    }
    
    input.onerror = (e) => {
      logger.error('Input error:', e)
    }
    
    // iOS Safari fix: Legg til event listener for focus
    if (isIOS) {
      input.addEventListener('focus', () => {
        logger.log('Input focused on iOS')
      })
    }
    
    input.click()
  }

  const removePhoto = (index?: number) => {
    if (index !== undefined) {
      // Fjern spesifikt bilde
      setNewAvvik({ ...newAvvik, bilder: newAvvik.bilder.filter((_, i) => i !== index) })
      setCapturedImages(prev => prev.filter((_, i) => i !== index))
    } else {
      // Fjern alle bilder
      setNewAvvik({ ...newAvvik, bilder: [] })
      setCapturedImages([])
    }
  }

  const rotateImage = (avvikId: number) => {
    setImageRotations(prev => ({
      ...prev,
      [avvikId]: (prev[avvikId] || 0) + 90
    }))
  }

  const startEditAvvik = (avvik: any) => {
    setEditingAvvik(avvik.id)
    setEditFormData({
      type: avvik.type,
      beskrivelse: avvik.beskrivelse
    })
  }

  const cancelEditAvvik = () => {
    setEditingAvvik(null)
    setEditFormData({ type: '', beskrivelse: '' })
  }

  const saveEditAvvik = async () => {
    if (!editingAvvik) return

    try {
      const token = Cookies.get('token')
      if (!token) {
        setMessage({ type: 'error', text: 'Ikke logget inn' })
        return
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/avvik/${editingAvvik}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(editFormData)
      })

      if (response.ok) {
        setMessage({ type: 'success', text: 'Avvik oppdatert!' })
        loadAvvik()
        cancelEditAvvik()
      } else {
        const errorData = await response.json()
        setMessage({ type: 'error', text: errorData.feil || 'Feil ved oppdatering av avvik' })
      }
    } catch (error) {
      logger.error('Feil ved oppdatering av avvik:', error)
      setMessage({ type: 'error', text: 'Feil ved oppdatering av avvik' })
    }
  }

  const loadKommentarer = async (avvikId: number) => {
    try {
      const token = Cookies.get('token')
      if (!token) return

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/avvik/${avvikId}/kommentarer`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        const data = await response.json()
        setKommentarer(prev => ({ ...prev, [avvikId]: data }))
      }
    } catch (error) {
      logger.error('Feil ved henting av kommentarer:', error)
    }
  }

  const leggTilKommentar = async (avvikId: number) => {
    const kommentarTekst = nyKommentar[avvikId]
    if (!kommentarTekst?.trim()) return

    try {
      const token = Cookies.get('token')
      if (!token) {
        setMessage({ type: 'error', text: 'Ikke logget inn' })
        return
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/avvik/${avvikId}/kommentarer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ kommentar: kommentarTekst })
      })

      if (response.ok) {
        setMessage({ type: 'success', text: 'Kommentar lagt til!' })
        setNyKommentar(prev => ({ ...prev, [avvikId]: '' }))
        loadKommentarer(avvikId)
      } else {
        const errorData = await response.json()
        setMessage({ type: 'error', text: errorData.feil || 'Feil ved lagring av kommentar' })
      }
    } catch (error) {
      logger.error('Feil ved lagring av kommentar:', error)
      setMessage({ type: 'error', text: 'Feil ved lagring av kommentar' })
    }
  }

  const toggleKommentarer = (avvikId: number) => {
    setVisKommentarer(prev => ({ ...prev, [avvikId]: !prev[avvikId] }))
    if (!kommentarer[avvikId]) {
      loadKommentarer(avvikId)
    }
  }

  // Filtrer og sorter avvik
  const getFilteredAndSortedAvvik = () => {
    let filtered = avvik

    // Filtrer etter status
    if (selectedStatus !== 'alle') {
      filtered = avvik.filter(item => item.status === selectedStatus)
    }

    // Sorter etter dato
    filtered.sort((a, b) => {
      const dateA = new Date(a.dato).getTime()
      const dateB = new Date(b.dato).getTime()
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB
    })

    return filtered
  }

  // Tell avvik per status
  const getStatusCounts = () => {
    return {
      ny: avvik.filter(item => item.status === 'ny').length,
      under_behandling: avvik.filter(item => item.status === 'under_behandling').length,
      løst: avvik.filter(item => item.status === 'løst').length
    }
  }

  const statusCounts = getStatusCounts()
  const filteredAvvik = getFilteredAndSortedAvvik()

  const submitAvvik = async () => {
    if (!newAvvik.type || !newAvvik.beskrivelse) {
      toast({
        variant: 'destructive',
        title: 'Manglende felt',
        description: 'Vennligst fyll ut alle felt',
      })
      return
    }

    setLoading(true)
    try {
      const token = document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1]
      
      // Hvis det er et bilde, last det opp først
      // Last opp bilder hvis de finnes
      let uploadedImages: any[] = []
      if (newAvvik.bilder && newAvvik.bilder.length > 0) {
        logger.log('Uploading images:', newAvvik.bilder.length)
        const formData = new FormData()
        newAvvik.bilder.forEach(file => {
          formData.append('images', file)
        })
        
        const uploadResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/upload/avvik/multiple`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData
        })
        
        logger.log('Upload response status:', uploadResponse.status)
        
        if (uploadResponse.ok) {
          const uploadResult = await uploadResponse.json()
          logger.log('Upload result:', uploadResult)
          uploadedImages = uploadResult.files
        } else {
          const errorData = await uploadResponse.json()
          logger.error('Upload error:', errorData)
          toast({
            variant: 'destructive',
            title: 'Feil ved opplasting',
            description: errorData.feil || 'Feil ved opplasting av bilder',
          })
          setLoading(false)
          return
        }
      }
      
      // Bygg request body
      const requestBody: any = {
        type: newAvvik.type,
        beskrivelse: newAvvik.beskrivelse
      }
      
      if (uploadedImages.length > 0) {
        requestBody.bilder = uploadedImages
      }
      
      const response = await offlineFetch({
        url: `${process.env.NEXT_PUBLIC_API_URL}/avvik`,
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`
        },
        body: requestBody,
        type: 'avvik'
      })

      const result = await response.json()
      
      // Only reload if not offline
      if (!result.offline) {
        toast({
          variant: 'success',
          title: 'Avvik registrert',
          description: 'Avviket er registrert og lagret.',
        })
        setNewAvvik({ type: '', beskrivelse: '', bilde: null, bilder: [] })
        setCapturedImages([])
        setShowDialog(false)
        loadAvvik()
      } else {
        // Already shown by offlineFetch
        setNewAvvik({ type: '', beskrivelse: '', bilde: null, bilder: [] })
        setCapturedImages([])
        setShowDialog(false)
      }
    } catch (error) {
      logger.error('Feil ved registrering av avvik:', error)
      toast({
        variant: 'destructive',
        title: 'Feil ved registrering',
        description: 'En feil oppstod ved registrering av avvik',
      })
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ny': return 'text-red-600 bg-red-100'
      case 'under_behandling': return 'text-yellow-600 bg-yellow-100'
      case 'løst': return 'text-green-600 bg-green-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ny': return <AlertTriangle className="h-4 w-4" />
      case 'under_behandling': return <Clock className="h-4 w-4" />
      case 'løst': return <CheckCircle className="h-4 w-4" />
      default: return <AlertTriangle className="h-4 w-4" />
    }
  }

  if (!sjåfør) {
    return <div>Laster...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50 p-2 sm:p-4">
      <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-3 sm:space-y-0">
          <div className="flex-1 min-w-0">
            <h1 className="text-lg sm:text-2xl font-bold text-gray-900">Avvik</h1>
            <p className="text-gray-600 text-sm sm:text-base">Registrer og se avvik</p>
          </div>
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
            <Button variant="outline" onClick={() => window.location.href = '/'} className="w-full sm:w-auto text-sm sm:text-base">
              Tilbake til Dashboard
            </Button>
            <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto text-sm sm:text-base">
                <Plus className="h-4 w-4 mr-2" />
                Registrer Avvik
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Registrer nytt avvik</DialogTitle>
                <DialogDescription>
                  Beskriv avviket så detaljert som mulig
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="type">Type avvik</Label>
                  <Select value={newAvvik.type} onValueChange={(value) => setNewAvvik({...newAvvik, type: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Velg type avvik" />
                    </SelectTrigger>
                    <SelectContent>
                      {AVVIK_TYPER.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="beskrivelse">Beskrivelse</Label>
                  <Textarea
                    id="beskrivelse"
                    value={newAvvik.beskrivelse}
                    onChange={(e) => setNewAvvik({...newAvvik, beskrivelse: e.target.value})}
                    placeholder="Beskriv avviket i detalj..."
                    rows={4}
                  />
                </div>
                
                {/* Foto-seksjon */}
                <div>
                  <Label className="flex items-center gap-2 mb-2">
                    <Camera className="h-4 w-4" />
                    Foto (valgfritt)
                  </Label>
                  
                  {capturedImages.length > 0 ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        {capturedImages.map((image, index) => (
                          <div key={index} className="relative">
                            <img 
                              src={image} 
                              alt={`Avvik foto ${index + 1}`} 
                              className="w-full max-w-sm max-h-32 object-cover rounded-lg border"
                            />
                            <Button
                              size="sm"
                              variant="destructive"
                              className="absolute top-1 right-1 h-6 w-6 p-0"
                              onClick={() => removePhoto(index)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => removePhoto()}
                        className="w-full"
                      >
                        <X className="h-4 w-4 mr-2" />
                        Fjern alle bilder
                      </Button>
                      <p className="text-sm text-gray-600">{capturedImages.length} foto(er) tatt og klar for opplasting</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={capturePhoto}
                        className="w-full flex items-center gap-2"
                      >
                        <Camera className="h-4 w-4" />
                        Velg bilder
                      </Button>
                      <p className="text-xs text-gray-500 text-center">
                        Velg bilder fra kamera eller galleri
                      </p>
                    </div>
                  )}
                </div>
                <div className="flex justify-end space-x-2 pt-4 border-t">
                  <Button variant="outline" onClick={() => setShowDialog(false)}>
                    Avbryt
                  </Button>
                  <Button onClick={submitAvvik} disabled={loading}>
                    {loading ? 'Registrerer...' : 'Registrer'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 sm:gap-4">
          <Button
            variant={selectedStatus === 'alle' ? 'default' : 'outline'}
            onClick={() => setSelectedStatus('alle')}
            className="flex items-center justify-between p-4 h-auto"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              <span className="font-medium">Alle avvik</span>
            </div>
            <Badge variant="secondary" className="ml-2">
              {avvik.length}
            </Badge>
          </Button>
          
          <Button
            variant={selectedStatus === 'ny' ? 'default' : 'outline'}
            onClick={() => setSelectedStatus('ny')}
            className="flex items-center justify-between p-4 h-auto"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              <span className="font-medium">Nye avvik</span>
            </div>
            <Badge variant="secondary" className="ml-2">
              {statusCounts.ny}
            </Badge>
          </Button>
          
          <Button
            variant={selectedStatus === 'under_behandling' ? 'default' : 'outline'}
            onClick={() => setSelectedStatus('under_behandling')}
            className="flex items-center justify-between p-4 h-auto"
          >
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              <span className="font-medium">Under behandling</span>
            </div>
            <Badge variant="secondary" className="ml-2">
              {statusCounts.under_behandling}
            </Badge>
          </Button>
          
          <Button
            variant={selectedStatus === 'løst' ? 'default' : 'outline'}
            onClick={() => setSelectedStatus('løst')}
            className="flex items-center justify-between p-4 h-auto"
          >
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              <span className="font-medium">Ferdig behandlet</span>
            </div>
            <Badge variant="secondary" className="ml-2">
              {statusCounts.løst}
            </Badge>
          </Button>
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('grid')}
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-500" />
            <Select value={sortOrder} onValueChange={(value: 'newest' | 'oldest') => setSortOrder(value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Nyeste først</SelectItem>
                <SelectItem value="oldest">Eldste først</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Message */}
        {message && (
          <Alert className={message.type === 'error' ? 'border-red-500' : 'border-green-500'}>
            <AlertDescription>{message.text}</AlertDescription>
          </Alert>
        )}

        {/* Avvik Grid/List */}
        {filteredAvvik.length === 0 ? (
            <Card>
              <CardContent className="text-center py-6 sm:py-8">
                <AlertTriangle className="h-10 sm:h-12 w-10 sm:w-12 mx-auto mb-3 sm:mb-4 text-gray-300" />
                <p className="text-gray-500 text-sm sm:text-base">
                  {selectedStatus === 'alle' ? 'Ingen avvik registrert ennå' : `Ingen ${selectedStatus === 'ny' ? 'nye' : selectedStatus === 'under_behandling' ? 'avvik under behandling' : 'ferdig behandlede avvik'}`}
                </p>
              </CardContent>
            </Card>
        ) : (
          <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-3 sm:space-y-4'}>
            {filteredAvvik.map((avvikItem) => (
              <Card key={avvikItem.id} className={`hover:shadow-md transition-shadow ${expandedAvvik === avvikItem.id ? 'ring-2 ring-blue-500' : ''}`}>
                <CardHeader className="p-3 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start space-y-2 sm:space-y-0">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base sm:text-lg">{avvikItem.type}</CardTitle>
                      <CardDescription className="text-xs sm:text-sm">
                        {new Date(avvikItem.dato).toLocaleDateString('no-NO')} kl. {new Date(avvikItem.dato).toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' })}
                      </CardDescription>
                    </div>
                    <div className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${getStatusColor(avvikItem.status || 'ny')} self-start sm:self-auto`}>
                      {getStatusIcon(avvikItem.status || 'ny')}
                      <span className="hidden sm:inline">{(avvikItem.status || 'ny').charAt(0).toUpperCase() + (avvikItem.status || 'ny').slice(1)}</span>
                      <span className="sm:hidden">{(avvikItem.status || 'ny').charAt(0).toUpperCase()}</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-3 sm:p-6 pt-0">
                  {editingAvvik === avvikItem.id ? (
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="edit-type">Type</Label>
                        <Input
                          id="edit-type"
                          value={editFormData.type}
                          onChange={(e) => setEditFormData({ ...editFormData, type: e.target.value })}
                          placeholder="Type avvik"
                        />
                      </div>
                      <div>
                        <Label htmlFor="edit-beskrivelse">Beskrivelse</Label>
                        <Textarea
                          id="edit-beskrivelse"
                          value={editFormData.beskrivelse}
                          onChange={(e) => setEditFormData({ ...editFormData, beskrivelse: e.target.value })}
                          placeholder="Beskriv avviket"
                          rows={3}
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={saveEditAvvik} size="sm">
                          Lagre
                        </Button>
                        <Button onClick={cancelEditAvvik} variant="outline" size="sm">
                          Avbryt
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-gray-700 text-sm sm:text-base mb-3">{avvikItem.beskrivelse}</p>
                      {avvikItem.status === 'ny' && (
                        <div className="flex justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => startEditAvvik(avvikItem)}
                            className="flex items-center gap-1"
                          >
                            <Edit className="h-3 w-3" />
                            <span className="text-xs">Rediger</span>
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                  
                  {/* Kommentarer seksjon */}
                  <div className="mt-4 border-t pt-3">
                    <div className="flex items-center justify-between mb-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleKommentarer(avvikItem.id)}
                        className="flex items-center gap-1"
                      >
                        <MessageCircle className="h-3 w-3" />
                        <span className="text-xs">
                          {visKommentarer[avvikItem.id] ? 'Skjul' : 'Vis'} kommentarer
                          {kommentarer[avvikItem.id]?.length > 0 && ` (${kommentarer[avvikItem.id].length})`}
                        </span>
                      </Button>
                    </div>
                    
                    {visKommentarer[avvikItem.id] && (
                      <div className="space-y-3">
                        {/* Eksisterende kommentarer */}
                        {kommentarer[avvikItem.id]?.map((kommentar) => (
                          <div key={kommentar.id} className="p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-medium text-gray-700">
                                {kommentar.sjåfør_navn}
                              </span>
                              {kommentar.admin && (
                                <Badge variant="secondary" className="text-xs">Admin</Badge>
                              )}
                              <span className="text-xs text-gray-500">
                                {new Date(kommentar.opprettet).toLocaleString('no-NO')}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600">{kommentar.kommentar}</p>
                          </div>
                        ))}
                        
                        {/* Ny kommentar */}
                        <div className="space-y-2">
                          <Textarea
                            placeholder="Skriv en kommentar..."
                            value={nyKommentar[avvikItem.id] || ''}
                            onChange={(e) => setNyKommentar(prev => ({ ...prev, [avvikItem.id]: e.target.value }))}
                            rows={2}
                          />
                          <Button
                            size="sm"
                            onClick={() => leggTilKommentar(avvikItem.id)}
                            disabled={!nyKommentar[avvikItem.id]?.trim()}
                          >
                            Legg til kommentar
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Vis admin kommentar hvis det finnes */}
                  {avvikItem.admin_kommentar && (
                    <div className="mt-4 p-3 bg-blue-50 border-l-4 border-blue-400 rounded-r-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                        <span className="text-sm font-medium text-blue-800">
                          {avvikItem.admin_navn || 'Admin'}
                        </span>
                      </div>
                      <p className="text-sm text-blue-700">{avvikItem.admin_kommentar}</p>
                    </div>
                  )}
                  
                  {/* Vis bilde hvis det finnes */}
                  {(avvikItem.bilde_url || (avvikItem.bilder && avvikItem.bilder.length > 0)) && (
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
                      
                      {/* Vis flere bilder hvis de finnes */}
                      {avvikItem.bilder && avvikItem.bilder.length > 0 ? (
                        <div className="grid grid-cols-2 gap-2">
                          {avvikItem.bilder.map((bilde, index) => (
                            <div key={bilde.id} className="relative w-full max-w-md rounded-lg border overflow-hidden cursor-pointer hover:shadow-lg" style={{ height: '256px' }}
                              onClick={() => {
                                logger.log('Klikker på bilde:', bilde.url);
                                window.open(bilde.url, '_blank');
                              }}
                            >
                              <img
                                src={bilde.url?.replace('http://localhost:3001', '') || bilde.url}
                                alt={`Avvik foto ${index + 1}`}
                                className="w-full h-full object-contain transition-opacity"
                                style={{
                                  transform: `rotate(${imageRotations[avvikItem.id] || 0}deg)`,
                                  transformOrigin: 'center',
                                  transition: 'transform 0.3s ease'
                                }}
                                onError={(e) => {
                                  logger.error('Bilde kunne ikke lastes:', bilde.url);
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                  const fallback = target.nextElementSibling as HTMLElement;
                                  if (fallback) fallback.style.display = 'block';
                                }}
                              />
                              
                              {/* Fallback hvis bilde ikke kan lastes */}
                              <div 
                                className="w-full h-full rounded-lg bg-gray-100 p-4 text-center cursor-pointer hover:bg-gray-200 transition-colors"
                                style={{ display: 'none' }}
                                onClick={() => window.open(bilde.url, '_blank')}
                              >
                                <Image className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                                <p className="text-sm text-gray-600">Klikk for å se bilde</p>
                                <p className="text-xs text-gray-500 mt-1">URL: {bilde.url}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : avvikItem.bilde_url && (
                        <div className="relative w-full max-w-md rounded-lg border overflow-hidden cursor-pointer hover:shadow-lg" style={{ height: '256px' }}
                          onClick={() => {
                            logger.log('Klikker på bilde:', avvikItem.bilde_url);
                            window.open(avvikItem.bilde_url, '_blank');
                          }}
                        >
                          <img 
                            src={avvikItem.bilde_url?.replace('http://localhost:3001', '') || avvikItem.bilde_url} 
                            alt="Avvik foto" 
                            className="w-full h-full object-contain transition-opacity"
                            style={{
                              transform: `rotate(${imageRotations[avvikItem.id] || 0}deg)`,
                              transformOrigin: 'center',
                              transition: 'transform 0.3s ease'
                            }}
                            onError={(e) => {
                              logger.error('Bilde kunne ikke lastes:', avvikItem.bilde_url);
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              const fallback = target.nextElementSibling as HTMLElement;
                              if (fallback) fallback.style.display = 'block';
                            }}
                          />
                          
                          {/* Fallback hvis bilde ikke kan lastes */}
                          <div 
                            className="w-full h-full rounded-lg bg-gray-100 p-4 text-center cursor-pointer hover:bg-gray-200 transition-colors"
                            style={{ display: 'none' }}
                            onClick={() => window.open(avvikItem.bilde_url, '_blank')}
                          >
                            <Image className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                            <p className="text-sm text-gray-600">Klikk for å se bilde</p>
                            <p className="text-xs text-gray-500 mt-1">URL: {avvikItem.bilde_url}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

