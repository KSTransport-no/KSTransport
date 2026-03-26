import * as Sentry from '@sentry/nextjs';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      environment:
        process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ||
        process.env.NODE_ENV ||
        'development',
      release: process.env.NEXT_PUBLIC_SENTRY_RELEASE || undefined,

      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

      sendDefaultPii: true,

      beforeSend(event) {
        if (
          process.env.NODE_ENV === 'development' &&
          !process.env.NEXT_PUBLIC_SENTRY_ENABLE_DEV
        ) {
          return null;
        }

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
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      environment:
        process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ||
        process.env.NODE_ENV ||
        'development',
      release: process.env.NEXT_PUBLIC_SENTRY_RELEASE || undefined,

      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

      sendDefaultPii: true,

      beforeSend(event) {
        if (
          process.env.NODE_ENV === 'development' &&
          !process.env.NEXT_PUBLIC_SENTRY_ENABLE_DEV
        ) {
          return null;
        }

        return event;
      },
    });
  }
}
