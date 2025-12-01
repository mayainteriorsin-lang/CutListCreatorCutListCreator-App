import { z } from "zod";
import { pgTable, varchar, timestamp, serial, text } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { sql } from "drizzle-orm";

// ✅ CENTRAL LAMINATE CODE GODOWN (Warehouse) - Single source of truth for all laminate codes

export const shutterTypes = ['Glass Panel', 'Mesh Panel'] as const;
export type ShutterType = string; // Now accepts any laminate code

export const cabinetTypes = [
  { value: 'single', label: '1 Shutter', doors: 1, defaultWidth: 300 },
  { value: 'double', label: '2 Shutter', doors: 2, defaultWidth: 600 },
  { value: 'triple', label: '3 Shutter', doors: 3, defaultWidth: 900 },
  { value: 'four', label: '4 Shutter', doors: 4, defaultWidth: 1200 },
  { value: 'five', label: '5 Shutter', doors: 5, defaultWidth: 1500 },
  { value: 'six', label: '6 Shutter', doors: 6, defaultWidth: 1800 },
  { value: 'seven', label: '7 Shutter', doors: 7, defaultWidth: 2100 },
  { value: 'eight', label: '8 Shutter', doors: 8, defaultWidth: 2400 },
  { value: 'nine', label: '9 Shutter', doors: 9, defaultWidth: 2700 },
  { value: 'ten', label: '10 Shutter', doors: 10, defaultWidth: 3000 },
  { value: 'custom', label: 'Custom', doors: 0, defaultWidth: 450 }
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
  
  // Individual panel gaddi toggles
  topPanelGaddi: z.boolean().default(false).optional(),
  bottomPanelGaddi: z.boolean().default(false).optional(),
  leftPanelGaddi: z.boolean().default(false).optional(),
  rightPanelGaddi: z.boolean().default(false).optional(),
  
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
  // Replaces: plywoodType, backPanelPlywoodBrand, shutterPlywoodBrand
  A: z.string().optional(),
  
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
  code: varchar("code", { length: 255 }).notNull().unique(), // e.g., "456SF"
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
  sheetWidth: varchar("sheet_width", { length: 50 }).notNull().default('1210'),
  sheetHeight: varchar("sheet_height", { length: 50 }).notNull().default('2420'),
  kerf: varchar("kerf", { length: 50 }).notNull().default('5'),
  masterLaminateCode: varchar("master_laminate_code", { length: 255 }), // ✅ Master laminate code - owner of all new codes
  updatedAt: timestamp("updated_at").default(sql`now()`).notNull(),
});

// Insert schemas
export const insertLaminateCodeGodownSchema = createInsertSchema(laminateCodeGodown).omit({ id: true, createdAt: true, updatedAt: true });
export const insertLaminateMemorySchema = createInsertSchema(laminateMemory);
export const insertLaminateWoodGrainsPreferenceSchema = createInsertSchema(laminateWoodGrainsPreference);
export const insertPlywoodBrandMemorySchema = createInsertSchema(plywoodBrandMemory);
export const insertQuickShutterMemorySchema = createInsertSchema(quickShutterMemory);
export const insertMasterSettingsMemorySchema = createInsertSchema(masterSettingsMemory);

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
