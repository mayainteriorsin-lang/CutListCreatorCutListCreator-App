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

// PATCH Phase 3: Initialize Sentry
import { logger } from '@/modules/visual-quotation/services/logger';
const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;
if (SENTRY_DSN) {
  logger.initSentry(SENTRY_DSN, import.meta.env.MODE);
} else {
  console.warn('Sentry DSN not found, error tracking disabled');
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary title="CutListCreator crashed">
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
