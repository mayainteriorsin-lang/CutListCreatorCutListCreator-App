
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { apiPost } from '@/lib/api/apiClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Lock, Mail, Loader2, Eye, EyeOff, ArrowLeft, CheckCircle } from 'lucide-react';

export default function LoginPage() {
    // Default credentials for development
    const [email, setEmail] = useState('admin@cutlist.pro');
    const [password, setPassword] = useState('admin123');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Forgot password state
    const [showForgotPassword, setShowForgotPassword] = useState(false);
    const [resetEmail, setResetEmail] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [resetSuccess, setResetSuccess] = useState(false);
    const [resetError, setResetError] = useState<string | null>(null);
    const [isResetting, setIsResetting] = useState(false);

    const navigate = useNavigate();
    const setAuth = useAuthStore((state) => state.setAuth);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            const res = await apiPost<{
                accessToken: string;
                refreshToken: string;
                user: {
                    userId: string;
                    email: string;
                    role: string;
                    tenantId: string;
                }
            }>('/api/auth/login', { email, password });

            if (res && res.accessToken) {
                setAuth(
                    { accessToken: res.accessToken, refreshToken: res.refreshToken },
                    res.user
                );
                navigate('/'); // Redirect to dashboard/home
            } else {
                // apiPost usually toasts error returns null on failure if catch block catches fetch error
                // But if 401, it returns null and toasts.
                // If apiPost returns null, we show generic error if error state not set.
                // But apiPost swallows error and toasts.
                // So we might not need to set error manually?
                // But let's set generic message.
                setError('Login failed. Please check your credentials.');
            }
        } catch (err: any) {
            setError(err.message || 'Login failed');
        } finally {
            setIsLoading(false);
        }
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setResetError(null);

        if (newPassword !== confirmPassword) {
            setResetError('Passwords do not match');
            return;
        }

        if (newPassword.length < 8) {
            setResetError('Password must be at least 8 characters');
            return;
        }

        setIsResetting(true);

        try {
            const res = await apiPost<{ success: boolean; message: string }>(
                '/api/auth/reset-password',
                { email: resetEmail, newPassword }
            );

            if (res?.success) {
                setResetSuccess(true);
                // Auto-fill login form with new credentials
                setEmail(resetEmail);
                setPassword(newPassword);
            } else {
                setResetError('Password reset failed. Please check your email.');
            }
        } catch (err: any) {
            setResetError(err.message || 'Password reset failed');
        } finally {
            setIsResetting(false);
        }
    };

    const handleBackToLogin = () => {
        setShowForgotPassword(false);
        setResetSuccess(false);
        setResetError(null);
        setResetEmail('');
        setNewPassword('');
        setConfirmPassword('');
    };

    // Forgot Password View
    if (showForgotPassword) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
                <Card className="w-full max-w-md">
                    <CardHeader className="space-y-1">
                        <CardTitle className="text-2xl font-bold text-center">
                            {resetSuccess ? 'Password Reset!' : 'Reset Password'}
                        </CardTitle>
                        <CardDescription className="text-center">
                            {resetSuccess
                                ? 'Your password has been reset successfully'
                                : 'Enter your email and new password'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {resetSuccess ? (
                            <div className="space-y-4">
                                <div className="flex flex-col items-center py-4">
                                    <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
                                    <p className="text-sm text-muted-foreground text-center">
                                        You can now sign in with your new password
                                    </p>
                                </div>
                                <Button
                                    className="w-full"
                                    onClick={handleBackToLogin}
                                >
                                    <ArrowLeft className="mr-2 h-4 w-4" />
                                    Back to Sign In
                                </Button>
                            </div>
                        ) : (
                            <form onSubmit={handleResetPassword} className="space-y-4">
                                {resetError && (
                                    <Alert variant="destructive">
                                        <AlertDescription>{resetError}</AlertDescription>
                                    </Alert>
                                )}
                                <div className="space-y-2">
                                    <Label htmlFor="reset-email">Email</Label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            id="reset-email"
                                            type="email"
                                            placeholder="your@email.com"
                                            className="pl-10"
                                            value={resetEmail}
                                            onChange={(e) => setResetEmail(e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="new-password">New Password</Label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            id="new-password"
                                            type="password"
                                            placeholder="Min 8 characters"
                                            className="pl-10"
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            required
                                            minLength={8}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="confirm-password">Confirm Password</Label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            id="confirm-password"
                                            type="password"
                                            placeholder="Confirm password"
                                            className="pl-10"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>
                                <Button type="submit" className="w-full" disabled={isResetting}>
                                    {isResetting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Reset Password
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    className="w-full"
                                    onClick={handleBackToLogin}
                                >
                                    <ArrowLeft className="mr-2 h-4 w-4" />
                                    Back to Sign In
                                </Button>
                            </form>
                        )}
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
            <Card className="w-full max-w-md">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl font-bold text-center">Sign in</CardTitle>
                    <CardDescription className="text-center">
                        Enter your email and password to access your account
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleLogin} className="space-y-4">
                        {error && (
                            <Alert variant="destructive">
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="m@example.com"
                                    className="pl-10"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    className="pl-10 pr-10"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                                <button
                                    type="button"
                                    className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? (
                                        <EyeOff className="h-4 w-4" />
                                    ) : (
                                        <Eye className="h-4 w-4" />
                                    )}
                                </button>
                            </div>
                        </div>
                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Sign In
                        </Button>
                        <div className="text-center">
                            <span
                                className="text-sm text-primary hover:underline cursor-pointer"
                                onClick={() => setShowForgotPassword(true)}
                            >
                                Forgot password?
                            </span>
                        </div>
                    </form>
                </CardContent>
                <CardFooter className="flex justify-center">
                    <p className="text-sm text-muted-foreground">
                        Don't have an account?{' '}
                        <span
                            className="text-primary hover:underline cursor-pointer"
                            onClick={() => navigate('/auth/register')}
                        >
                            Sign up
                        </span>
                    </p>
                </CardFooter>
            </Card>
        </div>
    );
}
