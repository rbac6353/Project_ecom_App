/**
 * Initialize Sentry for error tracking and performance monitoring
 * 
 * Set SENTRY_DSN in environment variables to enable Sentry
 * Get your DSN from: https://sentry.io/settings/projects/
 */
export function initSentry() {
  const dsn = process.env.SENTRY_DSN;
  const environment = process.env.NODE_ENV || 'development';

  if (!dsn) {
    console.warn('⚠️  Sentry DSN not configured. Error tracking disabled.');
    return;
  }

  // Dynamic import to avoid errors if Sentry is not installed
  try {
    const Sentry = require('@sentry/node');
    const { ProfilingIntegration } = require('@sentry/profiling-node');

    Sentry.init({
      dsn,
      environment,
      integrations: [
        // Profiling integration for performance monitoring
        new ProfilingIntegration(),
      ],
    // Performance Monitoring
    tracesSampleRate: environment === 'production' ? 0.1 : 1.0, // 10% in production, 100% in dev
    // Profiling
    profilesSampleRate: environment === 'production' ? 0.1 : 1.0,
    // Release tracking
    release: process.env.APP_VERSION || '1.0.0',
    // Filter out health check endpoints
    ignoreErrors: [
      'BadRequestException',
      'UnauthorizedException',
      'NotFoundException',
    ],
      beforeSend(event, hint) {
        // Don't send events in test environment
        if (environment === 'test') {
          return null;
        }
        return event;
      },
    });

    console.log('✅ Sentry initialized for error tracking');
  } catch (error) {
    console.warn('⚠️  Sentry packages not installed. Error tracking disabled.');
    console.warn('   Install with: npm install --save-dev @sentry/node @sentry/profiling-node');
  }
}
