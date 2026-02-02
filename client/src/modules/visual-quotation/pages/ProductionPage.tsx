/**
 * ProductionPage - Legacy Re-export
 * ----------------------------------
 * This file re-exports the refactored ProductionPage for backward compatibility.
 * The actual implementation is now in ./production/ProductionPage.tsx
 *
 * Architecture:
 * - Business logic: services/productionService.ts
 * - Storage: services/storageService.ts
 * - State: pages/production/hooks/useProductionState.ts
 * - Components: pages/production/components/
 */

export { default } from "./production/ProductionPage";
