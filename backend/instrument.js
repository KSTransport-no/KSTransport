/**
 * Sentry instrumentation - must be imported at the top of server.js
 * This file initializes Sentry before any other code runs
 */

const Sentry = require('@sentry/node');
const { nodeProfilingIntegration } = require('@sentry/profiling-node');

const DSN = process.env.SENTRY_DSN_BACKEND || 'https://ca7b1eea10a0cddc8fe47df05000e51f@o4510398624890880.ingest.de.sentry.io/4510398654251088';

Sentry.init({
  dsn: DSN,
  environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development',
  release: process.env.SENTRY_RELEASE || undefined,

  attachStacktrace: true,
  sendDefaultPii: true,

  // Tracing
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 0.5,

  // Profiling
  profileSessionSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 0.5,
  profileLifecycle: 'trace',

  // Logs
  enableLogs: true,

  // Filter out sensitive headers
  beforeSend(event) {
    if (event.request?.headers) {
      delete event.request.headers.authorization;
      delete event.request.headers.cookie;
    }
    return event;
  },

  tracesSampler(samplingContext) {
    const url = samplingContext.request?.url || '';
    if (url.includes('/health')) {
      return 0;
    }
    return process.env.NODE_ENV === 'production' ? 0.1 : 0.5;
  },

  integrations: [
    Sentry.expressIntegration(),
    nodeProfilingIntegration(),
    Sentry.consoleLoggingIntegration({ levels: ['log', 'warn', 'error'] }),
  ],
});

console.info('[INFO] Sentry initialized for backend');

module.exports = Sentry;

