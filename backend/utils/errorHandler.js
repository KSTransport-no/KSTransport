/**
 * Error handler utility for sikker feilhåndtering
 * Genererer errorId for tracking og logger feil uten å lekke informasjon
 */

const crypto = require('crypto');
const logger = require('./logger');

// Sentry is optional - only use if available
let Sentry;
try {
  Sentry = require('@sentry/node');
} catch (e) {
  // Sentry not installed, continue without it
  Sentry = null;
}

/**
 * Generer en unik error ID
 */
const generateErrorId = () => {
  return crypto.randomBytes(16).toString('hex');
};

/**
 * Håndter feil på en sikker måte
 * @param {Error} error - Feilobjektet
 * @param {Object} req - Express request objekt
 * @param {Object} res - Express response objekt
 * @param {string} context - Kontekst hvor feilen oppstod
 * @param {Object} additionalData - Ekstra data å logge
 */
const handleError = (error, req, res, context = 'Unknown', additionalData = {}) => {
  const errorId = generateErrorId();
  const userId = req.sjåfør?.id || req.user?.id || null;
  const ip = req.ip || req.connection?.remoteAddress || 'unknown';
  
  // Returner sikker feilmelding til klienten
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  // Bestem HTTP status kode basert på feiltypen (må defineres før Sentry)
  let statusCode = 500;
  let userMessage = 'En feil oppstod. Kontakt support hvis problemet vedvarer.';
  
  if (error.name === 'ValidationError' || error.name === 'CastError') {
    statusCode = 400;
    userMessage = 'Ugyldig input. Sjekk at alle felt er korrekt utfylt.';
  } else if (error.name === 'UnauthorizedError' || error.code === 'UNAUTHORIZED') {
    statusCode = 401;
    userMessage = 'Du har ikke tilgang til denne ressursen.';
  } else if (error.name === 'ForbiddenError' || error.code === 'FORBIDDEN') {
    statusCode = 403;
    userMessage = 'Du har ikke tilgang til denne operasjonen.';
  } else if (error.name === 'NotFoundError' || error.code === 'NOT_FOUND') {
    statusCode = 404;
    userMessage = 'Ressursen ble ikke funnet.';
  } else if (error.code === '23505') { // PostgreSQL unique violation
    statusCode = 409;
    userMessage = 'Denne verdien eksisterer allerede.';
  } else if (error.code === '23503') { // PostgreSQL foreign key violation
    statusCode = 400;
    userMessage = 'Ugyldig referanse til relatert data.';
  } else if (error.code === '23502') { // PostgreSQL not null violation
    statusCode = 400;
    userMessage = 'Påkrevde felt mangler.';
  } else if (error.code === '42P01') { // Table does not exist
    statusCode = 503;
    userMessage = 'Database er ikke klar. Prøv igjen om et øyeblikk.';
  } else if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
    statusCode = 503;
    userMessage = 'Database er ikke tilgjengelig. Prøv igjen om et øyeblikk.';
  }

  // Logg feilen med all relevant informasjon
  logger.error(`[${errorId}] ${context}`, {
    error: {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code
    },
    request: {
      method: req.method,
      path: req.path,
      ip: ip,
      userAgent: req.get('user-agent')
    },
    user: userId ? { id: userId } : null,
    statusCode: statusCode,
    ...additionalData
  });

  // Send to Sentry with context
  if (Sentry) {
    Sentry.withScope((scope) => {
      // Set user context
      if (userId) {
        scope.setUser({
          id: userId.toString(),
          ip_address: ip
        });
      }
      
      // Set request context
      scope.setContext('request', {
        method: req.method,
        path: req.path,
        url: req.url,
        query: req.query,
        headers: {
          'user-agent': req.get('user-agent'),
          'referer': req.get('referer')
        }
      });
      
      // Set additional context
      if (Object.keys(additionalData).length > 0) {
        scope.setContext('additional', additionalData);
      }
      
      // Set tags
      scope.setTag('errorId', errorId);
      scope.setTag('context', context);
      scope.setTag('statusCode', statusCode.toString());
      
      // Capture exception
      Sentry.captureException(error, {
        contexts: {
          request: {
            method: req.method,
            path: req.path,
            url: req.url
          },
          user: userId ? { id: userId.toString() } : null,
          ...additionalData
        }
      });
    });
  }

  const response = {
    feil: userMessage,
    errorId: errorId
  };

  // I development, legg til mer detaljer
  if (isDevelopment) {
    response.detaljer = error.message;
    response.stack = error.stack;
  }

  return res.status(statusCode).json(response);
};

/**
 * Wrapper for async route handlers som automatisk håndterer feil
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch((error) => {
      handleError(error, req, res, `${req.method} ${req.path}`);
    });
  };
};

module.exports = {
  handleError,
  generateErrorId,
  asyncHandler
};

