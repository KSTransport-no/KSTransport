const cache = require('../utils/cache');
const logger = require('../utils/logger');

/**
 * Middleware for å cache API-responser
 * Støtter stale-while-revalidate pattern
 */
function cacheMiddleware(options = {}) {
  const {
    ttl = 60 * 60 * 1000, // 1 time default
    staleWhileRevalidate = true,
    staleTTL = 24 * 60 * 60 * 1000, // 24 timer for stale data
    keyGenerator = (req) => `${req.method}:${req.originalUrl}`,
    skipCache = (req) => false, // Funksjon for å hoppe over cache
    shouldCache = (req, res) => {
      // Cache kun GET requests med 200 status
      return req.method === 'GET' && res.statusCode === 200;
    }
  } = options;

  return async (req, res, next) => {
    // Hopp over cache hvis skipCache returnerer true
    if (skipCache(req)) {
      return next();
    }

    const cacheKey = keyGenerator(req);

    // Prøv å hent fra cache
    const cachedData = cache.get(cacheKey);

    if (cachedData) {
      // Sjekk om data er stale
      const cacheItem = cache.cache.get(cacheKey);
      const isStale = Date.now() > cacheItem.expiresAt;

      if (isStale && staleWhileRevalidate) {
        // Returner stale data, men trigger revalidation i bakgrunnen
        logger.log(`Returning stale data for ${cacheKey}, revalidating in background`);
        
        // Sett stale-while-revalidate header
        res.setHeader('Cache-Control', `public, max-age=0, stale-while-revalidate=${Math.floor(staleTTL / 1000)}`);
        res.setHeader('X-Cache', 'STALE');
        
        // Returner stale data umiddelbart
        return res.json(cachedData);
      } else {
        // Data er fresh
        res.setHeader('Cache-Control', `public, max-age=${Math.floor(ttl / 1000)}`);
        res.setHeader('X-Cache', 'HIT');
        logger.log(`Cache HIT for ${cacheKey}`);
        return res.json(cachedData);
      }
    }

    // Cache miss - lagre original json funksjon
    const originalJson = res.json.bind(res);
    
    res.json = function(data) {
      // Sjekk om vi skal cache responsen
      if (shouldCache(req, res)) {
        cache.set(cacheKey, data, ttl);
        res.setHeader('Cache-Control', `public, max-age=${Math.floor(ttl / 1000)}`);
        res.setHeader('X-Cache', 'MISS');
        logger.log(`Cache MISS for ${cacheKey}, data cached`);
      }
      
      return originalJson(data);
    };

    next();
  };
}

/**
 * Middleware for å invalidere cache når data endres
 */
function invalidateCache(keys) {
  return (req, res, next) => {
    // Lagre original send funksjon
    const originalSend = res.send.bind(res);
    const originalJson = res.json.bind(res);

    const invalidate = () => {
      const keysToInvalidate = typeof keys === 'function' ? keys(req) : keys;
      
      if (Array.isArray(keysToInvalidate)) {
        keysToInvalidate.forEach(key => {
          cache.delete(key);
          logger.log(`Cache invalidated for key: ${key}`);
        });
      } else if (typeof keysToInvalidate === 'string') {
        cache.delete(keysToInvalidate);
        logger.log(`Cache invalidated for key: ${keysToInvalidate}`);
      }
    };

    // Invalider cache ved vellykket POST/PUT/DELETE
    res.send = function(data) {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        invalidate();
      }
      return originalSend(data);
    };

    res.json = function(data) {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        invalidate();
      }
      return originalJson(data);
    };

    next();
  };
}

module.exports = {
  cacheMiddleware,
  invalidateCache
};

