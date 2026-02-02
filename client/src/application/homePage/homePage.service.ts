import {
  EMPTY_CABINET_FORM_MEMORY,
  EMPTY_SHUTTER_FORM_MEMORY,
  EMPTY_SPREADSHEET_SNAPSHOT,
  createEmptyLaminateTracking,
  type CabinetFormMemory,
  type HomePageMockData,
  type ShutterFormMemory,
  type SpreadsheetSnapshot,
} from "./homePage.contract";
import {
  clearLaminateTracking,
  readCabinetFormMemory,
  readLaminateTracking,
  readPromptedClients,
  readShutterFormMemory,
  readSpreadsheetSnapshot,
  writeCabinetFormMemory,
  writeLaminateTracking,
  writeShutterFormMemory,
} from "./homePage.repository";

export type HomePageService = {
  getCabinetFormMemory: (validLaminates?: string[], validPlywood?: string[]) => Partial<CabinetFormMemory>;
  saveCabinetFormMemory: (values: CabinetFormMemory) => void;
  getShutterFormMemory: (validLaminates?: string[], validPlywood?: string[]) => Partial<ShutterFormMemory>;
  saveShutterFormMemory: (values: ShutterFormMemory) => void;
  cleanOrphanedMaterials: (validLaminates: string[], validPlywood: string[]) => number;
  getLaminateTracking: () => Set<string>;
  saveLaminateTracking: (tracking: Set<string>) => void;
  clearLaminateTracking: () => void;
  getPromptedClients: () => Set<string>;
  getSpreadsheetSnapshot: () => SpreadsheetSnapshot;
};

type MockState = {
  cabinetFormMemory: Partial<CabinetFormMemory>;
  shutterFormMemory: Partial<ShutterFormMemory>;
  laminateTracking: Set<string>;
  promptedClients: Set<string>;
  spreadsheet: SpreadsheetSnapshot;
};

const CABINET_LAMINATE_FIELDS = [
  "topPanelLaminateCode",
  "bottomPanelLaminateCode",
  "leftPanelLaminateCode",
  "rightPanelLaminateCode",
  "backPanelLaminateCode",
  "shutterLaminateCode",
  "shelfLaminateCode",
  "topPanelInnerLaminateCode",
  "bottomPanelInnerLaminateCode",
  "leftPanelInnerLaminateCode",
  "rightPanelInnerLaminateCode",
  "backPanelInnerLaminateCode",
  "shutterInnerLaminateCode",
] as const;

const CABINET_PLYWOOD_FIELDS = [
  "topPanelPlywoodBrand",
  "bottomPanelPlywoodBrand",
  "leftPanelPlywoodBrand",
  "rightPanelPlywoodBrand",
  "backPanelPlywoodBrand",
  "shutterPlywoodBrand",
  "shelfPlywoodBrand",
] as const;

const SHUTTER_LAMINATE_FIELDS = ["shutterLaminateCode", "shutterInnerLaminateCode"] as const;
const SHUTTER_PLYWOOD_FIELDS = ["shutterPlywoodBrand"] as const;

function toSet(values?: Iterable<string>): Set<string> {
  return new Set(values ?? []);
}

function sanitizeCabinetMemory(
  raw: Record<string, unknown> | null,
  validLaminates?: string[],
  validPlywood?: string[]
): Partial<CabinetFormMemory> {
  const memory: Record<string, unknown> = raw ? { ...raw } : { ...EMPTY_CABINET_FORM_MEMORY };

  if (validLaminates) {
    CABINET_LAMINATE_FIELDS.forEach((field) => {
      const value = memory[field];
      if (typeof value === "string" && !validLaminates.includes(value.toLowerCase())) {
        delete memory[field];
      }
    });
  }

  if (validPlywood) {
    CABINET_PLYWOOD_FIELDS.forEach((field) => {
      const value = memory[field];
      if (typeof value === "string" && !validPlywood.includes(value.toLowerCase())) {
        delete memory[field];
      }
    });
  }

  return memory as Partial<CabinetFormMemory>;
}

function sanitizeShutterMemory(
  raw: Record<string, unknown> | null,
  validLaminates?: string[],
  validPlywood?: string[]
): Partial<ShutterFormMemory> {
  const memory: Record<string, unknown> = raw ? { ...raw } : { ...EMPTY_SHUTTER_FORM_MEMORY };

  if (validLaminates) {
    SHUTTER_LAMINATE_FIELDS.forEach((field) => {
      const value = memory[field];
      if (typeof value === "string" && !validLaminates.includes(value.toLowerCase())) {
        delete memory[field];
      }
    });
  }

  if (validPlywood) {
    SHUTTER_PLYWOOD_FIELDS.forEach((field) => {
      const value = memory[field];
      if (typeof value === "string" && !validPlywood.includes(value.toLowerCase())) {
        delete memory[field];
      }
    });
  }

  return memory as Partial<ShutterFormMemory>;
}

function createMockState(mock?: HomePageMockData): MockState | null {
  if (!mock) return null;
  return {
    cabinetFormMemory: { ...(mock.cabinetFormMemory ?? EMPTY_CABINET_FORM_MEMORY) },
    shutterFormMemory: { ...(mock.shutterFormMemory ?? EMPTY_SHUTTER_FORM_MEMORY) },
    laminateTracking: toSet(mock.laminateTracking),
    promptedClients: toSet(mock.promptedClients),
    spreadsheet: mock.spreadsheet ?? { ...EMPTY_SPREADSHEET_SNAPSHOT },
  };
}

function readCabinetRaw(mockState: MockState | null): Record<string, unknown> | null {
  if (mockState) return { ...mockState.cabinetFormMemory } as Record<string, unknown>;
  return readCabinetFormMemory();
}

function readShutterRaw(mockState: MockState | null): Record<string, unknown> | null {
  if (mockState) return { ...mockState.shutterFormMemory } as Record<string, unknown>;
  return readShutterFormMemory();
}

function writeCabinetMemory(mockState: MockState | null, values: CabinetFormMemory): void {
  if (mockState) {
    mockState.cabinetFormMemory = { ...values };
    return;
  }
  writeCabinetFormMemory(values);
}

function writeShutterMemory(mockState: MockState | null, values: ShutterFormMemory): void {
  if (mockState) {
    mockState.shutterFormMemory = { ...values };
    return;
  }
  writeShutterFormMemory(values);
}

export function createHomePageService(mock?: HomePageMockData): HomePageService {
  const mockState = createMockState(mock);

  return {
    getCabinetFormMemory: (validLaminates, validPlywood) =>
      sanitizeCabinetMemory(readCabinetRaw(mockState), validLaminates, validPlywood),
    saveCabinetFormMemory: (values) => writeCabinetMemory(mockState, values),
    getShutterFormMemory: (validLaminates, validPlywood) =>
      sanitizeShutterMemory(readShutterRaw(mockState), validLaminates, validPlywood),
    saveShutterFormMemory: (values) => writeShutterMemory(mockState, values),
    cleanOrphanedMaterials: (validLaminates, validPlywood) => {
      let totalCleaned = 0;

      const shutterMemory = readShutterRaw(mockState);
      if (shutterMemory) {
        const cleanedShutter = { ...shutterMemory };
        let changed = false;

        SHUTTER_LAMINATE_FIELDS.forEach((field) => {
          const value = cleanedShutter[field];
          if (typeof value === "string" && !validLaminates.includes(value.toLowerCase())) {
            delete cleanedShutter[field];
            changed = true;
            totalCleaned += 1;
          }
        });

        SHUTTER_PLYWOOD_FIELDS.forEach((field) => {
          const value = cleanedShutter[field];
          if (typeof value === "string" && !validPlywood.includes(value.toLowerCase())) {
            delete cleanedShutter[field];
            changed = true;
            totalCleaned += 1;
          }
        });

        if (changed) {
          writeShutterMemory(mockState, cleanedShutter as ShutterFormMemory);
        }
      }

      const cabinetMemory = readCabinetRaw(mockState);
      if (cabinetMemory) {
        const cleanedCabinet = { ...cabinetMemory };
        let changed = false;

        CABINET_LAMINATE_FIELDS.forEach((field) => {
          const value = cleanedCabinet[field];
          if (typeof value === "string" && !validLaminates.includes(value.toLowerCase())) {
            delete cleanedCabinet[field];
            changed = true;
            totalCleaned += 1;
          }
        });

        CABINET_PLYWOOD_FIELDS.forEach((field) => {
          const value = cleanedCabinet[field];
          if (typeof value === "string" && !validPlywood.includes(value.toLowerCase())) {
            delete cleanedCabinet[field];
            changed = true;
            totalCleaned += 1;
          }
        });

        if (changed) {
          writeCabinetMemory(mockState, cleanedCabinet as CabinetFormMemory);
        }
      }

      return totalCleaned;
    },
    getLaminateTracking: () => {
      if (mockState) return new Set(mockState.laminateTracking);
      return toSet(readLaminateTracking());
    },
    saveLaminateTracking: (tracking) => {
      if (mockState) {
        mockState.laminateTracking = new Set(tracking);
        return;
      }
      writeLaminateTracking(Array.from(tracking));
    },
    clearLaminateTracking: () => {
      if (mockState) {
        mockState.laminateTracking = createEmptyLaminateTracking();
        return;
      }
      clearLaminateTracking();
    },
    getPromptedClients: () => {
      if (mockState) return new Set(mockState.promptedClients);
      return toSet(readPromptedClients());
    },
    getSpreadsheetSnapshot: () => {
      if (mockState) return { ...mockState.spreadsheet };
      return readSpreadsheetSnapshot();
    },
  };
}

export const homePageService = createHomePageService();
