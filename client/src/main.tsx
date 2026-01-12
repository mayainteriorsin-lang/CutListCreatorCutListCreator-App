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
