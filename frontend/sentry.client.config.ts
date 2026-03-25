/**
 * Sentry client-side configuration
 * This file configures Sentry for the browser/client-side code
 */

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development',
  release: process.env.NEXT_PUBLIC_SENTRY_RELEASE || undefined,

  // Performance monitoring
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0, // 10% in prod, 100% in dev

  // Session replay (optional - can be enabled for better debugging)
  replaysSessionSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  replaysOnErrorSampleRate: 1.0, // Always record replays when an error occurs

  // Send default PII (Personally Identifiable Information)
  sendDefaultPii: true,

  // Filter out sensitive data
  beforeSend(event, hint) {
    // Don't send events in development unless explicitly enabled
    if (process.env.NODE_ENV === 'development' && !process.env.NEXT_PUBLIC_SENTRY_ENABLE_DEV) {
      return null;
    }

    // Remove sensitive data from URLs
    if (event.request?.url) {
      try {
        const url = new URL(event.request.url);
        // Remove query parameters that might contain sensitive data
        url.searchParams.delete('token');
        url.searchParams.delete('password');
        event.request.url = url.toString();
      } catch (e) {
        // Invalid URL, keep as is
      }
    }

    return event;
  },

  // Integrations
  integrations: [
    new Sentry.BrowserTracing({
      // Set sampling rate for performance monitoring
      tracePropagationTargets: [
        'localhost',
        /^https:\/\/.*\.ingest\.sentry\.io/,
        process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
      ],
    }),
    new Sentry.Replay({
      maskAllText: false, // Don't mask all text (can be enabled for privacy)
      blockAllMedia: false, // Don't block all media
    }),
  ],
});

