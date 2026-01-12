/**
 * PATCH 35: Global Error Boundary + Fallback UI
 *
 * Catches React rendering errors and shows a user-friendly error card
 * instead of a blank white screen.
 */

import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Props = {
  children: React.ReactNode;
  title?: string;
};

type State = {
  hasError: boolean;
  error?: Error;
};

export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Keep this console log for debugging
    console.error("ErrorBoundary caught error:", error, info);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const title = this.props.title ?? "Something went wrong";

    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <Card className="max-w-2xl w-full border border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-red-600">{title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-slate-700">
              The app hit an unexpected error. This is usually caused by missing data
              (API failed) or a component receiving undefined props.
            </p>

            <div className="bg-slate-900 text-slate-100 rounded-md p-3 text-xs overflow-auto">
              <pre className="whitespace-pre-wrap">
                {this.state.error?.message ?? "Unknown error"}
              </pre>
            </div>

            <div className="flex gap-2">
              <Button onClick={this.handleReload} className="bg-blue-600 hover:bg-blue-700">
                Reload Page
              </Button>
              <Button variant="outline" onClick={this.handleReset}>
                Try Continue
              </Button>
            </div>

            <p className="text-xs text-slate-500">
              If this repeats, open DevTools Console and share the first error line.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }
}
