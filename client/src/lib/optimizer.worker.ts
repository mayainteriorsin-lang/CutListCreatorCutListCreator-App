/**
 * OPTIMIZER WORKER
 * Handles CPU-intensive cutlist optimization in a background thread.
 * This prevents the main UI thread from freezing.
 */

import { optimizeCutlist } from './cutlist-optimizer';
import { optimizeCutlistGenetic } from './genetic-guillotine-optimizer';

// Listen for messages from the main thread
self.onmessage = (e: MessageEvent) => {
    const { parts, sheet, timeMs, strategy, rngSeed, algorithm } = e.data;

    try {
        let result;

        // Choose algorithm: 'genetic' or 'maxrects' (default)
        if (algorithm === 'genetic') {
            result = optimizeCutlistGenetic({
                parts,
                sheet,
                timeMs,
                rngSeed
            });
        } else {
            // Default to MaxRects algorithm
            result = optimizeCutlist({
                parts,
                sheet,
                timeMs,
                strategy,
                rngSeed
            });
        }

        self.postMessage({ type: 'SUCCESS', result });
    } catch (error) {
        self.postMessage({ type: 'ERROR', error: (error as Error).message });
    }
};
