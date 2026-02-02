
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';

interface ProtectedRouteProps {
    children: React.ReactNode;
    requiredRole?: 'admin' | 'designer' | 'viewer' | string;
}

/**
 * ProtectedRoute Component
 * 
 * Wraps routes that require authentication
 * Redirects to login if not authenticated
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
    children,
    requiredRole
}) => {
    const { isAuthenticated, user } = useAuthStore();
    const location = useLocation();

    // Development bypass (set VITE_BYPASS_AUTH=true in .env.local)
    if (import.meta.env.VITE_BYPASS_AUTH === 'true') {
        if (process.env.NODE_ENV === 'development') {
            console.debug('[ProtectedRoute] Auth bypassed (development mode)');
        }
        return <>{children}</>;
    }

    if (!isAuthenticated) {
        return <Navigate to="/auth/login" state={{ from: location }} replace />;
    }

    // Role check logic
    if (requiredRole && user) {
        // Admin always has access? Or explicit check?
        // Assuming admin has access to everything for now
        if (user.role === 'admin') return <>{children}</>;

        if (user.role !== requiredRole) {
            // Unauthorized
            return <Navigate to="/" replace />;
        }
    }

    return <>{children}</>;
};

/**
 * withAuth HOC
 */
export function withAuth<P extends object>(
    Component: React.ComponentType<P>,
    options?: { requiredRole?: 'admin' | 'designer' | 'viewer' }
) {
    return (props: P) => (
        <ProtectedRoute requiredRole={options?.requiredRole}>
            <Component {...props} />
        </ProtectedRoute>
    );
}
