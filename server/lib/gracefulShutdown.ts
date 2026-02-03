/**
 * PHASE 8: Graceful Shutdown Handler
 *
 * Implements clean shutdown on SIGTERM/SIGINT:
 * - Stops accepting new connections
 * - Waits for in-flight requests to complete
 * - Closes database pool
 * - Exits cleanly
 */

import { Server } from 'http';

interface ShutdownOptions {
  server: Server;
  onShutdown?: () => Promise<void>;
  timeoutMs?: number;
}

let isShuttingDown = false;

/**
 * Check if shutdown is in progress
 */
export function isShutdownInProgress(): boolean {
  return isShuttingDown;
}

/**
 * Setup graceful shutdown handlers
 */
export function setupGracefulShutdown(options: ShutdownOptions): void {
  const { server, onShutdown, timeoutMs = 30000 } = options;

  const shutdown = async (signal: string) => {
    if (isShuttingDown) {
      console.log(`[SHUTDOWN] Already shutting down, ignoring ${signal}`);
      return;
    }

    isShuttingDown = true;
    console.log(`[SHUTDOWN] Received ${signal}, starting graceful shutdown...`);

    // Set a hard timeout for forced exit
    const forceExitTimeout = setTimeout(() => {
      console.error('[SHUTDOWN] Graceful shutdown timed out, forcing exit');
      process.exit(1);
    }, timeoutMs);

    try {
      // 1. Stop accepting new connections
      console.log('[SHUTDOWN] Closing HTTP server...');
      await new Promise<void>((resolve, reject) => {
        server.close((err) => {
          if (err) {
            console.error('[SHUTDOWN] Error closing server:', err);
            reject(err);
          } else {
            console.log('[SHUTDOWN] HTTP server closed');
            resolve();
          }
        });
      });

      // 2. Run custom shutdown logic (DB pool, etc.)
      if (onShutdown) {
        console.log('[SHUTDOWN] Running cleanup handlers...');
        await onShutdown();
        console.log('[SHUTDOWN] Cleanup complete');
      }

      // 3. Clear the force exit timeout
      clearTimeout(forceExitTimeout);

      // 4. Exit cleanly
      console.log('[SHUTDOWN] Graceful shutdown complete');
      process.exit(0);
    } catch (error) {
      console.error('[SHUTDOWN] Error during graceful shutdown:', error);
      clearTimeout(forceExitTimeout);
      process.exit(1);
    }
  };

  // Register signal handlers
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Handle uncaught errors gracefully
  process.on('uncaughtException', (error) => {
    console.error('[FATAL] Uncaught exception:', error);
    shutdown('uncaughtException');
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('[FATAL] Unhandled rejection at:', promise, 'reason:', reason);
    // Don't shutdown on unhandled rejection in development
    if (process.env.NODE_ENV === 'production') {
      shutdown('unhandledRejection');
    }
  });

  console.log('[STARTUP] Graceful shutdown handlers registered');
}
