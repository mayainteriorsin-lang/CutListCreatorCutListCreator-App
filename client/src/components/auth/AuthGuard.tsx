/**
 * AuthGuard - Route Protection Component
 *
 * Wraps routes that require authentication.
 * Uses Outlet pattern for nested route protection.
 *
 * Features:
 * - Waits for hydration before checking auth
 * - Redirects to login with return URL
 * - Shows loading state during hydration
 */

import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';

/**
 * Loading spinner component
 */
function AuthLoading() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="text-center">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-gray-600 text-sm">Checking authentication...</p>
            </div>
        </div>
    );
}

/**
 * AuthGuard Component
 *
 * Usage in routes:
 * ```tsx
 * <Route element={<AuthGuard />}>
 *   <Route path="/dashboard" element={<Dashboard />} />
 *   <Route path="/settings" element={<Settings />} />
 * </Route>
 * ```
 */
export function AuthGuard() {
    const { isAuthenticated, isHydrated } = useAuthStore();
    const location = useLocation();

    // Wait for hydration to complete before checking auth
    if (!isHydrated) {
        return <AuthLoading />;
    }

    // Redirect to login if not authenticated
    if (!isAuthenticated) {
        // Save the attempted URL for redirecting after login
        return <Navigate to="/auth/login" state={{ from: location }} replace />;
    }

    // Render child routes
    return <Outlet />;
}

export default AuthGuard;
