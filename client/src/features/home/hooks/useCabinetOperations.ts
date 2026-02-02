
import { useCallback } from 'react';
import { Cabinet } from '@shared/schema';
import { UseFormReturn } from 'react-hook-form';
import {
    prepareCabinet,
    extractCabinetMemory,
    normalizeCabinetData as normalizeCabinetDataPure,
    computeGrainDirections as computeGrainDirectionsPure
} from '@/lib/submit';
import {
    validateBeforeAddCabinet
} from '@/lib/validation/ValidationEngine';
import {
    getFormResetValues,
    getCabinetResetDefaults,
    hasWoodGrainPreference
} from '@/lib/form/FormDefaultsEngine';
import {
    getMasterDefaults,
    applyMasterDefaultsToCabinet
} from "@/lib/settings/MasterSettingsEngine";
import { generateUUID } from '@/lib/uuid';
import { homePageService } from '@/application/homePage/homePage.service';
import { useUIStore } from '@/features/uiStore';

interface DesignCenterExportData {
    width: number;
    height: number;
    depth: number;
    name: string;
}

export interface UseCabinetOperationsProps {
    cabinets: Cabinet[];
    setCabinets: (updater: Cabinet[] | ((prev: Cabinet[]) => Cabinet[])) => void;
    woodGrainsPreferences: Record<string, boolean>;
    cabinetConfigMode: "basic" | "advanced";
    userSelectedLaminates: Set<string>;
    setUserSelectedLaminates: (updater: Set<string> | ((prev: Set<string>) => Set<string>)) => void;
    setPendingMaterialAction: (action: any) => void;
    openMaterialConfirm: () => void;
    closeMaterialConfirm: () => void;
    cabinetHeightInputRef: React.RefObject<HTMLInputElement>;
    shutterHeightInputRef: React.RefObject<HTMLInputElement>;
    cabinetSectionRef: React.RefObject<HTMLDivElement>;
    form: UseFormReturn<any>;
    toast: any;
    laminateOptions: any[];
    plywoodOptions: any[];
    isLoadingMaterials: boolean;
    masterSettings: any;
    masterPlywoodBrand: string | null;
    masterLaminateCode: string | null;
    masterInnerLaminateCode: string | null;
}

export const useCabinetOperations = ({
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
}: UseCabinetOperationsProps) => {

    const closePreview = useUIStore(state => state.closePreview);

    const updateLaminateWithTracking = (field: string, value: string, source: 'user' | 'auto') => {
        form.setValue(field, value);
        if (source === 'user') {
            setUserSelectedLaminates(prev => {
                const updated = new Set(prev).add(field);
                return updated;
            });
        }
    };

    const clearUserLaminateTracking = () => {
        setUserSelectedLaminates(new Set());
        homePageService.clearLaminateTracking();
    };

    const getValidationArrays = useCallback(() => {
        const validLaminates = !isLoadingMaterials && laminateOptions.length > 0
            ? laminateOptions.map(item => item.code.toLowerCase())
            : undefined;
        const validPlywood = !isLoadingMaterials && plywoodOptions.length > 0
            ? plywoodOptions.map(item => item.brand.toLowerCase())
            : undefined;
        return { validLaminates, validPlywood };
    }, [isLoadingMaterials, laminateOptions, plywoodOptions]);

    // Defaults helper
    const getLocalMasterDefaults = () => {
        return getMasterDefaults(masterPlywoodBrand || '', masterLaminateCode || '', masterInnerLaminateCode || '', masterSettings);
    };

    const applyDefaultsToCabinet = (cabinet: Cabinet): Cabinet => {
        const defaults = getLocalMasterDefaults();
        if (!defaults) return cabinet; // No defaults to apply
        return applyMasterDefaultsToCabinet(cabinet, defaults);
    };

    // Utility wrapper using pure functions for normalization and grain direction
    const updateCabinets = useCallback((updater: Cabinet[] | ((prev: Cabinet[]) => Cabinet[])) => {
        // Helper: normalize collection using pure function
        const normalizeCollection = (cabs: Cabinet[]) =>
            cabs.map(c => normalizeCabinetDataPure(c));

        if (typeof updater === 'function') {
            // If updater is a function, call it, normalize, and compute grain directions with FRESH values
            setCabinets((prev) => {
                const updated = updater(prev);
                const normalized = normalizeCollection(updated);
                // Recompute grain directions using pure function
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
    }, [setCabinets, woodGrainsPreferences]);

    // Internal function to actually add the cabinet (called directly or after confirmation)
    const performAddCabinet = (cabinet: Cabinet) => {
        // Use pure function for cabinet preparation
        // This applies gaddi defaults and computes grain directions
        const { cabinet: preparedCabinet } = prepareCabinet({
            cabinet,
            configurationMode: (cabinet.configurationMode as "basic" | "advanced") || 'advanced',
            woodGrainsPreferences
        });

        // Side effect: Update cabinets state
        updateCabinets((prev: Cabinet[]) => [...prev, preparedCabinet]);

        // Use pure function to extract memory data
        const memoryData = extractCabinetMemory(cabinet);
        homePageService.saveCabinetFormMemory(memoryData);

        // Clear user-laminate tracking for next cabinet
        clearUserLaminateTracking();

        // Reset form with saved memory values
        const { validLaminates, validPlywood } = getValidationArrays();
        const memory = homePageService.getCabinetFormMemory(validLaminates, validPlywood);
        const shutterMemoryNew = homePageService.getShutterFormMemory(validLaminates, validPlywood);

        // Compute grain directions from memory laminate codes using database preferences
        const hasTopWoodGrain = hasWoodGrainPreference(memory.topPanelLaminateCode, woodGrainsPreferences);
        const hasBackWoodGrain = hasWoodGrainPreference(memory.backPanelLaminateCode, woodGrainsPreferences);

        // We need to cast the reset values because TypeScript might complain about partial matches
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
        }
        if (memory.backPanelLaminateCode) {
            updateLaminateWithTracking('backPanelLaminateCode', memory.backPanelLaminateCode, 'user');
            // Only populate back panel inner laminate if it exists in memory
            if (memory.backPanelInnerLaminateCode) {
                updateLaminateWithTracking('backPanelInnerLaminateCode', memory.backPanelInnerLaminateCode, 'user');
            }
        }

        // Reset gaddi toggles via form - always ON by default
        form.setValue('topPanelGaddi', true);
        form.setValue('bottomPanelGaddi', true);
        form.setValue('leftPanelGaddi', true);
        form.setValue('rightPanelGaddi', true);

        // Close preview dialog after adding cabinet so next preview shows fresh data
        closePreview();

        toast({
            title: "Cabinet Added",
            description: `${cabinet.name} has been added to the cutting list.`
        });

        // Focus on Height field after cabinet is added
        setTimeout(() => {
            if (cabinetHeightInputRef.current) {
                cabinetHeightInputRef.current.focus();
                cabinetHeightInputRef.current.select();
            }
        }, 100);

        // Also focus on shutter height field if shutters are enabled
        if (cabinet.shuttersEnabled && cabinet.shutters && cabinet.shutters.length > 0) {
            setTimeout(() => {
                if (shutterHeightInputRef.current) {
                    shutterHeightInputRef.current.focus();
                    shutterHeightInputRef.current.select();
                }
            }, 150);
        }
    };

    // Add cabinet (with validation)
    const addCabinet = (cabinet: Cabinet) => {
        cabinet = applyDefaultsToCabinet(cabinet);
        // Use the UI state (cabinetConfigMode) instead of form value to ensure correct mode detection
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

        // Auto-marked fields are now confirmed
        if (validation.updatedTracking) {
            setUserSelectedLaminates(validation.updatedTracking);
        }

        // Save shutter memory for Quick Shutter mode auto-fill
        if (mode === 'basic' && (cabinet.shutterPlywoodBrand || cabinet.shutterLaminateCode || cabinet.shutterInnerLaminateCode)) {
            homePageService.saveShutterFormMemory({
                shutterPlywoodBrand: cabinet.shutterPlywoodBrand,
                shutterLaminateCode: cabinet.shutterLaminateCode,
                shutterInnerLaminateCode: cabinet.shutterInnerLaminateCode
            });
        }

        // Save cabinet memory for Advanced mode auto-fill
        if (mode === 'advanced' && (cabinet.plywoodType || cabinet.topPanelLaminateCode)) {
            homePageService.saveCabinetFormMemory({
                plywoodType: cabinet.plywoodType,
                topPanelLaminateCode: cabinet.topPanelLaminateCode,
                backPanelLaminateCode: cabinet.backPanelLaminateCode,
                height: cabinet.height,
                width: cabinet.width,
                depth: cabinet.depth,
                widthReduction: cabinet.widthReduction
            });
        }

        // Just pass the cabinet with mode set - performAddCabinet handles the rest
        const cabinetWithMode = { ...cabinet, configurationMode: mode };

        // All validations passed - add the cabinet
        performAddCabinet(cabinetWithMode);

        // Reset form after successfully adding
        const { validLaminates, validPlywood } = getValidationArrays();
        const shutterMemory = homePageService.getShutterFormMemory(validLaminates, validPlywood);
        const cabinetMemory = homePageService.getCabinetFormMemory(validLaminates, validPlywood);

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

    const removeCabinet = useCallback((id: string) => {
        updateCabinets((prev: Cabinet[]) => prev.filter(cabinet => cabinet.id !== id));
        toast({
            title: "Cabinet Removed",
            description: "Cabinet has been removed from the cutting list."
        });
    }, [updateCabinets, toast]);

    const handleDesignCenterExport = (data: DesignCenterExportData) => {
        // Update Cabinet Form values
        form.setValue('width', data.width);
        form.setValue('height', data.height);
        form.setValue('depth', data.depth);
        form.setValue('name', data.name);

        // Save to cabinet form memory
        homePageService.saveCabinetFormMemory({
            width: data.width,
            height: data.height,
            depth: data.depth
        });

        // Scroll to Cabinet Form section
        if (cabinetSectionRef.current) {
            cabinetSectionRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    };

    return {
        addCabinet,
        performAddCabinet,
        removeCabinet,
        updateCabinets,
        // Also exposing these if needed by home.tsx
        updateLaminateWithTracking,
        clearUserLaminateTracking,
        getValidationArrays,
        applyDefaultsToCabinet,
        handleDesignCenterExport
    };
};
