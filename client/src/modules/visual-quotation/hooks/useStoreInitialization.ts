/**
 * Store Initialization Hook
 *
 * Ensures all V2 stores are properly hydrated on app startup.
 * Call this hook once at the app root level.
 *
 * @example
 * function App() {
 *   const { isReady, error } = useStoreInitialization();
 *   if (!isReady) return <LoadingSpinner />;
 *   return <AppContent />;
 * }
 */

import { useEffect, useState } from "react";
import { useRateCardStore } from "../store/rateCardStore";
import { useCustomFolderStore } from "../store/customFolderStore";

interface InitializationState {
  isReady: boolean;
  error: Error | null;
}

export function useStoreInitialization(): InitializationState {
  const [state, setState] = useState<InitializationState>({
    isReady: false,
    error: null,
  });

  useEffect(() => {
    const initializeStores = async () => {
      try {
        // Rate cards store - ensure loaded
        const rateCardState = useRateCardStore.getState();
        if (!rateCardState.isLoaded) {
          rateCardState.loadFromStorage();
        }

        // Custom folders store - uses persist middleware, auto-hydrates
        // Just mark as ready since persist handles rehydration
        const folderState = useCustomFolderStore.getState();
        if (!folderState.isLoaded) {
          folderState.loadFromStorage();
        }

        // All stores initialized
        setState({ isReady: true, error: null });
      } catch (error) {
        setState({
          isReady: false,
          error: error instanceof Error ? error : new Error("Store initialization failed"),
        });
      }
    };

    initializeStores();
  }, []);

  return state;
}

/**
 * Imperative store initialization (for non-React contexts)
 */
export function initializeStores(): void {
  const rateCardState = useRateCardStore.getState();
  if (!rateCardState.isLoaded) {
    rateCardState.loadFromStorage();
  }

  const folderState = useCustomFolderStore.getState();
  if (!folderState.isLoaded) {
    folderState.loadFromStorage();
  }
}
