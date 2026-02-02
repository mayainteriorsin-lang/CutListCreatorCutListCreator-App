/**
 * CabinetsPro - SaaS-level Cabinet Builder Interface
 * Modern, compact design with sidebar navigation and real-time preview
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Plus,
  Trash2,
  Settings,
  Layers,
  Box,
  Play,
  Download,
  Ruler,
  Palette,
  Package,
  Scissors,
  Copy,
  RotateCcw,
  Save,
  GripVertical,
  Loader2,
} from 'lucide-react';
import { Cabinet, cabinetSchema } from '@shared/schema';
import { useMasterSettingsStore, useGodownStore } from '@/features/material';
import { PlywoodCombobox } from '@/components/master-settings/PlywoodCombobox';
import { LaminateCombobox } from '@/components/master-settings/LaminateCombobox';
import { useHistory } from '@/lib/history';
import { loadAutosave, useAutosave } from '@/lib/persist';
import { generateUUID } from '@/lib/uuid';
import { generatePanels } from '@/lib/panels/generatePanels';
import { runOptimizerEngine } from '@/lib/optimizer';
import { exportCutlistPDF } from '@/lib/pdf';
import PreviewDialog from '@/components/cutlist-preview/PreviewDialog';
import { validateBeforeAddCabinet, validateBeforeOptimize } from '@/lib/validation/ValidationEngine';
import { getMasterDefaults } from '@/lib/settings/MasterSettingsEngine';
import { getFormDefaultValues } from '@/lib/form/FormDefaultsEngine';
import { SheetPreview } from '@/components/optimization/SheetPreview';
import type { BrandResult } from '@shared/schema';
import type { MaterialSummary } from '@/lib/summary';

// Compact numeric input component
function NumericInput({
  label,
  value,
  onChange,
  min = 0,
  max = 9999,
  suffix = 'mm',
  error,
  className = '',
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  suffix?: string;
  error?: string;
  className?: string;
}) {
  return (
    <div className={`space-y-1 ${className}`}>
      <Label className="text-[11px] text-slate-500 font-medium">{label}</Label>
      <div className="relative">
        <Input
          type="number"
          value={value || ''}
          onChange={(e) => onChange(parseInt(e.target.value) || 0)}
          min={min}
          max={max}
          className={`h-8 text-sm pr-8 ${error ? 'border-red-400' : ''}`}
        />
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">
          {suffix}
        </span>
      </div>
      {error && <p className="text-[10px] text-red-500">{error}</p>}
    </div>
  );
}

// Material selector combobox
function MaterialSelect({
  label,
  value,
  options,
  onChange,
  placeholder = 'Select...',
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-[11px] text-slate-500 font-medium">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-8 text-sm">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt} value={opt} className="text-sm">
              {opt}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

// Cabinet card in the list
function CabinetCard({
  cabinet,
  onDelete,
  onDuplicate,
  onEdit,
  isSelected,
}: {
  cabinet: Cabinet;
  onDelete: () => void;
  onDuplicate: () => void;
  onEdit: () => void;
  isSelected: boolean;
}) {
  const panels = generatePanels(cabinet);
  const shutterCount = cabinet.shuttersEnabled ? cabinet.shutterCount : 0;

  return (
    <div
      className={`group p-3 rounded-lg border transition-all cursor-pointer ${
        isSelected
          ? 'bg-blue-50 border-blue-300 shadow-sm'
          : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'
      }`}
      onClick={onEdit}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
            isSelected ? 'bg-blue-500' : 'bg-slate-100'
          }`}>
            <Box className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-slate-500'}`} />
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-medium text-slate-800 truncate">{cabinet.name}</h4>
            <p className="text-[11px] text-slate-500">
              {cabinet.height} × {cabinet.width} × {cabinet.depth}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={(e) => { e.stopPropagation(); onDuplicate(); }}
                >
                  <Copy className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Duplicate</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50"
                  onClick={(e) => { e.stopPropagation(); onDelete(); }}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Delete</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      <div className="mt-2 flex items-center gap-3 text-[10px] text-slate-500">
        <span className="flex items-center gap-1">
          <Layers className="w-3 h-3" />
          {panels.length} panels
        </span>
        {shutterCount > 0 && (
          <span className="flex items-center gap-1">
            <Package className="w-3 h-3" />
            {shutterCount} shutters
          </span>
        )}
        <span className="flex items-center gap-1 text-slate-400">
          {cabinet.roomName || 'No room'}
        </span>
      </div>
    </div>
  );
}

// SheetPreview is now imported from '@/components/optimization/SheetPreview'

export default function CabinetsPro() {
  const { toast } = useToast();

  // UI State
  const [activeTab, setActiveTab] = useState<'cabinets' | 'settings' | 'optimize'>('cabinets');
  const [selectedCabinetId, setSelectedCabinetId] = useState<string | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [panelsLinked, setPanelsLinked] = useState(true); // Link all panels by default
  const [optimizationResult, setOptimizationResult] = useState<{
    brandResults: BrandResult[];
    materialSummary: MaterialSummary;
  } | null>(null);
  const [showPreview, setShowPreview] = useState(false); // Preview dialog state

  // History for undo/redo
  const cabinetsHistory = useHistory<Cabinet[]>([]);
  const cabinets = cabinetsHistory.present;
  const setCabinets = cabinetsHistory.set;

  // Master settings from store
  const masterSettings = useMasterSettingsStore((s) => s.data);
  const isLoadingMasterSettings = useMasterSettingsStore((s) => s.loading);
  const masterSettingsLoaded = useMasterSettingsStore((s) => s.loaded);
  const fetchMasterSettings = useMasterSettingsStore((s) => s.fetch);
  const saveMasterSettings = useMasterSettingsStore((s) => s.save);

  // Materials from store
  const plywoodOptions = useGodownStore((s) => s.plywoodOptions);
  const laminateOptions = useGodownStore((s) => s.laminateOptions);
  const isLoadingMaterials = useGodownStore((s) => s.loading);
  const materialsLoaded = useGodownStore((s) => s.loaded);
  const fetchMaterials = useGodownStore((s) => s.fetch);

  // Local master settings state
  const [masterPlywoodBrand, setMasterPlywoodBrand] = useState('');
  const [masterLaminateCode, setMasterLaminateCode] = useState('');
  const [masterInnerLaminateCode, setMasterInnerLaminateCode] = useState('');
  const [sheetWidth, setSheetWidth] = useState(1210);
  const [sheetHeight, setSheetHeight] = useState(2420);
  const [kerf, setKerf] = useState(5);
  const [optimizePlywoodUsage, setOptimizePlywoodUsage] = useState(true);

  // Material Memory - remember last selected values (time-saver)
  const MEMORY_KEY = 'cabinetsPro_materialMemory';
  const [materialMemory, setMaterialMemory] = useState<{
    plywood?: string;
    frontLaminate?: string;
    innerLaminate?: string;
  }>(() => {
    try {
      const saved = localStorage.getItem(MEMORY_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const saveMaterialMemory = useCallback((updates: Partial<typeof materialMemory>) => {
    setMaterialMemory(prev => {
      const next = { ...prev, ...updates };
      try {
        localStorage.setItem(MEMORY_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  // Derived data - use test data as fallback when API is not available
  const TEST_PLYWOOD = ['Apple Ply 16mm BWP', 'Apple Ply 18mm BWP', 'Century 16mm BWP', 'Greenply 18mm MR'];
  const TEST_LAMINATES = ['SF-001', 'SF-002', 'WG-101', 'WG-102', 'MT-201', 'MT-202', 'GL-301', 'GL-302'];

  const plywoodList = useMemo(() => {
    const apiList = plywoodOptions.map((p) => p.brand);
    return apiList.length > 0 ? apiList : TEST_PLYWOOD;
  }, [plywoodOptions]);

  const laminateList = useMemo(() => {
    const apiList = laminateOptions.map((l) => l.code);
    return apiList.length > 0 ? apiList : TEST_LAMINATES;
  }, [laminateOptions]);

  // Form setup
  const getLocalMasterDefaults = useCallback(() => {
    return getMasterDefaults(masterPlywoodBrand, masterLaminateCode, masterInnerLaminateCode, masterSettings);
  }, [masterPlywoodBrand, masterLaminateCode, masterInnerLaminateCode, masterSettings]);

  const form = useForm<Cabinet>({
    resolver: zodResolver(cabinetSchema),
    defaultValues: getFormDefaultValues(generateUUID, cabinets.length + 1, {}, getLocalMasterDefaults()),
  });

  const watchedValues = form.watch();

  // Initial data fetch
  useEffect(() => {
    fetchMasterSettings();
    fetchMaterials();
  }, []);

  // Restore autosaved data
  useEffect(() => {
    const saved = loadAutosave();
    if (saved && saved.cabinets.length > 0) {
      setCabinets(saved.cabinets as Cabinet[]);
    }
  }, []);

  // Autosave
  useAutosave(cabinets, []);

  // Sync master settings
  useEffect(() => {
    if (masterSettings?.masterLaminateCode && !masterLaminateCode) {
      setMasterLaminateCode(masterSettings.masterLaminateCode);
    }
    const inner = (masterSettings as any)?.masterInnerLaminateCode;
    if (inner && !masterInnerLaminateCode) {
      setMasterInnerLaminateCode(inner);
    }
    if (masterSettings && (masterSettings as any).optimizePlywoodUsage !== undefined) {
      const val = (masterSettings as any).optimizePlywoodUsage;
      setOptimizePlywoodUsage(val === 'true' || val === true);
    }
  }, [masterSettings]);

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
  }, [masterSettings, plywoodOptions, isLoadingMasterSettings]);

  // Auto-fill form with remembered values or first available values
  useEffect(() => {
    if (plywoodList.length > 0 && !watchedValues.plywoodType) {
      // Use remembered plywood or first in list
      const defaultPlywood = materialMemory.plywood && plywoodList.includes(materialMemory.plywood)
        ? materialMemory.plywood
        : plywoodList[0];
      form.setValue('plywoodType', defaultPlywood);
    }
    if (laminateList.length > 0) {
      // Use remembered laminates or defaults
      const defaultFront = materialMemory.frontLaminate && laminateList.includes(materialMemory.frontLaminate)
        ? materialMemory.frontLaminate
        : laminateList[0];
      const defaultInner = materialMemory.innerLaminate && laminateList.includes(materialMemory.innerLaminate)
        ? materialMemory.innerLaminate
        : laminateList[1] || laminateList[0];

      // Fill all panel laminates if empty
      if (!watchedValues.topPanelLaminateCode) {
        form.setValue('topPanelLaminateCode', defaultFront);
        form.setValue('bottomPanelLaminateCode', defaultFront);
        form.setValue('leftPanelLaminateCode', defaultFront);
        form.setValue('rightPanelLaminateCode', defaultFront);
        form.setValue('backPanelLaminateCode', defaultFront);
      }
      if (!watchedValues.topPanelInnerLaminateCode) {
        form.setValue('topPanelInnerLaminateCode', defaultInner);
        form.setValue('bottomPanelInnerLaminateCode', defaultInner);
        form.setValue('leftPanelInnerLaminateCode', defaultInner);
        form.setValue('rightPanelInnerLaminateCode', defaultInner);
        form.setValue('backPanelInnerLaminateCode', defaultInner);
      }
    }
  }, [plywoodList, laminateList, materialsLoaded]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        cabinetsHistory.undo();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'Z'))) {
        e.preventDefault();
        cabinetsHistory.redo();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [cabinetsHistory]);

  // Auto-update center post dimensions when cabinet dimensions change
  useEffect(() => {
    if (watchedValues.centerPostEnabled) {
      const calcHeight = Math.max(0, (watchedValues.height || 0) - 36);
      const calcDepth = Math.max(0, (watchedValues.depth || 0) - 20);
      form.setValue('centerPostHeight', calcHeight);
      form.setValue('centerPostDepth', calcDepth);
    }
  }, [watchedValues.height, watchedValues.depth, watchedValues.centerPostEnabled]);

  // Cabinet operations
  const addCabinet = useCallback(() => {
    const values = form.getValues();
    const validation = validateBeforeAddCabinet(values, laminateList, plywoodList);
    if (!validation.valid) {
      toast({
        title: validation.errors[0]?.title || 'Validation Error',
        description: validation.errors[0]?.description,
        variant: 'destructive',
      });
      return;
    }

    // Build shutters array based on form values
    const shuttersArray = values.shuttersEnabled && values.shutterCount > 0
      ? Array.from({ length: values.shutterCount }, (_, i) => ({
          width: values.width - (values.shutterWidthReduction || 0),
          height: values.height - (values.shutterHeightReduction || 0),
          laminateCode: values.shutterLaminateCode || '',
        }))
      : [];

    // Prepare cabinet with all required fields
    const newCabinet: Cabinet = {
      ...values,
      id: generateUUID(),
      name: values.name || `Cabinet ${cabinets.length + 1}`,
      configurationMode: values.depth > 0 ? 'advanced' : 'basic',
      shutters: shuttersArray,
      // Ensure center post dimensions are set
      centerPostHeight: values.centerPostEnabled ? Math.max(0, (values.height || 0) - 36) : 0,
      centerPostDepth: values.centerPostEnabled ? Math.max(0, (values.depth || 0) - 20) : 0,
    };

    setCabinets([...cabinets, newCabinet]);

    // Reset form for next cabinet - keep remembered material selections
    const defaultPlywood = materialMemory.plywood && plywoodList.includes(materialMemory.plywood)
      ? materialMemory.plywood : plywoodList[0];
    const defaultFront = materialMemory.frontLaminate && laminateList.includes(materialMemory.frontLaminate)
      ? materialMemory.frontLaminate : laminateList[0];
    const defaultInner = materialMemory.innerLaminate && laminateList.includes(materialMemory.innerLaminate)
      ? materialMemory.innerLaminate : laminateList[1] || laminateList[0];

    form.reset({
      ...getFormDefaultValues(generateUUID, cabinets.length + 2, {}, getLocalMasterDefaults()),
      // Apply remembered materials
      plywoodType: defaultPlywood,
      topPanelLaminateCode: defaultFront,
      bottomPanelLaminateCode: defaultFront,
      leftPanelLaminateCode: defaultFront,
      rightPanelLaminateCode: defaultFront,
      backPanelLaminateCode: defaultFront,
      topPanelInnerLaminateCode: defaultInner,
      bottomPanelInnerLaminateCode: defaultInner,
      leftPanelInnerLaminateCode: defaultInner,
      rightPanelInnerLaminateCode: defaultInner,
      backPanelInnerLaminateCode: defaultInner,
    });

    toast({
      title: 'Cabinet Added',
      description: `${newCabinet.name} has been added to your list.`,
    });
  }, [cabinets, form, laminateList, plywoodList, setCabinets, toast, getLocalMasterDefaults, materialMemory]);

  const removeCabinet = useCallback((id: string) => {
    setCabinets(cabinets.filter((c) => c.id !== id));
    if (selectedCabinetId === id) {
      setSelectedCabinetId(null);
    }
    toast({
      title: 'Cabinet Removed',
      description: 'Cabinet has been removed from the list.',
    });
  }, [cabinets, selectedCabinetId, setCabinets, toast]);

  const duplicateCabinet = useCallback((cabinet: Cabinet) => {
    const newCabinet: Cabinet = {
      ...cabinet,
      id: generateUUID(),
      name: `${cabinet.name} (Copy)`,
    };
    setCabinets([...cabinets, newCabinet]);
    toast({
      title: 'Cabinet Duplicated',
      description: `${newCabinet.name} has been created.`,
    });
  }, [cabinets, setCabinets, toast]);

  const editCabinet = useCallback((cabinet: Cabinet) => {
    setSelectedCabinetId(cabinet.id);
    form.reset(cabinet);
  }, [form]);

  const updateSelectedCabinet = useCallback(() => {
    if (!selectedCabinetId) return;
    const values = form.getValues();

    // Build shutters array
    const shuttersArray = values.shuttersEnabled && values.shutterCount > 0
      ? Array.from({ length: values.shutterCount }, (_, i) => ({
          width: values.width - (values.shutterWidthReduction || 0),
          height: values.height - (values.shutterHeightReduction || 0),
          laminateCode: values.shutterLaminateCode || '',
        }))
      : [];

    const updatedCabinet = {
      ...values,
      configurationMode: values.depth > 0 ? 'advanced' : 'basic',
      shutters: shuttersArray,
      centerPostHeight: values.centerPostEnabled ? Math.max(0, (values.height || 0) - 36) : 0,
      centerPostDepth: values.centerPostEnabled ? Math.max(0, (values.depth || 0) - 20) : 0,
    };

    setCabinets(cabinets.map((c) => (c.id === selectedCabinetId ? { ...c, ...updatedCabinet } : c)));
    setSelectedCabinetId(null);
    form.reset(getFormDefaultValues(generateUUID, cabinets.length + 1, {}, getLocalMasterDefaults()));
    toast({ title: 'Cabinet Updated' });
  }, [selectedCabinetId, form, cabinets, setCabinets, toast, getLocalMasterDefaults]);

  // Run optimization
  const runOptimization = useCallback(async () => {
    const validation = validateBeforeOptimize(cabinets);
    if (!validation.valid) {
      toast({
        title: validation.errors[0]?.title || 'Cannot Optimize',
        description: validation.errors[0]?.description,
        variant: 'destructive',
      });
      return;
    }

    setIsOptimizing(true);
    setActiveTab('optimize');

    try {
      const result = await runOptimizerEngine({
        cabinets,
        manualPanels: [],
        sheetWidth,
        sheetHeight,
        kerf,
        woodGrainsPreferences: {},
        generatePanels,
      });

      // Build simple summary from brand results
      const summary: MaterialSummary = {
        plywood: {},
        laminates: {},
        totalPlywoodSheets: 0,
      };
      result.brandResults.forEach((br: BrandResult) => {
        const sheetCount = br.result?.panels?.length || 0;
        summary.plywood[br.brand] = (summary.plywood[br.brand] || 0) + sheetCount;
        summary.laminates[br.laminateCode] = (summary.laminates[br.laminateCode] || 0) + sheetCount;
        summary.totalPlywoodSheets += sheetCount;
      });

      setOptimizationResult({
        brandResults: result.brandResults,
        materialSummary: summary,
      });

      // Show preview dialog after optimization
      setShowPreview(true);

      toast({
        title: 'Optimization Complete',
        description: `${result.brandResults.length} material group(s) optimized.`,
      });
    } catch (error) {
      console.error('Optimization error:', error);
      toast({
        title: 'Optimization Failed',
        description: 'An error occurred during optimization.',
        variant: 'destructive',
      });
    } finally {
      setIsOptimizing(false);
    }
  }, [cabinets, sheetWidth, sheetHeight, kerf, optimizePlywoodUsage, toast]);

  // Export PDF
  const handleExportPDF = useCallback(async () => {
    if (!optimizationResult) {
      toast({
        title: 'Run Optimization First',
        description: 'Please run optimization before exporting PDF.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await exportCutlistPDF({
        brandResults: optimizationResult.brandResults,
        sheetWidth,
        sheetHeight,
        kerf,
        clientName: 'CutList Export',
      });
      toast({ title: 'PDF Exported', description: 'Your cutting list PDF has been downloaded.' });
    } catch (error) {
      console.error('PDF export error:', error);
      toast({ title: 'Export Failed', variant: 'destructive' });
    }
  }, [optimizationResult, sheetWidth, sheetHeight, kerf, toast]);

  // Summary stats
  const summaryStats = useMemo(() => {
    const allPanels = cabinets.flatMap(generatePanels);
    const totalShutters = cabinets.reduce((acc, c) => acc + (c.shuttersEnabled ? c.shutterCount : 0), 0);
    return {
      cabinetCount: cabinets.length,
      panelCount: allPanels.length,
      shutterCount: totalShutters,
    };
  }, [cabinets]);

  // Loading state
  if (!materialsLoaded || !masterSettingsLoaded) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-3" />
          <p className="text-sm text-slate-600">Loading materials...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-100">
      {/* Left Sidebar - Cabinet List */}
      <div className="w-72 bg-white border-r border-slate-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-200">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-slate-800">Cabinets</h2>
            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
              {cabinets.length}
            </span>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2 bg-slate-50 rounded-lg">
              <div className="text-sm font-semibold text-slate-800">{summaryStats.cabinetCount}</div>
              <div className="text-[10px] text-slate-500">Cabinets</div>
            </div>
            <div className="p-2 bg-slate-50 rounded-lg">
              <div className="text-sm font-semibold text-slate-800">{summaryStats.panelCount}</div>
              <div className="text-[10px] text-slate-500">Panels</div>
            </div>
            <div className="p-2 bg-slate-50 rounded-lg">
              <div className="text-sm font-semibold text-slate-800">{summaryStats.shutterCount}</div>
              <div className="text-[10px] text-slate-500">Shutters</div>
            </div>
          </div>
        </div>

        {/* Cabinet List */}
        <ScrollArea className="flex-1 p-3">
          {cabinets.length === 0 ? (
            <div className="text-center py-12">
              <Box className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-500 mb-1">No cabinets yet</p>
              <p className="text-xs text-slate-400">Add your first cabinet using the form</p>
            </div>
          ) : (
            <div className="space-y-2">
              {cabinets.map((cabinet) => (
                <CabinetCard
                  key={cabinet.id}
                  cabinet={cabinet}
                  isSelected={selectedCabinetId === cabinet.id}
                  onDelete={() => removeCabinet(cabinet.id)}
                  onDuplicate={() => duplicateCabinet(cabinet)}
                  onEdit={() => editCabinet(cabinet)}
                />
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Sidebar Footer - Actions */}
        <div className="p-3 border-t border-slate-200 space-y-2">
          <Button
            onClick={runOptimization}
            disabled={cabinets.length === 0 || isOptimizing}
            className="w-full bg-gradient-to-r from-indigo-500 to-blue-500 hover:from-indigo-600 hover:to-blue-600"
          >
            {isOptimizing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Optimizing...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Run Optimization
              </>
            )}
          </Button>
          {optimizationResult && (
            <Button onClick={handleExportPDF} variant="outline" className="w-full">
              <Download className="w-4 h-4 mr-2" />
              Export PDF
            </Button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <div className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
              <TabsList className="h-9 bg-slate-100">
                <TabsTrigger value="cabinets" className="text-xs px-4">
                  <Box className="w-3.5 h-3.5 mr-1.5" />
                  Cabinet Form
                </TabsTrigger>
                <TabsTrigger value="settings" className="text-xs px-4">
                  <Settings className="w-3.5 h-3.5 mr-1.5" />
                  Settings
                </TabsTrigger>
                <TabsTrigger value="optimize" className="text-xs px-4">
                  <Scissors className="w-3.5 h-3.5 mr-1.5" />
                  Optimization
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => cabinetsHistory.undo()}
                    disabled={!cabinetsHistory.canUndo}
                  >
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Undo (Ctrl+Z)</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-6">
          {/* Cabinet Form Tab */}
          {activeTab === 'cabinets' && (
            <div className="max-w-3xl mx-auto">
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-800">
                      {selectedCabinetId ? 'Edit Cabinet' : 'Add New Cabinet'}
                    </h3>
                    <p className="text-sm text-slate-500">
                      {selectedCabinetId
                        ? 'Update the selected cabinet details'
                        : 'Configure and add a new cabinet to your list'}
                    </p>
                  </div>
                  {selectedCabinetId && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedCabinetId(null);
                        form.reset(getFormDefaultValues(generateUUID, cabinets.length + 1, {}, getLocalMasterDefaults()));
                      }}
                    >
                      Cancel Edit
                    </Button>
                  )}
                </div>

                {/* Cabinet Name & Room */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="space-y-1">
                    <Label className="text-[11px] text-slate-500 font-medium">Cabinet Name</Label>
                    <Input
                      value={watchedValues.name || ''}
                      onChange={(e) => form.setValue('name', e.target.value)}
                      placeholder={`Cabinet ${cabinets.length + 1}`}
                      className="h-8 text-sm"
                    />
                  </div>
                  <MaterialSelect
                    label="Room"
                    value={watchedValues.roomName || 'Kitchen'}
                    options={['Kitchen', 'Bedroom', 'Living Room', 'Bathroom', 'Office', 'Custom']}
                    onChange={(v) => form.setValue('roomName', v)}
                  />
                </div>

                {/* Materials Section */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <Label className="text-xs font-medium text-slate-700 flex items-center gap-2">
                      <Palette className="w-4 h-4 text-purple-500" />
                      Materials
                    </Label>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={panelsLinked}
                        onCheckedChange={setPanelsLinked}
                        className="scale-75"
                      />
                      <span className="text-[10px] text-slate-500">Link All Panels</span>
                    </div>
                  </div>

                  {/* Main/Master Material Fields - Apply to all panels + Memory */}
                  <div className="grid grid-cols-3 gap-3 mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="space-y-1">
                      <Label className="text-[11px] text-blue-700 font-medium">Main Plywood</Label>
                      <PlywoodCombobox
                        value={watchedValues.plywoodType || ''}
                        onChange={(v) => {
                          form.setValue('plywoodType', v);
                          saveMaterialMemory({ plywood: v }); // Remember selection
                        }}
                        placeholder="Select plywood..."
                        className="h-8 text-sm bg-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] text-blue-700 font-medium">Main Front Laminate</Label>
                      <LaminateCombobox
                        value={watchedValues.topPanelLaminateCode || ''}
                        onChange={(v) => {
                          // Apply to all panels
                          form.setValue('topPanelLaminateCode', v);
                          form.setValue('bottomPanelLaminateCode', v);
                          form.setValue('leftPanelLaminateCode', v);
                          form.setValue('rightPanelLaminateCode', v);
                          form.setValue('backPanelLaminateCode', v);
                          saveMaterialMemory({ frontLaminate: v }); // Remember selection
                        }}
                        placeholder="Select front laminate..."
                        className="h-8 text-sm bg-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] text-blue-700 font-medium">Main Inner Laminate</Label>
                      <LaminateCombobox
                        value={watchedValues.topPanelInnerLaminateCode || ''}
                        onChange={(v) => {
                          // Apply to all panels
                          form.setValue('topPanelInnerLaminateCode', v);
                          form.setValue('bottomPanelInnerLaminateCode', v);
                          form.setValue('leftPanelInnerLaminateCode', v);
                          form.setValue('rightPanelInnerLaminateCode', v);
                          form.setValue('backPanelInnerLaminateCode', v);
                          saveMaterialMemory({ innerLaminate: v }); // Remember selection
                        }}
                        placeholder="Select inner laminate..."
                        className="h-8 text-sm bg-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Dimensions - Compact Row */}
                <div className="mb-6">
                  <Label className="text-xs font-medium text-slate-700 mb-3 block flex items-center gap-2">
                    <Ruler className="w-4 h-4 text-blue-500" />
                    Dimensions
                  </Label>
                  <div className="grid grid-cols-4 gap-3">
                    <NumericInput
                      label="Height"
                      value={watchedValues.height || 0}
                      onChange={(v) => form.setValue('height', v)}
                      error={form.formState.errors.height?.message}
                    />
                    <NumericInput
                      label="Width"
                      value={watchedValues.width || 0}
                      onChange={(v) => form.setValue('width', v)}
                      error={form.formState.errors.width?.message}
                    />
                    <NumericInput
                      label="Depth"
                      value={watchedValues.depth || 0}
                      onChange={(v) => form.setValue('depth', v)}
                      error={form.formState.errors.depth?.message}
                    />
                    <NumericInput
                      label="Width Reduction"
                      value={watchedValues.widthReduction || 0}
                      onChange={(v) => form.setValue('widthReduction', v)}
                    />
                  </div>
                </div>

                {/* Shutters, Shelves, Center Post - Single Row */}
                <div className="mb-4 grid grid-cols-3 gap-3">
                  {/* Shutters */}
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-amber-500" />
                        <Label className="text-sm font-medium">Shutters</Label>
                      </div>
                      <Switch
                        checked={watchedValues.shuttersEnabled || false}
                        onCheckedChange={(v) => form.setValue('shuttersEnabled', v)}
                        className="scale-90"
                      />
                    </div>
                    {watchedValues.shuttersEnabled && (
                      <div className="mt-2 pt-2 border-t border-slate-200 space-y-2">
                        <NumericInput
                          label="Count"
                          value={watchedValues.shutterCount || 1}
                          onChange={(v) => form.setValue('shutterCount', v)}
                          min={1}
                          max={10}
                          suffix=""
                        />
                      </div>
                    )}
                  </div>

                  {/* Shelves */}
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-blue-500" />
                        <Label className="text-sm font-medium">Shelves</Label>
                      </div>
                      <Switch
                        checked={watchedValues.shelvesEnabled || false}
                        onCheckedChange={(v) => form.setValue('shelvesEnabled', v)}
                        className="scale-90"
                      />
                    </div>
                    {watchedValues.shelvesEnabled && (
                      <div className="mt-2 pt-2 border-t border-slate-200 space-y-2">
                        <NumericInput
                          label="Qty"
                          value={watchedValues.shelvesQuantity || 1}
                          onChange={(v) => form.setValue('shelvesQuantity', v)}
                          min={1}
                          max={20}
                          suffix=""
                        />
                      </div>
                    )}
                  </div>

                  {/* Center Post */}
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <GripVertical className="w-4 h-4 text-orange-500" />
                        <Label className="text-sm font-medium">Center Post</Label>
                      </div>
                      <Switch
                        checked={watchedValues.centerPostEnabled || false}
                        onCheckedChange={(v) => {
                          form.setValue('centerPostEnabled', v);
                          if (v) {
                            const calcHeight = (watchedValues.height || 0) - 36;
                            const calcDepth = (watchedValues.depth || 0) - 20;
                            form.setValue('centerPostHeight', calcHeight);
                            form.setValue('centerPostDepth', calcDepth);
                          }
                        }}
                        className="scale-90"
                      />
                    </div>
                    {watchedValues.centerPostEnabled && (
                      <div className="mt-2 pt-2 border-t border-slate-200 space-y-2">
                        <NumericInput
                          label="Qty"
                          value={watchedValues.centerPostQuantity || 1}
                          onChange={(v) => form.setValue('centerPostQuantity', v)}
                          min={1}
                          max={10}
                          suffix=""
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Panel Details - Shows calculated sizes based on dimensions */}
                <div className="mb-6">
                  <Label className="text-xs font-medium text-slate-700 mb-3 block flex items-center gap-2">
                    <Layers className="w-4 h-4 text-green-500" />
                    Panel Details
                  </Label>
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    {/* Header Row */}
                    <div className="grid grid-cols-[60px_80px_1fr_1fr_1fr_50px] bg-slate-100 text-[10px] font-medium text-slate-600 border-b border-slate-200">
                      <div className="px-2 py-1.5">Panel</div>
                      <div className="px-2 py-1.5 border-l border-slate-200">Size</div>
                      <div className="px-2 py-1.5 border-l border-slate-200">Plywood</div>
                      <div className="px-2 py-1.5 border-l border-slate-200">Front Laminate</div>
                      <div className="px-2 py-1.5 border-l border-slate-200">Inner Laminate</div>
                      <div className="px-2 py-1.5 border-l border-slate-200 text-center">Gaddi</div>
                    </div>

                    {/* Panel Rows */}
                    {[
                      { key: 'topPanel', label: 'Top', hasGaddi: true,
                        calcW: watchedValues.width || 0,
                        calcH: Math.max(0, (watchedValues.depth || 0) - 18) },
                      { key: 'bottomPanel', label: 'Bottom', hasGaddi: true,
                        calcW: watchedValues.width || 0,
                        calcH: Math.max(0, (watchedValues.depth || 0) - 18) },
                      { key: 'leftPanel', label: 'Left', hasGaddi: true,
                        calcW: Math.max(0, (watchedValues.depth || 0) - 18),
                        calcH: watchedValues.height || 0 },
                      { key: 'rightPanel', label: 'Right', hasGaddi: true,
                        calcW: Math.max(0, (watchedValues.depth || 0) - 18),
                        calcH: watchedValues.height || 0 },
                      { key: 'backPanel', label: 'Back', hasGaddi: false,
                        calcW: watchedValues.width || 0,
                        calcH: watchedValues.height || 0 },
                    ].map(({ key, label, hasGaddi, calcW, calcH }, idx) => (
                      <div
                        key={key}
                        className={`grid grid-cols-[60px_80px_1fr_1fr_1fr_50px] ${idx < 4 ? 'border-b border-slate-200' : ''}`}
                      >
                        <div className="px-2 py-1 text-[11px] font-medium text-slate-700 bg-slate-50 flex items-center">
                          {label}
                        </div>
                        <div className="px-1 py-1 text-[10px] text-slate-600 border-l border-slate-200 flex items-center font-mono">
                          {calcW}×{calcH}
                        </div>
                        {/* Plywood - shared across all panels */}
                        <div className="px-1 py-1 border-l border-slate-200">
                          <span className="h-6 text-[10px] text-slate-500 flex items-center px-1">
                            {watchedValues.plywoodType || '-'}
                          </span>
                        </div>
                        {/* Front Laminate - per panel */}
                        <div className="px-1 py-1 border-l border-slate-200">
                          <Select
                            value={watchedValues[`${key}LaminateCode` as keyof typeof watchedValues] as string || ''}
                            onValueChange={(v) => {
                              form.setValue(`${key}LaminateCode` as any, v);
                              if (panelsLinked) {
                                form.setValue('topPanelLaminateCode', v);
                                form.setValue('bottomPanelLaminateCode', v);
                                form.setValue('leftPanelLaminateCode', v);
                                form.setValue('rightPanelLaminateCode', v);
                                form.setValue('backPanelLaminateCode', v);
                              }
                            }}
                          >
                            <SelectTrigger
                              className="h-6 text-[11px] border-0 bg-transparent shadow-none focus:ring-2 focus:ring-blue-400"
                              tabIndex={idx * 2 + 4}
                            >
                              <SelectValue placeholder="Select..." />
                            </SelectTrigger>
                            <SelectContent>
                              {laminateList.map((opt) => (
                                <SelectItem key={opt} value={opt} className="text-xs">{opt}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        {/* Inner Laminate - per panel */}
                        <div className="px-1 py-1 border-l border-slate-200">
                          <Select
                            value={watchedValues[`${key}InnerLaminateCode` as keyof typeof watchedValues] as string || ''}
                            onValueChange={(v) => {
                              form.setValue(`${key}InnerLaminateCode` as any, v);
                              if (panelsLinked) {
                                form.setValue('topPanelInnerLaminateCode', v);
                                form.setValue('bottomPanelInnerLaminateCode', v);
                                form.setValue('leftPanelInnerLaminateCode', v);
                                form.setValue('rightPanelInnerLaminateCode', v);
                                form.setValue('backPanelInnerLaminateCode', v);
                              }
                            }}
                          >
                            <SelectTrigger
                              className="h-6 text-[11px] border-0 bg-transparent shadow-none focus:ring-2 focus:ring-blue-400"
                              tabIndex={idx * 2 + 5}
                            >
                              <SelectValue placeholder="Select..." />
                            </SelectTrigger>
                            <SelectContent>
                              {laminateList.map((opt) => (
                                <SelectItem key={opt} value={opt} className="text-xs">{opt}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="px-1 py-1 border-l border-slate-200 flex items-center justify-center">
                          {hasGaddi ? (
                            <Switch
                              checked={watchedValues[`${key}Gaddi` as keyof typeof watchedValues] as boolean ?? true}
                              onCheckedChange={(v) => form.setValue(`${key}Gaddi` as any, v)}
                              className="scale-75"
                            />
                          ) : (
                            <span className="text-[10px] text-slate-400">-</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  {selectedCabinetId ? (
                    <>
                      <Button onClick={updateSelectedCabinet} className="flex-1 bg-blue-600 hover:bg-blue-700">
                        <Save className="w-4 h-4 mr-2" />
                        Update Cabinet
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSelectedCabinetId(null);
                          form.reset(getFormDefaultValues(generateUUID, cabinets.length + 1, {}, getLocalMasterDefaults()));
                        }}
                      >
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <Button onClick={addCabinet} className="flex-1 bg-green-600 hover:bg-green-700">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Cabinet
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="max-w-2xl mx-auto">
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                <h3 className="text-lg font-semibold text-slate-800 mb-6">Master Settings</h3>

                {/* Default Materials */}
                <div className="mb-6">
                  <Label className="text-sm font-medium text-slate-700 mb-3 block">
                    Default Materials for New Cabinets
                  </Label>
                  <div className="grid grid-cols-3 gap-4">
                    <MaterialSelect
                      label="Default Plywood"
                      value={masterPlywoodBrand}
                      options={plywoodList}
                      onChange={(v) => {
                        setMasterPlywoodBrand(v);
                        saveMasterSettings({ masterPlywoodBrand: v });
                      }}
                    />
                    <MaterialSelect
                      label="Default Front Laminate"
                      value={masterLaminateCode}
                      options={laminateList}
                      onChange={(v) => {
                        setMasterLaminateCode(v);
                        saveMasterSettings({ masterLaminateCode: v });
                      }}
                    />
                    <MaterialSelect
                      label="Default Inner Laminate"
                      value={masterInnerLaminateCode}
                      options={laminateList}
                      onChange={(v) => {
                        setMasterInnerLaminateCode(v);
                        saveMasterSettings({ masterInnerLaminateCode: v } as any);
                      }}
                    />
                  </div>
                </div>

                <Separator className="my-6" />

                {/* Sheet Size */}
                <div className="mb-6">
                  <Label className="text-sm font-medium text-slate-700 mb-3 block flex items-center gap-2">
                    <Ruler className="w-4 h-4 text-blue-500" />
                    Sheet Size Settings
                  </Label>
                  <div className="grid grid-cols-3 gap-4">
                    <NumericInput
                      label="Sheet Width"
                      value={sheetWidth}
                      onChange={setSheetWidth}
                      min={500}
                      max={5000}
                    />
                    <NumericInput
                      label="Sheet Height"
                      value={sheetHeight}
                      onChange={setSheetHeight}
                      min={500}
                      max={5000}
                    />
                    <NumericInput
                      label="Kerf (Blade)"
                      value={kerf}
                      onChange={setKerf}
                      min={0}
                      max={10}
                    />
                  </div>
                </div>

                <Separator className="my-6" />

                {/* Optimization Toggle */}
                <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                  <div>
                    <Label className="text-sm font-medium text-green-800">Save Material Mode</Label>
                    <p className="text-xs text-green-700 mt-1">
                      Group different cabinets together on the same sheet if they match materials
                    </p>
                  </div>
                  <Switch
                    checked={optimizePlywoodUsage}
                    onCheckedChange={(v) => {
                      setOptimizePlywoodUsage(v);
                      saveMasterSettings({ optimizePlywoodUsage: v } as any);
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Optimization Tab */}
          {activeTab === 'optimize' && (
            <div className="max-w-4xl mx-auto">
              {!optimizationResult ? (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center">
                  <Scissors className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-slate-700 mb-2">No Optimization Results</h3>
                  <p className="text-sm text-slate-500 mb-6">
                    Add cabinets and run optimization to see cutting patterns
                  </p>
                  <Button
                    onClick={runOptimization}
                    disabled={cabinets.length === 0 || isOptimizing}
                    className="bg-indigo-500 hover:bg-indigo-600"
                  >
                    {isOptimizing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Optimizing...
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 mr-2" />
                        Run Optimization
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Summary Cards */}
                  <div className="grid grid-cols-4 gap-4">
                    <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
                      <div className="text-2xl font-bold text-slate-800">
                        {optimizationResult.brandResults.length}
                      </div>
                      <div className="text-xs text-slate-500">Material Groups</div>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
                      <div className="text-2xl font-bold text-slate-800">
                        {optimizationResult.brandResults.reduce(
                          (acc, br) => acc + (br.result?.panels?.length || 0),
                          0
                        )}
                      </div>
                      <div className="text-xs text-slate-500">Total Sheets</div>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
                      <div className="text-2xl font-bold text-slate-800">
                        {summaryStats.panelCount}
                      </div>
                      <div className="text-xs text-slate-500">Total Panels</div>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {(() => {
                          let totalUsed = 0;
                          let totalSheet = 0;
                          optimizationResult.brandResults.forEach((br: any) => {
                            (br.result?.panels || []).forEach((sheet: any) => {
                              totalSheet += sheetWidth * sheetHeight;
                              (sheet.placed || []).forEach((p: any) => {
                                totalUsed += (p.w || 0) * (p.h || 0);
                              });
                            });
                          });
                          return totalSheet > 0 ? ((totalUsed / totalSheet) * 100).toFixed(0) : 0;
                        })()}%
                      </div>
                      <div className="text-xs text-slate-500">Avg Efficiency</div>
                    </div>
                  </div>

                  {/* Material Breakdown */}
                  <div className="bg-white rounded-xl border border-slate-200 p-6">
                    <h4 className="text-md font-semibold text-slate-800 mb-4">Cutting Layouts</h4>
                    <div className="space-y-4">
                      {optimizationResult.brandResults.map((br, idx) => (
                        <SheetPreview
                          key={idx}
                          brandResult={br}
                          sheetWidth={sheetWidth}
                          sheetHeight={sheetHeight}
                          kerf={kerf}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Export Actions */}
                  <div className="flex justify-center gap-3">
                    <Button onClick={handleExportPDF} className="bg-red-500 hover:bg-red-600">
                      <Download className="w-4 h-4 mr-2" />
                      Export PDF
                    </Button>
                    <Button
                      variant="outline"
                      onClick={runOptimization}
                      disabled={isOptimizing}
                    >
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Re-optimize
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Preview Dialog */}
      <PreviewDialog
        open={showPreview}
        onOpenChange={setShowPreview}
        cabinets={cabinets}
        brandResults={optimizationResult?.brandResults || []}
        deletedPreviewSheets={new Set()}
        deletedPreviewPanels={new Set()}
        woodGrainsReady={true}
        sheetWidth={sheetWidth}
        sheetHeight={sheetHeight}
        kerf={kerf}
        pdfOrientation="landscape"
        clientName=""
        liveMaterialSummary={optimizationResult?.materialSummary || {}}
        colourFrameEnabled={false}
        colourFrameForm={{}}
        manualPanels={[]}
        loadingPreview={isOptimizing}
      />
    </div>
  );
}
