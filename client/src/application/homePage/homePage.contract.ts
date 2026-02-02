// home.tsx is a read/write UI surface but does not own persistence or aggregation.
// All storage access and derived data must flow through application/homePage.

export type CabinetFormMemory = {
  roomName?: string;
  customRoomName?: string;
  height?: number;
  width?: number;
  depth?: number;
  widthReduction?: number;
  plywoodType?: string;
  topPanelPlywoodBrand?: string;
  bottomPanelPlywoodBrand?: string;
  leftPanelPlywoodBrand?: string;
  rightPanelPlywoodBrand?: string;
  backPanelPlywoodBrand?: string;
  shutterPlywoodBrand?: string;
  shelfPlywoodBrand?: string;
  topPanelLaminateCode?: string;
  bottomPanelLaminateCode?: string;
  leftPanelLaminateCode?: string;
  rightPanelLaminateCode?: string;
  backPanelLaminateCode?: string;
  shutterLaminateCode?: string;
  shelfLaminateCode?: string;
  topPanelInnerLaminateCode?: string;
  bottomPanelInnerLaminateCode?: string;
  leftPanelInnerLaminateCode?: string;
  rightPanelInnerLaminateCode?: string;
  backPanelInnerLaminateCode?: string;
  shutterInnerLaminateCode?: string;
};

export type ShutterFormMemory = {
  shutterPlywoodBrand?: string;
  shutterLaminateCode?: string;
  shutterInnerLaminateCode?: string;
};

export type SpreadsheetSnapshot = {
  hasRows: boolean;
  rowCount: number;
};

export type HomePageMockData = {
  cabinetFormMemory?: Partial<CabinetFormMemory>;
  shutterFormMemory?: Partial<ShutterFormMemory>;
  laminateTracking?: Iterable<string>;
  promptedClients?: Iterable<string>;
  spreadsheet?: SpreadsheetSnapshot;
};

export const EMPTY_CABINET_FORM_MEMORY: Partial<CabinetFormMemory> = {};
export const EMPTY_SHUTTER_FORM_MEMORY: Partial<ShutterFormMemory> = {};
export const EMPTY_SPREADSHEET_SNAPSHOT: SpreadsheetSnapshot = { hasRows: false, rowCount: 0 };

export const createEmptyLaminateTracking = (): Set<string> => new Set();
export const createEmptyPromptedClients = (): Set<string> => new Set();
