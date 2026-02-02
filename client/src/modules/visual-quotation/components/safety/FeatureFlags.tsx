/**
 * Feature Flags
 *
 * Simple feature flag system for the Visual Quotation module.
 * Enables gradual rollout and easy feature toggling.
 *
 * Usage:
 * - isFeatureEnabled("newPricingEngine") // check if enabled
 * - <FeatureGate flag="newPricingEngine">...</FeatureGate> // conditional render
 */

import React, { createContext, useContext, ReactNode } from "react";
import { logger } from "../../services/logger";

// ============================================================================
// Feature Flag Definitions
// ============================================================================

/**
 * All available feature flags with their default values
 */
export const FEATURE_FLAGS = {
  // Service Layer
  useServiceLayer: true, // Use new service orchestration layer
  usePricingService: true, // Use pricing service for calculations
  useRoomService: true, // Use room service for CRUD
  useExportService: true, // Use export service for exports

  // UI Features
  showDebugPanel: false, // Show debug information panel
  showPerformanceMetrics: false, // Show render performance metrics
  enableCanvasOptimizations: true, // Enable Konva optimizations

  // Export Features
  enablePdfExport: true, // Enable PDF export
  enableExcelExport: true, // Enable Excel export
  enableWhatsAppShare: true, // Enable WhatsApp sharing

  // Multi-room
  enableMultiRoom: true, // Enable multi-room quotation
  maxRoomsPerQuotation: 20, // Maximum rooms allowed

  // Production Safety
  enableErrorBoundaries: true, // Wrap components in error boundaries
  enableAutoSave: true, // Auto-save to localStorage
  enableUndoRedo: false, // Undo/redo functionality (future)

  // Analytics
  enableAnalytics: false, // Send analytics events
  enablePerformanceTracking: false, // Track performance metrics
} as const;

export type FeatureFlagKey = keyof typeof FEATURE_FLAGS;
export type FeatureFlagValue = boolean | number | string;

// ============================================================================
// Feature Flag Context
// ============================================================================

interface FeatureFlagsContextValue {
  flags: Record<FeatureFlagKey, FeatureFlagValue>;
  isEnabled: (key: FeatureFlagKey) => boolean;
  getValue: <T extends FeatureFlagValue>(key: FeatureFlagKey) => T;
  setFlag: (key: FeatureFlagKey, value: FeatureFlagValue) => void;
}

const FeatureFlagsContext = createContext<FeatureFlagsContextValue | null>(null);

// ============================================================================
// Feature Flag Provider
// ============================================================================

interface FeatureFlagsProviderProps {
  children: ReactNode;
  overrides?: Partial<Record<FeatureFlagKey, FeatureFlagValue>>;
}

export function FeatureFlagsProvider({
  children,
  overrides = {},
}: FeatureFlagsProviderProps): JSX.Element {
  const [flags, setFlags] = React.useState<Record<FeatureFlagKey, FeatureFlagValue>>({
    ...FEATURE_FLAGS,
    ...overrides,
  });

  const isEnabled = React.useCallback(
    (key: FeatureFlagKey): boolean => {
      const value = flags[key];
      return typeof value === "boolean" ? value : Boolean(value);
    },
    [flags]
  );

  const getValue = React.useCallback(
    <T extends FeatureFlagValue>(key: FeatureFlagKey): T => {
      return flags[key] as T;
    },
    [flags]
  );

  const setFlag = React.useCallback((key: FeatureFlagKey, value: FeatureFlagValue) => {
    setFlags((prev) => ({ ...prev, [key]: value }));
  }, []);

  const contextValue = React.useMemo(
    () => ({ flags, isEnabled, getValue, setFlag }),
    [flags, isEnabled, getValue, setFlag]
  );

  return (
    <FeatureFlagsContext.Provider value={contextValue}>
      {children}
    </FeatureFlagsContext.Provider>
  );
}

// ============================================================================
// Feature Flag Hook
// ============================================================================

export function useFeatureFlags(): FeatureFlagsContextValue {
  const context = useContext(FeatureFlagsContext);

  // Return default implementation if used outside provider
  if (!context) {
    return {
      flags: { ...FEATURE_FLAGS },
      isEnabled: (key: FeatureFlagKey) => {
        const value = FEATURE_FLAGS[key];
        return typeof value === "boolean" ? value : Boolean(value);
      },
      getValue: <T extends FeatureFlagValue>(key: FeatureFlagKey): T => {
        return FEATURE_FLAGS[key] as T;
      },
      setFlag: () => {
        logger.warn("setFlag called outside provider", { context: 'feature-flags' });
      },
    };
  }

  return context;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if a feature is enabled (can be used outside React components)
 */
export function isFeatureEnabled(key: FeatureFlagKey): boolean {
  const value = FEATURE_FLAGS[key];
  return typeof value === "boolean" ? value : Boolean(value);
}

/**
 * Get a feature flag value (can be used outside React components)
 */
export function getFeatureValue<T extends FeatureFlagValue>(key: FeatureFlagKey): T {
  return FEATURE_FLAGS[key] as T;
}

// ============================================================================
// Feature Gate Component
// ============================================================================

interface FeatureGateProps {
  flag: FeatureFlagKey;
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Conditionally render children based on feature flag
 */
export function FeatureGate({
  flag,
  children,
  fallback = null,
}: FeatureGateProps): JSX.Element | null {
  const { isEnabled } = useFeatureFlags();

  if (isEnabled(flag)) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
}

/**
 * Inverse feature gate - render when feature is disabled
 */
export function FeatureGateOff({
  flag,
  children,
  fallback = null,
}: FeatureGateProps): JSX.Element | null {
  const { isEnabled } = useFeatureFlags();

  if (!isEnabled(flag)) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
}

// ============================================================================
// Debug Panel
// ============================================================================

/**
 * Debug panel for viewing/toggling feature flags (development only)
 */
export function FeatureFlagsDebugPanel(): JSX.Element | null {
  const { flags, setFlag, isEnabled } = useFeatureFlags();

  if (!isEnabled("showDebugPanel")) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 w-80 max-h-96 overflow-auto bg-white border border-slate-200 rounded-lg shadow-lg p-4 z-50">
      <h3 className="font-semibold text-slate-800 mb-3">Feature Flags</h3>
      <div className="space-y-2">
        {Object.entries(flags).map(([key, value]) => (
          <div key={key} className="flex items-center justify-between text-sm">
            <span className="text-slate-600">{key}</span>
            {typeof value === "boolean" ? (
              <button
                onClick={() => setFlag(key as FeatureFlagKey, !value)}
                className={`px-2 py-0.5 rounded text-xs ${value
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-slate-100 text-slate-500"
                  }`}
              >
                {value ? "ON" : "OFF"}
              </button>
            ) : (
              <span className="text-slate-800">{String(value)}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default {
  FEATURE_FLAGS,
  FeatureFlagsProvider,
  useFeatureFlags,
  isFeatureEnabled,
  getFeatureValue,
  FeatureGate,
  FeatureGateOff,
  FeatureFlagsDebugPanel,
};
