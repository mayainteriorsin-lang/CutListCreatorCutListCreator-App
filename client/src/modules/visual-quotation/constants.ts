// Visual-quotation module constants
// UNIT_TYPE_LABELS and formatUnitTypeLabel re-exported from shared domain constants
// (extracted to @/constants/unitTypes to eliminate cross-module circular dependencies)

export { UNIT_TYPE_LABELS, formatUnitTypeLabel } from "@/constants/unitTypes";

export const FLOOR_OPTIONS = [
  { value: "ground", label: "Ground" },
  { value: "first", label: "1st Floor" },
  { value: "second", label: "2nd Floor" },
  { value: "third", label: "3rd Floor" },
  { value: "fourth", label: "4th Floor" },
  { value: "fifth", label: "5th Floor" },
  { value: "basement", label: "Basement" },
  { value: "terrace", label: "Terrace" },
] as const;

export const ROOM_OPTIONS = [
  { value: "master_bedroom", label: "Master Bedroom" },
  { value: "bedroom_1", label: "Bedroom 1" },
  { value: "bedroom_2", label: "Bedroom 2" },
  { value: "bedroom_3", label: "Bedroom 3" },
  { value: "bedroom_4", label: "Bedroom 4" },
  { value: "kids_room", label: "Kids Room" },
  { value: "guest_room", label: "Guest Room" },
  { value: "dressing_room", label: "Dressing Room" },
  { value: "kitchen", label: "Kitchen" },
  { value: "service_area", label: "Service Area" },
  { value: "living_room", label: "Living Room" },
  { value: "dining", label: "Dining" },
  { value: "study", label: "Study" },
  { value: "home_office", label: "Home Office" },
  { value: "pooja", label: "Pooja Room" },
  { value: "utility", label: "Utility" },
  { value: "store_room", label: "Store Room" },
  { value: "wash_area", label: "Wash Area" },
  { value: "foyer", label: "Foyer" },
  { value: "passage", label: "Passage" },
  { value: "powder_room", label: "Powder Room" },
  { value: "servant_room", label: "Servant Room" },
  { value: "balcony", label: "Balcony" },
  { value: "other", label: "Other" },
] as const;

// Helper function to generate room name from room and floor values
export function generateRoomName(roomValue: string, floorValue: string): string {
  const roomLabel = ROOM_OPTIONS.find(r => r.value === roomValue)?.label || "Room";
  const floorLabel = FLOOR_OPTIONS.find(f => f.value === floorValue)?.label || "";
  return floorLabel && floorLabel !== "Ground" ? `${roomLabel} (${floorLabel})` : roomLabel;
}

// ============================================================================
// Rate Card Constants
// ============================================================================

/**
 * Rate Card IDs - Single source of truth
 * Used by Toolbar dropdown and Rate Card page.
 */
export const RATE_CARD_IDS = {
  shutter: "RC-SHT",
  shutter_loft: "RC-SHL",
  loft_only: "RC-LFT",
  iso_kitchen: "RC-KIT",
} as const;

export type RateCardId = typeof RATE_CARD_IDS[keyof typeof RATE_CARD_IDS];
export type RateCardKey = keyof typeof RATE_CARD_IDS;

/**
 * Material Specs for each Rate Card type
 */
export interface RateCardMaterialSpecs {
  plywoodThickness: string;
  laminateThickness: string;
  innerLaminateThickness: string;
  thumbnail?: string; // URL or path to thumbnail image
}

export const DEFAULT_RATE_CARD_SPECS: Record<RateCardKey, RateCardMaterialSpecs> = {
  shutter: {
    plywoodThickness: "18mm BWP",
    laminateThickness: "1mm",
    innerLaminateThickness: "0.8mm",
  },
  shutter_loft: {
    plywoodThickness: "18mm BWP",
    laminateThickness: "1mm",
    innerLaminateThickness: "0.8mm",
  },
  loft_only: {
    plywoodThickness: "12mm MR",
    laminateThickness: "0.8mm",
    innerLaminateThickness: "0.7mm",
  },
  iso_kitchen: {
    plywoodThickness: "18mm BWP",
    laminateThickness: "1mm",
    innerLaminateThickness: "0.8mm",
  },
};

// ============================================================================
// Material Photos
// ============================================================================

/**
 * Get material photo URL based on material type and name
 */
export function getMaterialPhotoUrl(materialType: string, materialName?: string): string | undefined {
  // Placeholder - returns undefined for now, can be extended to return actual photo URLs
  return undefined;
}

/**
 * Get loft photo URL
 */
export function getLoftPhotoUrl(): string | undefined {
  // Placeholder - returns undefined for now
  return undefined;
}
