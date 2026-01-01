export interface CutPanel {
  id: string;
  name?: string;
  height: number;
  width: number;
  gaddi?: boolean;
  grainDirection?: boolean;
  plywoodType?: string;
  laminateCode?: string;
  quantity?: number;
}

export interface PlacedPanel extends CutPanel {
  x: number;
  y: number;
  rotated?: boolean;
}

export interface Sheet {
  _sheetId: string;
  width: number;
  height: number;
  placed: PlacedPanel[];
}

export interface BrandResult {
  brand: string;
  laminateCode: string;
  laminateDisplay: string;
  isBackPanel?: boolean;
  result: {
    panels: Sheet[];
  };
}

export interface MaterialSummaryItem {
  brand: string;
  laminateDisplay: string;
  count: number;
}

export interface LaminateSummary {
  [laminateCode: string]: number;
}

export interface MaterialSummary {
  [key: string]: MaterialSummaryItem;
}

export interface OptimizerEngineParams {
  cabinets: any[];
  manualPanels: any[];
  sheetWidth: number;
  sheetHeight: number;
  kerf: number;
  woodGrainsPreferences: Record<string, boolean>;
  generatePanels: (cabinet: any) => any[];
}

export interface OptimizerEngineResult {
  brandResults: BrandResult[];
  error: Error | null;
}
