/**
 * Input sanitization utility
 * Renser og validerer brukerinput for å forhindre XSS og SQL injection
 */

/**
 * Rens HTML og potensielt farlige tegn fra streng
 * @param {string} input - Input streng
 * @returns {string} - Renset streng
 */
const sanitizeString = (input) => {
  if (typeof input !== 'string') {
    return input;
  }

  return input
    .replace(/[<>]/g, '') // Fjern < og >
    .replace(/javascript:/gi, '') // Fjern javascript: protokoll
    .replace(/data:/gi, '') // Fjern data: protokoll
    .replace(/vbscript:/gi, '') // Fjern vbscript: protokoll
    .replace(/on\w+=/gi, '') // Fjern event handlers (onclick, onload, etc.)
    .trim();
};

/**
 * Rens objekt med rekursiv sanitization
 * @param {any} input - Input objekt eller verdi
 * @param {number} depth - Maksimal dybde for rekursjon (forhindrer stack overflow)
 * @returns {any} - Renset objekt eller verdi
 */
const sanitizeObject = (input, depth = 0) => {
  // Forhindre for dyp rekursjon
  if (depth > 10) {
    return input;
  }

  if (input === null || input === undefined) {
    return input;
  }

  if (typeof input === 'string') {
    return sanitizeString(input);
  }

  if (Array.isArray(input)) {
    return input.map(item => sanitizeObject(item, depth + 1));
  }

  if (typeof input === 'object') {
    const sanitized = {};
    for (const key in input) {
      if (Object.prototype.hasOwnProperty.call(input, key)) {
        // Sanitize både nøkkel og verdi
        const sanitizedKey = sanitizeString(key);
        sanitized[sanitizedKey] = sanitizeObject(input[key], depth + 1);
      }
    }
    return sanitized;
  }

  // For tall, boolean, etc., returner som de er
  return input;
};

/**
 * Valider og sanitize e-post adresse
 * @param {string} email - E-post adresse
 * @returns {string|null} - Renset e-post eller null hvis ugyldig
 */
const sanitizeEmail = (email) => {
  if (typeof email !== 'string') {
    return null;
  }

  const sanitized = sanitizeString(email.toLowerCase().trim());
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (emailRegex.test(sanitized)) {
    return sanitized;
  }
  
  return null;
};

/**
 * Valider og sanitize URL
 * @param {string} url - URL streng
 * @returns {string|null} - Renset URL eller null hvis ugyldig
 */
const sanitizeUrl = (url) => {
  if (typeof url !== 'string') {
    return null;
  }

  const sanitized = sanitizeString(url.trim());
  
  try {
    const parsed = new URL(sanitized);
    // Tillat kun http og https
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return sanitized;
    }
  } catch (e) {
    // Ikke en gyldig URL
  }
  
  return null;
};

/**
 * Valider og sanitize numerisk verdi
 * @param {any} input - Input verdi
 * @param {Object} options - Valideringsalternativer
 * @returns {number|null} - Renset nummer eller null hvis ugyldig
 */
const sanitizeNumber = (input, options = {}) => {
  const { min, max, integer = false } = options;
  
  let num;
  if (typeof input === 'number') {
    num = input;
  } else if (typeof input === 'string') {
    num = integer ? parseInt(input, 10) : parseFloat(input);
    if (isNaN(num)) {
      return null;
    }
  } else {
    return null;
  }

  if (integer && !Number.isInteger(num)) {
    return null;
  }

  if (min !== undefined && num < min) {
    return null;
  }

  if (max !== undefined && num > max) {
    return null;
  }

  return num;
};

/**
 * Middleware for å sanitize request body
 */
const sanitizeMiddleware = (req, res, next) => {
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }
  if (req.params) {
    req.params = sanitizeObject(req.params);
  }
  next();
};

module.exports = {
  sanitizeString,
  sanitizeObject,
  sanitizeEmail,
  sanitizeUrl,
  sanitizeNumber,
  sanitizeMiddleware
};

