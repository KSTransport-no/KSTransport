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

    // Performance and profiles
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    attachStacktrace: true,

    // Send default PII where allowed by policy
    sendDefaultPii: true,

    // Filter out dev/PII data
    beforeSend(event, hint) {
      if (process.env.NODE_ENV === 'development' && !process.env.SENTRY_ENABLE_DEV) {
        return null;
      }

      if (event.request?.headers) {
        delete event.request.headers.authorization;
        delete event.request.headers.cookie;
      }

      return event;
    },

    tracesSampler(samplingContext) {
      if (process.env.NODE_ENV !== 'production') {
        return 1.0;
      }
      // You can have custom sampling rules here
      const url = samplingContext.request?.url || '';
      if (url.includes('/health')) {
        return 0;
      }
      return 0.1;
    },

    integrations: [
      ...(Sentry.expressIntegration ? [Sentry.expressIntegration()] : []),
    ],
  });

  console.log('Sentry initialized for backend (v10)');
} else {
  console.log('Sentry DSN not provided, skipping initialization');
}

module.exports = Sentry;

