export { computeDisplayDims, getDisplayDims } from './computeDisplayDims';
export { preparePartsForOptimizer } from './preparePartsForOptimizer';
export { multiPassOptimize } from './multiPassOptimize';
export { runOptimization } from './runOptimization';
export { runMaterialSummary } from './runMaterialSummary';
export { runOptimizerEngine, runOptimizerInternal } from './OptimizerEngine';
// PATCH 32: Worker wrapper export
export { runOptimizerInWorker } from './runOptimizerWorker';
export type { OptimizerEngineParams, OptimizerEngineResult, BrandResult } from '@shared/schema';
