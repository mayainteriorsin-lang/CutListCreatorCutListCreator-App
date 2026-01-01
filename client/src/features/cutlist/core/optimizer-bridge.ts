import type { OptimizerPart, OptimizationResult } from './types';
import OptimizerWorker from '../../../lib/optimizer.worker?worker';

/**
 * Call the optimizer asynchronously using a Web Worker.
 * Guaranteed not to block the main thread.
 *
 * @param algorithm - 'genetic' for Genetic Algorithm with Guillotine Cuts (recommended),
 *                    'maxrects' for legacy MaxRects algorithm (default for compatibility)
 */
export function runOptimizer(
  parts: OptimizerPart[],
  sheetWidth: number = 1210,
  sheetHeight: number = 2420,
  timeMs: number = 300,
  strategy: string = 'BAF',
  algorithm: 'genetic' | 'maxrects' = 'genetic',  // Default to new genetic algorithm
  kerf: number = 5  // Default kerf to 5mm (matches app default)
): Promise<OptimizationResult> {
  return new Promise((resolve, reject) => {
    const worker = new OptimizerWorker();

    worker.onmessage = (e) => {
      const { type, result, error } = e.data;
      if (type === 'SUCCESS') {
        resolve(result);
      } else {
        reject(new Error(error || 'Unknown worker error'));
      }
      worker.terminate();
    };

    worker.onerror = (err) => {
      console.error('Worker error:', err);
      reject(err);
      worker.terminate();
    };

    worker.postMessage({
      parts,
      sheet: { w: sheetWidth, h: sheetHeight, kerf },
      timeMs,
      strategy,
      algorithm
    });
  });
}
