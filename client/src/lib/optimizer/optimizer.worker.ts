/**
 * PATCH 32: Optimizer Engine Worker
 *
 * Runs the heavy optimization logic off the main thread.
 * Note: Since generatePanels is a function and can't be serialized,
 * we use runOptimizerInternal with pre-generated panels passed via allPanels.
 */

import { runOptimizerInternal } from "./OptimizerEngine";
import type { OptimizerEngineParams, OptimizerEngineResult } from "@shared/schema";

// Worker-safe params: same as OptimizerEngineParams but with pre-generated panels
export interface WorkerOptimizerParams extends Omit<OptimizerEngineParams, 'generatePanels'> {
  allPanels: any[]; // Pre-generated panels from main thread
}

self.onmessage = async (e: MessageEvent<WorkerOptimizerParams>) => {
  try {
    const { allPanels, ...rest } = e.data;

    // Create a dummy generatePanels that returns the pre-generated panels
    // This works because runOptimizerInternal calls cabinets.flatMap(generatePanels)
    // We pass a single "cabinet" that returns all panels
    const result: OptimizerEngineResult = await runOptimizerInternal({
      ...rest,
      cabinets: [{ id: 'worker-batch' } as any],
      generatePanels: () => allPanels,
    });

    self.postMessage({ ok: true, data: result });
  } catch (err: any) {
    self.postMessage({
      ok: false,
      error: err?.message || "Optimizer worker failed",
    });
  }
};
