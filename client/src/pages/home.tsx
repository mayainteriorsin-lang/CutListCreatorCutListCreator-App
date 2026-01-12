import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
// PATCH 41: Stable callback hook to prevent effect loops
import { useStableCallback } from '@/lib/hooks/useStableCallback';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from "react-router-dom";
import { apiRequest, API_BASE } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
// PATCH 39: Centralized error toasting
import { toastError } from '@/lib/errors/toastError';
// PATCH 40: Runtime API guard
import { useApiGuard } from '@/lib/api/useApiGuard';
// PATCH 47: Feature flags
import { useFeature } from '@/lib/system/useFeature';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { PlywoodSelectorPanel, LaminateSelectorPanel } from "@/components/selectors";
import DesignCenter from "../components/ui/DesignCenter";
import Spreadsheet from '@/components/Spreadsheet';
import PreviewDialog from "@/components/cutlist-preview/PreviewDialog";
import ManualPanelDialog from "@/components/cutlist-preview/ManualPanelDialog";
import ClearConfirmDialog from "@/components/cutlist-preview/ClearConfirmDialog";
import MaterialValidationDialog from "@/components/cutlist-preview/MaterialValidationDialog";
import SpreadsheetSection from "@/components/cutlist-preview/SpreadsheetSection";
import DesignCenterSection from "@/components/cutlist-preview/DesignCenterSection";
import CabinetForm, { type CabinetFormProps } from "@/components/cabinet-form/CabinetForm";
import RenderGuard from "@/components/guards/RenderGuard";
import PanelDeleteDialog from "@/components/cutlist-preview/PanelDeleteDialog";
// PATCH 37: Loading + Empty states
import { LoadingBlock, EmptyBlock } from "@/components/system/StatusBlocks";
import { Cabinet, cabinetSchema, Panel, CuttingListSummary, LaminateCode, cabinetTypes, CabinetType, LaminateCodeGodown } from '@shared/schema';
import * as XLSX from 'xlsx';
// PATCH 29: Use export orchestrator for PDF generation
import { generateCutlistPDFForUpload, generatePDFFilename } from '@/lib/pdf';
import { generateMaterialListCSV } from '@/lib/material-list-export';
import { generateUUID } from "@/lib/uuid";
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import AppLayout from "@/components/layout/AppLayout";

// ✅ MODULES: Simple panel optimization
import { calculateGaddiLineDirection, shouldShowGaddiMarking } from '@/features/gaddi';
import { optimizeCutlist } from '@/lib/cutlist-optimizer';
import { composeLaminateCode } from '@/lib/laminates/composeLaminateCode';
import { generatePanels } from '@/lib/panels/generatePanels';
import { runOptimizerEngine } from '@/lib/optimizer';
// PATCH 32: Worker-safe optimizer imports
import { runOptimizerInWorker } from '@/lib/optimizer/runOptimizerWorker';
import type { BrandResult, Sheet } from '@shared/schema';
import { SummaryPanel } from '@/components/summary';
import { CabinetSummaryPanel } from '@/components/summary/CabinetSummaryPanel';
import { buildCuttingListSummary, buildMaterialSummary, calculateShutterCount } from '@/lib/summary';
import type { MaterialSummary } from '@/lib/summary';
import {
  validateBeforeAddCabinet,
  validateBeforeOptimize
} from "@/lib/validation/ValidationEngine";
import {
  getMasterDefaults,
  applyMasterDefaultsToCabinet,
  plywoodBrandExists,
  initializeMasterPlywoodBrand,
  initializeMasterLaminateCode,
  initializeMasterInnerLaminateCode,
  parseOptimizePlywoodUsage
} from "@/lib/settings/MasterSettingsEngine";
import {
  getFormDefaultValues,
  getFormResetValues,
  getCabinetResetDefaults,
  getQuickCabinetDefaults,
  hasWoodGrainPreference
} from "@/lib/form/FormDefaultsEngine";

// PATCH 22: Pure submission functions
import {
  prepareCabinet,
  extractCabinetMemory,
  extractShutterMemory,
  computeGrainDirections as computeGrainDirectionsPure,
  normalizeCabinetData as normalizeCabinetDataPure
} from "@/lib/submit";

// PATCH 23: Undo/Redo history
import { useHistory } from "@/lib/history";

// PATCH 24: Autosave & Recovery
import { loadAutosave, clearAutosave, useAutosave } from "@/lib/persist";

// Cabinet form memory helpers
const CABINET_FORM_MEMORY_KEY = 'cabinetFormMemory_v1';

// PATCH 27: Split material store into focused slices
import { useMasterSettingsStore, useGodownStore, usePreferencesStore } from '@/features/material';
import { useUIStore } from '@/features/uiStore';
// PATCH 28: Preview state isolation
import { usePreviewStore } from '@/features/preview';
import { safeFetchZod } from '@/lib/api/fetchZod';
// PATCH 42: Debounced fetch to prevent request storms
import { debouncedFetch } from '@/lib/api/debouncedFetch';
// PATCH 43: Centralized API client (available for future migrations)
import { apiGet, apiPost } from '@/lib/api/apiClient';
import {
  WoodGrainsPrefsSchema,
  MasterSettingsMemorySchema as ApiMasterSettingsMemorySchema
} from '@/lib/api/schemas';
import { normArray, normString, normBoolean, normNumber } from '@/lib/normalize';
import {
  WoodGrainsListSchema,
  MasterSettingsMemorySchema,
  safeValidate,
  safeValidateArray
} from '@shared/schemas';

interface CabinetFormMemory {
  roomName?: string;
  customRoomName?: string;
  height?: number;
  width?: number;
  depth?: number;
  widthReduction?: number;

  // Plywood brands for all panels
  plywoodType?: string;
  topPanelPlywoodBrand?: string;
  bottomPanelPlywoodBrand?: string;
  leftPanelPlywoodBrand?: string;
  rightPanelPlywoodBrand?: string;
  backPanelPlywoodBrand?: string;
  shutterPlywoodBrand?: string;

  // Front laminate codes for all panels
  topPanelLaminateCode?: string;
  bottomPanelLaminateCode?: string;
  leftPanelLaminateCode?: string;
  rightPanelLaminateCode?: string;
  backPanelLaminateCode?: string;
  shutterLaminateCode?: string;

  // Inner laminate codes for all panels
  topPanelInnerLaminateCode?: string;
  bottomPanelInnerLaminateCode?: string;
  leftPanelInnerLaminateCode?: string;
  rightPanelInnerLaminateCode?: string;
  backPanelInnerLaminateCode?: string;
  shutterInnerLaminateCode?: string;
}

// Load last cabinet form values from localStorage (with SSR safety)
// Optionally validates materials against current godown inventory
const loadCabinetFormMemory = (
  validLaminates?: string[],
  validPlywood?: string[]
): Partial<CabinetFormMemory> => {
  if (typeof window === 'undefined') return {};

  try {
    const stored = localStorage.getItem(CABINET_FORM_MEMORY_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);

      // Validate materials if validation arrays provided
      if (validLaminates || validPlywood) {
        const laminateFields = [
          'topPanelLaminateCode',
          'bottomPanelLaminateCode',
          'leftPanelLaminateCode',
          'rightPanelLaminateCode',
          'backPanelLaminateCode',
          'shutterLaminateCode',
          'shelfLaminateCode',
          // ✅ CRITICAL: Also validate inner laminate codes
          'topPanelInnerLaminateCode',
          'bottomPanelInnerLaminateCode',
          'leftPanelInnerLaminateCode',
          'rightPanelInnerLaminateCode',
          'backPanelInnerLaminateCode',
          'shutterInnerLaminateCode',
        ] as const;

        const plywoodFields = [
          'topPanelPlywoodBrand',
          'bottomPanelPlywoodBrand',
          'leftPanelPlywoodBrand',
          'rightPanelPlywoodBrand',
          'backPanelPlywoodBrand',
          'shutterPlywoodBrand',
          'shelfPlywoodBrand',
        ] as const;

        // Filter out deleted laminates
        if (validLaminates) {
          laminateFields.forEach(field => {
            if (parsed[field] && !validLaminates.includes(parsed[field].toLowerCase())) {
              delete parsed[field];
            }
          });
        }

        // Filter out deleted plywood
        if (validPlywood) {
          plywoodFields.forEach(field => {
            if (parsed[field] && !validPlywood.includes(parsed[field].toLowerCase())) {
              delete parsed[field];
            }
          });
        }
      }

      return parsed;
    }
  } catch (error) {
    console.error('Failed to load cabinet form memory:', error);
  }
  return {};
};

// Save cabinet form values to localStorage (with SSR safety)
const saveCabinetFormMemory = (values: CabinetFormMemory) => {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(CABINET_FORM_MEMORY_KEY, JSON.stringify(values));
  } catch (error) {
    console.error('Failed to save cabinet form memory:', error);
  }
};

// Shutter form memory helpers
const SHUTTER_FORM_MEMORY_KEY = 'shutterFormMemory_v1';

interface ShutterFormMemory {
  shutterPlywoodBrand?: string;
  shutterLaminateCode?: string;
  shutterInnerLaminateCode?: string;
}

// Load last shutter form values from localStorage (with SSR safety)
// Load shutter form values from localStorage (with SSR safety)
// Optionally validates materials against current godown inventory
const loadShutterFormMemory = (
  validLaminates?: string[],
  validPlywood?: string[]
): Partial<ShutterFormMemory> => {
  if (typeof window === 'undefined') return {};

  try {
    const stored = localStorage.getItem(SHUTTER_FORM_MEMORY_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);

      // Validate materials if validation arrays provided
      if (validLaminates || validPlywood) {
        // Filter out deleted laminates
        if (validLaminates) {
          if (parsed.shutterLaminateCode && !validLaminates.includes(parsed.shutterLaminateCode.toLowerCase())) {
            delete parsed.shutterLaminateCode;
          }
          if (parsed.shutterInnerLaminateCode && !validLaminates.includes(parsed.shutterInnerLaminateCode.toLowerCase())) {
            delete parsed.shutterInnerLaminateCode;
          }
        }

        // Filter out deleted plywood
        if (validPlywood) {
          if (parsed.shutterPlywoodBrand && !validPlywood.includes(parsed.shutterPlywoodBrand.toLowerCase())) {
            delete parsed.shutterPlywoodBrand;
          }
        }
      }

      return parsed;
    }
  } catch (error) {
    console.error('Failed to load shutter form memory:', error);
  }
  return {};
};

// Save shutter form values to localStorage (with SSR safety)
const saveShutterFormMemory = (values: ShutterFormMemory) => {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(SHUTTER_FORM_MEMORY_KEY, JSON.stringify(values));
  } catch (error) {
    console.error('Failed to save shutter form memory:', error);
  }
};

// Clean orphaned materials from localStorage (materials deleted from godown)
const cleanOrphanedMaterialsFromLocalStorage = (
  validLaminates: string[],
  validPlywood: string[]
) => {
  if (typeof window === 'undefined') return;

  try {
    let totalCleaned = 0;

    // Clean shutter form memory
    const shutterMemory = localStorage.getItem(SHUTTER_FORM_MEMORY_KEY);
    if (shutterMemory) {
      const parsed = JSON.parse(shutterMemory);
      let changed = false;

      if (parsed.shutterLaminateCode && !validLaminates.includes(parsed.shutterLaminateCode.toLowerCase())) {
        delete parsed.shutterLaminateCode;
        changed = true;
        totalCleaned++;
      }

      if (parsed.shutterInnerLaminateCode && !validLaminates.includes(parsed.shutterInnerLaminateCode.toLowerCase())) {
        delete parsed.shutterInnerLaminateCode;
        changed = true;
        totalCleaned++;
      }

      if (parsed.shutterPlywoodBrand && !validPlywood.includes(parsed.shutterPlywoodBrand.toLowerCase())) {
        delete parsed.shutterPlywoodBrand;
        changed = true;
        totalCleaned++;
      }

      if (changed) {
        localStorage.setItem(SHUTTER_FORM_MEMORY_KEY, JSON.stringify(parsed));
      }
    }

    // Clean cabinet form memory
    const cabinetMemory = localStorage.getItem(CABINET_FORM_MEMORY_KEY);
    if (cabinetMemory) {
      const parsed = JSON.parse(cabinetMemory);
      let changed = false;

      // Check laminate fields
      const laminateFields = [
        'topPanelLaminateCode',
        'bottomPanelLaminateCode',
        'leftPanelLaminateCode',
        'rightPanelLaminateCode',
        'backPanelLaminateCode',
        'shutterLaminateCode',
        'shutterInnerLaminateCode',
        'shelfLaminateCode',
      ];

      laminateFields.forEach(field => {
        if (parsed[field] && !validLaminates.includes(parsed[field].toLowerCase())) {
          delete parsed[field];
          changed = true;
          totalCleaned++;
        }
      });

      // Check plywood fields
      const plywoodFields = [
        'topPanelPlywoodBrand',
        'bottomPanelPlywoodBrand',
        'leftPanelPlywoodBrand',
        'rightPanelPlywoodBrand',
        'backPanelPlywoodBrand',
        'shutterPlywoodBrand',
        'shelfPlywoodBrand',
      ];

      plywoodFields.forEach(field => {
        if (parsed[field] && !validPlywood.includes(parsed[field].toLowerCase())) {
          delete parsed[field];
          changed = true;
          totalCleaned++;
        }
      });

      if (changed) {
        localStorage.setItem(CABINET_FORM_MEMORY_KEY, JSON.stringify(parsed));
      }
    }


    return totalCleaned;
  } catch (error) {
    console.error('Failed to clean orphaned materials from localStorage:', error);
    return 0;
  }
};

interface HomeProps {
  showAsCabinetsPage?: boolean;
}

export default function Home({ showAsCabinetsPage = false }: HomeProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  // PATCH 40: API guard for backend-dependent actions
  const { guard: apiGuard, status: apiStatus } = useApiGuard();
  // PATCH 47: Feature flag for optimizer worker
  const useWorker = useFeature("optimizerWorker");

  // PATCH 19: UI state from centralized store
  const {
    cabinetConfigMode,
    panelsLinked,
    showPreviewDialog,
    showManualPanelDialog,
    showClearConfirmDialog,
    showMaterialConfirmDialog,
    panelToDelete,
    isPreviewActive,
    setCabinetConfigMode,
    setPanelsLinked,
    openPreview,
    closePreview,
    openManualPanel,
    closeManualPanel,
    openClearConfirm,
    closeClearConfirm,
    openMaterialConfirm,
    closeMaterialConfirm,
    setPanelToDelete,
    setIsPreviewActive,
  } = useUIStore();
  const cabinetSectionRef = useRef<HTMLDivElement>(null);
  const projectDetailsSectionRef = useRef<HTMLDivElement>(null);
  const plywoodLaminatesRef = useRef<HTMLButtonElement>(null);
  const individualPanelsRef = useRef<HTMLButtonElement>(null);
  const centerPostSectionRef = useRef<HTMLDivElement>(null);
  const shutterConfigSectionRef = useRef<HTMLDivElement>(null);
  const designCenterSectionRef = useRef<HTMLDivElement>(null);
  const currentSyncOrigin = useRef<string | null>(null);
  const cabinetHeightInputRef = useRef<HTMLInputElement>(null);
  const shutterHeightInputRef = useRef<HTMLInputElement>(null);
  // PATCH 23: Use history hook for undo/redo support
  const cabinetsHistory = useHistory<Cabinet[]>([]);
  const cabinets = cabinetsHistory.present;
  const setCabinets = cabinetsHistory.set;
  const [units] = useState<'mm' | 'inches'>('mm');
  const [laminateCodes, setLaminateCodes] = useState<LaminateCode[]>([]);
  const [calculationLogicLocked, setCalculationLogicLocked] = useState<boolean>(true);
  const [selectedRoom, setSelectedRoom] = useState('Kitchen');
  const [customRoomName, setCustomRoomName] = useState('');
  const [clientName, setClientName] = useState('');
  const [cabinetConfigVisible, setCabinetConfigVisible] = useState(false);
  // PATCH 19: cabinetConfigMode moved to uiStore
  const [plywoodLaminatesOpen, setPlywoodLaminatesOpen] = useState(false); // Collapsible section for plywood and laminates - default CLOSED
  const [individualPanelsOpen, setIndividualPanelsOpen] = useState(true); // Collapsible section for individual panel laminate selection - defaults to OPEN for discussion/modification before creating cabinet
  const [projectDetailsVisible, setProjectDetailsVisible] = useState(false);
  const [designCenterVisible, setDesignCenterVisible] = useState(false);
  const [pdfOrientation] = useState<'landscape' | 'portrait'>('portrait');
  // PATCH 19: showPreviewDialog, isPreviewActive, showManualPanelDialog, showClearConfirmDialog, showMaterialConfirmDialog moved to uiStore
  // PATCH 28: deletedPreviewSheets, deletedPreviewPanels, selectedSheetContext moved to previewStore
  const deletedPreviewSheets = usePreviewStore((s) => s.deletedSheets);
  const deletedPreviewPanels = usePreviewStore((s) => s.deletedPanels);
  const selectedSheetContext = usePreviewStore((s) => s.selectedSheetContext);
  const setSelectedSheetContext = usePreviewStore((s) => s.setSelectedSheetContext);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [pendingMaterialAction, setPendingMaterialAction] = useState<{
    type: 'cabinet' | 'shutter';
    payload: any;
    onConfirm: () => void;
    missingPanels?: string[];
  } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  // PATCH 28: deletedPreviewPanels moved to previewStore (see above)
  const savedClientsRef = useRef<Set<string>>(new Set());

  // State for async optimization results
  const [previewBrandResults, setPreviewBrandResults] = useState<BrandResult[]>([]);
  const [liveMaterialSummary, setLiveMaterialSummary] = useState<MaterialSummary>({
    plywood: {},
    laminates: {},
    totalPlywoodSheets: 0
  });
  // PATCH 19: panelToDelete moved to uiStore
  // PATCH 28: selectedSheetContext moved to previewStore (see above)
  // PATCH 23: Manual panels type for history hook
  type ManualPanel = {
    id: string;
    name: string;
    height: number;
    width: number;
    laminateCode: string;
    plywoodType: string;
    quantity: number;
    grainDirection: boolean;
    gaddi: boolean;
    targetSheet?: {
      brand: string;
      laminateCode: string;
      isBackPanel: boolean;
      sheetId: string;
    };
  };

  // PATCH 23: Use history hook for undo/redo support
  const manualPanelsHistory = useHistory<ManualPanel[]>([]);
  const manualPanels = manualPanelsHistory.present;
  const setManualPanels = manualPanelsHistory.set;
  const [manualPanelForm, setManualPanelForm] = useState<{
    name: string;
    height: number | string;
    width: number | string;
    laminateCode: string;
    plywoodType: string;
    quantity: number;
    grainDirection: boolean;
    gaddi: boolean;
  }>({
    name: 'Manual Panel',
    height: '',
    width: '',
    laminateCode: '',
    plywoodType: 'Apple Ply 16mm BWP',
    quantity: 1,
    grainDirection: false,
    gaddi: true
  });
  const [colourFrameForm, setColourFrameForm] = useState({ height: 2400, width: 80, laminateCode: '', quantity: 1, note: '', customLaminateCode: '', plywoodType: 'Apple Ply 16mm BWP', grainDirection: false });
  const [colourFrameEnabled, setColourFrameEnabled] = useState(false);

  // Quotation state moved to /quotations page

  // PATCH 27: Master Settings state from split Zustand slices
  const masterSettings = useMasterSettingsStore(s => s.data);
  const isLoadingMasterSettings = useMasterSettingsStore(s => s.loading);
  const masterSettingsLoaded = useMasterSettingsStore(s => s.loaded);
  const fetchMasterSettings = useMasterSettingsStore(s => s.fetch);
  const saveMasterSettings = useMasterSettingsStore(s => s.save);

  // PATCH 27: Godown state from split slice
  const plywoodOptions = useGodownStore(s => s.plywoodOptions);
  const laminateOptions = useGodownStore(s => s.laminateOptions);
  const isLoadingMaterials = useGodownStore(s => s.loading);
  const materialsLoaded = useGodownStore(s => s.loaded);
  const fetchMaterials = useGodownStore(s => s.fetch);
  const addLaminate = useGodownStore(s => s.addLaminate);
  const addPlywood = useGodownStore(s => s.addPlywood);

  // PATCH 27: Preferences state from split slice (for future use)
  const fetchPreferences = usePreferencesStore(s => s.fetch);



  const [masterSettingsVisible, setMasterSettingsVisible] = useState(false);
  const [masterPlywoodBrand, setMasterPlywoodBrand] = useState('');
  const [masterLaminateCode, setMasterLaminateCode] = useState('');
  const [masterInnerLaminateCode, setMasterInnerLaminateCode] = useState('');

  // Wood grain preferences still tracked locally for now, but synced with types
  const [woodGrainsPreferences, setWoodGrainsPreferences] = useState<Record<string, boolean>>({});
  const [optimizePlywoodUsage, setOptimizePlywoodUsage] = useState(true);

  // PATCH 27: Initial Data Fetch - all slices
  useEffect(() => {
    fetchMasterSettings();
    fetchMaterials();
    fetchPreferences();
  }, []); // Run once on mount

  // PATCH 24: Restore autosaved data on mount
  useEffect(() => {
    const saved = loadAutosave();
    if (saved && (saved.cabinets.length > 0 || saved.panels.length > 0)) {
      setCabinets(saved.cabinets as Cabinet[]);
      setManualPanels(saved.panels as ManualPanel[]);
      console.log(`[Autosave] Restored ${saved.cabinets.length} cabinets and ${saved.panels.length} panels`);
    }
  }, []); // Run once on mount

  // PATCH 24: Enable autosave for cabinets and panels
  useAutosave(cabinets, manualPanels);

  // PATCH 23: Keyboard shortcuts for undo/redo
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input field
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      // Ctrl+Z or Cmd+Z for undo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        cabinetsHistory.undo();
        manualPanelsHistory.undo();
      }

      // Ctrl+Y or Ctrl+Shift+Z or Cmd+Shift+Z for redo
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'Z'))) {
        e.preventDefault();
        cabinetsHistory.redo();
        manualPanelsHistory.redo();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [cabinetsHistory, manualPanelsHistory]);

  useEffect(() => {
    if (masterSettings?.masterLaminateCode && !masterLaminateCode) {
      setMasterLaminateCode(masterSettings.masterLaminateCode);
    }
    const inner = (masterSettings as any)?.masterInnerLaminateCode ?? (masterSettings as any)?.innerLaminateCode;
    if (inner && !masterInnerLaminateCode) {
      setMasterInnerLaminateCode(inner);
    }

    // ✅ Initialize persistable optimization setting
    if (masterSettings && (masterSettings as any).optimizePlywoodUsage !== undefined) {
      // Backend stores as string "true"/"false" or maybe boolean depending on internal casting.
      // Drizzle schema said default 'true' (string). Let's safely handle both.
      const val = (masterSettings as any).optimizePlywoodUsage;
      setOptimizePlywoodUsage(val === 'true' || val === true);
    }
  }, [masterLaminateCode, masterSettings]);

  useEffect(() => {
    if (masterPlywoodBrand) return;
    const masterBrand = (masterSettings as any)?.masterPlywoodBrand;
    if (masterBrand) {
      setMasterPlywoodBrand(masterBrand);
      return;
    }
    if (!isLoadingMasterSettings && plywoodOptions.length > 0) {
      setMasterPlywoodBrand(plywoodOptions[0].brand);
    }
  }, [masterPlywoodBrand, masterSettings, plywoodOptions, isLoadingMasterSettings]);

  // Wrapper that uses the MasterSettingsEngine with component state
  const getLocalMasterDefaults = () => {
    return getMasterDefaults(masterPlywoodBrand, masterLaminateCode, masterInnerLaminateCode, masterSettings);
  };

  // Wrapper that applies defaults using the engine
  const applyDefaultsToCabinet = (cabinet: Cabinet): Cabinet => {
    const defaults = getLocalMasterDefaults();
    return applyMasterDefaultsToCabinet(cabinet, defaults);
  };

  // ✅ CRITICAL FIX: Persist tracking across page refreshes using localStorage
  const LAMINATE_TRACKING_KEY = 'userSelectedLaminates_v1';

  // Load initial tracking from localStorage
  const loadLaminateTracking = (): Set<string> => {
    if (typeof window === 'undefined') return new Set();
    try {
      const stored = localStorage.getItem(LAMINATE_TRACKING_KEY);
      if (stored) {
        const arr = JSON.parse(stored);
        return new Set(arr);
      }
    } catch (error) {
      console.error('Error loading laminate tracking from localStorage:', error);
    }
    return new Set();
  };

  // Track which laminate fields the user has explicitly selected
  const [userSelectedLaminates, setUserSelectedLaminates] = useState<Set<string>>(loadLaminateTracking);

  // Save tracking to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const arr = Array.from(userSelectedLaminates);
      localStorage.setItem(LAMINATE_TRACKING_KEY, JSON.stringify(arr));
    }
  }, [userSelectedLaminates]);

  // Helper to set laminate value and track source (user vs auto)
  const updateLaminateWithTracking = (field: string, value: string, source: 'user' | 'auto') => {
    form.setValue(field as any, value);
    if (source === 'user') {
      setUserSelectedLaminates(prev => {
        const updated = new Set(prev).add(field);
        return updated;
      });
    }
  };

  // Helper to mark a field as user-confirmed without changing value
  const markLaminateAsUserSelected = (field: string) => {
    setUserSelectedLaminates(prev => new Set(prev).add(field));
  };

  // Helper to clear user-selected tracking (on reset, mode switch, etc.)
  const clearUserLaminateTracking = () => {
    setUserSelectedLaminates(new Set());
    if (typeof window !== 'undefined') {
      localStorage.removeItem(LAMINATE_TRACKING_KEY);
    }
  };

  // Handle export from DesignCenter
  const handleDesignCenterExport = (data: { width: number; height: number; depth: number; name: string }) => {
    // Update Cabinet Form values
    form.setValue('width', data.width);
    form.setValue('height', data.height);
    form.setValue('depth', data.depth);
    form.setValue('name', data.name);

    // Save to cabinet form memory
    saveCabinetFormMemory({
      width: data.width,
      height: data.height,
      depth: data.depth
    });

    // Scroll to Cabinet Form section
    if (cabinetSectionRef.current) {
      cabinetSectionRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Sheet Size and Kerf Settings
  const [sheetWidth, setSheetWidth] = useState(1210);
  const [sheetHeight, setSheetHeight] = useState(2420);
  const [kerf, setKerf] = useState(5);

  // Individual cabinet type configurations
  const [cabinetConfigs, setCabinetConfigs] = useState<Record<CabinetType, { height: number, width: number, quantity: number, shutterQuantity: number }>>({
    single: { height: 0, width: 0, quantity: 1, shutterQuantity: 1 },
    double: { height: 0, width: 0, quantity: 1, shutterQuantity: 2 },
    triple: { height: 0, width: 0, quantity: 1, shutterQuantity: 3 },
    four: { height: 0, width: 0, quantity: 1, shutterQuantity: 4 },
    five: { height: 0, width: 0, quantity: 1, shutterQuantity: 5 },
    six: { height: 0, width: 0, quantity: 1, shutterQuantity: 6 },
    seven: { height: 0, width: 0, quantity: 1, shutterQuantity: 7 },
    eight: { height: 0, width: 0, quantity: 1, shutterQuantity: 8 },
    nine: { height: 0, width: 0, quantity: 1, shutterQuantity: 9 },
    ten: { height: 0, width: 0, quantity: 1, shutterQuantity: 10 },
    custom: { height: 0, width: 0, quantity: 1, shutterQuantity: 2 }
  });

  // PATCH 25: Memoize validation arrays helper
  const getValidationArrays = useCallback(() => {
    const validLaminates = !isLoadingMaterials && laminateOptions.length > 0
      ? laminateOptions.map(item => item.code.toLowerCase())
      : undefined;
    const validPlywood = !isLoadingMaterials && plywoodOptions.length > 0
      ? plywoodOptions.map(item => item.brand.toLowerCase())
      : undefined;
    return { validLaminates, validPlywood };
  }, [isLoadingMaterials, laminateOptions, plywoodOptions]);

  // ✅ CRITICAL: Run cleanup when materials are loaded to ensure deleted materials are removed
  useEffect(() => {
    if (laminateOptions.length > 0 || plywoodOptions.length > 0) {
      const validLaminates = laminateOptions.map(item => item.code.toLowerCase());
      const validPlywood = plywoodOptions.map(item => item.brand.toLowerCase());

      // Immediately clean localStorage
      cleanOrphanedMaterialsFromLocalStorage(validLaminates, validPlywood);
    }
  }, [laminateOptions.length, plywoodOptions.length]); // Run when materials are loaded

  // Load stored form memory
  // Load stored form memory (keeps last used values for faster entry)
  // Pass validation arrays to filter out deleted materials (only if materials are loaded)
  const { validLaminates, validPlywood } = getValidationArrays();
  const storedMemory = loadCabinetFormMemory(validLaminates, validPlywood);
  const masterDefaults = getLocalMasterDefaults();

  // 🐛 DEBUG: Log what values are being used for initialization

  const form = useForm<Cabinet>({
    resolver: zodResolver(cabinetSchema),
    defaultValues: getFormDefaultValues(
      generateUUID,
      cabinets.length + 1,
      storedMemory,
      masterDefaults
    )
  });

  const watchedValues = form.watch();
  const queryClient = useQueryClient();

  // Fetch all wood grains preferences on component mount
  useEffect(() => {
    async function fetchWoodGrainsPreferences() {
      // PATCH 16: Use safeFetchZod with Zod validation
      // PATCH 42: Debounce to prevent request storms
      const json = await debouncedFetch(
        'wood-grains-preferences',
        () => safeFetchZod(
          `${API_BASE}/api/wood-grains-preferences`,
          WoodGrainsPrefsSchema,
          []
        )
      );

      // PATCH 10: Normalize ALL fields with frontend type enforcement
      const normalizedList = normArray(json).map((item: any) => ({
        laminateCode: normString(item?.laminateCode),
        hasWoodGrains: normBoolean(item?.hasWoodGrains)
      }));

      // PATCH 12: Validate with Zod schema
      const validatedList = safeValidateArray(WoodGrainsListSchema, normalizedList);

      const map: Record<string, boolean> = {};
      validatedList.forEach((item) => {
        if (item.laminateCode) {
          map[item.laminateCode] = item.hasWoodGrains;
        }
      });

      setWoodGrainsPreferences(map);
    }
    fetchWoodGrainsPreferences();
  }, []);


  // ✅ FIX #1: Improved readiness flag - requires BOTH loading finished AND successful load
  // Prevents calculations running when database fetch fails or returns empty
  // ✅ OPTIMIZATION: Show form immediately, don't wait for wood grains to load
  const woodGrainsReady = true; // Always show form instantly, preferences load in background


  // ✅ SAVE SHUTTER LAMINATE CODES IN REAL-TIME (auto-save on change)
  // Use useRef to prevent infinite loop from watchedValues changing on every render
  const prevShutterValuesRef = useRef<{ front?: string; inner?: string }>({});
  const prevTopLaminateRef = useRef<string>('');
  const prevBottomLaminateRef = useRef<string>('');
  const prevLeftLaminateRef = useRef<string>('');
  const prevRightLaminateRef = useRef<string>('');
  const prevBackLaminateRef = useRef<string>('');
  const prevShutterLaminateRef = useRef<string>('');

  // ✅ DIRECT LINK: Auto-update grain directions when laminate codes change in form
  // FIX: Use individual field watches to prevent infinite loop from watchedValues object reference changing
  // IMPORTANT: Define watches BEFORE using them in useEffects
  // SAFE: Default to empty string to prevent undefined crashes
  const topPanelLaminateCode = form.watch('topPanelLaminateCode') || '';
  const bottomPanelLaminateCode = form.watch('bottomPanelLaminateCode') || '';
  const leftPanelLaminateCode = form.watch('leftPanelLaminateCode') || '';
  const rightPanelLaminateCode = form.watch('rightPanelLaminateCode') || '';
  const backPanelLaminateCode = form.watch('backPanelLaminateCode') || '';
  const shutterLaminateCode = form.watch('shutterLaminateCode') || '';
  const shutterPlywoodBrand = form.watch('shutterPlywoodBrand') || '';
  const shutterInnerLaminateCode = form.watch('shutterInnerLaminateCode') || '';

  // ✅ AUTO-SYNC: Colour Frame inherits Quick Shutter materials for consolidation
  useEffect(() => {
    if (colourFrameEnabled && shutterLaminateCode && shutterInnerLaminateCode) {
      const composedCode = composeLaminateCode(shutterLaminateCode, shutterInnerLaminateCode);
      setColourFrameForm(prev => ({
        ...prev,
        plywoodType: shutterPlywoodBrand || 'Apple Ply 16mm BWP',
        laminateCode: composedCode
      }));
    }
  }, [colourFrameEnabled, shutterLaminateCode, shutterInnerLaminateCode, shutterPlywoodBrand]);

  useEffect(() => {
    // Only save if values actually changed (not just form re-renders)
    const frontChanged = prevShutterValuesRef.current.front !== shutterLaminateCode;
    const innerChanged = prevShutterValuesRef.current.inner !== shutterInnerLaminateCode;

    if (frontChanged || innerChanged) {
      if (shutterLaminateCode || shutterInnerLaminateCode) {
        saveCabinetFormMemory({
          shutterPlywoodBrand,
          shutterLaminateCode,
          shutterInnerLaminateCode
        });
        // Update ref only after successful save
        prevShutterValuesRef.current = {
          front: shutterLaminateCode,
          inner: shutterInnerLaminateCode
        };
      }
    }
  }, [shutterLaminateCode, shutterInnerLaminateCode, shutterPlywoodBrand]);

  useEffect(() => {
    // Only run if preferences are loaded
    if (!woodGrainsReady) return;

    // Compute grain direction for each panel based on its laminate code from database
    const topCode = (topPanelLaminateCode || '').split('+')[0].trim();
    const bottomCode = (bottomPanelLaminateCode || '').split('+')[0].trim();
    const leftCode = (leftPanelLaminateCode || '').split('+')[0].trim();
    const rightCode = (rightPanelLaminateCode || '').split('+')[0].trim();
    const backCode = (backPanelLaminateCode || '').split('+')[0].trim();
    const shutterCode = (shutterLaminateCode || '').split('+')[0].trim();

    // Update grain directions based on database preferences (only if value exists in preferences)
    if (topCode && woodGrainsPreferences[topCode] !== undefined && (topPanelLaminateCode !== prevTopLaminateRef.current)) {
      form.setValue('topPanelGrainDirection', Boolean(woodGrainsPreferences[topCode]));
      prevTopLaminateRef.current = topPanelLaminateCode ?? '';
    }
    if (bottomCode && woodGrainsPreferences[bottomCode] !== undefined && (bottomPanelLaminateCode !== prevBottomLaminateRef.current)) {
      form.setValue('bottomPanelGrainDirection', Boolean(woodGrainsPreferences[bottomCode]));
      prevBottomLaminateRef.current = bottomPanelLaminateCode ?? '';
    }
    if (leftCode && woodGrainsPreferences[leftCode] !== undefined && (leftPanelLaminateCode !== prevLeftLaminateRef.current)) {
      form.setValue('leftPanelGrainDirection', Boolean(woodGrainsPreferences[leftCode]));
      prevLeftLaminateRef.current = leftPanelLaminateCode ?? '';
    }
    if (rightCode && woodGrainsPreferences[rightCode] !== undefined && (rightPanelLaminateCode !== prevRightLaminateRef.current)) {
      form.setValue('rightPanelGrainDirection', Boolean(woodGrainsPreferences[rightCode]));
      prevRightLaminateRef.current = rightPanelLaminateCode ?? '';
    }
    if (backCode && woodGrainsPreferences[backCode] !== undefined && (backPanelLaminateCode !== prevBackLaminateRef.current)) {
      form.setValue('backPanelGrainDirection', Boolean(woodGrainsPreferences[backCode]));
      prevBackLaminateRef.current = backPanelLaminateCode ?? '';
    }
    if (shutterCode && woodGrainsPreferences[shutterCode] !== undefined && (shutterLaminateCode !== prevShutterLaminateRef.current)) {
      form.setValue('shutterGrainDirection', Boolean(woodGrainsPreferences[shutterCode]));
      prevShutterLaminateRef.current = shutterLaminateCode ?? '';
    }
  }, [
    topPanelLaminateCode,
    bottomPanelLaminateCode,
    leftPanelLaminateCode,
    rightPanelLaminateCode,
    backPanelLaminateCode,
    shutterLaminateCode,
    woodGrainsPreferences,
    woodGrainsReady,
    form
  ]);

  // ✅ FIXED: Fetch from central godown instead of deprecated laminate-memory
  const { data: laminateCodeGodownData = [], isLoading: isLaminateMemoryLoading } = useQuery<LaminateCodeGodown[]>({
    queryKey: ['/api/laminate-code-godown'],
  });

  const saveLaminateCodeMutation = useMutation({
    mutationFn: async (code: string) => {
      return apiRequest('POST', '/api/laminate-code-godown', { code, name: code });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/laminate-code-godown'] });
    },
  });

  const saveWoodGrainsPreferenceMutation = useMutation({
    mutationFn: async ({ laminateCode, woodGrainsEnabled }: { laminateCode: string; woodGrainsEnabled: boolean }) => {
      return apiRequest('POST', '/api/wood-grains-preference', { laminateCode, woodGrainsEnabled });
    },
    onSuccess: (_, { laminateCode, woodGrainsEnabled }: { laminateCode: string; woodGrainsEnabled: boolean }) => {
      // Update local wood grains preferences state
      setWoodGrainsPreferences(prev => ({
        ...prev,
        [laminateCode]: woodGrainsEnabled
      }));

      // Instantly update ALL cabinets that use this laminate code
      const isRedColor = laminateCode.toLowerCase().includes('red') ||
        laminateCode.toLowerCase().includes('rose') ||
        laminateCode.toLowerCase().includes('pink');

      // Log visual feedback for red colors (toast would need to be called elsewhere)

      // Update all existing cabinets that use this specific laminate code
      setCabinets(prevCabinets =>
        prevCabinets.map(cabinet => {
          let updated = { ...cabinet };
          let hasChanges = false;

          // Check and update each panel if it uses the target laminate code
          if (cabinet.topPanelLaminateCode === laminateCode) {
            updated.topPanelGrainDirection = woodGrainsEnabled;
            hasChanges = true;
          }
          if (cabinet.bottomPanelLaminateCode === laminateCode) {
            updated.bottomPanelGrainDirection = woodGrainsEnabled;
            hasChanges = true;
          }
          if (cabinet.leftPanelLaminateCode === laminateCode) {
            updated.leftPanelGrainDirection = woodGrainsEnabled;
            hasChanges = true;
          }
          if (cabinet.rightPanelLaminateCode === laminateCode) {
            updated.rightPanelGrainDirection = woodGrainsEnabled;
            hasChanges = true;
          }
          if (cabinet.backPanelLaminateCode === laminateCode) {
            updated.backPanelGrainDirection = woodGrainsEnabled;
            hasChanges = true;
          }
          if (cabinet.shutterLaminateCode === laminateCode) {
            updated.shutterGrainDirection = woodGrainsEnabled;
            hasChanges = true;
          }

          // For red colors, apply extra visual emphasis

          return updated;
        })
      );

      // Also update the current form if it uses this laminate code
      const currentFormValues = form.getValues();
      if (currentFormValues.topPanelLaminateCode === laminateCode) {
        form.setValue('topPanelGrainDirection', woodGrainsEnabled);
      }
      if (currentFormValues.bottomPanelLaminateCode === laminateCode) {
        form.setValue('bottomPanelGrainDirection', woodGrainsEnabled);
      }
      if (currentFormValues.leftPanelLaminateCode === laminateCode) {
        form.setValue('leftPanelGrainDirection', woodGrainsEnabled);
      }
      if (currentFormValues.rightPanelLaminateCode === laminateCode) {
        form.setValue('rightPanelGrainDirection', woodGrainsEnabled);
      }
      if (currentFormValues.backPanelLaminateCode === laminateCode) {
        form.setValue('backPanelGrainDirection', woodGrainsEnabled);
      }
      if (currentFormValues.shutterLaminateCode === laminateCode) {
        form.setValue('shutterGrainDirection', woodGrainsEnabled);
      }
    },
  });

  const deleteLaminateCodeMutation = useMutation({
    mutationFn: async (code: string) => {
      return apiRequest('DELETE', `/api/laminate-code-godown/${encodeURIComponent(code)}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/laminate-code-godown'] });
    },
  });

  const savePlywoodBrandMutation = useMutation({
    mutationFn: async (brand: string) => {
      return apiRequest('POST', '/api/godown/plywood', { brand });
    },
    onSuccess: () => {
      fetchMaterials();
    },
  });

  const deletePlywoodBrandMutation = useMutation({
    mutationFn: async (brand: string) => {
      return apiRequest('DELETE', `/api/plywood-brand-memory/${encodeURIComponent(brand)}`);
    },
    onSuccess: () => {
      fetchMaterials();
    },
  });

  // PATCH 25: Memoize derived arrays from Zustand store
  const globalLaminateMemory = useMemo(
    () => laminateOptions.map(item => item.code),
    [laminateOptions]
  );
  const plywoodBrandMemoryData = plywoodOptions;
  const globalPlywoodBrandMemory = useMemo(
    () => plywoodOptions.map(item => item.brand),
    [plywoodOptions]
  );

  // ✅ Clean orphaned materials from localStorage when materials are loaded
  useEffect(() => {
    if (!isLoadingMaterials && laminateOptions.length >= 0 && plywoodOptions.length >= 0) {
      const validLaminates = laminateOptions.map(item => item.code.toLowerCase());
      const validPlywood = plywoodOptions.map(item => item.brand.toLowerCase());
      cleanOrphanedMaterialsFromLocalStorage(validLaminates, validPlywood);

      // ✅ Also clear form fields that contain deleted materials
      const innerLaminateFields = [
        'topPanelInnerLaminateCode',
        'bottomPanelInnerLaminateCode',
        'leftPanelInnerLaminateCode',
        'rightPanelInnerLaminateCode',
        'backPanelInnerLaminateCode',
        'shutterInnerLaminateCode',
        'centerPostInnerLaminateCode',
        'shelvesInnerLaminateCode',
      ] as const;

      innerLaminateFields.forEach(field => {
        const currentValue = form.getValues(field);
        if (currentValue && !validLaminates.includes(currentValue.toLowerCase())) {
          form.setValue(field, '');
        }
      });

      // Also clear front laminate codes if they're deleted
      const frontLaminateFields = [
        'topPanelLaminateCode',
        'bottomPanelLaminateCode',
        'leftPanelLaminateCode',
        'rightPanelLaminateCode',
        'backPanelLaminateCode',
        'shutterLaminateCode',
      ] as const;

      frontLaminateFields.forEach(field => {
        const currentValue = form.getValues(field);
        if (currentValue && !validLaminates.includes(currentValue.toLowerCase())) {
          form.setValue(field, '');
        }
      });
    }
  }, [isLoadingMaterials, laminateOptions, plywoodOptions, form]);

  // PATCH 20: Removed local state mirrors for laminate selections
  // All laminate values are now read from form.watch() and written via form.setValue()

  // PATCH 20: Removed local gaddi state mirrors
  // Gaddi values are now managed directly in react-hook-form (topPanelGaddi, bottomPanelGaddi, etc.)

  // PATCH 19: panelsLinked moved to uiStore

  // Sync Cabinet Configuration Front Laminate to ALL panels (Top/Bottom/Left/Right/Back)
  const syncCabinetConfigFrontLaminate = (newValue: string, markAsUserSelected: boolean = false) => {
    if (currentSyncOrigin.current === 'cabinet-front-sync') return;
    if (!panelsLinked) return; // Only sync when panels are linked

    currentSyncOrigin.current = 'cabinet-front-sync';

    // Update ALL panel front laminate codes (Top/Bottom/Left/Right/Back)
    if (markAsUserSelected) {
      updateLaminateWithTracking('topPanelLaminateCode', newValue, 'user');
      updateLaminateWithTracking('bottomPanelLaminateCode', newValue, 'user');
      updateLaminateWithTracking('leftPanelLaminateCode', newValue, 'user');
      updateLaminateWithTracking('rightPanelLaminateCode', newValue, 'user');
      updateLaminateWithTracking('backPanelLaminateCode', newValue, 'user');
    } else {
      form.setValue('topPanelLaminateCode', newValue);
      form.setValue('bottomPanelLaminateCode', newValue);
      form.setValue('leftPanelLaminateCode', newValue);
      form.setValue('rightPanelLaminateCode', newValue);
      form.setValue('backPanelLaminateCode', newValue);
    }

    // PATCH 20: Removed dead setLaminateSelection calls (local state was removed)

    setTimeout(() => {
      currentSyncOrigin.current = null;
    }, 100);
  };

  // Auto-scroll to Cabinet with Shutter section when expanded
  useEffect(() => {
    if (cabinetConfigVisible && cabinetSectionRef.current) {
      // Double requestAnimationFrame to ensure DOM is fully rendered and laid out
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          cabinetSectionRef.current?.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });
        });
      });
    }
  }, [cabinetConfigVisible]);

  // Auto-scroll to Project Details section when expanded
  useEffect(() => {
    if (projectDetailsVisible && projectDetailsSectionRef.current) {
      // Double requestAnimationFrame to ensure DOM is fully rendered and laid out
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          projectDetailsSectionRef.current?.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });
        });
      });
    }
  }, [projectDetailsVisible]);

  // Auto-scroll to Plywood and Laminates section when expanded
  useEffect(() => {
    if (plywoodLaminatesOpen && plywoodLaminatesRef.current) {
      // Double requestAnimationFrame to ensure DOM is fully rendered and laid out
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          plywoodLaminatesRef.current?.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });
        });
      });
    }
  }, [plywoodLaminatesOpen]);

  // Auto-scroll to Center Post section when toggle is turned ON
  useEffect(() => {
    if (watchedValues.centerPostEnabled && centerPostSectionRef.current) {
      // Double requestAnimationFrame to ensure DOM is fully rendered and laid out
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          centerPostSectionRef.current?.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });
        });
      });
    }
  }, [watchedValues.centerPostEnabled]);

  // Auto-scroll to Shelves section when toggle is turned ON
  useEffect(() => {
    if (watchedValues.shelvesEnabled && centerPostSectionRef.current) {
      // Double requestAnimationFrame to ensure DOM is fully rendered and laid out
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          centerPostSectionRef.current?.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });
        });
      });
    }
  }, [watchedValues.shelvesEnabled]);

  // Auto-scroll to Shutter Configuration section when toggle is turned ON
  useEffect(() => {
    if (watchedValues.shuttersEnabled && shutterConfigSectionRef.current) {
      // Double requestAnimationFrame to ensure DOM is fully rendered and laid out
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          shutterConfigSectionRef.current?.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });
        });
      });
    }
  }, [watchedValues.shuttersEnabled]);

  // Auto-scroll to Individual Panel Laminate Selection section when expanded
  useEffect(() => {
    if (individualPanelsOpen && individualPanelsRef.current) {
      // Double requestAnimationFrame to ensure DOM is fully rendered and laid out
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          individualPanelsRef.current?.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });
        });
      });
    }
  }, [individualPanelsOpen]);

  // Auto-scroll to Design Center section when expanded
  useEffect(() => {
    if (designCenterVisible && designCenterSectionRef.current) {
      // Double requestAnimationFrame to ensure DOM is fully rendered and laid out
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          designCenterSectionRef.current?.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });
        });
      });
    }
  }, [designCenterVisible]);

  // Load Master Settings memory from API on component mount
  useEffect(() => {
    const loadMasterSettingsMemory = async () => {
      const defaultSettings = {
        sheetWidth: '1210',
        sheetHeight: '2420',
        kerf: '5',
        masterLaminateCode: null,
        masterPlywoodBrand: 'Apple Ply 16mm BWP',
        plywoodTypes: [] as string[],
        laminateCodes: [] as string[]
      };

      // PATCH 16: Use safeFetchZod with Zod validation
      const json = await safeFetchZod(
        `${API_BASE}/api/master-settings-memory`,
        ApiMasterSettingsMemorySchema,
        defaultSettings
      );

      // PATCH 10: Normalize ALL fields with frontend type enforcement
      const normalizedSettings = {
        sheetWidth: normString(json?.sheetWidth) || '1210',
        sheetHeight: normString(json?.sheetHeight) || '2420',
        kerf: normString(json?.kerf) || '5',
        masterLaminateCode: json?.masterLaminateCode ? normString(json.masterLaminateCode) : null,
        masterPlywoodBrand: normString(json?.masterPlywoodBrand) || 'Apple Ply 16mm BWP',
        plywoodTypes: normArray(json?.plywoodTypes).map(normString),
        laminateCodes: normArray(json?.laminateCodes).map(normString)
      };

      // PATCH 12: Validate with Zod schema
      const validated = safeValidate(MasterSettingsMemorySchema, normalizedSettings, defaultSettings);

      const width = normNumber(validated.sheetWidth);
      const height = normNumber(validated.sheetHeight);
      const kerfVal = normNumber(validated.kerf);

      setSheetWidth(width > 0 ? width : 1210);
      setSheetHeight(height > 0 ? height : 2420);
      setKerf(kerfVal > 0 ? kerfVal : 5);
    };

    loadMasterSettingsMemory();
  }, []);

  // Auto-save Master Settings when values change (debounced)
  useEffect(() => {
    const saveMasterSettings = async () => {
      try {
        await fetch(`${API_BASE}/api/master-settings-memory`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sheetWidth: String(sheetWidth),
            sheetHeight: String(sheetHeight),
            kerf: String(kerf),
          }),
        });
      } catch (error) {
        console.error('Failed to save Master Settings:', error);
      }
    };

    // Debounce the save operation to avoid excessive API calls
    const timeoutId = setTimeout(() => {
      saveMasterSettings();
    }, 500); // Wait 500ms after last change before saving

    return () => clearTimeout(timeoutId);
  }, [sheetWidth, sheetHeight, kerf]);

  // Auto-save watcher: triggers confirmation dialog when client name is entered and cabinets exist
  useEffect(() => {
    // Load previously prompted clients from localStorage on mount
    const storedPromptedClients = localStorage.getItem('promptedClients');
    if (storedPromptedClients) {
      try {
        const parsedClients = JSON.parse(storedPromptedClients) as string[];
        savedClientsRef.current = new Set(parsedClients);
      } catch (error) {
        console.error('Failed to load prompted clients:', error);
      }
    }
  }, []);


  // PATCH 25: Memoize string normalization function
  // Normalize strings for grouping (removes whitespace and case inconsistencies)
  // This ensures items with the same text group together despite spacing/case differences
  // Case-insensitive: "Apple Ply" and "apple ply" are treated as the same
  const normalizeForGrouping = useCallback((text: string): string => {
    return text
      .trim()                          // Remove leading/trailing spaces
      .toLowerCase()                   // Normalize to lowercase for case-insensitive grouping
      .replace(/\s+/g, ' ');          // Collapse multiple spaces to single space
  }, []);

  // ✅ ASYNC OPTIMIZATION: Use useEffect to handle async multiPassOptimize
  // Preview calculations now run asynchronously to support web worker optimization
  useEffect(() => {
    const runOptimization = async () => {
      // Only calculate if preview dialog is open
      if (!showPreviewDialog || cabinets.length === 0) {
        setPreviewBrandResults([]);
        return;
      }

      try {
        // PATCH 32: Use worker if available, fallback to main thread
        const params = {
          cabinets,
          manualPanels,
          sheetWidth,
          sheetHeight,
          kerf,
          woodGrainsPreferences,
          generatePanels,
        };

        // PATCH 47: Feature flag controls worker usage
        const result = useWorker && window.Worker
          ? await runOptimizerInWorker(params)
          : await runOptimizerEngine(params);

        if (result.error) {
          console.error('Optimizer failed:', result.error);
          // PATCH 39: Use centralized error toast
          toastError(result.error);
          return;
        }

        setPreviewBrandResults(result.brandResults);
      } catch (err: any) {
        console.error('Optimizer engine crashed:', err);
        // PATCH 39: Use centralized error toast
        toastError(err);
      }
    };

    runOptimization();
  }, [showPreviewDialog, cabinets, woodGrainsPreferences, sheetWidth, sheetHeight, kerf, manualPanels, deletedPreviewSheets]);

  // Calculate cutting list summary with memoization
  const cuttingListSummary = useMemo((): CuttingListSummary => {
    return buildCuttingListSummary(cabinets);
  }, [cabinets]);

  // PATCH 25: Memoize unique laminate codes for wood grains UI
  const uniqueLaminateCodes = useMemo(() => {
    return Array.from(new Set(globalLaminateMemory.map(s => s.trim()).filter(Boolean)))
      .filter((code, index, self) =>
        index === self.findIndex(t => t.toLowerCase() === code.toLowerCase())
      );
  }, [globalLaminateMemory]);

  // ✅ ASYNC OPTIMIZATION: Calculate live material summary with async optimization
  useEffect(() => {
    const runSummary = async () => {
      if (cabinets.length === 0 || !isPreviewActive || !showPreviewDialog) {
        setLiveMaterialSummary({
          plywood: {},
          laminates: {},
          totalPlywoodSheets: 0
        });
        return;
      }

      const summary = await buildMaterialSummary({
        cabinets,
        sheetWidth,
        sheetHeight,
        kerf,
        woodGrainsPreferences,
        deletedPreviewSheets,
      });

      setLiveMaterialSummary(summary);
    };

    runSummary();
  }, [cabinets, deletedPreviewSheets, showPreviewDialog, optimizePlywoodUsage, woodGrainsPreferences, sheetWidth, sheetHeight, kerf]);

  // PATCH 25: Memoize shutter dimension calculator
  const calculateShutterDimensions = useCallback((cabinet: Cabinet): { width: number; height: number; laminateCode?: string }[] => {
    // 🔒 PROTECTED CALCULATION LOGIC - DO NOT MODIFY WITHOUT PERMISSION
    if (calculationLogicLocked) {
      // Original locked logic - protected from modification
      if (!cabinet.shuttersEnabled) return [];

      const effectiveWidth = cabinet.width; // Use full cabinet width - no reduction
      const shutterWidth = Math.round(effectiveWidth / cabinet.shutterCount) - (cabinet.shutterWidthReduction || 0);
      const shutterHeight = cabinet.height - (cabinet.shutterHeightReduction || 0);

      // ✅ FIX: Shutters now use same laminate codes as cabinet panels to consolidate on same sheets
      const shutterLaminateCode = composeLaminateCode(
        cabinet.topPanelLaminateCode || '',
        cabinet.topPanelInnerLaminateCode || ''
      );

      return Array(cabinet.shutterCount).fill(null).map(() => ({
        width: shutterWidth,
        height: shutterHeight,
        laminateCode: shutterLaminateCode
      }));
    }

    // Unlocked mode - modifications allowed
    if (!cabinet.shuttersEnabled) return [];

    const effectiveWidth = cabinet.width; // Use full cabinet width - no reduction
    const shutterWidth = Math.round(effectiveWidth / cabinet.shutterCount) - (cabinet.shutterWidthReduction || 0);
    const shutterHeight = cabinet.height - (cabinet.shutterHeightReduction || 0);

    // ✅ FIX: Shutters now use same laminate codes as cabinet panels to consolidate on same sheets
    const shutterLaminateCode = composeLaminateCode(
      cabinet.topPanelLaminateCode || '',
      cabinet.topPanelInnerLaminateCode || ''
    );

    return Array(cabinet.shutterCount).fill(null).map(() => ({
      width: shutterWidth,
      height: shutterHeight,
      laminateCode: shutterLaminateCode
    }));
  }, [calculationLogicLocked]);

  // Update shutters when cabinet dimensions change
  // PATCH 41: Use stable callback to prevent infinite loops from watchedValues changing
  const updateShutters = useStableCallback(() => {
    const newShutters = calculateShutterDimensions(watchedValues);
    form.setValue('shutters', newShutters);
  });

  // Update center post height and depth automatically
  useEffect(() => {
    if (watchedValues.height) {
      form.setValue('centerPostHeight', watchedValues.height - 36);
    }
    if (watchedValues.depth) {
      form.setValue('centerPostDepth', watchedValues.depth - 20);
    }
  }, [watchedValues.height, watchedValues.depth, form]);

  // Initialize shutters when enabled and shutterCount > 0
  // PATCH 41: Use stable callback and specific deps to prevent loops from watchedValues object
  const stableCalculateShutterDimensions = useStableCallback(calculateShutterDimensions);
  useEffect(() => {
    if (watchedValues.shuttersEnabled && watchedValues.shutterCount > 0 && watchedValues.shutters.length === 0) {
      const newShutters = stableCalculateShutterDimensions(watchedValues);
      form.setValue('shutters', newShutters);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedValues.shuttersEnabled, watchedValues.shutterCount, watchedValues.shutters.length]);

  // ✅ AUTO-FOCUS: Focus on shutter height field when shutters are added/changed
  useEffect(() => {
    if (watchedValues.shuttersEnabled && watchedValues.shutters && watchedValues.shutters.length > 0) {
      setTimeout(() => {
        if (shutterHeightInputRef.current) {
          shutterHeightInputRef.current.focus();
          shutterHeightInputRef.current.select();
        }
      }, 50);
    }
  }, [watchedValues.shutters.length]);

  // Mark memory-loaded laminate codes as user-selected on initial mount
  useEffect(() => {
    const { validLaminates, validPlywood } = getValidationArrays();
    const memory = loadCabinetFormMemory(validLaminates, validPlywood);
    if (memory.topPanelLaminateCode) {
      markLaminateAsUserSelected('topPanelLaminateCode');
      markLaminateAsUserSelected('bottomPanelLaminateCode');
      markLaminateAsUserSelected('leftPanelLaminateCode');
      markLaminateAsUserSelected('rightPanelLaminateCode');
      markLaminateAsUserSelected('topPanelInnerLaminateCode');
      markLaminateAsUserSelected('bottomPanelInnerLaminateCode');
      markLaminateAsUserSelected('leftPanelInnerLaminateCode');
      markLaminateAsUserSelected('rightPanelInnerLaminateCode');
      // PATCH 20: Removed dead setLaminateSelection calls (local state was removed)
    }
    if (memory.backPanelLaminateCode) {
      markLaminateAsUserSelected('backPanelLaminateCode');
      markLaminateAsUserSelected('backPanelInnerLaminateCode');
      // PATCH 20: Removed dead setBackLaminateSelection call (local state was removed)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount

  // Internal function to actually add the cabinet (called directly or after confirmation)
  // PATCH 22: Uses pure functions for data transformation, side effects remain here
  const performAddCabinet = (cabinet: Cabinet) => {

    // PATCH 22: Use pure function for cabinet preparation
    // This applies gaddi defaults and computes grain directions
    const { cabinet: preparedCabinet } = prepareCabinet({
      cabinet,
      configurationMode: (cabinet.configurationMode as "basic" | "advanced") || 'advanced',
      woodGrainsPreferences
    });

    // Side effect: Update cabinets state
    updateCabinets((prev: Cabinet[]) => [...prev, preparedCabinet]);

    // PATCH 22: Use pure function to extract memory data
    const memoryData = extractCabinetMemory(cabinet);
    saveCabinetFormMemory(memoryData);

    // Clear user-laminate tracking for next cabinet
    clearUserLaminateTracking();

    // Reset form with saved memory values
    const { validLaminates, validPlywood } = getValidationArrays();
    const memory = loadCabinetFormMemory(validLaminates, validPlywood);
    const shutterMemoryNew = loadShutterFormMemory(validLaminates, validPlywood);

    // Compute grain directions from memory laminate codes using database preferences
    const hasTopWoodGrain = hasWoodGrainPreference(memory.topPanelLaminateCode, woodGrainsPreferences);
    const hasBackWoodGrain = hasWoodGrainPreference(memory.backPanelLaminateCode, woodGrainsPreferences);

    form.reset(getFormResetValues(
      generateUUID,
      cabinets.length + 2,
      memory,
      shutterMemoryNew,
      hasTopWoodGrain,
      hasBackWoodGrain
    ));

    // Restore laminate codes from memory - populate form values AND mark as user-selected
    if (memory.topPanelLaminateCode) {
      updateLaminateWithTracking('topPanelLaminateCode', memory.topPanelLaminateCode, 'user');
      updateLaminateWithTracking('bottomPanelLaminateCode', memory.topPanelLaminateCode, 'user');
      updateLaminateWithTracking('leftPanelLaminateCode', memory.topPanelLaminateCode, 'user');
      updateLaminateWithTracking('rightPanelLaminateCode', memory.topPanelLaminateCode, 'user');

      // Also populate and mark all Inner Laminates from memory (if saved)
      if (memory.topPanelInnerLaminateCode) {
        updateLaminateWithTracking('topPanelInnerLaminateCode', memory.topPanelInnerLaminateCode, 'user');
        updateLaminateWithTracking('bottomPanelInnerLaminateCode', memory.bottomPanelInnerLaminateCode || memory.topPanelInnerLaminateCode, 'user');
        updateLaminateWithTracking('leftPanelInnerLaminateCode', memory.leftPanelInnerLaminateCode || memory.topPanelInnerLaminateCode, 'user');
        updateLaminateWithTracking('rightPanelInnerLaminateCode', memory.rightPanelInnerLaminateCode || memory.topPanelInnerLaminateCode, 'user');
      }

      // PATCH 20: Removed dead setLaminateSelection calls (local state was removed)
    }
    if (memory.backPanelLaminateCode) {
      updateLaminateWithTracking('backPanelLaminateCode', memory.backPanelLaminateCode, 'user');
      // Only populate back panel inner laminate if it exists in memory
      if (memory.backPanelInnerLaminateCode) {
        updateLaminateWithTracking('backPanelInnerLaminateCode', memory.backPanelInnerLaminateCode, 'user');
      }
      // PATCH 20: Removed dead setBackLaminateSelection call (local state was removed)
    }

    // PATCH 20: Reset gaddi toggles via form - always ON by default
    form.setValue('topPanelGaddi', true);
    form.setValue('bottomPanelGaddi', true);
    form.setValue('leftPanelGaddi', true);
    form.setValue('rightPanelGaddi', true);

    // ✅ FIX: Close preview dialog after adding cabinet so next preview shows fresh data
    // This prevents old panels from accumulating when preview is reopened
    closePreview();

    toast({
      title: "Cabinet Added",
      description: `${cabinet.name} has been added to the cutting list.`
    });

    // ✅ AUTO-FOCUS: Focus on Height field after cabinet is added (time saver)
    setTimeout(() => {
      if (cabinetHeightInputRef.current) {
        cabinetHeightInputRef.current.focus();
        cabinetHeightInputRef.current.select();
      }
    }, 100);

    // ✅ AUTO-FOCUS: Also focus on shutter height field if shutters are enabled
    if (cabinet.shuttersEnabled && cabinet.shutters && cabinet.shutters.length > 0) {
      setTimeout(() => {
        if (shutterHeightInputRef.current) {
          shutterHeightInputRef.current.focus();
          shutterHeightInputRef.current.select();
        }
      }, 150);
    }
  };

  // PATCH 22: Old local functions (normalizeCabinetData, normalizeCabinetCollection,
  // computeGrainDirections) removed - now using pure functions from @/lib/submit

  // PATCH 22: Utility wrapper using pure functions for normalization and grain direction
  const updateCabinets = (updater: Cabinet[] | ((prev: Cabinet[]) => Cabinet[])) => {
    // Helper: normalize collection using pure function
    const normalizeCollection = (cabs: Cabinet[]) =>
      cabs.map(c => normalizeCabinetDataPure(c));

    if (typeof updater === 'function') {
      // If updater is a function, call it, normalize, and compute grain directions with FRESH values
      setCabinets((prev) => {
        const updated = updater(prev);
        const normalized = normalizeCollection(updated);
        // ✅ DIRECT LINK: Recompute grain directions using pure function
        return normalized.map(cabinet => ({
          ...cabinet,
          ...computeGrainDirectionsPure(cabinet, woodGrainsPreferences)
        }));
      });
    } else {
      // If updater is a direct array, normalize and compute grain directions with FRESH values
      const normalized = normalizeCollection(updater);
      setCabinets(normalized.map(cabinet => ({
        ...cabinet,
        ...computeGrainDirectionsPure(cabinet, woodGrainsPreferences)
      })));
    }
  };

  // Add cabinet (with validation)
  const addCabinet = (cabinet: Cabinet) => {
    cabinet = applyDefaultsToCabinet(cabinet);
    // ✅ FIX: Use the UI state (cabinetConfigMode) instead of form value to ensure correct mode detection
    // This ensures Basic mode validation works even if form submission doesn't include configurationMode
    const mode = cabinetConfigMode;
    cabinet = { ...cabinet, configurationMode: mode };

    const validation = validateBeforeAddCabinet({
      ...cabinet,
      __validationTracking: userSelectedLaminates
    });

    if (!validation.valid) {
      // Show error dialog - block adding cabinet
      setPendingMaterialAction({
        type: 'cabinet',
        payload: cabinet,
        missingPanels: validation.missing,
        onConfirm: () => {
          // No "Add Anyway" option - user must fix missing laminates
          closeMaterialConfirm();
          setPendingMaterialAction(null);
        }
      });
      openMaterialConfirm();
      return; // Abort - don't add cabinet
    }

    // ✅ PERSIST UPDATED TRACKING: Auto-marked fields are now confirmed
    if (validation.updatedTracking) {
      setUserSelectedLaminates(validation.updatedTracking);
    }

    // Save shutter memory for Quick Shutter mode auto-fill
    if (mode === 'basic' && (cabinet.shutterPlywoodBrand || cabinet.shutterLaminateCode || cabinet.shutterInnerLaminateCode)) {
      saveShutterFormMemory({
        shutterPlywoodBrand: cabinet.shutterPlywoodBrand,
        shutterLaminateCode: cabinet.shutterLaminateCode,
        shutterInnerLaminateCode: cabinet.shutterInnerLaminateCode
      });
    }

    // Save cabinet memory for Advanced mode auto-fill
    if (mode === 'advanced' && (cabinet.plywoodType || cabinet.topPanelLaminateCode)) {
      saveCabinetFormMemory({
        plywoodType: cabinet.plywoodType,
        topPanelLaminateCode: cabinet.topPanelLaminateCode,
        backPanelLaminateCode: cabinet.backPanelLaminateCode,
        height: cabinet.height,
        width: cabinet.width,
        depth: cabinet.depth,
        widthReduction: cabinet.widthReduction
      });
    }

    // PATCH 22: Normalization and mode conversion moved to prepareCabinet pure function
    // Just pass the cabinet with mode set - performAddCabinet handles the rest
    const cabinetWithMode = { ...cabinet, configurationMode: mode };

    // All validations passed - add the cabinet
    performAddCabinet(cabinetWithMode);

    // ✅ FIX: Reset form after successfully adding so button works on next click
    // Load memory to restore values
    const { validLaminates, validPlywood } = getValidationArrays();
    const shutterMemory = loadShutterFormMemory(validLaminates, validPlywood);
    const cabinetMemory = loadCabinetFormMemory(validLaminates, validPlywood);

    const resetCabinetDefaults = applyDefaultsToCabinet(
      getCabinetResetDefaults(
        generateUUID,
        cabinets.length + 2,
        cabinetConfigMode,
        cabinetMemory,
        shutterMemory || {}
      ) as Cabinet
    );
    form.reset(resetCabinetDefaults);
  };

  // Add quick cabinet
  const addQuickCabinet = (type: CabinetType) => {
    const config = cabinetConfigs[type];
    const { validLaminates, validPlywood } = getValidationArrays();
    const cabinetMemory = loadCabinetFormMemory(validLaminates, validPlywood); // ✅ FIX: Load stored memory like regular form does

    for (let i = 0; i < config.quantity; i++) {
      const shutters = calculateShutterDimensions({
        ...form.getValues(),
        height: config.height,
        width: config.width,
        shutterCount: config.shutterQuantity
      });

      const baseCabinet: Cabinet = applyDefaultsToCabinet(
        getQuickCabinetDefaults(
          generateUUID,
          `${cabinetTypes.find(t => t.value === type)?.label} #${cabinets.length + i + 1}`,
          type,
          config,
          cabinetMemory,
          shutters
        ) as Cabinet
      );

      // PATCH 22: Use pure function for grain direction computation
      const cabinet = {
        ...baseCabinet,
        ...computeGrainDirectionsPure(baseCabinet, woodGrainsPreferences)
      };

      updateCabinets((prev: Cabinet[]) => [...prev, cabinet]);
    }

    toast({
      title: "Quick Cabinets Added",
      description: `${config.quantity} ${cabinetTypes.find(t => t.value === type)?.label}(s) added to cutting list.`
    });
  };

  // PATCH 25: Memoize removeCabinet callback
  const removeCabinet = useCallback((id: string) => {
    updateCabinets((prev: Cabinet[]) => prev.filter(cabinet => cabinet.id !== id));
    toast({
      title: "Cabinet Removed",
      description: "Cabinet has been removed from the cutting list."
    });
  }, [updateCabinets, toast]);

  // Export to Google Sheets format
  const exportToGoogleSheets = () => {
    try {
      const projectName = "Maya Interiors Kitchen Project";
      const allPanels = cabinets.flatMap(generatePanels);

      if (allPanels.length === 0) {
        toast({
          title: "No panels to export",
          description: "Add some cabinets first"
        });
        return;
      }

      // Create Google Sheets compatible format with specific column layout
      const wsData = [
        ['Plywood Type', 'Laminate Code'], // A1, B1 headers
        [], // A2, B2 (empty row)
        ['', '', 'Height', 'Width', 'Qty', 'Laminate Code', 'Panel Type', 'Room Name'], // Headers starting from C3
        ...allPanels.map(panel => [
          '', '', // Empty A and B columns
          panel.height,
          panel.width,
          panel.quantity || 1,
          panel.laminateCode || 'None',
          panel.type || 'Panel',
          panel.roomName || ''
        ])
      ];

      const ws = XLSX.utils.aoa_to_sheet(wsData);

      // Set column widths for better formatting
      ws['!cols'] = [
        { wch: 15 }, // A
        { wch: 15 }, // B  
        { wch: 10 }, // C - Height
        { wch: 10 }, // D - Width
        { wch: 8 },  // E - Qty
        { wch: 15 }, // F - Laminate Code
        { wch: 12 }, // G - Panel Type
        { wch: 12 }  // H - Room Name
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Cutting List");

      XLSX.writeFile(wb, `${projectName.replace(/\s+/g, '_')}_GoogleSheets.xlsx`);

      toast({
        title: "Google Sheets Format Exported",
        description: "Cutting list exported in Google Sheets compatible format with proper column layout"
      });

    } catch (error) {
      console.error('Google Sheets export error:', error);
      // PATCH 39: Use centralized error toast
      toastError(error);
    }
  };

  // Export to Excel with cutting list details
  const exportToExcel = () => {
    try {
      const projectName = "Maya Interiors Kitchen Project";
      const allPanels = cabinets.flatMap(generatePanels);

      if (allPanels.length === 0) {
        toast({
          title: "No panels to export",
          description: "Add some cabinets first"
        });
        return;
      }

      // Create workbook
      const wb = XLSX.utils.book_new();

      // Sheet 1: Panel Details - Custom Format
      const laminateGroups = new Map<string, Map<string, { count: number, panels: string[], thickness: number }>>();


      allPanels.forEach(panel => {
        const laminateKey = panel.laminateCode || 'None';
        const dimensionKey = `${panel.width}x${panel.height}`;

        // Find the cabinet this panel belongs to for thickness
        const cabinet = cabinets.find(c => panel.name.startsWith(c.name));
        const thickness = 18;

        if (!laminateGroups.has(laminateKey)) {
          laminateGroups.set(laminateKey, new Map());
        }

        const dimensionMap = laminateGroups.get(laminateKey)!;
        if (!dimensionMap.has(dimensionKey)) {
          dimensionMap.set(dimensionKey, { count: 0, panels: [], thickness });
        }

        const entry = dimensionMap.get(dimensionKey)!;
        entry.count += 1;
        entry.panels.push(panel.name);
      });

      const panelData: any[] = [];
      let laminateNo = 1;

      laminateGroups.forEach((dimensions, laminateName) => {
        dimensions.forEach((data, dimensionKey) => {
          const [width, height] = dimensionKey.split('x').map(Number);

          // Check if this is a top/bottom panel that needs dimension swapping
          const isTopBottomPanel = data.panels.some(panelName =>
            panelName.includes('- Top') || panelName.includes('- Bottom')
          );

          // Back panels should never have their dimensions swapped
          const isBackPanel = data.panels.some(panelName =>
            panelName.includes('- Back')
          );

          // Get notes and plywood type from cabinets for these panels
          const cabinetNotes = data.panels.map(panelName => {
            const cabinet = cabinets.find(c => panelName.startsWith(c.name));
            return cabinet?.note || '';
          }).filter(note => note.trim()).join('; ');

          // Get cabinet info for Quick Shutter entries
          const relatedCabinets = data.panels.map(panelName =>
            cabinets.find(c => {
              // For Quick Shutter panels, match against cabinet name without qty
              const cabinetNameWithoutQty = c.name.replace(/ \(Qty: \d+\)/, '');
              return panelName.startsWith(c.name) || panelName.startsWith(cabinetNameWithoutQty);
            })
          ).filter(Boolean);

          const quickShutterCabinet = relatedCabinets.find(cabinet => cabinet?.type === 'custom');

          // Determine plywood type - check if this is a back panel first
          let plywoodType = 'Apple Ply 16mm BWP';
          if (isBackPanel && relatedCabinets.length > 0) {
            // Use back panel plywood brand directly
            plywoodType = relatedCabinets[0]?.backPanelPlywoodBrand || 'Apple ply 6mm BWP';
          } else if (quickShutterCabinet) {
            // Use Quick Shutter plywood type if available
            plywoodType = quickShutterCabinet.plywoodType || 'Apple Ply 16mm BWP';
          }

          // Get laminate code - separate Base Cabinet vs Quick Shutter systems
          let laminateCodeValue = '';

          // Check if this is a Quick Shutter entry (depth = 0)
          if (quickShutterCabinet && quickShutterCabinet.depth === 0) {
            // Use Quick Shutter laminate code system
            laminateCodeValue = quickShutterCabinet.shutterLaminateCode || '';
          } else if (relatedCabinets.length > 0) {
            // Use Base Cabinet individual panel laminate codes (Front + Inner combined)
            const cabinet = relatedCabinets[0];
            const firstPanelName = data.panels[0];

            if (firstPanelName.includes('- Top')) {
              laminateCodeValue = composeLaminateCode(
                cabinet?.topPanelLaminateCode || '',
                cabinet?.topPanelInnerLaminateCode || ''
              );
            } else if (firstPanelName.includes('- Bottom')) {
              laminateCodeValue = composeLaminateCode(
                cabinet?.bottomPanelLaminateCode || '',
                cabinet?.bottomPanelInnerLaminateCode || ''
              );
            } else if (firstPanelName.includes('- Left')) {
              laminateCodeValue = composeLaminateCode(
                cabinet?.leftPanelLaminateCode || '',
                cabinet?.leftPanelInnerLaminateCode || ''
              );
            } else if (firstPanelName.includes('- Right')) {
              laminateCodeValue = composeLaminateCode(
                cabinet?.rightPanelLaminateCode || '',
                cabinet?.rightPanelInnerLaminateCode || ''
              );
            } else if (firstPanelName.includes('- Back Panel')) {
              laminateCodeValue = composeLaminateCode(
                cabinet?.backPanelLaminateCode || '',
                cabinet?.backPanelInnerLaminateCode || ''
              );
            }
          }

          // Determine other fields
          let roomNameValue = '';
          let noteValue = '';
          let gaddiThickness = '';
          if (quickShutterCabinet) {
            roomNameValue = quickShutterCabinet.roomName || '';
            noteValue = quickShutterCabinet.note || '';
            gaddiThickness = quickShutterCabinet.gaddiThickness || '';
          } else {
            // CRITICAL FIX: Read GADDI from cabinet object, not from state variables
            const firstPanelName = data.panels[0];
            noteValue = firstPanelName; // Set the panel name to Note column

            // Get the cabinet that owns this panel
            if (relatedCabinets.length > 0) {
              const cabinet = relatedCabinets[0];

              // Check cabinet's GADDI flags (stored in cabinet object)
              if (firstPanelName.includes('- Top') && cabinet?.topPanelGaddi === true) {
                gaddiThickness = 'Gaddi 8mm';
              } else if (firstPanelName.includes('- Bottom') && cabinet?.bottomPanelGaddi === true) {
                gaddiThickness = 'Gaddi 8mm';
              } else if (firstPanelName.includes('- Left') && cabinet?.leftPanelGaddi === true) {
                gaddiThickness = 'Gaddi 8mm';
              } else if (firstPanelName.includes('- Right') && cabinet?.rightPanelGaddi === true) {
                gaddiThickness = 'Gaddi 8mm';
              }
            }
          }

          panelData.push({
            'Plywood Brand': plywoodType,
            'Laminate Code': laminateCodeValue,
            'Height': (isTopBottomPanel && !isBackPanel) ? width : height,
            'Width': (isTopBottomPanel && !isBackPanel) ? height : width,
            'No Qty': data.count,
            'Gaddi 8mm': gaddiThickness,
            'Note': noteValue,
            'Room Name': roomNameValue
          });
        });
        laminateNo++;
      });

      const panelWs = XLSX.utils.json_to_sheet(panelData);

      // Apply left alignment to all cells and brown color to back panel rows
      const totalRows = panelData.length + 1; // +1 for header row
      const totalCols = Object.keys(panelData[0] || {}).length;

      // Apply left alignment to all cells - force text type for all cells
      for (let rowIndex = 0; rowIndex < totalRows; rowIndex++) {
        for (let colIndex = 0; colIndex < totalCols; colIndex++) {
          const cellRef = XLSX.utils.encode_cell({ r: rowIndex, c: colIndex });
          if (!panelWs[cellRef]) panelWs[cellRef] = { t: 's', v: '' };

          // Force all cells to be text type to ensure left alignment works
          panelWs[cellRef].t = 's';

          if (!panelWs[cellRef].s) panelWs[cellRef].s = {};
          panelWs[cellRef].s.alignment = { horizontal: 'left' };
        }
      }

      // Apply brown color to back panel rows
      panelData.forEach((row, rowIndex) => {
        const isBackPanel = row['Note'] && row['Note'].includes('- Back Panel');
        if (isBackPanel) {
          // Excel row numbers start from 1, plus 1 for header row
          const excelRowNum = rowIndex + 2;

          // Apply brown font color to all cells in the back panel row
          const columnCount = Object.keys(row).length;
          for (let colIndex = 0; colIndex < columnCount; colIndex++) {
            const cellRef = XLSX.utils.encode_cell({ r: rowIndex + 1, c: colIndex });
            if (!panelWs[cellRef]) panelWs[cellRef] = { t: 's', v: '' };
            if (!panelWs[cellRef].s) panelWs[cellRef].s = {};
            panelWs[cellRef].s.font = { color: { rgb: 'A0522D' } }; // Brown color
            panelWs[cellRef].s.alignment = { horizontal: 'left' }; // Keep left alignment
          }
        }
      });

      // Set dynamic column widths based on content length
      const columnHeaders = ['Plywood Brand', 'Laminate Code', 'Height', 'Width', 'No Qty', 'Front / Back', 'Gaddi 8mm', 'Note', 'Room Name'];
      const columnWidths = columnHeaders.map((header, colIndex) => {
        // Start with header length
        let maxLength = header.length;

        // Check all data rows for this column
        panelData.forEach(row => {
          const cellValue = Object.values(row)[colIndex];
          const cellLength = cellValue ? String(cellValue).length : 0;
          if (cellLength > maxLength) {
            maxLength = cellLength;
          }
        });

        // Add some padding and set minimum width
        return { wch: Math.max(maxLength + 2, 10) };
      });

      panelWs['!cols'] = columnWidths;

      XLSX.utils.book_append_sheet(wb, panelWs, 'Panel Details');

      // Sheet 2: Project Summary
      const summaryData = [
        { 'Project Details': 'Project Name', 'Value': projectName },
        { 'Project Details': 'Date Generated', 'Value': new Date().toLocaleDateString() },
        { 'Project Details': 'Total Panels', 'Value': allPanels.length }
      ];

      const summaryWs = XLSX.utils.json_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, summaryWs, 'Project Summary');

      // Sheet 3: Material Summary by Laminate
      const summary = cuttingListSummary;
      const materialData = summary.panelGroups.map((group, index) => ({
        'S.No': index + 1,
        'Laminate Code': group.laminateCode,
        'Panel Count': group.panels.length,
        'Total Area (m²)': group.totalArea.toFixed(3),
        'Sample Dimensions': group.panels.slice(0, 3).map(p => `${p.width}×${p.height}mm`).join(', ') +
          (group.panels.length > 3 ? ` (+${group.panels.length - 3} more)` : '')
      }));

      const materialWs = XLSX.utils.json_to_sheet(materialData);
      XLSX.utils.book_append_sheet(wb, materialWs, 'Material Summary');

      // Generate and download Google Sheets compatible file
      XLSX.writeFile(wb, `maya-interiors-cutting-list-${new Date().toISOString().split('T')[0]}.xlsx`);

      toast({
        title: "Excel File Generated Successfully",
        description: `Complete cutting list with ${allPanels.length} panels exported. File is compatible with Google Sheets.`
      });

    } catch (error) {
      console.error('Excel generation error:', error);
      // PATCH 39: Use centralized error toast
      toastError(error);
    }
  };

  const printList = () => {
    // Create a print-friendly A4 format view
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({
        title: "Print Blocked",
        description: "Please allow popups to use print functionality.",
        variant: "destructive"
      });
      return;
    }

    const projectName = "Maya Interiors Kitchen Project";
    const allPanels = cabinets.flatMap(generatePanels);
    const summary = cuttingListSummary;

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${projectName} - Cutting List</title>
          <style>
            @page {
              size: A4;
              margin: 15mm;
            }
            @media print {
              body { -webkit-print-color-adjust: exact; color-adjust: exact; }
              .page-break { page-break-before: always; }
              .no-print { display: none; }
            }
            body {
              font-family: Arial, sans-serif;
              font-size: 12px;
              line-height: 1.4;
              margin: 0;
              padding: 0;
            }
            .header {
              text-align: center;
              border-bottom: 2px solid #333;
              padding-bottom: 10px;
              margin-bottom: 20px;
            }
            .header h1 {
              margin: 0;
              font-size: 24px;
              color: #333;
            }
            .project-info {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 20px;
              margin-bottom: 20px;
            }
            .info-section {
              background: #f8f9fa;
              padding: 15px;
              border-radius: 5px;
            }
            .info-section h3 {
              margin: 0 0 10px 0;
              color: #495057;
              border-bottom: 1px solid #dee2e6;
              padding-bottom: 5px;
            }
            .cabinet-list {
              margin-bottom: 30px;
            }
            .cabinet-item {
              background: #fff;
              border: 1px solid #dee2e6;
              border-radius: 5px;
              padding: 15px;
              margin-bottom: 15px;
            }
            .cabinet-header {
              font-weight: bold;
              font-size: 14px;
              color: #495057;
              margin-bottom: 10px;
              border-bottom: 1px solid #e9ecef;
              padding-bottom: 5px;
            }
            .panel-grid {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
              gap: 10px;
            }
            .panel-item {
              background: #f8f9fa;
              padding: 8px;
              border-radius: 3px;
              border-left: 4px solid #007bff;
            }
            .panel-name {
              font-weight: bold;
              font-size: 11px;
              color: #495057;
            }
            .panel-dims {
              font-size: 10px;
              color: #6c757d;
            }
            .laminate-badge {
              display: inline-block;
              background: #e9ecef;
              padding: 2px 6px;
              border-radius: 10px;
              font-size: 9px;
              color: #495057;
              margin-top: 4px;
            }
            .summary-table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
            }
            .summary-table th,
            .summary-table td {
              border: 1px solid #dee2e6;
              padding: 8px;
              text-align: left;
            }
            .summary-table th {
              background: #f8f9fa;
              font-weight: bold;
            }
            .totals {
              background: #e3f2fd;
              padding: 15px;
              border-radius: 5px;
              margin-top: 20px;
            }
            .totals h4 {
              margin: 0 0 10px 0;
              color: #1565c0;
            }
            .total-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 5px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${projectName} - Cutting List</h1>
            <p>Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
          </div>

          <div class="project-info">
            <div class="info-section">
              <h3>Project Details</h3>
              <p><strong>Total Cabinets:</strong> ${cabinets.length}</p>
              <p><strong>Total Panels:</strong> ${summary.totalPanels}</p>
              <p><strong>Total Area:</strong> ${summary.totalArea.toFixed(2)} m²</p>
            </div>
            <div class="info-section">
              <h3>Material Summary</h3>
              ${summary.panelGroups.map((group: any) => `
                <p><strong>${group.laminate} Laminate:</strong> ${group.panels.length} panels (${group.totalArea.toFixed(2)} m²)</p>
              `).join('')}
            </div>
          </div>

          <div class="cabinet-list">
            <h3>Cabinet Details</h3>
            ${cabinets.map(cabinet => {
      const panels = generatePanels(cabinet);
      return `
                <div class="cabinet-item">
                  <div class="cabinet-header">
                    ${cabinet.name} - ${cabinet.width}mm × ${cabinet.height}mm × ${cabinet.depth}mm
                  </div>
                  <div class="panel-grid">
                    ${panels.map(panel => `
                      <div class="panel-item">
                        <div class="panel-name">${panel.name}</div>
                        <div class="panel-dims">${panel.width}mm × ${panel.height}mm</div>
                      </div>
                    `).join('')}
                  </div>
                </div>
              `;
    }).join('')}
          </div>

          <div class="page-break"></div>

          <h3>Complete Panel List</h3>
          <table class="summary-table">
            <thead>
              <tr>
                <th>Panel Name</th>
                <th>Width (mm)</th>
                <th>Height (mm)</th>
                <th>Area (m²)</th>
                <th>Laminate Code</th>
              </tr>
            </thead>
            <tbody>
              ${allPanels.map(panel => `
                <tr>
                  <td>${panel.name}</td>
                  <td>${panel.width}</td>
                  <td>${panel.height}</td>
                  <td>${(panel.width * panel.height / 1000000).toFixed(3)}</td>
                  <td>${panel.laminateCode || 'None'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="totals">
            <h4>Project Totals</h4>
            <div class="total-row">
              <span>Total Panels:</span>
              <span>${summary.totalPanels}</span>
            </div>
            <div class="total-row">
              <span>Total Area:</span>
              <span>${summary.totalArea.toFixed(2)} m²</span>
            </div>
            ${summary.panelGroups.map((group: any) => `
              <div class="total-row">
                <span>${group.laminate} Laminate Area:</span>
                <span>${group.totalArea.toFixed(2)} m²</span>
              </div>
            `).join('')}
          </div>

          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() {
                window.close();
              };
            }
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();

    toast({
      title: "Print Preview Ready",
      description: "A4 format print preview has been opened."
    });
  };

  const handleSaveToClientFolder = async () => {
    // PATCH 40: Guard against offline backend
    if (!apiGuard("Save to folder")) return;

    // ✅ FIX #3: Prevent saving while wood grains preferences are loading
    if (!woodGrainsReady) {
      toast({
        variant: "destructive",
        title: "Please Wait",
        description: "Wood grain preferences are still loading. Please wait a moment before saving."
      });
      return;
    }

    // Prevent concurrent saves
    if (isSaving) {
      return;
    }

    if (!clientName || clientName.trim().length === 0) {
      toast({
        title: "Client Name Required",
        description: "Please enter a client name before saving.",
        variant: "destructive",
      });
      return;
    }

    if (cabinets.length === 0) {
      toast({
        title: "No Cabinets",
        description: "Add some cabinets before saving.",
        variant: "destructive",
      });
      return;
    }

    // Save directly without confirmation
    performSaveToClientFolder();
  };

  const performSaveToClientFolder = async () => {
    setIsSaving(true);

    try {
      // Generate material list CSV
      const materialListText = generateMaterialListCSV(
        liveMaterialSummary,
        clientName,
        selectedRoom === 'Custom' ? customRoomName : selectedRoom
      );

      // PATCH 32: Use worker if available, fallback to main thread
      const optimizerParams = {
        cabinets,
        manualPanels,
        sheetWidth,
        sheetHeight,
        kerf,
        woodGrainsPreferences,
        generatePanels,
      };

      // PATCH 47: Feature flag controls worker usage
      const optimizerResult = useWorker && window.Worker
        ? await runOptimizerInWorker(optimizerParams)
        : await runOptimizerEngine(optimizerParams);

      if (optimizerResult.error) {
        throw optimizerResult.error;
      }

      const { brandResults } = optimizerResult;

      const sheet = { w: sheetWidth, h: sheetHeight, kerf: kerf };

      // PATCH 29: Use export orchestrator for PDF generation
      const pdfFilename = generatePDFFilename(clientName);
      const { pdf } = generateCutlistPDFForUpload({
        brandResults,
        sheet,
        cabinets,
        materialSummary: liveMaterialSummary,
        deletedSheets: deletedPreviewSheets,
        orientation: pdfOrientation,
        filename: pdfFilename,
        clientName,
      });

      // Convert PDF to base64
      const pdfBlob = pdf.output('blob');
      const pdfBase64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(pdfBlob);
      });

      // Convert material list to base64
      const materialListBlob = new Blob([materialListText], { type: 'text/plain' });
      const materialListBase64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(materialListBlob);
      });

      // Send to backend
      const response = await apiRequest(
        'POST',
        `/api/clients/${clientName}/files`,
        {
          clientName,
          pdf: {
            filename: pdfFilename,
            mimeType: 'application/pdf',
            base64: pdfBase64,
          },
          materialList: {
            filename: `${clientName}-material-list.txt`,
            mimeType: 'text/plain',
            base64: materialListBase64,
          },
        }
      );

      const result = await response.json() as { clientSlug: string; success: boolean };

      toast({
        title: "Files Saved Successfully",
        description: `PDF and material list saved to folder: ${result.clientSlug}`,
      });
    } catch (error) {
      console.error('Save error:', error);
      // PATCH 39: Use centralized error toast
      toastError(error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
      {/* Modern SaaS Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/60 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo & Brand */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
                <i className="fas fa-layer-group text-white text-sm"></i>
              </div>
              <div className="hidden sm:block">
                <h1 className="text-lg font-bold text-slate-900 tracking-tight">CutList Pro</h1>
                <p className="text-[10px] text-slate-500 -mt-0.5 font-medium">Precision Cutting Made Easy</p>
              </div>
            </div>

            {/* Center Navigation */}
            <nav className="hidden md:flex items-center gap-1 bg-slate-100/80 rounded-full p-1">
              <button
                onClick={() => navigate("/visual-quotation")}
                className="px-4 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-white rounded-full transition-all"
              >
                Visual Quote
              </button>
              <button
                onClick={() => navigate("/quotations")}
                className="px-4 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-white rounded-full transition-all"
              >
                Quotations
              </button>
              <button
                onClick={() => navigate("/crm")}
                className="px-4 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-white rounded-full transition-all"
              >
                CRM
              </button>
            </nav>

            {/* Right Actions */}
            <div className="flex items-center gap-2">
              {/* Logic Lock - Compact */}
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-full">
                <span className="text-xs font-medium text-slate-500">Logic</span>
                <Switch
                  id="calc-lock"
                  checked={calculationLogicLocked}
                  onCheckedChange={setCalculationLogicLocked}
                  className="scale-75"
                />
                <i className={`fas ${calculationLogicLocked ? 'fa-lock' : 'fa-unlock'} text-xs ${calculationLogicLocked ? 'text-blue-500' : 'text-slate-400'}`}></i>
              </div>

              {/* Export Dropdown */}
              <div className="relative group">
                <Button
                  size="sm"
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/25 rounded-full px-4"
                >
                  <i className="fas fa-download mr-2"></i>
                  Export
                  <i className="fas fa-chevron-down ml-2 text-[10px] opacity-70"></i>
                </Button>
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-200 py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                  <button
                    onClick={exportToExcel}
                    className="w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-3"
                  >
                    <i className="fas fa-file-excel text-green-600"></i>
                    Export to Excel
                  </button>
                  <button
                    onClick={exportToGoogleSheets}
                    className="w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-3"
                  >
                    <i className="fab fa-google text-blue-500"></i>
                    Google Sheets
                  </button>
                  <div className="border-t border-slate-100 my-1"></div>
                  <button
                    onClick={printList}
                    className="w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-3"
                  >
                    <i className="fas fa-print text-slate-500"></i>
                    Print
                  </button>
                </div>
              </div>

              {/* Mobile Menu */}
              <button className="md:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg">
                <i className="fas fa-bars"></i>
              </button>
            </div>
          </div>

          {/* Mobile Navigation */}
          <div className="md:hidden flex items-center gap-2 pb-3 overflow-x-auto scrollbar-hide -mx-4 px-4">
            <Button
              size="sm"
              variant="ghost"
              className="flex-shrink-0 text-xs"
              onClick={() => navigate("/visual-quotation")}
            >
              <i className="fas fa-drafting-compass mr-1.5"></i>
              Visual
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="flex-shrink-0 text-xs"
              onClick={() => navigate("/quotations")}
            >
              <i className="fas fa-file-invoice mr-1.5"></i>
              Quotes
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="flex-shrink-0 text-xs"
              onClick={() => navigate("/crm")}
            >
              <i className="fas fa-database mr-1.5"></i>
              CRM
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Left Column - Controls */}
          <div className="lg:col-span-2 space-y-6">

            {/* Master Settings Card */}
            <Card className="bg-white/70 backdrop-blur-sm border-slate-200/60 shadow-xl shadow-slate-200/50 rounded-2xl overflow-hidden">
              <CardHeader className="px-5 sm:px-6 py-4 bg-gradient-to-r from-slate-50 to-transparent border-b border-slate-100">
                <CardTitle className="flex items-center justify-between text-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center">
                      <i className="fas fa-sliders-h text-white text-xs"></i>
                    </div>
                    <span className="text-base font-semibold">Master Settings</span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setMasterSettingsVisible(!masterSettingsVisible)}
                    className="h-8 w-8 p-0 rounded-full hover:bg-slate-100"
                    data-testid="button-toggle-master-settings"
                  >
                    <i className={`fas ${masterSettingsVisible ? 'fa-chevron-up' : 'fa-chevron-down'} text-slate-500 text-xs`}></i>
                  </Button>
                </CardTitle>
              </CardHeader>
              {masterSettingsVisible && (
                <CardContent className="px-5 sm:px-6 py-5">
                  <div className="space-y-5">
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-4">
                      <p className="text-sm text-blue-700 flex items-start gap-2">
                        <i className="fas fa-lightbulb text-blue-500 mt-0.5"></i>
                        <span>Set default materials for <strong>new</strong> cabinets. <span className="text-blue-500">Existing items won't change.</span></span>
                      </p>
                    </div>

                    {/* Row 1: Plywood Brand */}
                    <PlywoodSelectorPanel
                      value={masterPlywoodBrand}
                      onChange={setMasterPlywoodBrand}
                      onSave={(val) => saveMasterSettings({ masterPlywoodBrand: val })}
                    />

                    {/* Row 2: Laminate with Wood Grains toggle */}
                    <LaminateSelectorPanel
                      value={masterLaminateCode}
                      onChange={setMasterLaminateCode}
                      onSave={(val) => saveMasterSettings({ masterLaminateCode: val })}
                      showWoodGrainToggle={true}
                      woodGrainsPreferences={woodGrainsPreferences}
                      onWoodGrainChange={(code, enabled) => {
                        setWoodGrainsPreferences((prev) => ({ ...prev, [code]: enabled }));
                      }}
                      helpText="* Selected items are added to your Quick-Fill library."
                    />

                    {/* Optimize Plywood Usage Section */}
                    <div className="mt-6 pt-4 border-t border-gray-200">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <Label className="text-sm font-medium text-gray-700 mb-1 block flex items-center">
                            <i className="fas fa-leaf text-green-500 mr-2"></i>
                            Save Material Mode
                          </Label>
                          <p className="text-xs text-gray-500 leading-relaxed">
                            Groups different cabinets together on the same sheet if they match Plywood & Laminate.
                            <br /><span className="text-xs opacity-75">Turn OFF to cut each cabinet separately.</span>
                          </p>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant={optimizePlywoodUsage ? "default" : "outline"}
                          onClick={() => {
                            const newValue = !optimizePlywoodUsage;
                            setOptimizePlywoodUsage(newValue);
                            // ✅ Persist to backend
                            saveMasterSettings({ optimizePlywoodUsage: newValue as any });
                          }}
                          className={`h-9 px-4 text-sm whitespace-nowrap transition-all ${optimizePlywoodUsage
                            ? 'bg-green-600 hover:bg-green-700 text-white border-transparent shadow-sm'
                            : 'text-gray-500 border-gray-300 hover:bg-gray-50'
                            }`}
                          data-testid="button-optimize-plywood"
                        >
                          {optimizePlywoodUsage ? (
                            <><i className="fas fa-check mr-2"></i>Active</>
                          ) : (
                            <><i className="fas fa-power-off mr-2"></i>Off</>
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Sheet Size Section */}
                    <div className="mt-6 pt-4 border-t border-gray-200">
                      <Label className="text-sm font-medium text-gray-700 mb-3 block">
                        <i className="fas fa-ruler-combined mr-2 text-blue-500"></i>
                        Sheet Size Settings
                      </Label>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Sheet Width */}
                        <div className="space-y-2">
                          <Label className="text-xs text-slate-600">Sheet Width (mm)</Label>
                          <Input
                            type="number"
                            value={sheetWidth}
                            onChange={(e) => setSheetWidth(parseInt(e.target.value) || 1210)}
                            placeholder="Width"
                            className="text-sm"
                            min="500"
                            max="5000"
                            data-testid="input-sheet-width"
                          />
                        </div>

                        {/* Sheet Height */}
                        <div className="space-y-2">
                          <Label className="text-xs text-slate-600">Sheet Height (mm)</Label>
                          <Input
                            type="number"
                            value={sheetHeight}
                            onChange={(e) => setSheetHeight(parseInt(e.target.value) || 2420)}
                            placeholder="Height"
                            className="text-sm"
                            min="500"
                            max="5000"
                            data-testid="input-sheet-height"
                          />
                        </div>

                        {/* Kerf */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Label className="text-xs text-slate-600">Kerf (mm)</Label>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <i className="fas fa-info-circle text-slate-400 text-[10px] cursor-help"></i>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Blade thickness (usually 3-4mm). <br />Material lost during cutting.</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                          <Input
                            type="number"
                            value={kerf}
                            onChange={(e) => {
                              const value = parseInt(e.target.value);
                              if (value >= 0 && value <= 10) {
                                setKerf(value);
                              }
                            }}
                            placeholder="Kerf"
                            className="text-sm"
                            min="0"
                            max="10"
                            data-testid="input-kerf"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Wood Grain Settings Section */}
                    <div className="mt-6 pt-4 border-t border-gray-200">
                      <Label className="text-sm font-medium text-gray-700 mb-3 block">
                        <i className="fas fa-seedling mr-2 text-green-500"></i>
                        Wood Grain Settings
                      </Label>
                      <div className="space-y-4">
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                          <p className="text-xs text-green-800">
                            <i className="fas fa-info-circle mr-1"></i>
                            Toggle wood grain for each laminate code. When enabled, panels use dimensional mapping for optimization.
                          </p>
                        </div>

                        {/* Laminate codes list with toggles */}
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                          {globalLaminateMemory.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                              <i className="fas fa-inbox text-4xl mb-2"></i>
                              <p className="text-sm">No laminate codes saved yet</p>
                              <p className="text-xs mt-1">Add laminate codes in Master Settings or Cabinet Configuration</p>
                            </div>
                          ) : (
                            /* PATCH 25: Use memoized uniqueLaminateCodes */
                            uniqueLaminateCodes.map((code) => {
                              const isEnabled = woodGrainsPreferences[code] === true;
                              return (
                                <div
                                  key={code}
                                  className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                  <div className="flex items-center gap-3">
                                    <i className={`fas fa-layer-group ${isEnabled ? 'text-green-500' : 'text-gray-400'}`}></i>
                                    <div>
                                      <div className={`font-medium text-sm ${isEnabled ? "text-amber-700 font-bold" : ""}`}>{code}</div>
                                      <div className="text-xs text-gray-500">
                                        {isEnabled ? '✓ Wood grain enabled' : '✗ Wood grain disabled'}
                                      </div>
                                    </div>
                                  </div>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={async () => {
                                      const newValue = !isEnabled;
                                      try {
                                        const response = await apiRequest('POST', '/api/wood-grains-preference', { laminateCode: code, woodGrainsEnabled: newValue });
                                        setWoodGrainsPreferences((prev) => ({ ...prev, [code]: newValue }));
                                        toast({
                                          title: newValue ? "Wood Grain Enabled" : "Wood Grain Disabled",
                                          description: `${code} ${newValue ? 'now uses' : 'no longer uses'} wood grain memory`,
                                        });
                                      } catch (error) {
                                        console.error('Error toggling wood grains:', error);
                                        // PATCH 39: Use centralized error toast
                                        toastError(error);
                                      }
                                    }}
                                    className={`h-8 px-3 text-xs ${isEnabled ? 'bg-green-100 border-green-400 text-green-700 hover:bg-green-200' : 'hover:bg-gray-100'}`}
                                    data-testid={`toggle-wood-grain-${code}`}
                                  >
                                    {isEnabled ? 'ON' : 'OFF'}
                                  </Button>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>

            {/* Project Details Card */}
            <Card ref={projectDetailsSectionRef} className="bg-white/70 backdrop-blur-sm border-slate-200/60 shadow-xl shadow-slate-200/50 rounded-2xl overflow-hidden">
              <CardHeader className="px-5 sm:px-6 py-4 bg-gradient-to-r from-blue-50 to-transparent border-b border-slate-100">
                <CardTitle className="flex items-center justify-between text-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                      <i className="fas fa-folder-open text-white text-xs"></i>
                    </div>
                    <span className="text-base font-semibold">Project Details</span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setProjectDetailsVisible(!projectDetailsVisible)}
                    className="h-8 w-8 p-0 rounded-full hover:bg-slate-100"
                  >
                    {projectDetailsVisible ? <EyeOff className="w-4 h-4 text-slate-500" /> : <Eye className="w-4 h-4 text-slate-500" />}
                  </Button>
                </CardTitle>
              </CardHeader>
              {projectDetailsVisible && (
                <CardContent className="px-5 sm:px-6 py-5">
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                      <div className="space-y-2">
                        <Label>Client Name</Label>
                        <Input
                          type="text"
                          value={clientName}
                          onChange={(e) => setClientName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && clientName.trim() && cabinets.length > 0) {
                              handleSaveToClientFolder();
                            }
                          }}
                          placeholder="Enter client name (press Enter to save)"
                          disabled={!woodGrainsReady}
                          className="text-sm"
                          data-testid="input-client-name"
                        />
                        {clientName.trim() && (
                          <div className="flex items-center gap-2 text-xs text-gray-600 mt-1">
                            <i className="fas fa-folder text-blue-500"></i>
                            <span className="font-mono bg-gray-100 px-2 py-1 rounded">
                              /clients/{clientName.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-')}/
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label>Room</Label>
                        <div className="flex space-x-1">
                          <Select value={selectedRoom} onValueChange={setSelectedRoom}>
                            <SelectTrigger className="text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Kitchen">Kitchen</SelectItem>
                              <SelectItem value="Bedroom">Bedroom</SelectItem>
                              <SelectItem value="Living Room">Living Room</SelectItem>
                              <SelectItem value="Bathroom">Bathroom</SelectItem>
                              <SelectItem value="Office">Office</SelectItem>
                              <SelectItem value="Custom">Custom</SelectItem>
                            </SelectContent>
                          </Select>
                          {selectedRoom === 'Custom' && (
                            <Input
                              type="text"
                              value={customRoomName}
                              onChange={(e) => setCustomRoomName(e.target.value)}
                              placeholder="Room name"
                              className="text-sm"
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>


            {/* Cabinet Configuration Form */}
            <RenderGuard ready={materialsLoaded && masterSettingsLoaded}>
              {/* PATCH 20: Removed gaddi props - CabinetForm now uses form.watch()/setValue() directly */}
              {/* PATCH 36: Enforce array defaults at boundary */}
              <CabinetForm
                form={form}
                watchedValues={watchedValues}
                cabinetConfigMode={cabinetConfigMode}
                setCabinetConfigMode={setCabinetConfigMode}
                updateShutters={updateShutters}
                panelsLinked={panelsLinked}
                setPanelsLinked={setPanelsLinked}
                laminateCodes={Array.isArray(laminateCodes) ? laminateCodes : []}
                plywoodTypes={Array.isArray(validPlywood) ? validPlywood : []}
                handleAddCabinet={() => addCabinet(form.getValues())}
                cabinetHeightInputRef={cabinetHeightInputRef}
                shutterHeightInputRef={shutterHeightInputRef}
                cabinetSectionRef={cabinetSectionRef}
              />
            </RenderGuard>

            {/* Preview & Action Buttons - Modern SaaS Style */}
            <div className="flex flex-wrap justify-center gap-3 my-8">
              <Button
                type="button"
                onClick={() => {
                  const stored = localStorage.getItem('cutlist_spreadsheet_v1');
                  if (!stored) {
                    toast({
                      title: "No Spreadsheet Data",
                      description: "Please add rows to the Panel Spreadsheet first.",
                      variant: "destructive"
                    });
                    return;
                  }

                  try {
                    const data = JSON.parse(stored);
                    if (!Array.isArray(data) || data.length === 0) {
                      toast({
                        title: "No Spreadsheet Data",
                        description: "Please add rows to the Panel Spreadsheet first.",
                        variant: "destructive"
                      });
                      return;
                    }

                    // Scroll to spreadsheet section
                    const spreadsheetSection = document.querySelector('[data-spreadsheet-section]');
                    if (spreadsheetSection) {
                      spreadsheetSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      toast({
                        title: "Spreadsheet Ready",
                        description: "Your spreadsheet data is ready. Edit and customize as needed.",
                      });
                    }
                  } catch (err) {
                    // PATCH 39: Use centralized error toast
                    toastError(err);
                  }
                }}
                className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold px-6 py-2.5 rounded-xl shadow-lg shadow-emerald-500/25 transition-all hover:shadow-xl hover:shadow-emerald-500/30"
                data-testid="button-spreadsheet"
              >
                <i className="fas fa-table mr-2"></i>
                Spreadsheet
              </Button>
              <Button
                type="button"
                onClick={() => {
                  // PATCH 40: Guard against offline backend
                  if (!apiGuard("Preview optimization")) return;

                  const optValidation = validateBeforeOptimize(cabinets);
                  if (!optValidation.valid) {
                    const error = optValidation.errors[0];
                    if (error) {
                      toast({
                        title: error.title,
                        description: error.description,
                        variant: "destructive"
                      });
                    }
                    return;
                  }

                  setIsOptimizing(true);

                  // Small delay to show "Optimizing..." state before opening dialog
                  setTimeout(() => {
                    openPreview();
                    setIsPreviewActive(true);
                    // PATCH 28: Reset preview state on new preview using store
                    usePreviewStore.getState().clearAll();

                    // Hide optimization indicator after optimization completes (500ms + 200ms buffer)
                    setTimeout(() => {
                      setIsOptimizing(false);
                    }, 700);
                  }, 100);
                }}
                className="bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 text-white font-semibold px-6 py-2.5 rounded-xl shadow-lg shadow-violet-500/25 transition-all hover:shadow-xl hover:shadow-violet-500/30"
                data-testid="button-preview-cabinet"
                disabled={isOptimizing || apiStatus === "error"}
              >
                {isOptimizing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Optimizing...
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4 mr-2" />
                    Preview
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={openClearConfirm}
                className="border-slate-300 text-slate-600 hover:bg-slate-50 font-medium px-6 py-2.5 rounded-xl transition-all"
                data-testid="button-clear-preview"
              >
                <i className="fas fa-eraser mr-2 text-slate-400"></i>
                Clear
              </Button>
            </div>

            {/* Design Center */}
            <Card ref={designCenterSectionRef} className="bg-white/70 backdrop-blur-sm border-slate-200/60 shadow-xl shadow-slate-200/50 rounded-2xl overflow-hidden">
              <CardHeader className="px-5 sm:px-6 py-4 bg-gradient-to-r from-purple-50 to-transparent border-b border-slate-100">
                <CardTitle className="flex items-center justify-between text-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                      <i className="fas fa-palette text-white text-xs"></i>
                    </div>
                    <span className="text-base font-semibold">Design Center</span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setDesignCenterVisible(!designCenterVisible)}
                    className="h-8 w-8 p-0 rounded-full hover:bg-slate-100"
                  >
                    {designCenterVisible ? <EyeOff className="w-4 h-4 text-slate-500" /> : <Eye className="w-4 h-4 text-slate-500" />}
                  </Button>
                </CardTitle>
              </CardHeader>
              {designCenterVisible && (
                <CardContent className="px-5 sm:px-6 py-5">
                  <DesignCenter />
                </CardContent>
              )}
            </Card>

          </div>

          {/* Right Column - Cabinet List & Summary */}
          <div className="space-y-6">

            {/* Summary Panel - Stats, Material Summary, Cutting List Summary */}
            <SummaryPanel
              cabinets={cabinets}
              cuttingListSummary={cuttingListSummary}
              liveMaterialSummary={liveMaterialSummary}
              shutterCount={calculateShutterCount(cabinets)}
              onExportExcel={exportToExcel}
              onExportGoogleSheets={exportToGoogleSheets}
              onPrint={printList}
            />

{/* PATCH 23: Undo/Redo Buttons */}
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                size="sm"
                disabled={!cabinetsHistory.canUndo}
                onClick={() => {
                  cabinetsHistory.undo();
                  manualPanelsHistory.undo();
                }}
                title="Undo (Ctrl+Z)"
                className="rounded-lg border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                <i className="fas fa-undo mr-1.5 text-slate-400"></i>
                Undo
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!cabinetsHistory.canRedo}
                onClick={() => {
                  cabinetsHistory.redo();
                  manualPanelsHistory.redo();
                }}
                title="Redo (Ctrl+Y)"
                className="rounded-lg border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                <i className="fas fa-redo mr-1.5 text-slate-400"></i>
                Redo
              </Button>
            </div>

{/* Cabinet List - PATCH 37: Empty state */}
            {(!cabinets || cabinets.length === 0) ? (
              <EmptyBlock
                title="No cabinets added"
                description="Configure a cabinet and click 'Add Cabinet' to begin."
              />
            ) : (
              <CabinetSummaryPanel
                cabinets={cabinets}
                removeCabinet={removeCabinet}
                form={form}
              />
            )}

          </div>
        </div>
      </main >

      {/* Preview Dialog */}
      <PreviewDialog
        open={showPreviewDialog}
        onOpenChange={(v: boolean) => (v ? openPreview() : closePreview())}
        cabinets={cabinets}
        brandResults={previewBrandResults}
        deletedPreviewSheets={deletedPreviewSheets}
        deletedPreviewPanels={deletedPreviewPanels}
        woodGrainsReady={woodGrainsReady}
        sheetWidth={sheetWidth}
        sheetHeight={sheetHeight}
        kerf={kerf}
        pdfOrientation={pdfOrientation}
        clientName={clientName}
        liveMaterialSummary={liveMaterialSummary}
        colourFrameEnabled={colourFrameEnabled}
        colourFrameForm={colourFrameForm}
        manualPanels={manualPanels}
      />

      {/* Manual Panel Dialog */}
      <ManualPanelDialog
        open={showManualPanelDialog}
        onOpenChange={(v: boolean) => (v ? openManualPanel() : closeManualPanel())}
        manualPanelForm={manualPanelForm}
        setManualPanelForm={setManualPanelForm}
        globalPlywoodBrandMemory={globalPlywoodBrandMemory}
        laminateCodes={laminateCodes}
        woodGrainsPreferences={woodGrainsPreferences}
        selectedSheetContext={selectedSheetContext}
        setSelectedSheetContext={setSelectedSheetContext}
        setManualPanels={setManualPanels}
      />

      {/* Clear Preview Confirmation Dialog - PATCH 28: Removed deleted state props (now uses store) */}
      <ClearConfirmDialog
        open={showClearConfirmDialog}
        onOpenChange={(v: boolean) => (v ? openClearConfirm() : closeClearConfirm())}
        form={form}
        updateCabinets={updateCabinets}
        setManualPanels={setManualPanels}
        closePreview={closePreview}
        setIsPreviewActive={setIsPreviewActive}
        masterPlywoodBrand={masterPlywoodBrand}
        masterLaminateCode={masterLaminateCode}
        onClearAutosave={clearAutosave}
      />

      {/* Material Validation Error Dialog */}
      <MaterialValidationDialog
        open={showMaterialConfirmDialog}
        onOpenChange={(v: boolean) => (v ? openMaterialConfirm() : closeMaterialConfirm())}
        pendingMaterialAction={pendingMaterialAction}
        setPendingMaterialAction={setPendingMaterialAction}
      />

      {/* Panel Delete Confirmation Dialog - PATCH 28: Removed deleted state prop (now uses store) */}
      <PanelDeleteDialog
        panelToDelete={panelToDelete}
        setPanelToDelete={setPanelToDelete}
      />

      {/* Panel Spreadsheet Section */}
      <SpreadsheetSection
        form={form}
        panelsLinked={panelsLinked}
        syncCabinetConfigFrontLaminate={syncCabinetConfigFrontLaminate}
        cabinetSectionRef={cabinetSectionRef}
      />

      {/* Design Center Section */}
      <DesignCenterSection
        handleDesignCenterExport={handleDesignCenterExport}
      />
    </div>
  );
}
