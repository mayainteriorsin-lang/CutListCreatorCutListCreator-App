// /home is a read-only summary and routing surface with no persistence logic.
export type HomeSummary = {
  totalProjects: number;
  pendingQuotes: number;
  thisMonthRevenue: number;
  activeClients: number;
};

export const EMPTY_HOME_SUMMARY: HomeSummary = {
  totalProjects: 0,
  pendingQuotes: 0,
  thisMonthRevenue: 0,
  activeClients: 0,
};
