import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, RefreshCcw } from "lucide-react";

interface Props {
    children: React.ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: React.ErrorInfo | null;
}

export class CRMErrorBoundary extends React.Component<Props, State> {
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
        console.error("CRM Error Boundary caught:", error, errorInfo);
        this.setState({ errorInfo });
    }

    handleReset = () => {
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null,
        });
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-50 to-slate-100 flex items-center justify-center p-4">
                    <Card className="max-w-lg w-full">
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-red-100 rounded-full">
                                    <AlertCircle className="h-6 w-6 text-red-600" />
                                </div>
                                <CardTitle className="text-xl">Something went wrong</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-slate-600">
                                An unexpected error occurred in the CRM system. Don't worry, your data is safe.
                            </p>

                            {this.state.error && (
                                <div className="bg-red-50 border border-red-200 rounded-md p-3">
                                    <p className="text-sm font-mono text-red-800">
                                        {this.state.error.message}
                                    </p>
                                </div>
                            )}

                            <div className="flex gap-3">
                                <Button onClick={this.handleReset} className="flex items-center gap-2">
                                    <RefreshCcw className="h-4 w-4" />
                                    Reload Page
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => window.history.back()}
                                >
                                    Go Back
                                </Button>
                            </div>

                            {process.env.NODE_ENV === "development" && this.state.errorInfo && (
                                <details className="mt-4">
                                    <summary className="text-sm text-slate-600 cursor-pointer hover:text-slate-800">
                                        Error Details (Development Only)
                                    </summary>
                                    <pre className="mt-2 text-xs bg-slate-100 p-3 rounded overflow-auto max-h-40">
                                        {this.state.errorInfo.componentStack}
                                    </pre>
                                </details>
                            )}
                        </CardContent>
                    </Card>
                </div>
            );
        }

        return this.props.children;
    }
}
