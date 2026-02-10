/**
 * Sentry Error Tracking - Client Side
 * 
 * Configures Sentry for React error tracking and performance monitoring
 */

import * as Sentry from '@sentry/react';

/**
 * Initialize Sentry for client-side error tracking
 */
export function initSentry() {
    const dsn = import.meta.env.VITE_SENTRY_DSN;

    if (!dsn || import.meta.env.MODE === 'test') {
        console.log('[Sentry] Skipping initialization (no DSN or test environment)');
        return;
    }

    Sentry.init({
        dsn,
        environment: import.meta.env.VITE_SENTRY_ENVIRONMENT || import.meta.env.MODE || 'development',
        tracesSampleRate: import.meta.env.MODE === 'production' ? 0.1 : 1.0,

        // Integrations
        integrations: [
            Sentry.browserTracingIntegration(),
            Sentry.replayIntegration({
                maskAllText: true,
                blockAllMedia: true,
            }),
        ],

        // Session Replay
        replaysSessionSampleRate: 0.1, // 10% of sessions
        replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors

        // Filter sensitive data
        beforeSend(event, hint) {
            // Remove sensitive data from breadcrumbs
            if (event.breadcrumbs) {
                event.breadcrumbs = event.breadcrumbs.map(breadcrumb => {
                    if (breadcrumb.data) {
                        delete breadcrumb.data.authorization;
                        delete breadcrumb.data.token;
                        delete breadcrumb.data.password;
                    }
                    return breadcrumb;
                });
            }

            return event;
        },
    });

    console.log('[Sentry] Client initialized successfully');
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

/**
 * Error Boundary component
 */
export const ErrorBoundary = Sentry.ErrorBoundary;

export default Sentry;
