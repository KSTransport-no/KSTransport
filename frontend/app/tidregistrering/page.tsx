'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { logger } from '@/lib/logger'
import { useToast } from '@/hooks/use-toast'
import { specificErrors } from '@/lib/errorMessages'
import api from '@/lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { NotificationBell } from '@/components/NotificationBell'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { CalendarIcon, Clock, Truck, MapPin, Package, Pause, MessageSquare, Scale, LogOut } from 'lucide-react'

interface Bil {
  id: number
  registreringsnummer: string
  merke?: string
  modell?: string
  aktiv: boolean
}

interface SgaKode {
  id: number
  kode: string
  beskrivelse?: string
  skal_faktureres: boolean
}


export default function TidregistreringPage() {
  const { sjåfør, logout } = useAuth()
  const { toast } = useToast()
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [biler, setBiler] = useState<Bil[]>([])
  const [sgaKoder, setSgaKoder] = useState<SgaKode[]>([])
  const [loading, setLoading] = useState(false)
  const [showDialog, setShowDialog] = useState(false)

  // Debug biler state
  useEffect(() => {
    logger.log('Biler state oppdatert:', biler)
  }, [biler])
  const [formData, setFormData] = useState({
    bil_id: '',
    sone: '',
    sendinger: '',
    vekt: '',
    pause: '',
    kommentarer: '',
    start_tid: '',
    slutt_tid: '',
    registrering_type: 'arbeidstid',
    bomtur_venting: '',
    sga_kode_id: '',
    sga_kode_annet: ''
  })
  const [sgaKodeType, setSgaKodeType] = useState<'dropdown' | 'annet'>('dropdown')
  const [rangeStart, setRangeStart] = useState<Date | undefined>(undefined)
  const [rangeEnd, setRangeEnd] = useState<Date | undefined>(undefined)
  
  const [egenmeldingKvoter, setEgenmeldingKvoter] = useState<{
    har_ansiennitet?: boolean
    kan_bruke_egenmelding?: boolean
    melding?: string
    egenmelding?: {
      antall_sykefravær: number
      maks_sykefravær: number
      dager_per_fravær: number
      periode: string
    }
    egenmelding_barn?: {
      brukt_dager: number
      maks_dager: number
      periode: string
    }
  } | null>(null)

  useEffect(() => {
    logger.log('Tidregistrering useEffect - sjåfør:', sjåfør)
    logger.log('Cookies:', document.cookie)
    if (sjåfør) {
      logger.log('Laster biler for sjåfør:', sjåfør.navn)
      loadBiler()
      loadKvoter()
      loadSgaKoder()
    } else {
      logger.log('Ingen sjåfør logget inn')
    }
  }, [sjåfør])

  const loadBiler = async () => {
    try {
      const response = await api.get('/data/biler')
      logger.log('Biler data:', response.data)
      setBiler(response.data)
    } catch (error: any) {
      logger.error('Feil ved henting av biler:', error)
      toast({
        variant: 'warning',
        title: 'Kunne ikke laste biler',
        description: error.response?.data?.feil || 'En feil oppstod ved henting av biler. Prøv å oppdatere siden.',
        action: (
          <button
            onClick={() => window.location.reload()}
            className="text-sm font-medium underline"
          >
            Oppdater
          </button>
        ) as any,
      })
    }
  }

  const loadKvoter = async () => {
    try {
      const response = await api.get('/data/egenmelding-kvoter')
      setEgenmeldingKvoter(response.data)
    } catch (error) {
      logger.error('Feil ved henting av kvoter:', error)
    }
  }

  const loadSgaKoder = async () => {
    try {
      const response = await api.get('/data/sga-koder')
      setSgaKoder(response.data)
    } catch (error) {
      logger.error('Feil ved henting av SGA-koder:', error)
    }
  }

  const formatDateForAPI = (date: Date): string => {
    // Bruk lokal timezone for å unngå UTC-konvertering
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    logger.log('handleSubmit kalt med formData:', formData)
    logger.log(`Validering - bil_id: ${formData.bil_id}, sone: ${formData.sone}, sendinger: ${formData.sendinger}, pause: ${formData.pause}, start_tid: ${formData.start_tid}, slutt_tid: ${formData.slutt_tid}`)
    
    // Validering avhengig av registreringstype
    if (formData.registrering_type === 'arbeidstid') {
      if (!formData.bil_id || !formData.sone || !formData.sendinger || !formData.vekt || !formData.pause || !formData.start_tid || !formData.slutt_tid) {
        logger.log('Validering feilet for arbeidstid')
        toast({
          ...specificErrors.skift.validationFailed,
          action: (
            <button
              onClick={() => {
                const firstInput = document.querySelector('input:invalid, select:invalid, textarea:invalid')
                firstInput?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                ;(firstInput as HTMLElement)?.focus()
              }}
              className="text-sm font-medium underline"
            >
              {specificErrors.skift.validationFailed.action?.label}
            </button>
          ) as any,
        })
        return
      }
      // Valider SGA-kode
      if (sgaKodeType === 'dropdown' && !formData.sga_kode_id) {
        toast({
          variant: 'warning',
          title: 'Manglende SGA-kode',
          description: 'Vennligst velg en SGA-kode fra listen.',
        })
        return
      }
      if (sgaKodeType === 'annet' && !formData.sga_kode_annet) {
        toast({
          variant: 'warning',
          title: 'Manglende SGA-kode',
          description: 'Vennligst skriv inn SGA-kode i feltet.',
        })
        return
      }
    } else if (formData.registrering_type === 'egenmelding_barn' || formData.registrering_type === 'ferie' || formData.registrering_type === 'sykemelding') {
      if (!rangeStart || !rangeEnd) {
        toast({
          variant: 'warning',
          title: 'Manglende datoer',
          description: 'Vennligst velg både fra-dato og til-dato.',
        })
        return
      }
    } else if (formData.registrering_type === 'egenmelding') {
      // Egenmelding: bruk datoperiode, maks 3 dager pr sykefravær
      if (!rangeStart || !rangeEnd) {
        toast({
          variant: 'warning',
          title: 'Manglende datoer',
          description: 'Vennligst velg både fra-dato og til-dato.',
        })
        return
      }
      // Sjekk at det ikke er mer enn 3 dager
      const daysDiff = Math.ceil((new Date(rangeEnd).getTime() - new Date(rangeStart).getTime()) / (1000 * 60 * 60 * 24)) + 1
      if (daysDiff > 3) {
        toast({
          variant: 'warning',
          title: 'For mange dager',
          description: 'Du kan maksimalt registrere 3 dager per sykefravær. Velg en kortere periode.',
        })
        return
      }
      // Sjekk ansiennitet
      if (egenmeldingKvoter && !egenmeldingKvoter.kan_bruke_egenmelding) {
        toast({
          variant: 'warning',
          title: 'Kan ikke bruke egenmelding',
          description: egenmeldingKvoter.melding || 'Du kan ikke bruke egenmelding. Kontakt administratoren hvis du mener dette er en feil.',
        })
        return
      }
    }
    
    logger.log('Validering OK, fortsetter...')

    setLoading(true)
    try {
      // Debug formData
      logger.log('FormData før sending:', formData)
      logger.log('SelectedDate:', selectedDate)
      
      // Bygg request ut fra type
      const requestData: any = {
        bil_id: formData.bil_id ? parseInt(formData.bil_id) : null,
        sone: formData.sone || null,
        sendinger: formData.sendinger ? parseInt(formData.sendinger) : 0,
        vekt: formData.vekt ? parseInt(formData.vekt) : 0,
        pause: formData.pause ? parseInt(formData.pause) : 0,
        kommentarer: formData.kommentarer || '',
        dato: selectedDate ? formatDateForAPI(selectedDate) : undefined,
        start_tid: selectedDate && formData.start_tid ? `${formatDateForAPI(selectedDate)}T${formData.start_tid}:00.000Z` : undefined,
        slutt_tid: selectedDate && formData.slutt_tid ? `${formatDateForAPI(selectedDate)}T${formData.slutt_tid}:00.000Z` : undefined,
        registrering_type: formData.registrering_type,
        bomtur_venting: formData.bomtur_venting || null,
        sga_kode_id: sgaKodeType === 'dropdown' && formData.sga_kode_id ? parseInt(formData.sga_kode_id) : null,
        sga_kode_annet: sgaKodeType === 'annet' && formData.sga_kode_annet ? formData.sga_kode_annet : null
      }
      logger.log('Request data:', requestData)
      
      // Håndter periodeinnsending for ferie/sykemelding/egenmelding/egenmelding_barn
      if (
        formData.registrering_type === 'ferie' ||
        formData.registrering_type === 'sykemelding' ||
        formData.registrering_type === 'egenmelding' ||
        formData.registrering_type === 'egenmelding_barn'
      ) {
        const days: string[] = []
        const cur = new Date(rangeStart as Date)
        const end = new Date(rangeEnd as Date)
        cur.setHours(0,0,0,0)
        end.setHours(0,0,0,0)
        while (cur <= end) {
          days.push(formatDateForAPI(cur))
          cur.setDate(cur.getDate() + 1)
        }
        if (formData.registrering_type === 'egenmelding' && days.length > 3) {
          toast({
            variant: 'warning',
            title: 'For mange dager',
            description: 'Du kan maksimalt registrere 3 dager per egenmelding. Velg en kortere periode.',
          })
          setLoading(false)
          return
        }
        for (const d of days) {
          // For ferie/egenmelding/egenmelding_barn lagres uten klokkeslett (00:00 som markør)
          const startT = `${d}T00:00:00.000Z`
          const endT = `${d}T00:00:00.000Z`
          const body = { ...requestData, dato: d, start_tid: startT, slutt_tid: endT, registrering_type: formData.registrering_type }
          await api.post('/data/tidregistrering', body)
        }
        toast({
          variant: 'success',
          title: 'Periode registrert',
          description: 'Du blir omdirigert til hovedsiden...',
        })
        setShowDialog(false)
        setTimeout(() => { window.location.href = '/' }, 1500)
        return
      } else {
        // Opprett enkel registrering
        const tidregistreringResponse = await api.post('/data/tidregistrering', requestData)
        const result = tidregistreringResponse.data
        logger.log('Parsed result:', result)
        
        // Only redirect if not offline
        if (!result.offline) {
          toast({
            variant: 'success',
            title: 'Tidregistrering lagret',
            description: `${result.melding || 'Tidregistrering lagret!'} Du blir omdirigert til hovedsiden...`,
          })
          
          // Reset form and close dialog
          try {
            setFormData({
              bil_id: '',
              sone: '',
              sendinger: '',
              vekt: '',
              pause: '',
              kommentarer: '',
              start_tid: '',
              slutt_tid: '',
              registrering_type: 'arbeidstid',
              bomtur_venting: '',
              sga_kode_id: '',
              sga_kode_annet: ''
            })
            setSgaKodeType('dropdown')
            setShowDialog(false)
            
            // Redirect til dashboardet etter 2 sekunder
            setTimeout(() => {
              window.location.href = '/'
            }, 2000)
          } catch (stateError) {
            // If state update fails, log but don't show error to user
            // since the operation succeeded
            logger.error('Error updating state after successful save:', stateError)
            // Still redirect
            setTimeout(() => {
              window.location.href = '/'
            }, 2000)
          }
        } else {
          // Already shown by Axios offline interceptor
          setShowDialog(false)
          return
        }
      }
    } catch (error: any) {
      logger.error('Feil ved lagring av skift:', error)
      
      // Only show error if it's not a network error that might have succeeded
      // Check if the error message suggests the operation might have succeeded
      const errorMessage = error?.message || ''
      const isNetworkError = errorMessage.includes('Network') || errorMessage.includes('Failed to fetch')
      
      // If it's a network error, check if the shift was actually saved
      // by checking if we got a response before the error
      if (isNetworkError) {
        // Don't show error for network errors - Axios offline interceptor handles this
        logger.log('Network error detected, but operation may have succeeded')
        return
      }
      
      // For other errors, show the error message
      const errorMsg = specificErrors.skift.saveFailed
      toast({
        ...errorMsg,
        action: errorMsg.action ? (
          <button
            onClick={errorMsg.action.onClick}
            className="text-sm font-medium underline"
          >
            {errorMsg.action.label}
          </button>
        ) : undefined,
      } as any)
    } finally {
      setLoading(false)
    }
  }

  const submitEgenmeldingBarn75 = async () => {
    if (!selectedDate) return
    try {
      setLoading(true)
      const dato = formatDateForAPI(selectedDate)
      const start = `${dato}T08:00:00.000Z`
      const slutt = `${dato}T15:30:00.000Z` // 7,5t
      const body = {
        bil_id: null,
        sone: null,
        sendinger: 0,
        vekt: 0,
        pause: 0,
        kommentarer: formData.kommentarer || '',
        dato,
        start_tid: start,
        slutt_tid: slutt,
        registrering_type: 'egenmelding_barn'
      }
      const res = await api.post('/data/tidregistrering', body)
      if (res.data?.offline) {
        return
      }
      toast({
        variant: 'success',
        title: 'Egenmelding barn registrert',
        description: '7,5 timer egenmelding barn er registrert.',
      })
    } catch (e: any) {
      logger.error('Feil ved lagring av egenmelding barn:', e)
      toast({
        ...specificErrors.skift.saveFailed,
        action: (
          <button
            onClick={() => {
              const firstInput = document.querySelector('input:invalid, select:invalid, textarea:invalid')
              firstInput?.scrollIntoView({ behavior: 'smooth', block: 'center' })
            }}
            className="text-sm font-medium underline"
          >
            {specificErrors.skift.saveFailed.action?.label}
          </button>
        ) as any,
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
            <h1 className="text-lg sm:text-xl font-bold text-gray-900">Registrering</h1>
            <p className="text-gray-600 text-xs sm:text-sm">Registrer tid for en bestemt dato</p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button variant="outline" size="sm" onClick={() => window.location.href = '/'} className="flex-1 sm:flex-none">
              Tilbake
            </Button>
            <NotificationBell />
            <Button variant="outline" size="sm" onClick={logout} className="flex items-center gap-1">
              <LogOut className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Logg ut</span>
            </Button>
          </div>
        </div>


        {/* Date Picker - Mobile First */}
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="space-y-2 sm:space-y-3">
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-4 sm:h-5 w-4 sm:w-5 text-gray-600" />
                <h3 className="font-semibold text-sm sm:text-base">Velg dato</h3>
              </div>
              <Input
                type="date"
                value={selectedDate ? formatDateForAPI(selectedDate) : ''}
                onChange={(e) => setSelectedDate(e.target.value ? new Date(e.target.value) : undefined)}
                className="w-full text-sm sm:text-base"
              />
            </div>
          </CardContent>
        </Card>

        {/* Registration Form - Mobile First */}
        {selectedDate && (
          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="space-y-3 sm:space-y-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 sm:h-5 w-4 sm:w-5 text-gray-600" />
                  <h3 className="font-semibold text-sm sm:text-base">Registrering for {selectedDate?.toLocaleDateString('no-NO')}</h3>
                </div>
                {/* Registreringstype velger */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4" />
                    Velg registreringstype *
                  </Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <Button
                      type="button"
                      variant={formData.registrering_type === 'arbeidstid' ? 'default' : 'outline'}
                      onClick={() => setFormData({ ...formData, registrering_type: 'arbeidstid' })}
                      className="text-xs sm:text-sm"
                    >
                      Arbeidstid
                    </Button>
                    <Button
                      type="button"
                      variant={formData.registrering_type === 'ferie' ? 'default' : 'outline'}
                      onClick={() => setFormData({ ...formData, registrering_type: 'ferie' })}
                      className="text-xs sm:text-sm"
                    >
                      Ferie
                    </Button>
                    <Button
                      type="button"
                      variant={formData.registrering_type === 'sykemelding' ? 'default' : 'outline'}
                      onClick={() => setFormData({ ...formData, registrering_type: 'sykemelding' })}
                      className="text-xs sm:text-sm"
                    >
                      Sykemelding
                    </Button>
                    <Button
                      type="button"
                      variant={formData.registrering_type === 'egenmelding' ? 'default' : 'outline'}
                      onClick={() => setFormData({ ...formData, registrering_type: 'egenmelding' })}
                      className="text-xs sm:text-sm"
                    >
                      Egenmelding
                    </Button>
                    <Button
                      type="button"
                      variant={formData.registrering_type === 'egenmelding_barn' ? 'default' : 'outline'}
                      onClick={() => setFormData({ ...formData, registrering_type: 'egenmelding_barn' })}
                      className="text-xs sm:text-sm"
                    >
                      Egenmelding barn
                    </Button>
                  </div>
                  {/* Vis kvote info for egenmelding */}
                  {formData.registrering_type === 'egenmelding' && egenmeldingKvoter && (
                    <>
                      {!egenmeldingKvoter.kan_bruke_egenmelding ? (
                        <div className="text-xs text-red-600 bg-red-50 p-2 rounded border border-red-200">
                          {egenmeldingKvoter.melding || 'Du kan ikke bruke egenmelding'}
                        </div>
                      ) : egenmeldingKvoter.egenmelding ? (
                        <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded border border-blue-200">
                          <strong>Egenmelding:</strong> {egenmeldingKvoter.egenmelding.antall_sykefravær}/{egenmeldingKvoter.egenmelding.maks_sykefravær} sykefravær brukt (maks {egenmeldingKvoter.egenmelding.dager_per_fravær} dager per sykefravær)
                        </div>
                      ) : null}
                    </>
                  )}
                  {formData.registrering_type === 'egenmelding_barn' && egenmeldingKvoter && (
                    <>
                      {!egenmeldingKvoter.kan_bruke_egenmelding ? (
                        <div className="text-xs text-red-600 bg-red-50 p-2 rounded border border-red-200">
                          {egenmeldingKvoter.melding || 'Du kan ikke bruke egenmelding'}
                        </div>
                      ) : egenmeldingKvoter.egenmelding_barn ? (
                        <div className="text-xs text-purple-600 bg-purple-50 p-2 rounded border border-purple-200">
                          <strong>Egenmelding barn:</strong> {egenmeldingKvoter.egenmelding_barn.brukt_dager}/{egenmeldingKvoter.egenmelding_barn.maks_dager} dager brukt
                        </div>
                      ) : null}
                    </>
                  )}
                </div>

                <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
                  {/* Arbeidstid skjema */}
                  {formData.registrering_type === 'arbeidstid' && (
                    <>
                      {/* Bil */}
                      <div className="space-y-2">
                        <Label htmlFor="bil" className="flex items-center gap-2">
                          <Truck className="h-4 w-4" />
                          Bil *
                        </Label>
                        <Select value={formData.bil_id} onValueChange={(value) => {
                          logger.log('Bil valgt:', value)
                          setFormData({ ...formData, bil_id: value })
                        }}>
                          <SelectTrigger>
                            <SelectValue placeholder="Velg bil" />
                          </SelectTrigger>
                          <SelectContent>
                            {biler.map((bil) => (
                              <SelectItem key={bil.id} value={bil.id.toString()}>
                                {bil.registreringsnummer} {bil.merke && `- ${bil.merke} ${bil.modell}`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Sone */}
                      <div className="space-y-2">
                        <Label htmlFor="sone" className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          Sone *
                        </Label>
                        <Input
                          id="sone"
                          value={formData.sone}
                          onChange={(e) => {
                            logger.log('Sone endret til:', e.target.value)
                            setFormData({ ...formData, sone: e.target.value })
                          }}
                          placeholder="Skriv inn sone"
                          required
                        />
                      </div>

                      {/* Sendinger */}
                      <div className="space-y-2">
                        <Label htmlFor="sendinger" className="flex items-center gap-2">
                          <Package className="h-4 w-4" />
                          Antall sendinger *
                        </Label>
                        <Input
                          id="sendinger"
                          type="number"
                          min="0"
                          value={formData.sendinger}
                          onChange={(e) => {
                            logger.log('Sendinger endret til:', e.target.value)
                            setFormData({ ...formData, sendinger: e.target.value })
                          }}
                          placeholder="0"
                          required
                        />
                      </div>

                      {/* Vekt */}
                      <div className="space-y-2">
                        <Label htmlFor="vekt" className="flex items-center gap-2">
                          <Scale className="h-4 w-4" />
                          Total vekt (kg) *
                        </Label>
                        <Input
                          id="vekt"
                          type="number"
                          min="0"
                          value={formData.vekt}
                          onChange={(e) => {
                            logger.log('Vekt endret til:', e.target.value)
                            setFormData({ ...formData, vekt: e.target.value })
                          }}
                          placeholder="0"
                          required
                        />
                      </div>

                      {/* Pause */}
                      <div className="space-y-2">
                        <Label htmlFor="pause" className="flex items-center gap-2">
                          <Pause className="h-4 w-4" />
                          Pause (minutter) *
                        </Label>
                        <Input
                          id="pause"
                          type="number"
                          min="0"
                          value={formData.pause}
                          onChange={(e) => setFormData({ ...formData, pause: e.target.value })}
                          placeholder="0"
                          required
                        />
                      </div>
                    </>
                  )}

                  {/* Ferie skjema */}
                  {formData.registrering_type === 'ferie' && (
                    <>
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <h4 className="font-medium text-blue-900 mb-2">Ferie registrering</h4>
                        <p className="text-sm text-blue-700">Registrer ferieperiode (fra–til dato).</p>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        <div className="space-y-2">
                          <Label>Fra dato *</Label>
                          <Input type="date" value={rangeStart ? formatDateForAPI(rangeStart) : ''} onChange={(e)=>setRangeStart(e.target.value? new Date(e.target.value): undefined)} />
                        </div>
                        <div className="space-y-2">
                          <Label>Til dato *</Label>
                          <Input type="date" value={rangeEnd ? formatDateForAPI(rangeEnd) : ''} onChange={(e)=>setRangeEnd(e.target.value? new Date(e.target.value): undefined)} />
                        </div>
                      </div>
                    </>
                  )}

                  {/* Sykemelding skjema */}
                  {formData.registrering_type === 'sykemelding' && (
                    <>
                      <div className="bg-red-50 p-3 rounded-lg">
                        <h4 className="font-medium text-red-900 mb-2">Sykemelding registrering</h4>
                        <p className="text-sm text-red-700">Registrer sykemelding (fra–til dato).</p>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        <div className="space-y-2">
                          <Label>Fra dato *</Label>
                          <Input type="date" value={rangeStart ? formatDateForAPI(rangeStart) : ''} onChange={(e)=>setRangeStart(e.target.value? new Date(e.target.value): undefined)} />
                        </div>
                        <div className="space-y-2">
                          <Label>Til dato *</Label>
                          <Input type="date" value={rangeEnd ? formatDateForAPI(rangeEnd) : ''} onChange={(e)=>setRangeEnd(e.target.value? new Date(e.target.value): undefined)} />
                        </div>
                      </div>
                    </>
                  )}

                  {/* Egenmelding skjema */}
                  {formData.registrering_type === 'egenmelding' && (
                    <>
                      <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                        <h4 className="font-medium text-yellow-900 mb-2">Egenmelding for deg selv</h4>
                        <p className="text-sm text-yellow-700 mb-1">Gjelder når du er syk.</p>
                        <p className="text-xs text-yellow-600">Du kan bruke egenmelding i inntil 3 dager per sykefravær. Maks 4 ganger per år.</p>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        <div className="space-y-2">
                          <Label>Fra dato *</Label>
                          <Input type="date" value={rangeStart ? formatDateForAPI(rangeStart) : ''} onChange={(e)=>setRangeStart(e.target.value? new Date(e.target.value): undefined)} />
                        </div>
                        <div className="space-y-2">
                          <Label>Til dato *</Label>
                          <Input type="date" value={rangeEnd ? formatDateForAPI(rangeEnd) : ''} onChange={(e)=>setRangeEnd(e.target.value? new Date(e.target.value): undefined)} />
                        </div>
                      </div>
                    </>
                  )}

                  {/* Egenmelding barn skjema */}
                  {formData.registrering_type === 'egenmelding_barn' && (
                    <>
                      <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
                        <h4 className="font-medium text-purple-900 mb-2">Egenmelding for sykt barn (omsorgsdager)</h4>
                        <p className="text-sm text-purple-700 mb-1">Gjelder når du må være hjemme med sykt barn under 12 år.</p>
                        <p className="text-xs text-purple-600">Vanligvis 10 dager per forelder per år (15 ved flere barn). Hver dag registreres som 7,5t.</p>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        <div className="space-y-2">
                          <Label>Fra dato *</Label>
                          <Input type="date" value={rangeStart ? formatDateForAPI(rangeStart) : ''} onChange={(e)=>setRangeStart(e.target.value? new Date(e.target.value): undefined)} />
                        </div>
                        <div className="space-y-2">
                          <Label>Til dato *</Label>
                          <Input type="date" value={rangeEnd ? formatDateForAPI(rangeEnd) : ''} onChange={(e)=>setRangeEnd(e.target.value? new Date(e.target.value): undefined)} />
                        </div>
                      </div>
                    </>
                  )}

                  {/* Tid-felter (kun arbeidstid) */}
                  {formData.registrering_type === 'arbeidstid' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    {/* Start tid */}
                    <div className="space-y-2">
                      <Label htmlFor="start_tid" className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Start tid *
                      </Label>
                      <Input
                        id="start_tid"
                        type="time"
                        value={formData.start_tid}
                        onChange={(e) => setFormData({ ...formData, start_tid: e.target.value })}
                        required
                      />
                    </div>

                    {/* Slutt tid */}
                    <div className="space-y-2">
                      <Label htmlFor="slutt_tid" className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Slutt tid *
                      </Label>
                      <Input
                        id="slutt_tid"
                        type="time"
                        value={formData.slutt_tid}
                        onChange={(e) => setFormData({ ...formData, slutt_tid: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  )}

                  {/* SGA-kode (kun arbeidstid) */}
                  {formData.registrering_type === 'arbeidstid' && (
                    <div className="space-y-2">
                      <Label htmlFor="sga_kode" className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        SGA-kode *
                      </Label>
                      <div className="space-y-2">
                        <Select 
                          value={sgaKodeType} 
                          onValueChange={(value: 'dropdown' | 'annet') => {
                            setSgaKodeType(value)
                            if (value === 'dropdown') {
                              setFormData({ ...formData, sga_kode_annet: '' })
                            } else {
                              setFormData({ ...formData, sga_kode_id: '' })
                            }
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Velg type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="dropdown">Velg fra liste</SelectItem>
                            <SelectItem value="annet">Annet (skriv inn)</SelectItem>
                          </SelectContent>
                        </Select>
                        
                        {sgaKodeType === 'dropdown' ? (
                          <Select 
                            value={formData.sga_kode_id} 
                            onValueChange={(value) => setFormData({ ...formData, sga_kode_id: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Velg SGA-kode" />
                            </SelectTrigger>
                            <SelectContent>
                              {sgaKoder.map((sga) => (
                                <SelectItem key={sga.id} value={sga.id.toString()}>
                                  {sga.kode} {sga.beskrivelse && `- ${sga.beskrivelse}`} 
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input
                            id="sga_kode_annet"
                            placeholder="Skriv inn SGA-kode eller lignende som skal faktureres"
                            value={formData.sga_kode_annet}
                            onChange={(e) => setFormData({ ...formData, sga_kode_annet: e.target.value })}
                            required
                          />
                        )}
                      </div>
                    </div>
                  )}

                  {/* Bomtur/Venting (kun arbeidstid) */}
                  {formData.registrering_type === 'arbeidstid' && (
                    <div className="space-y-2">
                      <Label htmlFor="bomtur_venting" className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Bomtur/Venting
                      </Label>
                      <Textarea
                        id="bomtur_venting"
                        placeholder="Beskriv årsak til bomtur eller ventetid (f.eks. 'Ventet 30 min på kunde', 'Bomtur til Obs Bygg Sandnes, Kunde ikke tilstede')"
                        value={formData.bomtur_venting}
                        onChange={(e) => setFormData({ ...formData, bomtur_venting: e.target.value })}
                        rows={2}
                      />
                    </div>
                  )}

                  {/* Kommentarer */}
                  <div className="space-y-2">
                    <Label htmlFor="kommentarer" className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      Kommentarer
                    </Label>
                    <Textarea
                      id="kommentarer"
                      value={formData.kommentarer}
                      onChange={(e) => setFormData({ ...formData, kommentarer: e.target.value })}
                      placeholder="Legg til kommentarer..."
                      rows={3}
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2">
                    <Button type="button" variant="outline" onClick={() => {
                      setFormData({
                        bil_id: '',
                        sone: '',
                        sendinger: '',
                        vekt: '',
                        pause: '',
                        kommentarer: '',
                        start_tid: '',
                        slutt_tid: '',
                        registrering_type: 'arbeidstid',
                        bomtur_venting: '',
                        sga_kode_id: '',
                        sga_kode_annet: ''
                      })
                      setSgaKodeType('dropdown')
                    }} className="w-full sm:w-auto text-sm sm:text-base">
                      Nullstill
                    </Button>
                    <Button type="submit" disabled={loading} className="w-full sm:w-auto text-sm sm:text-base">
                      {loading ? 'Lagrer...' : 'Lagre registrering'}
                    </Button>
                  </div>
                </form>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
