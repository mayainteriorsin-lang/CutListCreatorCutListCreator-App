/**
 * Quick Quotation Module - Error Boundary
 *
 * Catches and handles errors gracefully with recovery options.
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, RefreshCcw, Home, Undo2 } from 'lucide-react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

export class QuickQuotationErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('[QuickQuotation] Error caught by boundary:', error);
    console.error('[QuickQuotation] Error info:', errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  handleReload = (): void => {
    window.location.reload();
  };

  handleGoHome = (): void => {
    window.location.href = '/';
  };

  handleClearAndRetry = (): void => {
    // Clear the current quotation state
    try {
      localStorage.removeItem('mayaQuotation');
    } catch {
      // Ignore storage errors
    }
    this.handleReset();
  };

  render(): React.ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <Card className="max-w-lg w-full shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              Quick Quotation Error
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-slate-600">
              The quotation tool encountered an unexpected error. Your data may have been auto-saved to local storage.
            </p>

            {this.state.error && (
              <div className="bg-slate-900 text-slate-100 rounded-md p-3 text-xs font-mono overflow-auto max-h-32">
                <div className="text-red-400 mb-1">Error:</div>
                <pre className="whitespace-pre-wrap">{this.state.error.message}</pre>
              </div>
            )}

            <div className="flex flex-wrap gap-2 pt-2">
              <Button
                onClick={this.handleReset}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Undo2 className="h-4 w-4" />
                Try Again
              </Button>

              <Button
                onClick={this.handleClearAndRetry}
                variant="outline"
                className="flex items-center gap-2"
              >
                <RefreshCcw className="h-4 w-4" />
                Clear & Retry
              </Button>

              <Button
                onClick={this.handleReload}
                className="flex items-center gap-2"
              >
                <RefreshCcw className="h-4 w-4" />
                Reload Page
              </Button>

              <Button
                onClick={this.handleGoHome}
                variant="ghost"
                className="flex items-center gap-2"
              >
                <Home className="h-4 w-4" />
                Go Home
              </Button>
            </div>

            <p className="text-xs text-slate-400 pt-2">
              If the error persists, try clearing your browser's local storage for this site.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }
}
