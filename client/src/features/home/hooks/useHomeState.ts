
import { useState, useEffect, useMemo, useRef } from 'react';
import { useHistory } from "@/lib/history";
import { useAutosave, loadAutosave } from "@/lib/persist";
import { createHomePageService } from "@/application/homePage/homePage.service";
import { useMasterSettingsStore, useGodownStore, usePreferencesStore } from '@/features/material';
import { useUIStore } from '@/features/uiStore';
import { useApiGuard } from '@/lib/api/useApiGuard';
import { useFeature } from '@/lib/system/useFeature';
import { debouncedFetch } from '@/lib/api/debouncedFetch';
import { safeFetchZod } from '@/lib/api/fetchZod';
import { API_BASE } from '@/lib/queryClient';
import { WoodGrainsMapSchema, WoodGrainsListSchema, safeValidateArray } from '@shared/schemas';
import { normArray, normString, normBoolean } from '@/lib/normalize';
import { logger } from '@/lib/system/logger';
import { Cabinet, ManualPanel } from '@shared/schema';
import { INITIAL_MANUAL_PANEL_FORM, INITIAL_COLOUR_FRAME_FORM } from '@/pages/homePageConstants';
import type {
    ManualPanelFormState,
    ColourFrameFormState,
    PendingMaterialAction
} from '@/pages/homePageTypes';

export interface UseHomeStateProps {
    homePageMock?: any;
}

export const useHomeState = ({ homePageMock }: UseHomeStateProps = {}) => {
    // 1. Service & Infrastructure
    const homePageService = useMemo(() => createHomePageService(homePageMock), [homePageMock]);
    const { guard: apiGuard, status: apiStatus } = useApiGuard();
    const useWorker = useFeature("optimizerWorker");

    // 2. History & Persistence
    const cabinetsHistory = useHistory<Cabinet[]>([]);
    const cabinets = cabinetsHistory.present;
    const setCabinets = cabinetsHistory.set;

    const manualPanelsHistory = useHistory<ManualPanel[]>([]);
    const manualPanels = manualPanelsHistory.present;
    const setManualPanels = manualPanelsHistory.set;

    useAutosave(cabinets, manualPanels);

    // 3. Store Subscriptions
    const masterSettings = useMasterSettingsStore(s => s.data);
    const isLoadingMasterSettings = useMasterSettingsStore(s => s.loading);
    const fetchMasterSettings = useMasterSettingsStore(s => s.fetch);
    const plywoodOptions = useGodownStore(s => s.plywoodOptions);
    const laminateOptions = useGodownStore(s => s.laminateOptions);
    const isLoadingMaterials = useGodownStore(s => s.loading);
    const fetchMaterials = useGodownStore(s => s.fetch);
    const fetchPreferences = usePreferencesStore(s => s.fetch);
    const woodGrainsPreferences = usePreferencesStore(s => s.woodGrains);
    const setWoodGrainInStore = usePreferencesStore(s => s.setWoodGrain);

    // 4. Shared UI State
    const [selectedRoom, setSelectedRoom] = useState('Kitchen');
    const [customRoomName, setCustomRoomName] = useState('');
    const [clientName, setClientName] = useState('');
    const [isOptimizing, setIsOptimizing] = useState(false);
    const [pendingMaterialAction, setPendingMaterialAction] = useState<PendingMaterialAction | null>(null);
    const [pdfOrientation] = useState<'landscape' | 'portrait'>('portrait');

    const [masterSettingsVisible, setMasterSettingsVisible] = useState(false);
    const [masterPlywoodBrand, setMasterPlywoodBrand] = useState('');
    const [masterLaminateCode, setMasterLaminateCode] = useState('');
    const [masterInnerLaminateCode, setMasterInnerLaminateCode] = useState('');
    const [optimizePlywoodUsage, setOptimizePlywoodUsage] = useState(true);

    const [sheetWidth, setSheetWidth] = useState(1210);
    const [sheetHeight, setSheetHeight] = useState(2420);
    const [kerf, setKerf] = useState(5);

    const [manualPanelForm, setManualPanelForm] = useState<ManualPanelFormState>({ ...INITIAL_MANUAL_PANEL_FORM });
    const [colourFrameForm, setColourFrameForm] = useState<ColourFrameFormState>({ ...INITIAL_COLOUR_FRAME_FORM });
    const [colourFrameEnabled] = useState(false);

    const [userSelectedLaminates, setUserSelectedLaminates] = useState<Set<string>>(
        () => homePageService.getLaminateTracking()
    );

    // 5. Refs
    const cabinetSectionRef = useRef<HTMLDivElement>(null);
    const projectDetailsSectionRef = useRef<HTMLDivElement>(null);
    const plywoodLaminatesRef = useRef<HTMLButtonElement>(null);
    const centerPostSectionRef = useRef<HTMLDivElement>(null);
    const shutterConfigSectionRef = useRef<HTMLDivElement>(null);
    const cabinetHeightInputRef = useRef<HTMLInputElement>(null);
    const shutterHeightInputRef = useRef<HTMLInputElement>(null);
    const savedClientsRef = useRef<Set<string>>(new Set());

    // 6. Effects
    // Initial Data Fetch
    useEffect(() => {
        fetchMasterSettings();
        fetchMaterials();
        fetchPreferences();
    }, [fetchMasterSettings, fetchMaterials, fetchPreferences]);

    // Restore autosave
    useEffect(() => {
        const saved = loadAutosave();
        if (saved && (saved.cabinets.length > 0 || saved.panels.length > 0)) {
            setCabinets(saved.cabinets as Cabinet[]);
            setManualPanels(saved.panels as ManualPanel[]);
            logger.log(`[Autosave] Restored ${saved.cabinets.length} cabinets and ${saved.panels.length} panels`);
        }
    }, [setCabinets, setManualPanels]);

    // Sync Master Settings from store to local state (one-way bridge for UI inputs)
    useEffect(() => {
        if (masterSettings?.masterLaminateCode && masterSettings.masterLaminateCode !== masterLaminateCode) {
            setMasterLaminateCode(masterSettings.masterLaminateCode);
        }
        const inner = (masterSettings as any)?.masterInnerLaminateCode ?? (masterSettings as any)?.innerLaminateCode;
        if (inner && inner !== masterInnerLaminateCode) {
            setMasterInnerLaminateCode(inner);
        }
        if (masterSettings && (masterSettings as any).optimizePlywoodUsage !== undefined) {
            const val = (masterSettings as any).optimizePlywoodUsage === 'true' || (masterSettings as any).optimizePlywoodUsage === true;
            if (val !== optimizePlywoodUsage) {
                setOptimizePlywoodUsage(val);
            }
        }
    }, [masterSettings, masterLaminateCode, masterInnerLaminateCode, optimizePlywoodUsage]);

    // Sync Plywood Brand
    useEffect(() => {
        const masterBrand = (masterSettings as any)?.masterPlywoodBrand;
        if (masterBrand && masterBrand !== masterPlywoodBrand) {
            setMasterPlywoodBrand(masterBrand);
            return;
        }
        if (!masterPlywoodBrand && !isLoadingMasterSettings && plywoodOptions.length > 0) {
            setMasterPlywoodBrand(plywoodOptions[0].brand);
        }
    }, [masterPlywoodBrand, masterSettings, plywoodOptions, isLoadingMasterSettings]);

    // Auto-save Master Settings when local state changes (width, height, kerf)
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (sheetWidth > 0 && sheetHeight > 0) {
                // We use debouncedFetch or just fetch directly for memory
                fetch(`${API_BASE}/api/master-settings-memory`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        sheetWidth: String(sheetWidth),
                        sheetHeight: String(sheetHeight),
                        kerf: String(kerf),
                    })
                }).catch(err => logger.error('Failed to save master settings', err));
            }
        }, 1000);
        return () => clearTimeout(timeoutId);
    }, [sheetWidth, sheetHeight, kerf]);

    // Save tracking
    useEffect(() => {
        homePageService.saveLaminateTracking(userSelectedLaminates);
    }, [userSelectedLaminates, homePageService]);

    // Prompted clients tracking
    useEffect(() => {
        savedClientsRef.current = homePageService.getPromptedClients();
    }, [homePageService]);

    // Orphaned material cleanup
    useEffect(() => {
        if (laminateOptions.length > 0 || plywoodOptions.length > 0) {
            const validLaminates = laminateOptions.map(item => item.code.toLowerCase());
            const validPlywood = plywoodOptions.map(item => item.brand.toLowerCase());
            homePageService.cleanOrphanedMaterials(validLaminates, validPlywood);
        }
    }, [laminateOptions.length, plywoodOptions.length, homePageService]);

    // Fetch wood grains
    useEffect(() => {
        async function fetchWoodGrains() {
            const json = await debouncedFetch(
                'wood-grains-preferences',
                () => safeFetchZod(
                    `${API_BASE}/api/wood-grains-preferences`,
                    WoodGrainsListSchema,
                    []
                )
            );

            const normalizedList = normArray(json).map((item: any) => ({
                laminateCode: normString(item?.laminateCode),
                hasWoodGrains: normBoolean(item?.hasWoodGrains)
            }));

            const validatedList = safeValidateArray(WoodGrainsListSchema, normalizedList);

            const map: Record<string, boolean> = {};
            validatedList.forEach((item) => {
                if (item.laminateCode) {
                    map[item.laminateCode] = item.hasWoodGrains;
                }
            });

            // Update store
            Object.entries(map).forEach(([key, value]) => {
                setWoodGrainInStore(key, value);
            });
        }
        fetchWoodGrains();
    }, [setWoodGrainInStore]);

    const woodGrainsReady = true;

    return {
        // Services
        homePageService,
        apiGuard,
        apiStatus,
        useWorker,

        // History
        cabinets,
        setCabinets,
        cabinetsHistory,
        manualPanels,
        setManualPanels,
        manualPanelsHistory,

        // Data
        masterSettings,
        isLoadingMasterSettings,
        plywoodOptions,
        laminateOptions,
        isLoadingMaterials,
        woodGrainsPreferences,
        woodGrainsReady,

        // State
        selectedRoom, setSelectedRoom,
        customRoomName, setCustomRoomName,
        clientName, setClientName,
        isOptimizing, setIsOptimizing,
        pendingMaterialAction, setPendingMaterialAction,
        pdfOrientation,
        masterSettingsVisible, setMasterSettingsVisible,
        masterPlywoodBrand, setMasterPlywoodBrand,
        masterLaminateCode, setMasterLaminateCode,
        masterInnerLaminateCode, setMasterInnerLaminateCode,
        optimizePlywoodUsage, setOptimizePlywoodUsage,
        sheetWidth, setSheetWidth,
        sheetHeight, setSheetHeight,
        kerf, setKerf,
        manualPanelForm, setManualPanelForm,
        colourFrameForm, setColourFrameForm,
        colourFrameEnabled,
        userSelectedLaminates, setUserSelectedLaminates,

        // Refs
        cabinetSectionRef,
        projectDetailsSectionRef,
        plywoodLaminatesRef,
        centerPostSectionRef,
        shutterConfigSectionRef,
        cabinetHeightInputRef,
        shutterHeightInputRef,
        savedClientsRef
    };
};
