'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { logger } from '@/lib/logger'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Phone, Key, ArrowLeft, User, Calendar, Clock, Heart, Baby, Plane, AlertTriangle, LogOut, Edit, Save, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface InfoKort {
  id: number
  kategori: 'telefon' | 'kode'
  navn: string
  verdi: string
  beskrivelse?: string
}

interface PersonligStatistikk {
  sykedager: number
  egenmelding: number
  egenmelding_barn: number
  ferie: number
  arbeidstid: number
  totalt_dager: number
  siste_12_mnd: {
    sykedager: number
    egenmelding: number
    egenmelding_barn: number
    ferie: number
    arbeidstid: number
  }
  egenmelding_kvoter?: any
}

export default function InfoPage() {
  const { sjåfør, isLoading, logout, updateSjåfør } = useAuth()
  const router = useRouter()
  const [infoKort, setInfoKort] = useState<InfoKort[]>([])
  const [loadingInfo, setLoadingInfo] = useState(false)
  const [aktivTab, setAktivTab] = useState<'info' | 'personlig' | 'profil'>('info')
  const [editingProfil, setEditingProfil] = useState(false)
  const [profilData, setProfilData] = useState({
    navn: sjåfør?.navn || '',
    epost: sjåfør?.epost || '',
    telefon: ''
  })
  const [passordData, setPassordData] = useState({
    nåværendePassord: '',
    nyttPassord: '',
    bekreftPassord: ''
  })
  const [editingPassord, setEditingPassord] = useState(false)
  const [profilMessage, setProfilMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [loadingProfil, setLoadingProfil] = useState(false)
  const [personligStatistikk, setPersonligStatistikk] = useState<PersonligStatistikk | null>(null)
  const [loadingStatistikk, setLoadingStatistikk] = useState(false)

  // Rens telefonnummer for tel: link (fjern mellomrom, bindestreker, etc.)
  const cleanPhoneNumber = (phone: string): string => {
    return phone.replace(/[\s\-\(\)]/g, '')
  }

  const loadInfoKort = async () => {
    if (!sjåfør) return
    
    setLoadingInfo(true)
    try {
      const token = document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1]
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/info/public`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (response.ok) {
        const info = await response.json()
        setInfoKort(info)
      }
    } catch (error) {
      logger.error('Feil ved henting av info-kort:', error)
    } finally {
      setLoadingInfo(false)
    }
  }

  const loadPersonligStatistikk = async () => {
    if (!sjåfør) return
    
    setLoadingStatistikk(true)
    try {
      const token = document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1]
      
      // Hent statistikk for siste 12 måneder
      const nå = new Date()
      const tolvMånederSiden = new Date(nå.getFullYear(), nå.getMonth() - 12, nå.getDate())
      
      // Hent skift og kvoter
      const [skiftResponse, kvoterResponse] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/skift?år=${nå.getFullYear()}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/data/egenmelding-kvoter`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ])
      
      if (skiftResponse.ok) {
        const skift = await skiftResponse.json()
        
        // Beregn statistikk
        const siste12Mnd = skift.filter((s: any) => new Date(s.dato) >= tolvMånederSiden)
        
        // Hent kvoter hvis tilgjengelig
        let egenmeldingKvoter = null
        if (kvoterResponse.ok) {
          egenmeldingKvoter = await kvoterResponse.json()
        }
        
        const statistikk: PersonligStatistikk = {
          sykedager: siste12Mnd.filter((s: any) => s.registrering_type === 'sykemelding').length,
          egenmelding: egenmeldingKvoter?.egenmelding?.antall_sykefravær || siste12Mnd.filter((s: any) => s.registrering_type === 'egenmelding').length,
          egenmelding_barn: egenmeldingKvoter?.egenmelding_barn?.brukt_dager || siste12Mnd.filter((s: any) => s.registrering_type === 'egenmelding_barn').length,
          ferie: siste12Mnd.filter((s: any) => s.registrering_type === 'ferie').length,
          arbeidstid: siste12Mnd.filter((s: any) => s.registrering_type === 'arbeidstid').length,
          totalt_dager: siste12Mnd.length,
          siste_12_mnd: {
            sykedager: siste12Mnd.filter((s: any) => s.registrering_type === 'sykemelding').length,
            egenmelding: egenmeldingKvoter?.egenmelding?.antall_sykefravær || siste12Mnd.filter((s: any) => s.registrering_type === 'egenmelding').length,
            egenmelding_barn: egenmeldingKvoter?.egenmelding_barn?.brukt_dager || siste12Mnd.filter((s: any) => s.registrering_type === 'egenmelding_barn').length,
            ferie: siste12Mnd.filter((s: any) => s.registrering_type === 'ferie').length,
            arbeidstid: siste12Mnd.filter((s: any) => s.registrering_type === 'arbeidstid').length
          },
          egenmelding_kvoter: egenmeldingKvoter
        }
        
        setPersonligStatistikk(statistikk)
      }
    } catch (error) {
      logger.error('Feil ved henting av personlig statistikk:', error)
    } finally {
      setLoadingStatistikk(false)
    }
  }

  const loadProfilData = async () => {
    if (!sjåfør) return
    
    try {
      const token = document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1]
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (response.ok) {
        const data = await response.json()
        const sjåførData = data.sjåfør
        setProfilData({
          navn: sjåførData.navn || '',
          epost: sjåførData.epost || '',
          telefon: sjåførData.telefon || ''
        })
      }
    } catch (error) {
      logger.error('Feil ved henting av profil:', error)
    }
  }

  const handleSaveProfil = async () => {
    if (!sjåfør) return
    
    setLoadingProfil(true)
    setProfilMessage(null)
    
    try {
      const token = document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1]
      // Ikke send navn siden det ikke skal kunne endres
      const { navn, ...dataToSend } = profilData
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(dataToSend)
      })
      
      if (response.ok) {
        const data = await response.json()
        setProfilMessage({ type: 'success', text: 'Profil oppdatert!' })
        setEditingProfil(false)
        // Oppdater AuthContext med ny data
        updateSjåfør(data.sjåfør)
        // Reload profil data
        await loadProfilData()
      } else {
        const error = await response.json()
        setProfilMessage({ type: 'error', text: error.feil || 'Feil ved oppdatering av profil' })
      }
    } catch (error) {
      logger.error('Feil ved oppdatering av profil:', error)
      setProfilMessage({ type: 'error', text: 'Feil ved oppdatering av profil' })
    } finally {
      setLoadingProfil(false)
    }
  }

  const handleEndrePassord = async () => {
    if (!sjåfør) return
    
    if (passordData.nyttPassord !== passordData.bekreftPassord) {
      setProfilMessage({ type: 'error', text: 'Nye passord matcher ikke' })
      return
    }
    
    if (passordData.nyttPassord.length < 6) {
      setProfilMessage({ type: 'error', text: 'Nytt passord må være minst 6 tegn' })
      return
    }
    
    setLoadingProfil(true)
    setProfilMessage(null)
    
    try {
      const token = document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1]
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/endre-passord`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          nåværendePassord: passordData.nåværendePassord,
          nyttPassord: passordData.nyttPassord
        })
      })
      
      if (response.ok) {
        setProfilMessage({ type: 'success', text: 'Passord endret!' })
        setEditingPassord(false)
        setPassordData({
          nåværendePassord: '',
          nyttPassord: '',
          bekreftPassord: ''
        })
      } else {
        const error = await response.json()
        setProfilMessage({ type: 'error', text: error.feil || 'Feil ved endring av passord' })
      }
    } catch (error) {
      logger.error('Feil ved endring av passord:', error)
      setProfilMessage({ type: 'error', text: 'Feil ved endring av passord' })
    } finally {
      setLoadingProfil(false)
    }
  }

  useEffect(() => {
    if (!isLoading && !sjåfør) {
      router.push('/login')
    } else if (sjåfør) {
      loadInfoKort()
      if (aktivTab === 'personlig') {
        loadPersonligStatistikk()
      } else if (aktivTab === 'profil') {
        loadProfilData()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sjåfør, isLoading, router, aktivTab])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-2 sm:p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          <SkeletonPageHeader />
          <SkeletonCardList count={3} />
        </div>
      </div>
    )
  }

  if (!sjåfør) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 p-2 sm:p-4">
      <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Tilbake
            </Button>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Info</h1>
              <p className="text-sm text-gray-600">Telefonnumre og koder</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={logout}
            className="flex items-center gap-2"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Logg ut</span>
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
          <Button
            variant={aktivTab === 'info' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setAktivTab('info')}
            className="flex-1"
          >
            <Phone className="h-4 w-4 mr-2" />
            Info-kort
          </Button>
          <Button
            variant={aktivTab === 'personlig' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setAktivTab('personlig')}
            className="flex-1"
          >
            <User className="h-4 w-4 mr-2" />
            Personlig
          </Button>
          <Button
            variant={aktivTab === 'profil' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setAktivTab('profil')}
            className="flex-1"
          >
            <Edit className="h-4 w-4 mr-2" />
            Profil
          </Button>
        </div>

        {/* Innhold basert på aktiv tab */}
        {aktivTab === 'info' && (
          /* Info-kort */
          <Card>
            <CardHeader className="p-3 sm:p-6">
              <CardTitle className="text-base sm:text-lg">Info-kort</CardTitle>
              <CardDescription className="text-sm">Telefonnumre og koder</CardDescription>
            </CardHeader>
            <CardContent className="p-3 sm:p-6">
              {loadingInfo ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-6 sm:h-8 w-6 sm:w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="text-xs sm:text-sm text-gray-500 mt-2">Laster info-kort...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Telefonnumre */}
                  <div>
                    <h4 className="font-semibold text-sm mb-3 flex items-center">
                      <Phone className="h-4 w-4 mr-2 text-blue-600" />
                      Telefonnumre
                    </h4>
                    <div className="space-y-2">
                      {infoKort.filter(info => info.kategori === 'telefon').length > 0 ? (
                        infoKort.filter(info => info.kategori === 'telefon').map((info, index) => (
                          <div key={index} className="p-3 bg-gray-50 rounded-lg">
                            <p className="font-medium text-sm">{info.navn}</p>
                            <a 
                              href={`tel:${cleanPhoneNumber(info.verdi)}`}
                              className="text-sm text-blue-600 hover:text-blue-800 active:text-blue-900 underline font-medium flex items-center gap-1"
                            >
                              <Phone className="h-3 w-3" />
                              {info.verdi}
                            </a>
                            {info.beskrivelse && (
                              <p className="text-xs text-gray-500 mt-1">{info.beskrivelse}</p>
                            )}
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-gray-500 italic">Ingen telefonnumre registrert</p>
                      )}
                    </div>
                  </div>

                  {/* Koder */}
                  <div>
                    <h4 className="font-semibold text-sm mb-3 flex items-center">
                      <Key className="h-4 w-4 mr-2 text-green-600" />
                      Koder
                    </h4>
                    <div className="space-y-2">
                      {infoKort.filter(info => info.kategori === 'kode').length > 0 ? (
                        infoKort.filter(info => info.kategori === 'kode').map((info, index) => (
                          <div key={index} className="p-3 bg-gray-50 rounded-lg">
                            <p className="font-medium text-sm">{info.navn}</p>
                            <p className="text-sm text-gray-600 font-mono">{info.verdi}</p>
                            {info.beskrivelse && (
                              <p className="text-xs text-gray-500 mt-1">{info.beskrivelse}</p>
                            )}
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-gray-500 italic">Ingen koder registrert</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
        {aktivTab === 'personlig' && (
          /* Personlig statistikk */
          <Card>
            <CardHeader className="p-3 sm:p-6">
              <CardTitle className="text-base sm:text-lg flex items-center">
                <User className="h-5 w-5 mr-2 text-blue-600" />
                Personlig statistikk
              </CardTitle>
              <CardDescription className="text-sm">Din oversikt for siste 12 måneder</CardDescription>
            </CardHeader>
            <CardContent className="p-3 sm:p-6">
              {loadingStatistikk ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-6 sm:h-8 w-6 sm:w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="text-xs sm:text-sm text-gray-500 mt-2">Laster statistikk...</p>
                </div>
              ) : personligStatistikk ? (
                <div className="space-y-4">
                  {/* Oversikt */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="p-3 bg-blue-50 rounded-lg text-center">
                      <Calendar className="h-6 w-6 text-blue-600 mx-auto mb-1" />
                      <p className="text-lg font-bold text-blue-700">{personligStatistikk.totalt_dager}</p>
                      <p className="text-xs text-blue-600">Totalt dager</p>
                    </div>
                    <div className="p-3 bg-green-50 rounded-lg text-center">
                      <Clock className="h-6 w-6 text-green-600 mx-auto mb-1" />
                      <p className="text-lg font-bold text-green-700">{personligStatistikk.arbeidstid}</p>
                      <p className="text-xs text-green-600">Arbeidsdager</p>
                    </div>
                    <div className="p-3 bg-red-50 rounded-lg text-center">
                      <AlertTriangle className="h-6 w-6 text-red-600 mx-auto mb-1" />
                      <p className="text-lg font-bold text-red-700">{personligStatistikk.sykedager}</p>
                      <p className="text-xs text-red-600">Sykedager</p>
                    </div>
                    <div className="p-3 bg-blue-50 rounded-lg text-center">
                      <Plane className="h-6 w-6 text-blue-600 mx-auto mb-1" />
                      <p className="text-lg font-bold text-blue-700">{personligStatistikk.ferie}</p>
                      <p className="text-xs text-blue-600">Feriedager</p>
                    </div>
                  </div>

                  {/* Detaljert oversikt */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                      <h4 className="font-semibold text-yellow-900 mb-2 flex items-center">
                        <Heart className="h-4 w-4 mr-2" />
                        Egenmelding
                      </h4>
                      {personligStatistikk.egenmelding_kvoter?.kan_bruke_egenmelding ? (
                        <>
                          <p className="text-sm text-yellow-700 font-medium">
                            {personligStatistikk.egenmelding_kvoter.egenmelding?.antall_sykefravær || personligStatistikk.egenmelding}/{personligStatistikk.egenmelding_kvoter.egenmelding?.maks_sykefravær || 4} sykefravær
                          </p>
                          <p className="text-xs text-yellow-600 mt-1">
                            Maks {personligStatistikk.egenmelding_kvoter.egenmelding?.dager_per_fravær || 3} dager per sykefravær, {personligStatistikk.egenmelding_kvoter.egenmelding?.maks_sykefravær || 4} ganger per år
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="text-sm text-yellow-700">
                            {personligStatistikk.egenmelding_kvoter?.melding || 'Ikke tilgjengelig'}
                          </p>
                          <p className="text-xs text-yellow-600 mt-1">
                            Ikke tilgjengelig i prøveperioden
                          </p>
                        </>
                      )}
                    </div>
                    <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                      <h4 className="font-semibold text-purple-900 mb-2 flex items-center">
                        <Baby className="h-4 w-4 mr-2" />
                        Egenmelding barn
                      </h4>
                      {personligStatistikk.egenmelding_kvoter?.kan_bruke_egenmelding ? (
                        <>
                          <p className="text-sm text-purple-700 font-medium">
                            {personligStatistikk.egenmelding_kvoter.egenmelding_barn?.brukt_dager || personligStatistikk.egenmelding_barn}/{personligStatistikk.egenmelding_kvoter.egenmelding_barn?.maks_dager || 10} dager
                          </p>
                          <p className="text-xs text-purple-600 mt-1">
                            {personligStatistikk.egenmelding_kvoter.egenmelding_barn?.maks_dager || 10} dager per forelder per år (15 ved flere barn)
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="text-sm text-purple-700">
                            {personligStatistikk.egenmelding_kvoter?.melding || 'Ikke tilgjengelig'}
                          </p>
                          <p className="text-xs text-purple-600 mt-1">
                          Ikke tilgjengelig i prøveperioden
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500 italic">Ingen data tilgjengelig</p>
              )}
            </CardContent>
          </Card>
        )}
        {aktivTab === 'profil' && (
          /* Profil-redigering */
          <Card>
            <CardHeader className="p-3 sm:p-6">
              <CardTitle className="text-base sm:text-lg flex items-center">
                <Edit className="h-5 w-5 mr-2 text-blue-600" />
                Min profil
              </CardTitle>
              <CardDescription className="text-sm">Rediger din brukerinformasjon</CardDescription>
            </CardHeader>
            <CardContent className="p-3 sm:p-6">
              {profilMessage && (
                <Alert className={profilMessage.type === 'error' ? 'border-red-500 mb-4' : 'border-green-500 mb-4'}>
                  <AlertDescription>{profilMessage.text}</AlertDescription>
                </Alert>
              )}
              
              {editingProfil ? (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="navn">Navn</Label>
                    <Input
                      id="navn"
                      value={profilData.navn}
                      readOnly
                      disabled
                      className="mt-1 bg-gray-100 cursor-not-allowed"
                    />
                    <p className="text-xs text-gray-500 mt-1">Navn kan ikke endres</p>
                  </div>
                  
                  <div>
                    <Label htmlFor="epost">E-post</Label>
                    <Input
                      id="epost"
                      type="email"
                      value={profilData.epost}
                      onChange={(e) => setProfilData({ ...profilData, epost: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="telefon">Telefon</Label>
                    <Input
                      id="telefon"
                      type="tel"
                      value={profilData.telefon}
                      onChange={(e) => setProfilData({ ...profilData, telefon: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      onClick={handleSaveProfil}
                      disabled={loadingProfil}
                      className="flex-1"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Lagre
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setEditingProfil(false)
                        setProfilMessage(null)
                        loadProfilData()
                      }}
                      disabled={loadingProfil}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Avbryt
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm text-gray-600">Navn</Label>
                    <p className="text-base font-medium mt-1">{profilData.navn || 'Ikke satt'}</p>
                  </div>
                  
                  <div>
                    <Label className="text-sm text-gray-600">E-post</Label>
                    <p className="text-base font-medium mt-1">{profilData.epost || 'Ikke satt'}</p>
                  </div>
                  
                  <div>
                    <Label className="text-sm text-gray-600">Telefon</Label>
                    <p className="text-base font-medium mt-1">{profilData.telefon || 'Ikke satt'}</p>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-2 pt-2">
                    <Button
                      onClick={() => setEditingProfil(true)}
                      className="w-full sm:w-auto"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Rediger profil
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setEditingPassord(true)}
                      className="w-full sm:w-auto"
                    >
                      <Key className="h-4 w-4 mr-2" />
                      Endre passord
                    </Button>
                  </div>
                </div>
              )}
              
              {editingPassord && (
                <div className="space-y-4 mt-4 p-4 border rounded-lg bg-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-sm">Endre passord</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingPassord(false)
                        setPassordData({
                          nåværendePassord: '',
                          nyttPassord: '',
                          bekreftPassord: ''
                        })
                        setProfilMessage(null)
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div>
                    <Label htmlFor="nåværende_passord">Nåværende passord</Label>
                    <Input
                      id="nåværende_passord"
                      type="password"
                      value={passordData.nåværendePassord}
                      onChange={(e) => setPassordData({ ...passordData, nåværendePassord: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="nytt_passord">Nytt passord</Label>
                    <Input
                      id="nytt_passord"
                      type="password"
                      value={passordData.nyttPassord}
                      onChange={(e) => setPassordData({ ...passordData, nyttPassord: e.target.value })}
                      className="mt-1"
                    />
                    <p className="text-xs text-gray-500 mt-1">Minst 6 tegn</p>
                  </div>
                  
                  <div>
                    <Label htmlFor="bekreft_passord">Bekreft nytt passord</Label>
                    <Input
                      id="bekreft_passord"
                      type="password"
                      value={passordData.bekreftPassord}
                      onChange={(e) => setPassordData({ ...passordData, bekreftPassord: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      onClick={handleEndrePassord}
                      disabled={loadingProfil}
                      className="flex-1"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Lagre passord
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setEditingPassord(false)
                        setPassordData({
                          nåværendePassord: '',
                          nyttPassord: '',
                          bekreftPassord: ''
                        })
                        setProfilMessage(null)
                      }}
                      disabled={loadingProfil}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Avbryt
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
