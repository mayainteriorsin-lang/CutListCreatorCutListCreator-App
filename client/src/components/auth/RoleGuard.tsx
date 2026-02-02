/**
 * RoleGuard - Role-Based Access Control Component
 *
 * Restricts access to routes based on user role.
 * Must be used inside AuthGuard (user must be authenticated first).
 *
 * Features:
 * - Supports multiple allowed roles
 * - Admin role has access to everything
 * - Shows 403 Forbidden for unauthorized access
 */

import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';

interface RoleGuardProps {
    /**
     * Roles allowed to access this route
     * Admin always has access regardless of this list
     */
    roles: string[];
    /**
     * Where to redirect if role check fails
     * Default: "/" (home)
     */
    fallbackPath?: string;
}

/**
 * Forbidden page component
 */
function ForbiddenPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="text-center">
                <h1 className="text-6xl font-bold text-gray-300 mb-4">403</h1>
                <h2 className="text-2xl font-semibold text-gray-700 mb-2">Access Denied</h2>
                <p className="text-gray-500 mb-6">
                    You don't have permission to access this page.
                </p>
                <a
                    href="/"
                    className="inline-flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                    Go to Home
                </a>
            </div>
        </div>
    );
}

/**
 * RoleGuard Component
 *
 * Usage in routes:
 * ```tsx
 * <Route element={<AuthGuard />}>
 *   <Route element={<RoleGuard roles={['admin', 'designer']} />}>
 *     <Route path="/design" element={<DesignPage />} />
 *   </Route>
 * </Route>
 * ```
 */
export function RoleGuard({ roles, fallbackPath }: RoleGuardProps) {
    const { user } = useAuthStore();

    // No user should not happen (AuthGuard should catch this)
    // But handle it gracefully
    if (!user) {
        return <Navigate to="/auth/login" replace />;
    }

    // Admin has access to everything
    if (user.role === 'admin') {
        return <Outlet />;
    }

    // Check if user's role is in allowed roles
    if (roles.includes(user.role)) {
        return <Outlet />;
    }

    // Role not allowed
    if (fallbackPath) {
        return <Navigate to={fallbackPath} replace />;
    }

    // Show forbidden page
    return <ForbiddenPage />;
}

export default RoleGuard;
