/**
 * Legacy Bridge - Stub implementation
 *
 * The migration from monolithic visualQuotationStore to v2 modular stores is complete.
 * This stub exists for backward compatibility with components that still import it.
 *
 * The original useLegacyBridge synced data between old and new stores during migration.
 * Now that migration is complete, this hook is a no-op.
 */

interface LegacyBridgeOptions {
  syncDirection?: 'old-to-new' | 'bidirectional';
}

/**
 * No-op legacy bridge hook
 * Migration is complete - v2 stores are the source of truth
 */
export function useLegacyBridge(_options: LegacyBridgeOptions = {}): void {
  // No-op: Migration complete, v2 stores are now the source of truth
}

/**
 * Returns false - no legacy data to migrate
 */
export function useShouldUseLegacyBridge(): boolean {
  return false;
}
