/**
 * Quick Quote Version Adapter
 *
 * Dependency-inversion boundary so the quotations module
 * does NOT import directly from the quick-quotation module.
 *
 * The application layer (pages/quotations.tsx) registers the
 * concrete implementation at startup via registerQuickQuoteAdapter().
 */

/** Shape returned by the quick-quote version save operation */
export interface QuickQuoteVersionResult {
    id: string;
    version: number;
    date: string;
    timestamp: number;
    grandTotal: number;
    note?: string;
}

/** Adapter interface for quick-quote version operations */
export interface QuickQuoteVersionAdapter {
    saveVersion: (quoteNumber: string, note?: string) => QuickQuoteVersionResult | null;
    deleteVersion: (quoteNumber: string, versionId: string) => boolean;
}

let adapter: QuickQuoteVersionAdapter | null = null;

/**
 * Register the quick-quote version adapter.
 * Call this once from the application layer before version operations are used.
 */
export function registerQuickQuoteAdapter(impl: QuickQuoteVersionAdapter): void {
    adapter = impl;
}

/**
 * Get the registered adapter, or null if not registered.
 */
export function getQuickQuoteAdapter(): QuickQuoteVersionAdapter | null {
    return adapter;
}
