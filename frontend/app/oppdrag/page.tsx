'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import api from '@/lib/api'
import { useToast } from '@/hooks/use-toast'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { MapPin, Scale, Box, MessageSquare, Package } from 'lucide-react'

export default function OppdragPage() {
  const { sjåfør } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    fra: '',
    til: '',
    vekt: '',
    volum: '',
    kommentar: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validering
    if (!formData.fra || !formData.til) {
      toast({
        variant: 'destructive',
        title: 'Manglende felt',
        description: 'Fra og Til er påkrevde felt',
      })
      return
    }

    setLoading(true)
    try {
      const requestData = {
        fra: formData.fra.trim(),
        til: formData.til.trim(),
        vekt: formData.vekt ? parseInt(formData.vekt) : 0,
        volum: formData.volum ? parseFloat(formData.volum) : 0,
        kommentar: formData.kommentar.trim() || null
      }

      const response = await api.post('/data/oppdrag', requestData)
      const result = response.data
      
      // Only redirect if not offline
      if (!result.offline) {
        toast({
          variant: 'success',
          title: 'Oppdrag opprettet',
          description: `${result.melding} Du blir tatt til dashboardet...`,
        })
      } else {
        // Already shown by Axios offline interceptor
        setFormData({
          fra: '',
          til: '',
          vekt: '',
          volum: '',
          kommentar: ''
        })
        return
      }
      
      // Nullstill skjema
      setFormData({
        fra: '',
        til: '',
        vekt: '',
        volum: '',
        kommentar: ''
      })
      
      // Redirect til dashboardet etter 2 sekunder
      setTimeout(() => {
        window.location.href = '/'
      }, 2000)
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Feil ved lagring',
        description: error.message || 'En feil oppstod ved lagring av oppdrag',
      })
    } finally {
      setLoading(false)
    }
  }

  if (!sjåfør) {
    return <div>Laster...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50 p-2 sm:p-3">
      <div className="max-w-2xl mx-auto space-y-3 sm:space-y-4">
        {/* Header - Mobile First */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-2 sm:space-y-0">
          <div className="flex-1 min-w-0">
            <h1 className="text-lg sm:text-xl font-bold text-gray-900">Opprett oppdrag</h1>
            <p className="text-gray-600 text-xs sm:text-sm">Registrer et nytt oppdrag</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => window.location.href = '/'} className="w-full sm:w-auto">
            Tilbake
          </Button>
        </div>

        {/* Oppdrag Form - Mobile First */}
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="space-y-3 sm:space-y-4">
              <div className="flex items-center gap-2">
                <Package className="h-4 sm:h-5 w-4 sm:w-5 text-gray-600" />
                <h3 className="font-semibold text-sm sm:text-base">Oppdrag informasjon</h3>
              </div>

              <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
                {/* Fra */}
                <div className="space-y-2">
                  <Label htmlFor="fra" className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Fra *
                  </Label>
                  <Input
                    id="fra"
                    value={formData.fra}
                    onChange={(e) => setFormData({ ...formData, fra: e.target.value })}
                    placeholder="F.eks. Jørpeland, Sandnes, etc."
                    required
                  />
                </div>

                {/* Til */}
                <div className="space-y-2">
                  <Label htmlFor="til" className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Til *
                  </Label>
                  <Input
                    id="til"
                    value={formData.til}
                    onChange={(e) => setFormData({ ...formData, til: e.target.value })}
                    placeholder="F.eks. Sandnes, Stavanger, etc."
                    required
                  />
                </div>

                {/* Vekt */}
                <div className="space-y-2">
                  <Label htmlFor="vekt" className="flex items-center gap-2">
                    <Scale className="h-4 w-4" />
                    Vekt (kg)
                  </Label>
                  <Input
                    id="vekt"
                    type="number"
                    min="0"
                    value={formData.vekt}
                    onChange={(e) => setFormData({ ...formData, vekt: e.target.value })}
                    placeholder="0"
                  />
                </div>

                {/* Volum */}
                <div className="space-y-2">
                  <Label htmlFor="volum" className="flex items-center gap-2">
                    <Box className="h-4 w-4" />
                    Volum (m³)
                  </Label>
                  <Input
                    id="volum"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.volum}
                    onChange={(e) => setFormData({ ...formData, volum: e.target.value })}
                    placeholder="0.00"
                  />
                </div>

                {/* Kommentar */}
                <div className="space-y-2">
                  <Label htmlFor="kommentar" className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Kommentar (beskrivelse av kolli)
                  </Label>
                  <Textarea
                    id="kommentar"
                    value={formData.kommentar}
                    onChange={(e) => setFormData({ ...formData, kommentar: e.target.value })}
                    placeholder="Beskrivelse av kolli..."
                    rows={3}
                  />
                </div>

                <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setFormData({
                      fra: '',
                      til: '',
                      vekt: '',
                      volum: '',
                      kommentar: ''
                    })} 
                    className="w-full sm:w-auto text-sm sm:text-base"
                  >
                    Nullstill
                  </Button>
                  <Button type="submit" disabled={loading} className="w-full sm:w-auto text-sm sm:text-base">
                    {loading ? 'Lagrer...' : 'Opprett oppdrag'}
                  </Button>
                </div>
              </form>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

