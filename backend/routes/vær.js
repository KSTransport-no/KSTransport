const express = require('express')
const logger = require('../utils/logger')
const { handleError } = require('../utils/errorHandler')
const router = express.Router()

// Proxy for Yr.no værdata (for å unngå CORS-problemer)
router.get('/', async (req, res) => {
  try {
    const { lat = '58.9700', lon = '5.7331' } = req.query
    
    logger.debug('Fetching weather data from Yr.no', { lat, lon });
    
    // Hent værdata fra Yr.no API
    const response = await fetch(`https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${lat}&lon=${lon}`, {
      headers: {
        'User-Agent': 'KSTransport/1.0 (kontakt@kstransport.no)',
        'Accept': 'application/json'
      }
    })
    
    if (!response.ok) {
      logger.error(`Yr.no API error: ${response.status} ${response.statusText}`)
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const data = await response.json()
    
    // Valider at data har riktig struktur
    if (!data.properties || !data.properties.timeseries || data.properties.timeseries.length === 0) {
      logger.error('Invalid weather data structure from Yr.no')
      throw new Error('Invalid weather data structure')
    }
    
    logger.debug('Weather data fetched from Yr.no');
    
    // Returner data direkte til klienten
    res.json(data)
    
  } catch (error) {
    logger.error('Feil ved henting av værdata fra Yr.no:', error)
    handleError(error, req, res, 'Vær: Get weather data endpoint')
  }
})

module.exports = router

