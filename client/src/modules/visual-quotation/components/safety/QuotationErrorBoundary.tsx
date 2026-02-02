import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { logger } from "../../services/logger";

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
    onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

/**
 * Error Boundary for Visual Quotation Module
 * 
 * Catches React errors in quotation components and displays a
 * graceful fallback UI instead of crashing the entire application.
 * 
 * Features:
 * - Logs errors for debugging
 * - Allows user to retry/reload
 * - Preserves app stability
 * - Customizable fallback UI
 */
export class QuotationErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
        };
    }

    static getDerivedStateFromError(error: Error): Partial<State> {
        // Update state so next render shows fallback UI
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        // Log error details for debugging
        logger.error('QuotationErrorBoundary caught error', {
            error: String(error),
            componentStack: errorInfo.componentStack,
            context: 'quotation-error-boundary'
        });

        // Store error info in state
        this.setState({ errorInfo });

        // Call optional error handler
        this.props.onError?.(error, errorInfo);

        // TODO: Send to monitoring service (e.g., Sentry, LogRocket)
        // this.logToMonitoringService(error, errorInfo);
    }

    handleReset = () => {
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null,
        });
    };

    handleReload = () => {
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            // Use custom fallback if provided
            if (this.props.fallback) {
                return this.props.fallback;
            }

            // Default error UI
            return (
                <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                    <div className="max-w-md w-full bg-white rounded-lg shadow-lg border border-red-200 p-6">
                        {/* Error Icon */}
                        <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mb-4">
                            <AlertTriangle className="w-6 h-6 text-red-600" />
                        </div>

                        {/* Error Message */}
                        <h2 className="text-lg font-semibold text-slate-900 mb-2">
                            Something went wrong
                        </h2>

                        <p className="text-sm text-slate-600 mb-4">
                            The quotation module encountered an unexpected error and couldn't continue.
                        </p>

                        {/* Error Details (Development Only) */}
                        {process.env.NODE_ENV === 'development' && this.state.error && (
                            <details className="mb-4">
                                <summary className="text-xs font-medium text-slate-700 cursor-pointer mb-2">
                                    Error Details (Dev Only)
                                </summary>
                                <div className="bg-slate-100 rounded p-3 text-xs font-mono text-slate-800 overflow-auto max-h-40">
                                    <div className="font-semibold text-red-600 mb-1">
                                        {this.state.error.name}: {this.state.error.message}
                                    </div>
                                    <pre className="whitespace-pre-wrap">
                                        {this.state.error.stack}
                                    </pre>
                                </div>
                            </details>
                        )}

                        {/* Action Buttons */}
                        <div className="flex gap-2">
                            <Button
                                onClick={this.handleReset}
                                variant="outline"
                                size="sm"
                                className="flex-1"
                            >
                                <RefreshCw className="w-4 h-4 mr-2" />
                                Try Again
                            </Button>
                            <Button
                                onClick={this.handleReload}
                                variant="default"
                                size="sm"
                                className="flex-1 bg-red-600 hover:bg-red-700"
                            >
                                Reload Page
                            </Button>
                        </div>

                        {/* Support Message */}
                        <p className="text-xs text-slate-500 mt-4 text-center">
                            If this problem persists, please contact support.
                        </p>
                    </div>
                </div>
            );
        }

        // No error, render children normally
        return this.props.children;
    }
}
