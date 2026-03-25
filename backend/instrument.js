/**
 * Sentry instrumentation - must be imported at the top of server.js
 * This file initializes Sentry before any other code runs
 */

const Sentry = require('@sentry/node');

// Initialize Sentry if DSN is provided
if (process.env.SENTRY_DSN_BACKEND) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN_BACKEND,
    environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development',
    release: process.env.SENTRY_RELEASE || undefined,
    
    // Performance monitoring
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0, // 10% in prod, 100% in dev
    
    // Send structured logs to Sentry
    enableLogs: true,
    
    // Setting this option to true will send default PII data to Sentry
    // For example, automatic IP address collection on events
    sendDefaultPii: true,
    
    // Filter out sensitive data
    beforeSend(event, hint) {
      // Don't send events in development unless explicitly enabled
      if (process.env.NODE_ENV === 'development' && !process.env.SENTRY_ENABLE_DEV) {
        return null;
      }
      
      // Remove sensitive headers
      if (event.request && event.request.headers) {
        delete event.request.headers.authorization;
        delete event.request.headers.cookie;
      }
      
      return event;
    },
    
    // Integrations
    integrations: [
      new Sentry.Integrations.Http({ tracing: true }),
      new Sentry.Integrations.Express({ app: undefined }), // Will be set in server.js
    ],
  });
  
  console.log('Sentry initialized for backend');
} else {
  console.log('Sentry DSN not provided, skipping initialization');
}

module.exports = Sentry;

