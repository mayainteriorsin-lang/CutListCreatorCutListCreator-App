/**
 * Error Boundary Component
 *
 * Catches JavaScript errors anywhere in the child component tree,
 * logs errors, and displays a fallback UI.
 *
 * Usage:
 * <ErrorBoundary fallback={<ErrorFallback />}>
 *   <ComponentThatMightError />
 * </ErrorBoundary>
 */

import React, { Component, ErrorInfo, ReactNode } from "react";
import { logger } from "../../services/logger";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  resetKey?: string | number;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });

    // Log error to console in development
    logger.error("ErrorBoundary caught error", { error: String(error), componentStack: errorInfo.componentStack, context: 'error-boundary' });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    // Reset error state when resetKey changes
    if (this.props.resetKey !== prevProps.resetKey && this.state.hasError) {
      this.resetError();
    }
  }

  resetError = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Render custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <div className="flex flex-col items-center justify-center p-6 bg-red-50 border border-red-200 rounded-lg m-4">
          <div className="text-red-600 mb-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-12 w-12"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-red-800 mb-2">
            Something went wrong
          </h2>
          <p className="text-sm text-red-600 mb-4 text-center max-w-md">
            {this.state.error?.message || "An unexpected error occurred."}
          </p>
          <button
            onClick={this.resetError}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Default error fallback component
 */
interface ErrorFallbackProps {
  error?: Error | null;
  resetError?: () => void;
  title?: string;
  message?: string;
}

export function ErrorFallback({
  error,
  resetError,
  title = "Something went wrong",
  message,
}: ErrorFallbackProps): JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center p-6 bg-red-50 border border-red-200 rounded-lg">
      <div className="text-red-600 mb-4">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-10 w-10"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>
      <h3 className="text-lg font-medium text-red-800 mb-2">{title}</h3>
      <p className="text-sm text-red-600 mb-4 text-center">
        {message || error?.message || "An unexpected error occurred."}
      </p>
      {resetError && (
        <button
          onClick={resetError}
          className="px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
        >
          Retry
        </button>
      )}
    </div>
  );
}

/**
 * Canvas-specific error fallback
 */
export function CanvasErrorFallback({
  resetError,
}: {
  resetError?: () => void;
}): JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center h-full bg-slate-100 border border-slate-200 rounded">
      <div className="text-slate-400 mb-3">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-16 w-16"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      </div>
      <p className="text-slate-500 mb-3">Canvas failed to load</p>
      {resetError && (
        <button
          onClick={resetError}
          className="px-3 py-1.5 text-sm bg-slate-600 text-white rounded hover:bg-slate-700 transition-colors"
        >
          Reload Canvas
        </button>
      )}
    </div>
  );
}

export default ErrorBoundary;
