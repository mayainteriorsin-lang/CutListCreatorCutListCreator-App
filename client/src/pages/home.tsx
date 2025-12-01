import { useState, useEffect, useMemo, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { useToast } from '@/hooks/use-toast';
import DesignCenter from "../components/ui/DesignCenter";
import Spreadsheet from '@/components/Spreadsheet';
import { Cabinet, cabinetSchema, ShutterType, Panel, PanelGroup, CuttingListSummary, LaminateCode, cabinetTypes, CabinetType, LaminateMemory, PlywoodBrandMemory } from '@shared/schema';
import * as XLSX from 'xlsx';
import { generateCutlistPDF } from '@/lib/pdf-export';
import { generateMaterialListCSV } from '@/lib/material-list-export';
import { Eye, ChevronsUpDown, Check, Loader2, Save } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

// ✅ MODULES: Simple panel optimization
import { prepareStandardParts } from '@/features/standard/dimensional-mapping';
import { optimizeStandardCutlist } from '@/features/standard/optimizer';
import { getDisplayDimensions } from '@/features/cutlist/core/efficiency';
import { optimizeCutlist } from '@/lib/cutlist-optimizer';
import { drawGaddiMark } from '@/features/gaddi';

// Cabinet form memory helpers
const CABINET_FORM_MEMORY_KEY = 'cabinetFormMemory_v1';

interface CabinetFormMemory {
  roomName?: string;
  customRoomName?: string;
  height?: number;
  width?: number;
  depth?: number;
  A?: string;
  widthReduction?: number;
  // ✅ IMPROVED: Store ALL front laminate codes from all panel types
  topPanelLaminateCode?: string;
  bottomPanelLaminateCode?: string;
  leftPanelLaminateCode?: string;
  rightPanelLaminateCode?: string;
  backPanelLaminateCode?: string;
  shutterLaminateCode?: string;
  centerPostLaminateCode?: string;
  shelvesLaminateCode?: string;
  // ✅ IMPROVED: Store ALL inner laminate codes from all panel types
  topPanelInnerLaminateCode?: string;
  bottomPanelInnerLaminateCode?: string;
  leftPanelInnerLaminateCode?: string;
  rightPanelInnerLaminateCode?: string;
  backPanelInnerLaminateCode?: string;
  shutterInnerLaminateCode?: string;
  centerPostInnerLaminateCode?: string;
  shelvesInnerLaminateCode?: string;
}

// Load last cabinet form values from localStorage (with SSR safety)
const loadCabinetFormMemory = (): Partial<CabinetFormMemory> => {
  if (typeof window === 'undefined') return {};
  
  try {
    const stored = localStorage.getItem(CABINET_FORM_MEMORY_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Failed to load cabinet form memory:', error);
  }
  return {};
};

// --- HELPER: Compute correct X/Y display dimensions based on panel TYPE ---
function computeDisplayDims(panel: any) {
  const type = (panel?.type || panel?.name || '').toString().toUpperCase();

  // X = horizontal (sheet width 1210)
  // Y = vertical   (sheet height 2420)
  let displayWidth = 0;   // X
  let displayHeight = 0;  // Y

  if (type.includes('TOP') || type.includes('BOTTOM')) {
    // TOP/BOTTOM: nomW=depth(X), nomH=width(Y) → depth×width display
    displayWidth  = Number(panel.nomW ?? panel.w ?? panel.width ?? 0);    // X-axis (depth)
    displayHeight = Number(panel.nomH ?? panel.h ?? panel.height ?? 0);   // Y-axis (width)
  } else if (type.includes('LEFT') || type.includes('RIGHT')) {
    // LEFT/RIGHT: nomW=depth(X), nomH=height(Y) → depth×height display
    displayWidth  = Number(panel.nomW ?? panel.w ?? panel.width ?? 0);    // X-axis (depth)
    displayHeight = Number(panel.nomH ?? panel.h ?? panel.height ?? 0);   // Y-axis (height)
  } else {
    // BACK: nomW=width(X), nomH=height(Y) → width×height display
    displayWidth  = Number(panel.nomW ?? panel.w ?? panel.width ?? 0);    // X-axis (width)
    displayHeight = Number(panel.nomH ?? panel.h ?? panel.height ?? 0);   // Y-axis (height)
  }

  // Store computed dims back on panel so renderer & PDF can use them directly
  panel.displayWidth  = displayWidth;
  panel.displayHeight = displayHeight;
  panel.displayLabel  = `${displayWidth}×${displayHeight}`;
  return panel;
}

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
  A?: string;
  shutterLaminateCode?: string;
  shutterInnerLaminateCode?: string;
}

// Load last shutter form values from localStorage (with SSR safety)
const loadShutterFormMemory = (): Partial<ShutterFormMemory> => {
  if (typeof window === 'undefined') return {};
  
  try {
    const stored = localStorage.getItem(SHUTTER_FORM_MEMORY_KEY);
    if (stored) {
      return JSON.parse(stored);
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

/**
 * SIMPLE: Prepare panels for optimizer with wood grain constraint
 * @param panels - Array of panels with name, width, height, laminateCode
 * @param preferences - Wood grain preferences map
 * @returns Array of parts ready for optimizer
 */
function preparePartsForOptimizer(panels: Array<any>, preferences: Record<string, boolean> = {}) {
  return prepareStandardParts(panels, preferences);
}

/**
 * Get display dimensions for preview rendering
 * Uses the prepared optimizer-friendly w/h if present (swapped for wood grains)
 * @param panel - Panel object from optimizer (has w, h, nomW, nomH)
 * @returns Display dimensions { displayW, displayH }
 */
function getDisplayDims(panel: any) {
  if (!panel || typeof panel !== 'object') return { displayW: 0, displayH: 0 };

  // If preparePartsForOptimizer created w/h fields, prefer them.
  const preparedW = Number(panel.w ?? panel.displayW ?? panel.nomW ?? panel.width ?? 0);
  const preparedH = Number(panel.h ?? panel.displayH ?? panel.nomH ?? panel.height ?? 0);

  // In some call-sites you may only have nomW/nomH; fallback to those.
  let displayW = preparedW;
  let displayH = preparedH;

  // If caller provided an explicit swap flag, obey it. (Some code paths set panel._swapped)
  if (panel._swapped === true) {
    [displayW, displayH] = [displayH, displayW];
  }

  // final numeric fallback
  displayW = Number(displayW || 0);
  displayH = Number(displayH || 0);

  return { displayW, displayH };
}

/**
 * SIMPLE: Optimize parts using standard optimizer
 * @param parts - Array of parts to optimize
 * @param sheetWidth - Sheet width (default 1210mm)
 * @param sheetHeight - Sheet height (default 2420mm)
 * @returns Best optimization result
 */
function multiPassOptimize(
  parts: Array<any>,
  sheetWidth: number = 1210,
  sheetHeight: number = 2420
) {
  console.log('📦 Using standard optimizer');
  return optimizeStandardCutlist(parts, sheetWidth, sheetHeight);
}

/**
 * Calculate efficiency of optimization result
 * @param sheets - Array of optimized sheets
 * @param parts - Original parts array
 * @returns Efficiency percentage (0-100)
 */
function calculateEfficiency(sheets: Array<any>, parts: Array<any>): number {
  if (!sheets || sheets.length === 0) return 0;
  
  const sheetArea = 1210 * 2420; // Standard sheet area
  const totalSheetArea = sheets.length * sheetArea;
  
  // Calculate total parts area
  const totalPartsArea = parts.reduce((sum, part) => {
    const w = Number(part.w || part.nomW || 0);
    const h = Number(part.h || part.nomH || 0);
    const qty = Number(part.qty || 1);
    return sum + (w * h * qty);
  }, 0);
  
  return totalSheetArea > 0 ? (totalPartsArea / totalSheetArea) * 100 : 0;
}

/**
 * Calculate dynamic optimization time based on panel count
 * Fewer panels = faster optimization, more panels = more thorough optimization
 * @param panelCount - Number of panels to optimize
 * @returns Optimization time in milliseconds
 */
function getOptimizationTimeMs(panelCount: number): number {
  if (panelCount <= 5) return 200;      // 1-5 panels: very fast
  if (panelCount <= 15) return 400;     // 6-15 panels: fast
  if (panelCount <= 30) return 600;     // 16-30 panels: medium
  if (panelCount <= 50) return 1000;    // 31-50 panels: thorough
  return 1500;                           // 50+ panels: very thorough
}

// Pixel-perfect PDF export - one sheet per PDF page (no slicing needed)
// Captures summary page first, then each cutting sheet individually using html2canvas + jsPDF
async function exportPreviewToPdf(options: {
  sheetSelector?: string;
  filename?: string;
  pdfOrientation?: "portrait" | "landscape";
} = {}) {
  const sheetSelector = options.sheetSelector ?? ".cutting-sheet";
  const filename = options.filename ?? `cutting-list-${new Date().toISOString().slice(0, 10)}.pdf`;
  
  // ✅ VERIFY AXIS MAPPING BEFORE PDF EXPORT
  console.group('📄 PDF EXPORT - AXIS MAPPING VERIFICATION');
  const allSheetElements = Array.from(document.querySelectorAll(sheetSelector)) as HTMLElement[];
  let totalPanelsVerified = 0;
  let correctAxisCount = 0;
  allSheetElements.forEach((sheetEl, sheetIdx) => {
    const panelDivs = sheetEl.querySelectorAll('[style*="border-2 border-black"]');
    panelDivs.forEach((panelDiv: any) => {
      const dimensionText = panelDiv.querySelector('p:first-child')?.textContent || '';
      const panelNameText = panelDiv.textContent || '';
      const isPanelTOP = panelNameText.toUpperCase().includes('TOP');
      const isPanelBOTTOM = panelNameText.toUpperCase().includes('BOTTOM');
      const isPanelLEFT = panelNameText.toUpperCase().includes('LEFT');
      const isPanelRIGHT = panelNameText.toUpperCase().includes('RIGHT');
      
      if (isPanelTOP || isPanelBOTTOM || isPanelLEFT || isPanelRIGHT) {
        totalPanelsVerified++;
        const hasCorrectAxis = (isPanelTOP || isPanelBOTTOM) ? 
          dimensionText.includes('564') || dimensionText.includes('450') :
          dimensionText.includes('450') || dimensionText.includes('800');
        if (hasCorrectAxis) correctAxisCount++;
        console.log(`  Sheet[${sheetIdx}] ${panelNameText.slice(0, 30)}... → Dims: ${dimensionText} ${hasCorrectAxis ? '✅' : '❌'}`);
      }
    });
  });
  console.log(`✅ PDF VERIFICATION: ${correctAxisCount}/${totalPanelsVerified} panels have correct axis mapping`);
  console.groupEnd();
  
  // Wait for fonts to load (ensure crisp text rendering)
  if (document.fonts && document.fonts.ready) {
    await document.fonts.ready;
  }

  // Find summary page and cutting sheet elements
  const summaryPage = document.querySelector(".summary-page") as HTMLElement | null;
  const sheetElements = Array.from(document.querySelectorAll(sheetSelector)) as HTMLElement[];
  
  // Combine summary page + cutting sheets
  const allElements: HTMLElement[] = [];
  if (summaryPage) {
    allElements.push(summaryPage);
  }
  allElements.push(...sheetElements);
  
  if (!allElements.length) {
    throw new Error(`No elements found to export`);
  }

  // Hide UI controls before capture
  const overlays = document.querySelectorAll(".hide-for-export");
  overlays.forEach((el: Element) => (el as HTMLElement).style.visibility = "hidden");

  // Create PDF
  const orientation = options.pdfOrientation ?? "portrait";
  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation });
  const pageWmm = orientation === "portrait" ? 210 : 297;
  const pageHmm = orientation === "portrait" ? 297 : 210;
  const marginMm = 8;
  const printableWmm = pageWmm - marginMm * 2;
  const printableHmm = pageHmm - marginMm * 2;

  // Capture and add each element as a separate PDF page
  for (let i = 0; i < allElements.length; ++i) {
    const el = allElements[i];

    // Use html2canvas to render the element
    const canvas = await html2canvas(el, {
      backgroundColor: "#ffffff",
      scale: 2, // 2x for better resolution
      useCORS: true,
      allowTaint: false,
      logging: false
    });

    // Convert to image data
    const imgData = canvas.toDataURL("image/png");

    // Image size in pixels
    const imgPw = canvas.width;
    const imgPh = canvas.height;

    // Compute mm size for image to fit inside printable area preserving aspect ratio
    let imgWidthMm = printableWmm;
    let imgHeightMm = (imgPh / imgPw) * imgWidthMm;

    // If image is taller than printable height, scale down uniformly
    if (imgHeightMm > printableHmm) {
      const scale = printableHmm / imgHeightMm;
      imgWidthMm = imgWidthMm * scale;
      imgHeightMm = imgHeightMm * scale;
    }

    // Center horizontally and vertically within printable area
    const x = (pageWmm - imgWidthMm) / 2;
    const y = marginMm + (printableHmm - imgHeightMm) / 2;

    // Add new page for subsequent elements
    if (i > 0) pdf.addPage();
    
    // Add image to PDF page
    pdf.addImage(imgData, "PNG", x, y, imgWidthMm, imgHeightMm);
  }

  // Restore UI controls visibility
  overlays.forEach((el: Element) => (el as HTMLElement).style.visibility = "");

  // Save PDF
  pdf.save(filename);
}

export default function Home() {
  const { toast } = useToast();
  const previewRef = useRef<HTMLDivElement>(null);
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
  const [units, setUnits] = useState<'mm' | 'inches'>('mm');
  const [laminateCodes, setLaminateCodes] = useState<LaminateCode[]>([]);
  const [calculationLogicLocked, setCalculationLogicLocked] = useState<boolean>(true);
  const [selectedLaminateCode, setSelectedLaminateCode] = useState('');
  const [selectedRoom, setSelectedRoom] = useState('Kitchen');
  const [customRoomName, setCustomRoomName] = useState('');
  const [clientName, setClientName] = useState('');
  const [cabinetConfigVisible, setCabinetConfigVisible] = useState(false);
  const [cabinetConfigMode, setCabinetConfigMode] = useState<'basic' | 'advanced'>('advanced');
  const [plywoodLaminatesOpen, setPlywoodLaminatesOpen] = useState(false); // Collapsible section for plywood and laminates - defaults to collapsed
  const [individualPanelsOpen, setIndividualPanelsOpen] = useState(false); // Collapsible section for individual panel laminate selection - defaults to collapsed
  const [quickShutterVisible, setQuickShutterVisible] = useState(false);
  const [projectDetailsVisible, setProjectDetailsVisible] = useState(false);
  const [designCenterVisible, setDesignCenterVisible] = useState(false);
  const [selectedCabinetId, setSelectedCabinetId] = useState<string | null>(null);
  const [woodGrainSettingsVisible, setWoodGrainSettingsVisible] = useState(false);
  const [quickTypesHidden, setQuickTypesHidden] = useState(true);
  const [pdfOrientation, setPdfOrientation] = useState<'landscape' | 'portrait'>('portrait');
  const [lastAddedCabinet, setLastAddedCabinet] = useState<Cabinet | null>(null);
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
  const [showSaveConfirmDialog, setShowSaveConfirmDialog] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deletedPreviewPanels, setDeletedPreviewPanels] = useState<Set<string>>(new Set());
  const savedClientsRef = useRef<Set<string>>(new Set());
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
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
    A: string;
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
    A: string;
    quantity: number;
    grainDirection: boolean;
    gaddi: boolean;
  }>({
    name: 'Manual Panel',
    height: '',
    width: '',
    laminateCode: '',
    A: 'Apple Ply 16mm BWP',
    quantity: 1,
    grainDirection: false,
    gaddi: true
  });
  const shutterLaminateInputRef = useRef<HTMLInputElement>(null);
  const [colourFrameForm, setColourFrameForm] = useState({ height: 2400, width: 80, laminateCode: '', quantity: 1, note: '', customLaminateCode: '', A: 'Apple Ply 16mm BWP', grainDirection: false });
  const [colourFrameEnabled, setColourFrameEnabled] = useState(false);
  const [gaddiForm, setGaddiForm] = useState({ height: 2400, width: 80, laminateCode: 'Manual Type', quantity: 0, note: '', customLaminateCode: '', thickness: '' });
  const [gaddiEnabled, setGaddiEnabled] = useState(false);
  const [visualPreviewVisible, setVisualPreviewVisible] = useState(false);
  
  // Quotation state
  const [quotationNumber, setQuotationNumber] = useState('');
  const [quotationDate, setQuotationDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [quotationNotes, setQuotationNotes] = useState('');
  const [quotationDetailsVisible, setQuotationDetailsVisible] = useState(false);
  
  // Master Settings state
  const [masterSettingsVisible, setMasterSettingsVisible] = useState(false);
  const [masterPlywoodBrand, setMasterPlywoodBrand] = useState('Apple Ply 16mm BWP');
  const [masterLaminateCode, setMasterLaminateCode] = useState('');
  const [masterInnerLaminateCode, setMasterInnerLaminateCode] = useState('off white');
  const [masterWoodGrainsToggle, setMasterWoodGrainsToggle] = useState(false); // ✅ Master toggle for wood grains
  const [woodGrainsPreferences, setWoodGrainsPreferences] = useState<Record<string, boolean>>({});
  const [woodGrainsPreferencesLoading, setWoodGrainsPreferencesLoading] = useState(true); // ✅ FIX: Track loading state
  const [woodGrainsPreferencesLoaded, setWoodGrainsPreferencesLoaded] = useState(false); // ✅ FIX #1: Track successful load
  const [grainMap, setGrainMap] = useState<Record<string, boolean>>({});
  const [optimizePlywoodUsage, setOptimizePlywoodUsage] = useState(true);
  const [masterCustomLaminateInput, setMasterCustomLaminateInput] = useState('');
  const [masterCustomInnerLaminateInput, setMasterCustomInnerLaminateInput] = useState('');
  const [masterCustomPlywoodInput, setMasterCustomPlywoodInput] = useState('');
  const masterLaminateInputRef = useRef<HTMLInputElement>(null);
  const masterInnerLaminateInputRef = useRef<HTMLInputElement>(null);
  const masterLaminateDropdownRef = useRef<HTMLDetailsElement>(null); // ✅ Ref to control dropdown
  
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
    console.log(`📝 Updating ${field} = "${value}" (source: ${source})`);
    form.setValue(field as any, value);
    if (source === 'user') {
      setUserSelectedLaminates(prev => {
        const updated = new Set(prev).add(field);
        console.log(`✅ Added to tracking:`, field, '| Total tracked:', Array.from(updated));
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
  const [cabinetConfigs, setCabinetConfigs] = useState<Record<CabinetType, {height: number, width: number, quantity: number, shutterQuantity: number}>>({
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

  const [currentDate] = useState(() => new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  }));

  // Load stored form memory
  const storedMemory = loadCabinetFormMemory();

  const form = useForm<Cabinet>({
    resolver: zodResolver(cabinetSchema),
    defaultValues: {
      id: crypto.randomUUID(),
      name: `Shutter #${cabinets.length + 1}`,
      type: 'single',
      configurationMode: 'advanced', // ✅ FIX: Initialize form with configurationMode
      height: storedMemory.height ?? 800,
      width: storedMemory.width ?? 600,
      depth: storedMemory.depth ?? 450,
      centerPostEnabled: false,
      centerPostQuantity: 1,
      centerPostHeight: 764,
      centerPostDepth: 430,
      centerPostLaminateCode: '',
      shelvesQuantity: 1,
      shelvesEnabled: false,
      shelvesLaminateCode: '',
      widthReduction: storedMemory.widthReduction ?? 36,

      shuttersEnabled: false,
      shutterCount: 1,
      shutterType: 'Standard',
      shutterHeightReduction: 0,
      shutterWidthReduction: 0,
      shutters: [],
      shutterLaminateCode: storedMemory.shutterLaminateCode ?? '',
      shutterInnerLaminateCode: storedMemory.shutterInnerLaminateCode ?? '',
      topPanelLaminateCode: storedMemory.topPanelLaminateCode ?? '',
      bottomPanelLaminateCode: storedMemory.bottomPanelLaminateCode ?? storedMemory.topPanelLaminateCode ?? '',
      leftPanelLaminateCode: storedMemory.leftPanelLaminateCode ?? storedMemory.topPanelLaminateCode ?? '',
      rightPanelLaminateCode: storedMemory.rightPanelLaminateCode ?? storedMemory.topPanelLaminateCode ?? '',
      backPanelLaminateCode: storedMemory.backPanelLaminateCode ?? '',
      topPanelInnerLaminateCode: 'off white',
      bottomPanelInnerLaminateCode: 'off white',
      leftPanelInnerLaminateCode: 'off white',
      rightPanelInnerLaminateCode: 'off white',
      backPanelInnerLaminateCode: 'off white',
      A: storedMemory.A ?? 'Apple Ply 16mm BWP',
      innerLaminateCode: 'off white',
      // Grain direction fields - default to false for new forms
      topPanelGrainDirection: false,
      bottomPanelGrainDirection: false,
      leftPanelGrainDirection: false,
      rightPanelGrainDirection: false,
      backPanelGrainDirection: false,
      shutterGrainDirection: false,
      shutterGaddi: false
    }
  });

  const watchedValues = form.watch();
  const queryClient = useQueryClient();

  // ✅ FIX: Fetch all wood grains preferences on component mount with loading state
  useEffect(() => {
    const fetchWoodGrainsPreferences = async () => {
      try {
        setWoodGrainsPreferencesLoading(true); // Start loading
        const response = await fetch('/api/wood-grains-preferences');
        const data = await response.json();
        // ✅ FIX: Convert array to map using camelCase format: { "456SF Terra Wood": true, ... }
        const prefsMap: Record<string, boolean> = {};
        data.forEach((item: { laminateCode: string; woodGrainsEnabled: boolean }) => {
          prefsMap[item.laminateCode] = item.woodGrainsEnabled;
        });
        setWoodGrainsPreferences(prefsMap);
        setWoodGrainsPreferencesLoaded(true); // ✅ FIX #1: Mark as successfully loaded
        console.log('🌾 Loaded wood grains preferences:', prefsMap);
      } catch (error) {
        console.error('Error fetching wood grains preferences:', error);
        setWoodGrainsPreferencesLoaded(false); // ✅ FIX #1: Mark as failed to load
      } finally {
        setWoodGrainsPreferencesLoading(false); // End loading
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
  const prevShutterValuesRef = useRef<{front?: string; inner?: string}>({});
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
  const topPanelInnerLaminateCode = form.watch('topPanelInnerLaminateCode');
  const bottomPanelLaminateCode = form.watch('bottomPanelLaminateCode');
  const bottomPanelInnerLaminateCode = form.watch('bottomPanelInnerLaminateCode');
  const leftPanelLaminateCode = form.watch('leftPanelLaminateCode');
  const leftPanelInnerLaminateCode = form.watch('leftPanelInnerLaminateCode');
  const rightPanelLaminateCode = form.watch('rightPanelLaminateCode');
  const rightPanelInnerLaminateCode = form.watch('rightPanelInnerLaminateCode');
  const backPanelLaminateCode = form.watch('backPanelLaminateCode');
  const shutterLaminateCode = form.watch('shutterLaminateCode');
  const A = form.watch('A');
  const shutterInnerLaminateCode = form.watch('shutterInnerLaminateCode');
  
  // ✅ AUTO-SYNC: Shutter laminate inherits main/master laminate codes (time-saver)
  useEffect(() => {
    if (masterLaminateCode && !shutterLaminateCode) {
      form.setValue('shutterLaminateCode', masterLaminateCode);
    }
    if (masterInnerLaminateCode && !shutterInnerLaminateCode) {
      form.setValue('shutterInnerLaminateCode', masterInnerLaminateCode);
    }
  }, [masterLaminateCode, masterInnerLaminateCode, shutterLaminateCode, shutterInnerLaminateCode, form]);

  // ✅ AUTO-SYNC: Shutter laminates sync from TOP panel's front and inner laminates
  useEffect(() => {
    if (topPanelLaminateCode && topPanelLaminateCode !== shutterLaminateCode) {
      form.setValue('shutterLaminateCode', topPanelLaminateCode);
    }
    if (topPanelInnerLaminateCode && topPanelInnerLaminateCode !== shutterInnerLaminateCode) {
      form.setValue('shutterInnerLaminateCode', topPanelInnerLaminateCode);
    }
  }, [topPanelLaminateCode, topPanelInnerLaminateCode, shutterLaminateCode, shutterInnerLaminateCode, form]);

  // ✅ AUTO-SYNC: Center Post and Shelves inherit cabinet Inner Laminate code for both sides (time-saver)
  // Logic: Use cabinet Inner Laminate for front and inner sides
  useEffect(() => {
    if (masterInnerLaminateCode) {
      // Sync Center Post - both front and inner sides
      if (!form.getValues('centerPostLaminateCode')) {
        form.setValue('centerPostLaminateCode', masterInnerLaminateCode);
      }
      if (!form.getValues('centerPostInnerLaminateCode')) {
        form.setValue('centerPostInnerLaminateCode', masterInnerLaminateCode);
      }
      
      // Sync Shelves - both front and inner sides
      if (!form.getValues('shelvesLaminateCode')) {
        form.setValue('shelvesLaminateCode', masterInnerLaminateCode);
      }
      if (!form.getValues('shelvesInnerLaminateCode')) {
        form.setValue('shelvesInnerLaminateCode', masterInnerLaminateCode);
      }
    }
  }, [masterInnerLaminateCode, form]);
  
  // ✅ AUTO-SYNC: Colour Frame inherits Quick Shutter materials for consolidation
  useEffect(() => {
    if (colourFrameEnabled && shutterLaminateCode && shutterInnerLaminateCode) {
      const composedCode = composeLaminateCode(shutterLaminateCode, shutterInnerLaminateCode);
      setColourFrameForm(prev => ({
        ...prev,
        A: A || 'Apple Ply 16mm BWP',
        laminateCode: composedCode
      }));
    }
  }, [colourFrameEnabled, shutterLaminateCode, shutterInnerLaminateCode, A]);
  
  useEffect(() => {
    // Only save if values actually changed (not just form re-renders)
    const frontChanged = prevShutterValuesRef.current.front !== shutterLaminateCode;
    const innerChanged = prevShutterValuesRef.current.inner !== shutterInnerLaminateCode;
    
    if (frontChanged || innerChanged) {
      if (shutterLaminateCode || shutterInnerLaminateCode) {
        saveCabinetFormMemory({
          A,
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
  }, [shutterLaminateCode, shutterInnerLaminateCode, A]);
  
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
  const { data: laminateCodeGodownData = [], isLoading: isLaminateMemoryLoading } = useQuery<LaminateCode[]>({
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
      if (isRedColor && woodGrainsEnabled) {
        console.log(`🔴 Red Wood Grain Activated! All cabinets with ${laminateCode} updated instantly`);
      }
      
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
          if (hasChanges && isRedColor) {
            console.log(`🔴 Updated cabinet ${cabinet.name || cabinet.id} with red wood grain for ${laminateCode}`);
          }
          
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

  // ✅ FIXED: Extract laminate codes from central godown
  const globalLaminateMemory = laminateCodeGodownData.map(item => item.code);

  // React Query hooks for plywood brand memory
  const { data: plywoodBrandMemoryData = [], isLoading: isPlywoodBrandMemoryLoading } = useQuery<PlywoodBrandMemory[]>({
    queryKey: ['/api/plywood-brand-memory'],
  });

  const savePlywoodBrandMutation = useMutation({
    mutationFn: async (brand: string) => {
      return apiRequest('POST', '/api/plywood-brand-memory', { brand });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/plywood-brand-memory'] });
    },
  });

  const deletePlywoodBrandMutation = useMutation({
    mutationFn: async (brand: string) => {
      return apiRequest('DELETE', `/api/plywood-brand-memory/${encodeURIComponent(brand)}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/plywood-brand-memory'] });
    },
  });

  // Convert database response to simple string array for compatibility
  const globalPlywoodBrandMemory = plywoodBrandMemoryData.map(item => item.brand);

  // State for custom laminate inputs (display/typing only, not for form data)
  const [topCustomLaminateInput, setTopCustomLaminateInput] = useState('');
  const [saveStatus, setSaveStatus] = useState<'typing' | 'saved' | 'ready' | ''>('');

  // State for laminate section (Bottom Panel)
  const [bottomCustomLaminateInput, setBottomCustomLaminateInput] = useState('');
  const [bottomSaveStatus, setBottomSaveStatus] = useState<'typing' | 'saved' | 'ready' | ''>('');

  // State for laminate section (Left Panel)
  const [leftCustomLaminateInput, setLeftCustomLaminateInput] = useState('');
  const [leftSaveStatus, setLeftSaveStatus] = useState<'typing' | 'saved' | 'ready' | ''>('');

  // State for laminate section (Right Panel)
  const [rightCustomLaminateInput, setRightCustomLaminateInput] = useState('');
  const [rightSaveStatus, setRightSaveStatus] = useState<'typing' | 'saved' | 'ready' | ''>('');

  // State for laminate section (Back Panel)
  const [backCustomLaminateInput, setBackCustomLaminateInput] = useState('');
  const [backSaveStatus, setBackSaveStatus] = useState<'typing' | 'saved' | 'ready' | ''>('');

  // Refs for individual panel laminate code inputs (autofill)
  const topLaminateInputRef = useRef<HTMLInputElement>(null);
  const bottomLaminateInputRef = useRef<HTMLInputElement>(null);
  const leftLaminateInputRef = useRef<HTMLInputElement>(null);
  const rightLaminateInputRef = useRef<HTMLInputElement>(null);
  const backLaminateInputRef = useRef<HTMLInputElement>(null);

  // Focus Management System for Auto-Focus Next Field
  const fieldRefs = useRef<Record<string, HTMLElement | null>>({});
  
  // Register a ref for a field
  const registerFieldRef = (fieldName: string, element: HTMLElement | null) => {
    fieldRefs.current[fieldName] = element;
  };

  // Field sequence for collapsible section (Plywood and Laminates)
  // Note: cabinetName is an input field that doesn't need special focus management
  const collapsibleFieldSequence = [
    'roomName',
    'plywoodBrand',
    'backPanelPlywood',
  ];

  // Field sequence for Advanced mode panel fields
  const advancedPanelFieldSequence = [
    'topPanelLaminateCode',
    'bottomPanelLaminateCode',
    'leftPanelLaminateCode',
    'rightPanelLaminateCode',
    'backPanelLaminateCode',
  ];

  // Focus next field in sequence (supports both collapsible and advanced mode)
  const focusNextField = (currentFieldName: string) => {
    // Check which sequence this field belongs to
    let sequence = collapsibleFieldSequence;
    let currentIndex = collapsibleFieldSequence.indexOf(currentFieldName);
    
    if (currentIndex === -1) {
      // Try advanced panel sequence
      sequence = advancedPanelFieldSequence;
      currentIndex = advancedPanelFieldSequence.indexOf(currentFieldName);
    }
    
    if (currentIndex === -1) return; // Not in any sequence
    
    // Find next focusable field
    for (let i = currentIndex + 1; i < sequence.length; i++) {
      const nextFieldName = sequence[i];
      const nextElement = fieldRefs.current[nextFieldName];
      
      if (nextElement && !nextElement.hasAttribute('disabled')) {
        // Small delay to ensure popover is closed before focusing
        setTimeout(() => {
          nextElement.focus();
          nextElement.click?.(); // Open dropdown if it's a button
        }, 150);
        break;
      }
    }
  };

  // State for shutter laminate section 
  const [shutterLaminateSelection, setShutterLaminateSelection] = useState('');
  const [shutterCustomLaminateInput, setShutterCustomLaminateInput] = useState('');
  const [shutterSaveStatus, setShutterSaveStatus] = useState<'typing' | 'saved' | 'ready' | ''>('');

  // State for custom shutter laminate section 
  const [customShutterLaminateSelection, setCustomShutterLaminateSelection] = useState('');
  const [customShutterCustomLaminateInput, setCustomShutterCustomLaminateInput] = useState('');
  const [customShutterSaveStatus, setCustomShutterSaveStatus] = useState<'typing' | 'saved' | 'ready' | ''>('');

  // State for Back Panel Plywood Brand selection
  const [backPanelPlywoodSelection, setBackPanelPlywoodSelection] = useState('6 mm bwp');
  const [backPanelPlywoodInput, setBackPanelPlywoodInput] = useState('');
  const [backPanelPlywoodSaveStatus, setBackPanelPlywoodSaveStatus] = useState<'typing' | 'saved' | 'ready' | ''>('');

  // State for Gaddi toggles (default to enabled)
  const [topGaddiEnabled, setTopGaddiEnabled] = useState(true);
  const [bottomGaddiEnabled, setBottomGaddiEnabled] = useState(true);
  const [leftGaddiEnabled, setLeftGaddiEnabled] = useState(true);
  const [rightGaddiEnabled, setRightGaddiEnabled] = useState(true);
  
  // Master Gaddi toggle handler
  const toggleAllGaddi = (enabled: boolean) => {
    setTopGaddiEnabled(enabled);
    setBottomGaddiEnabled(enabled);
    setLeftGaddiEnabled(enabled);
    setRightGaddiEnabled(enabled);
  };
  
  // Compute master Gaddi state (all enabled = true, else false)
  const allGaddiEnabled = topGaddiEnabled && bottomGaddiEnabled && leftGaddiEnabled && rightGaddiEnabled;
  const anyGaddiEnabled = topGaddiEnabled || bottomGaddiEnabled || leftGaddiEnabled || rightGaddiEnabled;

  // State for linking panels - controls auto-sync behavior (default to linked for better UX)
  const [panelsLinked, setPanelsLinked] = useState(true);

  // Popover open/close state for laminate code dropdowns (auto-close on select)
  const [quickShutterLaminateOpen, setQuickShutterLaminateOpen] = useState(false);
  const [cabinetConfigLaminateOpen, setCabinetConfigLaminateOpen] = useState(false);
  const [cabinetConfigInnerLaminateOpen, setCabinetConfigInnerLaminateOpen] = useState(false);
  const [topLaminateOpen, setTopLaminateOpen] = useState(false);
  const [topInnerLaminateOpen, setTopInnerLaminateOpen] = useState(false);
  const [bottomLaminateOpen, setBottomLaminateOpen] = useState(false);
  const [bottomInnerLaminateOpen, setBottomInnerLaminateOpen] = useState(false);
  const [leftLaminateOpen, setLeftLaminateOpen] = useState(false);
  const [leftInnerLaminateOpen, setLeftInnerLaminateOpen] = useState(false);
  const [rightLaminateOpen, setRightLaminateOpen] = useState(false);
  const [rightInnerLaminateOpen, setRightInnerLaminateOpen] = useState(false);
  const [backLaminateOpen, setBackLaminateOpen] = useState(false);
  const [backInnerLaminateOpen, setBackInnerLaminateOpen] = useState(false);

  // Popover open/close state for plywood brand dropdowns (auto-close with 100ms delay)
  const [quickShutterPlywoodOpen, setQuickShutterPlywoodOpen] = useState(false);
  const [cabinetPlywoodOpen, setCabinetPlywoodOpen] = useState(false);
  const [backPanelPlywoodOpen, setBackPanelPlywoodOpen] = useState(false);
  const [shutterPlywoodOpen, setShutterPlywoodOpen] = useState(false);
  
  // Basic mode (Quick Shutter) popovers - separate from Advanced mode to avoid interference
  const [basicShutterLaminateOpen, setBasicShutterLaminateOpen] = useState(false);
  const [basicShutterInnerLaminateOpen, setBasicShutterInnerLaminateOpen] = useState(false);

  // Origin tracking to prevent infinite loops during sync
  const currentSyncOrigin = useRef<string | null>(null);

  // Centralized sync helper for plywood brand (main panels only, NOT back panel)
  const syncPlywoodBrand = (newValue: string, source: 'main' | 'back') => {
    if (currentSyncOrigin.current === 'plywood-sync') return;
    currentSyncOrigin.current = 'plywood-sync';
    
    // Update main plywood type (used by Top, Bottom, Left, Right panels)
    // Back panel plywood is now independent
    form.setValue('A', newValue);
    
    setTimeout(() => {
      currentSyncOrigin.current = null;
    }, 100);
  };

  // ✅ REMOVED: syncLaminateType function - no longer needed without laminate types

  // Centralized sync helper for laminate code (excludes back panel)
  const syncLaminateCode = async (newValue: string, source: 'top' | 'bottom' | 'left' | 'right') => {
    if (currentSyncOrigin.current === 'laminate-code-sync') return;
    currentSyncOrigin.current = 'laminate-code-sync';
    
    // ✅ DIRECT LINK: Look up wood grain preference from database
    const baseCode = newValue.split('+')[0].trim();
    const woodGrainsEnabled = woodGrainsPreferences[baseCode] === true;
    
    // Sync to Top/Bottom/Left/Right panels only (back panel is independent)
    // Mark synced panels as user-selected since the origin was a user action
    // Also auto-mark paired Inner Laminates as user-selected
    if (source !== 'top') {
      updateLaminateWithTracking('topPanelLaminateCode', newValue, 'user');
      markLaminateAsUserSelected('topPanelInnerLaminateCode');
      form.setValue('topPanelGrainDirection', woodGrainsEnabled);
    }
    if (source !== 'bottom') {
      updateLaminateWithTracking('bottomPanelLaminateCode', newValue, 'user');
      markLaminateAsUserSelected('bottomPanelInnerLaminateCode');
      form.setValue('bottomPanelGrainDirection', woodGrainsEnabled);
    }
    if (source !== 'left') {
      updateLaminateWithTracking('leftPanelLaminateCode', newValue, 'user');
      markLaminateAsUserSelected('leftPanelInnerLaminateCode');
      form.setValue('leftPanelGrainDirection', woodGrainsEnabled);
    }
    if (source !== 'right') {
      updateLaminateWithTracking('rightPanelLaminateCode', newValue, 'user');
      markLaminateAsUserSelected('rightPanelInnerLaminateCode');
      form.setValue('rightPanelGrainDirection', woodGrainsEnabled);
    }
    
    setTimeout(() => {
      currentSyncOrigin.current = null;
    }, 100);
  };

  // Sync Cabinet Configuration Front Laminate to ALL panels (Top/Bottom/Left/Right/Back)
  const syncCabinetConfigFrontLaminate = (newValue: string, markAsUserSelected: boolean = false) => {
    if (currentSyncOrigin.current === 'cabinet-front-sync') return;
    if (!panelsLinked) return; // Only sync when panels are linked
    
    currentSyncOrigin.current = 'cabinet-front-sync';
    
    // Update ALL panel front laminate codes (Top/Bottom/Left/Right/Back)
    // When user selects at cabinet level, it applies to all panels
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
    
    setTimeout(() => {
      currentSyncOrigin.current = null;
    }, 100);
  };

  // Sync Cabinet Configuration Inner Laminate to ALL panels (Top/Bottom/Left/Right/Back)
  const syncCabinetConfigInnerLaminate = (newValue: string, markAsUserSelected: boolean = false) => {
    if (currentSyncOrigin.current === 'cabinet-inner-sync') return;
    if (!panelsLinked) return; // Only sync when panels are linked
    
    currentSyncOrigin.current = 'cabinet-inner-sync';
    
    // Update ALL panel inner laminate codes (Top/Bottom/Left/Right/Back)
    // When user selects at cabinet level, it applies to all panels
    if (markAsUserSelected) {
      updateLaminateWithTracking('topPanelInnerLaminateCode', newValue, 'user');
      updateLaminateWithTracking('bottomPanelInnerLaminateCode', newValue, 'user');
      updateLaminateWithTracking('leftPanelInnerLaminateCode', newValue, 'user');
      updateLaminateWithTracking('rightPanelInnerLaminateCode', newValue, 'user');
      updateLaminateWithTracking('backPanelInnerLaminateCode', newValue, 'user');
    } else {
      form.setValue('topPanelInnerLaminateCode', newValue);
      form.setValue('bottomPanelInnerLaminateCode', newValue);
      form.setValue('leftPanelInnerLaminateCode', newValue);
      form.setValue('rightPanelInnerLaminateCode', newValue);
      form.setValue('backPanelInnerLaminateCode', newValue);
    }
    
    setTimeout(() => {
      currentSyncOrigin.current = null;
    }, 100);
  };

  // Master Settings: Update ALL cabinets when master plywood changes (main panels only)
  const updateAllCabinetsPlywood = (newPlywood: string) => {
    updateCabinets((prevCabinets: Cabinet[]) => 
      prevCabinets.map(cabinet => ({
        ...cabinet,
        A: newPlywood
        // backPanelPlywoodBrand is now independent
      }))
    );
    // Update current cabinet form
    form.setValue('A', newPlywood);
    // backPanelPlywoodBrand is now independent
  };

  // Master Settings: Update ALL cabinets when master laminate type changes
  // ✅ REMOVED: updateAllCabinetsLaminateType - no longer needed without laminate types

  // Master Settings: Update ALL cabinets when master laminate code changes
  const updateAllCabinetsLaminateCode = (newCode: string) => {
    updateCabinets((prevCabinets: Cabinet[]) => 
      prevCabinets.map(cabinet => ({
        ...cabinet,
        topPanelLaminateCode: newCode,
        bottomPanelLaminateCode: newCode,
        leftPanelLaminateCode: newCode,
        rightPanelLaminateCode: newCode,
        backPanelLaminateCode: newCode,
        shutterLaminateCode: newCode
      }))
    );
    // Update current cabinet form
    form.setValue('topPanelLaminateCode', newCode);
    form.setValue('bottomPanelLaminateCode', newCode);
    form.setValue('leftPanelLaminateCode', newCode);
    form.setValue('rightPanelLaminateCode', newCode);
    form.setValue('backPanelLaminateCode', newCode);
    form.setValue('shutterLaminateCode', newCode);
  };

  // Master Settings: Update ALL cabinets when master inner laminate code changes
  const updateAllCabinetsInnerLaminateCode = (newCode: string) => {
    updateCabinets((prevCabinets: Cabinet[]) => 
      prevCabinets.map(cabinet => ({
        ...cabinet,
        innerLaminateCode: newCode
      }))
    );
    // Also update current cabinet form
    form.setValue('innerLaminateCode', newCode);
  };

  // Master Settings: Update ALL cabinets when master wood grains changes (Front Laminate)
  const updateAllCabinetsWoodGrains = (enabled: boolean) => {
    updateCabinets((prevCabinets: Cabinet[]) => 
      prevCabinets.map(cabinet => ({
        ...cabinet,
        topPanelGrainDirection: enabled,
        bottomPanelGrainDirection: enabled,
        leftPanelGrainDirection: enabled,
        rightPanelGrainDirection: enabled,
        backPanelGrainDirection: enabled,
        shutterGrainDirection: enabled
      }))
    );
    // Update current cabinet form
    form.setValue('topPanelGrainDirection', enabled);
    form.setValue('bottomPanelGrainDirection', enabled);
    form.setValue('leftPanelGrainDirection', enabled);
    form.setValue('rightPanelGrainDirection', enabled);
    form.setValue('backPanelGrainDirection', enabled);
    form.setValue('shutterGrainDirection', enabled);
  };

  // Master Settings: Update ALL cabinets when master inner wood grains changes (Inner Laminate)
  const updateAllCabinetsInnerWoodGrains = (enabled: boolean) => {
    updateCabinets((prevCabinets: Cabinet[]) => 
      prevCabinets.map(cabinet => ({
        ...cabinet,
        topPanelInnerGrainDirection: enabled,
        bottomPanelInnerGrainDirection: enabled,
        leftPanelInnerGrainDirection: enabled,
        rightPanelInnerGrainDirection: enabled,
        backPanelInnerGrainDirection: enabled
      }))
    );
    // Update current cabinet form
    form.setValue('topPanelInnerGrainDirection', enabled);
    form.setValue('bottomPanelInnerGrainDirection', enabled);
    form.setValue('leftPanelInnerGrainDirection', enabled);
    form.setValue('rightPanelInnerGrainDirection', enabled);
    form.setValue('backPanelInnerGrainDirection', enabled);
  };

  // Function to delete a saved custom option from global memory
  const deleteGlobalLaminateOption = (optionToDelete: string) => {
    deleteLaminateCodeMutation.mutate(optionToDelete);
  };

  // ✅ REMOVED: Auto-update laminate section useEffect hooks - no longer needed without laminate types

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

  // ✅ REMOVED: Auto-sync shutter laminate codes - no longer needed without laminate types


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


  // Handle Enter key press to save custom laminate option to global memory
  const handleSaveCustomLaminate = (input: string, panelType: 'top' | 'bottom' | 'left' | 'right' | 'shutter' | 'customShutter') => {
    const newOption = input.trim();
    if (newOption.length >= 3) {
      // Clear the input field for next entry
      if (panelType === 'top') setTopCustomLaminateInput('');
      else if (panelType === 'bottom') setBottomCustomLaminateInput('');
      else if (panelType === 'left') setLeftCustomLaminateInput('');
      else if (panelType === 'right') setRightCustomLaminateInput('');
      else if (panelType === 'shutter') setShutterCustomLaminateInput('');
      else if (panelType === 'customShutter') setCustomShutterCustomLaminateInput('');

      // Check if option already exists in global memory
      if (globalLaminateMemory.includes(newOption)) {
        // Set the dropdown selection to show the existing option
        if (panelType === 'top') {
          form.setValue('topPanelLaminateCode', newOption);
          setSaveStatus('ready');
          setTimeout(() => setSaveStatus(''), 2000);
        } else if (panelType === 'bottom') {
          form.setValue('bottomPanelLaminateCode', newOption);
          setBottomSaveStatus('ready');
          setTimeout(() => setBottomSaveStatus(''), 2000);
        } else if (panelType === 'left') {
          form.setValue('leftPanelLaminateCode', newOption);
          setLeftSaveStatus('ready');
          setTimeout(() => setLeftSaveStatus(''), 2000);
        } else if (panelType === 'right') {
          form.setValue('rightPanelLaminateCode', newOption);
          setRightSaveStatus('ready');
          setTimeout(() => setRightSaveStatus(''), 2000);
        } else if (panelType === 'shutter') {
          setShutterLaminateSelection(newOption);
          setShutterSaveStatus('ready');
          setTimeout(() => setShutterSaveStatus(''), 2000);
        } else if (panelType === 'customShutter') {
          setCustomShutterLaminateSelection(newOption);
          setCustomShutterSaveStatus('ready');
          setTimeout(() => setCustomShutterSaveStatus(''), 2000);
        }
      } else {
        // Add new option to global memory
        saveLaminateCodeMutation.mutate(newOption);
        
        // Set the dropdown selection to show the newly saved option
        if (panelType === 'top') {
          form.setValue('topPanelLaminateCode', newOption);
          setSaveStatus('saved');
          setTimeout(() => setSaveStatus(''), 2000);
        } else if (panelType === 'bottom') {
          form.setValue('bottomPanelLaminateCode', newOption);
          setBottomSaveStatus('saved');
          setTimeout(() => setBottomSaveStatus(''), 2000);
        } else if (panelType === 'left') {
          form.setValue('leftPanelLaminateCode', newOption);
          setLeftSaveStatus('saved');
          setTimeout(() => setLeftSaveStatus(''), 2000);
        } else if (panelType === 'right') {
          form.setValue('rightPanelLaminateCode', newOption);
          setRightSaveStatus('saved');
          setTimeout(() => setRightSaveStatus(''), 2000);
        } else if (panelType === 'shutter') {
          setShutterLaminateSelection(newOption);
          setShutterSaveStatus('saved');
          setTimeout(() => setShutterSaveStatus(''), 2000);
        } else if (panelType === 'customShutter') {
          setCustomShutterLaminateSelection(newOption);
          setCustomShutterSaveStatus('saved');
          setTimeout(() => setCustomShutterSaveStatus(''), 2000);
        }
      }
    }
  };




  // Handle Enter key press for Back Panel laminate codes (consistent with other panels)
  const handleBackPanelSave = (input: string) => {
    const newOption = input.trim();
    if (newOption.length >= 3) {
      // Clear the input field for next entry
      setBackCustomLaminateInput('');

      // Check if option already exists in global memory
      if (globalLaminateMemory.includes(newOption)) {
        // Set the dropdown selection to show the existing option
        form.setValue('backPanelLaminateCode', newOption);
        setBackSaveStatus('ready');
        setTimeout(() => setBackSaveStatus(''), 2000);
      } else {
        // Add new option to global memory
        saveLaminateCodeMutation.mutate(newOption);
        
        // Set the dropdown selection to show the newly saved option
        form.setValue('backPanelLaminateCode', newOption);
        setBackSaveStatus('saved');
        setTimeout(() => setBackSaveStatus(''), 2000);
      }
    }
  };

  // Handle Enter key press for Back Panel Plywood Brand
  const handleBackPanelPlywoodSave = (input: string) => {
    const newBrand = input.trim();
    if (newBrand.length >= 3) {
      // Clear the input field for next entry
      setBackPanelPlywoodInput('');

      // Check if brand already exists in memory
      if (globalPlywoodBrandMemory.includes(newBrand)) {
        // Set the selection to show the existing brand
        setBackPanelPlywoodSelection(newBrand);
        form.setValue('A', newBrand);
        setBackPanelPlywoodSaveStatus('ready');
        setTimeout(() => setBackPanelPlywoodSaveStatus(''), 2000);
      } else {
        // Add new brand to memory via API
        savePlywoodBrandMutation.mutate(newBrand);
        
        // Set the selection to show the newly saved brand
        setBackPanelPlywoodSelection(newBrand);
        form.setValue('A', newBrand);
        setBackPanelPlywoodSaveStatus('saved');
        setTimeout(() => setBackPanelPlywoodSaveStatus(''), 2000);
      }
    }
  };

  // Delete plywood brand from memory
  const deleteBackPanelPlywoodBrand = (brandToDelete: string) => {
    deletePlywoodBrandMutation.mutate(brandToDelete);
  };



  // Unit conversion functions
  const mmToInches = (mm: number): number => parseFloat((mm / 25.4).toFixed(1));
  const inchesToMm = (inches: number): number => Math.round(inches * 25.4);

  // Normalize strings for grouping (removes whitespace and case inconsistencies)
  // This ensures items with the same text group together despite spacing/case differences
  // Case-insensitive: "Apple Ply" and "apple ply" are treated as the same
  const normalizeForGrouping = (text: string): string => {
    return text
      .trim()                          // Remove leading/trailing spaces
      .toLowerCase()                   // Normalize to lowercase for case-insensitive grouping
      .replace(/\s+/g, ' ');          // Collapse multiple spaces to single space
  };

  // Check if material confirmation is required before adding a panel
  // Returns true if laminate is "none"/empty/unspecified
  const requiresMaterialConfirmation = ({ plywood, laminateCode }: { plywood?: string; laminateCode?: string }): boolean => {
    const normalizedLaminate = (laminateCode || '').trim().toLowerCase();
    
    // Check if laminate code is empty or "none"
    if (normalizedLaminate === '' || normalizedLaminate === 'none') {
      return true;
    }
    
    // Laminate code is specified with a real value
    return false;
  };

  // Calculate panel dimensions - Apply width reduction to top/bottom panels for optimizer
  const calculatePanelDimensions = (cabinet: Cabinet) => {
    const calculatedWidth = cabinet.width - (cabinet.widthReduction ?? 36);
    return {
      top: { width: calculatedWidth, height: cabinet.depth, thickness: 18 },
      bottom: { width: calculatedWidth, height: cabinet.depth, thickness: 18 },
      left: { width: cabinet.depth, height: cabinet.height, thickness: 18 },
      right: { width: cabinet.depth, height: cabinet.height, thickness: 18 },
      back: { width: cabinet.width, height: cabinet.height, thickness: 18 }
    };
  };

  // Type for tracking missing laminate details
  type MissingLaminateDetail = {
    panel: string;
    missingFront: boolean;
    missingInner: boolean;
  };

  // ✅ REMOVED: normalizeLaminateType function - no longer needed without laminate types

  // Helper function to collect detailed information about missing laminate codes
  const collectMissingLaminateDetails = (cabinet: Cabinet, mode: 'basic' | 'advanced'): {
    needsConfirmation: boolean;
    details: MissingLaminateDetail[];
    formattedMessages: string[];
  } => {
    const details: MissingLaminateDetail[] = [];
    
    // For basic mode, check shutter laminate
    if (mode === 'basic') {
      const hasShutterCode = !!(cabinet.shutterLaminateCode && cabinet.shutterLaminateCode.trim());
      const isShutterUserSelected = userSelectedLaminates.has('shutterLaminateCode');
      
      // Require BOTH a value AND user selection (not just auto-filled default)
      if (!hasShutterCode || !isShutterUserSelected) {
        details.push({
          panel: 'Shutter',
          missingFront: true,
          missingInner: false
        });
      }
      const formattedMessages = details.map(d => 
        d.missingFront && d.missingInner ? `${d.panel}: Missing both front and inner laminate` :
        d.missingFront ? `${d.panel}: Missing front laminate` :
        `${d.panel}: Missing inner laminate`
      );
      return { needsConfirmation: details.length > 0, details, formattedMessages };
    }
    
    // For advanced mode, check all panels
    const panels = [
      { key: 'top', label: 'Top Panel', frontCode: cabinet.topPanelLaminateCode, innerCode: cabinet.topPanelInnerLaminateCode, frontField: 'topPanelLaminateCode', innerField: 'topPanelInnerLaminateCode' },
      { key: 'bottom', label: 'Bottom Panel', frontCode: cabinet.bottomPanelLaminateCode, innerCode: cabinet.bottomPanelInnerLaminateCode, frontField: 'bottomPanelLaminateCode', innerField: 'bottomPanelInnerLaminateCode' },
      { key: 'left', label: 'Left Panel', frontCode: cabinet.leftPanelLaminateCode, innerCode: cabinet.leftPanelInnerLaminateCode, frontField: 'leftPanelLaminateCode', innerField: 'leftPanelInnerLaminateCode' },
      { key: 'right', label: 'Right Panel', frontCode: cabinet.rightPanelLaminateCode, innerCode: cabinet.rightPanelInnerLaminateCode, frontField: 'rightPanelLaminateCode', innerField: 'rightPanelInnerLaminateCode' },
      { key: 'back', label: 'Back Panel', frontCode: cabinet.backPanelLaminateCode, innerCode: cabinet.backPanelInnerLaminateCode, frontField: 'backPanelLaminateCode', innerField: 'backPanelInnerLaminateCode' }
    ];
    
    for (const panel of panels) {
      const hasFrontCode = !!(panel.frontCode && panel.frontCode.trim());
      const hasInnerCode = !!(panel.innerCode && panel.innerCode.trim());
      const isFrontUserSelected = userSelectedLaminates.has(panel.frontField);
      const isInnerUserSelected = userSelectedLaminates.has(panel.innerField);
      
      // Require BOTH a value AND user selection (not just auto-filled defaults)
      const missingFront = !hasFrontCode || !isFrontUserSelected;
      const missingInner = !hasInnerCode || !isInnerUserSelected;
      
      if (missingFront || missingInner) {
        details.push({
          panel: panel.label,
          missingFront,
          missingInner
        });
      }
    }
    
    const formattedMessages = details.map(d => 
      d.missingFront && d.missingInner ? `${d.panel}: Missing both front and inner laminate` :
      d.missingFront ? `${d.panel}: Missing front laminate` :
      `${d.panel}: Missing inner laminate`
    );
    
    return { needsConfirmation: details.length > 0, details, formattedMessages };
  };

  // ✅ VERSION WITH TRACKING PARAMETER: Same logic but accepts a tracking set (for cabinet add validation)
  const collectMissingLaminateDetailsWithTracking = (
    cabinet: Cabinet, 
    mode: 'basic' | 'advanced',
    trackingSet: Set<string>
  ): {
    needsConfirmation: boolean;
    details: MissingLaminateDetail[];
    formattedMessages: string[];
  } => {
    const details: MissingLaminateDetail[] = [];
    
    // For basic mode, check shutter laminate - just check if value exists (no tracking required)
    if (mode === 'basic') {
      const hasShutterCode = !!(cabinet.shutterLaminateCode && cabinet.shutterLaminateCode.trim());
      
      // ✅ SIMPLIFIED: Basic mode just needs a value, no tracking requirement
      if (!hasShutterCode) {
        details.push({
          panel: 'Shutter',
          missingFront: true,
          missingInner: false
        });
      }
      const formattedMessages = details.map(d => 
        d.missingFront && d.missingInner ? `${d.panel}: Missing both front and inner laminate` :
        d.missingFront ? `${d.panel}: Missing front laminate` :
        `${d.panel}: Missing inner laminate`
      );
      return { needsConfirmation: details.length > 0, details, formattedMessages };
    }
    
    // For advanced mode, check all panels
    const panels = [
      { key: 'top', label: 'Top Panel', frontCode: cabinet.topPanelLaminateCode, innerCode: cabinet.topPanelInnerLaminateCode, frontField: 'topPanelLaminateCode', innerField: 'topPanelInnerLaminateCode' },
      { key: 'bottom', label: 'Bottom Panel', frontCode: cabinet.bottomPanelLaminateCode, innerCode: cabinet.bottomPanelInnerLaminateCode, frontField: 'bottomPanelLaminateCode', innerField: 'bottomPanelInnerLaminateCode' },
      { key: 'left', label: 'Left Panel', frontCode: cabinet.leftPanelLaminateCode, innerCode: cabinet.leftPanelInnerLaminateCode, frontField: 'leftPanelLaminateCode', innerField: 'leftPanelInnerLaminateCode' },
      { key: 'right', label: 'Right Panel', frontCode: cabinet.rightPanelLaminateCode, innerCode: cabinet.rightPanelInnerLaminateCode, frontField: 'rightPanelLaminateCode', innerField: 'rightPanelInnerLaminateCode' },
      { key: 'back', label: 'Back Panel', frontCode: cabinet.backPanelLaminateCode, innerCode: cabinet.backPanelInnerLaminateCode, frontField: 'backPanelLaminateCode', innerField: 'backPanelInnerLaminateCode' }
    ];
    
    for (const panel of panels) {
      const hasFrontCode = !!(panel.frontCode && panel.frontCode.trim());
      const hasInnerCode = !!(panel.innerCode && panel.innerCode.trim());
      
      // Only require values to exist (defaults are now acceptable)
      const missingFront = !hasFrontCode;
      const missingInner = !hasInnerCode;
      
      if (missingFront || missingInner) {
        details.push({
          panel: panel.label,
          missingFront,
          missingInner
        });
      }
    }
    
    const formattedMessages = details.map(d => 
      d.missingFront && d.missingInner ? `${d.panel}: Missing both front and inner laminate` :
      d.missingFront ? `${d.panel}: Missing front laminate` :
      `${d.panel}: Missing inner laminate`
    );
    
    return { needsConfirmation: details.length > 0, details, formattedMessages };
  };

  // Helper function to compose laminate code from separate front and inner codes
  const composeLaminateCode = (frontCode: string, innerCode: string): string => {
    const front = (frontCode || '').trim();
    const inner = (innerCode || '').trim();
    
    // If both are provided, combine them
    if (front && inner) {
      return `${front} + ${inner}`;
    }
    
    // If only front is provided, default inner to "Backer"
    if (front && !inner) {
      return `${front} + Backer`;
    }
    
    // If only inner is provided, default front to "Backer"
    if (!front && inner) {
      return `Backer + ${inner}`;
    }
    
    // If neither is provided, return empty string
    return '';
  };

  // ✅ REMOVED: normalizeLaminateCode function - no longer needed without laminate types

  // ✅ FIXED: Generate panels from cabinet with direct wood grains lookup from database
  const generatePanels = (cabinet: Cabinet): Panel[] => {
    // For Basic mode or Quick Shutter entries (depth = 0 or configurationMode = 'basic'), create simple flat panels
    if (cabinet.depth === 0 || cabinet.configurationMode === 'basic') {
      // Extract quantity from the cabinet name (e.g., "2000×200mm (Qty: 5)") or use shutterCount
      const qtyMatch = cabinet.name.match(/\(Qty: (\d+)\)/);
      const quantity = qtyMatch ? parseInt(qtyMatch[1]) : (cabinet.shutterCount || 1);
      
      // ✅ Get plywood type from A (unified field for Basic mode)
      const A = cabinet.A || 'Apple Ply 16mm BWP';
      
      // ✅ FIX: Compose BOTH front + inner laminate codes for correct consolidation and preview display
      const laminateCode = composeLaminateCode(cabinet.shutterLaminateCode || '', cabinet.shutterInnerLaminateCode || '');
      
      // Create the specified quantity of identical panels
      const panels: Panel[] = [];
      for (let i = 0; i < quantity; i++) {
        panels.push({
          name: cabinet.name.replace(/ \(Qty: \d+\)/, ''), // Remove qty from name
          width: cabinet.width,
          height: cabinet.height,
          laminateCode: laminateCode,
          A: A,
          grainDirection: cabinet.shutterGrainDirection === true,
          gaddi: cabinet.shutterGaddi === true,
          nomW: cabinet.width,
          nomH: cabinet.height
        });
      }
      
      return panels;
    }

    // For regular cabinets, use the standard panel generation
    const dimensions = calculatePanelDimensions(cabinet);
    
    // Get plywood types (default to Apple Ply 16mm BWP if not set)
    const A = cabinet.A || 'Apple Ply 16mm BWP';
    // Back panel uses dedicated thinner plywood (default: 6 mm bwp)
    const backPanelPlywoodBrand = (cabinet as any).backPanelPlywoodBrand || '6 mm bwp';
    
    // Pre-compose laminate codes for dynamic grain direction checks
    const topLaminateCode = composeLaminateCode(
      cabinet.topPanelLaminateCode || '',
      cabinet.topPanelInnerLaminateCode || ''
    );
    const bottomLaminateCode = composeLaminateCode(
      cabinet.bottomPanelLaminateCode || '',
      cabinet.bottomPanelInnerLaminateCode || ''
    );
    const leftLaminateCode = composeLaminateCode(
      cabinet.leftPanelLaminateCode || '',
      cabinet.leftPanelInnerLaminateCode || ''
    );
    const rightLaminateCode = composeLaminateCode(
      cabinet.rightPanelLaminateCode || '',
      cabinet.rightPanelInnerLaminateCode || ''
    );
    
    // ✅ FIX: Apply grain-based nomW/nomH swapping for LEFT/RIGHT panels (like shutters)
    // When grain is ON: nomW = depth (X-axis), nomH = height (Y-axis) - NO rotation
    // When grain is OFF: nomW = height, nomH = depth - allows rotation
    const hasLeftGrain = cabinet.leftPanelGrainDirection === true;
    const leftNomW = hasLeftGrain ? dimensions.left.width : dimensions.left.height;
    const leftNomH = hasLeftGrain ? dimensions.left.height : dimensions.left.width;
    
    const hasRightGrain = cabinet.rightPanelGrainDirection === true;
    const rightNomW = hasRightGrain ? dimensions.right.width : dimensions.right.height;
    const rightNomH = hasRightGrain ? dimensions.right.height : dimensions.right.width;
    
    const panels: Panel[] = [
      { 
        id: `${cabinet.name}-TOP-grain-${cabinet.topPanelGrainDirection === true}`,
        name: `${cabinet.name} - Top`, 
        width: dimensions.top.width, 
        height: dimensions.top.height, 
        laminateCode: topLaminateCode,
        gaddi: cabinet.topPanelGaddi === true,
        grainDirection: cabinet.topPanelGrainDirection === true,
        A: A,
        nomW: dimensions.top.width,
        nomH: dimensions.top.height
      },
      { 
        id: `${cabinet.name}-BOTTOM-grain-${cabinet.bottomPanelGrainDirection === true}`,
        name: `${cabinet.name} - Bottom`, 
        width: dimensions.bottom.width, 
        height: dimensions.bottom.height, 
        laminateCode: bottomLaminateCode,
        gaddi: cabinet.bottomPanelGaddi === true,
        grainDirection: cabinet.bottomPanelGrainDirection === true,
        A: A,
        nomW: dimensions.bottom.width,
        nomH: dimensions.bottom.height
      },
      { 
        id: `${cabinet.name}-LEFT-grain-${cabinet.leftPanelGrainDirection === true}`,
        name: `${cabinet.name} - Left`, 
        width: dimensions.left.width, 
        height: dimensions.left.height, 
        laminateCode: leftLaminateCode,
        gaddi: cabinet.leftPanelGaddi === true,
        grainDirection: cabinet.leftPanelGrainDirection === true,
        A: A,
        nomW: leftNomW,
        nomH: leftNomH
      },
      { 
        id: `${cabinet.name}-RIGHT-grain-${cabinet.rightPanelGrainDirection === true}`,
        name: `${cabinet.name} - Right`, 
        width: dimensions.right.width, 
        height: dimensions.right.height, 
        laminateCode: rightLaminateCode,
        gaddi: cabinet.rightPanelGaddi === true,
        grainDirection: cabinet.rightPanelGrainDirection === true,
        A: A,
        nomW: rightNomW,
        nomH: rightNomH
      }
    ];

    // Add shutters if enabled
    if (cabinet.shuttersEnabled && cabinet.shutters) {
      cabinet.shutters.forEach((shutter, index) => {
        // ✅ SHUTTER CONSOLIDATION: Use main shutter laminate codes (not special logic)
        // Shutters consolidate onto same sheet as any other panels with matching plywood + front + inner laminates
        const shutterLaminateCodeFront = cabinet.shutterLaminateCode || '';
        const shutterLaminateCodeInner = cabinet.shutterInnerLaminateCode || '';
        const composedShutterLaminateCode = composeLaminateCode(shutterLaminateCodeFront, shutterLaminateCodeInner);
        
        // ✅ FIX: Swap nomW/nomH based on grain direction to prevent rotation when grains are ON
        // When grain is ON: width stays on Y-axis (nomW = width, nomH = height - NO rotation)
        // When grain is OFF: width can rotate to X-axis (nomW = height, nomH = width - allows rotation)
        const hasShutterGrain = cabinet.shutterGrainDirection === true;
        const nomW = hasShutterGrain ? shutter.width : shutter.height;
        const nomH = hasShutterGrain ? shutter.height : shutter.width;
        
        panels.push({
          name: `${cabinet.name} - Shutter ${index + 1}`,
          width: shutter.width,
          height: shutter.height,
          laminateCode: composedShutterLaminateCode, // ✅ Use composed code for consolidation matching
          grainDirection: hasShutterGrain, // Read from cabinet object
          A: A, // ALWAYS use cabinet plywood (same as regular panels)
          nomW: nomW,
          nomH: nomH
        });
      });
    }

    // Add center posts if enabled
    if (cabinet.centerPostEnabled && cabinet.centerPostQuantity > 0) {
      for (let i = 0; i < cabinet.centerPostQuantity; i++) {
        const centerPostLaminateCode = composeLaminateCode(
          cabinet.centerPostLaminateCode || '',
          cabinet.centerPostInnerLaminateCode || ''
        );
        
        // ✅ FIX: Swap nomW/nomH based on grain direction to allow rotation flexibility
        // When grain is ON: height stays on Y-axis (nomW = height, nomH = depth)
        // When grain is OFF: height can rotate to X-axis (nomW = depth, nomH = height)
        const hasCenterPostGrain = cabinet.centerPostGrainDirection === true;
        const nomW = hasCenterPostGrain ? cabinet.centerPostHeight : cabinet.centerPostDepth;
        const nomH = hasCenterPostGrain ? cabinet.centerPostDepth : cabinet.centerPostHeight;
        
        panels.push({
          name: `${cabinet.name} - Center Post ${i + 1}`,
          width: cabinet.centerPostDepth, // Use the actual center post depth from form
          height: cabinet.centerPostHeight,
          laminateCode: centerPostLaminateCode,
          grainDirection: hasCenterPostGrain,
          A: A,
          nomW: nomW,
          nomH: nomH
        });
      }
    }

    // Add shelves if enabled
    if (cabinet.shelvesEnabled && cabinet.shelvesQuantity > 0) {
      const shelfWidth = cabinet.centerPostEnabled 
        ? cabinet.width - (cabinet.centerPostQuantity * 18)
        : cabinet.width;
      
      for (let i = 0; i < cabinet.shelvesQuantity; i++) {
        const shelvesLaminateCode = composeLaminateCode(
          cabinet.shelvesLaminateCode || '',
          cabinet.shelvesInnerLaminateCode || ''
        );
        
        // ✅ FIX: Swap nomW/nomH based on grain direction to allow rotation flexibility
        // When grain is ON: width stays on Y-axis (nomW = shelfWidth, nomH = depth)
        // When grain is OFF: width can rotate to X-axis (nomW = depth, nomH = shelfWidth)
        const hasShelfGrain = cabinet.shelvesGrainDirection === true;
        const nomW = hasShelfGrain ? shelfWidth : (cabinet.depth - 20);
        const nomH = hasShelfGrain ? (cabinet.depth - 20) : shelfWidth;
        
        panels.push({
          name: `${cabinet.name} - Shelf ${i + 1}`,
          width: shelfWidth,
          height: cabinet.depth - 20, // Standard shelf depth reduction
          laminateCode: shelvesLaminateCode,
          grainDirection: hasShelfGrain,
          A: A,
          nomW: nomW,
          nomH: nomH
        });
      }
    }

    // Add back panel LAST so it appears at the end in Excel export
    const backLaminateCode = composeLaminateCode(
      cabinet.backPanelLaminateCode || '',
      cabinet.backPanelInnerLaminateCode || ''
    );
    
    panels.push({
      id: `${cabinet.name}-BACK-grain-${cabinet.backPanelGrainDirection === true}`,
      name: `${cabinet.name} - Back Panel`,
      width: dimensions.back.width,
      height: dimensions.back.height,
      laminateCode: backLaminateCode,
      grainDirection: cabinet.backPanelGrainDirection === true,
      A: backPanelPlywoodBrand,
      nomW: dimensions.back.width,
      nomH: dimensions.back.height
    });

    return panels;
  };

  // Memoize preview calculations to prevent running on every keystroke
  // Only recalculate when cabinets, materials, or preview settings change
  const previewBrandResults = useMemo(() => {
    // ✅ OPTIMIZATION: Don't block on wood grains loading - show preview immediately
    // Preferences will update cutting list in background as they load
    
    // Only calculate if preview dialog is open
    if (!showPreviewDialog || cabinets.length === 0) {
      return [];
    }

    const allPanels = cabinets.flatMap(generatePanels);
    console.log('🔍 Preview Dialog - allPanels count:', allPanels.length);
    
    const currentSheetWidth = sheetWidth;
    const currentSheetHeight = sheetHeight;
    const currentKerf = kerf;
    
    const getLaminateDisplay = (laminateCode: string): string => {
      if (!laminateCode) return 'None';
      return laminateCode;
    };
    
    // ✅ Sheet Consolidation: A + B + C matching (plywood + front laminate + inner laminate)
    // Group panels using 3-way matching: All must match for same sheet
    const panelsByBrand = allPanels.reduce((acc, panel) => {
      const isBackPanel = panel.name.includes('- Back Panel');
      // A field: Plywood brand
      const brand = isBackPanel 
        ? (panel.A || panel.A || 'Apple ply 6mm BWP')
        : (panel.A || 'Apple Ply 16mm BWP');
      
      const laminateCode = panel.laminateCode || '';
      
      // Extract B (front) and C (inner) from composed laminateCode
      // Format: "456SF Terra Wood + off white" → B="456SF Terra Wood", C="off white"
      let frontLaminate = '';
      let innerLaminate = '';
      
      if (laminateCode.includes(' + ')) {
        [frontLaminate, innerLaminate] = laminateCode.split(' + ').map(s => s.trim());
      } else {
        frontLaminate = laminateCode.trim();
        innerLaminate = 'off white'; // default
      }
      
      // ✅ CRITICAL: Group key must match A + B + C
      // If any of these differ, panels go on separate sheets
      const groupKey = `${normalizeForGrouping(brand)}|||${normalizeForGrouping(frontLaminate)}|||${normalizeForGrouping(innerLaminate)}`;
      if (!acc[groupKey]) acc[groupKey] = { brand, laminateCode, panels: [] };
      acc[groupKey].panels.push(panel);
      return acc;
    }, {} as Record<string, { brand: string; laminateCode: string; panels: typeof allPanels }>);
    
    const brandResults: Array<{ brand: string; laminateCode: string; laminateDisplay: string; result: any; isBackPanel: boolean }> = [];
    
    Object.entries(panelsByBrand).forEach(([groupKey, group]) => {
      console.group('🔍 PREVIEW DIALOG - Preparing parts');
      console.log('Group panels:', group.panels.length);
      const hasShutters = group.panels.some(p => p.name.includes('- Shutter'));
      if (hasShutters) {
        console.log('✅ SHUTTER CONSOLIDATION - This group contains shutters with matching plywood+laminates');
      }
      console.groupEnd();
      
      const rawParts = preparePartsForOptimizer(group.panels);
      const parts = rawParts
        .filter((p: any) => Boolean(p))
        .map((p: any, i: number) => ({ ...p, id: String(p.id ?? p.name ?? `part-${i}`) }));
      
      console.log('🌾 Optimizer received parts (first 10):', parts.slice(0, 10));
      
      // Use multi-pass optimization for maximum efficiency
      const optimizedPanels = multiPassOptimize(parts, currentSheetWidth, currentSheetHeight);
      const result = { panels: optimizedPanels };
      const laminateDisplay = getLaminateDisplay(group.laminateCode);
      
      // Assign stable sheet IDs
      if (result?.panels) {
        result.panels.forEach((sheet: any, sheetIdx: number) => {
          sheet._sheetId = `${groupKey}-${sheetIdx}`;
          // Restore grain and compute display dims for every placed panel
          sheet.placed?.forEach((p: any) => { 
            const found = group.panels.find(gp => String(gp.id) === String(p.id) || String(gp.id) === String(p.origId));
            if (found) {
              p.grainDirection = found.grainDirection ?? null;
              p.type = (found as any).name || p.name;
              // Use actual panel values - NO hardcoded defaults
              p.depth = (found as any).depth ?? (found as any).width;
            }
            computeDisplayDims(p);
          });
        });
      }
      
      
      const hasBackPanel = group.panels.some(p => p.name.includes('- Back Panel'));
      brandResults.push({ 
        brand: group.brand, 
        laminateCode: group.laminateCode, 
        laminateDisplay,
        result, 
        isBackPanel: hasBackPanel
      });
    });
    
    // ✅ SHUTTER CONSOLIDATION: Verify shutters are using same sheet when materials match
    console.group('✅ SHUTTER CONSOLIDATION CHECK');
    const shutterCount = allPanels.filter(p => p.name.includes('- Shutter')).length;
    console.log('Total shutters found:', shutterCount);
    const shutterGrouping = allPanels.filter(p => p.name.includes('- Shutter')).map(s => ({
      name: s.name,
      plywood: s.A,
      laminate: s.laminateCode
    }));
    console.log('Shutter grouping:', shutterGrouping);
    console.log('✅ Shutters will consolidate onto cabinet sheets when plywood + laminates match');
    console.groupEnd();
    
    // Process manual panels
    const placedManualPanelIds = new Set<string>();
    manualPanels.forEach(mp => {
      if (!mp.targetSheet || !mp.targetSheet.sheetId) return;
      const targetSheetId = mp.targetSheet.sheetId;
      
      let targetBrandResult: any = null;
      let targetSheetIndex = -1;
      for (const brandResult of brandResults) {
        if (brandResult.result?.panels) {
          const sheetIndex = brandResult.result.panels.findIndex((s: any) => s._sheetId === targetSheetId);
          if (sheetIndex !== -1) {
            targetBrandResult = brandResult;
            targetSheetIndex = sheetIndex;
            break;
          }
        }
      }
      if (!targetBrandResult || targetSheetIndex === -1) return;
      
      const targetSheet = targetBrandResult.result.panels[targetSheetIndex];
      const existingPanels = targetSheet.placed.map((p: any) => ({
        id: p.id, w: p.w, h: p.h, nomW: p.nomW ?? p.w, nomH: p.nomH ?? p.h,
        qty: 1, rotate: p.grainDirection ? false : true, gaddi: p.gaddi === true,
        grainDirection: p.grainDirection === true, laminateCode: p.laminateCode || ''
      }));
      
      const manualParts = Array(mp.quantity).fill(null).map(() => ({
        id: `${mp.name} (Manual)`, w: mp.width, h: mp.height, nomW: mp.width, nomH: mp.height,
        qty: 1, rotate: mp.grainDirection ? false : true, gaddi: mp.gaddi === true,
        grainDirection: mp.grainDirection === true, laminateCode: mp.laminateCode || ''
      }));
      
      const combinedParts = [...existingPanels, ...manualParts];
      const combinedResult = optimizeCutlist({ parts: combinedParts, sheet: { w: currentSheetWidth, h: currentSheetHeight, kerf: currentKerf }, timeMs: getOptimizationTimeMs(combinedParts.length) });
      
      if (combinedResult?.panels && combinedResult.panels.length === 1) {
        combinedResult.panels[0]._sheetId = targetSheetId;
        targetBrandResult.result.panels[targetSheetIndex] = combinedResult.panels[0];
        placedManualPanelIds.add(mp.id);
      }
    });
    
    return brandResults;
  }, [showPreviewDialog, cabinets, woodGrainsPreferences, sheetWidth, sheetHeight, kerf, manualPanels, deletedPreviewSheets]);

  // Calculate cutting list summary with memoization
  const cuttingListSummary = useMemo((): CuttingListSummary => {
    // ✅ OPTIMIZATION: Show summary immediately without blocking on preferences
    
    const allPanels = cabinets.flatMap(generatePanels);
    console.log('🔍 All Panels with Grain Direction:', allPanels.map(p => ({
      name: p.name,
      width: p.width,
      height: p.height,
      grainDirection: p.grainDirection,
      laminateCode: p.laminateCode
    })));
    
    // Group panels by laminate code
    const panelGroups: PanelGroup[] = [];
    const groupedByLaminate = allPanels.reduce((acc, panel) => {
      const key = panel.laminateCode || 'None';
      if (!acc[key]) acc[key] = [];
      acc[key].push(panel);
      return acc;
    }, {} as Record<string, Panel[]>);

    Object.entries(groupedByLaminate).forEach(([laminateCode, panels]) => {
      const totalArea = panels.reduce((sum, panel) => sum + (panel.width * panel.height / 1000000), 0); // m²
      panelGroups.push({ laminateCode, panels, totalArea });
    });

    const totalPanels = allPanels.length;
    const totalArea = allPanels.reduce((sum, panel) => sum + (panel.width * panel.height / 1000000), 0);

    return { panelGroups, totalPanels, totalArea };
  }, [cabinets, woodGrainsPreferences]);

  // Calculate live material summary
  const liveMaterialSummary = useMemo(() => {
    if (cabinets.length === 0 || !isPreviewActive || !showPreviewDialog) {
      return {
        plywood: {} as Record<string, number>,
        laminates: {} as Record<string, number>,
        totalPlywoodSheets: 0
      };
    }

    const allPanels = cabinets.flatMap(generatePanels);

    // ✅ Sheet Consolidation: A + B + C matching (plywood + front laminate + inner laminate)
    // Group panels based on 3-way matching: ALL must match - Plywood Brand + Front Laminate + Inner Laminate
    const panelsByBrand = allPanels.reduce((acc, panel) => {
      const isBackPanel = panel.name.includes('- Back Panel');
      // A field: Plywood brand
      const brand = isBackPanel 
        ? (panel.A || panel.A || 'Apple ply 6mm BWP')
        : (panel.A || 'Apple Ply 16mm BWP');
      const laminateCode = panel.laminateCode || '';
      
      // Extract B (front) and C (inner) from composed laminateCode
      // Format: "456SF Terra Wood + off white" → B="456SF Terra Wood", C="off white"
      let frontLaminate = '';
      let innerLaminate = '';
      
      if (laminateCode.includes(' + ')) {
        [frontLaminate, innerLaminate] = laminateCode.split(' + ').map(s => s.trim());
      } else {
        frontLaminate = laminateCode.trim();
        innerLaminate = 'off white'; // default
      }
      
      // ✅ CRITICAL: Group key uses A + B + C
      // Panels only consolidate to same sheet when ALL three match exactly
      const groupKey = `${normalizeForGrouping(brand)}|||${normalizeForGrouping(frontLaminate)}|||${normalizeForGrouping(innerLaminate)}`;
      
      if (!acc[groupKey]) acc[groupKey] = { brand, laminateCode, panels: [] };
      acc[groupKey].panels.push(panel);
      return acc;
    }, {} as Record<string, { brand: string; laminateCode: string; panels: typeof allPanels }>);

    const sheet = { w: sheetWidth, h: sheetHeight, kerf: kerf };
    const brandGroups: Array<{ brand: string; laminateCode: string; sheetsCount: number; panelsCount: number; groupKey: string }> = [];

    // Run ACTUAL optimization (not estimates) to get real sheet counts
    Object.entries(panelsByBrand).forEach(([groupKey, group]) => {
      // Use helper function to prepare parts with wood grain logic
      console.group('🔍 MATERIAL SUMMARY - Preparing parts');
      console.log('Group panels:', group.panels.length);
      console.groupEnd();
      
      const rawParts = preparePartsForOptimizer(group.panels, woodGrainsPreferences);
      
      // Remove falsy entries and ensure id is a string (prevents optimizer crashes)
      const parts = rawParts
        .filter((p: any) => Boolean(p))                       // remove undefined/null
        .map((p: any, i: number) => ({ ...p, id: String(p.id ?? p.name ?? `part-${i}`) }));
      
      console.group('🌾 MATERIAL SUMMARY - Optimizer Received');
      console.log('Parts count:', parts.length);
      parts.forEach(p => {
        if (p.name.includes('LEFT')) {
          console.log(`✅ LEFT PANEL: nomW=${p.nomW}, nomH=${p.nomH}, w=${p.w}, h=${p.h}, rotate=${p.rotate}, woodGrainsEnabled=${p.woodGrainsEnabled}`);
        }
      });
      console.groupEnd();
      
      // Use multi-pass optimization for maximum efficiency
      const actualSheets = multiPassOptimize(parts, sheetWidth, sheetHeight);
      
      // Assign stable sheet IDs for deletion tracking
      actualSheets.forEach((sheetData: any, sheetIdx: number) => {
        const sheetId = `${groupKey}-${sheetIdx}`;
        sheetData._sheetId = sheetId;
        sheetData.placed?.forEach((p: any) => { 
          p.grainDirection = group.panels.find(gp => gp.name === p.name)?.grainDirection ?? false; 
          if (p.id && p.id.includes('LEFT')) {
            console.log(`✅ OPTIMIZER OUTPUT - LEFT PANEL: placed at x=${p.x}, y=${p.y}, w=${p.w}, h=${p.h}, rotated=${p.rotated}, rotateAllowed=${p.rotateAllowed}`);
          }
        });
      });
      
      // Count only non-deleted sheets
      const visibleSheetsCount = actualSheets.filter((sheetData: any) => {
        const sheetId = sheetData._sheetId;
        return sheetData.placed && sheetData.placed.length > 0 && !deletedPreviewSheets.has(sheetId);
      }).length;
      
      brandGroups.push({
        brand: group.brand,
        laminateCode: group.laminateCode,
        sheetsCount: visibleSheetsCount,
        panelsCount: group.panels.length, // Count of actual panels (for laminate calculation)
        groupKey: groupKey
      });
    });

    const summary = {
      plywood: {} as Record<string, number>,
      laminates: {} as Record<string, number>,
      totalPlywoodSheets: 0
    };

    brandGroups.forEach((group) => {
      // Add plywood brand to the list (use sheetsCount = optimized plywood sheets)
      if (!summary.plywood[group.brand]) {
        summary.plywood[group.brand] = 0;
      }
      summary.plywood[group.brand] += group.sheetsCount;
      summary.totalPlywoodSheets += group.sheetsCount;

      // Add all laminates to the laminate list (laminate sheets are same size as plywood sheets)
      // Each plywood sheet needs laminate on front face + inner face
      if (group.laminateCode) {
        const laminateParts = group.laminateCode
          .split('+')
          .map(part => part.trim())
          .filter(part => part && !part.match(/^Backer$/i));
        
        console.log(`📊 Laminate Count - Brand: ${group.brand}, Full Code: "${group.laminateCode}"`);
        console.log(`   Plywood sheets (optimized): ${group.sheetsCount}, Panels in sheets: ${group.panelsCount}`);
        console.log(`   Split laminate code into parts:`, laminateParts);
        
        // ✅ CORRECT: Laminate sheets are SAME SIZE as plywood sheets
        // Each plywood sheet needs 1 laminate sheet per face (front + inner)
        laminateParts.forEach(laminateCode => {
          if (!summary.laminates[laminateCode]) {
            summary.laminates[laminateCode] = 0;
          }
          summary.laminates[laminateCode] += group.sheetsCount; // Use sheetsCount (plywood sheets), not panelsCount!
          console.log(`   Added ${group.sheetsCount} laminate sheets for "${laminateCode}" → Total now: ${summary.laminates[laminateCode]}`);
        });
      }
    });

    return summary;
  }, [cabinets, deletedPreviewSheets, showPreviewDialog, optimizePlywoodUsage]);

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

  // Mark memory-loaded and default laminate codes as user-selected on initial mount
  useEffect(() => {
    const memory = loadCabinetFormMemory();
    if (memory.topPanelLaminateCode) {
      markLaminateAsUserSelected('topPanelLaminateCode');
      markLaminateAsUserSelected('bottomPanelLaminateCode');
      markLaminateAsUserSelected('leftPanelLaminateCode');
      markLaminateAsUserSelected('rightPanelLaminateCode');
      markLaminateAsUserSelected('topPanelInnerLaminateCode');
      markLaminateAsUserSelected('bottomPanelInnerLaminateCode');
      markLaminateAsUserSelected('leftPanelInnerLaminateCode');
      markLaminateAsUserSelected('rightPanelInnerLaminateCode');
    }
    if (memory.backPanelLaminateCode) {
      markLaminateAsUserSelected('backPanelLaminateCode');
      markLaminateAsUserSelected('backPanelInnerLaminateCode');
    }
    // Mark default laminate codes as user-selected (off white for all panels)
    markLaminateAsUserSelected('topPanelLaminateCode');
    markLaminateAsUserSelected('bottomPanelLaminateCode');
    markLaminateAsUserSelected('leftPanelLaminateCode');
    markLaminateAsUserSelected('rightPanelLaminateCode');
    markLaminateAsUserSelected('backPanelLaminateCode');
    markLaminateAsUserSelected('topPanelInnerLaminateCode');
    markLaminateAsUserSelected('bottomPanelInnerLaminateCode');
    markLaminateAsUserSelected('leftPanelInnerLaminateCode');
    markLaminateAsUserSelected('rightPanelInnerLaminateCode');
    markLaminateAsUserSelected('backPanelInnerLaminateCode');
    
    // No longer need to refresh display states - using form values directly now
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount

  // Internal function to actually add the cabinet (called directly or after confirmation)
  const performAddCabinet = (cabinet: Cabinet) => {
    console.log('Debug - Cabinet being added:', cabinet);
    console.log('Debug - Cabinet laminate codes:', {
      top: cabinet.topPanelLaminateCode,
      bottom: cabinet.bottomPanelLaminateCode,
      left: cabinet.leftPanelLaminateCode,
      right: cabinet.rightPanelLaminateCode,
      back: cabinet.backPanelLaminateCode
    });
    
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
    
    // Store the cabinet for preview
    setLastAddedCabinet(cabinetWithGaddi);
    
    updateCabinets((prev: Cabinet[]) => [...prev, cabinetWithGaddi]);
    
    // Save cabinet values to memory for next time - ✅ IMPROVED: Save all laminate codes
    saveCabinetFormMemory({
      roomName: cabinet.roomName,
      customRoomName: cabinet.roomName === 'Manual Type' ? cabinet.roomName : undefined,
      height: cabinet.height,
      width: cabinet.width,
      depth: cabinet.depth,
      A: cabinet.A,
      widthReduction: cabinet.widthReduction,
      // ✅ IMPROVED: Store ALL front laminate codes
      topPanelLaminateCode: cabinet.topPanelLaminateCode,
      bottomPanelLaminateCode: cabinet.bottomPanelLaminateCode,
      leftPanelLaminateCode: cabinet.leftPanelLaminateCode,
      rightPanelLaminateCode: cabinet.rightPanelLaminateCode,
      backPanelLaminateCode: cabinet.backPanelLaminateCode,
      shutterLaminateCode: cabinet.shutterLaminateCode,
      centerPostLaminateCode: cabinet.centerPostLaminateCode,
      shelvesLaminateCode: cabinet.shelvesLaminateCode,
      // ✅ IMPROVED: Store ALL inner laminate codes
      topPanelInnerLaminateCode: cabinet.topPanelInnerLaminateCode,
      bottomPanelInnerLaminateCode: cabinet.bottomPanelInnerLaminateCode,
      leftPanelInnerLaminateCode: cabinet.leftPanelInnerLaminateCode,
      rightPanelInnerLaminateCode: cabinet.rightPanelInnerLaminateCode,
      backPanelInnerLaminateCode: cabinet.backPanelInnerLaminateCode,
      shutterInnerLaminateCode: cabinet.shutterInnerLaminateCode,
      centerPostInnerLaminateCode: cabinet.centerPostInnerLaminateCode,
      shelvesInnerLaminateCode: cabinet.shelvesInnerLaminateCode
    });
    
    // Clear user-laminate tracking for next cabinet
    clearUserLaminateTracking();
    
    // Reset form with saved memory values
    const memory = loadCabinetFormMemory();
    const shutterMemoryNew = loadShutterFormMemory(); // ✅ LOAD shutter memory for form reset
    
    // ✅ DIRECT LINK: Compute grain directions from memory laminate codes using database preferences
    const topCode = (memory.topPanelLaminateCode || '').split('+')[0].trim();
    const backCode = (memory.backPanelLaminateCode || '').split('+')[0].trim();
    const hasTopWoodGrain = !!(topCode && woodGrainsPreferences[topCode] === true);
    const hasBackWoodGrain = !!(backCode && woodGrainsPreferences[backCode] === true);
    
    form.reset({
      id: crypto.randomUUID(),
      name: `Shutter #${cabinets.length + 2}`,
      type: 'single',
      roomName: memory.roomName,
      height: memory.height ?? 800,
      width: memory.width ?? 600,
      depth: memory.depth ?? 450,
      centerPostEnabled: false,
      centerPostQuantity: 1,
      centerPostHeight: (memory.height ?? 800) - 36,
      centerPostDepth: (memory.depth ?? 450) - 20,
      centerPostLaminateCode: '',
      shelvesQuantity: 1,
      shelvesEnabled: false,
      shelvesLaminateCode: '',
      widthReduction: memory.widthReduction ?? 36,

      shuttersEnabled: false,
      shutterCount: 1,
      shutterType: 'Standard',
      shutterHeightReduction: 0,
      shutterWidthReduction: 0,
      shutters: [],
      shutterLaminateCode: shutterMemoryNew.shutterLaminateCode ?? '', // ✅ RESTORE from memory
      shutterInnerLaminateCode: shutterMemoryNew.shutterInnerLaminateCode ?? '', // ✅ RESTORE from memory
      shutterGaddi: false, // ✅ FIX: Initialize Basic mode fields
      configurationMode: 'advanced', // ✅ FIX: Reset to Advanced mode after adding
      // ✅ IMPROVED: Restore ALL laminate codes from memory
      topPanelLaminateCode: memory.topPanelLaminateCode ?? 'off white',
      bottomPanelLaminateCode: memory.bottomPanelLaminateCode ?? 'off white',
      leftPanelLaminateCode: memory.leftPanelLaminateCode ?? 'off white',
      rightPanelLaminateCode: memory.rightPanelLaminateCode ?? 'off white',
      backPanelLaminateCode: memory.backPanelLaminateCode ?? 'off white',
      topPanelInnerLaminateCode: memory.topPanelInnerLaminateCode ?? 'off white',
      bottomPanelInnerLaminateCode: memory.bottomPanelInnerLaminateCode ?? 'off white',
      leftPanelInnerLaminateCode: memory.leftPanelInnerLaminateCode ?? 'off white',
      rightPanelInnerLaminateCode: memory.rightPanelInnerLaminateCode ?? 'off white',
      backPanelInnerLaminateCode: memory.backPanelInnerLaminateCode ?? 'off white',
      innerLaminateCode: 'off white',
      A: memory.A ?? 'Apple Ply 16mm BWP',
      // ✅ DIRECT LINK: Initialize grain directions from database preferences, not hardcoded false
      topPanelGrainDirection: hasTopWoodGrain,
      bottomPanelGrainDirection: hasTopWoodGrain,
      leftPanelGrainDirection: hasTopWoodGrain,
      rightPanelGrainDirection: hasTopWoodGrain,
      backPanelGrainDirection: hasBackWoodGrain,
      shutterGrainDirection: false // Shutters don't use memory, so default to false
    });
    
    // Restore laminate codes from memory - populate form values AND mark as user-selected
    if (memory.topPanelLaminateCode) {
      updateLaminateWithTracking('topPanelLaminateCode', memory.topPanelLaminateCode, 'user');
      updateLaminateWithTracking('bottomPanelLaminateCode', memory.topPanelLaminateCode, 'user');
      updateLaminateWithTracking('leftPanelLaminateCode', memory.topPanelLaminateCode, 'user');
      updateLaminateWithTracking('rightPanelLaminateCode', memory.topPanelLaminateCode, 'user');
      // Also populate and mark all Inner Laminates as user-selected
      updateLaminateWithTracking('topPanelInnerLaminateCode', 'off white', 'user');
      updateLaminateWithTracking('bottomPanelInnerLaminateCode', 'off white', 'user');
      updateLaminateWithTracking('leftPanelInnerLaminateCode', 'off white', 'user');
      updateLaminateWithTracking('rightPanelInnerLaminateCode', 'off white', 'user');
    }
    if (memory.backPanelLaminateCode) {
      updateLaminateWithTracking('backPanelLaminateCode', memory.backPanelLaminateCode, 'user');
      updateLaminateWithTracking('backPanelInnerLaminateCode', 'off white', 'user');
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
      // Add defaults for inner laminate codes
      topPanelInnerLaminateCode: cabinet.topPanelInnerLaminateCode ?? 'off white',
      bottomPanelInnerLaminateCode: cabinet.bottomPanelInnerLaminateCode ?? 'off white',
      leftPanelInnerLaminateCode: cabinet.leftPanelInnerLaminateCode ?? 'off white',
      rightPanelInnerLaminateCode: cabinet.rightPanelInnerLaminateCode ?? 'off white',
      backPanelInnerLaminateCode: cabinet.backPanelInnerLaminateCode ?? 'off white',
      shutterLaminateCode: cabinet.shutterLaminateCode ?? '',
      shutters: cabinet.shutters ?? [],
      innerLaminateCode: cabinet.innerLaminateCode ?? 'off white',
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
    // ✅ FIX: Use the UI state (cabinetConfigMode) instead of form value to ensure correct mode detection
    // This ensures Basic mode validation works even if form submission doesn't include configurationMode
    const mode = cabinetConfigMode;
    cabinet = { ...cabinet, configurationMode: mode };
    
    // ✅ APPLY DEFAULTS: Ensure all laminate codes have values before validation
    if (!cabinet.topPanelLaminateCode?.trim()) cabinet.topPanelLaminateCode = 'off white';
    if (!cabinet.bottomPanelLaminateCode?.trim()) cabinet.bottomPanelLaminateCode = 'off white';
    if (!cabinet.leftPanelLaminateCode?.trim()) cabinet.leftPanelLaminateCode = 'off white';
    if (!cabinet.rightPanelLaminateCode?.trim()) cabinet.rightPanelLaminateCode = 'off white';
    if (!cabinet.backPanelLaminateCode?.trim()) cabinet.backPanelLaminateCode = 'off white';
    if (!cabinet.topPanelInnerLaminateCode?.trim()) cabinet.topPanelInnerLaminateCode = 'off white';
    if (!cabinet.bottomPanelInnerLaminateCode?.trim()) cabinet.bottomPanelInnerLaminateCode = 'off white';
    if (!cabinet.leftPanelInnerLaminateCode?.trim()) cabinet.leftPanelInnerLaminateCode = 'off white';
    if (!cabinet.rightPanelInnerLaminateCode?.trim()) cabinet.rightPanelInnerLaminateCode = 'off white';
    if (!cabinet.backPanelInnerLaminateCode?.trim()) cabinet.backPanelInnerLaminateCode = 'off white';
    
    // ✅ AUTO-MARK LAMINATE FIELDS: Build updated tracking set BEFORE validation
    // This prevents false warnings for auto-populated fields from Master Settings
    const updatedTracking = new Set(userSelectedLaminates);
    
    if (mode === 'basic') {
      // Basic mode: Check shutter laminate
      if (cabinet.shutterLaminateCode && cabinet.shutterLaminateCode.trim()) {
        updatedTracking.add('shutterLaminateCode');
      }
    } else {
      // Advanced mode: Check all panel laminates
      const panelFields = [
        { frontCode: cabinet.topPanelLaminateCode, innerCode: cabinet.topPanelInnerLaminateCode, frontField: 'topPanelLaminateCode', innerField: 'topPanelInnerLaminateCode' },
        { frontCode: cabinet.bottomPanelLaminateCode, innerCode: cabinet.bottomPanelInnerLaminateCode, frontField: 'bottomPanelLaminateCode', innerField: 'bottomPanelInnerLaminateCode' },
        { frontCode: cabinet.leftPanelLaminateCode, innerCode: cabinet.leftPanelInnerLaminateCode, frontField: 'leftPanelLaminateCode', innerField: 'leftPanelInnerLaminateCode' },
        { frontCode: cabinet.rightPanelLaminateCode, innerCode: cabinet.rightPanelInnerLaminateCode, frontField: 'rightPanelLaminateCode', innerField: 'rightPanelInnerLaminateCode' },
        { frontCode: cabinet.backPanelLaminateCode, innerCode: cabinet.backPanelInnerLaminateCode, frontField: 'backPanelLaminateCode', innerField: 'backPanelInnerLaminateCode' }
      ];
      
      for (const panel of panelFields) {
        if (panel.frontCode && panel.frontCode.trim()) {
          updatedTracking.add(panel.frontField);
        }
        if (panel.innerCode && panel.innerCode.trim()) {
          updatedTracking.add(panel.innerField);
        }
      }
    }
    
    // CRITICAL: Validate using updated tracking set to avoid false warnings
    // (collectMissingLaminateDetails checks both value AND userSelectedLaminates)
    const laminateCheck = collectMissingLaminateDetailsWithTracking(cabinet, mode, updatedTracking);

    console.log('📋 Validation Result:', {
      needsConfirmation: laminateCheck.needsConfirmation,
      missingCount: laminateCheck.details.length,
      messages: laminateCheck.formattedMessages
    });

    if (laminateCheck.needsConfirmation) {
      console.log('❌ Validation FAILED - Showing dialog');
      // Show error dialog - block adding cabinet
      setPendingMaterialAction({
        type: 'cabinet',
        payload: cabinet,
        missingPanels: laminateCheck.formattedMessages,
        onConfirm: () => {
          // No "Add Anyway" option - user must fix missing laminates
          setShowMaterialConfirmDialog(false);
          setPendingMaterialAction(null);
        }
      });
      setShowMaterialConfirmDialog(true);
      return; // Abort - don't add cabinet
    }
    
    console.log('✅ Validation PASSED - Adding cabinet');
    
    // ✅ PERSIST UPDATED TRACKING: Auto-marked fields are now confirmed
    setUserSelectedLaminates(updatedTracking);
    
    // Save shutter memory for Quick Shutter mode auto-fill
    if (mode === 'basic' && (cabinet.A || cabinet.shutterLaminateCode || cabinet.shutterInnerLaminateCode)) {
      saveShutterFormMemory({
        A: cabinet.A,
        shutterLaminateCode: cabinet.shutterLaminateCode,
        shutterInnerLaminateCode: cabinet.shutterInnerLaminateCode
      });
    }
    
    // Save cabinet memory for Advanced mode auto-fill (ALL panel laminate codes)
    if (mode === 'advanced' && (cabinet.A || cabinet.topPanelLaminateCode)) {
      saveCabinetFormMemory({
        A: cabinet.A,
        topPanelLaminateCode: cabinet.topPanelLaminateCode,
        bottomPanelLaminateCode: cabinet.bottomPanelLaminateCode,
        leftPanelLaminateCode: cabinet.leftPanelLaminateCode,
        rightPanelLaminateCode: cabinet.rightPanelLaminateCode,
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
    const shutterMemory = loadShutterFormMemory();
    const cabinetMemory = loadCabinetFormMemory();
    
    form.reset({
      id: crypto.randomUUID(),
      name: `Shutter #${cabinets.length + 2}`,
      type: 'single',
      height: cabinetMemory.height ?? 800,  // ✅ Restore height from memory
      width: cabinetMemory.width ?? 600,    // ✅ Restore width from memory
      depth: cabinetMemory.depth ?? 450,
      centerPostEnabled: false,
      centerPostQuantity: 1,
      centerPostHeight: 764,
      centerPostDepth: 430,
      centerPostLaminateCode: '',
      shelvesQuantity: 1,
      shelvesEnabled: false,
      shelvesLaminateCode: '',
      widthReduction: cabinetMemory.widthReduction ?? 36,
      shuttersEnabled: false,
      shutterCount: 1,
      shutterType: 'Standard',
      shutterHeightReduction: 0,
      shutterWidthReduction: 0,
      shutters: [],
      shutterLaminateCode: shutterMemory?.shutterLaminateCode || '',  // ✅ Keep laminate code
      shutterInnerLaminateCode: shutterMemory?.shutterInnerLaminateCode || '',  // ✅ Keep inner laminate
      A: cabinetMemory.A ?? 'Apple Ply 16mm BWP',
      topPanelLaminateCode: cabinetMemory.topPanelLaminateCode ?? '',
      bottomPanelLaminateCode: cabinetMemory.bottomPanelLaminateCode ?? cabinetMemory.topPanelLaminateCode ?? '',
      leftPanelLaminateCode: cabinetMemory.leftPanelLaminateCode ?? cabinetMemory.topPanelLaminateCode ?? '',
      rightPanelLaminateCode: cabinetMemory.rightPanelLaminateCode ?? cabinetMemory.topPanelLaminateCode ?? '',
      backPanelLaminateCode: cabinetMemory.backPanelLaminateCode ?? '',
      topPanelInnerLaminateCode: 'off white',
      bottomPanelInnerLaminateCode: 'off white',
      leftPanelInnerLaminateCode: 'off white',
      rightPanelInnerLaminateCode: 'off white',
      backPanelInnerLaminateCode: 'off white',
      innerLaminateCode: 'off white',
      topPanelGrainDirection: false,
      bottomPanelGrainDirection: false,
      leftPanelGrainDirection: false,
      rightPanelGrainDirection: false,
      backPanelGrainDirection: false,
      shutterGrainDirection: false,
      shutterGaddi: false
    });
  };

  // Add quick cabinet
  const addQuickCabinet = (type: CabinetType) => {
    const config = cabinetConfigs[type];
    const cabinetMemory = loadCabinetFormMemory(); // ✅ FIX: Load stored memory like regular form does
    
    for (let i = 0; i < config.quantity; i++) {
      const baseCabinet: Cabinet = {
        id: crypto.randomUUID(),
        name: `${cabinetTypes.find(t => t.value === type)?.label} #${cabinets.length + i + 1}`,
        type,
        height: config.height,
        width: config.width,
        depth: 450,
        centerPostEnabled: false,
        centerPostQuantity: 1,
        centerPostHeight: 764,
        centerPostDepth: 430,
        centerPostLaminateCode: '',
        shelvesQuantity: 1,
        shelvesEnabled: false,
        shelvesLaminateCode: '',
        widthReduction: 36,
        shuttersEnabled: false,
        shutterCount: config.shutterQuantity,
        shutterType: 'Standard',
        shutterHeightReduction: 0,
        shutterWidthReduction: 0,
        shutters: calculateShutterDimensions({
          ...form.getValues(),
          height: config.height,
          width: config.width,
          shutterCount: config.shutterQuantity
        }),
        // ✅ IMPROVED: Restore ALL laminate codes from memory for quick cabinets
        topPanelLaminateCode: cabinetMemory.topPanelLaminateCode ?? '',
        bottomPanelLaminateCode: cabinetMemory.bottomPanelLaminateCode ?? '',
        leftPanelLaminateCode: cabinetMemory.leftPanelLaminateCode ?? '',
        rightPanelLaminateCode: cabinetMemory.rightPanelLaminateCode ?? '',
        backPanelLaminateCode: cabinetMemory.backPanelLaminateCode ?? '',
        shutterLaminateCode: cabinetMemory.shutterLaminateCode ?? '',
        topPanelInnerLaminateCode: cabinetMemory.topPanelInnerLaminateCode ?? 'off white',
        bottomPanelInnerLaminateCode: cabinetMemory.bottomPanelInnerLaminateCode ?? 'off white',
        leftPanelInnerLaminateCode: cabinetMemory.leftPanelInnerLaminateCode ?? 'off white',
        rightPanelInnerLaminateCode: cabinetMemory.rightPanelInnerLaminateCode ?? 'off white',
        backPanelInnerLaminateCode: cabinetMemory.backPanelInnerLaminateCode ?? 'off white',
        centerPostInnerLaminateCode: cabinetMemory.centerPostInnerLaminateCode ?? 'off white',
        shelvesInnerLaminateCode: cabinetMemory.shelvesInnerLaminateCode ?? 'off white',
        innerLaminateCode: 'off white',
        A: cabinetMemory.A ?? 'Apple Ply 16mm BWP',
        shutterInnerLaminateCode: cabinetMemory.shutterInnerLaminateCode ?? '',
        backPanelWidthReduction: 0,
        backPanelHeightReduction: 0,
        topPanelGrainDirection: false,
        bottomPanelGrainDirection: false,
        leftPanelGrainDirection: false,
        rightPanelGrainDirection: false,
        backPanelGrainDirection: false,
        shutterGrainDirection: false,
        shutterGaddi: false
      };
      
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

  // Filter laminate codes (no type filtering needed - system now uses laminate codes only)
  const getFilteredLaminateCodes = (selectedType: string) => {
    console.log('Getting laminate codes (type filtering removed)');
    console.log('Available laminate codes:', laminateCodes);
    return laminateCodes;
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
      const laminateGroups = new Map<string, Map<string, {count: number, panels: string[], thickness: number}>>();
      
      
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
          dimensionMap.set(dimensionKey, {count: 0, panels: [], thickness});
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
          let A = 'Apple Ply 16mm BWP';
          if (isBackPanel && relatedCabinets.length > 0) {
            // Use back panel plywood brand directly
            A = relatedCabinets[0]?.A || 'Apple ply 6mm BWP';
          } else if (quickShutterCabinet) {
            // Use Quick Shutter plywood type if available
            A = quickShutterCabinet.A || 'Apple Ply 16mm BWP';
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
            'Plywood Brand': A,
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

      // Generate PDF
      const allPanels = cabinets.flatMap(generatePanels);
      // ✅ Sheet Consolidation: A + B + C matching for PDF export
      const panelsByBrand = allPanels.reduce((acc, panel) => {
        const isBackPanel = panel.name.includes('- Back Panel');
        // A field: Plywood brand
        const brand = isBackPanel 
          ? (panel.A || panel.A || 'Apple ply 6mm BWP')
          : (panel.A || 'Apple Ply 16mm BWP');
        const laminateCode = panel.laminateCode || '';
        
        // Extract B (front) and C (inner) from composed laminateCode
        // Format: "456SF Terra Wood + off white" → B="456SF Terra Wood", C="off white"
        let frontLaminate = '';
        let innerLaminate = '';
        
        if (laminateCode.includes(' + ')) {
          [frontLaminate, innerLaminate] = laminateCode.split(' + ').map(s => s.trim());
        } else {
          frontLaminate = laminateCode.trim();
          innerLaminate = 'off white'; // default
        }
        
        // ✅ CRITICAL: Group key uses A + B + C
        // Panels only consolidate to same sheet when ALL three match exactly
        const groupKey = `${normalizeForGrouping(brand)}|||${normalizeForGrouping(frontLaminate)}|||${normalizeForGrouping(innerLaminate)}`;
        
        if (!acc[groupKey]) {
          acc[groupKey] = { 
            brand, 
            laminateCode,
            panels: [] 
          };
        }
        acc[groupKey].panels.push(panel);
        return acc;
      }, {} as Record<string, { brand: string; laminateCode: string; panels: typeof allPanels }>);

      const sheet = { w: sheetWidth, h: sheetHeight, kerf: kerf };
      const brandResults: any[] = [];

      Object.entries(panelsByBrand).forEach(([groupKey, group]) => {
        // Use helper function to prepare parts with wood grain logic
        console.group('🔍 PDF EXPORT - Preparing parts');
        console.log('Group panels:', group.panels.length);
        console.groupEnd();
        
        const rawParts = preparePartsForOptimizer(group.panels, woodGrainsPreferences);
        
        // Remove falsy entries and ensure id is a string (prevents optimizer crashes)
        const parts = rawParts
          .filter((p: any) => Boolean(p))                       // remove undefined/null
          .map((p: any, i: number) => ({ ...p, id: String(p.id ?? p.name ?? `part-${i}`) }));
        
        console.log('🌾 Optimizer received parts (first 10):', parts.slice(0, 10));
        
        // Use multi-pass optimization for maximum efficiency
        const optimizedPanels = multiPassOptimize(parts, sheetWidth, sheetHeight);
        const result = { panels: optimizedPanels };
        
        if (result && result.panels.length > 0) {
          const laminateDisplay = group.laminateCode || 'None';
          const isBackPanel = group.panels.some(p => p.name.includes('- Back Panel'));
          
          brandResults.push({
            brand: group.brand,
            laminateCode: group.laminateCode,
            laminateDisplay,
            result,
            isBackPanel
          });
        }
      });

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

      setShowSaveConfirmDialog(false);
      
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

  const addLaminateCode = () => {
    const newCode: LaminateCode = {
      id: crypto.randomUUID(),
      code: `LM-${String(laminateCodes.length + 1).padStart(3, '0')}`,
      name: 'New Laminate',
      supplier: '',
      thickness: 0.8,
      color: ''
    };
    setLaminateCodes(prev => [...prev, newCode]);
  };

  const updateLaminateCode = (id: string, field: keyof LaminateCode, value: string | number) => {
    setLaminateCodes(prev => prev.map(code => 
      code.id === id ? { ...code, [field]: value } : code
    ));
  };

  const removeLaminateCode = (id: string) => {
    setLaminateCodes(prev => prev.filter(code => code.id !== id));
    toast({
      title: "Laminate Code Removed",
      description: "Laminate code has been removed from the list."
    });
  };

  const exportLaminateCodesToCSV = () => {
    const csvContent = [
      'Code,Name,Supplier,Thickness,Color',
      ...laminateCodes.map(code => 
        `${code.code},${code.name},${code.supplier || ''},${code.thickness || ''},${code.color || ''}`
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'laminate-codes.csv';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

    toast({
      title: "Export Successful",
      description: "Laminate codes exported to CSV file."
    });
  };

  const importLaminateCodesFromCSV = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const csvContent = e.target?.result as string;
      const lines = csvContent.split('\n');
      const headers = lines[0].split(',');
      
      const newCodes: LaminateCode[] = [];
      for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim()) {
          const values = lines[i].split(',');
          const code = values[0]?.trim();
          const name = values[1]?.trim();
          const supplier = values[2]?.trim();
          const thickness = parseFloat(values[3]) || 0.8;
          const color = values[4]?.trim();
          
          if (code && name) {
            newCodes.push({
              id: crypto.randomUUID(),
              code, name, supplier, thickness, color
            });
          }
        }
      }
      
      setLaminateCodes(newCodes);
      toast({
        title: "Import Successful",
        description: `Imported ${newCodes.length} laminate codes from CSV.`
      });
    };
    
    reader.readAsText(file);
    event.target.value = '';
  };

  const importLaminateCodesFromExcel = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        const newCodes: LaminateCode[] = [];
        
        // Skip header row (index 0)
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i] as any[];
          if (row && row.length > 0) {
            const code = row[0]?.toString().trim();
            const name = row[1]?.toString().trim();
            const supplier = row[2]?.toString().trim() || '';
            const thickness = parseFloat(row[3]) || 0.8;
            const color = row[4]?.toString().trim() || '';
            
            if (code && name) {
              newCodes.push({
                id: crypto.randomUUID(),
                code, name, supplier, thickness, color
              });
            }
          }
        }
        
        setLaminateCodes(newCodes);
        toast({
          title: "Excel Import Successful",
          description: `Imported ${newCodes.length} laminate codes from Excel file.`
        });
      } catch (error) {
        toast({
          title: "Import Failed",
          description: "Failed to read Excel file. Please check the file format.",
          variant: "destructive"
        });
      }
    };
    
    reader.readAsArrayBuffer(file);
    event.target.value = '';
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
                    <i className={`fas ${quotationDetailsVisible ? 'fa-eye-slash' : 'fa-eye'} text-gray-600`}></i>
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
                    <i className="fas fa-crown mr-2 text-amber-500"></i>
                    Master Settings
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setMasterSettingsVisible(!masterSettingsVisible)}
                    className="h-8 w-8 p-0"
                    data-testid="button-toggle-master-settings"
                  >
                    <i className={`fas ${masterSettingsVisible ? 'fa-eye-slash' : 'fa-eye'} text-gray-600`}></i>
                  </Button>
                </CardTitle>
              </CardHeader>
              {masterSettingsVisible && (
                <CardContent>
                  <div className="space-y-4">
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                      <p className="text-xs text-amber-800">
                        <i className="fas fa-info-circle mr-1"></i>
                        Master settings automatically update ALL cabinets and Quick Shutters
                      </p>
                    </div>

                    {/* Row 1: Plywood Brand */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Plywood Brand</Label>
                      <Select 
                        value={masterPlywoodBrand} 
                        onValueChange={(value) => {
                          setMasterPlywoodBrand(value);
                          updateAllCabinetsPlywood(value);
                        }}
                        data-testid="select-master-plywood"
                      >
                        <SelectTrigger className="text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {plywoodBrandMemoryData.map((brand: PlywoodBrandMemory) => (
                            <SelectItem key={brand.id} value={brand.brand}>
                              {brand.brand}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="text"
                        value={masterCustomPlywoodInput}
                        onChange={(e) => setMasterCustomPlywoodInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && masterCustomPlywoodInput.trim()) {
                            e.preventDefault();
                            const newBrand = masterCustomPlywoodInput.trim();
                            
                            // Check if brand already exists
                            const exists = plywoodBrandMemoryData.some(
                              (b: PlywoodBrandMemory) => b.brand.toLowerCase() === newBrand.toLowerCase()
                            );
                            
                            if (!exists) {
                              // Save new brand to memory
                              savePlywoodBrandMutation.mutate(newBrand);
                            }
                            
                            // Update master setting and all cabinets
                            setMasterPlywoodBrand(newBrand);
                            updateAllCabinetsPlywood(newBrand);
                            setMasterCustomPlywoodInput('');
                          }
                        }}
                        placeholder="Type custom plywood brand"
                        className="text-xs"
                        data-testid="input-master-custom-plywood"
                      />
                    </div>

                    {/* Row 2: Laminate with Wood Grains button */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Laminate</Label>
                      <div className="flex gap-2 items-start">
                        <div className="flex-1 space-y-2">
                          <div className="relative">
                            <Input
                              ref={masterLaminateInputRef}
                              type="text"
                              value={masterLaminateCode || masterCustomLaminateInput}
                              onChange={async (e) => {
                                const inputValue = e.target.value;
                                const inputElement = masterLaminateInputRef.current;
                                
                                setMasterCustomLaminateInput(inputValue);
                                
                                if (!inputElement || !inputValue.trim()) {
                                  return;
                                }
                                
                                // Find first matching code
                                const matchingCode = globalLaminateMemory.find(code => 
                                  code.toLowerCase().startsWith(inputValue.trim().toLowerCase())
                                );
                                
                                if (matchingCode) {
                                  // Set full suggestion
                                  setMasterCustomLaminateInput(matchingCode);
                                  // Highlight the auto-filled portion
                                  setTimeout(() => {
                                    inputElement.setSelectionRange(inputValue.length, matchingCode.length);
                                  }, 0);
                                }
                              }}
                              onKeyDown={async (e) => {
                                if (e.key === 'Tab' && masterCustomLaminateInput.trim()) {
                                  // Accept the autofill suggestion
                                  e.preventDefault();
                                  const inputElement = masterLaminateInputRef.current;
                                  if (inputElement) {
                                    inputElement.setSelectionRange(
                                      masterCustomLaminateInput.length,
                                      masterCustomLaminateInput.length
                                    );
                                  }
                                } else if (e.key === 'Enter' && masterCustomLaminateInput.trim()) {
                                  e.preventDefault();
                                  const codeToSave = masterCustomLaminateInput.trim();
                                  
                                  // Save to database if new
                                  if (!globalLaminateMemory.includes(codeToSave)) {
                                    saveLaminateCodeMutation.mutate(codeToSave);
                                  }
                                  
                                  // Set as selected code (but don't apply to all panels)
                                  setMasterLaminateCode(codeToSave);
                                  
                                  // ✅ CRITICAL FIX: Mark current form panel laminates as user-selected
                                  // This ensures validation passes when adding the cabinet
                                  updateLaminateWithTracking('topPanelLaminateCode', codeToSave, 'user');
                                  updateLaminateWithTracking('bottomPanelLaminateCode', codeToSave, 'user');
                                  updateLaminateWithTracking('leftPanelLaminateCode', codeToSave, 'user');
                                  updateLaminateWithTracking('rightPanelLaminateCode', codeToSave, 'user');
                                  updateLaminateWithTracking('backPanelLaminateCode', codeToSave, 'user');
                                  
                                  // ✅ REMOVED: Old auto-load wood grains preference logic - handled by DIRECT LINK system
                                  
                                  // Clear input
                                  setMasterCustomLaminateInput('');
                                  
                                  // ✅ Close dropdown after saving new code
                                  if (masterLaminateDropdownRef.current) {
                                    masterLaminateDropdownRef.current.open = false;
                                  }
                                } else if (e.key === 'Escape') {
                                  // Clear field
                                  setMasterCustomLaminateInput('');
                                  setMasterLaminateCode('');
                                  
                                  // ✅ Close dropdown after Escape
                                  if (masterLaminateDropdownRef.current) {
                                    masterLaminateDropdownRef.current.open = false;
                                  }
                                }
                              }}
                              onFocus={() => {
                                // Clear code when focusing to type new one
                                if (masterLaminateCode && !masterCustomLaminateInput) {
                                  setMasterLaminateCode('');
                                }
                              }}
                              placeholder="Type front laminate code"
                              className="text-sm"
                              data-testid="input-master-laminate-code"
                            />
                            {masterLaminateCode && !masterCustomLaminateInput && (
                              <button
                                onClick={() => {
                                  setMasterLaminateCode('');
                                  masterLaminateInputRef.current?.focus();
                                }}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                title="Clear selection"
                              >
                                ×
                              </button>
                            )}
                          </div>
                          
                          {/* Hint for adding new codes */}
                          {masterCustomLaminateInput && masterCustomLaminateInput.length >= 3 && !globalLaminateMemory.includes(masterCustomLaminateInput) && (
                            <div className="text-xs text-green-600 mt-1 font-medium">
                              ↵ Press Enter to save "{masterCustomLaminateInput}"
                            </div>
                          )}
                          
                          {/* Saved Codes with Select and Delete */}
                          {globalLaminateMemory.length > 0 && (
                            <details className="mt-2" open ref={masterLaminateDropdownRef}>
                              <summary className="text-xs text-gray-600 cursor-pointer hover:text-gray-800 font-semibold">
                                ▼ Manage Saved Codes ({globalLaminateMemory.length})
                              </summary>
                              <div className="mt-2 max-h-40 overflow-y-auto border border-gray-200 rounded-md bg-white">
                                {globalLaminateMemory.map((code, index) => (
                                  <div 
                                    key={index} 
                                    className={`flex items-center justify-between px-2 py-1.5 text-xs border-b border-gray-100 last:border-0 ${
                                      masterLaminateCode === code 
                                        ? 'bg-blue-100 hover:bg-blue-150' 
                                        : 'hover:bg-gray-50 cursor-pointer'
                                    }`}
                                  >
                                    <span 
                                      className="flex-1 cursor-pointer font-medium"
                                      onClick={async () => {
                                        // Select this code
                                        setMasterLaminateCode(code);
                                        setMasterCustomLaminateInput('');
                                        
                                        // ✅ Close dropdown after selecting a code
                                        if (masterLaminateDropdownRef.current) {
                                          masterLaminateDropdownRef.current.open = false;
                                        }
                                        
                                        // ✅ CRITICAL FIX: Mark current form panel laminates as user-selected
                                        // This ensures validation passes when adding the cabinet
                                        updateLaminateWithTracking('topPanelLaminateCode', code, 'user');
                                        updateLaminateWithTracking('bottomPanelLaminateCode', code, 'user');
                                        updateLaminateWithTracking('leftPanelLaminateCode', code, 'user');
                                        updateLaminateWithTracking('rightPanelLaminateCode', code, 'user');
                                        updateLaminateWithTracking('backPanelLaminateCode', code, 'user');
                                        
                                        // ✅ REMOVED: Old masterWoodGrains toggle logic - system now uses DIRECT LINK to database
                                        // Wood grain preferences are handled automatically by the auto-update useEffect
                                      }}
                                      title={`Click to select: ${code}`}
                                    >
                                      {masterLaminateCode === code && '✓ '}{code}
                                    </span>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        deleteGlobalLaminateOption(code);
                                      }}
                                      className="text-red-500 hover:text-red-700 px-2 ml-2"
                                      title="Delete laminate code"
                                      data-testid={`button-delete-laminate-${index}`}
                                    >
                                      ×
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </details>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Optimize Plywood Usage Section */}
                    <div className="mt-6 pt-4 border-t border-gray-200">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <Label className="text-sm font-medium text-gray-700 mb-1 block">
                            Optimize Plywood Usage
                          </Label>
                          <p className="text-xs text-gray-500 leading-relaxed">
                            Panels are grouped only when ALL materials match: Plywood Brand + Front Laminate + Inner Laminate. 
                            This ensures consistent material quality on each sheet.
                          </p>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setOptimizePlywoodUsage(!optimizePlywoodUsage)}
                          className={`h-9 px-4 text-sm whitespace-nowrap ${optimizePlywoodUsage ? 'bg-green-100 border-green-400 text-green-700' : ''}`}
                          data-testid="button-optimize-plywood"
                        >
                          {optimizePlywoodUsage ? 'ON' : 'OFF'}
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
                          <Label className="text-xs text-slate-600">Kerf (mm)</Label>
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
                            globalLaminateMemory.map((code) => {
                              const isEnabled = woodGrainsPreferences[code] === true;
                              return (
                                <div
                                  key={code}
                                  className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                  <div className="flex items-center gap-3">
                                    <i className={`fas fa-layer-group ${isEnabled ? 'text-green-500' : 'text-gray-400'}`}></i>
                                    <div>
                                      <div className="font-medium text-sm">{code}</div>
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
                    <i className={`fas ${projectDetailsVisible ? 'fa-eye-slash' : 'fa-eye'} text-gray-600`}></i>
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
            <Card ref={cabinetSectionRef} className="bg-white border-gray-200 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-gray-900">
                  <div className="flex items-center">
                    <i className="fas fa-drafting-compass mr-2 text-blue-400"></i>
                    Cabinet with Shutter
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setCabinetConfigVisible(!cabinetConfigVisible)}
                    className="h-8 w-8 p-0"
                  >
                    <i className={`fas ${cabinetConfigVisible ? 'fa-eye-slash' : 'fa-eye'} text-slate-600`}></i>
                  </Button>
                </CardTitle>
              </CardHeader>
              {cabinetConfigVisible && (
                <CardContent>
                  {/* Mode Toggle */}
                  <Tabs value={cabinetConfigMode} onValueChange={(value) => {
                    setCabinetConfigMode(value as 'basic' | 'advanced');
                    form.setValue('configurationMode', value as 'basic' | 'advanced');
                  }} className="mb-6">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger 
                        value="basic" 
                        className="text-sm data-[state=active]:bg-blue-500 data-[state=active]:text-white"
                      >
                        <i className="fas fa-lightning mr-2"></i>
                        Basic (Quick Shutter)
                      </TabsTrigger>
                      <TabsTrigger 
                        value="advanced" 
                        className="text-sm data-[state=active]:bg-green-500 data-[state=active]:text-white"
                      >
                        <i className="fas fa-drafting-compass mr-2"></i>
                        Advanced (Full Cabinet)
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>

                  {/* Plywood and Laminates Collapsible Section */}
                  <Collapsible open={plywoodLaminatesOpen} onOpenChange={setPlywoodLaminatesOpen} className="mb-6">
                    <CollapsibleTrigger asChild>
                      <Button
                        ref={plywoodLaminatesRef}
                        variant="outline"
                        className="w-full justify-between text-sm font-medium"
                        type="button"
                      >
                        <span className="flex items-center">
                          <i className="fas fa-layer-group mr-2 text-blue-500"></i>
                          Plywood and Laminates
                        </span>
                        <i className={`fas ${plywoodLaminatesOpen ? 'fa-chevron-down' : 'fa-chevron-right'} text-gray-400`}></i>
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-4 space-y-4 border-l-2 border-blue-200 pl-4">
                      {/* BASIC MODE: Quick Shutter Fields */}
                      {cabinetConfigMode === 'basic' && (
                        <div className="space-y-4 p-3 bg-blue-50 rounded-md border border-blue-100">
                          <div className="text-sm font-semibold text-blue-900 flex items-center gap-2">
                            <i className="fas fa-lightning text-blue-500"></i>
                            Quick Shutter Materials
                          </div>
                          
                          {/* Shutter Plywood Brand */}
                          <div className="space-y-2">
                            <Label>Shutter Plywood Brand</Label>
                            <Popover open={shutterPlywoodOpen} onOpenChange={setShutterPlywoodOpen}>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  role="combobox"
                                  className="w-full justify-between text-sm h-10"
                                >
                                  {watchedValues.A || 'Select plywood brand'}
                                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-[300px] p-0">
                                <Command>
                                  <CommandInput placeholder="Type to filter brands..." className="text-sm" />
                                  <CommandList>
                                    <CommandEmpty>
                                      {plywoodBrandMemoryData.length === 0 
                                        ? 'No saved brands. Add brands in Master Settings.'
                                        : 'No matching brands found.'}
                                    </CommandEmpty>
                                    <CommandGroup>
                                      {plywoodBrandMemoryData.map((brand: PlywoodBrandMemory) => (
                                        <CommandItem
                                          key={brand.id}
                                          value={brand.brand}
                                          onSelect={(currentValue) => {
                                            form.setValue('A', currentValue);
                                            setShutterPlywoodOpen(false);
                                          }}
                                        >
                                          <Check
                                            className={`mr-2 h-4 w-4 ${
                                              watchedValues.A === brand.brand ? 'opacity-100' : 'opacity-0'
                                            }`}
                                          />
                                          {brand.brand}
                                        </CommandItem>
                                      ))}
                                    </CommandGroup>
                                  </CommandList>
                                </Command>
                              </PopoverContent>
                            </Popover>
                          </div>

                        </div>
                      )}

                      {/* ADVANCED MODE: Cabinet Fields */}
                      {cabinetConfigMode === 'advanced' && (
                        <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Room Name</Label>
                          <Select
                            value={watchedValues.roomName || ''}
                            onValueChange={(value) => {
                              form.setValue('roomName', value);
                              focusNextField('roomName');
                            }}
                          >
                            <SelectTrigger 
                              className="text-sm"
                              ref={(el) => registerFieldRef('roomName', el)}
                            >
                              <SelectValue placeholder="Select room" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Kitchen">Kitchen</SelectItem>
                              <SelectItem value="Hall">Hall</SelectItem>
                              <SelectItem value="Bedroom 1">Bedroom 1</SelectItem>
                              <SelectItem value="Bedroom 2">Bedroom 2</SelectItem>
                              <SelectItem value="Bedroom 3">Bedroom 3</SelectItem>
                              <SelectItem value="Living Room">Living Room</SelectItem>
                              <SelectItem value="Dining Room">Dining Room</SelectItem>
                              <SelectItem value="Study Room">Study Room</SelectItem>
                              <SelectItem value="Bathroom">Bathroom</SelectItem>
                              <SelectItem value="Balcony">Balcony</SelectItem>
                              <SelectItem value="Manual Type">Manual Type</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Cabinet Name</Label>
                          <Input
                            {...form.register('name')}
                            className="text-sm"
                            data-field-name="cabinetName"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Plywood Brand</Label>
                          <Popover open={cabinetPlywoodOpen} onOpenChange={(open) => {
                            if (open) {
                              setCabinetPlywoodOpen(true);
                            } else {
                              setTimeout(() => setCabinetPlywoodOpen(false), 100);
                            }
                          }}>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                role="combobox"
                                className="w-full justify-between text-sm h-10"
                                ref={(el) => registerFieldRef('plywoodBrand', el)}
                              >
                                {watchedValues.A || 'Select plywood brand'}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[300px] p-0">
                              <Command>
                                <CommandInput placeholder="Type to filter brands..." className="text-sm" />
                                <CommandList>
                                  <CommandEmpty>
                                    {plywoodBrandMemoryData.length === 0 
                                      ? 'No saved brands. Add brands in Master Settings.'
                                      : 'No matching brands found.'}
                                  </CommandEmpty>
                                  <CommandGroup>
                                    {plywoodBrandMemoryData.map((brand: PlywoodBrandMemory) => (
                                      <CommandItem
                                        key={brand.id}
                                        value={brand.brand}
                                        onSelect={(currentValue) => {
                                          form.setValue('A', currentValue);
                                          if (panelsLinked) {
                                            syncPlywoodBrand(currentValue, 'main');
                                          }
                                          setCabinetPlywoodOpen(false);
                                          focusNextField('plywoodBrand');
                                        }}
                                      >
                                        <Check
                                          className={`mr-2 h-4 w-4 ${
                                            watchedValues.A === brand.brand ? 'opacity-100' : 'opacity-0'
                                          }`}
                                        />
                                        {brand.brand}
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                        </div>

                        <div className="space-y-2">
                          <Label>Back Panel Plywood</Label>
                          <Popover open={backPanelPlywoodOpen} onOpenChange={(open) => {
                            if (open) {
                              setBackPanelPlywoodOpen(true);
                            } else {
                              setTimeout(() => setBackPanelPlywoodOpen(false), 100);
                            }
                          }}>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                role="combobox"
                                className="w-full justify-between text-sm h-10"
                                data-testid="select-back-panel-plywood-brand"
                                ref={(el) => registerFieldRef('backPanelPlywood', el)}
                              >
                                {watchedValues.A || 'Select plywood brand'}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[300px] p-0">
                              <Command>
                                <CommandInput placeholder="Type to filter brands..." className="text-sm" />
                                <CommandList>
                                  <CommandEmpty>
                                    {plywoodBrandMemoryData.length === 0 
                                      ? 'No saved brands. Add brands in Master Settings.'
                                      : 'No matching brands found.'}
                                  </CommandEmpty>
                                  <CommandGroup>
                                    {plywoodBrandMemoryData.map((brand: PlywoodBrandMemory) => (
                                      <CommandItem
                                        key={brand.id}
                                        value={brand.brand}
                                        onSelect={(currentValue) => {
                                          form.setValue('A', currentValue);
                                          setBackPanelPlywoodOpen(false);
                                          focusNextField('backPanelPlywood');
                                        }}
                                      >
                                        <Check
                                          className={`mr-2 h-4 w-4 ${
                                            watchedValues.A === brand.brand ? 'opacity-100' : 'opacity-0'
                                          }`}
                                        />
                                        {brand.brand}
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                        </div>
                      </div>
                      )}
                    </CollapsibleContent>
                  </Collapsible>

                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(addCabinet)} className="space-y-6">
                    
                    {/* Advanced Mode - Full Cabinet Configuration */}
                    {cabinetConfigMode === 'advanced' && (
                    <>
                    {/* Front and Inner Laminate - Above Dimensions */}
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      {/* Front Laminate */}
                      <div className="space-y-2">
                        <Label className="text-xs text-slate-600 font-medium">Front Laminate</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              className="w-full justify-between text-sm h-9"
                            >
                              {watchedValues.topPanelLaminateCode || 'Select laminate code'}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[300px] p-0">
                            <Command>
                              <CommandInput placeholder="Search codes..." className="text-xs" />
                              <CommandList>
                                <CommandEmpty>
                                  {globalLaminateMemory.length === 0 
                                    ? 'No saved codes. Add codes in Master Settings.'
                                    : 'No matching codes found.'}
                                </CommandEmpty>
                                <CommandGroup>
                                  {globalLaminateMemory.map((code) => (
                                    <CommandItem
                                      key={code}
                                      value={code}
                                      onSelect={() => {
                                        form.setValue('topPanelLaminateCode', code);
                                      }}
                                      className="text-xs"
                                    >
                                      <Check
                                        className={`mr-2 h-4 w-4 ${
                                          watchedValues.topPanelLaminateCode === code ? 'opacity-100' : 'opacity-0'
                                        }`}
                                      />
                                      {code}
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </div>

                      {/* Inner Laminate */}
                      <div className="space-y-2">
                        <Label className="text-xs text-slate-600 font-medium">Inner Laminate</Label>
                        <Select 
                          value={watchedValues.innerLaminateCode || 'off white'}
                          onValueChange={(value) => {
                            if (value && value !== '__separator_custom__' && value !== '__separator_live__') {
                              form.setValue('innerLaminateCode', value);
                            }
                          }}
                        >
                          <SelectTrigger className="text-sm h-9">
                            <SelectValue placeholder="Select inner laminate" />
                          </SelectTrigger>
                          <SelectContent>
                            {globalLaminateMemory.length > 0 && (
                              <>
                                <SelectItem key="separator-custom-inner" value="__separator_custom_inner__" disabled className="text-xs font-semibold text-slate-600">
                                  — Previously Typed —
                                </SelectItem>
                                {globalLaminateMemory.map((option, idx) => (
                                  <SelectItem key={`inner-${idx}`} value={option} className="text-xs">
                                    {option}
                                  </SelectItem>
                                ))}
                              </>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Dimensions Row - Responsive Grid Layout */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                      {/* Height */}
                      <div className="space-y-1">
                        <Label className="text-sm">Height</Label>
                        <div className="relative">
                          <Input
                            type="number"
                            {...form.register('height', { valueAsNumber: true })}
                            className="text-sm w-full"
                            data-testid="input-cabinet-height"
                          />
                          <span className="absolute right-2 top-2 text-xs text-slate-500">{units}</span>
                        </div>
                      </div>
                      
                      {/* Width with Reduction */}
                      <div className="space-y-1">
                        <Label className="text-sm">Width</Label>
                        <div className="flex items-center gap-2">
                          <div className="relative flex-1">
                            <Input
                              type="number"
                              {...form.register('width', { valueAsNumber: true })}
                              className="text-sm"
                            />
                            <span className="absolute right-2 top-2 text-xs text-slate-500">{units}</span>
                          </div>
                          <span className="text-xs text-slate-600 whitespace-nowrap">-</span>
                          <Input
                            type="number"
                            {...form.register('widthReduction', { valueAsNumber: true })}
                            className="w-16 h-9 text-xs text-center"
                            min="0"
                            placeholder="36"
                          />
                        </div>
                      </div>
                      
                      {/* Depth */}
                      <div className="space-y-1">
                        <Label className="text-sm">Depth</Label>
                        <div className="relative">
                          <Input
                            type="number"
                            {...form.register('depth', { valueAsNumber: true })}
                            className="text-sm w-full"
                          />
                          <span className="absolute right-2 top-2 text-xs text-slate-500">{units}</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Panel Width Info - DISPLAY: width - reduction */}
                    <div className="text-xs text-slate-500 mb-4">
                      Panel width: {((watchedValues.width ?? 0) - (watchedValues.widthReduction ?? 36))}mm
                    </div>

                    <div className="space-y-6 mt-[50px]">
                      {/* Center Post and Shelves */}
                    <div ref={centerPostSectionRef} className="space-y-2 mt-[50px]">
                      <Label className="text-sm font-medium text-slate-700 flex items-center">
                        <i className="fas fa-columns mr-2 text-blue-600"></i>
                        Center Post and Shelves
                      </Label>
                      
                      {/* Toggle Row */}
                      <div className="flex gap-4 items-stretch">
                      {/* Center Post Toggle */}
                      <div className="flex-1 p-3 border border-blue-400/30 rounded-lg bg-blue-50/50">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-medium text-slate-700">Center Post</h4>
                          <Switch
                            checked={watchedValues.centerPostEnabled}
                            disabled={!woodGrainsReady}
                            onCheckedChange={(checked: boolean) => {
                              form.setValue('centerPostEnabled', checked);
                              // Apply to all existing cabinets
                              if (cabinets.length > 0) {
                                setCabinets(prevCabinets => 
                                  prevCabinets.map(cabinet => ({
                                    ...cabinet,
                                    centerPostEnabled: checked
                                  }))
                                );
                              }
                            }}
                            className="scale-75"
                          />
                        </div>
                        {watchedValues.centerPostEnabled && (
                          <div className="space-y-4 mt-4">
                            <div className="space-y-2">
                              <Label className="text-xs text-slate-600">Center Post Qty</Label>
                              <Select
                                value={watchedValues.centerPostQuantity?.toString() || '1'}
                                onValueChange={(value) => form.setValue('centerPostQuantity', parseInt(value))}
                              >
                                <SelectTrigger className="h-8 text-sm">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="1">1</SelectItem>
                                  <SelectItem value="2">2</SelectItem>
                                  <SelectItem value="3">3</SelectItem>
                                  <SelectItem value="4">4</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            
                            <div className="space-y-2">
                              <Label className="text-xs text-slate-600">Height</Label>
                              <div className="relative">
                                <Input
                                  type="number"
                                  {...form.register('centerPostHeight', { valueAsNumber: true })}
                                  className="text-sm pr-8"
                                  placeholder="Height"
                                />
                                <span className="absolute right-2 top-2 text-xs text-slate-500">mm</span>
                              </div>
                            </div>
                            
                            <div className="space-y-2">
                              <Label className="text-xs text-slate-600">Depth</Label>
                              <div className="relative">
                                <Input
                                  type="number"
                                  {...form.register('centerPostDepth', { valueAsNumber: true })}
                                  className="text-sm pr-8"
                                  placeholder="Depth"
                                />
                                <span className="absolute right-2 top-2 text-xs text-slate-500">mm</span>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <Label className="text-xs text-slate-600">Front Laminate</Label>
                              <Select
                                value={watchedValues.centerPostLaminateCode || watchedValues.topPanelLaminateCode || ''}
                                onValueChange={(value) => form.setValue('centerPostLaminateCode', value)}
                              >
                                <SelectTrigger className="h-8 text-sm">
                                  <SelectValue placeholder="Select laminate" />
                                </SelectTrigger>
                                <SelectContent>
                                  {laminateCodeGodownData.map((laminate: LaminateCode) => (
                                    <SelectItem key={laminate.id} value={laminate.code}>
                                      {laminate.code}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-2">
                              <Label className="text-xs text-slate-600">Inner Laminate</Label>
                              <Select
                                value={watchedValues.centerPostInnerLaminateCode || watchedValues.innerLaminateCode || ''}
                                onValueChange={(value) => form.setValue('centerPostInnerLaminateCode', value)}
                              >
                                <SelectTrigger className="h-8 text-sm">
                                  <SelectValue placeholder="Select laminate" />
                                </SelectTrigger>
                                <SelectContent>
                                  {laminateCodeGodownData.map((laminate: LaminateCode) => (
                                    <SelectItem key={laminate.id} value={laminate.code}>
                                      {laminate.code}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                form.setValue('centerPostHeight', watchedValues.height - 36);
                                form.setValue('centerPostDepth', watchedValues.depth - 20);
                              }}
                              className="h-8 px-3 text-xs w-full"
                            >
                              Reset Dimensions
                            </Button>
                          </div>
                        )}
                      </div>
                      
                      {/* Shelves Toggle */}
                      <div className="flex-1 p-3 border border-blue-400/30 rounded-lg bg-blue-50/50">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-medium text-slate-700">Shelves</h4>
                          <Switch
                            checked={watchedValues.shelvesEnabled}
                            disabled={!woodGrainsReady}
                            onCheckedChange={(checked: boolean) => {
                              form.setValue('shelvesEnabled', checked);
                              // Apply to all existing cabinets
                              if (cabinets.length > 0) {
                                setCabinets(prevCabinets => 
                                  prevCabinets.map(cabinet => ({
                                    ...cabinet,
                                    shelvesEnabled: checked
                                  }))
                                );
                              }
                            }}
                            className="scale-75"
                          />
                        </div>
                        {watchedValues.shelvesEnabled && (
                          <div className="space-y-4 mt-4">
                            <div className="space-y-2">
                              <Label className="text-xs text-slate-600">Shelves Qty</Label>
                              <Select
                                value={watchedValues.shelvesQuantity?.toString() || "1"}
                                onValueChange={(value) => {
                                  form.setValue('shelvesQuantity', parseInt(value));
                                }}
                              >
                                <SelectTrigger className="h-8 text-sm">
                                  <SelectValue placeholder="Select" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="1">1</SelectItem>
                                  <SelectItem value="2">2</SelectItem>
                                  <SelectItem value="3">3</SelectItem>
                                  <SelectItem value="4">4</SelectItem>
                                  <SelectItem value="5">5</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            
                            <div className="space-y-2">
                              <Label className="text-xs text-slate-600">Shelves Width</Label>
                              <div className="relative">
                                <Input
                                  type="number"
                                  value={watchedValues.width || 0}
                                  placeholder="Width"
                                  className="text-sm pr-8"
                                  onChange={(e) => form.setValue('width', parseInt(e.target.value) || 0)}
                                />
                                <span className="absolute right-2 top-2 text-xs text-slate-500">mm</span>
                              </div>
                            </div>
                            
                            <div className="space-y-2">
                              <Label className="text-xs text-slate-600">Shelves Depth</Label>
                              <div className="relative">
                                <Input
                                  type="number"
                                  value={watchedValues.depth ? watchedValues.depth - 30 : ''}
                                  placeholder="Depth"
                                  className="text-sm pr-8"
                                  onChange={(e) => form.setValue('depth', parseInt(e.target.value) || 0)}
                                />
                                <span className="absolute right-2 top-2 text-xs text-slate-500">mm</span>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <Label className="text-xs text-slate-600">Front Laminate</Label>
                              <Select
                                value={watchedValues.shelvesLaminateCode || watchedValues.topPanelLaminateCode || ''}
                                onValueChange={(value) => form.setValue('shelvesLaminateCode', value)}
                              >
                                <SelectTrigger className="h-8 text-sm">
                                  <SelectValue placeholder="Select laminate" />
                                </SelectTrigger>
                                <SelectContent>
                                  {laminateCodeGodownData.map((laminate: LaminateCode) => (
                                    <SelectItem key={laminate.id} value={laminate.code}>
                                      {laminate.code}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-2">
                              <Label className="text-xs text-slate-600">Inner Laminate</Label>
                              <Select
                                value={watchedValues.shelvesInnerLaminateCode || watchedValues.innerLaminateCode || ''}
                                onValueChange={(value) => form.setValue('shelvesInnerLaminateCode', value)}
                              >
                                <SelectTrigger className="h-8 text-sm">
                                  <SelectValue placeholder="Select laminate" />
                                </SelectTrigger>
                                <SelectContent>
                                  {laminateCodeGodownData.map((laminate: LaminateCode) => (
                                    <SelectItem key={laminate.id} value={laminate.code}>
                                      {laminate.code}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        )}
                      </div>
                      </div>
                    </div>

                    {/* Shutter Configuration */}
                      <div ref={shutterConfigSectionRef} className="space-y-8">
                        {/* Heading with Include Shutters toggle on right */}
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-medium text-slate-700 flex items-center">
                            <i className="fas fa-door-open mr-2 text-orange-600"></i>
                            Shutter Configuration
                          </Label>
                          <div className="flex items-center space-x-2">
                            <Label className="text-xs text-slate-600">Include Shutters</Label>
                            <Switch
                              checked={watchedValues.shuttersEnabled}
                              onCheckedChange={(checked: boolean) => {
                                form.setValue('shuttersEnabled', checked);
                                if (checked) {
                                  updateShutters();
                                }
                                // Apply to all existing cabinets and regenerate their shutter data
                                if (cabinets.length > 0) {
                                  setCabinets(prevCabinets => 
                                    prevCabinets.map(cabinet => {
                                      const updatedCabinet = {
                                        ...cabinet,
                                        shuttersEnabled: checked
                                      };
                                      // Regenerate shutters array if enabling, clear if disabling
                                      return {
                                        ...updatedCabinet,
                                        shutters: checked ? calculateShutterDimensions(updatedCabinet) : []
                                      };
                                    })
                                  );
                                }
                              }}
                              className="scale-90"
                            />
                          </div>
                        </div>
                        
                        {/* 2 controls in single row */}
                        <div className="flex flex-wrap items-center gap-3 mb-6">
                          {/* Plywood Brand Dropdown */}
                          <Popover open={shutterPlywoodOpen} onOpenChange={(open) => {
                            if (open) {
                              setShutterPlywoodOpen(true);
                            } else {
                              setTimeout(() => setShutterPlywoodOpen(false), 100);
                            }
                          }}>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                role="combobox"
                                className="w-[200px] justify-between text-xs h-7"
                                data-testid="select-shutter-plywood-brand"
                              >
                                {watchedValues.A || watchedValues.A || 'Plywood Brand'}
                                <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[300px] p-0">
                              <Command>
                                <CommandInput placeholder="Type to filter brands..." className="text-xs" />
                                <CommandList>
                                  <CommandEmpty>
                                    {plywoodBrandMemoryData.length === 0 
                                      ? 'No saved brands. Add brands in Master Settings.'
                                      : 'No matching brands found.'}
                                  </CommandEmpty>
                                  <CommandGroup>
                                    {plywoodBrandMemoryData.map((brand: PlywoodBrandMemory) => (
                                      <CommandItem
                                        key={brand.id}
                                        value={brand.brand}
                                        onSelect={(currentValue) => {
                                          form.setValue('A', currentValue);
                                        }}
                                      >
                                        <Check
                                          className={`mr-2 h-4 w-4 ${
                                            watchedValues.A === brand.brand ? 'opacity-100' : 'opacity-0'
                                          }`}
                                        />
                                        {brand.brand}
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                          
                          {/* No of Shutter Dropdown */}
                          <div className="flex items-center space-x-2">
                            <Label className="text-xs text-slate-600">No of Shutter</Label>
                            <Select 
                              value={watchedValues.type} 
                              onValueChange={(value) => {
                                const cabinetType = value as CabinetType;
                                form.setValue('type', cabinetType);
                                
                                // Update shutter count based on cabinet type
                                const config = cabinetConfigs[cabinetType];
                                if (config) {
                                  form.setValue('shutterCount', config.shutterQuantity);
                                  
                                  // Update shutters if enabled
                                  if (watchedValues.shuttersEnabled) {
                                    const newShutters = calculateShutterDimensions({
                                      ...watchedValues,
                                      type: cabinetType,
                                      shutterCount: config.shutterQuantity
                                    });
                                    form.setValue('shutters', newShutters);
                                  }
                                }
                              }}
                            >
                              <SelectTrigger className="text-xs h-7 w-20">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {cabinetTypes.map(type => (
                                  <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {watchedValues.shuttersEnabled && (
                          <div>
                            {/* Shutter Controls */}
                          <div className="space-y-8">
                            
                            {/* Front and Inner Laminate - Outside individual shutter cards */}
                            <div className="grid grid-cols-2 gap-4">
                              {/* Front Laminate */}
                              <div className="space-y-2">
                                <Label className="text-xs text-slate-600 font-medium">Front Laminate</Label>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button
                                      variant="outline"
                                      role="combobox"
                                      className="w-full justify-between text-sm h-9"
                                    >
                                      {watchedValues.shutterLaminateCode || 'Select laminate code'}
                                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-[300px] p-0">
                                    <Command>
                                      <CommandInput placeholder="Search codes..." className="text-xs" />
                                      <CommandList>
                                        <CommandEmpty>
                                          {globalLaminateMemory.length === 0 
                                            ? 'No saved codes. Add codes in Master Settings.'
                                            : 'No matching codes found.'}
                                        </CommandEmpty>
                                        <CommandGroup>
                                          {globalLaminateMemory.map((code) => (
                                            <CommandItem
                                              key={code}
                                              value={code}
                                              onSelect={() => {
                                                form.setValue('shutterLaminateCode', code);
                                              }}
                                              className="text-xs"
                                            >
                                              <Check
                                                className={`mr-2 h-4 w-4 ${
                                                  watchedValues.shutterLaminateCode === code ? 'opacity-100' : 'opacity-0'
                                                }`}
                                              />
                                              {code}
                                            </CommandItem>
                                          ))}
                                        </CommandGroup>
                                      </CommandList>
                                    </Command>
                                  </PopoverContent>
                                </Popover>
                              </div>

                              {/* Inner Laminate */}
                              <div className="space-y-2">
                                <Label className="text-xs text-slate-600 font-medium">Inner Laminate</Label>
                                <Select 
                                  value={watchedValues.shutterInnerLaminateCode || 'off white'}
                                  onValueChange={(value) => {
                                    if (value && value !== '__separator_custom__' && value !== '__separator_live__') {
                                      form.setValue('shutterInnerLaminateCode', value);
                                    }
                                  }}
                                >
                                  <SelectTrigger className="text-sm h-9">
                                    <SelectValue placeholder="Select inner laminate" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {globalLaminateMemory.length > 0 && (
                                      <>
                                        <SelectItem key="separator-custom-inner-shutter" value="__separator_custom_inner_shutter__" disabled className="text-xs font-semibold text-slate-600">
                                          — Previously Typed —
                                        </SelectItem>
                                        {globalLaminateMemory.map((option, idx) => (
                                          <SelectItem key={`inner-${idx}`} value={option} className="text-xs">
                                            {option}
                                          </SelectItem>
                                        ))}
                                      </>
                                    )}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>

                            {/* Custom Shutter Dimensions */}
                            {watchedValues.shutters && watchedValues.shutters.length > 0 && (
                              <div className="p-8 bg-gray-50 rounded-lg border">

                                <div className="text-sm font-medium text-slate-700 mb-6 flex items-center justify-between">
                                  <span>Custom Shutter Sizes:</span>
                                  <div className="flex space-x-2">
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => {
                                        const currentShutters = watchedValues.shutters || [];
                                        const shutter1LaminateCode = currentShutters.length > 0 ? currentShutters[0].laminateCode : '';
                                        const newShutter = { 
                                          width: Math.round((watchedValues.width || 600) / (watchedValues.shutterCount + 1)), 
                                          height: watchedValues.height || 800,
                                          laminateCode: shutter1LaminateCode
                                        };
                                        form.setValue('shutters', [...currentShutters, newShutter]);
                                        form.setValue('shutterCount', currentShutters.length + 1);
                                      }}
                                      className="text-xs text-green-600 hover:text-green-800 h-6 px-2"
                                    >
                                      <i className="fas fa-plus mr-1"></i>
                                      Add Size
                                    </Button>
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => {
                                        const newShutters = calculateShutterDimensions(watchedValues);
                                        form.setValue('shutters', newShutters);
                                      }}
                                      className="text-xs text-blue-600 hover:text-blue-800 h-6 px-2"
                                    >
                                      <i className="fas fa-refresh mr-1"></i>
                                      Reset
                                    </Button>
                                  </div>
                                </div>
                                <div className="space-y-6">
                                  {watchedValues.shutters.map((shutter, index) => (
                                    <div key={index} className="p-6 bg-white rounded-lg border">
                                      <div className="flex items-center justify-between mb-2">
                                        <Label className="text-sm font-medium text-slate-700">Shutter {index + 1}:</Label>
                                        <Button
                                          type="button"
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => {
                                            const newShutters = watchedValues.shutters.filter((_, i) => i !== index);
                                            form.setValue('shutters', newShutters);
                                            form.setValue('shutterCount', newShutters.length);
                                          }}
                                          className="text-xs text-red-600 hover:text-red-800 h-6 w-6 p-0"
                                        >
                                          <i className="fas fa-times"></i>
                                        </Button>
                                      </div>
                                      {/* Height (mm) */}
                                      <div className="space-y-1">
                                        <Label className="text-xs text-slate-500">Height (mm)</Label>
                                        <Input
                                          ref={index === 0 ? shutterHeightInputRef : null}
                                          type="number"
                                          value={shutter.height === 0 ? '' : shutter.height}
                                          onChange={(e) => {
                                            const newShutters = [...watchedValues.shutters];
                                            const newValue = e.target.value === '' ? 0 : parseInt(e.target.value);
                                            newShutters[index] = { ...newShutters[index], height: newValue };
                                            form.setValue('shutters', newShutters);
                                          }}
                                          className="text-sm h-9 w-full font-mono"
                                          placeholder={watchedValues.height?.toString() || "800"}
                                          min="0"
                                          max="9999"
                                          data-testid="input-shutter-height"
                                        />
                                      </div>

                                      {/* Remaining fields grid */}
                                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mt-3">
                                        <div className="space-y-1">
                                          <Label className="text-xs text-slate-500">Height Reduction</Label>
                                          <Input
                                            type="number"
                                            value={watchedValues.shutterHeightReduction?.toString() || '0'}
                                            onChange={(e) => {
                                              const reductionValue = e.target.value === '' ? 0 : parseInt(e.target.value);
                                              form.setValue('shutterHeightReduction', reductionValue);
                                              
                                              // Auto-update shutter heights: Cabinet Height + Reduction Value
                                              const cabinetHeight = watchedValues.height || 800;
                                              const newHeight = cabinetHeight + reductionValue;
                                              
                                              // Update all shutters with the new height
                                              const newShutters = watchedValues.shutters.map(shutter => ({
                                                ...shutter,
                                                height: newHeight
                                              }));
                                              form.setValue('shutters', newShutters);
                                            }}
                                            className="text-sm h-9 w-full font-mono"
                                            placeholder="0"
                                          />
                                        </div>
                                        <div className="space-y-1">
                                          <Label className="text-xs text-slate-500">Width (mm)</Label>
                                          <Input
                                            type="number"
                                            value={shutter.width === 0 ? '' : shutter.width}
                                            onChange={(e) => {
                                              const newShutters = [...watchedValues.shutters];
                                              const newValue = e.target.value === '' ? 0 : parseInt(e.target.value);
                                              newShutters[index] = { ...newShutters[index], width: newValue };
                                              form.setValue('shutters', newShutters);
                                            }}
                                            className="text-sm h-9 w-full font-mono"
                                            placeholder={Math.round((watchedValues.width || 600) / watchedValues.shutterCount).toString()}
                                            min="0"
                                            max="9999"
                                          />
                                        </div>
                                        <div className="space-y-1">
                                          <Label className="text-xs text-slate-500">Width Reduction</Label>
                                          <Input
                                            type="number"
                                            value={watchedValues.shutterWidthReduction?.toString() || '0'}
                                            onChange={(e) => {
                                              const reductionValue = e.target.value === '' ? 0 : parseInt(e.target.value);
                                              form.setValue('shutterWidthReduction', reductionValue);
                                              
                                              // Auto-update shutter widths: (Cabinet Width / Shutter Count) + Reduction Value
                                              const cabinetWidth = watchedValues.width || 600;
                                              const shutterCount = watchedValues.shutterCount || 1;
                                              const baseWidth = Math.round(cabinetWidth / shutterCount);
                                              const newWidth = baseWidth + reductionValue;
                                              
                                              // Update all shutters with the new width
                                              const newShutters = watchedValues.shutters.map(shutter => ({
                                                ...shutter,
                                                width: newWidth
                                              }));
                                              form.setValue('shutters', newShutters);
                                            }}
                                            className="text-sm h-9 w-full font-mono"
                                            placeholder="0"
                                          />
                                        </div>
                                        <div className="space-y-1">
                                          <Label className="text-xs text-slate-500">Count</Label>
                                          <div className="flex items-center space-x-1">
                                            <Button
                                              type="button"
                                              size="sm"
                                              variant="outline"
                                              onClick={() => {
                                                const currentCount = watchedValues.shutterCount;
                                                if (currentCount > 0) {
                                                  form.setValue('shutterCount', currentCount - 1);
                                                  const newShutters = watchedValues.shutters.slice(0, -1);
                                                  form.setValue('shutters', newShutters);
                                                }
                                              }}
                                              disabled={watchedValues.shutterCount <= 0}
                                              className="h-9 w-7 p-0"
                                            >
                                              <i className="fas fa-minus text-xs"></i>
                                            </Button>
                                            
                                            <span className="text-xs font-medium min-w-[15px] text-center">
                                              {watchedValues.shutterCount}
                                            </span>
                                            
                                            <Button
                                              type="button"
                                              size="sm"
                                              variant="outline"
                                              onClick={() => {
                                                const currentCount = watchedValues.shutterCount;
                                                if (currentCount < 5) {
                                                  form.setValue('shutterCount', currentCount + 1);
                                                  const newShutters = calculateShutterDimensions({
                                                    ...watchedValues,
                                                    shutterCount: currentCount + 1
                                                  });
                                                  form.setValue('shutters', newShutters);
                                                }
                                              }}
                                              disabled={watchedValues.shutterCount >= 5}
                                              className="h-9 w-7 p-0"
                                            >
                                              <i className="fas fa-plus text-xs"></i>
                                            </Button>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Panel Laminate Selection */}
                    <Collapsible open={individualPanelsOpen} onOpenChange={setIndividualPanelsOpen} className="mb-6">
                      <CollapsibleTrigger asChild>
                        <Button
                          ref={individualPanelsRef}
                          variant="outline"
                          className="w-full justify-between text-sm font-medium"
                          type="button"
                        >
                          <span className="flex items-center">
                            <i className="fas fa-th-large mr-2 text-primary-600"></i>
                            Individual Panel Laminate Selection
                          </span>
                          <i className={`fas ${individualPanelsOpen ? 'fa-chevron-down' : 'fa-chevron-right'} text-gray-400`}></i>
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-2 space-y-2 border-l-2 border-primary-200 pl-4">
                        <div className="flex items-center justify-end mb-2">
                          <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-2">
                            <Label htmlFor="panels-link" className="text-xs text-slate-600">
                              {panelsLinked ? 'Linked' : 'Unlinked'}
                            </Label>
                            <Switch
                              id="panels-link"
                              checked={panelsLinked}
                              onCheckedChange={setPanelsLinked}
                              data-testid="switch-panels-link"
                            />
                            <i className={`fas ${panelsLinked ? 'fa-link text-blue-600' : 'fa-unlink text-gray-600'} text-sm`}></i>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Label htmlFor="master-gaddi" className="text-xs text-slate-600">
                              Gaddi
                            </Label>
                            <Switch
                              id="master-gaddi"
                              checked={allGaddiEnabled}
                              onCheckedChange={toggleAllGaddi}
                              data-testid="switch-master-gaddi"
                            />
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        {/* Top Panel */}
                        <div className="space-y-1">
                          <div className="flex items-center gap-3">
                            <Label className="text-xs sm:text-sm text-slate-600">
                              Top Panel ({(watchedValues.width || 0) - (watchedValues.widthReduction || 36)}mm × {watchedValues.depth || 0}mm)
                            </Label>
                            <div className="flex items-center gap-2">
                              <Label className="text-xs sm:text-sm text-slate-600">Gaddi</Label>
                              <Switch
                                checked={topGaddiEnabled}
                                onCheckedChange={setTopGaddiEnabled}
                                className="scale-100"
                              />
                            </div>
                          </div>
                          
                          <div className="flex gap-4">
                            <div className="space-y-1 flex-1">
                              <Label className="text-xs text-slate-600">Front Laminate</Label>
                              <Popover open={topLaminateOpen} onOpenChange={setTopLaminateOpen}>
                                  <PopoverTrigger asChild>
                                    <Button
                                      variant="outline"
                                      role="combobox"
                                      className={`w-full justify-between text-xs sm:text-sm h-10 sm:h-9 ${watchedValues.topPanelGrainDirection && (form.watch('topPanelLaminateCode') || '').toLowerCase().includes('wood') ? 'text-red-600 font-semibold' : ''}`}
                                      ref={(el) => registerFieldRef('topPanelLaminateCode', el)}
                                    >
                                      {form.watch('topPanelLaminateCode') || 'Select front laminate'}
                                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-[300px] p-0">
                                    <Command>
                                      <CommandInput placeholder="Type to filter codes..." className="text-xs" />
                                      <CommandList>
                                        <CommandEmpty>
                                          {globalLaminateMemory.length === 0 
                                            ? 'No saved codes. Add codes in Master Settings.'
                                            : 'No matching codes found.'}
                                        </CommandEmpty>
                                        <CommandGroup>
                                          {globalLaminateMemory.map((code) => (
                                            <CommandItem
                                              key={code}
                                              value={code}
                                              onSelect={async (currentValue) => {
                                                updateLaminateWithTracking('topPanelLaminateCode', currentValue, 'user');
                                                // Auto-mark paired Inner Laminate as user-selected (it has a sensible default)
                                                markLaminateAsUserSelected('topPanelInnerLaminateCode');
                                                
                                                // ✅ DIRECT LINK: Auto-sync grain direction from database preferences
                                                const topBaseCode = currentValue.split('+')[0].trim();
                                                const topHasWoodGrain = woodGrainsPreferences[topBaseCode] === true;
                                                form.setValue('topPanelGrainDirection', topHasWoodGrain);
                                                
                                                if (panelsLinked) {
                                                  syncLaminateCode(currentValue, 'top');
                                                }
                                                setTopLaminateOpen(false);
                                                focusNextField('topPanelLaminateCode');
                                              }}
                                              className="text-xs"
                                            >
                                              <Check
                                                className={`mr-2 h-4 w-4 ${
                                                  form.watch('topPanelLaminateCode') === code ? 'opacity-100' : 'opacity-0'
                                                }`}
                                              />
                                              {code}
                                            </CommandItem>
                                          ))}
                                        </CommandGroup>
                                      </CommandList>
                                    </Command>
                                  </PopoverContent>
                              </Popover>
                            </div>
                            
                            <div className="space-y-1 flex-1">
                              <Label className="text-xs text-slate-600">Inner Laminate</Label>
                              <Popover open={topInnerLaminateOpen} onOpenChange={setTopInnerLaminateOpen}>
                                  <PopoverTrigger asChild>
                                    <Button
                                      variant="outline"
                                      role="combobox"
                                      className="w-full justify-between text-xs sm:text-sm h-10 sm:h-9"
                                    >
                                      {watchedValues.topPanelInnerLaminateCode || 'Select inner laminate'}
                                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-[300px] p-0">
                                    <Command>
                                      <CommandInput placeholder="Type to filter codes..." className="text-xs" />
                                      <CommandList>
                                        <CommandEmpty>
                                          {globalLaminateMemory.length === 0 
                                            ? 'No saved codes. Add codes in Master Settings.'
                                            : 'No matching codes found.'}
                                        </CommandEmpty>
                                        <CommandGroup>
                                          {globalLaminateMemory.map((code) => (
                                            <CommandItem
                                              key={code}
                                              value={code}
                                              onSelect={(currentValue) => {
                                                updateLaminateWithTracking('topPanelInnerLaminateCode', currentValue, 'user');
                                                if (panelsLinked) {
                                                  syncCabinetConfigInnerLaminate(currentValue, true);
                                                }
                                                setTopInnerLaminateOpen(false);
                                              }}
                                              className="text-xs"
                                            >
                                              <Check
                                                className={`mr-2 h-4 w-4 ${
                                                  watchedValues.topPanelInnerLaminateCode === code ? 'opacity-100' : 'opacity-0'
                                                }`}
                                              />
                                              {code}
                                            </CommandItem>
                                          ))}
                                        </CommandGroup>
                                      </CommandList>
                                    </Command>
                                  </PopoverContent>
                              </Popover>
                            </div>
                          </div>
                        </div>

                        {/* Other Panels Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">

                        {/* Bottom Panel */}
                        <div className="space-y-1 w-full">
                          <div className="flex items-center gap-3">
                            <Label className="text-xs sm:text-sm text-slate-600">
                              Bottom Panel ({(watchedValues.width || 0) - (watchedValues.widthReduction || 36)}mm × {watchedValues.depth || 0}mm)
                            </Label>
                            <div className="flex items-center gap-2">
                              <Label className="text-xs sm:text-sm text-slate-600">Gaddi</Label>
                              <Switch
                                checked={bottomGaddiEnabled}
                                onCheckedChange={setBottomGaddiEnabled}
                                className="scale-100"
                              />
                            </div>
                          </div>
                          
                          <div className="flex gap-4">
                            <div className="space-y-1 flex-1">
                              <Label className="text-xs text-slate-600">Front Laminate</Label>
                              <Popover open={bottomLaminateOpen} onOpenChange={setBottomLaminateOpen}>
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="outline"
                                    role="combobox"
                                    className={`w-full justify-between text-xs sm:text-sm h-10 sm:h-9 ${watchedValues.bottomPanelGrainDirection && (form.watch('bottomPanelLaminateCode') || '').toLowerCase().includes('wood') ? 'text-red-600 font-semibold' : ''}`}
                                    ref={(el) => registerFieldRef('bottomPanelLaminateCode', el)}
                                  >
                                    {form.watch('bottomPanelLaminateCode') || 'Select front laminate'}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[300px] p-0">
                                  <Command>
                                    <CommandInput placeholder="Type to filter codes..." className="text-xs" />
                                    <CommandList>
                                      <CommandEmpty>
                                        {globalLaminateMemory.length === 0 
                                          ? 'No saved codes. Add codes in Master Settings.'
                                          : 'No matching codes found.'}
                                      </CommandEmpty>
                                      <CommandGroup>
                                        {globalLaminateMemory.map((code) => (
                                          <CommandItem
                                            key={code}
                                            value={code}
                                            onSelect={async (currentValue) => {
                                              updateLaminateWithTracking('bottomPanelLaminateCode', currentValue, 'user');
                                              // Auto-mark paired Inner Laminate as user-selected
                                              markLaminateAsUserSelected('bottomPanelInnerLaminateCode');
                                              
                                              // ✅ DIRECT LINK: Auto-sync grain direction from database preferences
                                              const bottomBaseCode = currentValue.split('+')[0].trim();
                                              const bottomHasWoodGrain = woodGrainsPreferences[bottomBaseCode] === true;
                                              form.setValue('bottomPanelGrainDirection', bottomHasWoodGrain);
                                              
                                              if (panelsLinked) {
                                                syncLaminateCode(currentValue, 'bottom');
                                              }
                                              setBottomLaminateOpen(false);
                                              focusNextField('bottomPanelLaminateCode');
                                            }}
                                            className="text-xs"
                                          >
                                            <Check
                                              className={`mr-2 h-4 w-4 ${
                                                form.watch('bottomPanelLaminateCode') === code ? 'opacity-100' : 'opacity-0'
                                              }`}
                                            />
                                            {code}
                                          </CommandItem>
                                        ))}
                                      </CommandGroup>
                                    </CommandList>
                                  </Command>
                                </PopoverContent>
                              </Popover>
                            </div>
                            
                            <div className="space-y-1 flex-1">
                              <Label className="text-xs text-slate-600">Inner Laminate</Label>
                              <Popover open={bottomInnerLaminateOpen} onOpenChange={setBottomInnerLaminateOpen}>
                                  <PopoverTrigger asChild>
                                    <Button
                                      variant="outline"
                                      role="combobox"
                                      className="w-full justify-between text-xs sm:text-sm h-10 sm:h-9"
                                    >
                                      {watchedValues.bottomPanelInnerLaminateCode || 'Select inner laminate'}
                                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-[300px] p-0">
                                    <Command>
                                      <CommandInput placeholder="Type to filter codes..." className="text-xs" />
                                      <CommandList>
                                        <CommandEmpty>
                                          {globalLaminateMemory.length === 0 
                                            ? 'No saved codes. Add codes in Master Settings.'
                                            : 'No matching codes found.'}
                                        </CommandEmpty>
                                        <CommandGroup>
                                          {globalLaminateMemory.map((code) => (
                                            <CommandItem
                                              key={code}
                                              value={code}
                                              onSelect={(currentValue) => {
                                                updateLaminateWithTracking('bottomPanelInnerLaminateCode', currentValue, 'user');
                                                if (panelsLinked) {
                                                  syncCabinetConfigInnerLaminate(currentValue, true);
                                                }
                                                setBottomInnerLaminateOpen(false);
                                              }}
                                              className="text-xs"
                                            >
                                              <Check
                                                className={`mr-2 h-4 w-4 ${
                                                  watchedValues.bottomPanelInnerLaminateCode === code ? 'opacity-100' : 'opacity-0'
                                                }`}
                                              />
                                              {code}
                                            </CommandItem>
                                          ))}
                                        </CommandGroup>
                                      </CommandList>
                                    </Command>
                                  </PopoverContent>
                              </Popover>
                            </div>
                          </div>
                        </div>

                        {/* Left Panel */}
                        <div className="space-y-1 w-full">
                          <div className="flex items-center gap-3">
                            <Label className="text-xs sm:text-sm text-slate-600">
                              Left Panel ({watchedValues.depth || 0}mm × {(watchedValues.height || 0) - 36}mm)
                            </Label>
                            <div className="flex items-center gap-2">
                              <Label className="text-xs sm:text-sm text-slate-600">Gaddi</Label>
                              <Switch
                                checked={leftGaddiEnabled}
                                onCheckedChange={setLeftGaddiEnabled}
                                className="scale-100"
                              />
                            </div>
                          </div>
                          
                          <div className="flex gap-4">
                            <div className="space-y-1 flex-1">
                              <Label className="text-xs text-slate-600">Front Laminate</Label>
                              <Popover open={leftLaminateOpen} onOpenChange={setLeftLaminateOpen}>
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="outline"
                                    role="combobox"
                                    className={`w-full justify-between text-xs sm:text-sm h-10 sm:h-9 ${watchedValues.leftPanelGrainDirection && (form.watch('leftPanelLaminateCode') || '').toLowerCase().includes('wood') ? 'text-red-600 font-semibold' : ''}`}
                                    ref={(el) => registerFieldRef('leftPanelLaminateCode', el)}
                                  >
                                    {form.watch('leftPanelLaminateCode') || 'Select front laminate'}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[300px] p-0">
                                  <Command>
                                    <CommandInput placeholder="Type to filter codes..." className="text-xs" />
                                    <CommandList>
                                      <CommandEmpty>
                                        {globalLaminateMemory.length === 0 
                                          ? 'No saved codes. Add codes in Master Settings.'
                                          : 'No matching codes found.'}
                                      </CommandEmpty>
                                      <CommandGroup>
                                        {globalLaminateMemory.map((code) => (
                                          <CommandItem
                                            key={code}
                                            value={code}
                                            onSelect={async (currentValue) => {
                                              updateLaminateWithTracking('leftPanelLaminateCode', currentValue, 'user');
                                              // Auto-mark paired Inner Laminate as user-selected
                                              markLaminateAsUserSelected('leftPanelInnerLaminateCode');
                                              
                                              // ✅ DIRECT LINK: Auto-sync grain direction from database preferences
                                              const leftBaseCode = currentValue.split('+')[0].trim();
                                              const leftHasWoodGrain = woodGrainsPreferences[leftBaseCode] === true;
                                              form.setValue('leftPanelGrainDirection', leftHasWoodGrain);
                                              
                                              if (panelsLinked) {
                                                syncLaminateCode(currentValue, 'left');
                                              }
                                              setLeftLaminateOpen(false);
                                              focusNextField('leftPanelLaminateCode');
                                            }}
                                            className="text-xs"
                                          >
                                            <Check
                                              className={`mr-2 h-4 w-4 ${
                                                form.watch('leftPanelLaminateCode') === code ? 'opacity-100' : 'opacity-0'
                                              }`}
                                            />
                                            {code}
                                          </CommandItem>
                                        ))}
                                      </CommandGroup>
                                    </CommandList>
                                  </Command>
                                </PopoverContent>
                              </Popover>
                            </div>
                            
                            <div className="space-y-1 flex-1">
                              <Label className="text-xs text-slate-600">Inner Laminate</Label>
                              <Popover open={leftInnerLaminateOpen} onOpenChange={setLeftInnerLaminateOpen}>
                                  <PopoverTrigger asChild>
                                    <Button
                                      variant="outline"
                                      role="combobox"
                                      className="w-full justify-between text-xs sm:text-sm h-10 sm:h-9"
                                    >
                                      {watchedValues.leftPanelInnerLaminateCode || 'Select inner laminate'}
                                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-[300px] p-0">
                                    <Command>
                                      <CommandInput placeholder="Type to filter codes..." className="text-xs" />
                                      <CommandList>
                                        <CommandEmpty>
                                          {globalLaminateMemory.length === 0 
                                            ? 'No saved codes. Add codes in Master Settings.'
                                            : 'No matching codes found.'}
                                        </CommandEmpty>
                                        <CommandGroup>
                                          {globalLaminateMemory.map((code) => (
                                            <CommandItem
                                              key={code}
                                              value={code}
                                              onSelect={(currentValue) => {
                                                updateLaminateWithTracking('leftPanelInnerLaminateCode', currentValue, 'user');
                                                if (panelsLinked) {
                                                  syncCabinetConfigInnerLaminate(currentValue, true);
                                                }
                                                setLeftInnerLaminateOpen(false);
                                              }}
                                              className="text-xs"
                                            >
                                              <Check
                                                className={`mr-2 h-4 w-4 ${
                                                  watchedValues.leftPanelInnerLaminateCode === code ? 'opacity-100' : 'opacity-0'
                                                }`}
                                              />
                                              {code}
                                            </CommandItem>
                                          ))}
                                        </CommandGroup>
                                      </CommandList>
                                    </Command>
                                  </PopoverContent>
                              </Popover>
                            </div>
                          </div>
                        </div>

                        {/* Right Panel */}
                        <div className="space-y-1 w-full">
                          <div className="flex items-center gap-3">
                            <Label className="text-xs sm:text-sm text-slate-600">
                              Right Panel ({watchedValues.depth || 0}mm × {(watchedValues.height || 0) - 36}mm)
                            </Label>
                            <div className="flex items-center gap-2">
                              <Label className="text-xs sm:text-sm text-slate-600">Gaddi</Label>
                              <Switch
                                checked={rightGaddiEnabled}
                                onCheckedChange={setRightGaddiEnabled}
                                className="scale-100"
                              />
                            </div>
                          </div>
                          
                          <div className="flex gap-4">
                            <div className="space-y-1 flex-1">
                              <Label className="text-xs text-slate-600">Front Laminate</Label>
                              <Popover open={rightLaminateOpen} onOpenChange={setRightLaminateOpen}>
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="outline"
                                    role="combobox"
                                    className={`w-full justify-between text-xs sm:text-sm h-10 sm:h-9 ${watchedValues.rightPanelGrainDirection && (form.watch('rightPanelLaminateCode') || '').toLowerCase().includes('wood') ? 'text-red-600 font-semibold' : ''}`}
                                    ref={(el) => registerFieldRef('rightPanelLaminateCode', el)}
                                  >
                                    {form.watch('rightPanelLaminateCode') || 'Select front laminate'}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[300px] p-0">
                                  <Command>
                                    <CommandInput placeholder="Type to filter codes..." className="text-xs" />
                                    <CommandList>
                                      <CommandEmpty>
                                        {globalLaminateMemory.length === 0 
                                          ? 'No saved codes. Add codes in Master Settings.'
                                          : 'No matching codes found.'}
                                      </CommandEmpty>
                                      <CommandGroup>
                                        {globalLaminateMemory.map((code) => (
                                          <CommandItem
                                            key={code}
                                            value={code}
                                            onSelect={async (currentValue) => {
                                              updateLaminateWithTracking('rightPanelLaminateCode', currentValue, 'user');
                                              // Auto-mark paired Inner Laminate as user-selected
                                              markLaminateAsUserSelected('rightPanelInnerLaminateCode');
                                              
                                              // ✅ DIRECT LINK: Auto-sync grain direction from database preferences
                                              const rightBaseCode = currentValue.split('+')[0].trim();
                                              const rightHasWoodGrain = woodGrainsPreferences[rightBaseCode] === true;
                                              form.setValue('rightPanelGrainDirection', rightHasWoodGrain);
                                              
                                              if (panelsLinked) {
                                                syncLaminateCode(currentValue, 'right');
                                              }
                                              setRightLaminateOpen(false);
                                              focusNextField('rightPanelLaminateCode');
                                            }}
                                            className="text-xs"
                                          >
                                            <Check
                                              className={`mr-2 h-4 w-4 ${
                                                form.watch('rightPanelLaminateCode') === code ? 'opacity-100' : 'opacity-0'
                                              }`}
                                            />
                                            {code}
                                          </CommandItem>
                                        ))}
                                      </CommandGroup>
                                    </CommandList>
                                  </Command>
                                </PopoverContent>
                              </Popover>
                            </div>
                            
                            <div className="space-y-1 flex-1">
                              <Label className="text-xs text-slate-600">Inner Laminate</Label>
                              <Popover open={rightInnerLaminateOpen} onOpenChange={setRightInnerLaminateOpen}>
                                  <PopoverTrigger asChild>
                                    <Button
                                      variant="outline"
                                      role="combobox"
                                      className="w-full justify-between text-xs sm:text-sm h-10 sm:h-9"
                                    >
                                      {watchedValues.rightPanelInnerLaminateCode || 'Select inner laminate'}
                                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-[300px] p-0">
                                    <Command>
                                      <CommandInput placeholder="Type to filter codes..." className="text-xs" />
                                      <CommandList>
                                        <CommandEmpty>
                                          {globalLaminateMemory.length === 0 
                                            ? 'No saved codes. Add codes in Master Settings.'
                                            : 'No matching codes found.'}
                                        </CommandEmpty>
                                        <CommandGroup>
                                          {globalLaminateMemory.map((code) => (
                                            <CommandItem
                                              key={code}
                                              value={code}
                                              onSelect={(currentValue) => {
                                                updateLaminateWithTracking('rightPanelInnerLaminateCode', currentValue, 'user');
                                                if (panelsLinked) {
                                                  syncCabinetConfigInnerLaminate(currentValue, true);
                                                }
                                                setRightInnerLaminateOpen(false);
                                              }}
                                              className="text-xs"
                                            >
                                              <Check
                                                className={`mr-2 h-4 w-4 ${
                                                  watchedValues.rightPanelInnerLaminateCode === code ? 'opacity-100' : 'opacity-0'
                                                }`}
                                              />
                                              {code}
                                            </CommandItem>
                                          ))}
                                        </CommandGroup>
                                      </CommandList>
                                    </Command>
                                  </PopoverContent>
                              </Popover>
                            </div>
                          </div>
                        </div>

                        {/* Back Panel */}
                        <div className="space-y-1 w-full">
                          <div className="flex items-center justify-between gap-2">
                            <Label className="text-xs sm:text-sm text-slate-600">
                              Back Panel ({watchedValues.width - (watchedValues.backPanelWidthReduction || 20)}mm × {watchedValues.height - (watchedValues.backPanelHeightReduction || 20)}mm)
                            </Label>
                            <Select 
                              value={(watchedValues.backPanelWidthReduction || 20).toString()}
                              onValueChange={(value) => {
                                const numValue = parseInt(value);
                                form.setValue('backPanelWidthReduction', numValue);
                                form.setValue('backPanelHeightReduction', numValue);
                              }}
                            >
                              <SelectTrigger className="w-[80px] h-9 text-xs">
                                <SelectValue placeholder="-20mm" />
                              </SelectTrigger>
                              <SelectContent align="end">
                                <SelectItem value="0">-0mm</SelectItem>
                                <SelectItem value="10">-10mm</SelectItem>
                                <SelectItem value="20">-20mm</SelectItem>
                                <SelectItem value="30">-30mm</SelectItem>
                                <SelectItem value="40">-40mm</SelectItem>
                                <SelectItem value="50">-50mm</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div className="flex gap-4">
                            <div className="space-y-1 flex-1">
                              <Label className="text-xs text-slate-600">Front Laminate</Label>
                              <Popover open={backLaminateOpen} onOpenChange={setBackLaminateOpen}>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  role="combobox"
                                  className={`w-full justify-between text-xs sm:text-sm h-10 sm:h-9 ${watchedValues.backPanelGrainDirection && (form.watch('backPanelLaminateCode') || '').toLowerCase().includes('wood') ? 'text-red-600 font-semibold' : ''}`}
                                  ref={(el) => registerFieldRef('backPanelLaminateCode', el)}
                                >
                                  {form.watch('backPanelLaminateCode') || 'Select front laminate'}
                                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-[300px] p-0">
                                <Command>
                                  <CommandInput placeholder="Type to filter codes..." className="text-xs" />
                                  <CommandList>
                                    <CommandEmpty>
                                      {globalLaminateMemory.length === 0 
                                        ? 'No saved codes. Add codes in Master Settings.'
                                        : 'No matching codes found.'}
                                    </CommandEmpty>
                                    <CommandGroup>
                                      {globalLaminateMemory.map((code) => (
                                        <CommandItem
                                          key={code}
                                          value={code}
                                          onSelect={async (currentValue) => {
                                            updateLaminateWithTracking('backPanelLaminateCode', currentValue, 'user');
                                            // Auto-mark paired Inner Laminate as user-selected
                                            markLaminateAsUserSelected('backPanelInnerLaminateCode');
                                            
                                            // ✅ DIRECT LINK: Auto-sync grain direction from database preferences
                                            const backBaseCode = currentValue.split('+')[0].trim();
                                            const backHasWoodGrain = woodGrainsPreferences[backBaseCode] === true;
                                            form.setValue('backPanelGrainDirection', backHasWoodGrain);
                                            
                                            setBackLaminateOpen(false);
                                            focusNextField('backPanelLaminateCode');
                                          }}
                                          className="text-xs"
                                        >
                                          <Check
                                            className={`mr-2 h-4 w-4 ${
                                              form.watch('backPanelLaminateCode') === code ? 'opacity-100' : 'opacity-0'
                                            }`}
                                          />
                                          {code}
                                        </CommandItem>
                                      ))}
                                    </CommandGroup>
                                  </CommandList>
                                </Command>
                              </PopoverContent>
                              </Popover>
                            </div>
                            
                            <div className="space-y-1 flex-1">
                              <Label className="text-xs text-slate-600">Inner Laminate</Label>
                              <Popover open={backInnerLaminateOpen} onOpenChange={setBackInnerLaminateOpen}>
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="outline"
                                    role="combobox"
                                    className="w-full justify-between text-xs sm:text-sm h-10 sm:h-9"
                                  >
                                    {watchedValues.backPanelInnerLaminateCode || 'Select inner laminate'}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[300px] p-0">
                                  <Command>
                                    <CommandInput placeholder="Type to filter codes..." className="text-xs" />
                                    <CommandList>
                                      <CommandEmpty>
                                        {globalLaminateMemory.length === 0 
                                          ? 'No saved codes. Add codes in Master Settings.'
                                          : 'No matching codes found.'}
                                      </CommandEmpty>
                                      <CommandGroup>
                                        {globalLaminateMemory.map((code) => (
                                          <CommandItem
                                            key={code}
                                            value={code}
                                            onSelect={(currentValue) => {
                                              updateLaminateWithTracking('backPanelInnerLaminateCode', currentValue, 'user');
                                              setBackInnerLaminateOpen(false);
                                            }}
                                            className="text-xs"
                                          >
                                            <Check
                                              className={`mr-2 h-4 w-4 ${
                                                watchedValues.backPanelInnerLaminateCode === code ? 'opacity-100' : 'opacity-0'
                                              }`}
                                            />
                                            {code}
                                          </CommandItem>
                                        ))}
                                      </CommandGroup>
                                    </CommandList>
                                  </Command>
                                </PopoverContent>
                              </Popover>
                            </div>
                          </div>
                        </div>
                        </div>


                        {/* Shutters Enabled Toggle */}
                      </div>
                      </CollapsibleContent>
                    </Collapsible>
                    {/* Actions */}
                    <div className="flex items-center justify-end pt-4 border-t border-slate-200">
                      <div className="flex items-center gap-3">
                        <div className="flex space-x-2">
                          <Button type="submit" className="bg-primary-600 hover:bg-primary-700" data-testid="button-add-cabinet">
                            <i className="fas fa-plus mr-2"></i>
                            Add Cabinet
                          </Button>
                        </div>
                      </div>
                    </div>
                    </>
                    )}
                    
                    {/* Basic Mode - Quick Shutter */}
                    {cabinetConfigMode === 'basic' && (
                    <>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label>Shutter Name</Label>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-600">Gaddi</span>
                            <Switch
                              checked={form.watch('shutterGaddi') ?? false}
                              onCheckedChange={(checked) => form.setValue('shutterGaddi', checked)}
                              data-testid="toggle-shutter-gaddi"
                            />
                          </div>
                        </div>
                        <Input
                          {...form.register('name')}
                          placeholder="e.g., Kitchen Shutter"
                          className="text-sm"
                        />
                      </div>

                      {/* Quick Shutter Front & Inner Laminates - After Shutter Name */}
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-xs font-medium">Front Laminate <span className="text-blue-600 font-bold">(M)</span></Label>
                            <Popover open={basicShutterLaminateOpen} onOpenChange={setBasicShutterLaminateOpen}>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  role="combobox"
                                  className="w-full justify-between text-sm h-10"
                                >
                                  {watchedValues.shutterLaminateCode || 'Select'}
                                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-[300px] p-0">
                                <Command>
                                  <CommandInput placeholder="Type to filter codes..." className="text-sm" />
                                  <CommandList>
                                    <CommandEmpty>
                                      {globalLaminateMemory.length === 0 
                                        ? 'No saved codes. Add codes in Master Settings.'
                                        : 'No matching codes found.'}
                                    </CommandEmpty>
                                    <CommandGroup>
                                      {globalLaminateMemory.map((code) => (
                                        <CommandItem
                                          key={code}
                                          value={code}
                                          onSelect={(currentValue) => {
                                            updateLaminateWithTracking('shutterLaminateCode', currentValue, 'user');
                                            setBasicShutterLaminateOpen(false);
                                          }}
                                          className="text-sm"
                                        >
                                          <Check
                                            className={`mr-2 h-4 w-4 ${
                                              watchedValues.shutterLaminateCode === code ? 'opacity-100' : 'opacity-0'
                                            }`}
                                          />
                                          {code}
                                        </CommandItem>
                                      ))}
                                    </CommandGroup>
                                  </CommandList>
                                </Command>
                              </PopoverContent>
                            </Popover>
                          </div>
                          
                          <div className="space-y-2">
                            <Label className="text-xs font-medium">Inner Laminate</Label>
                            <Popover open={basicShutterInnerLaminateOpen} onOpenChange={setBasicShutterInnerLaminateOpen}>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  role="combobox"
                                  className="w-full justify-between text-sm h-10"
                                >
                                  {watchedValues.shutterInnerLaminateCode || 'Select'}
                                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-[300px] p-0">
                                <Command>
                                  <CommandInput placeholder="Type to filter codes..." className="text-sm" />
                                  <CommandList>
                                    <CommandEmpty>
                                      {globalLaminateMemory.length === 0 
                                        ? 'No saved codes. Add codes in Master Settings.'
                                        : 'No matching codes found.'}
                                    </CommandEmpty>
                                    <CommandGroup>
                                      {globalLaminateMemory.map((code) => (
                                        <CommandItem
                                          key={code}
                                          value={code}
                                          onSelect={(currentValue) => {
                                            updateLaminateWithTracking('shutterInnerLaminateCode', currentValue, 'user');
                                            setBasicShutterInnerLaminateOpen(false);
                                          }}
                                          className="text-sm"
                                        >
                                          <Check
                                            className={`mr-2 h-4 w-4 ${
                                              watchedValues.shutterInnerLaminateCode === code ? 'opacity-100' : 'opacity-0'
                                            }`}
                                          />
                                          {code}
                                        </CommandItem>
                                      ))}
                                    </CommandGroup>
                                  </CommandList>
                                </Command>
                              </PopoverContent>
                            </Popover>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <div className="space-y-2 flex-1 min-w-0">
                          <Label className="text-xs">Height (mm)</Label>
                          <Input
                            type="number"
                            {...form.register('height', { valueAsNumber: true })}
                            placeholder="2000"
                            className="text-sm w-full"
                          />
                        </div>
                        <div className="space-y-2 flex-1 min-w-0">
                          <Label className="text-xs">Width (mm)</Label>
                          <Input
                            type="number"
                            {...form.register('width', { valueAsNumber: true })}
                            placeholder="600"
                            className="text-sm w-full"
                          />
                        </div>
                        <div className="space-y-2 flex-1 min-w-0">
                          <Label className="text-xs">Quantity</Label>
                          <Input
                            type="number"
                            {...form.register('shutterCount', { valueAsNumber: true })}
                            placeholder="1"
                            className="text-sm w-full"
                            min="1"
                          />
                        </div>
                      </div>
                      
                      {/* Visual Preview for Quick Shutter */}
                      {(() => {
                        const height = form.getValues('height');
                        const width = form.getValues('width');
                        const shutterCount = form.getValues('shutterCount');
                        const shutterLaminate = form.getValues('shutterInnerLaminateCode') || 'Not Set';
                        return height > 0 && width > 0 && shutterCount > 0 ? (
                          <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                            <div className="text-xs text-blue-700 font-semibold mb-1 text-center">
                              Quick Shutter Preview
                            </div>
                            <div className="text-xs text-blue-600 mb-3 text-center">
                              Laminate: {shutterLaminate}
                            </div>
                            <div className="flex flex-wrap gap-4 justify-center">
                              {Array.from({ length: shutterCount || 1 }, (_, index) => (
                                <div key={index} className="relative">
                                  {/* Height label on top */}
                                  <div 
                                    className="absolute -top-5 left-0 text-xs text-blue-600 font-medium"
                                    style={{
                                      width: `${(height || 0) * 0.10}px`,
                                      textAlign: 'center'
                                    }}
                                  >
                                    {height}mm
                                  </div>
                                  
                                  {/* Width label on left */}
                                  <div 
                                    className="absolute -left-12 top-0 text-xs text-blue-600 font-medium flex items-center"
                                    style={{ 
                                      height: `${(width || 0) * 0.10}px`,
                                    }}
                                  >
                                    {width}mm
                                  </div>
                                  
                                  {/* Shutter Rectangle */}
                                  <div
                                    className="bg-blue-100 border-2 border-blue-400 rounded flex items-center justify-center"
                                    style={{
                                      width: `${(height || 0) * 0.10}px`,
                                      height: `${(width || 0) * 0.10}px`,
                                      minWidth: '80px',
                                      minHeight: '20px'
                                    }}
                                  >
                                    <span className="text-xs text-blue-700 font-medium">
                                      #{index + 1}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : null;
                      })()}
                      
                      {/* Colour Frame Section */}
                      <div className="space-y-3 pt-4 border-t border-slate-200">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-medium">Colour Frame (2400 × 80)</Label>
                          <Switch
                            checked={colourFrameEnabled}
                            onCheckedChange={(checked) => {
                              setColourFrameEnabled(checked);
                              if (checked) {
                                const shutterLaminate = form.getValues('shutterInnerLaminateCode') || '';
                                const shutterPlywood = form.getValues('A') || 'Apple Ply 16mm BWP';
                                const shutterGrainDirection = Boolean(form.getValues('shutterGrainDirection'));
                                setColourFrameForm({
                                  height: 2400,
                                  width: 80,
                                  laminateCode: shutterLaminate,
                                  quantity: 1,
                                  note: '',
                                  customLaminateCode: '',
                                  A: shutterPlywood,
                                  grainDirection: shutterGrainDirection
                                });
                              }
                            }}
                            data-testid="toggle-colour-frame"
                          />
                        </div>
                        
                        {colourFrameEnabled && (
                          <div className="space-y-4 pl-4 border-l-2 border-blue-200">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label className="text-sm">Height (mm)</Label>
                                <Input
                                  type="number"
                                  value={colourFrameForm.height}
                                  onChange={(e) => setColourFrameForm(prev => ({ ...prev, height: parseInt(e.target.value) || 2400 }))}
                                  className="text-sm"
                                  data-testid="input-colour-frame-height"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-sm">Width (mm)</Label>
                                <Input
                                  type="number"
                                  value={colourFrameForm.width}
                                  onChange={(e) => setColourFrameForm(prev => ({ ...prev, width: parseInt(e.target.value) || 80 }))}
                                  className="text-sm"
                                  data-testid="input-colour-frame-width"
                                />
                              </div>
                            </div>
                            
                            <div className="space-y-2">
                              <Label className="text-sm">Quantity</Label>
                              <Input
                                type="number"
                                value={colourFrameForm.quantity}
                                onChange={(e) => setColourFrameForm(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                                className="text-sm"
                                min="1"
                                data-testid="input-colour-frame-quantity"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* Visual Preview for Colour Frame */}
                      {colourFrameEnabled && colourFrameForm.height > 0 && colourFrameForm.width > 0 && (
                        <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                          <div className="text-xs text-blue-700 font-semibold mb-1 text-center">
                            Colour Frame Preview
                          </div>
                          <div className="text-xs text-blue-600 mb-3 text-center">
                            Laminate: {colourFrameForm.laminateCode || 'Not Set'}
                          </div>
                          <div className="flex flex-wrap gap-4 justify-center">
                            {Array.from({ length: colourFrameForm.quantity || 1 }, (_, index) => (
                              <div key={index} className="relative">
                                {/* Height label on top */}
                                <div 
                                  className="absolute -top-5 left-0 text-xs text-blue-600 font-medium"
                                  style={{
                                    width: `${(colourFrameForm.height || 0) * 0.10}px`,
                                    textAlign: 'center'
                                  }}
                                >
                                  {colourFrameForm.height}mm
                                </div>
                                
                                {/* Width label on left */}
                                <div 
                                  className="absolute -left-12 top-0 text-xs text-blue-600 font-medium flex items-center"
                                  style={{ 
                                    height: `${(colourFrameForm.width || 0) * 0.10}px`,
                                  }}
                                >
                                  {colourFrameForm.width}mm
                                </div>
                                
                                {/* Frame Rectangle */}
                                <div
                                  className="bg-blue-100 border-2 border-blue-400 rounded flex items-center justify-center"
                                  style={{
                                    width: `${(colourFrameForm.height || 0) * 0.10}px`,
                                    height: `${(colourFrameForm.width || 0) * 0.10}px`,
                                    minWidth: '80px',
                                    minHeight: '20px'
                                  }}
                                >
                                  <span className="text-xs text-blue-700 font-medium">
                                    #{index + 1}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Actions */}
                    <div className="flex items-center justify-end pt-4 border-t border-slate-200">
                      <div className="flex items-center gap-3">
                        <div className="flex space-x-2">
                          <Button type="submit" className="bg-primary-600 hover:bg-primary-700" data-testid="button-add-shutter">
                            <i className="fas fa-plus mr-2"></i>
                            Add Shutter
                          </Button>
                        </div>
                      </div>
                    </div>
                    </>
                    )}
                  </form>
                </Form>
              </CardContent>
              )}
            </Card>

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
                  if (cabinets.length > 0) {
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
                  } else {
                    toast({
                      title: "No Cabinet to Preview",
                      description: "Please add a cabinet first to see the preview.",
                      variant: "destructive"
                    });
                  }
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
                    <i className={`fas ${designCenterVisible ? 'fa-eye-slash' : 'fa-eye'} text-slate-600`}></i>
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
            
            {/* Quick Stats Overview */}
            {cabinets.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 shadow-lg">
                  <CardContent className="p-4">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center mr-3">
                        <i className="fas fa-cube text-white text-sm"></i>
                      </div>
                      <div>
                        <div className="text-xs text-blue-600">Total Cabinets</div>
                        <div className="text-lg font-bold text-blue-800">{cabinets.length}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 shadow-lg">
                  <CardContent className="p-4">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center mr-3">
                        <i className="fas fa-th-large text-white text-sm"></i>
                      </div>
                      <div>
                        <div className="text-xs text-green-600">Total Panels</div>
                        <div className="text-lg font-bold text-green-800">{cuttingListSummary.totalPanels}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 shadow-lg">
                  <CardContent className="p-4">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center mr-3">
                        <i className="fas fa-expand text-white text-sm"></i>
                      </div>
                      <div>
                        <div className="text-xs text-purple-600">Total Area</div>
                        <div className="text-lg font-bold text-purple-800">{cuttingListSummary.totalArea.toFixed(1)} m²</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200 shadow-lg">
                  <CardContent className="p-4">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center mr-3">
                        <i className="fas fa-door-open text-white text-sm"></i>
                      </div>
                      <div>
                        <div className="text-xs text-orange-600">Shutters</div>
                        <div className="text-lg font-bold text-orange-800">
                          {cabinets.reduce((total, cabinet) => total + (cabinet.shuttersEnabled ? cabinet.shutterCount : 0), 0)}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
            
            {/* Material Summary Card */}
            {cabinets.length > 0 && (
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-300 shadow-xl">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between text-gray-900">
                    <div className="flex items-center">
                      <i className="fas fa-boxes mr-2 text-blue-600"></i>
                      Material Requirements
                    </div>
                    <span className="px-3 py-1 bg-blue-500 text-white text-xs font-bold rounded-full shadow-sm">
                      ESTIMATE
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* 1. PLYWOOD LIST */}
                    <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200">
                      <div className="bg-amber-600 text-white px-4 py-2 font-bold text-sm flex items-center">
                        <i className="fas fa-layer-group mr-2"></i>
                        PLYWOOD SHEETS - Total: {liveMaterialSummary.totalPlywoodSheets}
                      </div>
                      <div className="divide-y divide-gray-200">
                        {Object.keys(liveMaterialSummary.plywood).length > 0 ? (
                          Object.entries(liveMaterialSummary.plywood)
                            .sort(([, a], [, b]) => b - a)
                            .map(([brand, count], idx) => (
                              <div key={brand} className="flex justify-between items-center px-4 py-3 hover:bg-gray-50">
                                <div className="flex items-center">
                                  <span className="w-6 h-6 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center text-xs font-bold mr-3">
                                    {idx + 1}
                                  </span>
                                  <span className="text-sm font-medium text-gray-800">{brand}</span>
                                </div>
                                <span className="text-lg font-bold text-amber-600">{count}</span>
                              </div>
                            ))
                        ) : (
                          <div className="px-4 py-3 text-sm text-gray-500 italic">No plywood required</div>
                        )}
                      </div>
                    </div>

                    {/* 2. LAMINATE LIST */}
                    {Object.keys(liveMaterialSummary.laminates).length > 0 && (
                      <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200">
                        <div className="bg-blue-600 text-white px-4 py-2 font-bold text-sm flex items-center">
                          <i className="fas fa-paint-roller mr-2"></i>
                          LAMINATE SHEETS - Total: {Object.values(liveMaterialSummary.laminates).reduce((sum, count) => sum + count, 0)}
                        </div>
                        <div className="divide-y divide-gray-200">
                          {Object.entries(liveMaterialSummary.laminates)
                            .sort(([, a], [, b]) => b - a)
                            .map(([code, count], idx) => (
                              <div key={code} className="flex justify-between items-center px-4 py-3 hover:bg-gray-50">
                                <div className="flex items-center">
                                  <span className="w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold mr-3">
                                    {idx + 1}
                                  </span>
                                  <span className="text-sm font-medium text-gray-800">{code}</span>
                                </div>
                                <span className="text-lg font-bold text-blue-600">{count}</span>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                    
                    <div className="text-xs text-blue-700 bg-blue-50 p-3 rounded-lg border border-blue-200 flex items-start">
                      <i className="fas fa-info-circle mr-2 mt-0.5"></i>
                      <span>These are optimized estimates based on actual sheet layout. Generate PDF preview for exact counts after optimization.</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            
            {/* Cutting List Summary */}
            {cabinets.length > 0 && (
              <Card className="bg-white border-gray-200 shadow-xl">
                <CardHeader>
                  <CardTitle className="flex items-center text-gray-900">
                    <i className="fas fa-list-alt mr-2 text-blue-400"></i>
                    Cutting List Summary
                    <span className="ml-2 px-2 py-1 bg-blue-400/20 text-blue-600 text-xs rounded-full border border-blue-400/30">
                      {cuttingListSummary.totalPanels} panels
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {cuttingListSummary.panelGroups.map((group, index) => (
                      <div key={index} className="border border-blue-400/30 rounded-lg p-3 bg-blue-50/50">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center">
                            <div className="w-3 h-3 bg-blue-400 rounded-full mr-2 shadow-sm"></div>
                            <span className="font-medium text-sm text-gray-300">
                              {group.laminateCode}
                            </span>
                          </div>
                          <span className="text-xs text-slate-600">
                            {group.panels.length} panels
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-600">
                          <div>
                            <div className="font-medium">Total Area:</div>
                            <div>{group.totalArea.toFixed(2)} m²</div>
                          </div>
                          <div>
                            <div className="font-medium">Panels:</div>
                            <div className="max-h-16 overflow-y-auto">
                              {group.panels.slice(0, 3).map((panel, idx) => (
                                <div key={idx} className="text-xs text-slate-500">
                                  {panel.width}×{panel.height}mm
                                </div>
                              ))}
                              {group.panels.length > 3 && (
                                <div className="text-xs text-slate-400">
                                  +{group.panels.length - 3} more...
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    <div className="border-t border-slate-200 pt-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <div className="text-blue-600">Total Panels:</div>
                          <div className="font-semibold text-white">
                            {cuttingListSummary.totalPanels}
                          </div>
                        </div>
                        <div>
                          <div className="text-blue-600">Total Area:</div>
                          <div className="font-semibold text-white">
                            {cuttingListSummary.totalArea.toFixed(2)} m²
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      <Button
                        onClick={exportToExcel}
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        <i className="fas fa-file-excel mr-1"></i>
                        Excel
                      </Button>
                      <Button
                        onClick={exportToGoogleSheets}
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        <i className="fab fa-google mr-1"></i>
                        Sheets
                      </Button>
                      <Button
                        onClick={printList}
                        variant="outline"
                        size="sm"
                      >
                        <i className="fas fa-print mr-1"></i>
                        Print
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Cabinet List */}
            <Card className="bg-white border-gray-200 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center text-slate-900">
                  <i className="fas fa-cube mr-2 text-blue-600"></i>
                  Configured Cabinets
                  <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                    {cabinets.length}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {cabinets.map((cabinet) => (
                  <div key={cabinet.id} className="border border-slate-200 rounded-lg p-4 mb-3 last:mb-0">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="text-sm font-medium text-slate-900">{cabinet.name}</h4>
                        <div className="text-xs text-slate-500">
                          {cabinetTypes.find(t => t.value === cabinet.type)?.label} • 18mm thickness
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeCabinet(cabinet.id)}
                        className="text-red-600 hover:text-red-700 p-1"
                      >
                        <i className="fas fa-trash text-sm"></i>
                      </Button>
                    </div>
                    
                    {/* Dimensions & Details */}
                    <div className="text-xs text-slate-500 space-y-1">
                      <div className="font-medium text-slate-700">Dimensions:</div>
                      <div>{cabinet.height}mm H × {cabinet.width}mm W</div>
                      <div>
                        {cabinet.shuttersEnabled ? `${cabinet.shutterCount} Shutters included` : 'No shutters'}
                      </div>
                      <div>
                        5 Panels
                      </div>
                    </div>
                  </div>
                ))}
                
                <Button
                  variant="outline"
                  className="w-full mt-4 border-2 border-dashed border-slate-300 text-slate-600 hover:border-slate-400 hover:text-slate-700"
                  onClick={() => {
                    form.reset({
                      id: crypto.randomUUID(),
                      name: `Shutter #${cabinets.length + 1}`,
                      height: 800,
                      width: 600,
                      depth: 450,
                      shuttersEnabled: false,
                      shutterCount: 1,
                      shutterType: 'Standard',
                      shutters: [
                        { width: 282, height: 784 },
                        { width: 282, height: 784 }
                      ],
                      topPanelLaminateCode: '',
                      bottomPanelLaminateCode: '',
                      leftPanelLaminateCode: '',
                      rightPanelLaminateCode: '',
                      backPanelLaminateCode: '',
                      topPanelInnerLaminateCode: 'off white',
                      bottomPanelInnerLaminateCode: 'off white',
                      leftPanelInnerLaminateCode: 'off white',
                      rightPanelInnerLaminateCode: 'off white',
                      backPanelInnerLaminateCode: 'off white',
                      innerLaminateCode: 'off white'
                    });
                  }}
                >
                  <i className="fas fa-plus mr-2"></i>
                  Add Another Cabinet
                </Button>
              </CardContent>
            </Card>

          </div>
        </div>
      </main>
      
      {/* Preview Dialog */}
      <Dialog open={showPreviewDialog} onOpenChange={(open) => {
        setShowPreviewDialog(open);
        // Reset deleted sheets when opening preview
        if (open) {
          setDeletedPreviewSheets(new Set());
        }
      }}>
        <DialogContent className="max-w-7xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Cutting Layout Preview</DialogTitle>
          </DialogHeader>
          {cabinets.length > 0 && (() => {
            // Use memoized brandResults to prevent recalculation on every keystroke
            const brandResults = previewBrandResults;
            
            // Sheet dimensions
            const currentSheetWidth = sheetWidth;
            const currentSheetHeight = sheetHeight;
            const currentKerf = kerf;
            
            // Helper function to generate laminate display text
            const getLaminateDisplay = (laminateCode: string): string => {
              if (!laminateCode) return 'None';
              return laminateCode;
            };
            
            // STEP 3: Handle unplaced manual panels (create separate sheets)
            const placedManualPanelIds = new Set<string>(); // Will be empty since manual panels are processed in useMemo
            const unplacedManualPanels = manualPanels.filter(mp => !placedManualPanelIds.has(mp.id));
            if (unplacedManualPanels.length > 0) {
              const unplacedByGroup = unplacedManualPanels.reduce((acc, mp) => {
                const brand = mp.A;
                const laminateCode = mp.laminateCode || '';
                const isBackPanel = mp.targetSheet?.isBackPanel || false;
                const groupKey = `${normalizeForGrouping(brand)}|||${normalizeForGrouping(laminateCode)}|||${isBackPanel}`;
                if (!acc[groupKey]) acc[groupKey] = { brand, laminateCode, isBackPanel, panels: [] };
                acc[groupKey].panels.push(mp);
                return acc;
              }, {} as Record<string, { brand: string; laminateCode: string; isBackPanel: boolean; panels: typeof unplacedManualPanels }>);
              
              Object.entries(unplacedByGroup).forEach(([groupKey, group]) => {
                const manualParts = group.panels.flatMap(mp => 
                  Array(mp.quantity).fill(null).map((_, idx) => ({
                    id: `${mp.name} (Manual)`,
                    w: mp.width,
                    h: mp.height,
                    nomW: mp.width,
                    nomH: mp.height,
                    qty: 1,
                    rotate: mp.grainDirection ? false : true,
                    gaddi: mp.gaddi === true,
                    grainDirection: mp.grainDirection === true,
                    laminateCode: mp.laminateCode || ''
                  }))
                );
                
                const result = optimizeCutlist({ parts: manualParts, sheet: { w: currentSheetWidth, h: currentSheetHeight, kerf: currentKerf }, timeMs: getOptimizationTimeMs(manualParts.length) });
                const laminateDisplay = getLaminateDisplay(group.laminateCode);
                
                const prefix = group.isBackPanel ? 'back' : 'regular';
                if (result?.panels) {
                  result.panels.forEach((sheet: any, sheetIdx: number) => {
                    sheet._sheetId = `${prefix}-${groupKey}-manual-${sheetIdx}`;
                    // Restore grain and compute display dims for every placed panel
                    sheet.placed?.forEach((p: any) => { 
                      const found = group.panels.find(gp => String(gp.id) === String(p.id) || String(gp.id) === String(p.origId));
                      if (found) {
                        p.grainDirection = found.grainDirection ?? null;
                        p.type = (found as any).name || p.name;
                        p.depth = (found as any).width ?? p.width ?? 450;
                      }
                      computeDisplayDims(p);
                    });
                  });
                }
                
                brandResults.push({ 
                  brand: group.brand, 
                  laminateCode: group.laminateCode, 
                  laminateDisplay,
                  result, 
                  isBackPanel: group.isBackPanel 
                });
              });
            }
            
            // STEP 4: Handle Colour Frame (merge with matching plywood + laminate if exists)
            console.log('🎨 STEP 4 Check - colourFrameEnabled:', colourFrameEnabled, 'quantity:', colourFrameForm.quantity);
            if (colourFrameEnabled && colourFrameForm.quantity > 0) {
              console.log('✅ STEP 4 EXECUTING - Processing colour frame');
              
              // Create colour frame parts
              const colourFrameParts = Array(colourFrameForm.quantity).fill(null).map((_, idx) => ({
                id: `Colour Frame (${idx + 1})`,
                w: colourFrameForm.width,
                h: colourFrameForm.height,
                nomW: colourFrameForm.width,
                nomH: colourFrameForm.height,
                qty: 1,
                rotate: colourFrameForm.grainDirection ? false : true,
                gaddi: false,
                grainDirection: colourFrameForm.grainDirection,
                laminateCode: colourFrameForm.laminateCode || ''
              }));
              
              // Find matching brandResult (same plywood + laminates)
              const matchingBrandIdx = brandResults.findIndex(br => 
                br.brand === colourFrameForm.A && 
                br.laminateCode === (colourFrameForm.laminateCode || '')
              );
              
              if (matchingBrandIdx !== -1) {
                // Merge with existing result
                console.log('✅ Colour Frame MERGED with existing sheet');
                const existingBrand = brandResults[matchingBrandIdx];
                
                // Re-optimize both sets of parts together
                // Filter out old colour frame parts to prevent duplication on re-render
                const allParts = [
                  ...(existingBrand.result?.panels?.[0]?.placed
                    ?.filter((p: any) => !p.id.includes('Colour Frame'))
                    ?.map((p: any) => ({
                      id: p.id,
                      w: p.w,
                      h: p.h,
                      nomW: p.nomW,
                      nomH: p.nomH,
                      qty: 1,
                      rotate: p.rotated ? false : p.rotateAllowed,
                      gaddi: p.gaddi,
                      grainDirection: p.grainDirection,
                      laminateCode: p.laminateCode
                    })) || []),
                  ...colourFrameParts
                ];
                
                const mergedResult = optimizeCutlist({ parts: allParts, sheet: { w: currentSheetWidth, h: currentSheetHeight, kerf: currentKerf }, timeMs: getOptimizationTimeMs(allParts.length) });
                
                if (mergedResult?.panels) {
                  mergedResult.panels.forEach((sheet: any, sheetIdx: number) => {
                    sheet._sheetId = `${normalizeForGrouping(colourFrameForm.A)}|||${normalizeForGrouping(colourFrameForm.laminateCode)}-${sheetIdx}`;
                    // Restore grain and compute display dims for every placed panel
                    sheet.placed?.forEach((p: any) => { 
                      const found = allParts.find(gp => String(gp.id) === String(p.id) || String(gp.id) === String(p.origId));
                      if (found) {
                        p.grainDirection = found.grainDirection ?? null;
                        p.type = (found as any).name || p.name;
                        p.depth = (found as any).width ?? p.width ?? 450;
                      }
                      computeDisplayDims(p);
                    });
                  });
                }
                
                // Update the existing brandResult with merged data
                brandResults[matchingBrandIdx] = {
                  ...existingBrand,
                  result: mergedResult
                };
              } else {
                // Create new entry if no match
                console.log('✅ Colour Frame created NEW sheet (no matching plywood/laminate)');
                const colourFrameResult = optimizeCutlist({ parts: colourFrameParts, sheet: { w: currentSheetWidth, h: currentSheetHeight, kerf: currentKerf }, timeMs: getOptimizationTimeMs(colourFrameParts.length) });
                const colourFrameLaminateDisplay = getLaminateDisplay(colourFrameForm.laminateCode);
                
                if (colourFrameResult?.panels) {
                  colourFrameResult.panels.forEach((sheet: any, sheetIdx: number) => {
                    sheet._sheetId = `colour-frame-${sheetIdx}`;
                    sheet.placed?.forEach((p: any) => { 
                      const found = colourFrameParts.find(gp => String(gp.id) === String(p.id) || String(gp.id) === String(p.origId));
                      if (found) {
                        p.grainDirection = found.grainDirection ?? null;
                        p.type = (found as any).name || p.name;
                        p.depth = (found as any).width ?? p.width ?? 450;
                      }
                      computeDisplayDims(p);
                    });
                  });
                }
                
                brandResults.push({ 
                  brand: colourFrameForm.A,
                  laminateCode: colourFrameForm.laminateCode || '',
                  laminateDisplay: colourFrameLaminateDisplay,
                  result: colourFrameResult, 
                  isBackPanel: false 
                });
              }
            } else {
              console.log('❌ STEP 4 SKIPPED - colourFrameEnabled is false or quantity is 0');
            }
            
            // Helper to render a sheet
            const renderSheet = (sheetData: any, title: string, brand: string, laminateDisplay: string, isBackPanel: boolean, sheetId: string, pageNumber: number) => {
              if (!sheetData || !sheetData.placed || sheetData.placed.length === 0) return null;
              
              // Skip if deleted
              if (deletedPreviewSheets.has(sheetId)) return null;
              
              // Calculate scale to fit in preview (portrait orientation)
              const containerHeight = 800; // px
              const scale = containerHeight / currentSheetHeight; // scale based on sheet height
              const scaledWidth = currentSheetWidth * scale; // sheet width
              
              const handleDelete = () => {
                setDeletedPreviewSheets(prev => new Set([...Array.from(prev), sheetId]));
              };
              
              // Laminate code font size
              const laminateFontSize = 'text-xs';
              
              return (
                <div className="bg-white border-2 border-black p-4 mb-6 relative" style={{ display: 'block', width: '100%' }}>
                  {/* Header */}
                  <div className="flex justify-between items-start border-b-2 border-black pb-2 mb-4 gap-4">
                    <div className="text-sm flex-shrink-0">
                      <p className="font-bold text-lg">Maya Interiors</p>
                      <p>Sheet Size: {currentSheetWidth}×{currentSheetHeight} mm</p>
                      <p>Kerf: {kerf} mm</p>
                    </div>
                    <div className="text-right text-xs space-y-0.5 flex-shrink-0 min-w-fit">
                      <p className="font-semibold whitespace-nowrap">Plywood: {brand}</p>
                      {(() => {
                        const roomNames = Array.from(new Set(cabinets.map(c => c.roomName).filter((r): r is string => Boolean(r))));
                        if (roomNames.length > 0) {
                          return <p className="font-normal whitespace-nowrap">Room: {roomNames.join(', ')}</p>;
                        }
                        return null;
                      })()}
                      {(() => {
                        // Split laminate display into front and inner
                        const parts = laminateDisplay.split(' + ');
                        const frontLaminate = parts[0] || 'None';
                        const innerLaminate = parts[1] || parts[0] || 'None';
                        
                        return (
                          <>
                            <p className={`font-normal whitespace-nowrap ${laminateFontSize}`}>Front Laminate: {frontLaminate}</p>
                            <p className={`font-normal whitespace-nowrap ${laminateFontSize}`}>Inner Laminate: {innerLaminate}</p>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                  
                  {/* Create panel summary first (group by nominal size for letter codes) */}
                  {(() => {
                    const panelSummary: { [key: string]: { letterCode: string; count: number; width: number; height: number } } = {};
                    let uniqueSizeIndex = 0;
                    console.group('🔍 WOOD GRAIN RENDER TEST - Panel Summary Creation');
                    sheetData.placed.forEach((p: any, idx: number) => {
                      // For wood grain panels, use nominal dimensions. For others, use display dims
                      let panelW: number, panelH: number;
                      const hasGrain = p.grainDirection === true;
                      if (hasGrain && p.nomW && p.nomH) {
                        panelW = p.nomW;
                        panelH = p.nomH;
                        console.log(`  [${idx}] GRAIN=TRUE: "${p.id}" → Using nomW=${p.nomW}, nomH=${p.nomH}`);
                      } else {
                        const { displayW, displayH } = getDisplayDims(p);
                        panelW = displayW;
                        panelH = displayH;
                        console.log(`  [${idx}] GRAIN=${hasGrain}: "${p.id}" → Using displayW=${displayW}, displayH=${displayH}`);
                      }
                      const sizeKey = `${Math.round(panelW)}x${Math.round(panelH)}`;
                      console.log(`       rotate=${p.rotate}, sizeKey="${sizeKey}"`);
                      
                      if (!panelSummary[sizeKey]) {
                        panelSummary[sizeKey] = {
                          letterCode: String.fromCharCode(65 + uniqueSizeIndex),
                          count: 0,
                          width: Math.round(panelW),
                          height: Math.round(panelH)
                        };
                        uniqueSizeIndex++;
                      }
                      panelSummary[sizeKey].count++;
                    });
                    console.log('Panel Summary:', panelSummary);
                    console.groupEnd();

                    // Convert to sorted array for display
                    const panelSizesList = Object.entries(panelSummary)
                      .map(([key, value]) => ({ key, ...value }))
                      .sort((a, b) => {
                        if (a.width !== b.width) return b.width - a.width;
                        return b.height - a.height;
                      });

                    return (
                      <>
                        {/* Container for panel sizes list, sheet, and grain indicator - ensure vertical stacking */}
                        <div className="relative flex items-start gap-4 mx-auto w-full" style={{ width: 'fit-content' }}>
                          {/* Panel Sizes List - Left Column */}
                          <div className="bg-white border-2 border-black p-3" style={{ minWidth: '180px' }}>
                            <p className="font-bold text-sm mb-2 border-b-2 border-black pb-1">Panel Sizes:</p>
                            <div className="space-y-1">
                              {panelSizesList.map((size) => (
                                <p key={size.key} className="text-xs font-mono">
                                  {size.letterCode} - {size.width}×{size.height} <span className="ml-1">( {size.count} )</span>
                                </p>
                              ))}
                            </div>
                          </div>

                          {/* Sheet Layout - Portrait Orientation */}
                          <div 
                            className="relative bg-gray-50 border-2 border-black"
                            style={{ width: `${scaledWidth}px`, height: `${containerHeight}px` }}
                          >
                            {/* Simple Grain Direction Arrow - Left Bottom - Only for sheets with wood grains enabled */}
                            {sheetData.placed.some((p: any) => p.grainDirection === true && p.laminateCode && p.laminateCode.trim() !== '') && (
                              <div 
                                className="absolute left-2 bottom-2 flex items-center gap-1 bg-white border border-black px-2 py-1 rounded"
                                style={{ fontSize: '10px' }}
                              >
                                <div className="flex flex-col items-center">
                                  <div className="w-0 h-0 border-l-[3px] border-l-transparent border-r-[3px] border-r-transparent border-b-[6px] border-b-black"></div>
                                  <div className="w-[2px] bg-black h-[20px]"></div>
                                </div>
                                <span className="font-bold">Grain</span>
                              </div>
                            )}
                          
                            {(() => {
                              console.group('🔍 WOOD GRAIN RENDER TEST - Panel Rendering');
                              return sheetData.placed.map((panel: any, idx: number) => {
                                const { displayW, displayH } = getDisplayDims(panel);
                                const panelUniqueId = `${sheetId}-${panel.id}`;
                                
                                if (deletedPreviewPanels.has(panelUniqueId)) {
                                  return null;
                                }
                                
                                const x = panel.x * scale;
                                const y = panel.y * scale;
                                const w = panel.w * scale;
                                const h = panel.h * scale;
                                
                                const panelName = panel.id.toUpperCase().includes('CENTER POST') ? 'CENTER POST' :
                                                 panel.id.toUpperCase().includes('SHELF') ? 'SHELF' :
                                                 panel.id.toUpperCase().includes('LEFT') ? 'LEFT' :
                                                 panel.id.toUpperCase().includes('RIGHT') ? 'RIGHT' :
                                                 panel.id.toUpperCase().includes('TOP') ? 'TOP' :
                                                 panel.id.toUpperCase().includes('BOTTOM') ? 'BOTTOM' :
                                                 panel.id.toUpperCase().includes('BACK') ? 'BACK' : 
                                                 panel.id;
                                
                                const isGaddi = panel.gaddi === true;
                                
                                // ✅ CRITICAL: Use computed display dimensions (X/Y based on panel type)
                                const showW = panel.displayWidth ?? displayW;
                                const showH = panel.displayHeight ?? displayH;
                                
                                console.log(`  Panel[${idx}] ${panelName}:`);
                                console.log(`    - grainDirection: ${panel.grainDirection} (RESTORED: ${panel.grainDirection === true ? '✅' : '❌'})`);
                                console.log(`    - rotate: ${panel.rotate} (SHOULD BE FALSE for grain=true)`);
                                console.log(`    - nomW/nomH: ${panel.nomW}×${panel.nomH} (ORIGINAL)`);
                                console.log(`    - displayW/displayH: ${displayW}×${displayH} (FROM OPTIMIZER)`);
                                console.log(`    - showW/showH: ${showW}×${showH} (DISPLAYED TO USER) ${panel.grainDirection ? '← USING NOMINAL' : '← USING DISPLAY'}`);
                                if (panelName === 'TOP' || panelName === 'BOTTOM') {
                                  console.log(`    - TOP/BOTTOM CHECK: Showing nomW=${showW} on Y-axis, nomH=${showH} on X-axis ✅`);
                                } else if (panelName === 'LEFT' || panelName === 'RIGHT') {
                                  console.log(`    - LEFT/RIGHT CHECK: Showing nomW=${showW} on X-axis (depth), nomH=${showH} on Y-axis (height) ✅`);
                                }
                                console.log(`    - Verdict: ${panel.grainDirection && panel.rotate === false ? '✅ CORRECT' : '❌ ERROR'}`);
                                
                                return (
                                  <div
                                    key={idx}
                                    className="absolute border-2 border-black bg-white flex flex-col items-start justify-start p-1"
                                    style={{
                                      left: `${x}px`,
                                      top: `${y}px`,
                                      width: `${w}px`,
                                      height: `${h}px`
                                    }}
                                  >
                                    {/* Only show panel name and dimensions on panels >= 200mm in both dimensions */}
                                    {panel.w >= 200 && panel.h >= 200 && (
                                      <>
                                        {/* Dimensions - Top Right - Responsive font size with padding to avoid overlap */}
                                        <p 
                                          className="absolute font-semibold"
                                          style={{
                                            right: '8px',
                                            top: '4px',
                                            fontSize: `${Math.max(8, Math.min(14, w / 12, h / 8))}px`
                                          }}
                                        >
                                          {Math.round(showW)}×{Math.round(showH)}
                                        </p>
                                        
                                        {/* Panel name - Bottom Center - Responsive font size */}
                                        <p 
                                          className="absolute font-bold uppercase"
                                          style={{
                                            left: '50%',
                                            bottom: '2px',
                                            transform: 'translateX(-50%)',
                                            fontSize: `${Math.max(9, Math.min(16, w / 10, h / 6))}px`
                                          }}
                                        >
                                          {panelName}
                                        </p>
                                        
                                        {/* Wood Grain Indicator - Only when wood grains enabled - Bottom Center, above panel name */}
                                        {panel.grainDirection === true && (
                                          <div 
                                            className="absolute flex items-center gap-0.5"
                                            style={{
                                              left: '50%',
                                              bottom: '16px',
                                              transform: 'translateX(-50%)'
                                            }}
                                          >
                                            <span className="text-[12px] font-bold text-green-600" title="Wood Grain ON">↕</span>
                                          </div>
                                        )}
                                      </>
                                    )}
                                    {/* Letter Code - ALWAYS visible on all panels */}
                                    {(() => {
                                      const sizeKey = `${Math.round(showW)}x${Math.round(showH)}`;
                                      const letterCode = panelSummary[sizeKey]?.letterCode || 'X';
                                      const fontSize = Math.max(12, Math.min(48, w / 3, h / 2));
                                      
                                      return (
                                        <p 
                                          className="absolute font-bold text-gray-200"
                                          style={{
                                            left: '50%',
                                            top: '50%',
                                            transform: 'translate(-50%, -50%)',
                                            fontSize: `${fontSize}px`
                                          }}
                                        >
                                          {letterCode}
                                        </p>
                                      );
                                    })()}
                                    
                                    {/* GADDI Dotted Line - Red marking for nomW (TOP/BOTTOM) or nomH (LEFT/RIGHT) */}
                                    {isGaddi && (() => {
                                      const type = panelName.toUpperCase();
                                      const isLeftRight = type.includes('LEFT') || type.includes('RIGHT');
                                      const isTopBottom = type.includes('TOP') || type.includes('BOTTOM');
                                      
                                      if (!isLeftRight && !isTopBottom) return null;
                                      
                                      // For both panel types: check where the dimension is placed
                                      // TOP/BOTTOM: width placement
                                      // LEFT/RIGHT: height placement
                                      const dimensionOnXAxis = w >= h;
                                      const drawHorizontal = dimensionOnXAxis;
                                      
                                      return (
                                        <div 
                                          className="absolute"
                                          style={{ 
                                            left: '2px',
                                            top: '2px',
                                            right: drawHorizontal ? '2px' : 'auto',
                                            bottom: !drawHorizontal ? '2px' : 'auto',
                                            width: drawHorizontal ? 'calc(100% - 4px)' : '0px',
                                            height: !drawHorizontal ? 'calc(100% - 4px)' : '0px',
                                            borderTop: drawHorizontal ? '2px dotted #FF0000' : 'none',
                                            borderLeft: !drawHorizontal ? '2px dotted #FF0000' : 'none'
                                          }}
                                          title={`GADDI: Mark ${isLeftRight ? 'Height (nomH)' : 'Width (nomW)'}`}
                                        />
                                      );
                                    })()}
                                    
                                  </div>
                                );
                              });
                            })()}
                            </div>
                        </div>
                        
                        <div className="mt-2 text-xs text-gray-600 border-t pt-2">
                          <p>Total Panels: {sheetData.placed.length}</p>
                        </div>
                        
                        {/* Action Buttons at Bottom */}
                        <div className="mt-4 flex justify-center gap-3 hide-for-export">
                    <button
                      onClick={() => {
                        // Extract laminate code from the sheet
                        const firstPanel = sheetData.placed[0];
                        let laminateCode = '';
                        
                        if (firstPanel && firstPanel.metadata) {
                          laminateCode = firstPanel.metadata.laminateCode || '';
                        }
                        
                        // Set the sheet context with unique sheet ID
                        setSelectedSheetContext({
                          brand,
                          laminateCode,
                          isBackPanel,
                          sheetId
                        });
                        
                        // Pre-fill form with sheet's properties
                        setManualPanelForm({
                          name: 'Manual Panel',
                          height: '',
                          width: '',
                          laminateCode,
                          A: brand,
                          quantity: 1,
                          grainDirection: false,
                          gaddi: false
                        });
                        
                        // Open the dialog
                        setShowManualPanelDialog(true);
                      }}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-bold shadow-md transition-colors"
                      data-testid={`button-add-panel-${sheetId}`}
                    >
                      + Add Panel
                    </button>
                          <button
                            onClick={handleDelete}
                            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded font-bold shadow-md transition-colors"
                            data-testid={`button-delete-sheet-${sheetId}`}
                          >
                            Delete Page
                          </button>
                        </div>
                        
                        {/* Page Number */}
                        <div className="text-sm font-semibold text-gray-700 mt-4 text-right">
                          Page {pageNumber} of {totalPages}
                        </div>
                      </>
                    );
                  })()}
                </div>
              );
            };
            
            // Calculate material summary (grouped by plywood brand + laminate)
            const materialSummary = brandResults.reduce((acc, brandResult) => {
              const sheets = brandResult.result?.panels || [];
              const nonDeletedSheets = sheets.filter((sheet: any) => !deletedPreviewSheets.has(sheet._sheetId || `fallback-${brandResults.indexOf(brandResult)}-${sheets.indexOf(sheet)}`));
              const sheetCount = nonDeletedSheets.length;
              
              if (sheetCount > 0) {
                const key = `${brandResult.brand}|||${brandResult.laminateDisplay}`;
                if (!acc[key]) {
                  acc[key] = {
                    brand: brandResult.brand,
                    laminateDisplay: brandResult.laminateDisplay,
                    count: 0
                  };
                }
                acc[key].count += sheetCount;
              }
              
              return acc;
            }, {} as Record<string, { brand: string; laminateDisplay: string; count: number }>);
            
            // Calculate laminate summary (count sheets needed to laminate plywood sheets)
            // NOTE: Laminate sheets are the SAME SIZE as plywood sheets
            // Each plywood sheet needs laminate on both faces (front + inner)
            const laminateSummary = brandResults.reduce((acc, brandResult) => {
              const sheets = brandResult.result?.panels || [];
              
              // Count non-deleted PLYWOOD SHEETS (not panels!)
              const plywoodSheetCount = sheets.filter((sheet: any) => {
                const sheetId = sheet._sheetId || `fallback-${brandResults.indexOf(brandResult)}-${sheets.indexOf(sheet)}`;
                return !deletedPreviewSheets.has(sheetId);
              }).length;
              
              if (plywoodSheetCount > 0) {
                // Split laminate code to get front AND inner laminates
                const laminateDisplay = brandResult.laminateDisplay;
                const laminateParts = laminateDisplay
                  .split('+')
                  .map(part => part.trim())
                  .filter(part => part && part !== 'None' && !part.match(/^Backer$/i));
                
                // Each plywood sheet needs 1 laminate sheet for front face + 1 for inner face
                laminateParts.forEach(laminate => {
                  if (!acc[laminate]) {
                    acc[laminate] = 0;
                  }
                  acc[laminate] += plywoodSheetCount; // Add plywood sheet count, not panel count!
                });
              }
              
              return acc;
            }, {} as Record<string, number>);
            
            // Calculate total panels
            console.log('🔍 Summary Page - brandResults count:', brandResults.length);
            console.log('🔍 Summary Page - brandResults:', brandResults.map(br => ({ brand: br.brand, sheetsCount: br.result?.panels?.length || 0 })));
            
            const totalPanels = brandResults.reduce((total, brandResult) => {
              const sheets = brandResult.result?.panels || [];
              console.log(`📊 Processing brandResult: ${brandResult.brand}, sheets count: ${sheets.length}`);
              
              const brandTotal = sheets.reduce((sheetTotal: number, sheet: any, sheetIdx: number) => {
                const sheetId = sheet._sheetId || `fallback-${brandResults.indexOf(brandResult)}-${sheets.indexOf(sheet)}`;
                const isDeleted = deletedPreviewSheets.has(sheetId);
                console.log(`  Sheet ${sheetIdx}: sheetId="${sheetId}", deleted=${isDeleted}`);
                
                if (isDeleted) return sheetTotal;
                
                const placed = sheet.placed || [];
                console.log(`  Sheet ${sheetIdx}: placed panels count = ${placed.length}`);
                
                const nonDeletedPanels = placed.filter((panel: any) => {
                  const panelUniqueId = `${sheetId}-${panel.id}`;
                  return !deletedPreviewPanels.has(panelUniqueId);
                });
                console.log(`  Sheet ${sheetIdx}: non-deleted panels count = ${nonDeletedPanels.length}`);
                
                return sheetTotal + nonDeletedPanels.length;
              }, 0);
              
              console.log(`📊 Brand "${brandResult.brand}" total panels: ${brandTotal}`);
              return total + brandTotal;
            }, 0);
            
            console.log('🎯 FINAL totalPanels:', totalPanels);
            
            // Get unique room names
            const roomNames = Array.from(new Set(cabinets.map(c => c.roomName).filter((r): r is string => Boolean(r))));
            
            // Calculate total pages for page numbering (only cutting sheets, NOT summary page)
            const totalPages = brandResults.reduce((total, br) => {
              const sheets = br.result?.panels || [];
              return total + sheets.filter((s: any) => {
                const sheetId = s._sheetId || `fallback-${brandResults.indexOf(br)}-${sheets.indexOf(s)}`;
                return s.placed && s.placed.length > 0 && !deletedPreviewSheets.has(sheetId);
              }).length;
            }, 0);
            
            return (
              <>
                <div id="pdf-preview" className="space-y-6">
                  {/* Summary Page - First Page of PDF */}
                  <div className="summary-page bg-white border-2 border-black p-6" style={{ minHeight: '800px', maxWidth: '800px', margin: '0 auto' }}>
                    <div className="space-y-4">
                      {/* Header - Single Row */}
                      <div className="flex justify-between items-center border-b-2 border-black pb-2">
                        <h1 className="text-2xl font-bold">Maya Interiors</h1>
                        <h2 className="text-lg text-gray-700">Cutting List Summary</h2>
                      </div>
                      
                      {/* Project Details - All in Single Row */}
                      <div className="border-b border-black pb-2">
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                          {clientName && (
                            <span><span className="font-semibold">Client:</span> {clientName}</span>
                          )}
                          {roomNames.length > 0 && (
                            <span><span className="font-semibold">Room(s):</span> {roomNames.join(', ')}</span>
                          )}
                          <span><span className="font-semibold">Date:</span> {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                          <span><span className="font-semibold">Cabinets:</span> {cabinets.length}</span>
                          <span><span className="font-semibold">Total Panels:</span> <span className="font-bold text-green-600">{totalPanels}</span></span>
                        </div>
                      </div>
                      
                      {/* Material Summary */}
                      <div className="space-y-1">
                        <h3 className="text-lg font-bold border-b border-black pb-1">Material Summary</h3>
                        <div className="space-y-0.5">
                          {Object.values(materialSummary).map((item, idx) => {
                            const parts = item.laminateDisplay.split(' + ');
                            const frontLaminate = parts[0] || 'None';
                            const innerLaminate = parts[1] || parts[0] || 'None';
                            
                            return (
                              <div key={idx} className="text-sm">
                                <span className="font-semibold">{item.brand}</span>
                                <span className="text-gray-600 mx-1">(Front: {frontLaminate}, Inner: {innerLaminate})</span>
                                <span className="font-bold text-blue-600">= {item.count} {item.count === 1 ? 'Sheet' : 'Sheets'}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      
                      {/* Laminate Summary - Grouped by Laminate Code Only */}
                      <div className="space-y-1">
                        <h3 className="text-lg font-bold border-b border-black pb-1">Laminate Summary</h3>
                        <div className="space-y-0">
                          {Object.entries(laminateSummary)
                            .sort((a, b) => a[0].localeCompare(b[0]))
                            .map(([laminate, count]) => (
                              <div key={laminate} className="flex justify-between items-center py-0.5 border-b border-gray-200 last:border-0">
                                <p className="font-medium text-sm">{laminate}</p>
                                <p className="font-bold text-purple-600">{count} {count === 1 ? 'Sheet' : 'Sheets'}</p>
                              </div>
                            ))}
                        </div>
                      </div>
                      
                      {/* Colour Frame Summary */}
                      {colourFrameEnabled && (
                        <div className="space-y-1">
                          <h3 className="text-lg font-bold border-b border-black pb-1">Colour Frame</h3>
                          <div className="text-sm space-y-0.5">
                            <div className="flex justify-between items-center py-0.5">
                              <p className="font-medium">Colour Frame ({colourFrameForm.height || 2400} × {colourFrameForm.width || 80} mm)</p>
                              <p className="font-bold text-orange-600">{colourFrameForm.quantity || 1} {(colourFrameForm.quantity || 1) === 1 ? 'Piece' : 'Pieces'}</p>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Footer */}
                      <div className="mt-auto pt-8 border-t border-gray-300 text-sm text-gray-500">
                        <div className="flex justify-between items-center">
                          <div>
                            <p>Sheet Size: {currentSheetWidth}×{currentSheetHeight} mm</p>
                            <p>Kerf: {kerf} mm</p>
                          </div>
                          <div className="text-right font-semibold text-gray-700">
                            Summary
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Render sheets for each brand */}
                  {(() => {
                    let currentPage = 0; // Start at 0 so first sheet is Page 1 (not Page 2)
                    return brandResults.flatMap((brandResult, brandIdx) => {
                      const sheets = brandResult.result?.panels || [];
                      
                      return sheets.map((sheet: any, idx: number) => {
                        // Use the stable sheet ID assigned during optimization
                        const sheetId = sheet._sheetId || `fallback-${brandIdx}-${idx}`;
                        
                        // Skip deleted sheets but don't count them in page numbering
                        if (deletedPreviewSheets.has(sheetId)) return null;
                        
                        currentPage++; // Increment page number for each visible sheet (starts at 1)
                        const title = brandResult.isBackPanel 
                          ? `Back Panel Sheet - ${brandResult.brand}` 
                          : `Sheet - ${brandResult.brand}`;
                        
                        return (
                          <div key={sheetId} className="cutting-sheet" style={{ display: 'block', width: '100%', pageBreakAfter: 'always' }}>
                            {renderSheet(sheet, title, brandResult.brand, brandResult.laminateDisplay, brandResult.isBackPanel, sheetId, currentPage)}
                          </div>
                        );
                      });
                    });
                  })()}
                </div>
                
                {/* Export PDF Button - Pixel-perfect DOM capture */}
                <div className="flex justify-center pt-6 pb-2">
                  <Button
                    disabled={!woodGrainsReady}
                    onClick={async () => {
                      // ✅ FIX #3: Double-check wood grains are ready (defensive)
                      if (!woodGrainsReady) {
                        toast({
                          variant: "destructive",
                          title: "Please Wait",
                          description: "Wood grain preferences are still loading. Please wait before exporting."
                        });
                        return;
                      }
                      
                      try {
                        await exportPreviewToPdf({
                          filename: `cutting-list-${new Date().toISOString().slice(0, 10)}.pdf`,
                          pdfOrientation: "portrait"
                        });
                        
                        toast({
                          title: "PDF Generated",
                          description: "One sheet per page - pixel-perfect copy of your preview"
                        });
                      } catch (error) {
                        console.error("PDF export failed:", error);
                        toast({
                          title: "Export Failed",
                          description: "Could not generate PDF. Please try again.",
                          variant: "destructive"
                        });
                      }
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8"
                    data-testid="button-export-pdf-preview"
                  >
                    <i className="fas fa-file-pdf mr-2"></i>
                    Export PDF
                  </Button>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Manual Panel Dialog */}
      <Dialog open={showManualPanelDialog} onOpenChange={setShowManualPanelDialog}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-lg">
              {selectedSheetContext ? `Add Panel to ${selectedSheetContext.brand}` : 'Add Manual Panel'}
            </DialogTitle>
            {selectedSheetContext && (
              <p className="text-xs text-gray-500 mt-1">
                Panel will be added to this sheet: {selectedSheetContext.brand}
              </p>
            )}
          </DialogHeader>
          <div className="space-y-2.5">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-sm">Panel Name</Label>
                <Input
                  key={showManualPanelDialog ? 'open' : 'closed'}
                  defaultValue={manualPanelForm.name}
                  placeholder="e.g., Extra Shutter, Shelf"
                  data-testid="input-manual-panel-name"
                  className="h-9"
                  id="manual-panel-name-input"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-sm">Quantity</Label>
                <Input
                  type="number"
                  value={manualPanelForm.quantity}
                  onChange={(e) => setManualPanelForm(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                  min="1"
                  max="100"
                  data-testid="input-manual-panel-quantity"
                  className="h-9"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-sm">Height (mm)</Label>
                <Input
                  type="number"
                  key={`height-${showManualPanelDialog}`}
                  defaultValue={manualPanelForm.height}
                  placeholder="e.g., 800"
                  min="0"
                  max="9999"
                  data-testid="input-manual-panel-height"
                  className="h-9"
                  id="manual-panel-height-input"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-sm">Width (mm)</Label>
                <Input
                  type="number"
                  key={`width-${showManualPanelDialog}`}
                  defaultValue={manualPanelForm.width}
                  placeholder="e.g., 600"
                  min="0"
                  max="9999"
                  data-testid="input-manual-panel-width"
                  className="h-9"
                  id="manual-panel-width-input"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-sm">Plywood Type</Label>
              <Select
                value={manualPanelForm.A}
                onValueChange={(value) => setManualPanelForm(prev => ({ ...prev, A: value }))}
              >
                <SelectTrigger data-testid="select-manual-panel-plywood" className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Apple Ply 16mm BWP">Apple Ply 16mm BWP</SelectItem>
                  <SelectItem value="Apple Ply 18mm BWP">Apple Ply 18mm BWP</SelectItem>
                  <SelectItem value="Green Ply 16mm BWP">Green Ply 16mm BWP</SelectItem>
                  <SelectItem value="Green Ply 18mm BWP">Green Ply 18mm BWP</SelectItem>
                  {globalPlywoodBrandMemory.map((brand, index) => (
                    <SelectItem key={index} value={brand}>{brand}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-sm">Laminate Code (Optional)</Label>
              <Select
                value={manualPanelForm.laminateCode || undefined}
                onValueChange={(value) => setManualPanelForm(prev => ({ ...prev, laminateCode: value }))}
              >
                <SelectTrigger data-testid="select-manual-panel-laminate-code" className="h-9">
                  <SelectValue placeholder="Select laminate code (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {laminateCodes.map((code) => (
                    <SelectItem key={code.id} value={code.code}>{code.code}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-4 pt-1">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={manualPanelForm.grainDirection}
                  onCheckedChange={(checked) => setManualPanelForm(prev => ({ ...prev, grainDirection: checked }))}
                  data-testid="switch-manual-panel-grain"
                />
                <Label className="text-sm">Wood Grains</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={manualPanelForm.gaddi}
                  onCheckedChange={(checked) => setManualPanelForm(prev => ({ ...prev, gaddi: checked }))}
                  data-testid="switch-manual-panel-gaddi"
                />
                <Label className="text-sm">GADDI</Label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t mt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowManualPanelDialog(false);
                  setSelectedSheetContext(null);
                }}
                data-testid="button-cancel-manual-panel"
                className="h-9"
              >
                Cancel
              </Button>
              <Button
                className="bg-green-600 hover:bg-green-700 h-9"
                data-testid="button-submit-manual-panel"
                onClick={() => {
                  // Read values from uncontrolled inputs
                  const nameInput = document.getElementById('manual-panel-name-input') as HTMLInputElement;
                  const heightInput = document.getElementById('manual-panel-height-input') as HTMLInputElement;
                  const widthInput = document.getElementById('manual-panel-width-input') as HTMLInputElement;
                  
                  const name = nameInput?.value || 'Manual Panel';
                  const height = parseInt(heightInput?.value || '0');
                  const width = parseInt(widthInput?.value || '0');
                  
                  if (!height || height <= 0 || !width || width <= 0) {
                    toast({
                      title: "Invalid Dimensions",
                      description: "Please enter valid height and width values greater than 0.",
                      variant: "destructive"
                    });
                    return;
                  }
                  
                  // ✅ DIRECT LINK: Compute grain direction from database preferences
                  const baseLaminateCode = (manualPanelForm.laminateCode || '').split('+')[0].trim();
                  const hasWoodGrains = woodGrainsPreferences[baseLaminateCode] === true;
                  
                  const newPanel = {
                    id: crypto.randomUUID(),
                    name,
                    height,
                    width,
                    laminateCode: manualPanelForm.laminateCode,
                    A: manualPanelForm.A,
                    quantity: manualPanelForm.quantity,
                    grainDirection: hasWoodGrains, // ✅ DIRECT LINK: Database only, no form/toggle
                    gaddi: manualPanelForm.gaddi,
                    targetSheet: selectedSheetContext ? { ...selectedSheetContext } : undefined
                  };
                  setManualPanels(prev => [...prev, newPanel]);
                  setShowManualPanelDialog(false);
                  
                  const tempSheetContext = selectedSheetContext;
                  setSelectedSheetContext(null);
                  
                  const sheetInfo = tempSheetContext 
                    ? ` to ${tempSheetContext.brand} sheet`
                    : '';
                  
                  toast({
                    title: "Manual Panel Added",
                    description: `Added ${manualPanelForm.quantity} × ${name} (${width}×${height}mm)${sheetInfo}.`,
                  });
                  // Reset form
                  setManualPanelForm({
                    name: 'Manual Panel',
                    height: '',
                    width: '',
                    laminateCode: '',
                    A: 'Apple Ply 16mm BWP',
                    quantity: 1,
                    grainDirection: false,
                    gaddi: false
                  });
                }}
              >
                Add Panel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Clear Preview Confirmation Dialog */}
      <AlertDialog open={showClearConfirmDialog} onOpenChange={setShowClearConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear All Cabinets & Spreadsheet?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all cabinets, spreadsheet data, and make the preview completely empty. 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                // Clear spreadsheet data from localStorage
                localStorage.removeItem('cutlist_spreadsheet_v1');
                
                // Clear all cabinets and related state
                updateCabinets([]);
                setManualPanels([]);
                setDeletedPreviewSheets(new Set());
                setDeletedPreviewPanels(new Set());
                setShowPreviewDialog(false);
                setIsPreviewActive(false);
                setLastAddedCabinet(null);
                
                // Reset form to default values
                form.reset({
                  id: crypto.randomUUID(),
                  name: `Shutter #${1}`,
                  type: 'single' as CabinetType,
                  height: 800,
                  width: 600,
                  depth: 450,
                  widthReduction: 36,
                  A: masterPlywoodBrand || 'Apple Ply 16mm BWP',
                  bottomPanelLaminateCode: masterLaminateCode || '',
                  leftPanelLaminateCode: masterLaminateCode || '',
                  rightPanelLaminateCode: masterLaminateCode || '',
                  backPanelLaminateCode: masterLaminateCode || '',
                  topPanelInnerLaminateCode: 'off white',
                  bottomPanelInnerLaminateCode: 'off white',
                  leftPanelInnerLaminateCode: 'off white',
                  rightPanelInnerLaminateCode: 'off white',
                  backPanelInnerLaminateCode: 'off white',
                  innerLaminateCode: 'off white',
                  shuttersEnabled: false,
                  shutterCount: 1,
                  shutterType: 'Standard' as ShutterType,
                  shutterHeightReduction: 0,
                  shutterWidthReduction: 0,
                  shutters: [],
                  centerPostEnabled: false,
                  centerPostQuantity: 1,
                  centerPostHeight: 764,
                  centerPostDepth: 430,
                  centerPostLaminateCode: '',
                  shelvesEnabled: false,
                  shelvesQuantity: 1,
                  shelvesLaminateCode: '',
                  topPanelGrainDirection: false,
                  bottomPanelGrainDirection: false,
                  leftPanelGrainDirection: false,
                  rightPanelGrainDirection: false,
                  backPanelGrainDirection: false
                });
                
                toast({
                  title: "Everything Cleared",
                  description: "All cabinets and spreadsheet data have been deleted.",
                });
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Clear All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Material Validation Error Dialog */}
      <AlertDialog open={showMaterialConfirmDialog} onOpenChange={setShowMaterialConfirmDialog}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600">Laminate Code Required</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p className="font-semibold text-slate-900">Cannot add {pendingMaterialAction?.type === 'cabinet' ? 'cabinet' : 'shutter'} without specifying laminate codes for the following panels:</p>
              
              {pendingMaterialAction?.missingPanels && pendingMaterialAction.missingPanels.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3 mt-2">
                  <ul className="space-y-2 text-sm" data-testid="missing-panels-list">
                    {pendingMaterialAction.missingPanels.map((message, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-red-600 mt-0.5">✕</span>
                        <span className="text-slate-700 font-medium">{message}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              <p className="text-sm text-slate-700 mt-3 bg-blue-50 border border-blue-200 rounded-md p-3">
                <strong>Required:</strong> Please select both Front Laminate and Inner Laminate for all panels before adding the cabinet.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction
              onClick={() => {
                setShowMaterialConfirmDialog(false);
                setPendingMaterialAction(null);
              }}
              className="bg-blue-600 hover:bg-blue-700"
              data-testid="button-close-validation-error"
            >
              OK, I'll Add Laminate Codes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Panel Delete Confirmation Dialog */}
      <AlertDialog open={!!panelToDelete} onOpenChange={(open) => !open && setPanelToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Panel?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the panel "{panelToDelete?.panelId}" from the sheet. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (panelToDelete) {
                  const panelUniqueId = `${panelToDelete.sheetId}-${panelToDelete.panelId}`;
                  setDeletedPreviewPanels(prev => new Set([...Array.from(prev), panelUniqueId]));
                  setPanelToDelete(null);
                  toast({
                    title: "Panel Deleted",
                    description: `Removed "${panelToDelete.panelId}" from the sheet.`,
                  });
                }
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete Panel
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Panel Spreadsheet Section */}
      <Card className="bg-white border-gray-200 shadow-md mt-8" data-spreadsheet-section>
        <CardHeader>
          <CardTitle className="text-gray-900">
            <i className="fas fa-table mr-2 text-blue-400"></i>
            Panel Spreadsheet (Import/Export CSV)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Spreadsheet onAddToCabinet={(rowData) => {
            // Populate form with spreadsheet row data
            if (rowData.height) form.setValue('height', parseFloat(rowData.height) || 0);
            if (rowData.width) form.setValue('width', parseFloat(rowData.width) || 0);
            if (rowData.qty) form.setValue('shutterCount', parseInt(rowData.qty) || 1);
            if (rowData.roomName) form.setValue('roomName', rowData.roomName);
            if (rowData.cabinetName) form.setValue('name', rowData.cabinetName);
            if (rowData.plywoodBrand) form.setValue('A', rowData.plywoodBrand);
            if (rowData.frontLaminate) {
              form.setValue('topPanelLaminateCode', rowData.frontLaminate);
              // Sync to all panels if link panels is enabled
              if (panelsLinked) {
                syncCabinetConfigFrontLaminate(rowData.frontLaminate, true);
              }
            }
            if (rowData.innerLaminate) {
              form.setValue('innerLaminateCode', rowData.innerLaminate);
            }
            
            // Scroll to cabinet section and show toast
            setTimeout(() => {
              if (cabinetSectionRef.current) {
                cabinetSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
              toast({
                title: "Cabinet Data Loaded",
                description: "Spreadsheet row has been loaded into the cabinet form. Adjust as needed and click 'Add Cabinet'.",
              });
            }, 100);
          }} />
        </CardContent>
      </Card>

    </div>
  );
}