const logger = require('./logger');

/**
 * In-memory cache for statiske data
 * Bruker Map for å lagre data med TTL (Time To Live)
 */
class Cache {
  constructor() {
    this.cache = new Map();
    this.defaultTTL = 60 * 60 * 1000; // 1 time i millisekunder
  }

  /**
   * Hent data fra cache
   * @param {string} key - Cache nøkkel
   * @returns {any|null} - Cached data eller null hvis ikke funnet/utløpt
   */
  get(key) {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }

    // Sjekk om data er utløpt
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      logger.log(`Cache expired for key: ${key}`);
      return null;
    }

    logger.log(`Cache hit for key: ${key}`);
    return item.data;
  }

  /**
   * Lagre data i cache
   * @param {string} key - Cache nøkkel
   * @param {any} data - Data å lagre
   * @param {number} ttl - Time to live i millisekunder (optional)
   */
  set(key, data, ttl = null) {
    const expiresAt = Date.now() + (ttl || this.defaultTTL);
    
    this.cache.set(key, {
      data,
      expiresAt,
      cachedAt: Date.now()
    });

    logger.log(`Cache set for key: ${key}, expires at: ${new Date(expiresAt).toISOString()}`);
  }

  /**
   * Slett data fra cache
   * @param {string} key - Cache nøkkel
   */
  delete(key) {
    this.cache.delete(key);
    logger.log(`Cache deleted for key: ${key}`);
  }

  /**
   * Slett alle data fra cache
   */
  clear() {
    this.cache.clear();
    logger.log('Cache cleared');
  }

  /**
   * Slett utløpte entries
   */
  cleanup() {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiresAt) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.log(`Cache cleanup: removed ${cleaned} expired entries`);
    }
  }

  /**
   * Hent cache statistikk
   */
  getStats() {
    const now = Date.now();
    let expired = 0;
    let active = 0;

    for (const item of this.cache.values()) {
      if (now > item.expiresAt) {
        expired++;
      } else {
        active++;
      }
    }

    return {
      total: this.cache.size,
      active,
      expired
    };
  }
}

// Singleton instance
const cache = new Cache();

// Kjør cleanup hvert 5. minutt
setInterval(() => {
  cache.cleanup();
}, 5 * 60 * 1000);

module.exports = cache;

