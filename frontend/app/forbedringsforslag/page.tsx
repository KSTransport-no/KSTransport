'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { logger } from '@/lib/logger'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Lightbulb, Plus, Clock, CheckCircle, XCircle, MessageCircle } from 'lucide-react'

interface Forbedringsforslag {
  id: number
  tittel: string
  beskrivelse: string
  opprettet: string
  status: 'ny' | 'under behandling' | 'besvart'
  admin_kommentar?: string
  admin_navn?: string
  sjåfør_navn: string
}

export default function ForbedringsforslagPage() {
  const { sjåfør } = useAuth()
  const [forslag, setForslag] = useState<Forbedringsforslag[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [showDialog, setShowDialog] = useState(false)
  const [newForslag, setNewForslag] = useState({
    tittel: '',
    beskrivelse: ''
  })
  const [selectedStatus, setSelectedStatus] = useState<'alle' | 'ny' | 'under behandling' | 'besvart'>('alle')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest')
  const [editingForslag, setEditingForslag] = useState<number | null>(null)
  const [editFormData, setEditFormData] = useState({ tittel: '', beskrivelse: '' })
  const [kommentarer, setKommentarer] = useState<{[key: number]: any[]}>({})
  const [nyKommentar, setNyKommentar] = useState<{[key: number]: string}>({})
  const [visKommentarer, setVisKommentarer] = useState<{[key: number]: boolean}>({})

  useEffect(() => {
    if (sjåfør) {
      loadForslag()
    }
  }, [sjåfør])

  const loadForslag = async () => {
    try {
      const token = document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1]
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/forbedringsforslag`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (response.ok) {
        const data = await response.json()
        setForslag(data)
      }
    } catch (error) {
      logger.error('Feil ved lasting av forbedringsforslag:', error)
    }
  }

  const loadKommentarer = async (forslagId: number) => {
    try {
      const token = document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1]
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/forbedringsforslag/${forslagId}/kommentarer`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        const data = await response.json()
        setKommentarer(prev => ({ ...prev, [forslagId]: data }))
      }
    } catch (error) {
      logger.error('Feil ved henting av kommentarer:', error)
    }
  }

  const leggTilKommentar = async (forslagId: number) => {
    const kommentarTekst = nyKommentar[forslagId]
    if (!kommentarTekst?.trim()) return

    try {
      const token = document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1]
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/forbedringsforslag/${forslagId}/kommentarer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ kommentar: kommentarTekst })
      })

      if (response.ok) {
        setMessage({ type: 'success', text: 'Kommentar lagt til!' })
        setNyKommentar(prev => ({ ...prev, [forslagId]: '' }))
        loadKommentarer(forslagId)
      } else {
        const errorData = await response.json()
        setMessage({ type: 'error', text: errorData.feil || 'Feil ved lagring av kommentar' })
      }
    } catch (error) {
      logger.error('Feil ved lagring av kommentar:', error)
      setMessage({ type: 'error', text: 'Feil ved lagring av kommentar' })
    }
  }

  const toggleKommentarer = (forslagId: number) => {
    setVisKommentarer(prev => ({ ...prev, [forslagId]: !prev[forslagId] }))
    if (!kommentarer[forslagId]) {
      loadKommentarer(forslagId)
    }
  }

  const submitForslag = async () => {
    if (!newForslag.tittel || !newForslag.beskrivelse) {
      setMessage({ type: 'error', text: 'Vennligst fyll ut alle felt' })
      return
    }

    setLoading(true)
    try {
      const token = document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1]
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/forbedringsforslag`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          tittel: newForslag.tittel,
          beskrivelse: newForslag.beskrivelse,
          dato: new Date().toISOString().split('T')[0]
        })
      })

      if (response.ok) {
        setMessage({ type: 'success', text: 'Forbedringsforslag sendt!' })
        setNewForslag({ tittel: '', beskrivelse: '' })
        setShowDialog(false)
        loadForslag()
      } else {
        const error = await response.json()
        setMessage({ type: 'error', text: error.feil || 'Feil ved sending av forslag' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Feil ved sending av forslag' })
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ny': return 'text-blue-600 bg-blue-100'
      case 'under behandling': return 'text-yellow-600 bg-yellow-100'
      case 'besvart': return 'text-green-600 bg-green-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ny': return <Lightbulb className="h-4 w-4" />
      case 'under behandling': return <Clock className="h-4 w-4" />
      case 'besvart': return <CheckCircle className="h-4 w-4" />
      default: return <Lightbulb className="h-4 w-4" />
    }
  }

  const filteredForslag = () => {
    let list = [...forslag]
    if (selectedStatus !== 'alle') {
      list = list.filter(f => f.status === selectedStatus)
    }
    list.sort((a, b) => {
      const da = new Date(a.opprettet).getTime()
      const db = new Date(b.opprettet).getTime()
      return sortOrder === 'newest' ? db - da : da - db
    })
    return list
  }

  if (!sjåfør) {
    return <div>Laster...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50 p-2 sm:p-4">
      <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-3 sm:space-y-0">
          <div className="flex-1 min-w-0">
            <h1 className="text-lg sm:text-2xl font-bold text-gray-900">Forbedringsforslag</h1>
            <p className="text-gray-600 text-sm sm:text-base">Send forslag for forbedringer</p>
          </div>
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
            <Button variant="outline" onClick={() => window.location.href = '/'} className="w-full sm:w-auto text-sm sm:text-base">
              Tilbake til Dashboard
            </Button>
            <Dialog open={showDialog} onOpenChange={setShowDialog}>
              <DialogTrigger asChild>
                <Button className="w-full sm:w-auto text-sm sm:text-base">
                  <Plus className="h-4 w-4 mr-2" />
                  Send Forslag
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Send forbedringsforslag</DialogTitle>
                  <DialogDescription>
                    Del dine ideer for å forbedre arbeidsprosessene
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="tittel">Tittel</Label>
                    <Input
                      id="tittel"
                      value={newForslag.tittel}
                      onChange={(e) => setNewForslag({...newForslag, tittel: e.target.value})}
                      placeholder="Kort beskrivelse av forslaget..."
                    />
                  </div>
                  <div>
                    <Label htmlFor="beskrivelse">Beskrivelse</Label>
                    <Textarea
                      id="beskrivelse"
                      value={newForslag.beskrivelse}
                      onChange={(e) => setNewForslag({...newForslag, beskrivelse: e.target.value})}
                      placeholder="Beskriv forslaget i detalj..."
                      rows={4}
                    />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setShowDialog(false)}>
                      Avbryt
                    </Button>
                    <Button onClick={submitForslag} disabled={loading}>
                      {loading ? 'Sender...' : 'Send Forslag'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Quick filters (lik Avvik) */}
        <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant={selectedStatus==='alle'?'default':'outline'} onClick={()=>setSelectedStatus('alle')}>Alle</Button>
            <Button size="sm" variant={selectedStatus==='ny'?'default':'outline'} onClick={()=>setSelectedStatus('ny')}>Ny</Button>
            <Button size="sm" variant={selectedStatus==='under behandling'?'default':'outline'} onClick={()=>setSelectedStatus('under behandling')}>Under behandling</Button>
            <Button size="sm" variant={selectedStatus==='besvart'?'default':'outline'} onClick={()=>setSelectedStatus('besvart')}>Besvart</Button>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant={viewMode==='grid'?'default':'outline'} onClick={()=>setViewMode('grid')}>Grid</Button>
            <Button size="sm" variant={viewMode==='list'?'default':'outline'} onClick={()=>setViewMode('list')}>Liste</Button>
            <Button size="sm" variant="outline" onClick={()=>setSortOrder(sortOrder==='newest'?'oldest':'newest')}>
              {sortOrder==='newest'?'Nyeste først':'Eldste først'}
            </Button>
          </div>
        </div>

        {/* Message */}
        {message && (
          <Alert className={message.type === 'error' ? 'border-red-500' : 'border-green-500'}>
            <AlertDescription>{message.text}</AlertDescription>
          </Alert>
        )}

        {/* Forslag liste */}
        <div className="space-y-3 sm:space-y-4">
          {filteredForslag().length === 0 ? (
            <Card>
              <CardContent className="text-center py-6 sm:py-8">
                <Lightbulb className="h-10 sm:h-12 w-10 sm:w-12 mx-auto mb-3 sm:mb-4 text-gray-300" />
                <p className="text-gray-500 text-sm sm:text-base">Ingen forbedringsforslag sendt ennå</p>
              </CardContent>
            </Card>
          ) : (
            filteredForslag().map((forslagItem) => (
              <Card key={forslagItem.id} className={viewMode==='grid'?'':'sm:rounded-none'}>
                <CardHeader className="p-3 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start space-y-2 sm:space-y-0">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base sm:text-lg">{forslagItem.tittel}</CardTitle>
                      <CardDescription className="text-xs sm:text-sm">
                        {new Date(forslagItem.opprettet).toLocaleDateString('no-NO')} kl. {new Date(forslagItem.opprettet).toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' })}
                      </CardDescription>
                    </div>
                    <div className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${getStatusColor(forslagItem.status)} self-start sm:self-auto`}>
                      {getStatusIcon(forslagItem.status)}
                      <span className="hidden sm:inline">{forslagItem.status.charAt(0).toUpperCase() + forslagItem.status.slice(1).replace('_', ' ')}</span>
                      <span className="sm:hidden">{forslagItem.status.charAt(0).toUpperCase()}</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-3 sm:p-6 pt-0">
                  {editingForslag === forslagItem.id ? (
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="edit-tittel">Tittel</Label>
                        <Input
                          id="edit-tittel"
                          value={editFormData.tittel}
                          onChange={(e) => setEditFormData({ ...editFormData, tittel: e.target.value })}
                          placeholder="Tittel"
                        />
                      </div>
                      <div>
                        <Label htmlFor="edit-beskrivelse">Beskrivelse</Label>
                        <Textarea
                          id="edit-beskrivelse"
                          value={editFormData.beskrivelse}
                          onChange={(e) => setEditFormData({ ...editFormData, beskrivelse: e.target.value })}
                          placeholder="Beskriv forslaget"
                          rows={3}
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={async ()=>{
                          const token = document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1]
                          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/forbedringsforslag/${forslagItem.id}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                            body: JSON.stringify(editFormData)
                          })
                          if (res.ok) {
                            setMessage({ type: 'success', text: 'Forbedringsforslag oppdatert!' })
                            setEditingForslag(null)
                            setEditFormData({ tittel: '', beskrivelse: '' })
                            loadForslag()
                          } else {
                            const data = await res.json().catch(()=>({}))
                            setMessage({ type: 'error', text: data?.feil || 'Feil ved oppdatering' })
                          }
                        }} size="sm">
                          Lagre
                        </Button>
                        <Button onClick={()=>{ setEditingForslag(null); setEditFormData({ tittel: '', beskrivelse: '' }) }} variant="outline" size="sm">
                          Avbryt
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-gray-700 mb-3 sm:mb-4 text-sm sm:text-base">{forslagItem.beskrivelse}</p>
                      {forslagItem.status === 'ny' && (
                        <div className="flex justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => { setEditingForslag(forslagItem.id); setEditFormData({ tittel: forslagItem.tittel, beskrivelse: forslagItem.beskrivelse }) }}
                          >
                            Rediger
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
                        onClick={() => toggleKommentarer(forslagItem.id)}
                        className="flex items-center gap-1"
                      >
                        <MessageCircle className="h-3 w-3" />
                        <span className="text-xs">
                          {visKommentarer[forslagItem.id] ? 'Skjul' : 'Vis'} kommentarer
                          {kommentarer[forslagItem.id]?.length > 0 && ` (${kommentarer[forslagItem.id].length})`}
                        </span>
                      </Button>
                    </div>
                    
                    {visKommentarer[forslagItem.id] && (
                      <div className="space-y-3">
                        {/* Eksisterende kommentarer */}
                        {kommentarer[forslagItem.id]?.map((kommentar) => (
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
                            value={nyKommentar[forslagItem.id] || ''}
                            onChange={(e) => setNyKommentar(prev => ({ ...prev, [forslagItem.id]: e.target.value }))}
                            rows={2}
                          />
                          <Button
                            size="sm"
                            onClick={() => leggTilKommentar(forslagItem.id)}
                            disabled={!nyKommentar[forslagItem.id]?.trim()}
                          >
                            Legg til kommentar
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {forslagItem.admin_kommentar && (
                    <div className="bg-gray-50 p-2 sm:p-3 rounded-lg">
                      <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1">{forslagItem.admin_navn || 'Admin'}:</p>
                      <p className="text-xs sm:text-sm text-gray-700">{forslagItem.admin_kommentar}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  )
}