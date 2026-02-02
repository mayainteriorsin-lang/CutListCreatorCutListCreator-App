import { EMPTY_HOME_SUMMARY, type HomeSummary } from "./home.contract";
import { readHomeStorageSnapshot, type HomeStorageSnapshot } from "./home.repository";

export type HomeSummaryInput = {
  snapshot?: HomeStorageSnapshot;
  storage?: Storage | null;
};

export function getHomeSummary(input: HomeSummaryInput = {}): HomeSummary {
  const snapshot = input.snapshot ?? readHomeStorageSnapshot(input.storage);
  if (!snapshot) return { ...EMPTY_HOME_SUMMARY };

  const hasVisualQuotationProject = Boolean(
    snapshot.visualQuotation &&
      (snapshot.visualQuotation.clientName ||
        snapshot.visualQuotation.drawnUnitsCount > 0)
  );

  const quotationCount = snapshot.quotations.length;
  const quickQuoteCount = snapshot.quickQuotes.length;
  const totalProjects = (hasVisualQuotationProject ? 1 : 0) + quotationCount + quickQuoteCount;

  const nativeRevenue = snapshot.quotations.reduce((sum, quote) => {
    const next = sum + quote.total;
    return Number.isFinite(next) ? next : sum;
  }, 0);

  const quickQuoteRevenue = snapshot.quickQuotes.reduce((sum, quote) => {
    const next = sum + quote.total;
    return Number.isFinite(next) ? next : sum;
  }, 0);

  return {
    totalProjects,
    pendingQuotes: totalProjects,
    thisMonthRevenue: nativeRevenue + quickQuoteRevenue,
    activeClients: totalProjects > 0 ? 1 : 0,
  };
}
