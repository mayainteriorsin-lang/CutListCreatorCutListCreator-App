/**
 * PATCH 32: Worker Wrapper for Optimizer Engine
 *
 * Spawns a web worker to run heavy optimization off the main thread.
 * Falls back to main thread if workers are unavailable.
 */

import type { OptimizerEngineParams, OptimizerEngineResult } from "@shared/schema";
import type { WorkerOptimizerParams } from "./optimizer.worker";

let worker: Worker | null = null;

export function runOptimizerInWorker(
  params: OptimizerEngineParams
): Promise<OptimizerEngineResult> {
  if (!worker) {
    worker = new Worker(
      new URL("./optimizer.worker.ts", import.meta.url),
      { type: "module" }
    );
  }

  return new Promise((resolve, reject) => {
    worker!.onmessage = (e: MessageEvent<any>) => {
      if (e.data?.ok) resolve(e.data.data);
      else reject(new Error(e.data?.error || "Optimizer failed"));
    };

    // Pre-generate panels on main thread since functions can't be serialized
    const { generatePanels, cabinets, ...rest } = params;
    const allPanels = cabinets.flatMap(generatePanels);

    const workerParams: WorkerOptimizerParams = {
      ...rest,
      cabinets,
      allPanels,
    };

    worker!.postMessage(workerParams);
  });
}
