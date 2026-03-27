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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { 
  Users, 
  Truck, 
  Clock, 
  AlertTriangle, 
  Lightbulb, 
  Download, 
  Plus, 
  Edit, 
  Trash,
  Calendar,
  Package,
  MapPin,
  Pause,
  Scale,
  Phone,
  Key,
  LogOut,
  CheckCircle,
  XCircle,
  Receipt,
  Settings
} from 'lucide-react'
import { NotificationBell } from '@/components/NotificationBell'
import { PageSkeleton } from '@/components/loading/PageSkeleton'

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
  merke: string
  modell: string
  årsmodell: number
  aktiv: boolean
}

interface Skift {
  id: number
  sjåfør_id?: number
  bil_id?: number
  sone_id?: number
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
  opprettet?: string
  sist_endret?: string
  registrering_type?: string
  godkjent?: boolean
  godkjent_av?: number
  godkjent_dato?: string
  godkjent_av_navn?: string
}

interface Avvik {
  id: number
  sjåfør_id: number
  skift_id: number
  type: string
  beskrivelse: string
  status: string
  admin_kommentar?: string
  admin_navn?: string
  dato: string
  sjåfør_navn?: string
}

interface Forbedringsforslag {
  id: number
  sjåfør_id: number
  tittel: string
  beskrivelse: string
  status: string
  admin_kommentar?: string
  admin_navn?: string
  opprettet: string
  sjåfør_navn?: string
}

interface InfoKort {
  id: number
  kategori: 'telefon' | 'kode'
  navn: string
  verdi: string
  beskrivelse?: string
  aktiv: boolean
  opprettet: string
  sist_endret: string
}

export default function AdminPage() {
  const { sjåfør, isLoading, logout } = useAuth()
  const router = useRouter()
  const [sjåfører, setSjåfører] = useState<Sjåfør[]>([])
  const [biler, setBiler] = useState<Bil[]>([])
  const [skift, setSkift] = useState<Skift[]>([])
  const [avvik, setAvvik] = useState<Avvik[]>([])
  const [forbedringsforslag, setForbedringsforslag] = useState<Forbedringsforslag[]>([])
  const [infoKort, setInfoKort] = useState<InfoKort[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [showInfoDialog, setShowInfoDialog] = useState(false)
  const [editingInfo, setEditingInfo] = useState<InfoKort | null>(null)
  const [newInfo, setNewInfo] = useState({
    kategori: 'telefon' as 'telefon' | 'kode',
    navn: '',
    verdi: '',
    beskrivelse: ''
  })
  const [backendLogLevel, setBackendLogLevel] = useState('info')
  const [frontendLogLevel, setFrontendLogLevel] = useState(logger.getLevel())
  const [showExportDialog, setShowExportDialog] = useState(false)
  const [exportType, setExportType] = useState('')
  const [exportFilters, setExportFilters] = useState({
    fra_dato: '',
    til_dato: '',
    sjåfør_id: '',
    bil_id: ''
  })

  useEffect(() => {
    if (!isLoading && !sjåfør) {
      router.push('/login')
    } else if (sjåfør) {
      if (!sjåfør.admin) {
        router.push('/')
        return
      }
      loadAllData()
      loadLogLevel()
    }
  }, [sjåfør, isLoading, router])

  const getAuthHeaders = () => {
    const token = document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1]
    return { 'Authorization': `Bearer ${token}` }
  }

  const loadLogLevel = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/log-level`, { headers: getAuthHeaders() })
      if (res.ok) {
        const data = await res.json()
        setBackendLogLevel(data.level)
      }
    } catch { /* ignore */ }
  }

  const updateBackendLogLevel = async (level: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/log-level`, {
        method: 'PUT',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ level }),
      })
      if (res.ok) {
        const data = await res.json()
        setBackendLogLevel(data.level)
        setMessage({ type: 'success', text: `Backend lognivå endret til ${data.level}` })
      }
    } catch {
      setMessage({ type: 'error', text: 'Kunne ikke endre backend lognivå' })
    }
  }

  const updateFrontendLogLevel = (level: string) => {
    logger.setLevel(level)
    setFrontendLogLevel(level)
    setMessage({ type: 'success', text: `Frontend lognivå endret til ${level}` })
  }

  const loadAllData = async () => {
    setLoading(true)
    try {
      const token = document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1]
      const headers = { 'Authorization': `Bearer ${token}` }
      
      const [sjåførerRes, bilerRes, skiftRes, avvikRes, forslagRes, infoRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/crud/drivers`, { headers }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/biler`, { headers }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/skift`, { headers }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/avvik`, { headers }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/forbedringsforslag`, { headers }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/info`, { headers })
      ])
      
      if (sjåførerRes.ok) {
        const sjåførerData = await sjåførerRes.json()
        logger.log('Sjåfører data:', sjåførerData)
        setSjåfører(sjåførerData)
      } else {
        logger.error(`Feil ved henting av sjåfører: ${sjåførerRes.status} ${await sjåførerRes.text()}`)
      }
      
      if (bilerRes.ok) {
        const bilerData = await bilerRes.json()
        logger.log('Biler data:', bilerData)
        setBiler(bilerData)
      } else {
        logger.error(`Feil ved henting av biler: ${bilerRes.status} ${await bilerRes.text()}`)
      }
      
      if (skiftRes.ok) {
        const skiftData = await skiftRes.json()
        logger.log('Skift data:', skiftData)
        setSkift(skiftData)
      } else {
        logger.error(`Feil ved henting av skift: ${skiftRes.status} ${await skiftRes.text()}`)
      }
      
      if (avvikRes.ok) {
        const avvikData = await avvikRes.json()
        logger.log('Avvik data:', avvikData)
        setAvvik(avvikData)
      } else {
        logger.error(`Feil ved henting av avvik: ${avvikRes.status} ${await avvikRes.text()}`)
      }
      
      if (forslagRes.ok) {
        const forslagData = await forslagRes.json()
        logger.log('Forslag data:', forslagData)
        setForbedringsforslag(forslagData)
      } else {
        logger.error(`Feil ved henting av forslag: ${forslagRes.status} ${await forslagRes.text()}`)
      }
      
      if (infoRes.ok) {
        const infoData = await infoRes.json()
        logger.log('Info data:', infoData)
        setInfoKort(infoData)
      } else {
        logger.error(`Feil ved henting av info-kort: ${infoRes.status} ${await infoRes.text()}`)
      }
    } catch (error) {
      logger.error('Feil ved lasting av admin data:', error)
      setMessage({ type: 'error', text: 'Feil ved lasting av data' })
    } finally {
      setLoading(false)
    }
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

  const beregnOvertidForSkift = (skift: Skift) => {
    if (!skift.slutt_tid || (skift.registrering_type && skift.registrering_type !== 'arbeidstid')) {
      return null
    }

    const startT = new Date(skift.start_tid)
    const sluttT = new Date(skift.slutt_tid)
    const diffMs = sluttT.getTime() - startT.getTime()
    const totalMinutter = Math.floor(diffMs / (1000 * 60))
    
    // Normal arbeidstid er 8 timer (480 minutter) per dag
    const normaleMinutter = 8 * 60
    const overtidMinutter = Math.max(0, totalMinutter - normaleMinutter)
    
    if (overtidMinutter === 0) {
      return null
    }
    
    const overtidTimer = Math.floor(overtidMinutter / 60)
    const overtidMinutterRest = overtidMinutter % 60
    
    return {
      overtidTimer,
      overtidMinutterRest
    }
  }

  const beregnOvertid = () => {
    const erArbeid = (t?: string) => !t || t === 'arbeidstid'
    const arbeidsSkift = skift.filter(s => s.slutt_tid && erArbeid(s.registrering_type))
    
    let totalMinutter = 0
    arbeidsSkift.forEach(skift => {
      const startT = new Date(skift.start_tid)
      const sluttT = new Date(skift.slutt_tid!)
      const diffMs = sluttT.getTime() - startT.getTime()
      const diffMinutes = Math.floor(diffMs / (1000 * 60))
      totalMinutter += diffMinutes
    })

    const normaleArbeidsdager = arbeidsSkift.length
    const normaleTimerPerDag = 8
    const totalNormaleMinutter = normaleArbeidsdager * normaleTimerPerDag * 60
    const overtidMinutter = Math.max(0, totalMinutter - totalNormaleMinutter)
    
    const overtidTimer = Math.floor(overtidMinutter / 60)
    const overtidMinutterRest = overtidMinutter % 60
    
    return {
      overtidTimer,
      overtidMinutterRest,
      totalTimer: Math.floor(totalMinutter / 60),
      totalMinutterRest: totalMinutter % 60
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ny': return 'bg-blue-100 text-blue-800'
      case 'under_behandling': return 'bg-yellow-100 text-yellow-800'
      case 'løst': case 'godkjent': return 'bg-green-100 text-green-800'
      case 'avvist': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const openExportDialog = (type: string) => {
    setExportType(type)
    setExportFilters({
      fra_dato: '',
      til_dato: '',
      sjåfør_id: 'alle',
      bil_id: 'alle'
    })
    setShowExportDialog(true)
  }

  const exportData = async () => {
    try {
      const token = document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1]
      
      // Bygg query string med filtre
      const params = new URLSearchParams()
      if (exportFilters.fra_dato) params.append('fra_dato', exportFilters.fra_dato)
      if (exportFilters.til_dato) params.append('til_dato', exportFilters.til_dato)
      if (exportFilters.sjåfør_id && exportFilters.sjåfør_id !== 'alle') params.append('sjåfør_id', exportFilters.sjåfør_id)
      if (exportFilters.bil_id && exportFilters.bil_id !== 'alle') params.append('bil_id', exportFilters.bil_id)
      
      const queryString = params.toString()
      const url = `${process.env.NEXT_PUBLIC_API_URL}/admin/export/${exportType}${queryString ? `?${queryString}` : ''}`
      
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (response.ok) {
        const blob = await response.blob()
        const downloadUrl = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = downloadUrl
        a.download = `${exportType}-export-${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(downloadUrl)
        document.body.removeChild(a)
        setShowExportDialog(false)
        setMessage({ type: 'success', text: 'Eksport fullført!' })
      } else {
        setMessage({ type: 'error', text: 'Feil ved eksport' })
      }
    } catch (error) {
      logger.error('Feil ved eksport:', error)
      setMessage({ type: 'error', text: 'Feil ved eksport' })
    }
  }


  if (isLoading) {
    return <PageSkeleton />
  }

  const handleAddInfo = async () => {
    try {
      const token = document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1]
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/info`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newInfo)
      })

      if (response.ok) {
        const data = await response.json()
        logger.log('Info-kort opprettet:', data)
        setMessage({ type: 'success', text: 'Info-kort opprettet!' })
        setNewInfo({ kategori: 'telefon', navn: '', verdi: '', beskrivelse: '' })
        setShowInfoDialog(false)
        loadAllData()
        setTimeout(() => setMessage(null), 3000)
      } else {
        const error = await response.json()
        logger.error('Feil ved opprettelse av info-kort:', error)
        setMessage({ type: 'error', text: error.feil || 'Feil ved opprettelse av info-kort' })
        setTimeout(() => setMessage(null), 5000)
      }
    } catch (error) {
      logger.error('Feil ved opprettelse av info-kort:', error)
      setMessage({ type: 'error', text: 'Serverfeil ved opprettelse av info-kort' })
      setTimeout(() => setMessage(null), 5000)
    }
  }

  const handleEditInfo = async () => {
    if (!editingInfo) return

    try {
      const token = document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1]
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/info/${editingInfo.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newInfo)
      })

      if (response.ok) {
        setMessage({ type: 'success', text: 'Info-kort oppdatert!' })
        setEditingInfo(null)
        setNewInfo({ kategori: 'telefon', navn: '', verdi: '', beskrivelse: '' })
        setShowInfoDialog(false)
        loadAllData()
        setTimeout(() => setMessage(null), 3000)
      } else {
        const error = await response.json()
        setMessage({ type: 'error', text: error.feil || 'Feil ved oppdatering av info-kort' })
        setTimeout(() => setMessage(null), 5000)
      }
    } catch (error) {
      logger.error('Feil ved oppdatering av info-kort:', error)
      setMessage({ type: 'error', text: 'Serverfeil ved oppdatering av info-kort' })
      setTimeout(() => setMessage(null), 5000)
    }
  }

  const handleDeleteInfo = async (id: number) => {
    if (!confirm('Er du sikker på at du vil slette dette info-kortet?')) return

    try {
      const token = document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1]
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/info/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        setMessage({ type: 'success', text: 'Info-kort slettet!' })
        loadAllData()
        setTimeout(() => setMessage(null), 3000)
      } else {
        const error = await response.json()
        setMessage({ type: 'error', text: error.feil || 'Feil ved sletting av info-kort' })
        setTimeout(() => setMessage(null), 5000)
      }
    } catch (error) {
      logger.error('Feil ved sletting av info-kort:', error)
      setMessage({ type: 'error', text: 'Serverfeil ved sletting av info-kort' })
      setTimeout(() => setMessage(null), 5000)
    }
  }

  const startEditInfo = (info: InfoKort) => {
    setEditingInfo(info)
    setNewInfo({
      kategori: info.kategori,
      navn: info.navn,
      verdi: info.verdi,
      beskrivelse: info.beskrivelse || ''
    })
    setShowInfoDialog(true)
  }

  if (!sjåfør) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 p-2 sm:p-4">
      <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
        {/* Header - Mobile First */}
        <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <h1 className="text-lg sm:text-xl font-bold text-gray-900 truncate">
                  Admin Panel
                </h1>
                <div className="flex items-center gap-2">
                  <NotificationBell />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={logout}
                    className="flex items-center gap-1 text-xs sm:text-sm"
                  >
                    <LogOut className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="hidden sm:inline">Logg ut</span>
                  </Button>
                </div>
              </div>
              <p className="text-gray-600 text-xs sm:text-sm">
                Administrer systemet og se oversikt
              </p>
            </div>
            <img src="/logo.png" alt="KS Transport" className="h-24 sm:h-30 w-auto ml-2 sm:ml-3 flex-shrink-0" />
          </div>
        </div>

        {/* Meldinger */}
        {message && (
          <div className={`p-3 rounded-lg text-sm ${
            message.type === 'success' 
              ? 'bg-green-100 text-green-800 border border-green-200' 
              : 'bg-red-100 text-red-800 border border-red-200'
          }`}>
            {message.text}
          </div>
        )}

        {/* Quick Actions - Mobile First */}
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push('/admin/drivers')}>
            <CardContent className="p-3 sm:p-4 text-center">
              <Users className="h-8 sm:h-12 w-8 sm:w-12 text-blue-600 mx-auto mb-1 sm:mb-2" />
              <h3 className="font-semibold text-xs sm:text-sm">Sjåfører</h3>
              <p className="text-xs text-gray-500 hidden sm:block">Administrer sjåfører</p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push('/admin/biler')}>
            <CardContent className="p-3 sm:p-4 text-center">
              <Truck className="h-8 sm:h-12 w-8 sm:w-12 text-blue-600 mx-auto mb-1 sm:mb-2" />
              <h3 className="font-semibold text-xs sm:text-sm">Biler</h3>
              <p className="text-xs text-gray-500 hidden sm:block">Administrer biler</p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push('/admin/avvik')}>
            <CardContent className="p-3 sm:p-4 text-center">
              <AlertTriangle className="h-8 sm:h-12 w-8 sm:w-12 text-red-600 mx-auto mb-1 sm:mb-2" />
              <h3 className="font-semibold text-xs sm:text-sm">Avvik</h3>
              <p className="text-xs text-gray-500 hidden sm:block">Håndter avvik</p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push('/admin/forbedringsforslag')}>
            <CardContent className="p-3 sm:p-4 text-center">
              <Lightbulb className="h-8 sm:h-12 w-8 sm:w-12 text-yellow-600 mx-auto mb-1 sm:mb-2" />
              <h3 className="font-semibold text-xs sm:text-sm">Forbedringer</h3>
              <p className="text-xs text-gray-500 hidden sm:block">Håndter forslag</p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push('/admin/oppdrag')}>
            <CardContent className="p-3 sm:p-4 text-center">
              <Package className="h-8 sm:h-12 w-8 sm:w-12 text-indigo-600 mx-auto mb-1 sm:mb-2" />
              <h3 className="font-semibold text-xs sm:text-sm">Oppdrag</h3>
              <p className="text-xs text-gray-500 hidden sm:block">Administrer oppdrag</p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push('/admin/fakturering')}>
            <CardContent className="p-3 sm:p-4 text-center">
              <Receipt className="h-8 sm:h-12 w-8 sm:w-12 text-green-600 mx-auto mb-1 sm:mb-2" />
              <h3 className="font-semibold text-xs sm:text-sm">Fakturering</h3>
              <p className="text-xs text-gray-500 hidden sm:block">Faktureringsoversikt</p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push('/admin/sga-koder')}>
            <CardContent className="p-3 sm:p-4 text-center">
              <Key className="h-8 sm:h-12 w-8 sm:w-12 text-purple-600 mx-auto mb-1 sm:mb-2" />
              <h3 className="font-semibold text-xs sm:text-sm">SGA-koder</h3>
              <p className="text-xs text-gray-500 hidden sm:block">Administrer SGA-koder</p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push('/admin/sjafor-oversikt')}>
            <CardContent className="p-3 sm:p-4 text-center">
              <Clock className="h-8 sm:h-12 w-8 sm:w-12 text-teal-600 mx-auto mb-1 sm:mb-2" />
              <h3 className="font-semibold text-xs sm:text-sm">Sjåfør-oversikt</h3>
              <p className="text-xs text-gray-500 hidden sm:block">Oversikt og tidregistrering</p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push('/')}>
            <CardContent className="p-3 sm:p-4 text-center">
              <Calendar className="h-8 sm:h-12 w-8 sm:w-12 text-gray-600 mx-auto mb-1 sm:mb-2" />
              <h3 className="font-semibold text-xs sm:text-sm">Dashboard</h3>
              <p className="text-xs text-gray-500 hidden sm:block">Sjåfør dashboard</p>
            </CardContent>
          </Card>

          {/* Eksport-knapper - kommentert ut foreløpig */}
          {/* <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => openExportDialog('skift')}>
            <CardContent className="p-3 sm:p-4 text-center">
              <Download className="h-8 sm:h-12 w-8 sm:w-12 text-green-600 mx-auto mb-1 sm:mb-2" />
              <h3 className="font-semibold text-xs sm:text-sm">Eksporter Skift</h3>
              <p className="text-xs text-gray-500 hidden sm:block">Last ned CSV</p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => openExportDialog('avvik')}>
            <CardContent className="p-3 sm:p-4 text-center">
              <Download className="h-8 sm:h-12 w-8 sm:w-12 text-red-600 mx-auto mb-1 sm:mb-2" />
              <h3 className="font-semibold text-xs sm:text-sm">Eksporter Avvik</h3>
              <p className="text-xs text-gray-500 hidden sm:block">Last ned CSV</p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => openExportDialog('forbedringsforslag')}>
            <CardContent className="p-3 sm:p-4 text-center">
              <Download className="h-8 sm:h-12 w-8 sm:w-12 text-yellow-600 mx-auto mb-1 sm:mb-2" />
              <h3 className="font-semibold text-xs sm:text-sm">Eksporter Forslag</h3>
              <p className="text-xs text-gray-500 hidden sm:block">Last ned CSV</p>
            </CardContent>
          </Card> */}
        </div>

        {/* Stats Cards - Mobile First */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push('/admin/drivers')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-4">
              <CardTitle className="text-xs sm:text-sm font-medium">Sjåfører</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-3 sm:p-4 pt-0">
              <div className="text-xl sm:text-2xl font-bold">{sjåfører.length}</div>
              <p className="text-xs text-muted-foreground">
                {sjåfører.filter(s => s.aktiv).length} aktive
              </p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push('/admin/biler')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-4">
              <CardTitle className="text-xs sm:text-sm font-medium">Biler</CardTitle>
              <Truck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-3 sm:p-4 pt-0">
              <div className="text-xl sm:text-2xl font-bold">{biler.length}</div>
              <p className="text-xs text-muted-foreground">
                {biler.filter(b => b.aktiv).length} aktive
              </p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push('/admin/skift')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-4">
              <CardTitle className="text-xs sm:text-sm font-medium">Skift</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-3 sm:p-4 pt-0">
              <div className="text-xl sm:text-2xl font-bold">{skift.length}</div>
              <p className="text-xs text-muted-foreground">
                {skift.filter(s => !s.slutt_tid).length} aktive
              </p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push('/admin/avvik')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-4">
              <CardTitle className="text-xs sm:text-sm font-medium">Avvik</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-3 sm:p-4 pt-0">
              <div className="text-xl sm:text-2xl font-bold">{avvik.length}</div>
              <p className="text-xs text-muted-foreground">
                {avvik.filter(a => a.status === 'ny').length} nye
              </p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push('/admin/forbedringsforslag')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-4">
              <CardTitle className="text-xs sm:text-sm font-medium">Forslag</CardTitle>
              <Lightbulb className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-3 sm:p-4 pt-0">
              <div className="text-xl sm:text-2xl font-bold">{forbedringsforslag.length}</div>
              <p className="text-xs text-muted-foreground">
                {forbedringsforslag.filter(f => f.status === 'ny').length} nye
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Info-kort */}
        <Card>
          <CardHeader className="p-3 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base sm:text-lg">Info-kort</CardTitle>
                <CardDescription className="text-xs sm:text-sm">Telefonnumre og koder</CardDescription>
              </div>
              <Button onClick={() => setShowInfoDialog(true)} size="sm" className="text-xs sm:text-sm">
                <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                Legg til
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-3 sm:p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Telefonnumre */}
              <div>
                <h4 className="font-semibold text-sm mb-3 flex items-center">
                  <Phone className="h-4 w-4 mr-2 text-blue-600" />
                  Telefonnumre
                </h4>
                <div className="space-y-2">
                  {infoKort.filter(info => info.kategori === 'telefon').map((info) => (
                    <div key={info.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{info.navn}</p>
                        <p className="text-sm text-gray-600">{info.verdi}</p>
                        {info.beskrivelse && (
                          <p className="text-xs text-gray-500 mt-1">{info.beskrivelse}</p>
                        )}
                      </div>
                      <div className="flex space-x-1 ml-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => startEditInfo(info)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteInfo(info.id)}
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                        >
                          <Trash className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Koder */}
              <div>
                <h4 className="font-semibold text-sm mb-3 flex items-center">
                  <Key className="h-4 w-4 mr-2 text-green-600" />
                  Koder
                </h4>
                <div className="space-y-2">
                  {infoKort.filter(info => info.kategori === 'kode').map((info) => (
                    <div key={info.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{info.navn}</p>
                        <p className="text-sm text-gray-600 font-mono">{info.verdi}</p>
                        {info.beskrivelse && (
                          <p className="text-xs text-gray-500 mt-1">{info.beskrivelse}</p>
                        )}
                      </div>
                      <div className="flex space-x-1 ml-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => startEditInfo(info)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteInfo(info.id)}
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                        >
                          <Trash className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Nylige Skift */}
        <Card>
          <CardHeader className="p-3 sm:p-6">
            <CardTitle className="text-base sm:text-lg">Nylige Skift</CardTitle>
            <CardDescription className="text-xs sm:text-sm">De siste registrerte skiftene</CardDescription>
          </CardHeader>
          <CardContent className="p-3 sm:p-6">
            {loading ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="text-sm text-gray-500 mt-2">Laster skift...</p>
              </div>
            ) : skift.length === 0 ? (
              <div className="text-center py-6 text-gray-500">
                <Clock className="h-10 w-10 mx-auto mb-3 text-gray-300" />
                <p className="text-sm">Ingen skift registrert</p>
              </div>
            ) : (
              <div className="space-y-4">
                {skift.slice(0, 5).map((skiftItem) => (
                  <div key={skiftItem.id} className="border rounded-lg p-4 bg-gray-50">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex flex-col space-y-1">
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4 text-blue-600" />
                          <span className="font-medium text-sm">
                            {new Date(skiftItem.dato).toLocaleDateString('no-NO', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Clock className="h-4 w-4 text-blue-600" />
                          <span className="font-medium text-sm">
                            {formatTid(skiftItem.start_tid)}
                            {skiftItem.slutt_tid && ` - ${formatTid(skiftItem.slutt_tid)}`}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-sm font-medium text-green-600">
                          {beregnArbeidstid(skiftItem)}
                        </span>
                        {(() => {
                          const overtid = beregnOvertidForSkift(skiftItem)
                          return overtid ? (
                            <span className="text-xs font-medium text-orange-600 mt-1">
                              Overtid: {overtid.overtidTimer}t {overtid.overtidMinutterRest}m
                            </span>
                          ) : null
                        })()}
                      </div>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center space-x-2">
                        <Users className="h-4 w-4 text-gray-400" />
                        <span>{skiftItem.sjåfør_navn}</span>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Truck className="h-4 w-4 text-gray-400" />
                        <span>{skiftItem.bil_registreringsnummer} - {skiftItem.bil_merke} {skiftItem.bil_modell}</span>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        <span>{skiftItem.sone_navn}</span>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Package className="h-4 w-4 text-gray-400" />
                        <span>{skiftItem.antall_sendinger} sendinger</span>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Scale className="h-4 w-4 text-gray-400" />
                        <span>{skiftItem.vekt || 0}kg vekt</span>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Pause className="h-4 w-4 text-gray-400" />
                        <span>{skiftItem.pause_minutter} min pause</span>
                      </div>
                    </div>
                    
                    {skiftItem.kommentarer && (
                      <div className="mt-3 p-2 bg-white rounded border-l-4 border-blue-200">
                        <p className="text-xs text-gray-600">
                          <span className="font-medium">Kommentarer:</span> {skiftItem.kommentarer}
                        </p>
                      </div>
                    )}
                    
                    {skiftItem.opprettet && (
                      <div className="mt-2 pt-2 border-t border-gray-200">
                        <p className="text-xs text-gray-500">
                          <span className="font-medium">Registrert:</span> {new Date(skiftItem.opprettet).toLocaleString('no-NO', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    )}
                    {skiftItem.godkjent && skiftItem.godkjent_dato && (
                      <div className="mt-2 pt-2 border-t border-gray-200">
                        <p className="text-xs text-green-600">
                          <span className="font-medium">Godkjent:</span> {new Date(skiftItem.godkjent_dato).toLocaleString('no-NO', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                          })} {skiftItem.godkjent_av_navn && `av ${skiftItem.godkjent_av_navn}`}
                        </p>
                      </div>
                    )}
                    <div className="mt-2 pt-2 border-t border-gray-200 flex justify-end">
                      <Button
                        variant={skiftItem.godkjent ? "outline" : "default"}
                        size="sm"
                        onClick={async () => {
                          try {
                            const token = document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1]
                            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/skift/${skiftItem.id}/godkjenn`, {
                              method: 'PUT',
                              headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`
                              },
                              body: JSON.stringify({ godkjent: !skiftItem.godkjent })
                            })
                            
                            if (response.ok) {
                              loadAllData()
                              setMessage({ type: 'success', text: skiftItem.godkjent ? 'Skift avgodkjent' : 'Skift godkjent' })
                              setTimeout(() => setMessage(null), 3000)
                            } else {
                              setMessage({ type: 'error', text: 'Feil ved godkjenning' })
                              setTimeout(() => setMessage(null), 5000)
                            }
                          } catch (error) {
                            logger.error('Feil ved godkjenning:', error)
                            setMessage({ type: 'error', text: 'Feil ved godkjenning' })
                            setTimeout(() => setMessage(null), 5000)
                          }
                        }}
                        className="text-xs"
                      >
                        {skiftItem.godkjent ? (
                          <>
                            <XCircle className="h-3 w-3 mr-1" />
                            Avgodkjenn
                          </>
                        ) : (
                          <>
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Godkjenn
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Nylige Avvik */}
        <Card>
          <CardHeader className="p-3 sm:p-6">
            <CardTitle className="text-base sm:text-lg">Nylige Avvik</CardTitle>
            <CardDescription className="text-xs sm:text-sm">De siste rapporterte avvikene</CardDescription>
          </CardHeader>
          <CardContent className="p-3 sm:p-6">
            {loading ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="text-sm text-gray-500 mt-2">Laster avvik...</p>
              </div>
            ) : avvik.length === 0 ? (
              <div className="text-center py-6 text-gray-500">
                <AlertTriangle className="h-10 w-10 mx-auto mb-3 text-gray-300" />
                <p className="text-sm">Ingen avvik rapportert</p>
              </div>
            ) : (
              <div className="space-y-4">
                {avvik.slice(0, 5).map((avvikItem) => (
                  <div key={avvikItem.id} className="border rounded-lg p-4 bg-gray-50">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-medium">{avvikItem.type}</h3>
                        <p className="text-sm text-gray-500">
                          {avvikItem.sjåfør_navn} - {new Date(avvikItem.dato).toLocaleDateString('no-NO')} kl. {new Date(avvikItem.dato).toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <Badge className={getStatusColor(avvikItem.status || 'ny')}>
                        {(avvikItem.status || 'ny').charAt(0).toUpperCase() + (avvikItem.status || 'ny').slice(1)}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-700">{avvikItem.beskrivelse}</p>
                    {avvikItem.admin_kommentar && (
                      <div className="bg-gray-50 p-2 rounded text-sm mt-2">
                        <span className="font-medium">{avvikItem.admin_navn || 'Admin'}</span>
                        <span className="ml-1">:</span> {avvikItem.admin_kommentar}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>


        {/* Nylige Forbedringsforslag */}
        <Card>
          <CardHeader className="p-3 sm:p-6">
            <CardTitle className="text-base sm:text-lg">Nylige Forbedringsforslag</CardTitle>
            <CardDescription className="text-xs sm:text-sm">De siste innsendte forslagene</CardDescription>
          </CardHeader>
          <CardContent className="p-3 sm:p-6">
            {loading ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="text-sm text-gray-500 mt-2">Laster forslag...</p>
              </div>
            ) : forbedringsforslag.length === 0 ? (
              <div className="text-center py-6 text-gray-500">
                <Lightbulb className="h-10 w-10 mx-auto mb-3 text-gray-300" />
                <p className="text-sm">Ingen forslag innsendt</p>
              </div>
            ) : (
              <div className="space-y-4">
                {forbedringsforslag.slice(0, 5).map((forslagItem) => (
                  <div key={forslagItem.id} className="border rounded-lg p-4 bg-gray-50">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-medium">{forslagItem.tittel}</h3>
                        <p className="text-sm text-gray-500">
                          {forslagItem.sjåfør_navn} - {new Date(forslagItem.opprettet).toLocaleDateString('no-NO')}
                        </p>
                      </div>
                      <Badge className={getStatusColor(forslagItem.status || 'ny')}>
                        {(forslagItem.status || 'ny').charAt(0).toUpperCase() + (forslagItem.status || 'ny').slice(1).replace('_', ' ')}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-700 mb-2">{forslagItem.beskrivelse}</p>
                    {forslagItem.admin_kommentar && (
                      <div className="bg-gray-50 p-2 rounded text-sm">
                        <span className="font-medium">{forslagItem.admin_navn || 'Admin'}:</span> {forslagItem.admin_kommentar}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Innstillinger */}
        <Card>
          <CardHeader className="p-3 sm:p-6">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Innstillinger
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">Lognivå for feilsøking</CardDescription>
          </CardHeader>
          <CardContent className="p-3 sm:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="backend-log-level" className="text-sm font-medium">Backend lognivå</Label>
                <p className="text-xs text-gray-500 mb-1">Gjelder til serveren restartes</p>
                <Select value={backendLogLevel} onValueChange={updateBackendLogLevel}>
                  <SelectTrigger id="backend-log-level">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="debug">Debug (alt)</SelectItem>
                    <SelectItem value="info">Info (standard)</SelectItem>
                    <SelectItem value="warn">Warn (advarsler)</SelectItem>
                    <SelectItem value="error">Error (kun feil)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="frontend-log-level" className="text-sm font-medium">Frontend lognivå</Label>
                <p className="text-xs text-gray-500 mb-1">Lagres i nettleseren din</p>
                <Select value={frontendLogLevel} onValueChange={updateFrontendLogLevel}>
                  <SelectTrigger id="frontend-log-level">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="debug">Debug (alt)</SelectItem>
                    <SelectItem value="info">Info (standard)</SelectItem>
                    <SelectItem value="warn">Warn (advarsler)</SelectItem>
                    <SelectItem value="error">Error (kun feil)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Export Dialog - kommentert ut foreløpig */}
        {/* <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Eksporter {
                exportType === 'skift' ? 'Skift' : 
                exportType === 'avvik' ? 'Avvik' : 
                'Forbedringsforslag'
              }</DialogTitle>
              <DialogDescription>
                Velg filtre for eksport av {
                  exportType === 'skift' ? 'skift' : 
                  exportType === 'avvik' ? 'avvik' : 
                  'forbedringsforslag'
                }-data
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="fra_dato">Fra dato</Label>
                  <Input
                    id="fra_dato"
                    type="date"
                    value={exportFilters.fra_dato}
                    onChange={(e) => setExportFilters({...exportFilters, fra_dato: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="til_dato">Til dato</Label>
                  <Input
                    id="til_dato"
                    type="date"
                    value={exportFilters.til_dato}
                    onChange={(e) => setExportFilters({...exportFilters, til_dato: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="sjåfør">Sjåfør</Label>
                  <Select 
                    value={exportFilters.sjåfør_id} 
                    onValueChange={(value) => setExportFilters({...exportFilters, sjåfør_id: value})}
                  >
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
                {exportType !== 'forbedringsforslag' && (
                  <div>
                    <Label htmlFor="bil">Bil</Label>
                    <Select 
                      value={exportFilters.bil_id} 
                      onValueChange={(value) => setExportFilters({...exportFilters, bil_id: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Alle biler" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="alle">Alle biler</SelectItem>
                        {biler.map(bil => (
                          <SelectItem key={bil.id} value={bil.id.toString()}>
                            {bil.registreringsnummer} {bil.merke && `- ${bil.merke} ${bil.modell}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowExportDialog(false)}>
                  Avbryt
                </Button>
                <Button onClick={exportData}>
                  Eksporter
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog> */}

      </div>

      {/* Info-kort Dialog */}
      <Dialog open={showInfoDialog} onOpenChange={setShowInfoDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingInfo ? 'Rediger info-kort' : 'Legg til info-kort'}
            </DialogTitle>
            <DialogDescription>
              Legg til eller rediger telefonnumre og koder
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="kategori">Kategori</Label>
              <Select 
                value={newInfo.kategori} 
                onValueChange={(value: 'telefon' | 'kode') => setNewInfo({ ...newInfo, kategori: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="telefon">Telefon</SelectItem>
                  <SelectItem value="kode">Kode</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="navn">Navn</Label>
              <Input
                id="navn"
                value={newInfo.navn}
                onChange={(e) => setNewInfo({ ...newInfo, navn: e.target.value })}
                placeholder="f.eks. Kjøre kontor, Ola Normann"
              />
            </div>

            <div>
              <Label htmlFor="verdi">Verdi</Label>
              <Input
                id="verdi"
                value={newInfo.verdi}
                onChange={(e) => setNewInfo({ ...newInfo, verdi: e.target.value })}
                placeholder={newInfo.kategori === 'telefon' ? '+47 123 45 678' : '7985'}
              />
            </div>

            <div>
              <Label htmlFor="beskrivelse">Beskrivelse (valgfri)</Label>
              <Textarea
                id="beskrivelse"
                value={newInfo.beskrivelse}
                onChange={(e) => setNewInfo({ ...newInfo, beskrivelse: e.target.value })}
                placeholder="Kort beskrivelse..."
                rows={2}
              />
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => {
                setShowInfoDialog(false)
                setEditingInfo(null)
                setNewInfo({ kategori: 'telefon', navn: '', verdi: '', beskrivelse: '' })
              }}>
                Avbryt
              </Button>
              <Button onClick={editingInfo ? handleEditInfo : handleAddInfo}>
                {editingInfo ? 'Oppdater' : 'Legg til'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}