import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
// PATCH 41: Stable callback hook to prevent effect loops
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { useUIStore } from '@/features/uiStore';
import { useStableCallback } from '@/lib/hooks/useStableCallback';


import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
// PATCH 39: Centralized error toasting
// import { toastError } from '@/lib/errors/toastError'; // Removed in cleanup
// import { useApiGuard } from '@/lib/api/useApiGuard'; // Replaced by useHomeState
// import { useFeature } from '@/lib/system/useFeature'; // Replaced by useHomeState
import DesignCenter from "@/modules/design";
// PATCH Phase 2: Dialog components replaced by containers
import SpreadsheetSection from "@/components/cutlist-preview/SpreadsheetSection";
import DesignCenterSection from "@/components/cutlist-preview/DesignCenterSection";
import CabinetForm from "@/components/cabinet-form/CabinetForm";
import RenderGuard from "@/components/guards/RenderGuard";
import { MasterSettingsCard } from "@/components/home/MasterSettingsCard";
import { ProjectDetailsCard } from "@/components/home/ProjectDetailsCard";
import { ActionButtonsSection } from "@/components/home/ActionButtonsSection";
import { CollapsibleCard } from "@/components/home/CollapsibleCard";
import { UndoRedoButtons } from "@/components/home/UndoRedoButtons";
import { SummarySection } from "@/features/home/components/SummarySection";
import { CabinetSection } from "@/features/home/components/CabinetSection";
// PATCH Phase 2: Dialog containers
import {
  PanelDeleteDialogContainer,
  MaterialConfirmDialogContainer,
  ClearConfirmDialogContainer,
  ManualPanelDialogContainer,
  PreviewDialogContainer,
} from "@/features/home/components/dialogs";
import { EmptyBlock } from "@/components/system/StatusBlocks";
import { Cabinet, cabinetSchema } from '@shared/schema';




// ✅ MODULES: Simple panel optimization
import { composeLaminateCode } from '@/lib/laminates/composeLaminateCode';

import { generateUUID } from "@/lib/uuid";

import { SummaryPanel } from '@/components/summary';
import { CabinetSummaryPanel } from '@/components/summary/CabinetSummaryPanel';
import { calculateShutterCount } from '@/lib/summary';
import {

  validateBeforeOptimize
} from "@/lib/validation/ValidationEngine";

import {
  getMasterDefaults,
} from "@/lib/settings/MasterSettingsEngine";

import {
  getFormDefaultValues,
} from "@/lib/form/FormDefaultsEngine";



// PATCH 23: Undo/Redo history
// import { useHistory } from "@/lib/history"; // Replaced by useHomeState

// PATCH 24: Autosave & Recovery
// import { loadAutosave, useAutosave } from "@/lib/persist"; // Replaced by useHomeState
// import { createHomePageService } from "@/application/homePage/homePage.service"; // Replaced by useHomeState

// PATCH 27: Split material store into focused slices
// import { useMasterSettingsStore, useGodownStore, usePreferencesStore } from '@/features/material'; // Replaced by useHomeState
import { useOptimization } from '@/features/home/hooks/useOptimization';
import { useHomeState } from '@/features/home/hooks/useHomeState';
import { useCabinetOperations } from '@/features/home/hooks/useCabinetOperations';
import { useHomeExports } from '@/features/home/hooks/useHomeExports';
// PATCH 28: Preview state isolation
import { usePreviewStore } from '@/features/preview';
// normArray, normString, normBoolean, normNumber removed correctly as they are in useHomeState.ts
/*
import { normArray, normString, normBoolean, normNumber } from '@/lib/normalize';
*/
/*
import {
  WoodGrainsListSchema,
  MasterSettingsMemorySchema,
  safeValidate,
  safeValidateArray
} from '@shared/schemas';
*/
/*
import {
  INITIAL_MANUAL_PANEL_FORM,
  INITIAL_COLOUR_FRAME_FORM
} from './homePageConstants';
*/
/*
import type {
  ManualPanel,
  ManualPanelFormState,
  ColourFrameFormState,
  PendingMaterialAction
} from './homePageTypes';
*/


interface HomeProps {
  showAsCabinetsPage?: boolean;
  homePageMock?: HomePageMockData;
}

export default function Home({ homePageMock }: HomeProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  // 1. Initial State & Logic Consolidation (Phase 6.3)
  const {
    homePageService,
    apiGuard,
    apiStatus,
    useWorker,
    cabinets,
    setCabinets,
    cabinetsHistory,
    manualPanels,
    setManualPanels,
    manualPanelsHistory,
    masterSettings,
    plywoodOptions,
    laminateOptions,
    isLoadingMaterials,
    woodGrainsPreferences,
    woodGrainsReady,
    selectedRoom, setSelectedRoom,
    customRoomName, setCustomRoomName,
    clientName, setClientName,
    isOptimizing, setIsOptimizing,
    pendingMaterialAction, setPendingMaterialAction,
    // PATCH Phase 2: pdfOrientation now managed by PreviewDialogContainer
    masterSettingsVisible, setMasterSettingsVisible,
    masterPlywoodBrand, setMasterPlywoodBrand,
    masterLaminateCode, setMasterLaminateCode,
    masterInnerLaminateCode,
    optimizePlywoodUsage, setOptimizePlywoodUsage,
    sheetWidth, setSheetWidth,
    sheetHeight, setSheetHeight,
    kerf, setKerf,
    manualPanelForm, setManualPanelForm,
    colourFrameForm, setColourFrameForm,
    colourFrameEnabled,
    userSelectedLaminates, setUserSelectedLaminates,
    cabinetSectionRef,
    projectDetailsSectionRef,
    plywoodLaminatesRef,
    centerPostSectionRef,
    shutterConfigSectionRef,
    cabinetHeightInputRef,
    shutterHeightInputRef
  } = useHomeState({ homePageMock });

  const {
    cabinetConfigMode,
    panelsLinked,
    // PATCH Phase 2: Dialog state now accessed by containers
    // showPreviewDialog, showManualPanelDialog, showClearConfirmDialog, showMaterialConfirmDialog, panelToDelete
    isPreviewActive,
    setCabinetConfigMode,
    setPanelsLinked,
    openPreview,
    // PATCH Phase 2: Dialog actions now accessed by containers
    // closePreview, openManualPanel, closeManualPanel, openClearConfirm, closeClearConfirm, openMaterialConfirm, closeMaterialConfirm
    setIsPreviewActive,
  } = useUIStore();
  // PATCH Phase 2: pdfOrientation now managed by PreviewDialogContainer
  // const [pdfOrientation, setPdfOrientation] = useState<'portrait' | 'landscape'>('portrait');

  const currentSyncOrigin = useRef<string | null>(null);

  const [laminateCodes] = useState<LaminateCode[]>([]);
  const [cabinetConfigVisible] = useState(false);
  const [plywoodLaminatesOpen] = useState(false);
  const [individualPanelsOpen] = useState(true);
  const [projectDetailsVisible, setProjectDetailsVisible] = useState(false);
  const [designCenterVisible, setDesignCenterVisible] = useState(false);

  // PATCH Phase 2: Preview/Sheet state now managed by dialog containers
  // const { deletedSheets, deletedPanels } = usePreviewStore();
  // const selectedSheetContext = usePreviewStore((s) => s.selectedSheetContext);
  // const setSelectedSheetContext = usePreviewStore((s) => s.setSelectedSheetContext);


  // Load stored form memory for initialization
  const validLaminates = useMemo(() =>
    !isLoadingMaterials && laminateOptions.length > 0
      ? laminateOptions.map(item => item.code.toLowerCase())
      : undefined
    , [isLoadingMaterials, laminateOptions]);

  const validPlywood = useMemo(() =>
    !isLoadingMaterials && plywoodOptions.length > 0
      ? plywoodOptions.map(item => item.brand.toLowerCase())
      : undefined
    , [isLoadingMaterials, plywoodOptions]);

  const storedMemory = useMemo(() =>
    homePageService.getCabinetFormMemory(validLaminates, validPlywood)
    , [homePageService, validLaminates, validPlywood]);

  const masterDefaults = useMemo(() =>
    getMasterDefaults(masterPlywoodBrand, masterLaminateCode, masterInnerLaminateCode, masterSettings)
    , [masterPlywoodBrand, masterLaminateCode, masterInnerLaminateCode, masterSettings]);

  // Form Management
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

  const topPanelLaminateCode = watchedValues.topPanelLaminateCode || '';
  const bottomPanelLaminateCode = watchedValues.bottomPanelLaminateCode || '';
  const leftPanelLaminateCode = watchedValues.leftPanelLaminateCode || '';
  const rightPanelLaminateCode = watchedValues.rightPanelLaminateCode || '';
  const backPanelLaminateCode = watchedValues.backPanelLaminateCode || '';
  const shutterLaminateCode = watchedValues.shutterLaminateCode || '';
  const shutterPlywoodBrand = watchedValues.shutterPlywoodBrand || '';
  const shutterInnerLaminateCode = watchedValues.shutterInnerLaminateCode || '';

  // Tracking Helpers
  const markLaminateAsUserSelected = (field: string) => {
    setUserSelectedLaminates(prev => new Set(prev).add(field));
  };


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
        homePageService.saveCabinetFormMemory({
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
    const topCode = String(topPanelLaminateCode || '').split('+')[0].trim(); // Fixed potential undefined
    const bottomCode = String(bottomPanelLaminateCode || '').split('+')[0].trim();
    const leftCode = String(leftPanelLaminateCode || '').split('+')[0].trim();
    // @ts-expect-error - suppress strict null check
    const rightCode = String(rightPanelLaminateCode || '').split('+')[0].trim();
    const backCode = String(backPanelLaminateCode || '').split('+')[0].trim();
    const shutterCode = String(shutterLaminateCode || '').split('+')[0].trim();

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



  // PATCH 25: Memoize derived arrays from Zustand store
  const globalLaminateMemory = useMemo(
    () => laminateOptions.map(item => item.code),
    [laminateOptions]
  );

  const globalPlywoodBrandMemory = useMemo(
    () => plywoodOptions.map(item => item.brand),
    [plywoodOptions]
  );

  // ✅ Clean orphaned materials from storage when materials are loaded
  useEffect(() => {
    if (!isLoadingMaterials && laminateOptions.length >= 0 && plywoodOptions.length >= 0) {
      const validLaminates = laminateOptions.map(item => item.code.toLowerCase());
      const validPlywood = plywoodOptions.map(item => item.brand.toLowerCase());
      homePageService.cleanOrphanedMaterials(validLaminates, validPlywood);

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







  // Sync Cabinet Configuration Front Laminate to ALL panels (Top/Bottom/Left/Right/Back)
  const syncCabinetConfigFrontLaminate = (newValue: string, markAsUserSelected: boolean = false) => {
    if (currentSyncOrigin.current === 'cabinet-front-sync') return;
    if (!panelsLinked) return; // Only sync when panels are linked

    currentSyncOrigin.current = 'cabinet-front-sync';

    // Update ALL panel front laminate codes (Top/Bottom/Left/Right/Back)
    if (markAsUserSelected) {
      updateLaminateWithTracking('bestPanelLaminateCode', newValue, 'user');
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

  const uniqueLaminateCodes = useMemo(() =>
    Array.from(new Set(laminateOptions.map(l => l.code)))
    , [laminateOptions]);

  const globalLaminateMemory = useMemo(
    () => laminateOptions.map(item => item.code),
    [laminateOptions]
  );

  const globalPlywoodBrandMemory = useMemo(
    () => plywoodOptions.map(item => item.brand),
    [plywoodOptions]
  );


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
  }, [cabinetConfigMode]);

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

  // Auto-save logic for client prompts moved to useHomeState





  // ✅ ASYNC OPTIMIZATION: Logic moved to useOptimization hook
  // PATCH Phase 2: previewBrandResults now accessed by PreviewDialogContainer
  const {
    liveMaterialSummary,
    cuttingListSummary,
  } = useOptimization({
    cabinets,
    manualPanels,
    sheetWidth,
    sheetHeight,
    kerf,
    woodGrainsPreferences,
    showPreviewDialog,
    isPreviewActive,
    deletedPreviewSheets,
    useWorkerFeatureFlag: useWorker
  });



  // PATCH 25: Memoize unique laminate codes for wood grains UI
  const uniqueLaminateCodes = useMemo(() => {
    return Array.from(new Set(globalLaminateMemory.map(s => s.trim()).filter(Boolean)))
      .filter((code, index, self) =>
        index === self.findIndex(t => t.toLowerCase() === code.toLowerCase())
      );
  }, [globalLaminateMemory]);



  // PATCH 25: Memoize shutter dimension calculator
  const calculateShutterDimensions = useCallback((cabinet: Cabinet): { width: number; height: number; laminateCode?: string }[] => {
    // 🔒 PROTECTED CALCULATION LOGIC
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
  }, []);

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
  }, [watchedValues.shutters.length, watchedValues.shuttersEnabled, watchedValues.shutters]);

  // Mark memory-loaded laminate codes as user-selected on initial mount
  useEffect(() => {
    const { validLaminates, validPlywood } = getValidationArrays();
    const memory = homePageService.getCabinetFormMemory(validLaminates, validPlywood);
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

  const {
    addCabinet,
    removeCabinet,
    updateCabinets,
    // Helpers exposed from hook
    updateLaminateWithTracking,
    getValidationArrays
  } = useCabinetOperations({
    cabinets,
    setCabinets,
    woodGrainsPreferences,
    cabinetConfigMode,
    userSelectedLaminates,
    setUserSelectedLaminates,
    setPendingMaterialAction,
    openMaterialConfirm,
    closeMaterialConfirm,
    cabinetHeightInputRef,
    shutterHeightInputRef,
    cabinetSectionRef,
    form,
    toast,
    laminateOptions,
    plywoodOptions,
    isLoadingMaterials,
    masterSettings,
    masterPlywoodBrand,
    masterLaminateCode,
    masterInnerLaminateCode
  });

  // Export logic moved to useHomeExports hook

  // PATCH 50: Use extracted export hook
  const {
    handlePrint: printList,
    handleExcelExport: exportToExcel,
    handleGoogleSheetsExport: exportToGoogleSheets,
    handleSaveToClientFolder
  } = useHomeExports({
    cabinets,
    cuttingListSummary,
    liveMaterialSummary,
    clientName,
    selectedRoom,
    customRoomName,
    sheetWidth,
    sheetHeight,
    kerf,
    woodGrainsPreferences,
    manualPanels,
    deletedPreviewSheets,
    pdfOrientation: 'portrait', // Assuming a default or derived value for pdfOrientation
    apiGuard,
    woodGrainsReady,
    useWorker,
    toast
  });

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
                onClick={() => navigate("/client-info")}
                className="px-4 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-white rounded-full transition-all"
              >
                Client Info
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
              <button
                className="md:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
                aria-label="Open mobile menu"
                title="Open menu"
              >
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
              onClick={() => navigate("/client-info")}
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
            <MasterSettingsCard
              visible={masterSettingsVisible}
              onToggleVisible={() => setMasterSettingsVisible(!masterSettingsVisible)}
              masterPlywoodBrand={masterPlywoodBrand}
              setMasterPlywoodBrand={setMasterPlywoodBrand}
              masterLaminateCode={masterLaminateCode}
              setMasterLaminateCode={setMasterLaminateCode}
              optimizePlywoodUsage={optimizePlywoodUsage}
              setOptimizePlywoodUsage={setOptimizePlywoodUsage}
              sheetWidth={sheetWidth}
              setSheetWidth={setSheetWidth}
              sheetHeight={sheetHeight}
              setSheetHeight={setSheetHeight}
              kerf={kerf}
              setKerf={setKerf}
              woodGrainsPreferences={woodGrainsPreferences}
              setWoodGrainsPreferences={setWoodGrainsPreferences}
              uniqueLaminateCodes={uniqueLaminateCodes}
              globalLaminateMemory={globalLaminateMemory}
              saveMasterSettings={saveMasterSettings}
            />

            {/* Project Details Card */}
            <ProjectDetailsCard
              ref={projectDetailsSectionRef}
              visible={projectDetailsVisible}
              onToggleVisible={() => setProjectDetailsVisible(!projectDetailsVisible)}
              clientName={clientName}
              setClientName={setClientName}
              selectedRoom={selectedRoom}
              setSelectedRoom={setSelectedRoom}
              customRoomName={customRoomName}
              setCustomRoomName={setCustomRoomName}
              onSave={handleSaveToClientFolder}
              canSave={!!(clientName.trim() && cabinets.length > 0)}
              disabled={!woodGrainsReady}
            />


            {/* Cabinet Configuration Form */}
            <RenderGuard ready={materialsLoaded && masterSettingsLoaded}>
              {/* PATCH 20: Removed gaddi props - CabinetForm now uses form.watch()/setValue() directly */}
              {/* PATCH 36: Enforce array defaults at boundary */}
              <CabinetForm
                form={form}

                cabinetConfigMode={cabinetConfigMode}
                setCabinetConfigMode={setCabinetConfigMode}
                updateShutters={updateShutters}
                panelsLinked={panelsLinked}
                setPanelsLinked={setPanelsLinked}
                laminateCodes={laminateOptions.map(l => ({ ...l, id: String(l.id) }))}
                plywoodTypes={Array.isArray(validPlywood) ? validPlywood : []}
                handleAddCabinet={() => addCabinet(form.getValues())}
                cabinetHeightInputRef={cabinetHeightInputRef}
                shutterHeightInputRef={shutterHeightInputRef}
                cabinetSectionRef={cabinetSectionRef}
              />
            </RenderGuard>

            {/* Preview & Action Buttons - Modern SaaS Style */}
            <ActionButtonsSection
              onSpreadsheetClick={() => {
                const spreadsheetSnapshot = homePageService.getSpreadsheetSnapshot();
                if (!spreadsheetSnapshot.hasRows) {
                  toast({
                    title: "No Spreadsheet Data",
                    description: "Please add rows to the Panel Spreadsheet first.",
                    variant: "destructive"
                  });
                  return;
                }
                const spreadsheetSection = document.querySelector('[data-spreadsheet-section]');
                if (spreadsheetSection) {
                  spreadsheetSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  toast({
                    title: "Spreadsheet Ready",
                    description: "Your spreadsheet data is ready. Edit and customize as needed.",
                  });
                }
              }}
              onPreviewClick={() => {
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
                setTimeout(() => {
                  openPreview();
                  setIsPreviewActive(true);
                  usePreviewStore.getState().clearAll();
                  setTimeout(() => {
                    setIsOptimizing(false);
                  }, 700);
                }, 100);
              }}
              onClearClick={openClearConfirm}
              isOptimizing={isOptimizing}
              isDisabled={apiStatus === "error"}
            />

            {/* Design Center */}
            <CollapsibleCard
              ref={designCenterSectionRef}
              title="Design Center"
              icon="fa-palette"
              iconGradient="from-purple-500 to-pink-500"
              headerGradient="from-purple-50"
              visible={designCenterVisible}
              onToggleVisible={() => setDesignCenterVisible(!designCenterVisible)}
            >
              <DesignCenter />
            </CollapsibleCard>

          </div>

          {/* Right Column - Cabinet List & Summary - Extracted to SummarySection */}
          <SummarySection
            cabinets={cabinets}
            cuttingListSummary={cuttingListSummary}
            liveMaterialSummary={liveMaterialSummary}
            onExportExcel={exportToExcel}
            onExportGoogleSheets={exportToGoogleSheets}
            onPrint={printList}
            removeCabinet={removeCabinet}
            form={form}
            canUndo={cabinetsHistory.canUndo}
            canRedo={cabinetsHistory.canRedo}
            onUndo={() => {
              cabinetsHistory.undo();
              manualPanelsHistory.undo();
            }}
            onRedo={() => {
              cabinetsHistory.redo();
              manualPanelsHistory.redo();
            }}
          />
        </div>
      </main >

      {/* PATCH Phase 2: Dialog Containers - Step 5/5 */}
      <PreviewDialogContainer
        cabinets={cabinets}
        manualPanels={manualPanels}
        sheetWidth={sheetWidth}
        sheetHeight={sheetHeight}
        kerf={kerf}
        clientName={clientName}
        colourFrameEnabled={colourFrameEnabled}
        colourFrameForm={colourFrameForm}
        woodGrainsPreferences={woodGrainsPreferences}
      />

      {/* PATCH Phase 2: Dialog Containers - Step 4/5 */}
      <ManualPanelDialogContainer
        manualPanelForm={manualPanelForm}
        setManualPanelForm={setManualPanelForm}
        globalPlywoodBrandMemory={globalPlywoodBrandMemory}
        laminateCodes={laminateCodes}
        woodGrainsPreferences={woodGrainsPreferences}
        setManualPanels={setManualPanels}
      />

      {/* PATCH Phase 2: Dialog Containers - Step 3/5 */}
      <ClearConfirmDialogContainer
        form={form}
        updateCabinets={updateCabinets}
        setManualPanels={setManualPanels}
        masterPlywoodBrand={masterPlywoodBrand}
        masterLaminateCode={masterLaminateCode}
        onClearAutosave={clearAutosave}
      />

      {/* PATCH Phase 2: Dialog Containers - Step 2/5 */}
      <MaterialConfirmDialogContainer
        pendingMaterialAction={pendingMaterialAction}
        setPendingMaterialAction={setPendingMaterialAction}
      />

      {/* PATCH Phase 2: Dialog Containers - Step 1/5 */}
      <PanelDeleteDialogContainer />

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
