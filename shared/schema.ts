import { z } from "zod";
import { pgTable, varchar, timestamp, serial, text } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { sql } from "drizzle-orm";

// ✅ CENTRAL LAMINATE CODE GODOWN (Warehouse) - Single source of truth for all laminate codes

// PATCH 18: Extracted magic numbers
export const DEFAULT_WIDTHS = {
  Single: 300,
  Double: 600,
  Triple: 900,
  Four: 1200,
  Five: 1500,
  Six: 1800,
  Seven: 2100,
  Eight: 2400,
  Nine: 2700,
  Ten: 3000,
  Custom: 450
} as const;

export const DEFAULT_REDUCTIONS = {
  Width: 36,
  BackPanelWidth: 20,
  BackPanelHeight: 20,
  CenterPostHeight: 50,
  CenterPostDepth: 50
} as const;

export const shutterTypes = ['Glass Panel', 'Mesh Panel'] as const;
export type ShutterType = string; // Now accepts any laminate code

export const cabinetTypes = [
  { value: 'single', label: '1 Shutter', doors: 1, defaultWidth: DEFAULT_WIDTHS.Single },
  { value: 'double', label: '2 Shutter', doors: 2, defaultWidth: DEFAULT_WIDTHS.Double },
  { value: 'triple', label: '3 Shutter', doors: 3, defaultWidth: DEFAULT_WIDTHS.Triple },
  { value: 'four', label: '4 Shutter', doors: 4, defaultWidth: DEFAULT_WIDTHS.Four },
  { value: 'five', label: '5 Shutter', doors: 5, defaultWidth: DEFAULT_WIDTHS.Five },
  { value: 'six', label: '6 Shutter', doors: 6, defaultWidth: DEFAULT_WIDTHS.Six },
  { value: 'seven', label: '7 Shutter', doors: 7, defaultWidth: DEFAULT_WIDTHS.Seven },
  { value: 'eight', label: '8 Shutter', doors: 8, defaultWidth: DEFAULT_WIDTHS.Eight },
  { value: 'nine', label: '9 Shutter', doors: 9, defaultWidth: DEFAULT_WIDTHS.Nine },
  { value: 'ten', label: '10 Shutter', doors: 10, defaultWidth: DEFAULT_WIDTHS.Ten },
  { value: 'custom', label: 'Custom', doors: 0, defaultWidth: DEFAULT_WIDTHS.Custom }
] as const;

export type CabinetType = typeof cabinetTypes[number]['value'];

export const panelSchema = z.object({
  id: z.string().optional(), // Unique panel ID with grain status (e.g., "cabinet-TOP-grain-true")
  name: z.string(),
  width: z.number().positive(),
  height: z.number().positive(),
  laminateCode: z.string().optional(), // Laminate code for sheet separation
  quantity: z.number().optional(),
  type: z.string().optional(),
  roomName: z.string().optional(),
  gaddi: z.boolean().optional(),
  grainDirection: z.boolean().optional(), // Wood grain direction flag (prevents rotation)
  A: z.string().optional(), // Main plywood brand (for regular panels)
  backPanelPlywoodBrand: z.string().optional(), // Separate back panel plywood brand
  plywoodType: z.string().optional(), // Explicit plywood type field
  nomW: z.number().positive().optional(), // Nominal width (original size before rotation)
  nomH: z.number().positive().optional(), // Nominal height (original size before rotation)
});

export const shutterSchema = z.object({
  width: z.number().positive(),
  height: z.number().positive(),
  laminateCode: z.string().optional(),
  innerLaminateCode: z.string().optional(),
  laminateAutoSynced: z.boolean().optional(), // Track if laminate code should auto-sync
});

export const cabinetSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Cabinet name is required"),
  type: z.enum(['single', 'double', 'triple', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'custom']).default('single'),
  height: z.number().positive("Height must be positive"),
  width: z.number().positive("Width must be positive"),
  depth: z.number().min(0, "Depth cannot be negative"),
  configurationMode: z.enum(['basic', 'advanced']).default('advanced').optional(),
  centerPostEnabled: z.boolean().default(false),
  centerPostQuantity: z.number().min(1).max(4).default(1),
  centerPostHeight: z.number().positive("Center post height must be positive").default(50),
  centerPostDepth: z.number().positive("Center post depth must be positive").default(50),
  centerPostLaminateCode: z.string().optional(),
  centerPostInnerLaminateCode: z.string().optional(),
  shelvesQuantity: z.number().min(1).max(5).default(1),
  shelvesEnabled: z.boolean().default(false),
  shelvesLaminateCode: z.string().optional(),
  shelvesInnerLaminateCode: z.string().optional(),
  widthReduction: z.number().min(0).default(36),
  backPanelWidthReduction: z.number().min(0).default(20),
  backPanelHeightReduction: z.number().min(0).default(20),

  // Shutters
  shuttersEnabled: z.boolean().default(false),
  shutterCount: z.number().min(0).default(0),
  shutterType: z.string().default('WW001'),
  shutterHeightReduction: z.number().min(0).max(20).default(0),
  shutterWidthReduction: z.number().min(0).max(5).default(0),
  shutters: z.array(shutterSchema).default([]),

  // ✅ CENTRALIZED: All panels reference codes from central godown
  // Instead of storing full codes, store the code string (which is looked up from godown)
  topPanelLaminateCode: z.string().optional(),
  bottomPanelLaminateCode: z.string().optional(),
  leftPanelLaminateCode: z.string().optional(),
  rightPanelLaminateCode: z.string().optional(),
  backPanelLaminateCode: z.string().optional(),

  // Individual panel inner laminate codes (back/inside faces)
  topPanelInnerLaminateCode: z.string().optional(),
  bottomPanelInnerLaminateCode: z.string().optional(),
  leftPanelInnerLaminateCode: z.string().optional(),
  rightPanelInnerLaminateCode: z.string().optional(),
  backPanelInnerLaminateCode: z.string().optional(),

  // Inner laminate code (for inside/back faces of all panels - from Cabinet Configuration)
  innerLaminateCode: z.string().optional(),

  // Individual panel gaddi toggles - default TRUE for all sides
  topPanelGaddi: z.boolean().default(true).optional(),
  bottomPanelGaddi: z.boolean().default(true).optional(),
  leftPanelGaddi: z.boolean().default(true).optional(),
  rightPanelGaddi: z.boolean().default(true).optional(),

  // Individual panel grain direction toggles (for Front Laminate)
  topPanelGrainDirection: z.boolean().default(false).optional(),
  bottomPanelGrainDirection: z.boolean().default(false).optional(),
  leftPanelGrainDirection: z.boolean().default(false).optional(),
  rightPanelGrainDirection: z.boolean().default(false).optional(),
  backPanelGrainDirection: z.boolean().default(false).optional(),

  // Individual panel grain direction toggles (for Inner Laminate)
  topPanelInnerGrainDirection: z.boolean().default(false).optional(),
  bottomPanelInnerGrainDirection: z.boolean().default(false).optional(),
  leftPanelInnerGrainDirection: z.boolean().default(false).optional(),
  rightPanelInnerGrainDirection: z.boolean().default(false).optional(),
  backPanelInnerGrainDirection: z.boolean().default(false).optional(),

  // Shelves and center post grain direction toggles (for Inner Laminate)
  shelvesGrainDirection: z.boolean().default(false).optional(),
  centerPostGrainDirection: z.boolean().default(false).optional(),

  // Note field for additional information
  note: z.string().optional(),

  // Custom plywood type for Manual Type selection
  customPlywoodType: z.string().optional(),

  // ✅ UNIFIED PLYWOOD FIELD (Secret code name: A)
  // Used for Cabinet and Shutter panels (Top, Bottom, Left, Right, Shutters)
  A: z.string().optional(),

  // ✅ SEPARATE BACK PANEL PLYWOOD - Independent from main plywood brand
  backPanelPlywoodBrand: z.string().optional(),

  // ✅ PLYWOOD TYPE (Explicit field for UI compatibility)
  plywoodType: z.string().optional(),

  // ✅ SHUTTER PLYWOOD BRAND (Explicit field for UI compatibility)
  shutterPlywoodBrand: z.string().optional(),

  // ✅ UNIFIED LAMINATE CODE FIELDS (Secret code names: B = front, C = inner)
  // Backend consolidation fields for laminate codes
  // Keeps individual panel fields on frontend for UI, but uses B/C for backend storage
  B: z.string().optional(), // Front laminate codes consolidated
  C: z.string().optional(), // Inner laminate codes consolidated

  // Shutter laminate code for Quick Shutter
  shutterLaminateCode: z.string().optional(),

  // Shutter inner laminate code for Quick Shutter
  shutterInnerLaminateCode: z.string().optional(),

  // Shutter grain direction for Quick Shutter
  shutterGrainDirection: z.boolean().default(false).optional(),

  // Shutter Gaddi toggle for Quick Shutter
  shutterGaddi: z.boolean().default(false).optional(),

  // Room name field for cabinet categorization
  roomName: z.string().optional(),

  // Gaddi thickness field for Quick Shutter
  gaddiThickness: z.string().optional(),

  // Godown Storage Fields
  plywoodGodown: z.string().optional(),
  laminateGodown: z.string().optional(),
});

export const laminateCodeSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  supplier: z.string().optional(),
  thickness: z.number().optional(),
  color: z.string().optional(),
});

export const globalLaminateMemorySchema = z.object({
  id: z.string(),
  code: z.string(),
  createdAt: z.date().default(() => new Date()),
});

// ✅ CENTRAL LAMINATE CODE GODOWN (Warehouse) - Single source of truth
// This replaces laminate_memory, laminateWoodGrainsPreference, and all duplicate storage
export const laminateCodeGodown = pgTable("laminate_code_godown", {
  id: serial("id").primaryKey(),
  tenantId: varchar("tenant_id", { length: 255 }).notNull().default('default'),
  code: varchar("code", { length: 255 }).notNull(), // Code is unique per tenant now
  name: varchar("name", { length: 255 }).notNull(), // e.g., "Terra Wood"
  innerCode: varchar("inner_code", { length: 255 }), // e.g., "off white"
  supplier: varchar("supplier", { length: 255 }),
  thickness: varchar("thickness", { length: 50 }),
  description: text("description"),
  woodGrainsEnabled: varchar("wood_grains_enabled", { length: 10 }).notNull().default('false'), // ✅ Consolidated from separate table
  createdAt: timestamp("created_at").default(sql`now()`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`now()`).notNull(),
});

// ❌ DEPRECATED DATABASE TABLES - Data now consolidated in laminateCodeGodown
// DO NOT USE - Left for backward compatibility only
export const laminateMemory = pgTable("laminate_memory", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 255 }).notNull().unique(),
  createdAt: timestamp("created_at").default(sql`now()`).notNull(),
});

export const laminateWoodGrainsPreference = pgTable("laminate_wood_grains_preference", {
  id: serial("id").primaryKey(),
  laminateCode: varchar("laminate_code", { length: 255 }).notNull().unique(),
  woodGrainsEnabled: varchar("wood_grains_enabled", { length: 10 }).notNull().default('false'),
  createdAt: timestamp("created_at").default(sql`now()`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`now()`).notNull(),
});

export const plywoodBrandMemory = pgTable("plywood_brand_memory", {
  id: serial("id").primaryKey(),
  brand: varchar("brand", { length: 255 }).notNull().unique(),
  createdAt: timestamp("created_at").default(sql`now()`).notNull(),
});

export const quickShutterMemory = pgTable("quick_shutter_memory", {
  id: serial("id").primaryKey(),
  roomName: varchar("room_name", { length: 255 }),
  plywoodBrand: varchar("plywood_brand", { length: 255 }),
  laminateCode: varchar("laminate_code", { length: 255 }),
  updatedAt: timestamp("updated_at").default(sql`now()`).notNull(),
});

export const masterSettingsMemory = pgTable("master_settings_memory", {
  id: serial("id").primaryKey(),
  tenantId: varchar("tenant_id", { length: 255 }).notNull().default('default'),
  sheetWidth: varchar("sheet_width", { length: 50 }).notNull().default('1210'),
  sheetHeight: varchar("sheet_height", { length: 50 }).notNull().default('2420'),
  kerf: varchar("kerf", { length: 50 }).notNull().default('5'),
  masterLaminateCode: varchar("master_laminate_code", { length: 255 }), // ✅ Master laminate code - owner of all new codes
  masterPlywoodBrand: varchar("master_plywood_brand", { length: 255 }).default('Apple Ply 16mm BWP'), // ✅ Master plywood brand
  optimizePlywoodUsage: varchar("optimize_plywood_usage", { length: 10 }).notNull().default('true'), // ✅ Persisted toggle
  updatedAt: timestamp("updated_at").default(sql`now()`).notNull(),
});

// Insert schemas
export const insertLaminateCodeGodownSchema = createInsertSchema(laminateCodeGodown).omit({ id: true, createdAt: true, updatedAt: true });
export const insertLaminateMemorySchema = createInsertSchema(laminateMemory);
export const insertLaminateWoodGrainsPreferenceSchema = createInsertSchema(laminateWoodGrainsPreference);
export const insertPlywoodBrandMemorySchema = createInsertSchema(plywoodBrandMemory);
export const insertQuickShutterMemorySchema = createInsertSchema(quickShutterMemory);
export const insertMasterSettingsMemorySchema = createInsertSchema(masterSettingsMemory);

// ✅ GODOWN MEMORY - Auto-storage for Godown names
export const godownMemory = pgTable("godown_memory", {
  id: serial("id").primaryKey(),
  tenantId: varchar("tenant_id", { length: 255 }).notNull().default('default'),
  name: varchar("name", { length: 255 }).notNull().unique(), // Should really be unique per tenant, but keeping strict constraint for now or relax? Relaxing to unique index per tenant is better but keeping simple for migration.
  type: varchar("type", { length: 50 }).default('general'), // 'plywood' or 'laminate' or 'general'
  createdAt: timestamp("created_at").default(sql`now()`).notNull(),
});

export const insertGodownMemorySchema = createInsertSchema(godownMemory);

// ✅ MODULE LIBRARY - Persistent storage for saved design templates
export const libraryModules = pgTable("library_modules", {
  id: varchar("id", { length: 255 }).primaryKey(),
  tenantId: varchar("tenant_id", { length: 255 }).notNull().default('default'),

  // Basic info
  name: varchar("name", { length: 255 }).notNull(),
  unitType: varchar("unit_type", { length: 100 }).notNull(),
  description: text("description"),

  // Store full module configuration as JSON
  config: text("config").notNull(),

  // Metadata for querying
  category: varchar("category", { length: 50 }), // bedroom, kitchen, living, etc.
  tags: text("tags"), // Comma-separated tags

  // Publish settings
  published: varchar("published", { length: 10 }).default('false'),
  publishedAt: timestamp("published_at"),
  shareCode: varchar("share_code", { length: 50 }), // Unique code for sharing

  // Favorites and sorting
  favorite: varchar("favorite", { length: 10 }).default('false'),
  sortOrder: serial("sort_order"),

  createdAt: timestamp("created_at").default(sql`now()`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`now()`).notNull(),
});

export const insertLibraryModuleSchema = createInsertSchema(libraryModules).omit({ sortOrder: true });

// ✅ VISUAL QUOTATION STORAGE - Persistence for 3D quotation module
export const quotations = pgTable("quotations", {
  id: varchar("id", { length: 255 }).primaryKey(),
  tenantId: varchar("tenant_id", { length: 255 }).notNull().default('default'),
  leadId: varchar("lead_id", { length: 255 }),
  quoteId: varchar("quote_id", { length: 255 }),

  // Store entire Zustand state as JSON (preserves all data)
  state: text("state").notNull(),

  // Metadata for querying
  clientName: varchar("client_name", { length: 255 }),
  status: varchar("status", { length: 20 }),

  createdAt: timestamp("created_at").default(sql`now()`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`now()`).notNull(),
});

export const insertQuotationSchema = createInsertSchema(quotations);

export const cuttingListSchema = z.object({
  cabinets: z.array(cabinetSchema),
  laminateCodes: z.array(laminateCodeSchema).default([]),
  selectedLaminateCode: z.string().default(''),
  units: z.enum(['mm', 'inches']).default('mm'),
  generatedAt: z.date().default(() => new Date()),
});

export type Panel = z.infer<typeof panelSchema>;
export type Shutter = z.infer<typeof shutterSchema>;
export type Cabinet = z.infer<typeof cabinetSchema>;
export type LaminateCode = z.infer<typeof laminateCodeSchema>;
export type GlobalLaminateMemory = z.infer<typeof globalLaminateMemorySchema>;
export type CuttingList = z.infer<typeof cuttingListSchema>;

// Database types
export type LaminateCodeGodown = typeof laminateCodeGodown.$inferSelect;
export type InsertLaminateCodeGodown = z.infer<typeof insertLaminateCodeGodownSchema>;
export type LaminateMemory = typeof laminateMemory.$inferSelect;
export type InsertLaminateMemory = z.infer<typeof insertLaminateMemorySchema>;
export type LaminateWoodGrainsPreference = typeof laminateWoodGrainsPreference.$inferSelect;
export type InsertLaminateWoodGrainsPreference = z.infer<typeof insertLaminateWoodGrainsPreferenceSchema>;
export type PlywoodBrandMemory = typeof plywoodBrandMemory.$inferSelect;
export type InsertPlywoodBrandMemory = z.infer<typeof insertPlywoodBrandMemorySchema>;
export type QuickShutterMemory = typeof quickShutterMemory.$inferSelect;
export type InsertQuickShutterMemory = z.infer<typeof insertQuickShutterMemorySchema>;
export type MasterSettingsMemory = typeof masterSettingsMemory.$inferSelect;
export type InsertMasterSettingsMemory = z.infer<typeof insertMasterSettingsMemorySchema>;

export type GodownMemory = typeof godownMemory.$inferSelect;
export type InsertGodownMemory = z.infer<typeof insertGodownMemorySchema>;

export type LibraryModuleDB = typeof libraryModules.$inferSelect;
export type InsertLibraryModule = z.infer<typeof insertLibraryModuleSchema>;

export type Quotation = typeof quotations.$inferSelect;
export type InsertQuotation = z.infer<typeof insertQuotationSchema>;

export interface PanelGroup {
  laminateCode: string;
  panels: Panel[];
  totalArea: number;
}

export interface CuttingListSummary {
  panelGroups: PanelGroup[];
  totalArea: number;
  totalPanels: number;
}

// ✅ LAMINATE CODE HELPERS - Map frontend field names to backend 'B' field
export const laminateFieldMap = {
  top: 'topPanelLaminateCode',
  bottom: 'bottomPanelLaminateCode',
  left: 'leftPanelLaminateCode',
  right: 'rightPanelLaminateCode',
  back: 'backPanelLaminateCode',
  shutter: 'shutterLaminateCode',
  centerPost: 'centerPostLaminateCode',
  shelves: 'shelvesLaminateCode',
} as const;

export const laminateInnerFieldMap = {
  top: 'topPanelInnerLaminateCode',
  bottom: 'bottomPanelInnerLaminateCode',
  left: 'leftPanelInnerLaminateCode',
  right: 'rightPanelInnerLaminateCode',
  back: 'backPanelInnerLaminateCode',
  shutter: 'shutterInnerLaminateCode',
  centerPost: 'centerPostInnerLaminateCode',
  shelves: 'shelvesInnerLaminateCode',
} as const;

// ============================================================
// PATCH 11: Shared Type Contract Between Backend & Frontend
// ============================================================

// Cut Panel for Optimizer
export interface CutPanel {
  id: string;
  name?: string;
  height: number;
  width: number;
  gaddi?: boolean;
  grainDirection?: boolean;
  plywoodType?: string;
  laminateCode?: string;
  innerLaminateCode?: string;
  quantity?: number;
}

// Placed Panel (after optimization)
export interface PlacedPanel extends CutPanel {
  x: number;
  y: number;
  w?: number;
  h?: number;
  rotated?: boolean;
}

// Sheet result returned by optimizer
export interface Sheet {
  _sheetId: string;
  width: number;
  height: number;
  placed: PlacedPanel[];
  usedArea?: number;
  wasteArea?: number;
}

// Optimizer brand block
export interface BrandResult {
  brand: string;
  laminateCode: string;
  laminateDisplay: string;
  isBackPanel?: boolean;
  result: {
    panels: Sheet[];
  };
}

// Material summary types
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

// Wood grains preference map
export interface WoodGrainsMap {
  [laminateCode: string]: boolean;
}

// Manual panel with target sheet info (for placing on specific sheets)
export interface ManualPanel extends Panel {
  targetSheet?: {
    sheetId: string;
    key?: string;
  };
}

// Optimizer Engine types
export interface OptimizerEngineParams {
  cabinets: Cabinet[];
  manualPanels: ManualPanel[];
  sheetWidth: number;
  sheetHeight: number;
  kerf: number;
  woodGrainsPreferences: WoodGrainsMap;
  generatePanels: (cabinet: Cabinet) => Panel[];
}

export interface OptimizerEngineResult {
  brandResults: BrandResult[];
  error: Error | null;
}
