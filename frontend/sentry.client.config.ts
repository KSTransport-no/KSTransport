import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment:
    process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ||
    process.env.NODE_ENV ||
    'development',
  release: process.env.NEXT_PUBLIC_SENTRY_RELEASE || undefined,

  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  replaysSessionSampleRate:
    process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  replaysOnErrorSampleRate: 1.0,

  sendDefaultPii: true,

  beforeSend(event) {
    if (
      process.env.NODE_ENV === 'development' &&
      !process.env.NEXT_PUBLIC_SENTRY_ENABLE_DEV
    ) {
      return null;
    }

    if (event.request?.url) {
      try {
        const url = new URL(event.request.url);
        url.searchParams.delete('token');
        url.searchParams.delete('password');
        event.request.url = url.toString();
      } catch {
        // ignore malformed URL
      }
    }

    return event;
  },

  integrations: [
    Sentry.browserTracingIntegration({
      tracePropagationTargets: [
        'localhost',
        /^https:\/\/.*\.ingest\.sentry\.io/,
        process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
      ],
    }),
    Sentry.replayIntegration({
      maskAllText: false,
      blockAllMedia: false,
    }),
    Sentry.feedbackIntegration({
      colorScheme: 'system',
    }),
  ],
});
