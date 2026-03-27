import * as Sentry from '@sentry/nextjs';

const DSN =
  process.env.NEXT_PUBLIC_SENTRY_DSN ||
  'https://2a226ee2932a65e694d39d0c7aaed6ca@o4510398624890880.ingest.de.sentry.io/4510398671749200';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { nodeProfilingIntegration } = await import(
      '@sentry/profiling-node'
    );

    Sentry.init({
      dsn: DSN,
      environment:
        process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ||
        process.env.NODE_ENV ||
        'development',
      release: process.env.NEXT_PUBLIC_SENTRY_RELEASE || undefined,

      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 0.5,

      // Profiling
      profileSessionSampleRate:
        process.env.NODE_ENV === 'production' ? 0.1 : 0.5,
      profileLifecycle: 'trace',

      sendDefaultPii: true,

      // Logs
      enableLogs: true,

      integrations: [
        nodeProfilingIntegration(),
        Sentry.consoleLoggingIntegration({
          levels: ['log', 'warn', 'error'],
        }),
      ],

      beforeSend(event) {
        if (event.request?.headers) {
          delete event.request.headers.authorization;
          delete event.request.headers.cookie;
        }

        return event;
      },
    });
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    Sentry.init({
      dsn: DSN,
      environment:
        process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ||
        process.env.NODE_ENV ||
        'development',
      release: process.env.NEXT_PUBLIC_SENTRY_RELEASE || undefined,

      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 0.5,

      sendDefaultPii: true,

      enableLogs: true,
    });
  }
}
