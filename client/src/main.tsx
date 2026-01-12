// TEMP FIX - prevents crash when syncCabinetConfigFrontLaminate is called globally
// This provides a no-op fallback until proper React prop flow takes over
declare global {
  interface Window {
    syncCabinetConfigFrontLaminate?: (code: string, isUserSelection: boolean) => void;
  }
}
window.syncCabinetConfigFrontLaminate =
  window.syncCabinetConfigFrontLaminate || function () {};

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
// PATCH 35: Global Error Boundary
import ErrorBoundary from '@/components/system/ErrorBoundary'
// PATCH 49: Production safety boot check
import { runBootCheck } from '@/lib/system/bootCheck'

// PATCH 49: Validate critical config on startup
runBootCheck();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary title="CutListCreator crashed">
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
