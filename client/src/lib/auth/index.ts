/**
 * Authentication Module
 *
 * Unified auth exports using Zustand store
 */

// Auth store and types
export { useAuthStore } from '@/stores/authStore';
export type { User, AuthState } from '@/stores/authStore';

// Route protection components
export { ProtectedRoute, withAuth } from './ProtectedRoute';
