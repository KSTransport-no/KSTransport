'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { logger } from '@/lib/logger'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { NotificationBell } from '@/components/NotificationBell'
import {
  ArrowLeft,
  Users,
  Clock,
  Calendar,
  Truck,
  MapPin,
  Package,
  Pause,
  Scale,
  MessageSquare,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Plus,
  CheckCircle,
} from 'lucide-react'

interface Sjåfør {
  id: number
  navn: string
  epost: string
  telefon: string
  aktiv: boolean
  admin: boolean
}

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

interface Skift {
  id: number
  sjåfør_id: number
  bil_id: number
  sone_id: number
  sone: string
  dato: string
  start_tid: string
  slutt_tid?: string
  pause_minutter: number
  antall_sendinger: number
  vekt: number
  kommentarer?: string
  sjåfør_navn?: string
  bil_registreringsnummer?: string
  bil_merke?: string
  bil_modell?: string
  sone_navn?: string
  registrering_type?: string
  godkjent?: boolean
  godkjent_av_navn?: string
  godkjent_dato?: string
  bomtur_venting?: string
  sga_kode?: string
  sga_beskrivelse?: string
  sga_kode_annet?: string
}

export default function SjåførerOversiktPage() {
  const { sjåfør, isLoading, logout } = useAuth()
  const router = useRouter()

  const [sjåfører, setSjåfører] = useState<Sjåfør[]>([])
  const [valgtSjåførId, setValgtSjåførId] = useState<string>('')
  const [biler, setBiler] = useState<Bil[]>([])
  const [sgaKoder, setSgaKoder] = useState<SgaKode[]>([])
  const [skift, setSkift] = useState<Skift[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingSkift, setLoadingSkift] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // View state
  const [aktivOversikt, setAktivOversikt] = useState<'dag' | 'uke' | 'måned'>('dag')
  const [valgtDato, setValgtDato] = useState(() => {
    const today = new Date()
    return formatDate(today)
  })
  const [valgtUkeStart, setValgtUkeStart] = useState(() => {
    const d = new Date()
    const day = d.getDay() === 0 ? 7 : d.getDay()
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() - (day - 1))
    return d
  })
  const [valgtMåned, setValgtMåned] = useState(new Date())

  // Registration form state
  const [showForm, setShowForm] = useState(false)
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
    sga_kode_annet: '',
    dato: formatDate(new Date()),
  })
  const [sgaKodeType, setSgaKodeType] = useState<'dropdown' | 'annet'>('dropdown')
  const [rangeStart, setRangeStart] = useState<string>('')
  const [rangeEnd, setRangeEnd] = useState<string>('')

  function formatDate(d: Date): string {
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const getToken = () =>
    document.cookie.split('; ').find((row) => row.startsWith('token='))?.split('=')[1]

  // Load initial data
  useEffect(() => {
    if (!sjåfør || !sjåfør.admin) return
    loadSjåfører()
    loadBiler()
    loadSgaKoder()
  }, [sjåfør])

  // Load shifts when driver or view changes
  useEffect(() => {
    if (valgtSjåførId) {
      loadSkift()
    }
  }, [valgtSjåførId, aktivOversikt, valgtDato, valgtUkeStart, valgtMåned])

  const loadSjåfører = async () => {
    try {
      const token = getToken()
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/crud/drivers`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setSjåfører(data)
      }
    } catch (error) {
      logger.error('Failed to load drivers:', error)
    }
  }

  const loadBiler = async () => {
    try {
      const token = getToken()
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/data/biler`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) setBiler(await res.json())
    } catch (error) {
      logger.error('Failed to load cars:', error)
    }
  }

  const loadSgaKoder = async () => {
    try {
      const token = getToken()
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/data/sga-koder`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) setSgaKoder(await res.json())
    } catch (error) {
      logger.error('Failed to load SGA codes:', error)
    }
  }

  const loadSkift = async () => {
    if (!valgtSjåførId) return
    setLoadingSkift(true)
    try {
      const token = getToken()
      let fraDato: string
      let tilDato: string

      if (aktivOversikt === 'dag') {
        fraDato = valgtDato
        tilDato = valgtDato
      } else if (aktivOversikt === 'uke') {
        fraDato = formatDate(valgtUkeStart)
        const end = new Date(valgtUkeStart)
        end.setDate(end.getDate() + 6)
        tilDato = formatDate(end)
      } else {
        const y = valgtMåned.getFullYear()
        const m = valgtMåned.getMonth()
        fraDato = formatDate(new Date(y, m, 1))
        tilDato = formatDate(new Date(y, m + 1, 0))
      }

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/registreringer?sjåfør_id=${valgtSjåførId}&fra_dato=${fraDato}&til_dato=${tilDato}&limit=200`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (res.ok) {
        const data = await res.json()
        setSkift(data.sort((a: Skift, b: Skift) => a.dato < b.dato ? 1 : -1))
      }
    } catch (error) {
      logger.error('Failed to load shifts:', error)
    } finally {
      setLoadingSkift(false)
    }
  }

  const beregnArbeidstid = (s: Skift): string => {
    if (!s.start_tid || !s.slutt_tid) return '-'
    const start = new Date(s.start_tid)
    const slutt = new Date(s.slutt_tid)
    const diffMs = slutt.getTime() - start.getTime() - (s.pause_minutter || 0) * 60000
    if (diffMs <= 0) return '-'
    const timer = Math.floor(diffMs / 3600000)
    const minutter = Math.floor((diffMs % 3600000) / 60000)
    return `${timer}t ${minutter}m`
  }

  const beregnTotalTimer = (skiftList: Skift[]): { timer: number; minutter: number } => {
    let totalMs = 0
    for (const s of skiftList) {
      if (!s.start_tid || !s.slutt_tid) continue
      const start = new Date(s.start_tid)
      const slutt = new Date(s.slutt_tid)
      totalMs += slutt.getTime() - start.getTime() - (s.pause_minutter || 0) * 60000
    }
    if (totalMs < 0) totalMs = 0
    return { timer: Math.floor(totalMs / 3600000), minutter: Math.floor((totalMs % 3600000) / 60000) }
  }

  const formatTid = (tid: string): string => {
    if (!tid) return '-'
    const d = new Date(tid)
    return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`
  }

  const getRegTypeLabel = (type?: string) => {
    const labels: Record<string, string> = {
      arbeidstid: 'Arbeidstid',
      ferie: 'Ferie',
      sykemelding: 'Sykemelding',
      egenmelding: 'Egenmelding',
      egenmelding_barn: 'Egenmelding barn',
    }
    return labels[type || 'arbeidstid'] || type || 'Arbeidstid'
  }

  const getRegTypeBadgeColor = (type?: string) => {
    const colors: Record<string, string> = {
      arbeidstid: 'bg-green-100 text-green-800',
      ferie: 'bg-blue-100 text-blue-800',
      sykemelding: 'bg-red-100 text-red-800',
      egenmelding: 'bg-yellow-100 text-yellow-800',
      egenmelding_barn: 'bg-purple-100 text-purple-800',
    }
    return colors[type || 'arbeidstid'] || 'bg-gray-100 text-gray-800'
  }

  // Navigation helpers
  const navigateDag = (dir: number) => {
    const d = new Date(valgtDato)
    d.setDate(d.getDate() + dir)
    setValgtDato(formatDate(d))
  }

  const navigateUke = (dir: number) => {
    const d = new Date(valgtUkeStart)
    d.setDate(d.getDate() + dir * 7)
    setValgtUkeStart(d)
  }

  const navigateMåned = (dir: number) => {
    const d = new Date(valgtMåned)
    d.setMonth(d.getMonth() + dir)
    setValgtMåned(d)
  }

  // Form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!valgtSjåførId) {
      setMessage({ type: 'error', text: 'Velg en sjåfør først' })
      return
    }

    const type = formData.registrering_type

    if (type === 'arbeidstid') {
      if (!formData.bil_id || !formData.sone || !formData.sendinger || !formData.vekt || !formData.pause || !formData.start_tid || !formData.slutt_tid) {
        setMessage({ type: 'error', text: 'Fyll inn alle obligatoriske felter' })
        return
      }
      if (sgaKodeType === 'dropdown' && !formData.sga_kode_id) {
        setMessage({ type: 'error', text: 'Velg en SGA-kode' })
        return
      }
      if (sgaKodeType === 'annet' && !formData.sga_kode_annet) {
        setMessage({ type: 'error', text: 'Skriv inn SGA-kode' })
        return
      }
    } else {
      if (!rangeStart || !rangeEnd) {
        setMessage({ type: 'error', text: 'Velg fra- og til-dato' })
        return
      }
    }

    setLoading(true)
    setMessage(null)
    try {
      const token = getToken()

      if (type !== 'arbeidstid') {
        // Period-based: create one entry per day
        const days: string[] = []
        const cur = new Date(rangeStart)
        const end = new Date(rangeEnd)
        cur.setHours(0, 0, 0, 0)
        end.setHours(0, 0, 0, 0)
        while (cur <= end) {
          days.push(formatDate(cur))
          cur.setDate(cur.getDate() + 1)
        }
        for (const d of days) {
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/tidregistrering`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sjåfør_id: parseInt(valgtSjåførId),
              dato: d,
              start_tid: `${d}T00:00:00.000Z`,
              slutt_tid: `${d}T00:00:00.000Z`,
              registrering_type: type,
              kommentarer: formData.kommentarer || '',
            }),
          })
          if (!res.ok) {
            const err = await res.json().catch(() => ({}))
            throw new Error(err.feil || 'Feil ved lagring')
          }
        }
      } else {
        const requestData = {
          sjåfør_id: parseInt(valgtSjåførId),
          bil_id: formData.bil_id ? parseInt(formData.bil_id) : null,
          sone: formData.sone || null,
          sendinger: formData.sendinger ? parseInt(formData.sendinger) : 0,
          vekt: formData.vekt ? parseInt(formData.vekt) : 0,
          pause: formData.pause ? parseInt(formData.pause) : 0,
          kommentarer: formData.kommentarer || '',
          dato: formData.dato,
          start_tid: `${formData.dato}T${formData.start_tid}:00.000Z`,
          slutt_tid: `${formData.dato}T${formData.slutt_tid}:00.000Z`,
          registrering_type: 'arbeidstid',
          bomtur_venting: formData.bomtur_venting || null,
          sga_kode_id: sgaKodeType === 'dropdown' && formData.sga_kode_id ? parseInt(formData.sga_kode_id) : null,
          sga_kode_annet: sgaKodeType === 'annet' && formData.sga_kode_annet ? formData.sga_kode_annet : null,
        }
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/tidregistrering`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(requestData),
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error(err.feil || 'Feil ved lagring')
        }
      }

      const driverName = sjåfører.find((s) => s.id.toString() === valgtSjåførId)?.navn || 'sjåfør'
      setMessage({ type: 'success', text: `Registrering lagret for ${driverName}!` })
      resetForm()
      setShowForm(false)
      loadSkift()
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Feil ved lagring' })
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
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
      sga_kode_annet: '',
      dato: formatDate(new Date()),
    })
    setSgaKodeType('dropdown')
    setRangeStart('')
    setRangeEnd('')
  }

  const valgtSjåfør = sjåfører.find((s) => s.id.toString() === valgtSjåførId)
  const totalTimer = beregnTotalTimer(skift)
  const totalSendinger = skift.reduce((sum, s) => sum + (s.antall_sendinger || 0), 0)
  const totalVekt = skift.reduce((sum, s) => sum + (s.vekt || 0), 0)

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!sjåfør || !sjåfør.admin) {
    router.push('/')
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 p-2 sm:p-4">
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={() => router.push('/admin')}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-gray-900">Sjåfør-oversikt</h1>
                <p className="text-gray-600 text-xs sm:text-sm">Se og registrer timer for sjåfører</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <NotificationBell />
              <Button variant="outline" size="sm" onClick={logout} className="flex items-center gap-1 text-xs sm:text-sm">
                <LogOut className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Logg ut</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Messages */}
        {message && (
          <div
            className={`p-3 rounded-lg text-sm ${
              message.type === 'success'
                ? 'bg-green-100 text-green-800 border border-green-200'
                : 'bg-red-100 text-red-800 border border-red-200'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Driver Selector */}
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600" />
                <Label className="font-semibold text-sm whitespace-nowrap">Velg sjåfør:</Label>
              </div>
              <Select value={valgtSjåførId} onValueChange={(v) => { setValgtSjåførId(v); setSkift([]) }}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Velg en sjåfør..." />
                </SelectTrigger>
                <SelectContent>
                  {sjåfører.filter((s) => s.aktiv).map((s) => (
                    <SelectItem key={s.id} value={s.id.toString()}>
                      {s.navn} ({s.epost})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {valgtSjåførId && (
                <Button size="sm" onClick={() => { setShowForm(!showForm); setMessage(null) }} className="whitespace-nowrap">
                  <Plus className="h-4 w-4 mr-1" />
                  Ny registrering
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Registration form (admin on behalf) */}
        {showForm && valgtSjåførId && (
          <Card>
            <CardHeader className="p-3 sm:p-4">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Ny registrering for {valgtSjåfør?.navn}
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Registrer tid på vegne av sjåfør
              </CardDescription>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 pt-0">
              <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
                {/* Registration type */}
                <div className="space-y-2">
                  <Label>Registreringstype *</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {(['arbeidstid', 'ferie', 'sykemelding', 'egenmelding', 'egenmelding_barn'] as const).map((type) => (
                      <Button
                        key={type}
                        type="button"
                        variant={formData.registrering_type === type ? 'default' : 'outline'}
                        onClick={() => setFormData({ ...formData, registrering_type: type })}
                        className="text-xs sm:text-sm"
                      >
                        {getRegTypeLabel(type)}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Arbeidstid fields */}
                {formData.registrering_type === 'arbeidstid' && (
                  <>
                    <div className="space-y-2">
                      <Label>Dato *</Label>
                      <Input
                        type="date"
                        value={formData.dato}
                        onChange={(e) => setFormData({ ...formData, dato: e.target.value })}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="flex items-center gap-2"><Truck className="h-4 w-4" /> Bil *</Label>
                      <Select value={formData.bil_id} onValueChange={(v) => setFormData({ ...formData, bil_id: v })}>
                        <SelectTrigger><SelectValue placeholder="Velg bil" /></SelectTrigger>
                        <SelectContent>
                          {biler.map((b) => (
                            <SelectItem key={b.id} value={b.id.toString()}>
                              {b.registreringsnummer} {b.merke && `- ${b.merke} ${b.modell}`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="flex items-center gap-2"><MapPin className="h-4 w-4" /> Sone *</Label>
                      <Input value={formData.sone} onChange={(e) => setFormData({ ...formData, sone: e.target.value })} placeholder="Skriv inn sone" required />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2"><Package className="h-4 w-4" /> Sendinger *</Label>
                        <Input type="number" min="0" value={formData.sendinger} onChange={(e) => setFormData({ ...formData, sendinger: e.target.value })} placeholder="0" required />
                      </div>
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2"><Scale className="h-4 w-4" /> Vekt (kg) *</Label>
                        <Input type="number" min="0" value={formData.vekt} onChange={(e) => setFormData({ ...formData, vekt: e.target.value })} placeholder="0" required />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="flex items-center gap-2"><Pause className="h-4 w-4" /> Pause (min) *</Label>
                      <Input type="number" min="0" value={formData.pause} onChange={(e) => setFormData({ ...formData, pause: e.target.value })} placeholder="0" required />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2"><Clock className="h-4 w-4" /> Start tid *</Label>
                        <Input type="time" value={formData.start_tid} onChange={(e) => setFormData({ ...formData, start_tid: e.target.value })} required />
                      </div>
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2"><Clock className="h-4 w-4" /> Slutt tid *</Label>
                        <Input type="time" value={formData.slutt_tid} onChange={(e) => setFormData({ ...formData, slutt_tid: e.target.value })} required />
                      </div>
                    </div>

                    {/* SGA code */}
                    <div className="space-y-2">
                      <Label>SGA-kode *</Label>
                      <Select value={sgaKodeType} onValueChange={(v: 'dropdown' | 'annet') => {
                        setSgaKodeType(v)
                        if (v === 'dropdown') setFormData({ ...formData, sga_kode_annet: '' })
                        else setFormData({ ...formData, sga_kode_id: '' })
                      }}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="dropdown">Velg fra liste</SelectItem>
                          <SelectItem value="annet">Annet (skriv inn)</SelectItem>
                        </SelectContent>
                      </Select>
                      {sgaKodeType === 'dropdown' ? (
                        <Select value={formData.sga_kode_id} onValueChange={(v) => setFormData({ ...formData, sga_kode_id: v })}>
                          <SelectTrigger><SelectValue placeholder="Velg SGA-kode" /></SelectTrigger>
                          <SelectContent>
                            {sgaKoder.map((sga) => (
                              <SelectItem key={sga.id} value={sga.id.toString()}>
                                {sga.kode} {sga.beskrivelse && `- ${sga.beskrivelse}`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input placeholder="Skriv inn SGA-kode" value={formData.sga_kode_annet} onChange={(e) => setFormData({ ...formData, sga_kode_annet: e.target.value })} required />
                      )}
                    </div>

                    {/* Bomtur/Venting */}
                    <div className="space-y-2">
                      <Label>Bomtur/Venting</Label>
                      <Textarea placeholder="Beskriv bomtur eller ventetid..." value={formData.bomtur_venting} onChange={(e) => setFormData({ ...formData, bomtur_venting: e.target.value })} rows={2} />
                    </div>
                  </>
                )}

                {/* Period-based fields */}
                {formData.registrering_type !== 'arbeidstid' && (
                  <>
                    <div className={`p-3 rounded-lg ${
                      formData.registrering_type === 'ferie' ? 'bg-blue-50 border border-blue-200' :
                      formData.registrering_type === 'sykemelding' ? 'bg-red-50 border border-red-200' :
                      formData.registrering_type === 'egenmelding' ? 'bg-yellow-50 border border-yellow-200' :
                      'bg-purple-50 border border-purple-200'
                    }`}>
                      <p className="text-sm font-medium">{getRegTypeLabel(formData.registrering_type)}</p>
                      <p className="text-xs text-gray-600 mt-1">
                        {formData.registrering_type === 'egenmelding' && 'Maks 3 dager per sykefravær, 4 ganger per år.'}
                        {formData.registrering_type === 'egenmelding_barn' && 'Maks 10 dager per forelder per år (15 ved flere barn).'}
                        {formData.registrering_type === 'ferie' && 'Registrer ferieperiode.'}
                        {formData.registrering_type === 'sykemelding' && 'Registrer sykemeldingsperiode.'}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>Fra dato *</Label>
                        <Input type="date" value={rangeStart} onChange={(e) => setRangeStart(e.target.value)} required />
                      </div>
                      <div className="space-y-2">
                        <Label>Til dato *</Label>
                        <Input type="date" value={rangeEnd} onChange={(e) => setRangeEnd(e.target.value)} required />
                      </div>
                    </div>
                  </>
                )}

                {/* Comments */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2"><MessageSquare className="h-4 w-4" /> Kommentarer</Label>
                  <Textarea value={formData.kommentarer} onChange={(e) => setFormData({ ...formData, kommentarer: e.target.value })} placeholder="Legg til kommentarer..." rows={2} />
                </div>

                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="outline" onClick={() => { setShowForm(false); resetForm() }}>
                    Avbryt
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? 'Lagrer...' : 'Lagre registrering'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Driver activity overview */}
        {valgtSjåførId && (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <Card>
                <CardContent className="p-3 text-center">
                  <p className="text-xs text-gray-500">Timer</p>
                  <p className="text-lg font-bold text-green-600">{totalTimer.timer}t {totalTimer.minutter}m</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <p className="text-xs text-gray-500">Sendinger</p>
                  <p className="text-lg font-bold text-blue-600">{totalSendinger}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <p className="text-xs text-gray-500">Vekt</p>
                  <p className="text-lg font-bold text-purple-600">{totalVekt} kg</p>
                </CardContent>
              </Card>
            </div>

            {/* Tab navigation */}
            <Card>
              <CardContent className="p-3 sm:p-4">
                <div className="flex flex-col gap-3">
                  {/* View tabs */}
                  <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
                    {(['dag', 'uke', 'måned'] as const).map((tab) => (
                      <Button
                        key={tab}
                        variant={aktivOversikt === tab ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setAktivOversikt(tab)}
                        className="flex-1 text-xs sm:text-sm"
                      >
                        {tab === 'dag' ? 'Dag' : tab === 'uke' ? 'Uke' : 'Måned'}
                      </Button>
                    ))}
                  </div>

                  {/* Navigation controls */}
                  <div className="flex items-center justify-between">
                    <Button variant="outline" size="sm" onClick={() => {
                      if (aktivOversikt === 'dag') navigateDag(-1)
                      else if (aktivOversikt === 'uke') navigateUke(-1)
                      else navigateMåned(-1)
                    }}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>

                    <span className="text-sm font-medium text-center px-2">
                      {aktivOversikt === 'dag' && new Date(valgtDato + 'T12:00:00').toLocaleDateString('no-NO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                      {aktivOversikt === 'uke' && (() => {
                        const end = new Date(valgtUkeStart)
                        end.setDate(end.getDate() + 6)
                        return `${valgtUkeStart.toLocaleDateString('no-NO', { day: 'numeric', month: 'short' })} - ${end.toLocaleDateString('no-NO', { day: 'numeric', month: 'short', year: 'numeric' })}`
                      })()}
                      {aktivOversikt === 'måned' && valgtMåned.toLocaleDateString('no-NO', { month: 'long', year: 'numeric' })}
                    </span>

                    <Button variant="outline" size="sm" onClick={() => {
                      if (aktivOversikt === 'dag') navigateDag(1)
                      else if (aktivOversikt === 'uke') navigateUke(1)
                      else navigateMåned(1)
                    }}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="flex justify-center">
                    <Button variant="ghost" size="sm" className="text-xs" onClick={() => {
                      const today = new Date()
                      setValgtDato(formatDate(today))
                      const day = today.getDay() === 0 ? 7 : today.getDay()
                      const weekStart = new Date(today)
                      weekStart.setDate(today.getDate() - (day - 1))
                      setValgtUkeStart(weekStart)
                      setValgtMåned(today)
                    }}>
                      I dag
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Shifts list */}
            <Card>
              <CardHeader className="p-3 sm:p-4">
                <CardTitle className="text-base sm:text-lg">
                  Registreringer ({skift.length})
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  {valgtSjåfør?.navn} - {aktivOversikt === 'dag' ? 'dagsoversikt' : aktivOversikt === 'uke' ? 'ukeoversikt' : 'månedsoversikt'}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 pt-0">
                {loadingSkift ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    <p className="text-sm text-gray-500 mt-2">Laster registreringer...</p>
                  </div>
                ) : skift.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Clock className="h-10 w-10 mx-auto mb-3 text-gray-300" />
                    <p className="text-sm">Ingen registreringer i denne perioden</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {skift.map((s) => (
                      <div key={s.id} className="border rounded-lg p-3 bg-gray-50">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-blue-600" />
                            <span className="font-medium text-sm">
                              {new Date(s.dato).toLocaleDateString('no-NO', { weekday: 'short', day: 'numeric', month: 'short' })}
                            </span>
                            <Badge className={`text-[10px] ${getRegTypeBadgeColor(s.registrering_type)}`}>
                              {getRegTypeLabel(s.registrering_type)}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-green-600">{beregnArbeidstid(s)}</span>
                            {s.godkjent && <CheckCircle className="h-4 w-4 text-green-500" />}
                          </div>
                        </div>

                        {s.registrering_type === 'arbeidstid' || !s.registrering_type ? (
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-gray-600">
                            <div className="flex items-center gap-1.5">
                              <Clock className="h-3.5 w-3.5 text-gray-400" />
                              <span>{formatTid(s.start_tid)} - {s.slutt_tid ? formatTid(s.slutt_tid) : '...'}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Truck className="h-3.5 w-3.5 text-gray-400" />
                              <span className="truncate">{s.bil_registreringsnummer || '-'}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <MapPin className="h-3.5 w-3.5 text-gray-400" />
                              <span className="truncate">{s.sone_navn || s.sone || '-'}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Package className="h-3.5 w-3.5 text-gray-400" />
                              <span>{s.antall_sendinger} sendinger</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Scale className="h-3.5 w-3.5 text-gray-400" />
                              <span>{s.vekt || 0} kg</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Pause className="h-3.5 w-3.5 text-gray-400" />
                              <span>{s.pause_minutter} min pause</span>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500 italic">
                            {getRegTypeLabel(s.registrering_type)} registrert
                          </p>
                        )}

                        {s.kommentarer && (
                          <div className="mt-2 p-2 bg-white rounded border-l-4 border-blue-200">
                            <p className="text-xs text-gray-600">{s.kommentarer}</p>
                          </div>
                        )}

                        {(s.sga_kode || s.sga_kode_annet) && (
                          <div className="mt-1">
                            <Badge variant="outline" className="text-[10px]">
                              SGA: {s.sga_kode || s.sga_kode_annet}
                            </Badge>
                          </div>
                        )}

                        {s.bomtur_venting && (
                          <div className="mt-1 p-2 bg-yellow-50 rounded border-l-4 border-yellow-300">
                            <p className="text-xs text-yellow-800">Bomtur/Venting: {s.bomtur_venting}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {/* Empty state when no driver selected */}
        {!valgtSjåførId && (
          <Card>
            <CardContent className="p-8 text-center">
              <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <h3 className="font-medium text-gray-700 mb-1">Velg en sjåfør</h3>
              <p className="text-sm text-gray-500">Velg en sjåfør fra listen over for å se registreringer og legge til nye.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
