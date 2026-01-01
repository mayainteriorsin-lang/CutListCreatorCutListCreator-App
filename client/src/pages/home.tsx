import { useState, useEffect, useMemo, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from "react-router-dom";
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
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
import CabinetForm from "@/components/cabinet-form/CabinetForm";
import PanelDeleteDialog from "@/components/cutlist-preview/PanelDeleteDialog";
import { Cabinet, cabinetSchema, Panel, CuttingListSummary, LaminateCode, cabinetTypes, CabinetType, LaminateCodeGodown } from '@shared/schema';
import * as XLSX from 'xlsx';
import { generateCutlistPDF } from '@/lib/pdf/PDFEngine';
import { generateMaterialListCSV } from '@/lib/material-list-export';
import { generateUUID } from "@/lib/uuid";
import { Eye, EyeOff, Loader2 } from 'lucide-react';

// ✅ MODULES: Simple panel optimization
import { calculateGaddiLineDirection, shouldShowGaddiMarking } from '@/features/gaddi';
import { optimizeCutlist } from '@/lib/cutlist-optimizer';
import { composeLaminateCode } from '@/lib/laminates/composeLaminateCode';
import { generatePanels } from '@/lib/panels/generatePanels';
import { runOptimizerEngine } from '@/lib/optimizer';
import type { BrandResult, Sheet } from '@/types/cutlist';
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

// Cabinet form memory helpers
const CABINET_FORM_MEMORY_KEY = 'cabinetFormMemory_v1';

import { useMaterialStore } from '@/features/materialStore';

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

export default function Home() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const cabinetSectionRef = useRef<HTMLDivElement>(null);
  const projectDetailsSectionRef = useRef<HTMLDivElement>(null);
  const plywoodLaminatesRef = useRef<HTMLButtonElement>(null);
  const individualPanelsRef = useRef<HTMLButtonElement>(null);
  const centerPostSectionRef = useRef<HTMLDivElement>(null);
  const shutterConfigSectionRef = useRef<HTMLDivElement>(null);
  const designCenterSectionRef = useRef<HTMLDivElement>(null);
  const cabinetHeightInputRef = useRef<HTMLInputElement>(null);
  const shutterHeightInputRef = useRef<HTMLInputElement>(null);
  const [cabinets, setCabinets] = useState<Cabinet[]>([]);
  const [units] = useState<'mm' | 'inches'>('mm');
  const [laminateCodes, setLaminateCodes] = useState<LaminateCode[]>([]);
  const [calculationLogicLocked, setCalculationLogicLocked] = useState<boolean>(true);
  const [selectedRoom, setSelectedRoom] = useState('Kitchen');
  const [customRoomName, setCustomRoomName] = useState('');
  const [clientName, setClientName] = useState('');
  const [cabinetConfigVisible, setCabinetConfigVisible] = useState(false);
  const [cabinetConfigMode, setCabinetConfigMode] = useState<'basic' | 'advanced'>('advanced');
  const [plywoodLaminatesOpen, setPlywoodLaminatesOpen] = useState(false); // Collapsible section for plywood and laminates - default CLOSED
  const [individualPanelsOpen, setIndividualPanelsOpen] = useState(true); // Collapsible section for individual panel laminate selection - defaults to OPEN for discussion/modification before creating cabinet
  const [projectDetailsVisible, setProjectDetailsVisible] = useState(false);
  const [designCenterVisible, setDesignCenterVisible] = useState(false);
  const [pdfOrientation] = useState<'landscape' | 'portrait'>('portrait');
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [deletedPreviewSheets, setDeletedPreviewSheets] = useState<Set<string>>(new Set());
  const [isPreviewActive, setIsPreviewActive] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [showManualPanelDialog, setShowManualPanelDialog] = useState(false);
  const [showClearConfirmDialog, setShowClearConfirmDialog] = useState(false);
  const [showMaterialConfirmDialog, setShowMaterialConfirmDialog] = useState(false);
  const [pendingMaterialAction, setPendingMaterialAction] = useState<{
    type: 'cabinet' | 'shutter';
    payload: any;
    onConfirm: () => void;
    missingPanels?: string[];
  } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deletedPreviewPanels, setDeletedPreviewPanels] = useState<Set<string>>(new Set());
  const savedClientsRef = useRef<Set<string>>(new Set());

  // State for async optimization results
  const [previewBrandResults, setPreviewBrandResults] = useState<BrandResult[]>([]);
  const [liveMaterialSummary, setLiveMaterialSummary] = useState<MaterialSummary>({
    plywood: {},
    laminates: {},
    totalPlywoodSheets: 0
  });
  const [panelToDelete, setPanelToDelete] = useState<{ sheetId: string; panelId: string; panelIndex: number } | null>(null);
  const [selectedSheetContext, setSelectedSheetContext] = useState<{
    brand: string;
    laminateCode: string;
    isBackPanel: boolean;
    sheetId: string;
  } | null>(null);
  const [manualPanels, setManualPanels] = useState<Array<{
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
  }>>([]);
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

  // Quotation state
  const [quotationNumber, setQuotationNumber] = useState('');
  const [quotationDate, setQuotationDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [quotationNotes, setQuotationNotes] = useState('');
  const [quotationDetailsVisible, setQuotationDetailsVisible] = useState(false);

  // Master Settings state managed by Zustand
  const {
    masterSettings,
    plywoodOptions,
    laminateOptions,
    isLoadingMasterSettings,
    isLoadingMaterials,
    fetchMasterSettings,
    saveMasterSettings,
    fetchMaterials,
    addLaminate,
    addPlywood
  } = useMaterialStore();



  const [masterSettingsVisible, setMasterSettingsVisible] = useState(false);
  const [masterPlywoodBrand, setMasterPlywoodBrand] = useState('');
  const [masterLaminateCode, setMasterLaminateCode] = useState('');
  const [masterInnerLaminateCode, setMasterInnerLaminateCode] = useState('');

  // Wood grain preferences still tracked locally for now, but synced with types
  const [woodGrainsPreferences, setWoodGrainsPreferences] = useState<Record<string, boolean>>({});
  const [optimizePlywoodUsage, setOptimizePlywoodUsage] = useState(true);

  // Initial Data Fetch
  useEffect(() => {
    fetchMasterSettings();
    fetchMaterials();
  }, []); // Run once on mount

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

  // Helper to get current validation arrays
  const getValidationArrays = () => {
    const validLaminates = !isLoadingMaterials && laminateOptions.length > 0
      ? laminateOptions.map(item => item.code.toLowerCase())
      : undefined;
    const validPlywood = !isLoadingMaterials && plywoodOptions.length > 0
      ? plywoodOptions.map(item => item.brand.toLowerCase())
      : undefined;
    return { validLaminates, validPlywood };
  };

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
    const fetchWoodGrainsPreferences = async () => {
      try {
        const response = await fetch('/api/wood-grains-preferences');
        const data = await response.json();
        // Convert array to map using camelCase format: { "456SF Terra Wood": true, ... }
        const prefsMap: Record<string, boolean> = {};
        data.forEach((item: { laminateCode: string; woodGrainsEnabled: boolean }) => {
          prefsMap[item.laminateCode] = item.woodGrainsEnabled;
        });
        setWoodGrainsPreferences(prefsMap);
      } catch (error) {
        console.error('Error fetching wood grains preferences:', error);
      }
    };
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
  const topPanelLaminateCode = form.watch('topPanelLaminateCode');
  const bottomPanelLaminateCode = form.watch('bottomPanelLaminateCode');
  const leftPanelLaminateCode = form.watch('leftPanelLaminateCode');
  const rightPanelLaminateCode = form.watch('rightPanelLaminateCode');
  const backPanelLaminateCode = form.watch('backPanelLaminateCode');
  const shutterLaminateCode = form.watch('shutterLaminateCode');
  const shutterPlywoodBrand = form.watch('shutterPlywoodBrand');
  const shutterInnerLaminateCode = form.watch('shutterInnerLaminateCode');

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

  // ✅ Derive variables from Zustand store (for backward compatibility with existing code)
  const globalLaminateMemory = laminateOptions.map(item => item.code);
  const plywoodBrandMemoryData = plywoodOptions;
  const globalPlywoodBrandMemory = plywoodOptions.map(item => item.brand);

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

  // State for panel laminate selections
  const [laminateSelection, setLaminateSelection] = useState('');
  const [bottomLaminateSelection, setBottomLaminateSelection] = useState('');
  const [leftLaminateSelection, setLeftLaminateSelection] = useState('');
  const [rightLaminateSelection, setRightLaminateSelection] = useState('');
  const [backLaminateSelection, setBackLaminateSelection] = useState('');
  const [shutterLaminateSelection, setShutterLaminateSelection] = useState('');
  const [customShutterLaminateSelection, setCustomShutterLaminateSelection] = useState('');
  const [backPanelPlywoodSelection, setBackPanelPlywoodSelection] = useState('');

  // State for Gaddi toggles (default to enabled)
  const [topGaddiEnabled, setTopGaddiEnabled] = useState(true);
  const [bottomGaddiEnabled, setBottomGaddiEnabled] = useState(true);
  const [leftGaddiEnabled, setLeftGaddiEnabled] = useState(true);
  const [rightGaddiEnabled, setRightGaddiEnabled] = useState(true);

  // State for linking panels - controls auto-sync behavior (default to UNLINKED for individual panel discussion/modification)
  const [panelsLinked, setPanelsLinked] = useState(false);

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
      try {
        const response = await fetch('/api/master-settings-memory');

        if (!response.ok) {
          console.error('Failed to load Master Settings memory: HTTP', response.status);
          return;
        }

        const data = await response.json();

        if (data) {
          setSheetWidth(parseInt(data.sheetWidth) || 1210);
          setSheetHeight(parseInt(data.sheetHeight) || 2420);
          setKerf(parseInt(data.kerf) || 5);
        }
      } catch (error) {
        console.error('Failed to load Master Settings memory:', error);
      }
    };

    loadMasterSettingsMemory();
  }, []);

  // Auto-save Master Settings when values change (debounced)
  useEffect(() => {
    const saveMasterSettings = async () => {
      try {
        await fetch('/api/master-settings-memory', {
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


  // Normalize strings for grouping (removes whitespace and case inconsistencies)
  // This ensures items with the same text group together despite spacing/case differences
  // Case-insensitive: "Apple Ply" and "apple ply" are treated as the same
  const normalizeForGrouping = (text: string): string => {
    return text
      .trim()                          // Remove leading/trailing spaces
      .toLowerCase()                   // Normalize to lowercase for case-insensitive grouping
      .replace(/\s+/g, ' ');          // Collapse multiple spaces to single space
  };

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
        const { brandResults, error: optimizerError } = await runOptimizerEngine({
          cabinets,
          manualPanels,
          sheetWidth,
          sheetHeight,
          kerf,
          woodGrainsPreferences,
          generatePanels,
        });

        if (optimizerError) {
          console.error('Optimizer failed:', optimizerError);
          toast({
            title: 'Optimizer Error',
            description: optimizerError.message || 'Unknown optimizer error',
            variant: 'destructive',
          });
          return;
        }

        setPreviewBrandResults(brandResults);
      } catch (err: any) {
        console.error('Optimizer engine crashed:', err);
        toast({
          title: 'Optimizer Crash',
          description: err?.message || 'Unknown error occurred',
          variant: 'destructive',
        });
      }
    };

    runOptimization();
  }, [showPreviewDialog, cabinets, woodGrainsPreferences, sheetWidth, sheetHeight, kerf, manualPanels, deletedPreviewSheets]);

  // Calculate cutting list summary with memoization
  const cuttingListSummary = useMemo((): CuttingListSummary => {
    return buildCuttingListSummary(cabinets);
  }, [cabinets]);

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

  // Calculate shutter dimensions
  const calculateShutterDimensions = (cabinet: Cabinet): { width: number; height: number; laminateCode?: string }[] => {
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
  };

  // Update shutters when cabinet dimensions change
  const updateShutters = () => {
    const newShutters = calculateShutterDimensions(watchedValues);
    form.setValue('shutters', newShutters);
  };

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
  useEffect(() => {
    if (watchedValues.shuttersEnabled && watchedValues.shutterCount > 0 && watchedValues.shutters.length === 0) {
      const newShutters = calculateShutterDimensions(watchedValues);
      form.setValue('shutters', newShutters);
    }
  }, [watchedValues.shuttersEnabled, watchedValues.shutterCount, watchedValues.shutters.length, watchedValues, form]);

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
      // Sync display states
      setLaminateSelection(memory.topPanelLaminateCode);
      setBottomLaminateSelection(memory.topPanelLaminateCode);
      setLeftLaminateSelection(memory.topPanelLaminateCode);
      setRightLaminateSelection(memory.topPanelLaminateCode);
    }
    if (memory.backPanelLaminateCode) {
      markLaminateAsUserSelected('backPanelLaminateCode');
      markLaminateAsUserSelected('backPanelInnerLaminateCode');
      setBackLaminateSelection(memory.backPanelLaminateCode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount

  // Internal function to actually add the cabinet (called directly or after confirmation)
  const performAddCabinet = (cabinet: Cabinet) => {

    // Include gaddi toggle states and grain directions in the cabinet
    // ✅ PRESERVE configurationMode from normalized cabinet
    const cabinetWithGaddi = {
      ...cabinet,
      configurationMode: cabinet.configurationMode || 'advanced', // ✅ Preserve mode from normalization
      topPanelGaddi: topGaddiEnabled,
      bottomPanelGaddi: bottomGaddiEnabled,
      leftPanelGaddi: leftGaddiEnabled,
      rightPanelGaddi: rightGaddiEnabled,
      ...computeGrainDirections(cabinet, woodGrainsPreferences) // ✅ DIRECT LINK: Use database preferences only
    };

    updateCabinets((prev: Cabinet[]) => [...prev, cabinetWithGaddi]);

    // Save ALL cabinet values to memory for next time (time-saver feature)
    saveCabinetFormMemory({
      roomName: cabinet.roomName,
      customRoomName: cabinet.roomName === 'Manual Type' ? cabinet.roomName : undefined,
      height: cabinet.height,
      width: cabinet.width,
      depth: cabinet.depth,
      widthReduction: cabinet.widthReduction,

      // Save all plywood brands
      plywoodType: cabinet.plywoodType,
      topPanelPlywoodBrand: (cabinet as any).topPanelPlywoodBrand,
      bottomPanelPlywoodBrand: (cabinet as any).bottomPanelPlywoodBrand,
      leftPanelPlywoodBrand: (cabinet as any).leftPanelPlywoodBrand,
      rightPanelPlywoodBrand: (cabinet as any).rightPanelPlywoodBrand,
      backPanelPlywoodBrand: cabinet.backPanelPlywoodBrand,
      shutterPlywoodBrand: cabinet.shutterPlywoodBrand,

      // Save all front laminate codes
      topPanelLaminateCode: cabinet.topPanelLaminateCode,
      bottomPanelLaminateCode: cabinet.bottomPanelLaminateCode,
      leftPanelLaminateCode: cabinet.leftPanelLaminateCode,
      rightPanelLaminateCode: cabinet.rightPanelLaminateCode,
      backPanelLaminateCode: cabinet.backPanelLaminateCode,
      shutterLaminateCode: cabinet.shutterLaminateCode,

      // Save all inner laminate codes
      topPanelInnerLaminateCode: cabinet.topPanelInnerLaminateCode,
      bottomPanelInnerLaminateCode: cabinet.bottomPanelInnerLaminateCode,
      leftPanelInnerLaminateCode: cabinet.leftPanelInnerLaminateCode,
      rightPanelInnerLaminateCode: cabinet.rightPanelInnerLaminateCode,
      backPanelInnerLaminateCode: cabinet.backPanelInnerLaminateCode,
      shutterInnerLaminateCode: cabinet.shutterInnerLaminateCode,
    });

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

      // Sync local display states
      setLaminateSelection(memory.topPanelLaminateCode);
      setBottomLaminateSelection(memory.topPanelLaminateCode);
      setLeftLaminateSelection(memory.topPanelLaminateCode);
      setRightLaminateSelection(memory.topPanelLaminateCode);
    }
    if (memory.backPanelLaminateCode) {
      updateLaminateWithTracking('backPanelLaminateCode', memory.backPanelLaminateCode, 'user');
      // Only populate back panel inner laminate if it exists in memory
      if (memory.backPanelInnerLaminateCode) {
        updateLaminateWithTracking('backPanelInnerLaminateCode', memory.backPanelInnerLaminateCode, 'user');
      }
      // Sync local display state
      setBackLaminateSelection(memory.backPanelLaminateCode);
    }

    // Reset gaddi toggles - always ON by default
    setTopGaddiEnabled(true);
    setBottomGaddiEnabled(true);
    setLeftGaddiEnabled(true);
    setRightGaddiEnabled(true);

    // ✅ FIX: Close preview dialog after adding cabinet so next preview shows fresh data
    // This prevents old panels from accumulating when preview is reopened
    setShowPreviewDialog(false);

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

  // Normalize cabinet data to handle schema evolution (adds defaults for missing fields)
  const normalizeCabinetData = (cabinet: Cabinet): Cabinet => {
    return {
      ...cabinet,
      // Add defaults for inner laminate codes (empty strings - no hardcoded values)
      topPanelInnerLaminateCode: cabinet.topPanelInnerLaminateCode ?? '',
      bottomPanelInnerLaminateCode: cabinet.bottomPanelInnerLaminateCode ?? '',
      leftPanelInnerLaminateCode: cabinet.leftPanelInnerLaminateCode ?? '',
      rightPanelInnerLaminateCode: cabinet.rightPanelInnerLaminateCode ?? '',
      backPanelInnerLaminateCode: cabinet.backPanelInnerLaminateCode ?? '',
      shutterLaminateCode: cabinet.shutterLaminateCode ?? '',
      shutters: cabinet.shutters ?? [],
      innerLaminateCode: cabinet.innerLaminateCode ?? '',
      configurationMode: cabinet.configurationMode ?? 'advanced',
      // Preserve grain direction values - never overwrite with masterWoodGrains
      topPanelGrainDirection: cabinet.topPanelGrainDirection ?? false,
      bottomPanelGrainDirection: cabinet.bottomPanelGrainDirection ?? false,
      leftPanelGrainDirection: cabinet.leftPanelGrainDirection ?? false,
      rightPanelGrainDirection: cabinet.rightPanelGrainDirection ?? false,
      backPanelGrainDirection: cabinet.backPanelGrainDirection ?? false,
      shutterGrainDirection: cabinet.shutterGrainDirection ?? false,
      shelvesGrainDirection: cabinet.shelvesGrainDirection ?? false,
      centerPostGrainDirection: cabinet.centerPostGrainDirection ?? false
    };
  };

  // Normalize a collection of cabinets
  const normalizeCabinetCollection = (cabinets: Cabinet[]): Cabinet[] => {
    return cabinets.map(normalizeCabinetData);
  };

  // ✅ DIRECT LINK: Compute grain directions using ONLY database preferences
  // No master toggle required - laminate code database setting is the source of truth
  const computeGrainDirections = (
    cabinet: Cabinet,
    preferences: Record<string, boolean>
  ) => {
    // Extract all laminate codes
    const topCode = (cabinet.topPanelLaminateCode || '').split('+')[0].trim();
    const bottomCode = (cabinet.bottomPanelLaminateCode || '').split('+')[0].trim();
    const leftCode = (cabinet.leftPanelLaminateCode || '').split('+')[0].trim();
    const rightCode = (cabinet.rightPanelLaminateCode || '').split('+')[0].trim();
    const backCode = (cabinet.backPanelLaminateCode || '').split('+')[0].trim();
    const shutterCode = (cabinet.shutterLaminateCode || '').split('+')[0].trim();

    // ✅ CRITICAL: Use INNER laminate codes for shelves/center posts (BB materials)
    const shelvesCode = (cabinet.shelvesInnerLaminateCode || cabinet.innerLaminateCode || '').split('+')[0].trim();
    const centerPostCode = (cabinet.centerPostInnerLaminateCode || cabinet.innerLaminateCode || '').split('+')[0].trim();

    // ✅ DIRECT LINK: Use ONLY database preferences - automatic wood grains based on laminate code
    return {
      topPanelGrainDirection: preferences[topCode] === true,
      bottomPanelGrainDirection: preferences[bottomCode] === true,
      leftPanelGrainDirection: preferences[leftCode] === true,
      rightPanelGrainDirection: preferences[rightCode] === true,
      backPanelGrainDirection: preferences[backCode] === true,
      shutterGrainDirection: preferences[shutterCode] === true,
      shelvesGrainDirection: preferences[shelvesCode] === true,
      centerPostGrainDirection: preferences[centerPostCode] === true
    };
  };

  // Utility wrapper that ensures all cabinet updates go through normalization AND grain direction computation
  const updateCabinets = (updater: Cabinet[] | ((prev: Cabinet[]) => Cabinet[])) => {
    if (typeof updater === 'function') {
      // If updater is a function, call it, normalize, and compute grain directions with FRESH values
      setCabinets((prev) => {
        const updated = updater(prev);
        const normalized = normalizeCabinetCollection(updated);
        // ✅ DIRECT LINK: Recompute grain directions using database preferences only
        return normalized.map(cabinet => ({
          ...cabinet,
          ...computeGrainDirections(cabinet, woodGrainsPreferences)
        }));
      });
    } else {
      // If updater is a direct array, normalize and compute grain directions with FRESH values
      const normalized = normalizeCabinetCollection(updater);
      setCabinets(normalized.map(cabinet => ({
        ...cabinet,
        ...computeGrainDirections(cabinet, woodGrainsPreferences)
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
          setShowMaterialConfirmDialog(false);
          setPendingMaterialAction(null);
        }
      });
      setShowMaterialConfirmDialog(true);
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

    // Validation passed - now normalize the cabinet data
    let normalizedCabinet = normalizeCabinetData(cabinet);

    // Handle configuration mode-specific normalization
    if (mode === 'basic') {
      // Basic mode: convert to shutter-only cabinet (like Quick Shutter)
      normalizedCabinet = {
        ...cabinet,
        configurationMode: 'basic',
        depth: 0, // Zero depth signals shutter-only
        shuttersEnabled: true,
        shutterCount: cabinet.shutterCount || 1,
        shutterLaminateCode: cabinet.shutterLaminateCode || '', // ✅ Use shutter laminate code (not top panel)
        shutterInnerLaminateCode: cabinet.shutterInnerLaminateCode || '', // ✅ Preserve inner laminate
        shutters: [{
          width: cabinet.width,
          height: cabinet.height,
          laminateCode: cabinet.shutterLaminateCode || '' // ✅ Use shutter laminate code
        }],
        // Clear carcass-related fields
        centerPostEnabled: false,
        shelvesEnabled: false
      };
    }

    // All validations passed - add the cabinet
    performAddCabinet(normalizedCabinet);

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

      // ✅ DIRECT LINK: Compute grain direction using database preferences only
      const cabinet = {
        ...baseCabinet,
        ...computeGrainDirections(baseCabinet, woodGrainsPreferences)
      };

      updateCabinets((prev: Cabinet[]) => [...prev, cabinet]);
    }

    toast({
      title: "Quick Cabinets Added",
      description: `${config.quantity} ${cabinetTypes.find(t => t.value === type)?.label}(s) added to cutting list.`
    });
  };

  // Remove cabinet
  const removeCabinet = (id: string) => {
    updateCabinets((prev: Cabinet[]) => prev.filter(cabinet => cabinet.id !== id));
    toast({
      title: "Cabinet Removed",
      description: "Cabinet has been removed from the cutting list."
    });
  };

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
      toast({
        title: "Export Failed",
        description: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
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
      toast({
        title: "Export Failed",
        description: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
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

      // Use runOptimizerEngine for consistent optimization
      const { brandResults, error: optimizerError } = await runOptimizerEngine({
        cabinets,
        manualPanels,
        sheetWidth,
        sheetHeight,
        kerf,
        woodGrainsPreferences,
        generatePanels,
      });

      if (optimizerError) {
        throw optimizerError;
      }

      const sheet = { w: sheetWidth, h: sheetHeight, kerf: kerf };

      const pdf = generateCutlistPDF({
        brandResults,
        sheet,
        filename: `${clientName}-cutting-list.pdf`,
        orientationPreference: pdfOrientation,
        cabinets,
        materialSummary: liveMaterialSummary,
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
            filename: `${clientName}-cutting-list.pdf`,
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
      toast({
        title: "Save Failed",
        description: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-200 bg-white shadow-xl">
        <div className="max-w-7xl mx-auto px-4 py-4">
          {/* Title Row */}
          <div className="flex items-center space-x-3 mb-4">
            <i className="fas fa-tools text-2xl text-blue-400"></i>
            <h1 className="text-xl font-semibold text-gray-900 leading-none">Cutting List Generator</h1>
          </div>

          {/* Buttons Row */}
          <div className="flex items-center gap-3 justify-end overflow-x-auto">
            {/* Calculation Logic Lock */}
            <div className="flex items-center space-x-2 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg">
              <Label htmlFor="calc-lock" className="text-xs text-gray-700">
                Logic
              </Label>
              <Switch
                id="calc-lock"
                checked={calculationLogicLocked}
                onCheckedChange={setCalculationLogicLocked}
                className="scale-75"
              />
              <i className={`fas ${calculationLogicLocked ? 'fa-lock text-blue-400' : 'fa-unlock text-blue-400'} text-sm`}></i>
            </div>
            <Button
              size="sm"
              className="inline-flex items-center bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-medium shadow-lg"
              onClick={() => navigate("/visual-quotation")}
            >
              <i className="fas fa-drafting-compass mr-2"></i>
              Advanced Quotation
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="inline-flex items-center"
              onClick={() => navigate("/crm")}
            >
              <i className="fas fa-database mr-2"></i>
              CRM
            </Button>

            <Button
              onClick={exportToExcel}
              size="sm"
              className="inline-flex items-center bg-gradient-to-r from-blue-400 to-blue-500 hover:from-blue-500 hover:to-blue-600 text-white font-medium shadow-lg"
            >
              <i className="fas fa-file-excel mr-2"></i>
              Export Excel
            </Button>
            <Button
              onClick={exportToGoogleSheets}
              size="sm"
              className="inline-flex items-center bg-gradient-to-r from-blue-400 to-blue-500 hover:from-blue-500 hover:to-blue-600 text-white font-medium shadow-lg"
            >
              <i className="fab fa-google mr-2"></i>
              Google Sheets
            </Button>
            <Button
              onClick={printList}
              size="sm"
              variant="outline"
              className="inline-flex items-center"
            >
              <i className="fas fa-print mr-2"></i>
              Print List
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Controls */}
          <div className="lg:col-span-2 space-y-6">

            {/* Quotation Card */}
            <Card className="bg-white border-gray-200 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-gray-900">
                  <div className="flex items-center">
                    <i className="fas fa-file-invoice mr-2 text-blue-500"></i>
                    Quotation Details
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setQuotationDetailsVisible(!quotationDetailsVisible)}
                    className="h-8 w-8 p-0"
                  >
                    {quotationDetailsVisible ? <EyeOff className="w-4 h-4 text-gray-600" /> : <Eye className="w-4 h-4 text-gray-600" />}
                  </Button>
                </CardTitle>
              </CardHeader>
              {quotationDetailsVisible && (
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="quotation-number" className="text-sm font-medium">Quotation Number</Label>
                        <Input
                          id="quotation-number"
                          type="text"
                          value={quotationNumber}
                          onChange={(e) => setQuotationNumber(e.target.value)}
                          placeholder="e.g., Q-2025-001"
                          className="text-sm"
                          data-testid="input-quotation-number"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="quotation-date" className="text-sm font-medium">Date</Label>
                        <Input
                          id="quotation-date"
                          type="date"
                          value={quotationDate}
                          onChange={(e) => setQuotationDate(e.target.value)}
                          className="text-sm"
                          data-testid="input-quotation-date"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="quotation-notes" className="text-sm font-medium">Notes</Label>
                      <Input
                        id="quotation-notes"
                        type="text"
                        value={quotationNotes}
                        onChange={(e) => setQuotationNotes(e.target.value)}
                        placeholder="Add any additional notes for the quotation"
                        className="text-sm"
                        data-testid="input-quotation-notes"
                      />
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>

            {/* Master Settings Card */}
            <Card className="bg-white border-gray-200 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-gray-900">
                  <div className="flex items-center">
                    <i className="fas fa-sliders-h mr-2 text-slate-600"></i>
                    Master Setting
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setMasterSettingsVisible(!masterSettingsVisible)}
                    className="h-8 w-8 p-0"
                    data-testid="button-toggle-master-settings"
                  >
                    <i className={`fas ${masterSettingsVisible ? 'fa-chevron-up' : 'fa-chevron-down'} text-gray-600`}></i>
                  </Button>
                </CardTitle>
              </CardHeader>
              {masterSettingsVisible && (
                <CardContent>
                  <div className="space-y-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="text-xs text-blue-800">
                        <i className="fas fa-info-circle mr-1"></i>
                        Set default materials for <strong>new</strong> cabinets. <span className="opacity-75">Existing items won't change.</span>
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
                            Array.from(new Set(globalLaminateMemory.map(s => s.trim()).filter(Boolean))).filter((code, index, self) =>
                              index === self.findIndex(t => t.toLowerCase() === code.toLowerCase())
                            ).map((code) => {
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
                                        toast({
                                          title: "Error",
                                          description: "Failed to update wood grain preference",
                                          variant: "destructive"
                                        });
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
            <Card ref={projectDetailsSectionRef} className="bg-white border-gray-200 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-gray-900">
                  <div className="flex items-center">
                    <i className="fas fa-info-circle mr-2 text-blue-400"></i>
                    Project Details
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setProjectDetailsVisible(!projectDetailsVisible)}
                    className="h-8 w-8 p-0"
                  >
                    {projectDetailsVisible ? <EyeOff className="w-4 h-4 text-gray-600" /> : <Eye className="w-4 h-4 text-gray-600" />}
                  </Button>
                </CardTitle>
              </CardHeader>
              {projectDetailsVisible && (
                <CardContent>
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
            <CabinetForm
              form={form}
              watchedValues={watchedValues}
              cabinetConfigMode={cabinetConfigMode}
              setCabinetConfigMode={setCabinetConfigMode}
              updateShutters={updateShutters}
              topGaddiEnabled={topGaddiEnabled}
              setTopGaddiEnabled={setTopGaddiEnabled}
              bottomGaddiEnabled={bottomGaddiEnabled}
              setBottomGaddiEnabled={setBottomGaddiEnabled}
              leftGaddiEnabled={leftGaddiEnabled}
              setLeftGaddiEnabled={setLeftGaddiEnabled}
              rightGaddiEnabled={rightGaddiEnabled}
              setRightGaddiEnabled={setRightGaddiEnabled}
              panelsLinked={panelsLinked}
              setPanelsLinked={setPanelsLinked}
              laminateCodes={laminateCodes}
              plywoodTypes={validPlywood}
              handleAddCabinet={() => addCabinet(form.getValues())}
              cabinetHeightInputRef={cabinetHeightInputRef}
              shutterHeightInputRef={shutterHeightInputRef}
              cabinetSectionRef={cabinetSectionRef}
            />

            {/* Preview & Clear Preview Buttons - Outside Cabinet Card */}
            <div className="flex justify-center gap-4 my-6">
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
                    toast({
                      title: "Error Loading Data",
                      description: "Could not load spreadsheet data.",
                      variant: "destructive"
                    });
                  }
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-8 py-2 rounded-full text-base"
                data-testid="button-spreadsheet"
              >
                <i className="fas fa-cog mr-2"></i>
                Spreadsheet
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
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
                    setShowPreviewDialog(true);
                    setIsPreviewActive(true);
                    setDeletedPreviewSheets(new Set()); // Reset deleted sheets on new preview

                    // Hide optimization indicator after optimization completes (500ms + 200ms buffer)
                    setTimeout(() => {
                      setIsOptimizing(false);
                    }, 700);
                  }, 100);
                }}
                className="font-semibold px-8 py-2 rounded-full text-base"
                data-testid="button-preview-cabinet"
                disabled={isOptimizing}
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
                onClick={() => {
                  setShowClearConfirmDialog(true);
                }}
                className="font-semibold px-8 py-2 rounded-full text-base"
                data-testid="button-clear-preview"
              >
                <i className="fas fa-eraser mr-2"></i>
                Clear Preview
              </Button>
            </div>

            {/* Design Center */}
            <Card ref={designCenterSectionRef} className="bg-white border-gray-200 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-gray-900">
                  <div className="flex items-center">
                    <i className="fas fa-palette mr-2 text-purple-400"></i>
                    Design Center
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setDesignCenterVisible(!designCenterVisible)}
                    className="h-8 w-8 p-0"
                  >
                    {designCenterVisible ? <EyeOff className="w-4 h-4 text-slate-600" /> : <Eye className="w-4 h-4 text-slate-600" />}
                  </Button>
                </CardTitle>
              </CardHeader>
              {designCenterVisible && (
                <CardContent>
                  <div className="space-y-4">
                    <DesignCenter />
                  </div>
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

{/* Cabinet List */}
            <CabinetSummaryPanel
              cabinets={cabinets}
              removeCabinet={removeCabinet}
              form={form}
            />

          </div>
        </div>
      </main >

      {/* Preview Dialog */}
      <PreviewDialog
        open={showPreviewDialog}
        onOpenChange={setShowPreviewDialog}
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
        onOpenChange={setShowManualPanelDialog}
        manualPanelForm={manualPanelForm}
        setManualPanelForm={setManualPanelForm}
        globalPlywoodBrandMemory={globalPlywoodBrandMemory}
        laminateCodes={laminateCodes}
        woodGrainsPreferences={woodGrainsPreferences}
        selectedSheetContext={selectedSheetContext}
        setSelectedSheetContext={setSelectedSheetContext}
        setManualPanels={setManualPanels}
      />

      {/* Clear Preview Confirmation Dialog */}
      <ClearConfirmDialog
        open={showClearConfirmDialog}
        onOpenChange={setShowClearConfirmDialog}
        form={form}
        updateCabinets={updateCabinets}
        setManualPanels={setManualPanels}
        setDeletedPreviewSheets={setDeletedPreviewSheets}
        setDeletedPreviewPanels={setDeletedPreviewPanels}
        setShowPreviewDialog={setShowPreviewDialog}
        setIsPreviewActive={setIsPreviewActive}
        masterPlywoodBrand={masterPlywoodBrand}
        masterLaminateCode={masterLaminateCode}
      />

      {/* Material Validation Error Dialog */}
      <MaterialValidationDialog
        open={showMaterialConfirmDialog}
        onOpenChange={setShowMaterialConfirmDialog}
        pendingMaterialAction={pendingMaterialAction}
        setPendingMaterialAction={setPendingMaterialAction}
      />

      {/* Panel Delete Confirmation Dialog */}
      <PanelDeleteDialog
        panelToDelete={panelToDelete}
        setPanelToDelete={setPanelToDelete}
        setDeletedPreviewPanels={setDeletedPreviewPanels}
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
