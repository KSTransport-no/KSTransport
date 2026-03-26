'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { logger } from '@/lib/logger'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Truck, Clock, Calendar, AlertTriangle, MapPin, Package, Pause, Scale, Edit, Save, X, Key, Cloud, CloudRain, Sun, CloudSnow, Navigation, AlertCircle, LogOut, CheckCircle, Shield, ChevronDown, ChevronUp } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { NotificationBell } from '@/components/NotificationBell'

interface Skift {
  id: number
  bil_registreringsnummer: string
  bil_merke: string
  bil_modell: string
  sone_navn: string
  sone: string
  dato: string
  start_tid: string
  slutt_tid: string
  pause_minutter: number
  antall_sendinger: number
  vekt: number
  kommentarer: string
  registrering_type?: string
  bomtur_venting?: string
  sga_kode?: string
  sga_beskrivelse?: string
  sga_skal_faktureres?: boolean
  sga_kode_annet?: string
  godkjent?: boolean
  godkjent_av?: number
  godkjent_dato?: string
  godkjent_av_navn?: string
}

interface WeatherForecast {
  time: string
  temperature: number
  condition: string
  description: string
  precipitation: number
  windSpeed: number
}

interface WeatherData {
  temperature: number
  condition: string
  icon: string
  description: string
  windSpeed: number
  humidity: number
  precipitation: number
  location: string
  forecast: WeatherForecast[]
  dailyForecast: WeatherForecast[]
}

export default function HomePage() {
  const { sjåfør, isLoading, logout } = useAuth()
  const router = useRouter()
  const [dagensSkift, setDagensSkift] = useState<Skift[]>([])
  const [loadingSkift, setLoadingSkift] = useState(false)
  const [månedsskift, setMånedsskift] = useState<Skift[]>([])
  const [loadingMåned, setLoadingMåned] = useState(false)
  const [valgtMåned, setValgtMåned] = useState(new Date())
  const [valgtDato, setValgtDato] = useState(() => {
    const today = new Date()
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, '0')
    const day = String(today.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  })
  const [valgtÅr, setValgtÅr] = useState(new Date())
  const [valgtUkeStart, setValgtUkeStart] = useState(() => {
    const d = new Date()
    const day = d.getDay() === 0 ? 7 : d.getDay() // Monday=1..Sunday=7
    d.setHours(0,0,0,0)
    d.setDate(d.getDate() - (day - 1)) // back to Monday
    return d
  })
  const [aktivOversikt, setAktivOversikt] = useState<'dag' | 'uke' | 'måned' | 'år'>('dag')
  const [editingSkift, setEditingSkift] = useState<number | null>(null)
  const [editFormData, setEditFormData] = useState({
    start_tid: '',
    slutt_tid: '',
    pause_minutter: '',
    antall_sendinger: '',
    vekt: '',
    kommentarer: '',
    bomtur_venting: '',
    sga_kode_id: '',
    sga_kode_annet: ''
  })
  const [editSgaKodeType, setEditSgaKodeType] = useState<'dropdown' | 'annet'>('dropdown')
  const [editSgaKoder, setEditSgaKoder] = useState<any[]>([])
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null)
  const [trafficAlerts, setTrafficAlerts] = useState<{
    roadwork: string[]
    incidents: string[]
    delays: string[]
  }>({
    roadwork: [],
    incidents: [],
    delays: []
  })
  const [expandedTraffic, setExpandedTraffic] = useState<{ roadwork: boolean; incidents: boolean; delays: boolean }>({ roadwork: false, incidents: false, delays: false })
  const [loadingWeather, setLoadingWeather] = useState(false)

  const loadWeatherData = async () => {
    setLoadingWeather(true)
    try {
      logger.log('Loading weather data...')
      // Hent værdata via backend proxy (for å unngå CORS-problemer)
      const token = document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1]
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/weather?lat=58.9700&lon=5.7331`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.ok) {
        logger.error(`Weather API error: ${response.status} ${response.statusText}`)
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      logger.log('Yr.no API response received')
      logger.log('Timeseries length:', data.properties?.timeseries?.length)
      
      if (!data.properties || !data.properties.timeseries || data.properties.timeseries.length === 0) {
        logger.error('Invalid weather data structure:', data)
        throw new Error('Invalid weather data structure')
      }
      
      // Hent nåværende værdata
      const current = data.properties.timeseries[0].data.instant.details
      const nextHour = data.properties.timeseries[1]?.data.instant.details
      
      // Hent prognose for spesifikke tidspunkter (9, 12, 15, 18)
      const forecast = []
      const now = new Date()
      const currentHour = now.getHours()
      const currentMinute = now.getMinutes()
      
      // Hent prognose for spesifikke tidspunkter (9, 12, 15, 18)
      const forecastTimes = [9, 12, 15, 18]
      
      for (const hour of forecastTimes) {
        // Hopp over tidspunkter som er i fortiden
        // Hvis klokken er 12:30, skal vi ikke vise 12:00 (den er allerede passert)
        if (hour < currentHour || (hour === currentHour && currentMinute > 0)) {
          continue
        }
        
        // Finn nærmeste tidspunkt til ønsket time (kun fremtidige)
        const closestForecast = data.properties.timeseries.find((item: any) => {
          const itemTime = new Date(item.time)
          // Sjekk at tidspunktet er i fremtiden og matcher ønsket time
          return itemTime.getHours() === hour && itemTime > now
        })
        
        if (closestForecast) {
          const details = closestForecast.data.instant.details
          const nextHourData = closestForecast.data.next_1_hours
          
          forecast.push({
            time: `${hour.toString().padStart(2, '0')}:00`,
            temperature: Math.round(details.air_temperature),
            condition: getWeatherCondition(nextHourData?.summary?.symbol_code || 'clearsky_day'),
            description: getWeatherDescription(nextHourData?.summary?.symbol_code || 'clearsky_day'),
            precipitation: Math.round((nextHourData?.details?.precipitation_amount || 0) * 10) / 10,
            windSpeed: Math.round(details.wind_speed)
          })
        }
      }
      
      // Hent 7-dagers prognose (bruk alle tilgjengelige data fra API)
      const dailyForecast: WeatherForecast[] = []
      const today = new Date()
      const processedDays = new Set<string>()
      
      // Gå gjennom alle tilgjengelige data og grupper etter dag
      data.properties.timeseries.forEach((item: any, index: number) => {
        const itemTime = new Date(item.time)
        const dayKey = itemTime.toDateString()
        
        // Log første 10 elementer for debugging
        if (index < 10) {
          logger.log(`Item ${index}: ${itemTime.toISOString()}, temp: ${item.data.instant.details.air_temperature}°C`)
        }
        
        // Hvis vi ikke har behandlet denne dagen ennå og det er fremtidig
        if (!processedDays.has(dayKey) && itemTime > today) {
          processedDays.add(dayKey)
          
          const details = item.data.instant.details
          const nextHourData = item.data.next_1_hours
          
          // Bruk bedre fallback for symbol-koder
          const symbolCode = nextHourData?.summary?.symbol_code || 
                           (item.data.next_6_hours?.summary?.symbol_code) ||
                           (item.data.next_12_hours?.summary?.symbol_code) ||
                           'clearsky_day'
          
          logger.log(`Adding day: ${dayKey}, temp: ${details.air_temperature}°C, symbol: ${symbolCode}`)
          
          dailyForecast.push({
            time: itemTime.toLocaleDateString('no-NO', { weekday: 'short', day: 'numeric' }),
            temperature: Math.round(details.air_temperature),
            condition: getWeatherCondition(symbolCode),
            description: getWeatherDescription(symbolCode),
            precipitation: Math.round((nextHourData?.details?.precipitation_amount || 0) * 10) / 10,
            windSpeed: Math.round(details.wind_speed)
          })
        }
      })
      
      logger.log('Total daily forecast items:', dailyForecast.length)
      logger.log('Daily forecast:', dailyForecast)
      
      // Begrens til 7 dager
      const limitedDailyForecast = dailyForecast.slice(0, 7)
      
      const weatherData = {
        temperature: Math.round(current.air_temperature),
        condition: getWeatherCondition(data.properties.timeseries[0].data.next_1_hours?.summary?.symbol_code || 'clearsky_day'),
        icon: getWeatherCondition(data.properties.timeseries[0].data.next_1_hours?.summary?.symbol_code || 'clearsky_day'),
        description: getWeatherDescription(data.properties.timeseries[0].data.next_1_hours?.summary?.symbol_code || 'clearsky_day'),
        windSpeed: Math.round(current.wind_speed),
        humidity: Math.round(current.relative_humidity),
        precipitation: Math.round((data.properties.timeseries[0].data.next_1_hours?.details?.precipitation_amount || 0) * 10) / 10,
        location: 'Stavanger',
        forecast: forecast,
        dailyForecast: limitedDailyForecast
      }
      
      setWeatherData(weatherData)
      logger.log('Weather data loaded successfully')
    } catch (error: any) {
      logger.error('Feil ved henting av ekte værdata:', error)
      logger.error('Error details:', {
        message: error?.message,
        stack: error?.stack,
        name: error?.name
      })
      setWeatherData(null) // Ikke vis falsk informasjon
    } finally {
      setLoadingWeather(false)
    }
  }

  const loadTrafficData = async () => {
    try {
      // Prøv å hente trafikkoppdateringer via backend proxy
      try {
        // Bruk backend som proxy for å unngå CORS-problemer
        const response = await fetch('/api/trafikk', {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'KSTransport/1.0 (kontakt@kstransport.no)'
          }
        })
        
        if (response.ok) {
          const data = await response.json()
          logger.log('Backend trafikkdata:', data)
          
          setTrafficAlerts({
            roadwork: data.roadwork || [],
            incidents: data.incidents || [],
            delays: data.delays || []
          })
          
          return // Suksess
        }
      } catch (apiError) {
        logger.log('Trafikktjeneste ikke tilgjengelig:', apiError)
      }
      
      // Ikke vis falsk trafikkinformasjon
      setTrafficAlerts({
        roadwork: [],
        incidents: [],
        delays: []
      })
    } catch (error) {
      logger.error('Feil ved henting av trafikkdata:', error)
    }
  }

  // Konverter Yr.no symbol-koder til våre egne
  const getWeatherCondition = (symbolCode: string) => {
    if (symbolCode.includes('clearsky') || symbolCode.includes('fair')) return 'sunny'
    if (symbolCode.includes('partlycloudy') || symbolCode.includes('cloudy')) return 'cloudy'
    if (symbolCode.includes('rain') || symbolCode.includes('shower')) return 'rainy'
    if (symbolCode.includes('snow') || symbolCode.includes('sleet')) return 'snowy'
    return 'cloudy'
  }

  const getWeatherDescription = (symbolCode: string) => {
    if (symbolCode.includes('clearsky')) return 'Klarvær'
    if (symbolCode.includes('fair')) return 'Delvis skyet'
    if (symbolCode.includes('partlycloudy')) return 'Delvis skyet'
    if (symbolCode.includes('cloudy')) return 'Overskyet'
    if (symbolCode.includes('rainshowers')) return 'Regnbyger'
    if (symbolCode.includes('rain')) return 'Regn'
    if (symbolCode.includes('snow')) return 'Snø'
    if (symbolCode.includes('sleet')) return 'Sludd'
    return 'Overskyet'
  }

  const getWeatherIcon = (condition: string, size: 'small' | 'medium' | 'large' = 'medium') => {
    const sizeClasses = {
      small: 'h-4 w-4',
      medium: 'h-6 w-6',
      large: 'h-8 w-8'
    }
    
    const iconSize = sizeClasses[size]
    
    switch (condition) {
      case 'sunny': 
        return (
          <div className="relative">
            <Sun className={`${iconSize} text-yellow-500 drop-shadow-sm`} />
            <div className="absolute inset-0 animate-pulse">
              <Sun className={`${iconSize} text-yellow-300 opacity-30`} />
            </div>
          </div>
        )
      case 'cloudy': 
        return <Cloud className={`${iconSize} text-gray-500 drop-shadow-sm`} />
      case 'rainy': 
        return (
          <div className="relative">
            <CloudRain className={`${iconSize} text-blue-500 drop-shadow-sm`} />
            <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2">
              <div className="w-1 h-1 bg-blue-400 rounded-full animate-bounce"></div>
              <div className="w-1 h-1 bg-blue-400 rounded-full animate-bounce delay-100 absolute left-1"></div>
              <div className="w-1 h-1 bg-blue-400 rounded-full animate-bounce delay-200 absolute -left-1"></div>
            </div>
          </div>
        )
      case 'snowy': 
        return (
          <div className="relative">
            <CloudSnow className={`${iconSize} text-blue-300 drop-shadow-sm`} />
            <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2">
              <div className="w-1 h-1 bg-blue-200 rounded-full animate-pulse"></div>
              <div className="w-1 h-1 bg-blue-200 rounded-full animate-pulse delay-100 absolute left-1"></div>
              <div className="w-1 h-1 bg-blue-200 rounded-full animate-pulse delay-200 absolute -left-1"></div>
            </div>
          </div>
        )
      default: 
        return <Sun className={`${iconSize} text-yellow-500 drop-shadow-sm`} />
    }
  }

  const loadDagensSkift = async () => {
    if (!sjåfør) return
    
    setLoadingSkift(true)
    try {
      const token = document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1]
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/skift?dato=${valgtDato}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (response.ok) {
        const skift = await response.json()
        setDagensSkift(skift)
      }
    } catch (error) {
      logger.error('Feil ved henting av dagens skift:', error)
    } finally {
      setLoadingSkift(false)
    }
  }

  const loadMånedsskift = async () => {
    if (!sjåfør) return
    
    setLoadingMåned(true)
    try {
      const token = document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1]
      
      if (aktivOversikt === 'år') {
        // Last hele året
        const år = valgtÅr.getFullYear()
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/skift?år=${år}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        
        if (response.ok) {
          const skift = await response.json()
          setMånedsskift(skift)
        }
      } else if (aktivOversikt === 'uke') {
        // Last begge månedene som kan berøre uken (start og ev. slutt måned)
        const start = new Date(valgtUkeStart)
        const end = new Date(valgtUkeStart)
        end.setDate(end.getDate() + 6)

        const årStart = start.getFullYear()
        const mndStart = start.getMonth() + 1
        const årEnd = end.getFullYear()
        const mndEnd = end.getMonth() + 1

        const urls = new Set<string>([
          `${process.env.NEXT_PUBLIC_API_URL}/skift?år=${årStart}&måned=${mndStart}`
        ])
        if (årEnd !== årStart || mndEnd !== mndStart) {
          urls.add(`${process.env.NEXT_PUBLIC_API_URL}/skift?år=${årEnd}&måned=${mndEnd}`)
        }

        const results: any[] = []
        // Bruk Promise.all for å vente på alle API-kall
        const promises = Array.from(urls).map(async (url) => {
          const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } })
          if (res.ok) {
            const data = await res.json()
            return data
          }
          return []
        })
        
        const allResults = await Promise.all(promises)
        allResults.forEach(data => results.push(...data))
        setMånedsskift(results)
      } else {
        // Last kun valgt måned
        const år = valgtMåned.getFullYear()
        const måned = valgtMåned.getMonth() + 1
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/skift?år=${år}&måned=${måned}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        
        if (response.ok) {
          const skift = await response.json()
          setMånedsskift(skift)
        }
      }
    } catch (error) {
      logger.error('Feil ved henting av månedsskift:', error)
    } finally {
      setLoadingMåned(false)
    }
  }

  useEffect(() => {
    if (!isLoading && !sjåfør) {
      router.push('/login')
    } else if (sjåfør) {
      loadDagensSkift()
      loadMånedsskift()
      loadWeatherData()
      loadTrafficData()
    }
  }, [sjåfør, isLoading, router])

  // Last skift når valgtDato endres
  useEffect(() => {
    if (sjåfør) {
      loadDagensSkift()
    }
  }, [valgtDato, sjåfør])

  // Last månedsskift når siden blir fokusert (bruker kommer tilbake fra tidregistrering)
  useEffect(() => {
    const handleFocus = () => {
      if (sjåfør) {
        loadMånedsskift()
        loadDagensSkift()
      }
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && sjåfør) {
        loadMånedsskift()
        loadDagensSkift()
      }
    }

    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    return () => {
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [sjåfør])

  useEffect(() => {
    if (sjåfør) {
      loadDagensSkift()
      loadWeatherData()
      loadTrafficData()
    }
  }, [valgtDato])

  useEffect(() => {
    if (sjåfør) {
      loadMånedsskift()
    }
  }, [valgtMåned, valgtUkeStart, sjåfør, aktivOversikt])

  useEffect(() => {
    if (sjåfør && aktivOversikt === 'år') {
      loadMånedsskift() // Last alle måneder for å beregne årsstatistikk
    }
  }, [valgtÅr, aktivOversikt, sjåfør])

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

  const isArbeid = (t?: string) => !t || t === 'arbeidstid'

  const getTypeLabel = (t?: string) => {
    switch (t) {
      case 'ferie': return 'Ferie'
      case 'sykemelding': return 'Sykemelding'
      case 'egenmelding': return 'Egenmelding'
      case 'egenmelding_barn': return 'Egenmelding barn'
      default: return 'Arbeidstid'
    }
  }

  const beregnÅrsstatistikk = () => {
    const årStart = new Date(valgtÅr.getFullYear(), 0, 1)
    const årSlutt = new Date(valgtÅr.getFullYear(), 11, 31)
    
    const årsskift = månedsskift.filter(skift => {
      const skiftDato = new Date(skift.dato)
      return skiftDato >= årStart && skiftDato <= årSlutt
    })
    
    const totalSendinger = årsskift.reduce((sum, skift) => sum + (skift.antall_sendinger || 0), 0)
    const totalVekt = årsskift.reduce((sum, skift) => sum + (skift.vekt || 0), 0)
    
    let totalMinutter = 0
    const erArbeid = (t?: string) => !t || t === 'arbeidstid'
    årsskift.forEach(skift => {
      if (skift.slutt_tid && erArbeid(skift.registrering_type)) {
        const start = new Date(skift.start_tid)
        const slutt = new Date(skift.slutt_tid)
        const diffMs = slutt.getTime() - start.getTime()
        const diffMinutes = Math.floor(diffMs / (1000 * 60))
        totalMinutter += diffMinutes
      }
    })
    
    const normaleArbeidsdager = årsskift.filter(skift => skift.slutt_tid && erArbeid(skift.registrering_type)).length
    const normaleTimerPerDag = 8
    const totalNormaleMinutter = normaleArbeidsdager * normaleTimerPerDag * 60
    const overtidMinutter = Math.max(0, totalMinutter - totalNormaleMinutter)
    const normaleMinutter = Math.min(totalMinutter, totalNormaleMinutter)
    
    const overtidTimer = Math.floor(overtidMinutter / 60)
    const overtidMinutterRest = overtidMinutter % 60
    const normaleTimer = Math.floor(normaleMinutter / 60)
    const normaleMinutterRest = normaleMinutter % 60
    
    return {
      totalSendinger,
      totalVekt,
      normaleTimer,
      normaleMinutterRest,
      overtidTimer,
      overtidMinutterRest
    }
  }

  const beregnMånedsoverikt = () => {
    // Filtrer kun skift for valgt måned
    const månedStart = new Date(valgtMåned.getFullYear(), valgtMåned.getMonth(), 1)
    const månedSlutt = new Date(valgtMåned.getFullYear(), valgtMåned.getMonth() + 1, 0)
    
    const månedsskiftFiltrert = månedsskift.filter(skift => {
      const skiftDato = new Date(skift.dato)
      return skiftDato >= månedStart && skiftDato <= månedSlutt
    })
    
    const totalSendinger = månedsskiftFiltrert.reduce((sum, skift) => sum + (skift.antall_sendinger || 0), 0)
    const totalVekt = månedsskiftFiltrert.reduce((sum, skift) => sum + (skift.vekt || 0), 0)
    
    let totalMinutter = 0
    const erArbeidM = (t?: string) => !t || t === 'arbeidstid'
    månedsskiftFiltrert.forEach(skift => {
      if (skift.slutt_tid && erArbeidM(skift.registrering_type)) {
        const start = new Date(skift.start_tid)
        const slutt = new Date(skift.slutt_tid)
        const diffMs = slutt.getTime() - start.getTime()
        const diffMinutes = Math.floor(diffMs / (1000 * 60))
        // Ikke trekk fra pause - vis total tid
        totalMinutter += diffMinutes
      }
    })
    
    const totalTimer = Math.floor(totalMinutter / 60)
    const gjenværendeMinutter = totalMinutter % 60
    
    // Beregn normal arbeidstid og overtid (antagelse: 8 timer per dag er normal arbeidstid)
    const normaleArbeidsdager = månedsskiftFiltrert.filter(skift => skift.slutt_tid && erArbeidM(skift.registrering_type)).length
    const normaleTimerPerDag = 8
    const totalNormaleMinutter = normaleArbeidsdager * normaleTimerPerDag * 60
    const overtidMinutter = Math.max(0, totalMinutter - totalNormaleMinutter)
    const normaleMinutter = Math.min(totalMinutter, totalNormaleMinutter)
    
    const overtidTimer = Math.floor(overtidMinutter / 60)
    const overtidMinutterRest = overtidMinutter % 60
    const normaleTimer = Math.floor(normaleMinutter / 60)
    const normaleMinutterRest = normaleMinutter % 60
    
    return {
      totalSendinger,
      totalTimer,
      gjenværendeMinutter,
      normaleTimer,
      normaleMinutterRest,
      overtidTimer,
      overtidMinutterRest,
      totalVekt
    }
  }

  const forrigeMåned = () => {
    setValgtMåned(new Date(valgtMåned.getFullYear(), valgtMåned.getMonth() - 1, 1))
  }

  // Uke navigasjon (mandag-søndag)
  const ukeStartMandag = (d: Date) => {
    const nd = new Date(d)
    const dow = nd.getDay() === 0 ? 7 : nd.getDay()
    nd.setHours(0,0,0,0)
    nd.setDate(nd.getDate() - (dow - 1))
    return nd
  }

  const nesteUke = () => {
    const d = new Date(valgtUkeStart)
    d.setDate(d.getDate() + 7)
    setValgtUkeStart(ukeStartMandag(d))
  }

  const forrigeUke = () => {
    const d = new Date(valgtUkeStart)
    d.setDate(d.getDate() - 7)
    setValgtUkeStart(ukeStartMandag(d))
  }

  const denneUken = () => {
    setValgtUkeStart(ukeStartMandag(new Date()))
  }

  const nesteÅr = () => {
    setValgtÅr(new Date(valgtÅr.getFullYear() + 1, valgtÅr.getMonth(), 1))
  }

  const forrigeÅr = () => {
    setValgtÅr(new Date(valgtÅr.getFullYear() - 1, valgtÅr.getMonth(), 1))
  }

  const nesteMåned = () => {
    setValgtMåned(new Date(valgtMåned.getFullYear(), valgtMåned.getMonth() + 1, 1))
  }

  const tilbakeTilNåværendeMåned = () => {
    setValgtMåned(new Date())
  }

  const nesteDag = () => {
    const nesteDato = new Date(valgtDato)
    nesteDato.setDate(nesteDato.getDate() + 1)
    setValgtDato(formatDateForAPI(nesteDato))
  }

  const forrigeDag = () => {
    const forrigeDato = new Date(valgtDato)
    forrigeDato.setDate(forrigeDato.getDate() - 1)
    setValgtDato(formatDateForAPI(forrigeDato))
  }

  const formatDateForAPI = (date: Date): string => {
    // Bruk lokal timezone for å unngå UTC-konvertering
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const tilbakeTilIdag = () => {
    setValgtDato(formatDateForAPI(new Date()))
  }

  const beregnUkesoverikt = () => {
    const start = new Date(valgtUkeStart)
    const slutt = new Date(valgtUkeStart)
    slutt.setDate(slutt.getDate() + 6)

    const iUke = (datoStr: string) => {
      const d = new Date(datoStr)
      d.setHours(0,0,0,0)
      return d >= start && d <= slutt
    }

    const ukeskift = månedsskift.filter(skift => iUke(skift.dato))

    const totalSendinger = ukeskift.reduce((sum, skift) => sum + (skift.antall_sendinger || 0), 0)
    const totalVekt = ukeskift.reduce((sum, skift) => sum + (skift.vekt || 0), 0)

    let totalMinutter = 0
    const erArbeidU = (t?: string) => !t || t === 'arbeidstid'
    ukeskift.forEach(skift => {
      if (skift.slutt_tid && erArbeidU(skift.registrering_type)) {
        const startT = new Date(skift.start_tid)
        const sluttT = new Date(skift.slutt_tid)
        const diffMs = sluttT.getTime() - startT.getTime()
        const diffMinutes = Math.floor(diffMs / (1000 * 60))
        totalMinutter += diffMinutes
      }
    })

    const normaleArbeidsdager = ukeskift.filter(skift => skift.slutt_tid && erArbeidU(skift.registrering_type)).length
    const normaleTimerPerDag = 8
    const totalNormaleMinutter = normaleArbeidsdager * normaleTimerPerDag * 60
    const overtidMinutter = Math.max(0, totalMinutter - totalNormaleMinutter)
    const normaleMinutter = Math.min(totalMinutter, totalNormaleMinutter)

    const overtidTimer = Math.floor(overtidMinutter / 60)
    const overtidMinutterRest = overtidMinutter % 60
    const normaleTimer = Math.floor(normaleMinutter / 60)
    const normaleMinutterRest = normaleMinutter % 60

    return {
      totaleTimer: Math.floor(totalMinutter / 60),
      totaleMinutterRest: totalMinutter % 60,
      totalMinutter,
      totalSendinger,
      totalVekt,
      normaleTimer,
      normaleMinutterRest,
      overtidTimer,
      overtidMinutterRest,
      start,
      slutt
    }
  }

  const loadSgaKoder = async () => {
    try {
      const token = document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1]
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/data/sga-koder`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (response.ok) {
        const data = await response.json()
        setEditSgaKoder(data)
      }
    } catch (error) {
      logger.error('Feil ved henting av SGA-koder:', error)
    }
  }

  const startEditSkift = async (skift: Skift) => {
    setEditingSkift(skift.id)
    // Last SGA-koder hvis ikke allerede lastet
    if (editSgaKoder.length === 0) {
      await loadSgaKoder()
    }
    
    // Bestem om det er dropdown eller annet basert på data
    const isAnnet = !!skift.sga_kode_annet
    
    setEditSgaKodeType(isAnnet ? 'annet' : 'dropdown')
    
    // Finn sga_kode_id hvis sga_kode er satt
    let sgaKodeId = ''
    if (skift.sga_kode && editSgaKoder.length > 0) {
      const found = editSgaKoder.find(sga => sga.kode === skift.sga_kode)
      if (found) {
        sgaKodeId = found.id.toString()
      }
    }
    
    setEditFormData({
      start_tid: skift.start_tid.split('T')[1]?.split(':').slice(0, 2).join(':') || '',
      slutt_tid: skift.slutt_tid ? skift.slutt_tid.split('T')[1]?.split(':').slice(0, 2).join(':') || '' : '',
      pause_minutter: skift.pause_minutter.toString(),
      antall_sendinger: skift.antall_sendinger.toString(),
      vekt: skift.vekt.toString(),
      kommentarer: skift.kommentarer || '',
      bomtur_venting: skift.bomtur_venting || '',
      sga_kode_id: sgaKodeId,
      sga_kode_annet: skift.sga_kode_annet || ''
    })
  }

  const cancelEditSkift = () => {
    setEditingSkift(null)
    setEditFormData({
      start_tid: '',
      slutt_tid: '',
      pause_minutter: '',
      antall_sendinger: '',
      vekt: '',
      kommentarer: '',
      bomtur_venting: '',
      sga_kode_id: '',
      sga_kode_annet: ''
    })
    setEditSgaKodeType('dropdown')
  }

  const saveEditSkift = async (skiftId: number) => {
    try {
      const token = document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1]
      
      const updateData: any = {}

      // Valider og legg til pause_minutter
      if (editFormData.pause_minutter && !isNaN(parseInt(editFormData.pause_minutter))) {
        updateData.pause_minutter = parseInt(editFormData.pause_minutter)
      }

      // Valider og legg til antall_sendinger
      if (editFormData.antall_sendinger && !isNaN(parseInt(editFormData.antall_sendinger))) {
        updateData.antall_sendinger = parseInt(editFormData.antall_sendinger)
      }

      // Valider og legg til vekt
      if (editFormData.vekt && !isNaN(parseInt(editFormData.vekt))) {
        updateData.vekt = parseInt(editFormData.vekt)
      }

      // Legg til kommentarer hvis den ikke er tom
      if (editFormData.kommentarer && editFormData.kommentarer.trim()) {
        updateData.kommentarer = editFormData.kommentarer.trim()
      }

      // Legg til bomtur/venting hvis den ikke er tom
      if (editFormData.bomtur_venting && editFormData.bomtur_venting.trim()) {
        updateData.bomtur_venting = editFormData.bomtur_venting.trim()
      }

      // Legg til SGA-kode
      if (editSgaKodeType === 'dropdown' && editFormData.sga_kode_id) {
        updateData.sga_kode_id = parseInt(editFormData.sga_kode_id)
        updateData.sga_kode_annet = null
      } else if (editSgaKodeType === 'annet' && editFormData.sga_kode_annet) {
        updateData.sga_kode_id = null
        updateData.sga_kode_annet = editFormData.sga_kode_annet.trim()
      }

      // Hvis start_tid er endret og ikke tom
      if (editFormData.start_tid && editFormData.start_tid.trim()) {
        updateData.start_tid = `${valgtDato}T${editFormData.start_tid}:00.000Z`
      }

      // Hvis slutt_tid er endret og ikke tom
      if (editFormData.slutt_tid && editFormData.slutt_tid.trim()) {
        updateData.slutt_tid = `${valgtDato}T${editFormData.slutt_tid}:00.000Z`
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/skift/${skiftId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updateData)
      })

      if (response.ok) {
        setMessage({ type: 'success', text: 'Skift oppdatert!' })
        setEditingSkift(null)
        loadDagensSkift() // Reload skift
        setTimeout(() => setMessage(null), 3000)
      } else {
        const error = await response.json()
        logger.error('Backend error:', error)
        setMessage({ type: 'error', text: error.feil || 'Feil ved oppdatering av skift' })
        setTimeout(() => setMessage(null), 5000)
      }
    } catch (error) {
      logger.error('Feil ved oppdatering av skift:', error)
      setMessage({ type: 'error', text: 'Serverfeil ved oppdatering av skift' })
      setTimeout(() => setMessage(null), 5000)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!sjåfør) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 p-2 sm:p-4">
      <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
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

        {/* Header - Mobile First */}
        <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <h1 className="text-lg sm:text-xl font-bold text-gray-900 truncate">
                  Velkommen, {sjåfør.navn}!
                </h1>
                <div className="flex items-center gap-2">
                  <NotificationBell />
                  {sjåfør.admin && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push('/admin')}
                      className="flex items-center gap-1 text-xs sm:text-sm border-purple-200 text-purple-700 hover:bg-purple-50"
                    >
                      <Shield className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span className="hidden sm:inline">Admin</span>
                    </Button>
                  )}
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
                Registrering og skiftoversikt
              </p>
            </div>
            <img src="/logo.png" alt="KS Transport" className="h-24 sm:h-30 w-auto ml-2 sm:ml-3 flex-shrink-0" />
          </div>
        </div>

        {/* Quick Actions - Mobile First */}
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          <Card className="hover:shadow-md transition-shadow">
            <CardContent 
              className="p-3 sm:p-4 text-center cursor-pointer" 
              onClick={() => router.push('/tidregistrering')}
            >
              <Clock className="h-8 sm:h-12 w-8 sm:w-12 text-blue-600 mx-auto mb-1 sm:mb-2" />
              <h3 className="font-semibold text-xs sm:text-sm">Registrering</h3>
              <p className="text-xs text-gray-500 hidden sm:block">Registrer tid</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardContent 
              className="p-3 sm:p-4 text-center cursor-pointer" 
              onClick={() => router.push('/kalender')}
            >
              <Calendar className="h-8 sm:h-12 w-8 sm:w-12 text-green-600 mx-auto mb-1 sm:mb-2" />
              <h3 className="font-semibold text-xs sm:text-sm">Kalender</h3>
              <p className="text-xs text-gray-500 hidden sm:block">Se oversikt</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardContent 
              className="p-3 sm:p-4 text-center cursor-pointer" 
              onClick={() => router.push('/avvik')}
            >
              <AlertTriangle className="h-8 sm:h-12 w-8 sm:w-12 text-red-600 mx-auto mb-1 sm:mb-2" />
              <h3 className="font-semibold text-xs sm:text-sm">Rapporter Avvik</h3>
              <p className="text-xs text-gray-500 hidden sm:block">Registrer problem</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardContent 
              className="p-3 sm:p-4 text-center cursor-pointer" 
              onClick={() => router.push('/forbedringsforslag')}
            >
              <Truck className="h-8 sm:h-12 w-8 sm:w-12 text-purple-600 mx-auto mb-1 sm:mb-2" />
              <h3 className="font-semibold text-xs sm:text-sm">Forbedring</h3>
              <p className="text-xs text-gray-500 hidden sm:block">Send forslag</p>
            </CardContent>
          </Card>

          {/* Info-kort knapp */}
          <Card className="hover:shadow-md transition-shadow">
            <CardContent 
              className="p-3 sm:p-4 text-center cursor-pointer" 
              onClick={() => router.push('/info')}
            >
              <Key className="h-8 sm:h-12 w-8 sm:w-12 text-orange-600 mx-auto mb-1 sm:mb-2" />
              <h3 className="font-semibold text-xs sm:text-sm">Info</h3>
              <p className="text-xs text-gray-500 hidden sm:block">Telefonnumre og koder</p>
            </CardContent>
          </Card>

          {/* Oppdrag knapp */}
          <Card className="hover:shadow-md transition-shadow">
            <CardContent 
              className="p-3 sm:p-4 text-center cursor-pointer" 
              onClick={() => router.push('/oppdrag')}
            >
              <Package className="h-8 sm:h-12 w-8 sm:w-12 text-indigo-600 mx-auto mb-1 sm:mb-2" />
              <h3 className="font-semibold text-xs sm:text-sm">Oppdrag</h3>
              <p className="text-xs text-gray-500 hidden sm:block">Opprett oppdrag</p>
            </CardContent>
          </Card>
        </div>

        {/* Oversikt */}
        <Card>
          <CardHeader className="p-3 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-3 sm:space-y-0">
              <div>
                <CardTitle className="text-base sm:text-lg">Oversikt</CardTitle>
                <CardDescription className="text-sm">
                  {aktivOversikt === 'dag' && valgtDato && new Date(valgtDato).toLocaleDateString('no-NO')}
                  {aktivOversikt === 'uke' && (
                    (() => {
                      const u = beregnUkesoverikt()
                      return `${u.start.toLocaleDateString('no-NO')} - ${u.slutt.toLocaleDateString('no-NO')}`
                    })()
                  )}
                  {aktivOversikt === 'måned' && valgtMåned.toLocaleDateString('no-NO', { year: 'numeric', month: 'long' })}
                  {aktivOversikt === 'år' && valgtÅr.getFullYear()}
                </CardDescription>
              </div>
              
              {/* Tab Navigation */}
              <div className="flex items-center space-x-1">
                <Button
                  variant={aktivOversikt === 'dag' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setAktivOversikt('dag')}
                >
                  Dag
                </Button>
                <Button
                  variant={aktivOversikt === 'uke' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setAktivOversikt('uke')}
                >
                  Uke
                </Button>
                <Button
                  variant={aktivOversikt === 'måned' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setAktivOversikt('måned')}
                >
                  Måned
                </Button>
                <Button
                  variant={aktivOversikt === 'år' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setAktivOversikt('år')}
                >
                  År
                </Button>
              </div>
            </div>
            
            {/* Navigation Controls */}
            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center space-x-2">
                {aktivOversikt === 'dag' && (
                  <>
                    <Button variant="outline" size="sm" onClick={forrigeDag}>
                      ←
                    </Button>
                    <Button variant="outline" size="sm" onClick={nesteDag}>
                      →
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={tilbakeTilIdag}
                    >
                      I dag
                    </Button>
                  </>
                )}
                {aktivOversikt === 'uke' && (
                  <>
                    <Button variant="outline" size="sm" onClick={forrigeUke}>
                      ←
                    </Button>
                    <Button variant="outline" size="sm" onClick={nesteUke}>
                      →
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={denneUken}
                    >
                      Denne uken
                    </Button>
                  </>
                )}
                {aktivOversikt === 'måned' && (
                  <>
                    <Button variant="outline" size="sm" onClick={forrigeMåned}>
                      ←
                    </Button>
                    <Button variant="outline" size="sm" onClick={nesteMåned}>
                      →
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={tilbakeTilNåværendeMåned}
                    >
                      Denne måneden
                    </Button>
                  </>
                )}
                {aktivOversikt === 'år' && (
                  <>
                    <Button variant="outline" size="sm" onClick={forrigeÅr}>
                      ←
                    </Button>
                    <Button variant="outline" size="sm" onClick={nesteÅr}>
                      →
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setValgtÅr(new Date())}
                    >
                      {new Date().getFullYear()}
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="p-3 sm:p-6 pt-0">
            {aktivOversikt === 'dag' ? (
              /* Dag - Skiftoversikt */
              <div className="space-y-3 sm:space-y-4">
                <h3 className="text-lg font-semibold">Skiftoversikten</h3>
                {dagensSkift.length === 0 ? (
                  <div className="text-center py-6 sm:py-8">
                    <Clock className="h-10 sm:h-12 w-10 sm:w-12 mx-auto mb-3 sm:mb-4 text-gray-300" />
                    <p className="text-gray-500 text-sm sm:text-base">Ingen skift registrert for denne dagen</p>
                  </div>
                ) : (
                  dagensSkift.map((skift) => (
                    <Card key={skift.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4 sm:p-6">
                        {editingSkift === skift.id ? (
                          // Redigeringsmodus
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <h4 className="font-medium text-sm sm:text-base">Rediger skift</h4>
                              <div className="flex space-x-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => saveEditSkift(skift.id)}
                                  className="text-xs"
                                >
                                  <Save className="h-3 w-3 mr-1" />
                                  Lagre
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={cancelEditSkift}
                                  className="text-xs"
                                >
                                  <X className="h-3 w-3 mr-1" />
                                  Avbryt
                                </Button>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-2 sm:gap-3">
                              <div>
                                <Label htmlFor={`start_tid_${skift.id}`} className="text-xs">Start tid</Label>
                                <Input
                                  id={`start_tid_${skift.id}`}
                                  type="time"
                                  value={editFormData.start_tid}
                                  onChange={(e) => setEditFormData({ ...editFormData, start_tid: e.target.value })}
                                  className="text-xs"
                                />
                              </div>
                              <div>
                                <Label htmlFor={`slutt_tid_${skift.id}`} className="text-xs">Slutt tid</Label>
                                <Input
                                  id={`slutt_tid_${skift.id}`}
                                  type="time"
                                  value={editFormData.slutt_tid}
                                  onChange={(e) => setEditFormData({ ...editFormData, slutt_tid: e.target.value })}
                                  className="text-xs"
                                />
                              </div>
                              <div>
                                <Label htmlFor={`pause_${skift.id}`} className="text-xs">Pause (min)</Label>
                                <Input
                                  id={`pause_${skift.id}`}
                                  type="number"
                                  value={editFormData.pause_minutter}
                                  onChange={(e) => setEditFormData({ ...editFormData, pause_minutter: e.target.value })}
                                  className="text-xs"
                                />
                              </div>
                              <div>
                                <Label htmlFor={`sendinger_${skift.id}`} className="text-xs">Sendinger</Label>
                                <Input
                                  id={`sendinger_${skift.id}`}
                                  type="number"
                                  value={editFormData.antall_sendinger}
                                  onChange={(e) => setEditFormData({ ...editFormData, antall_sendinger: e.target.value })}
                                  className="text-xs"
                                />
                              </div>
                              <div>
                                <Label htmlFor={`vekt_${skift.id}`} className="text-xs">Vekt (kg)</Label>
                                <Input
                                  id={`vekt_${skift.id}`}
                                  type="number"
                                  value={editFormData.vekt}
                                  onChange={(e) => setEditFormData({ ...editFormData, vekt: e.target.value })}
                                  className="text-xs"
                                />
                              </div>
                            </div>
                            
                            <div>
                              <Label htmlFor={`kommentarer_${skift.id}`} className="text-xs">Kommentarer</Label>
                              <Textarea
                                id={`kommentarer_${skift.id}`}
                                value={editFormData.kommentarer}
                                onChange={(e) => setEditFormData({ ...editFormData, kommentarer: e.target.value })}
                                className="text-xs"
                                rows={2}
                              />
                            </div>
                            
                            <div>
                              <Label htmlFor={`bomtur_venting_${skift.id}`} className="text-xs">Bomtur/Venting</Label>
                              <Textarea
                                id={`bomtur_venting_${skift.id}`}
                                value={editFormData.bomtur_venting}
                                onChange={(e) => setEditFormData({ ...editFormData, bomtur_venting: e.target.value })}
                                className="text-xs"
                                rows={2}
                                placeholder="Beskriv årsak til bomtur eller ventetid"
                              />
                            </div>
                            
                            {/* SGA-kode */}
                            <div className="space-y-2">
                              <Label className="text-xs">SGA-kode</Label>
                              <Select 
                                value={editSgaKodeType} 
                                onValueChange={(value: 'dropdown' | 'annet') => {
                                  setEditSgaKodeType(value)
                                  if (value === 'dropdown') {
                                    setEditFormData({ ...editFormData, sga_kode_annet: '' })
                                  } else {
                                    setEditFormData({ ...editFormData, sga_kode_id: '' })
                                  }
                                }}
                              >
                                <SelectTrigger className="text-xs h-8">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="dropdown">Velg fra liste</SelectItem>
                                  <SelectItem value="annet">Annet (skriv inn)</SelectItem>
                                </SelectContent>
                              </Select>
                              
                              {editSgaKodeType === 'dropdown' ? (
                                <Select 
                                  value={editFormData.sga_kode_id} 
                                  onValueChange={(value) => setEditFormData({ ...editFormData, sga_kode_id: value })}
                                >
                                  <SelectTrigger className="text-xs h-8">
                                    <SelectValue placeholder="Velg SGA-kode" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {editSgaKoder.map((sga) => (
                                      <SelectItem key={sga.id} value={sga.id.toString()}>
                                        {sga.kode} {sga.beskrivelse && `- ${sga.beskrivelse}`} {sga.skal_faktureres ? '(Faktureres)' : '(Ikke faktureres)'}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : (
                                <Input
                                  className="text-xs h-8"
                                  placeholder="Skriv inn SGA-kode"
                                  value={editFormData.sga_kode_annet}
                                  onChange={(e) => setEditFormData({ ...editFormData, sga_kode_annet: e.target.value })}
                                />
                              )}
                            </div>
                          </div>
                        ) : (
                          // Visningsmodus
                          <>
                            {/* Topp-linje: for ikke-arbeidstid vis dato + type; for arbeidstid alltid klokkeslett */}
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-blue-600" />
                                {isArbeid(skift.registrering_type) ? (
                                  <span className="font-semibold text-base">
                                    {formatTid(skift.start_tid)} - {formatTid(skift.slutt_tid)}
                                  </span>
                                ) : (
                                  <span className="font-semibold text-base">
                                    {new Date(skift.dato).toLocaleDateString('no-NO')}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-green-600 font-medium">
                                  {isArbeid(skift.registrering_type) ? beregnArbeidstid(skift) : getTypeLabel(skift.registrering_type)}
                                </span>
                                {isArbeid(skift.registrering_type) && !skift.godkjent && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => startEditSkift(skift)}
                                    className="h-6 w-6 p-0"
                                  >
                                    <Edit className="h-3 w-3" />
                                  </Button>
                                )}
                                {skift.godkjent && (
                                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Godkjent
                                  </Badge>
                                )}
                              </div>
                            </div>

                            {/* Bil informasjon (kun arbeidstid) */}
                            {isArbeid(skift.registrering_type) && (
                              <div className="flex items-center gap-2 mb-2">
                                <Truck className="h-4 w-4 text-gray-500" />
                                <span className="text-sm text-gray-700">
                                  {skift.bil_registreringsnummer} - {skift.bil_merke} {skift.bil_modell}
                                </span>
                              </div>
                            )}

                            {/* Sone (kun arbeidstid) */}
                            {isArbeid(skift.registrering_type) && (
                              <div className="flex items-center gap-2 mb-2">
                                <MapPin className="h-4 w-4 text-gray-500" />
                                <span className="text-sm text-gray-700">
                                  {skift.sone}
                                </span>
                              </div>
                            )}

                            {/* Sendinger (kun arbeidstid) */}
                            {isArbeid(skift.registrering_type) && (
                              <div className="flex items-center gap-2 mb-2">
                                <Package className="h-4 w-4 text-gray-500" />
                                <span className="text-sm text-gray-700">
                                  {skift.antall_sendinger} sendinger
                                </span>
                              </div>
                            )}

                            {/* Vekt (kun arbeidstid) */}
                            {isArbeid(skift.registrering_type) && (
                              <div className="flex items-center gap-2 mb-2">
                                <Scale className="h-4 w-4 text-gray-500" />
                                <span className="text-sm text-gray-700">
                                  {skift.vekt}kg vekt
                                </span>
                              </div>
                            )}

                            {/* Pause */}
                            {skift.pause_minutter > 0 && (
                              <div className="flex items-center gap-2">
                                <Pause className="h-4 w-4 text-gray-500" />
                                <span className="text-sm text-gray-700">
                                  {skift.pause_minutter} min pause
                                </span>
                              </div>
                            )}

                            {/* Kommentarer */}
                            {skift.kommentarer && (
                              <div className="mt-3 pt-3 border-t border-gray-100">
                                <p className="text-sm text-gray-600 italic">
                                  "{skift.kommentarer}"
                                </p>
                              </div>
                            )}

                            {/* SGA-kode (kun arbeidstid) */}
                            {isArbeid(skift.registrering_type) && (skift.sga_kode || skift.sga_kode_annet) && (
                              <div className="flex items-center gap-2 mb-2">
                                <Key className="h-4 w-4 text-gray-500" />
                                <span className="text-sm text-gray-700">
                                  SGA: {skift.sga_kode || skift.sga_kode_annet}
                                  {skift.sga_skal_faktureres !== undefined && (
                                    <span className={`ml-2 px-2 py-0.5 rounded text-xs ${skift.sga_skal_faktureres ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                                    </span>
                                  )}
                                </span>
                              </div>
                            )}

                            {/* Bomtur/Venting */}
                            {skift.bomtur_venting && (
                              <div className="mt-3 pt-3 border-t border-gray-100">
                                <div className="flex items-center gap-2 mb-1">
                                  <Clock className="h-4 w-4 text-orange-500" />
                                  <span className="text-sm font-medium text-orange-700">Bomtur/Venting:</span>
                                </div>
                                <p className="text-sm text-orange-600 italic">
                                  "{skift.bomtur_venting}"
                                </p>
                              </div>
                            )}
                          </>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            ) : aktivOversikt === 'uke' ? (
              /* Uke - Statistikk */
              <div className="grid grid-cols-2 gap-2 sm:gap-4">
                <div className="text-center p-3 sm:p-4 bg-green-50 rounded-lg">
                  <Clock className="h-6 sm:h-8 w-6 sm:w-8 text-green-600 mx-auto mb-1 sm:mb-2" />
                  <div className="text-lg sm:text-2xl font-bold text-green-600">
                    {beregnUkesoverikt().normaleTimer}t {beregnUkesoverikt().normaleMinutterRest}m
                  </div>
                  <p className="text-xs sm:text-sm text-green-600">Arbeidstid</p>
                </div>

                <div className="text-center p-3 sm:p-4 bg-orange-50 rounded-lg">
                  <Clock className="h-6 sm:h-8 w-6 sm:w-8 text-orange-600 mx-auto mb-1 sm:mb-2" />
                  <div className="text-lg sm:text-2xl font-bold text-orange-600">
                    {beregnUkesoverikt().overtidTimer}t {beregnUkesoverikt().overtidMinutterRest}m
                  </div>
                  <p className="text-xs sm:text-sm text-orange-600">Overtid</p>
                </div>

                <div className="text-center p-3 sm:p-4 bg-blue-50 rounded-lg">
                  <Package className="h-6 sm:h-8 w-6 sm:w-8 text-blue-600 mx-auto mb-1 sm:mb-2" />
                  <div className="text-lg sm:text-2xl font-bold text-blue-600">
                    {beregnUkesoverikt().totalSendinger}
                  </div>
                  <p className="text-xs sm:text-sm text-blue-600">Sendinger</p>
                </div>

                <div className="text-center p-3 sm:p-4 bg-purple-50 rounded-lg">
                  <Scale className="h-6 sm:h-8 w-6 sm:w-8 text-purple-600 mx-auto mb-1 sm:mb-2" />
                  <div className="text-lg sm:text-2xl font-bold text-purple-600">
                    {beregnUkesoverikt().totalVekt}kg
                  </div>
                  <p className="text-xs sm:text-sm text-purple-600">Vekt</p>
                </div>
              </div>
            ) : aktivOversikt === 'måned' ? (
              /* Måned - Statistikk */
              <div className="grid grid-cols-2 gap-2 sm:gap-4">
                <div className="text-center p-3 sm:p-4 bg-green-50 rounded-lg">
                  <Clock className="h-6 sm:h-8 w-6 sm:w-8 text-green-600 mx-auto mb-1 sm:mb-2" />
                  <div className="text-lg sm:text-2xl font-bold text-green-600">
                    {beregnMånedsoverikt().normaleTimer}t {beregnMånedsoverikt().normaleMinutterRest}m
                  </div>
                  <p className="text-xs sm:text-sm text-green-600">Arbeidstid</p>
                </div>
                
                <div className="text-center p-3 sm:p-4 bg-orange-50 rounded-lg">
                  <Clock className="h-6 sm:h-8 w-6 sm:w-8 text-orange-600 mx-auto mb-1 sm:mb-2" />
                  <div className="text-lg sm:text-2xl font-bold text-orange-600">
                    {beregnMånedsoverikt().overtidTimer}t {beregnMånedsoverikt().overtidMinutterRest}m
                  </div>
                  <p className="text-xs sm:text-sm text-orange-600">Overtid</p>
                </div>
                
                <div className="text-center p-3 sm:p-4 bg-blue-50 rounded-lg">
                  <Package className="h-6 sm:h-8 w-6 sm:w-8 text-blue-600 mx-auto mb-1 sm:mb-2" />
                  <div className="text-lg sm:text-2xl font-bold text-blue-600">
                    {beregnMånedsoverikt().totalSendinger}
                  </div>
                  <p className="text-xs sm:text-sm text-blue-600">Sendinger</p>
                </div>
                
                <div className="text-center p-3 sm:p-4 bg-purple-50 rounded-lg">
                  <Scale className="h-6 sm:h-8 w-6 sm:w-8 text-purple-600 mx-auto mb-1 sm:mb-2" />
                  <div className="text-lg sm:text-2xl font-bold text-purple-600">
                    {beregnMånedsoverikt().totalVekt}kg
                  </div>
                  <p className="text-xs sm:text-sm text-purple-600">Vekt</p>
                </div>
              </div>
            ) : (
              /* År - Statistikk */
              <div className="grid grid-cols-2 gap-2 sm:gap-4">
                <div className="text-center p-3 sm:p-4 bg-green-50 rounded-lg">
                  <Clock className="h-6 sm:h-8 w-6 sm:w-8 text-green-600 mx-auto mb-1 sm:mb-2" />
                  <div className="text-lg sm:text-2xl font-bold text-green-600">
                    {beregnÅrsstatistikk().normaleTimer}t {beregnÅrsstatistikk().normaleMinutterRest}m
                  </div>
                  <p className="text-xs sm:text-sm text-green-600">Arbeidstid</p>
                </div>
                
                <div className="text-center p-3 sm:p-4 bg-orange-50 rounded-lg">
                  <Clock className="h-6 sm:h-8 w-6 sm:w-8 text-orange-600 mx-auto mb-1 sm:mb-2" />
                  <div className="text-lg sm:text-2xl font-bold text-orange-600">
                    {beregnÅrsstatistikk().overtidTimer}t {beregnÅrsstatistikk().overtidMinutterRest}m
                  </div>
                  <p className="text-xs sm:text-sm text-orange-600">Overtid</p>
                </div>
                
                <div className="text-center p-3 sm:p-4 bg-blue-50 rounded-lg">
                  <Package className="h-6 sm:h-8 w-6 sm:w-8 text-blue-600 mx-auto mb-1 sm:mb-2" />
                  <div className="text-lg sm:text-2xl font-bold text-blue-600">
                    {beregnÅrsstatistikk().totalSendinger}
                  </div>
                  <p className="text-xs sm:text-sm text-blue-600">Sendinger</p>
                </div>
                
                <div className="text-center p-3 sm:p-4 bg-purple-50 rounded-lg">
                  <Scale className="h-6 sm:h-8 w-6 sm:w-8 text-purple-600 mx-auto mb-1 sm:mb-2" />
                  <div className="text-lg sm:text-2xl font-bold text-purple-600">
                    {beregnÅrsstatistikk().totalVekt}kg
                  </div>
                  <p className="text-xs sm:text-sm text-purple-600">Vekt</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Vær og Trafikk */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Vær */}
          <Card>
            <CardHeader className="p-3 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                    <Cloud className="h-5 w-5 text-blue-500" />
                    Værmelding
                  </CardTitle>
                  <CardDescription className="text-sm">
                    Dagens vær for Stavanger
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => loadWeatherData()}
                  disabled={loadingWeather}
                  className="h-8 w-8 p-0"
                  title="Oppdater værdata"
                >
                  <svg
                    className={`h-4 w-4 ${loadingWeather ? 'animate-spin' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-3 sm:p-6 pt-0">
              {loadingWeather ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
              ) : weatherData ? (
                <div className="space-y-6">
                  {/* Nåværende vær - stort kort */}
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-xl p-4 border border-blue-200">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="text-4xl">
                          {getWeatherIcon(weatherData.condition, 'large')}
                        </div>
                        <div>
                          <div className="text-3xl font-bold text-gray-900">{weatherData.temperature}°</div>
                          <div className="text-sm text-gray-600">{weatherData.description}</div>
                          <div className="text-xs text-gray-500">{weatherData.location}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-gray-500">Oppdatert</div>
                        <div className="text-xs font-medium text-gray-700">
                          {new Date().toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                    
                    {/* Detaljerte målinger */}
                    <div className="grid grid-cols-3 gap-3 pt-3 border-t border-blue-200">
                      <div className="text-center">
                        <div className="flex items-center justify-center mb-1">
                          <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="text-sm font-bold text-blue-600">{weatherData.windSpeed} m/s</div>
                        <div className="text-xs text-gray-500">Vind</div>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center justify-center mb-1">
                          <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="text-sm font-bold text-green-600">{weatherData.humidity}%</div>
                        <div className="text-xs text-gray-500">Luftfuktighet</div>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center justify-center mb-1">
                          <svg className="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="text-sm font-bold text-blue-500">{weatherData.precipitation} mm</div>
                        <div className="text-xs text-gray-500">Nedbør</div>
                      </div>
                    </div>
                  </div>

                  {/* Daglig prognose - forbedret design */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <svg className="w-4 h-4 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                      </svg>
                      <div className="text-sm font-semibold text-gray-700">Prognose utover dagen</div>
                    </div>
                    <div className="grid grid-cols-5 gap-2">
                      {weatherData.forecast.map((hour, index) => (
                        <div key={index} className="text-center p-3 bg-white rounded-lg border border-gray-200 hover:border-blue-300 transition-colors shadow-sm">
                          <div className="text-xs font-semibold text-gray-600 mb-1">{hour.time}</div>
                          <div className="my-2 flex justify-center">
                            <div className="text-2xl">
                              {getWeatherIcon(hour.condition, 'medium')}
                            </div>
                          </div>
                          <div className="text-lg font-bold text-gray-900 mb-1">{hour.temperature}°</div>
                          <div className="text-xs text-gray-500 mb-1">{hour.windSpeed} m/s</div>
                          {hour.precipitation > 0 && (
                            <div className="text-xs text-blue-500 font-medium">{hour.precipitation}mm</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* 7-dagers prognose - forbedret design */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <svg className="w-4 h-4 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                      </svg>
                      <div className="text-sm font-semibold text-gray-700">7-dagers prognose</div>
                    </div>
                    <div className="grid grid-cols-7 gap-1">
                      {weatherData.dailyForecast.map((day, index) => (
                        <div key={index} className="text-center p-2 bg-white rounded-lg border border-gray-200 hover:border-blue-300 transition-colors shadow-sm">
                          <div className="text-xs font-semibold text-gray-600 mb-1">{day.time}</div>
                          <div className="my-2 flex justify-center">
                            <div className="text-xl">
                              {getWeatherIcon(day.condition, 'small')}
                            </div>
                          </div>
                          <div className="text-sm font-bold text-gray-900 mb-1">{day.temperature}°</div>
                          <div className="text-xs text-gray-500 mb-1">{day.windSpeed} m/s</div>
                          {day.precipitation > 0 && (
                            <div className="text-xs text-blue-500 font-medium">{day.precipitation}mm</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Cloud className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p className="mb-2">Kunne ikke laste værdata</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => loadWeatherData()}
                    disabled={loadingWeather}
                    className="mt-2"
                  >
                    {loadingWeather ? 'Laster...' : 'Prøv igjen'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Trafikk */}
          <Card>
            <CardHeader className="p-3 sm:p-6">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <Navigation className="h-5 w-5 text-orange-500" />
                Trafikk og Veiarbeid
              </CardTitle>
              <CardDescription className="text-sm">
                Viktige trafikkmeldinger for Rogaland
              </CardDescription>
            </CardHeader>
            <CardContent className="p-3 sm:p-6 pt-0">
              <div className="space-y-4">
                {/* Veiarbeid */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="h-4 w-4 text-orange-500" />
                    <span className="text-sm font-medium text-orange-700">Veiarbeid</span>
                    {trafficAlerts.roadwork.length > 0 && (
                      <span className="text-xs text-gray-400">({trafficAlerts.roadwork.length})</span>
                    )}
                  </div>
                  {trafficAlerts.roadwork.length > 0 ? (
                    <div className="space-y-1">
                      {(expandedTraffic.roadwork ? trafficAlerts.roadwork : trafficAlerts.roadwork.slice(0, 3)).map((alert, index) => (
                        <div key={index} className="text-xs text-gray-600 bg-orange-50 p-2 rounded">
                          {alert}
                        </div>
                      ))}
                      {trafficAlerts.roadwork.length > 3 && (
                        <button
                          onClick={() => setExpandedTraffic(prev => ({ ...prev, roadwork: !prev.roadwork }))}
                          className="flex items-center gap-1 text-xs text-orange-600 hover:text-orange-800 mt-1"
                        >
                          {expandedTraffic.roadwork ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                          {expandedTraffic.roadwork ? 'Vis færre' : `Vis alle ${trafficAlerts.roadwork.length}`}
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="text-xs text-gray-400 italic">Ingen rapportert</div>
                  )}
                </div>

                {/* Trafikkulykker */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                    <span className="text-sm font-medium text-red-700">Trafikkulykker</span>
                    {trafficAlerts.incidents.length > 0 && (
                      <span className="text-xs text-gray-400">({trafficAlerts.incidents.length})</span>
                    )}
                  </div>
                  {trafficAlerts.incidents.length > 0 ? (
                    <div className="space-y-1">
                      {(expandedTraffic.incidents ? trafficAlerts.incidents : trafficAlerts.incidents.slice(0, 3)).map((alert, index) => (
                        <div key={index} className="text-xs text-gray-600 bg-red-50 p-2 rounded">
                          {alert}
                        </div>
                      ))}
                      {trafficAlerts.incidents.length > 3 && (
                        <button
                          onClick={() => setExpandedTraffic(prev => ({ ...prev, incidents: !prev.incidents }))}
                          className="flex items-center gap-1 text-xs text-red-600 hover:text-red-800 mt-1"
                        >
                          {expandedTraffic.incidents ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                          {expandedTraffic.incidents ? 'Vis færre' : `Vis alle ${trafficAlerts.incidents.length}`}
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="text-xs text-gray-400 italic">Ingen rapportert</div>
                  )}
                </div>

                {/* Forsinkelser */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-4 w-4 text-yellow-500" />
                    <span className="text-sm font-medium text-yellow-700">Forsinkelser</span>
                    {trafficAlerts.delays.length > 0 && (
                      <span className="text-xs text-gray-400">({trafficAlerts.delays.length})</span>
                    )}
                  </div>
                  {trafficAlerts.delays.length > 0 ? (
                    <div className="space-y-1">
                      {(expandedTraffic.delays ? trafficAlerts.delays : trafficAlerts.delays.slice(0, 3)).map((alert, index) => (
                        <div key={index} className="text-xs text-gray-600 bg-yellow-50 p-2 rounded">
                          {alert}
                        </div>
                      ))}
                      {trafficAlerts.delays.length > 3 && (
                        <button
                          onClick={() => setExpandedTraffic(prev => ({ ...prev, delays: !prev.delays }))}
                          className="flex items-center gap-1 text-xs text-yellow-600 hover:text-yellow-800 mt-1"
                        >
                          {expandedTraffic.delays ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                          {expandedTraffic.delays ? 'Vis færre' : `Vis alle ${trafficAlerts.delays.length}`}
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="text-xs text-gray-400 italic">Ingen rapportert</div>
                  )}
                </div>

                {trafficAlerts.roadwork.length === 0 && trafficAlerts.incidents.length === 0 && trafficAlerts.delays.length === 0 && (
                  <div className="text-center py-4 text-gray-500">
                    Ingen trafikkmeldinger
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  )
}
