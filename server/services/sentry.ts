/**
 * Sentry Error Tracking Integration
 * 
 * Configures Sentry for error tracking and performance monitoring
 */

import * as Sentry from '@sentry/node';
import { Express } from 'express';

/**
 * Initialize Sentry for server-side error tracking
 */
export function initSentry(app: Express) {
    const dsn = process.env.SENTRY_DSN;

    if (!dsn || process.env.NODE_ENV === 'test') {
        console.log('[Sentry] Skipping initialization (no DSN or test environment)');
        return;
    }

    Sentry.init({
        dsn,
        environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development',
        tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

        // Integrations
        integrations: [
            // HTTP integration for request tracking
            new Sentry.Integrations.Http({ tracing: true }),
            // Express integration
            new Sentry.Integrations.Express({ app }),
        ],

        // Filter sensitive data
        beforeSend(event, hint) {
            // Remove sensitive headers
            if (event.request?.headers) {
                delete event.request.headers.authorization;
                delete event.request.headers.cookie;
            }

            // Remove sensitive query params
            if (event.request?.query_string) {
                event.request.query_string = event.request.query_string
                    .replace(/token=[^&]+/g, 'token=[REDACTED]')
                    .replace(/password=[^&]+/g, 'password=[REDACTED]');
            }

            return event;
        },
    });

    // Request handler must be the first middleware
    app.use(Sentry.Handlers.requestHandler());

    // TracingHandler creates a trace for every incoming request
    app.use(Sentry.Handlers.tracingHandler());

    console.log('[Sentry] Initialized successfully');
}

/**
 * Add Sentry error handler (must be added after routes)
 */
export function addSentryErrorHandler(app: Express) {
    const dsn = process.env.SENTRY_DSN;

    if (!dsn || process.env.NODE_ENV === 'test') {
        return;
    }

    // Error handler must be before any other error middleware
    app.use(Sentry.Handlers.errorHandler());
}

/**
 * Capture exception with context
 */
export function captureException(error: Error, context?: Record<string, any>) {
    Sentry.captureException(error, {
        extra: context,
    });
}

/**
 * Capture message with severity
 */
export function captureMessage(message: string, level: Sentry.SeverityLevel = 'info') {
    Sentry.captureMessage(message, level);
}

/**
 * Set user context for error tracking
 */
export function setUserContext(user: { id: string; email?: string; tenantId?: string }) {
    Sentry.setUser({
        id: user.id,
        email: user.email,
        tenantId: user.tenantId,
    });
}

/**
 * Clear user context
 */
export function clearUserContext() {
    Sentry.setUser(null);
}

export default Sentry;
