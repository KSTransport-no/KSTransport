const express = require('express')
const logger = require('../utils/logger')
const { handleError } = require('../utils/errorHandler')
const router = express.Router()

// DATEX II API endpoints fra Statens vegvesen
const DATEX_BASE_URL = 'https://datex-server-get-v3-1.atlas.vegvesen.no/datexapi'

// Proxy for DATEX II trafikkmeldinger (for å unngå CORS-problemer)
router.get('/', async (req, res) => {
  try {
    logger.log('Henter trafikkinformasjon fra DATEX II...')
    
    // Hent trafikkmeldinger fra DATEX II
    const trafikkmeldinger = await hentTrafikkmeldinger()
    const reisetider = await hentReisetider()

    res.json({
      roadwork: trafikkmeldinger.filter(m => m.type === 'roadworks'),
      incidents: trafikkmeldinger.filter(m => m.type === 'accident' || m.type === 'incident'),
      delays: reisetider,
      message: 'Trafikkinformasjon fra Statens vegvesen DATEX II'
    })

  } catch (error) {
    // For trafikk-endpoint, returner tomme arrays i stedet for feil
    logger.error('Feil ved henting av DATEX II trafikkinformasjon:', error)
    res.json({ 
      roadwork: [],
      incidents: [],
      delays: [],
      message: 'Kunne ikke hente trafikkinformasjon'
    })
  }
})

// Hent trafikkmeldinger fra DATEX II
async function hentTrafikkmeldinger() {
  try {
    const response = await fetch(`${DATEX_BASE_URL}/GetSituation/pullsnapshotdata`, {
      headers: {
        'Accept': 'application/xml',
        'User-Agent': 'KSTransport/1.0'
      }
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const xmlData = await response.text()
    return parseTrafikkmeldinger(xmlData)

  } catch (error) {
    logger.error('Feil ved henting av trafikkmeldinger:', error)
    return []
  }
}

// Hent reisetider fra DATEX II
async function hentReisetider() {
  try {
    const response = await fetch(`${DATEX_BASE_URL}/GetTravelTimeData/pullsnapshotdata`, {
      headers: {
        'Accept': 'application/xml',
        'User-Agent': 'KSTransport/1.0'
      }
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const xmlData = await response.text()
    return parseReisetider(xmlData)

  } catch (error) {
    logger.error('Feil ved henting av reisetider:', error)
    return []
  }
}

// Parse XML trafikkmeldinger (forenklet versjon)
function parseTrafikkmeldinger(xmlData) {
  try {
    // Forenklet XML parsing - i produksjon bør man bruke en XML parser
    const meldinger = []
    
    // Søk etter situasjoner i XML-en
    const situationMatches = xmlData.match(/<situation[^>]*>[\s\S]*?<\/situation>/gi)
    
    if (situationMatches) {
      situationMatches.forEach(match => {
        // Hent ut informasjon fra XML-en
        const idMatch = match.match(/<situationRecord[^>]*id="([^"]*)"/i)
        const typeMatch = match.match(/<situationRecord[^>]*type="([^"]*)"/i)
        const descriptionMatch = match.match(/<generalPublicComment[^>]*>([^<]*)<\/generalPublicComment>/i)
        const locationMatch = match.match(/<location[^>]*>[\s\S]*?<name>([^<]*)<\/name>/i)
        
        if (idMatch && descriptionMatch) {
          meldinger.push({
            id: idMatch[1],
            type: typeMatch ? typeMatch[1] : 'ukjent',
            beskrivelse: descriptionMatch[1].trim(),
            lokasjon: locationMatch ? locationMatch[1].trim() : 'Ukjent lokasjon',
            tidspunkt: new Date().toISOString()
          })
        }
      })
    }

    return meldinger.slice(0, 10) // Begrens til 10 meldinger

  } catch (error) {
    logger.error('Feil ved parsing av trafikkmeldinger:', error)
    return []
  }
}

// Parse XML reisetider (forenklet versjon)
function parseReisetider(xmlData) {
  try {
    const reisetider = []
    
    // Søk etter travel time data i XML-en
    const travelTimeMatches = xmlData.match(/<travelTime[^>]*>[\s\S]*?<\/travelTime>/gi)
    
    if (travelTimeMatches) {
      travelTimeMatches.forEach(match => {
        // Hent ut informasjon fra XML-en
        const idMatch = match.match(/<travelTime[^>]*id="([^"]*)"/i)
        const timeMatch = match.match(/<travelTime[^>]*>([^<]*)<\/travelTime>/i)
        const locationMatch = match.match(/<location[^>]*>[\s\S]*?<name>([^<]*)<\/name>/i)
        
        if (idMatch && timeMatch) {
          const tidISekunder = parseInt(timeMatch[1])
          const tidIMinutter = Math.round(tidISekunder / 60)
          
          reisetider.push({
            id: idMatch[1],
            tid: tidIMinutter,
            lokasjon: locationMatch ? locationMatch[1].trim() : 'Ukjent lokasjon',
            tidspunkt: new Date().toISOString()
          })
        }
      })
    }

    return reisetider.slice(0, 10) // Begrens til 10 reisetider

  } catch (error) {
    logger.error('Feil ved parsing av reisetider:', error)
    return []
  }
}

module.exports = router
