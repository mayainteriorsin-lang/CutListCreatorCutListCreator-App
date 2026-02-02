import React, { Component, ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw, Home } from "lucide-react";

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: React.ErrorInfo | null;
}

export class Quotation2DErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
        };
    }

    static getDerivedStateFromError(error: Error): Partial<State> {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        // Log error details
        console.error("Quotation2D Error Boundary caught an error:", error, errorInfo);

        this.setState({
            error,
            errorInfo,
        });

        // You can also log the error to an error reporting service here
        // Example: logErrorToService(error, errorInfo);
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

    handleGoHome = () => {
        window.location.href = "/";
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-50 to-slate-100 flex items-center justify-center p-4">
                    <Card className="max-w-lg w-full shadow-xl">
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-red-100 rounded-full">
                                    <AlertCircle className="h-6 w-6 text-red-600" />
                                </div>
                                <CardTitle className="text-xl">Error in 2D Quotation</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-slate-600">
                                An unexpected error occurred while rendering the 2D quotation page.
                                Your work may have been saved automatically.
                            </p>

                            {process.env.NODE_ENV === "development" && this.state.error && (
                                <div className="bg-red-50 border border-red-200 rounded-lg p-3 max-h-48 overflow-auto">
                                    <p className="text-sm font-semibold text-red-800 mb-2">Error Details:</p>
                                    <pre className="text-xs text-red-700 whitespace-pre-wrap">
                                        {this.state.error.toString()}
                                    </pre>
                                    {this.state.errorInfo && (
                                        <pre className="text-xs text-red-600 mt-2 whitespace-pre-wrap">
                                            {this.state.errorInfo.componentStack}
                                        </pre>
                                    )}
                                </div>
                            )}

                            <div className="flex gap-2 flex-wrap">
                                <Button
                                    onClick={this.handleReset}
                                    variant="default"
                                    className="flex-1 min-w-[120px]"
                                >
                                    <RefreshCw className="h-4 w-4 mr-2" />
                                    Try Again
                                </Button>
                                <Button
                                    onClick={this.handleReload}
                                    variant="outline"
                                    className="flex-1 min-w-[120px]"
                                >
                                    Reload Page
                                </Button>
                                <Button
                                    onClick={this.handleGoHome}
                                    variant="ghost"
                                    className="flex-1 min-w-[120px]"
                                >
                                    <Home className="h-4 w-4 mr-2" />
                                    Go Home
                                </Button>
                            </div>

                            <p className="text-xs text-slate-500 text-center">
                                If this problem persists, please contact support.
                            </p>
                        </CardContent>
                    </Card>
                </div>
            );
        }

        return this.props.children;
    }
}
