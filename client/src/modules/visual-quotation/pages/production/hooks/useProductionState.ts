/**
 * useProductionState Hook
 * -----------------------
 * Manages all local state for Production page.
 * Handles localStorage persistence via storageService.
 */

import { useState, useCallback, useEffect, useMemo } from "react";
import { useDesignCanvasStore } from "../../../store/v2/useDesignCanvasStore";
import { useQuotationMetaStore } from "../../../store/v2/useQuotationMetaStore";
import { useRoomStore } from "../../../store/v2/useRoomStore";
import { usePricingStore } from "../../../store/v2/usePricingStore";
import { buildCutlistItems, type ProductionPanelItem } from "../../../engine/productionEngine";
import {
  loadSavedMaterials,
  saveMaterials,
  loadPanelOverrides,
  savePanelOverrides,
  loadGaddiSettings,
  saveGaddiSettings,
  loadDeletedPanels,
  saveDeletedPanels,
  loadUnitGapSettings,
  saveUnitGapSettings,
  type ProductionMaterials,
  type PanelOverrides,
  type GaddiSettings,
  type UnitGapSettings,
} from "../../../services/storageService";
import {
  buildCadGroups,
  calculateGapAdjustedDimensions,
  calculateOverallDimensionChange,
  getFilteredProductionItems,
  calculateProductionStats,
  DEFAULT_GAP_MM,
  type CadGroup,
} from "../../../services/productionService";

export interface EditingState {
  unitKey: string;
  panelId: string | null;
  field: "width" | "height";
}

export interface UseProductionStateReturn {
  // Data
  items: ProductionPanelItem[];
  cadGroups: CadGroup[];
  hasData: boolean;
  stats: { totalPanels: number; shutterCount: number; loftCount: number };

  // Materials
  materials: ProductionMaterials;
  setPlywood: (value: string) => void;
  setFrontLaminate: (value: string) => void;
  setInnerLaminate: (value: string) => void;
  isMaterialsSelected: boolean;

  // Panel overrides
  panelOverrides: PanelOverrides;
  handlePanelDimensionChange: (panelId: string, field: "width" | "height", value: number) => void;

  // Gaddi settings
  gaddiSettings: GaddiSettings;
  handleToggleGaddi: (panelId: string) => void;

  // Grain settings (read-only)
  grainSettings: Record<string, boolean>;

  // Deleted panels
  deletedPanels: Set<string>;
  handleDeletePanel: (panelId: string) => void;

  // Unit gaps
  unitGapSettings: UnitGapSettings;
  handleGapChange: (unitKey: string, gap: number) => void;

  // Editing state
  editing: EditingState | null;
  editValue: string;
  startEdit: (unitKey: string, panelId: string | null, field: "width" | "height", currentValue: number) => void;
  handleValueChange: (value: string) => void;
  closeEdit: () => void;

  // Store data (for export)
  storeData: {
    client: any;
    meta: any;
    productionSettings: any;
    productionCanvasSnapshots: Map<string, string>;
  };
}

export function useProductionState(): UseProductionStateReturn {
  // Get store data from V2 stores
  const { client, meta } = useQuotationMetaStore();
  const { quotationRooms, activeRoomIndex } = useRoomStore();
  const { drawnUnits, productionCanvasSnapshots } = useDesignCanvasStore();
  const { productionSettings, units } = usePricingStore();

  // Get initial material settings from store
  const storePlywood = units[0]?.wardrobeConfig?.carcass?.material || "";
  const storeFrontLam = units[0]?.finish?.shutterLaminateCode || "";
  const storeInnerLam = units[0]?.finish?.innerLaminateCode || "";
  const loftLaminateCode = units[0]?.finish?.loftLaminateCode;
  const isNewClient = !storePlywood && !storeFrontLam && !storeInnerLam;

  // Materials state - priority: store > localStorage > default
  const [plywoodBrand, setPlywoodBrand] = useState(() => {
    if (storePlywood) return storePlywood;
    if (isNewClient) return loadSavedMaterials().plywood;
    return "Century";
  });

  const [frontLaminate, setFrontLaminate] = useState(() => {
    if (storeFrontLam) return storeFrontLam;
    if (isNewClient) return loadSavedMaterials().frontLaminate;
    return "";
  });

  const [innerLaminate, setInnerLaminate] = useState(() => {
    if (storeInnerLam) return storeInnerLam;
    if (isNewClient) return loadSavedMaterials().innerLaminate;
    return "";
  });

  // Panel state from localStorage
  const [panelOverrides, setPanelOverrides] = useState<PanelOverrides>(() => loadPanelOverrides());
  const [gaddiSettings, setGaddiSettings] = useState<GaddiSettings>(() => loadGaddiSettings());
  const [deletedPanels, setDeletedPanels] = useState<Set<string>>(() => loadDeletedPanels());
  const [unitGapSettings, setUnitGapSettings] = useState<UnitGapSettings>(() => loadUnitGapSettings());

  // Grain settings (read-only for now)
  const [grainSettings] = useState<Record<string, boolean>>({});

  // Editing state
  const [editing, setEditing] = useState<EditingState | null>(null);
  const [editValue, setEditValue] = useState("");

  // Save to localStorage on change
  useEffect(() => { saveMaterials({ plywood: plywoodBrand }); }, [plywoodBrand]);
  useEffect(() => { saveMaterials({ frontLaminate }); }, [frontLaminate]);
  useEffect(() => { saveMaterials({ innerLaminate }); }, [innerLaminate]);
  useEffect(() => { savePanelOverrides(panelOverrides); }, [panelOverrides]);
  useEffect(() => { saveGaddiSettings(gaddiSettings); }, [gaddiSettings]);
  useEffect(() => { saveUnitGapSettings(unitGapSettings); }, [unitGapSettings]);
  useEffect(() => { saveDeletedPanels(deletedPanels); }, [deletedPanels]);

  // Build production items
  const allItems = useMemo(
    () => buildCutlistItems({
      quotationRooms,
      currentDrawnUnits: drawnUnits,
      activeRoomIndex,
      settings: productionSettings,
      shutterLaminateCode: storeFrontLam,
      loftLaminateCode,
    }),
    [quotationRooms, drawnUnits, activeRoomIndex, productionSettings, storeFrontLam, loftLaminateCode]
  );

  // Filter and transform items
  const items = useMemo(
    () => getFilteredProductionItems(allItems, deletedPanels, panelOverrides),
    [allItems, deletedPanels, panelOverrides]
  );

  // Build CAD groups
  const cadGroups = useMemo(() => buildCadGroups(items), [items]);

  // Stats
  const stats = useMemo(() => calculateProductionStats(items), [items]);

  const hasData = items.length > 0;
  const isMaterialsSelected = Boolean(plywoodBrand && frontLaminate && innerLaminate);

  // Handlers
  const handlePanelDimensionChange = useCallback((panelId: string, field: "width" | "height", value: number) => {
    if (value < 1) return;
    setPanelOverrides(prev => ({
      ...prev,
      [panelId]: { ...prev[panelId], [field]: value },
    }));
  }, []);

  const handleToggleGaddi = useCallback((panelId: string) => {
    setGaddiSettings(prev => ({
      ...prev,
      [panelId]: !(prev[panelId] ?? false),
    }));
  }, []);

  const handleDeletePanel = useCallback((panelId: string) => {
    if (window.confirm("Remove this panel from the cut list?")) {
      setDeletedPanels(prev => new Set([...prev, panelId]));
    }
  }, []);

  const handleGapChange = useCallback((unitKey: string, newGap: number) => {
    const group = cadGroups.find(g => g.key === unitKey);
    if (!group) {
      setUnitGapSettings(prev => ({ ...prev, [unitKey]: newGap }));
      return;
    }

    const oldGap = unitGapSettings[unitKey] ?? DEFAULT_GAP_MM;
    const newOverrides = calculateGapAdjustedDimensions(group, oldGap, newGap, panelOverrides);

    setPanelOverrides(prev => ({ ...prev, ...newOverrides }));
    setUnitGapSettings(prev => ({ ...prev, [unitKey]: newGap }));
  }, [cadGroups, unitGapSettings, panelOverrides]);

  const handleOverallDimensionChange = useCallback((unitKey: string, field: "width" | "height", newValue: number) => {
    const group = cadGroups.find(g => g.key === unitKey);
    if (!group || newValue < 1) return;

    const gapMm = unitGapSettings[unitKey] ?? DEFAULT_GAP_MM;
    const newOverrides = calculateOverallDimensionChange(group, field, newValue, gapMm, panelOverrides);

    setPanelOverrides(prev => ({ ...prev, ...newOverrides }));
  }, [cadGroups, unitGapSettings, panelOverrides]);

  const startEdit = useCallback((unitKey: string, panelId: string | null, field: "width" | "height", currentValue: number) => {
    setEditing({ unitKey, panelId, field });
    setEditValue(String(currentValue));
  }, []);

  const handleValueChange = useCallback((newValue: string) => {
    setEditValue(newValue);

    if (!editing) return;
    const value = Math.max(1, Number(newValue) || 0);
    if (value < 1) return;

    if (editing.panelId === null) {
      handleOverallDimensionChange(editing.unitKey, editing.field, value);
    }
  }, [editing, handleOverallDimensionChange]);

  const closeEdit = useCallback(() => {
    setEditing(null);
    setEditValue("");
  }, []);

  return {
    // Data
    items,
    cadGroups,
    hasData,
    stats,

    // Materials
    materials: { plywood: plywoodBrand, frontLaminate, innerLaminate },
    setPlywood: setPlywoodBrand,
    setFrontLaminate,
    setInnerLaminate,
    isMaterialsSelected,

    // Panel overrides
    panelOverrides,
    handlePanelDimensionChange,

    // Gaddi
    gaddiSettings,
    handleToggleGaddi,

    // Grain
    grainSettings,

    // Deleted
    deletedPanels,
    handleDeletePanel,

    // Gaps
    unitGapSettings,
    handleGapChange,

    // Editing
    editing,
    editValue,
    startEdit,
    handleValueChange,
    closeEdit,

    // Store data for export
    storeData: {
      client,
      meta,
      productionSettings,
      productionCanvasSnapshots,
    },
  };
}
