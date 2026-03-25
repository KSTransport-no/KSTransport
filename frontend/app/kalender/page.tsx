'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { logger } from '@/lib/logger'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Calendar, Clock, Truck, MapPin, Package, ChevronLeft, ChevronRight, Scale, Edit, Key, LogOut, CheckCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import CalendarComponent from 'react-calendar'
import 'react-calendar/dist/Calendar.css'
import './calendar.css'

interface Skift {
  id: number
  start_tid: string
  slutt_tid?: string
  pause_minutter: number
  antall_sendinger: number
  vekt: number
  kommentar?: string
  bomtur_venting?: string
  bil_registreringsnummer: string
  bil_merke: string
  bil_modell: string
  sone_navn: string
  dato: string
  registrering_type?: string
  sga_kode?: string
  sga_beskrivelse?: string
  sga_skal_faktureres?: boolean
  sga_kode_annet?: string
  godkjent?: boolean
  godkjent_av?: number
  godkjent_dato?: string
  godkjent_av_navn?: string
}

interface KalenderDag {
  dato: string
  antall_skift: number
  skift: Skift[]
}

interface EditSkiftFormProps {
  skift: Skift
  onSave: (updatedSkift: Partial<Skift>) => void
  onCancel: () => void
}

function EditSkiftForm({ skift, onSave, onCancel }: EditSkiftFormProps) {
  const [formData, setFormData] = useState({
    bomtur_venting: skift.bomtur_venting || '',
    kommentar: skift.kommentar || '',
    pause_minutter: skift.pause_minutter || 0,
    antall_sendinger: skift.antall_sendinger || 0,
    vekt: skift.vekt || 0
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Bomtur/Venting</label>
        <textarea
          value={formData.bomtur_venting}
          onChange={(e) => setFormData({ ...formData, bomtur_venting: e.target.value })}
          placeholder="Beskriv årsak til bomtur eller ventetid"
          className="w-full p-2 border rounded-md text-sm"
          rows={2}
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium mb-1">Kommentar</label>
        <textarea
          value={formData.kommentar}
          onChange={(e) => setFormData({ ...formData, kommentar: e.target.value })}
          placeholder="Legg til kommentar"
          className="w-full p-2 border rounded-md text-sm"
          rows={2}
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium mb-1">Pause (minutter)</label>
        <input
          type="number"
          value={formData.pause_minutter}
          onChange={(e) => setFormData({ ...formData, pause_minutter: parseInt(e.target.value) || 0 })}
          className="w-full p-2 border rounded-md text-sm"
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium mb-1">Antall sendinger</label>
        <input
          type="number"
          value={formData.antall_sendinger}
          onChange={(e) => setFormData({ ...formData, antall_sendinger: parseInt(e.target.value) || 0 })}
          className="w-full p-2 border rounded-md text-sm"
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium mb-1">Vekt (kg)</label>
        <input
          type="number"
          value={formData.vekt}
          onChange={(e) => setFormData({ ...formData, vekt: parseInt(e.target.value) || 0 })}
          className="w-full p-2 border rounded-md text-sm"
        />
      </div>
      
      <div className="flex gap-2 pt-4">
        <Button type="submit" className="flex-1">
          Lagre endringer
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
          Avbryt
        </Button>
      </div>
    </form>
  )
}

export default function KalenderPage() {
  const { sjåfør, logout } = useAuth()
  const [kalenderData, setKalenderData] = useState<KalenderDag[]>([])
  const [selectedDag, setSelectedDag] = useState<KalenderDag | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [editingSkift, setEditingSkift] = useState<Skift | null>(null)
  const [showEditForm, setShowEditForm] = useState(false)

  useEffect(() => {
    if (sjåfør) {
      loadKalenderData()
    }
  }, [sjåfør, currentMonth])

  // Force styling after calendar renders
  useEffect(() => {
    const applyCustomStyling = () => {
      // Apply weekend styling
      const weekendCells = document.querySelectorAll('.custom-calendar .e-weekend .e-day-text')
      weekendCells.forEach((cell: any) => {
        cell.style.color = '#dc2626'
      })

      // Apply holiday styling
      const holidayCells = document.querySelectorAll('.custom-calendar .holiday .e-day-text')
      holidayCells.forEach((cell: any) => {
        cell.style.color = '#dc2626'
        cell.style.fontWeight = '700'
      })

      // Apply data styling
      const dataCells = document.querySelectorAll('.custom-calendar .has-data .e-day-text')
      dataCells.forEach((cell: any) => {
        cell.style.fontWeight = '700'
      })
    }

    // Apply styling after a short delay to ensure calendar is rendered
    const timer = setTimeout(applyCustomStyling, 100)
    return () => clearTimeout(timer)
  }, [kalenderData, currentMonth])

  const formatDateForAPI = (date: Date): string => {
    // Bruk lokal timezone for å unngå UTC-konvertering
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const normalizeDateString = (value: string): string => {
    // Håndter både 'YYYY-MM-DD' og ISO-stringer
    try {
      if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value
      const d = new Date(value)
      return formatDateForAPI(d)
    } catch {
      return value
    }
  }

  useEffect(() => {
    if (sjåfør && selectedDate) {
      loadDagDetaljer(formatDateForAPI(selectedDate))
    }
  }, [sjåfør, selectedDate])

  const loadKalenderData = async () => {
    setLoading(true)
    try {
      const token = document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1]
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/data/kalender?år=${currentMonth.getFullYear()}&måned=${currentMonth.getMonth() + 1}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (response.ok) {
        const data = await response.json()
        setKalenderData(data)
      }
    } catch (error) {
      logger.error('Feil ved lasting av kalenderdata:', error)
      setMessage({ type: 'error', text: 'Feil ved lasting av kalenderdata' })
    } finally {
      setLoading(false)
    }
  }

  const loadDagDetaljer = async (dato: string) => {
    try {
      const token = document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1]
      const url = `${process.env.NEXT_PUBLIC_API_URL}/skift?dato=${dato}`
      logger.log('Kaller skift-endpoint med URL:', url)
      logger.log('Dato parameter:', dato)
      
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
        logger.log('Response status:', response.status)
      
      if (response.ok) {
        const skift = await response.json()
          logger.log('Skift data fra backend:', skift)
        setSelectedDag({ dato, antall_skift: skift.length, skift })
      } else {
          logger.error('Response ikke OK:', response.status, response.statusText)
      }
    } catch (error) {
      logger.error('Feil ved lasting av dagdetaljer:', error)
    }
  }

  const previousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))
  }

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))
  }

  const handleDateChange = (value: any) => {
    if (value instanceof Date) {
      setSelectedDate(value)
    }
  }

  const formatDato = (dato: string) => {
    return new Date(dato).toLocaleDateString('no-NO', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
  }

  const formatTid = (tid: string) => {
    const date = new Date(tid)
    return date.toLocaleTimeString('no-NO', { 
      hour: '2-digit', 
      minute: '2-digit',
      timeZone: 'UTC'
    })
  }

  const beregnArbeidstid = (skift: Skift) => {
    if (!skift.slutt_tid) return 'Pågående'
    
    const start = new Date(skift.start_tid)
    const slutt = new Date(skift.slutt_tid)
    const diffMs = slutt.getTime() - start.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
    // Ikke trekk fra pause - vis total tid
    const totalMinutes = (diffHours * 60) + diffMinutes
    const arbeidstimer = Math.floor(totalMinutes / 60)
    const arbeidsminutter = totalMinutes % 60
    
    return `${arbeidstimer}t ${arbeidsminutter}m`
  }

  const getRegistreringTypeColor = (type?: string) => {
    switch (type) {
      case 'arbeidstid': return 'bg-blue-500'
      case 'ferie': return 'bg-green-500'
      case 'sykemelding': return 'bg-red-500'
      case 'egenmelding': return 'bg-yellow-500'
      case 'egenmelding_barn': return 'bg-purple-500'
      default: return 'bg-gray-500'
    }
  }

  const getRegistreringTypeLabel = (type?: string) => {
    switch (type) {
      case 'arbeidstid': return 'Arbeidstid'
      case 'ferie': return 'Ferie'
      case 'sykemelding': return 'Sykemelding'
      case 'egenmelding': return 'Egenmelding'
      case 'egenmelding_barn': return 'Egenmelding barn'
      default: return 'Ukjent'
    }
  }

  // Funksjon for å beregne ukenummer
  const getWeekNumber = (date: Date): number => {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1)
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7)
  }

  // Funksjon for å sjekke om en dato er en norsk helligdag
  const isNorwegianHoliday = (date: Date): boolean => {
    const year = date.getFullYear()
    const month = date.getMonth() + 1
    const day = date.getDate()
    
    // Faste helligdager
    const fixedHolidays = [
      { month: 1, day: 1 },   // Nyttårsdag
      { month: 5, day: 1 },   // Arbeidernes dag
      { month: 5, day: 17 },  // Grunnlovsdag
      { month: 12, day: 24 }, // Julaften
      { month: 12, day: 25 }, // 1. juledag
      { month: 12, day: 26 }, // 2. juledag
      { month: 12, day: 31 }, // Nyttårsaften
    ]
    
    // Beregn påske (forenklet versjon)
    const a = year % 19
    const b = Math.floor(year / 100)
    const c = year % 100
    const d = Math.floor(b / 4)
    const e = b % 4
    const f = Math.floor((b + 8) / 25)
    const g = Math.floor((b - f + 1) / 3)
    const h = (19 * a + b - d - g + 15) % 30
    const i = Math.floor(c / 4)
    const k = c % 4
    const l = (32 + 2 * e + 2 * i - h - k) % 7
    const m = Math.floor((a + 11 * h + 22 * l) / 451)
    const n = Math.floor((h + l - 7 * m + 114) / 31)
    const p = (h + l - 7 * m + 114) % 31
    
    const easterMonth = n
    const easterDay = p + 1
    
    // Beregn bevegelige helligdager basert på påske
    const easterDate = new Date(year, easterMonth - 1, easterDay)
    const palmSunday = new Date(easterDate.getTime() - 7 * 24 * 60 * 60 * 1000)
    const maundyThursday = new Date(easterDate.getTime() - 3 * 24 * 60 * 60 * 1000)
    const goodFriday = new Date(easterDate.getTime() - 2 * 24 * 60 * 60 * 1000)
    const easterMonday = new Date(easterDate.getTime() + 1 * 24 * 60 * 60 * 1000)
    const ascensionDay = new Date(easterDate.getTime() + 39 * 24 * 60 * 60 * 1000)
    const whitSunday = new Date(easterDate.getTime() + 49 * 24 * 60 * 60 * 1000)
    const whitMonday = new Date(easterDate.getTime() + 50 * 24 * 60 * 60 * 1000)
    
    const movableHolidays = [
      palmSunday,
      maundyThursday,
      goodFriday,
      easterDate,
      easterMonday,
      ascensionDay,
      whitSunday,
      whitMonday
    ]
    
    // Sjekk faste helligdager
    for (const holiday of fixedHolidays) {
      if (month === holiday.month && day === holiday.day) {
        return true
      }
    }
    
    // Sjekk bevegelige helligdager
    for (const holiday of movableHolidays) {
      if (holiday.getMonth() + 1 === month && holiday.getDate() === day) {
        return true
      }
    }
    
    return false
  }

  // Funksjon for å få helligdag-navn
  const startEditSkift = (skift: Skift) => {
    setEditingSkift(skift)
    setShowEditForm(true)
  }

  const cancelEdit = () => {
    setEditingSkift(null)
    setShowEditForm(false)
  }

  const updateSkift = async (updatedSkift: Partial<Skift>) => {
    if (!editingSkift) return

    try {
      const response = await fetch(`/api/tidregistrering/${editingSkift.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(updatedSkift)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.feil || 'Feil ved oppdatering av skift')
      }

      setMessage({ type: 'success', text: 'Skift oppdatert!' })
      setShowEditForm(false)
      setEditingSkift(null)
      
      // Reload data
      loadKalenderData()
      if (selectedDag) {
        loadDagDetaljer(formatDateForAPI(selectedDate))
      }
    } catch (error) {
      logger.error('Feil ved oppdatering av skift:', error)
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Feil ved oppdatering av skift' })
    }
  }

  const getHolidayName = (date: Date): string | null => {
    const year = date.getFullYear()
    const month = date.getMonth() + 1
    const day = date.getDate()
    
    // Faste helligdager
    const fixedHolidays: { [key: string]: string } = {
      '1-1': 'Nyttårsdag',
      '5-1': 'Arbeidernes dag',
      '5-17': 'Grunnlovsdag',
      '12-24': 'Julaften',
      '12-25': '1. juledag',
      '12-26': '2. juledag',
      '12-31': 'Nyttårsaften',
    }
    
    // Beregn påske (samme logikk som i isNorwegianHoliday)
    const a = year % 19
    const b = Math.floor(year / 100)
    const c = year % 100
    const d = Math.floor(b / 4)
    const e = b % 4
    const f = Math.floor((b + 8) / 25)
    const g = Math.floor((b - f + 1) / 3)
    const h = (19 * a + b - d - g + 15) % 30
    const i = Math.floor(c / 4)
    const k = c % 4
    const l = (32 + 2 * e + 2 * i - h - k) % 7
    const m = Math.floor((a + 11 * h + 22 * l) / 451)
    const n = Math.floor((h + l - 7 * m + 114) / 31)
    const p = (h + l - 7 * m + 114) % 31
    
    const easterMonth = n
    const easterDay = p + 1
    
    // Beregn bevegelige helligdager basert på påske
    const easterDate = new Date(year, easterMonth - 1, easterDay)
    const palmSunday = new Date(easterDate.getTime() - 7 * 24 * 60 * 60 * 1000)
    const maundyThursday = new Date(easterDate.getTime() - 3 * 24 * 60 * 60 * 1000)
    const goodFriday = new Date(easterDate.getTime() - 2 * 24 * 60 * 60 * 1000)
    const easterMonday = new Date(easterDate.getTime() + 1 * 24 * 60 * 60 * 1000)
    const ascensionDay = new Date(easterDate.getTime() + 39 * 24 * 60 * 60 * 1000)
    const whitSunday = new Date(easterDate.getTime() + 49 * 24 * 60 * 60 * 1000)
    const whitMonday = new Date(easterDate.getTime() + 50 * 24 * 60 * 60 * 1000)
    
    // Sjekk faste helligdager først
    const key = `${month}-${day}`
    if (fixedHolidays[key]) {
      return fixedHolidays[key]
    }
    
    // Sjekk bevegelige helligdager
    const movableHolidays = [
      { date: palmSunday, name: 'Palmesøndag' },
      { date: maundyThursday, name: 'Skjærtorsdag' },
      { date: goodFriday, name: 'Langfredag' },
      { date: easterDate, name: '1. påskedag' },
      { date: easterMonday, name: '2. påskedag' },
      { date: ascensionDay, name: 'Kristi himmelfartsdag' },
      { date: whitSunday, name: '1. pinsedag' },
      { date: whitMonday, name: '2. pinsedag' }
    ]
    
    for (const holiday of movableHolidays) {
      if (holiday.date.getMonth() + 1 === month && holiday.date.getDate() === day) {
        return holiday.name
      }
    }
    
    return null
  }

  if (!sjåfør) {
    return <div>Laster...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50 p-2 sm:p-4 overflow-x-hidden">
      <div className="max-w-4xl sm:max-w-6xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-2">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Kalender</h1>
            <p className="text-gray-600 text-sm sm:text-base">Oversikt over dine registreringer</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <Button variant="outline" onClick={() => window.location.href = '/'} className="w-full sm:w-auto text-sm sm:text-base">
              Tilbake til Dashboard
            </Button>
            <Button variant="outline" onClick={logout} className="w-full sm:w-auto text-sm sm:text-base flex items-center gap-2">
              <LogOut className="h-4 w-4" />
              Logg ut
            </Button>
            <div className="flex items-center gap-2 self-stretch sm:self-auto">
              <Button variant="outline" onClick={previousMonth} className="shrink-0">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-base sm:text-lg font-medium text-center px-2 truncate max-w-[60vw] sm:max-w-none">
                {currentMonth.toLocaleDateString('no-NO', { year: 'numeric', month: 'long' })}
              </span>
              <Button variant="outline" onClick={nextMonth} className="shrink-0">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Message */}
        {message && (
          <Alert className={message.type === 'error' ? 'border-red-500' : 'border-green-500'}>
            <AlertDescription>{message.text}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Kalender */}
          <div className="lg:col-span-2 min-w-0">
            <Card>
              <CardHeader className="p-3 sm:p-6">
                <CardTitle className="text-base sm:text-lg">Kalender</CardTitle>
                <CardDescription className="text-sm">
                  Klikk på en dag for å se skift-detaljer. Ukenummer vises automatisk, røde dager er helligdager.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-3 sm:p-6">
                <div className="flex justify-center">
                  <CalendarComponent
                      onChange={handleDateChange}
                      value={selectedDate}
                      locale="no-NO"
                      className="w-full max-w-md"
                      showWeekNumbers={true}
                    tileClassName={({ date, view }) => {
                      if (view === 'month') {
                        const classes = []
                        const dateStr = formatDateForAPI(date)
                        const dagData = kalenderData.find(dag => normalizeDateString(dag.dato) === dateStr)
                        
                        if (dagData && dagData.antall_skift > 0) {
                          classes.push('has-data')
                        }
                        
                        if (isNorwegianHoliday(date)) {
                          classes.push('holiday')
                        }
                        
                        return classes.length > 0 ? classes.join(' ') : undefined
                      }
                      return undefined
                    }}
                    tileContent={({ date, view }) => {
                      if (view === 'month') {
                        const isHoliday = isNorwegianHoliday(date)
                        const holidayName = getHolidayName(date)
                        
                        return (
                          <div className="relative h-full w-full">
                            {/* Helligdag-indikator */}
                            {isHoliday && (
                              <div className="absolute bottom-0 right-0 w-1.5 h-1.5 bg-red-500 rounded-full"></div>
                            )}
                            
                            {/* Helligdag-navn som tooltip */}
                            {isHoliday && holidayName && (
                              <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 hover:opacity-100 transition-opacity pointer-events-none z-10 whitespace-nowrap">
                                {holidayName}
                              </div>
                            )}
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Dagdetaljer */}
          <div className="min-w-0">
            <Card>
              <CardHeader className="p-3 sm:p-6">
                <CardTitle className="text-base sm:text-lg">
                  Skift for {selectedDate instanceof Date ? selectedDate.toLocaleDateString('no-NO') : 'Velg dato'}
                </CardTitle>
                <CardDescription className="text-sm">
                  {selectedDag ? `${selectedDag.antall_skift} skift registrert` : 'Laster skift...'}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-3 sm:p-6">
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-2 text-gray-500">Laster skift...</p>
                  </div>
                ) : !selectedDag ? (
                  <div className="text-center py-8">
                    <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p className="text-gray-500">Velg en dag fra kalenderen</p>
                  </div>
                ) : selectedDag.skift.length === 0 ? (
                  <div className="text-center py-8">
                    <Clock className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p className="text-gray-500">Ingen skift denne dagen</p>
                    {selectedDate instanceof Date && isNorwegianHoliday(selectedDate) && (
                      <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <div className="flex items-center justify-center gap-2 text-red-700">
                          <Calendar className="h-4 w-4" />
                          <span className="font-medium">{getHolidayName(selectedDate)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3 sm:space-y-4">
                    {/* Vis helligdag-info hvis det er en helligdag */}
                    {selectedDate instanceof Date && isNorwegianHoliday(selectedDate) && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                        <div className="flex items-center gap-2 text-red-700">
                          <Calendar className="h-4 w-4" />
                          <span className="font-medium">{getHolidayName(selectedDate)}</span>
                        </div>
                      </div>
                    )}
                    {selectedDag.skift.map((skift) => (
                      <div key={skift.id} className="border rounded-lg p-3 sm:p-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2 gap-1">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-blue-600" />
                            <span className="font-medium text-sm sm:text-base">
                              {formatTid(skift.start_tid)}
                              {skift.slutt_tid && ` - ${formatTid(skift.slutt_tid)}`}
                            </span>
                            {skift.registrering_type && (
                              <span className={`px-2 py-1 rounded-full text-xs font-medium text-white ${getRegistreringTypeColor(skift.registrering_type)}`}>
                                {getRegistreringTypeLabel(skift.registrering_type)}
                              </span>
                            )}
                          </div>
                          <span className="text-xs sm:text-sm font-medium text-green-600">
                            {beregnArbeidstid(skift)}
                          </span>
                        </div>
                        
                        <div className="space-y-1 sm:space-y-2 text-xs sm:text-sm">
                          <div className="flex items-center gap-2">
                            <Truck className="h-4 w-4 text-gray-400" />
                            <span className="truncate">{skift.bil_registreringsnummer} - {skift.bil_merke} {skift.bil_modell}</span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-gray-400" />
                            <span className="truncate">{skift.sone_navn}</span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-gray-400" />
                            <span>{skift.antall_sendinger} sendinger</span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Scale className="h-4 w-4 text-gray-400" />
                            <span>{skift.vekt || 0}kg vekt</span>
                          </div>
                          
                          {skift.pause_minutter > 0 && (
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-gray-400" />
                              <span>{skift.pause_minutter} min pause</span>
                            </div>
                          )}
                          
                          {skift.bomtur_venting && (
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-orange-400" />
                              <span className="text-orange-600 font-medium">Bomtur/Venting:</span>
                              <span className="text-xs sm:text-sm">{skift.bomtur_venting}</span>
                            </div>
                          )}
                          
                          {(skift.sga_kode || skift.sga_kode_annet) && (
                            <div className="flex items-center gap-2">
                              <Key className="h-4 w-4 text-gray-400" />
                              <span className="text-gray-600 font-medium">SGA:</span>
                              <span className="text-xs sm:text-sm">{skift.sga_kode || skift.sga_kode_annet}</span>
                              {skift.sga_skal_faktureres !== undefined && (
                                <span className={`ml-1 px-1.5 py-0.5 rounded text-xs ${skift.sga_skal_faktureres ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                                  {skift.sga_skal_faktureres ? 'Faktureres' : 'Ikke faktureres'}
                                </span>
                              )}
                            </div>
                          )}
                          
                          {skift.kommentar && (
                            <div className="mt-2 p-2 bg-gray-50 rounded">
                              <p className="text-xs text-gray-600">Kommentar:</p>
                              <p className="text-xs sm:text-sm">{skift.kommentar}</p>
                            </div>
                          )}
                          
                          <div className="mt-3 flex justify-between items-center">
                            {skift.godkjent ? (
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Godkjent
                              </Badge>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => startEditSkift(skift)}
                                className="text-xs"
                              >
                                <Edit className="h-3 w-3 mr-1" />
                                Rediger
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      
      {/* Redigeringsskjema */}
      {showEditForm && editingSkift && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Rediger skift</h3>
            
            <EditSkiftForm 
              skift={editingSkift}
              onSave={updateSkift}
              onCancel={cancelEdit}
            />
          </div>
        </div>
      )}
    </div>
  )
}
