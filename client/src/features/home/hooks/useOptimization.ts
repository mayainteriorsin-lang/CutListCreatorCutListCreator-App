
import { useState, useEffect, useMemo } from 'react';
import { Cabinet, BrandResult, ManualPanel } from '@shared/schema';
import { runOptimizerEngine } from '@/lib/optimizer';
import { runOptimizerInWorker } from '@/lib/optimizer/runOptimizerWorker';
import { buildCuttingListSummary, buildMaterialSummary } from '@/lib/summary';
import type { MaterialSummary } from '@/lib/summary';
import { generatePanels } from '@/lib/panels/generatePanels';
import { toastError } from '@/lib/errors/toastError';
import { INITIAL_MATERIAL_SUMMARY } from '@/pages/homePageConstants';

export interface UseOptimizationProps {
    cabinets: Cabinet[];
    manualPanels: ManualPanel[];
    sheetWidth: number;
    sheetHeight: number;
    kerf: number;
    woodGrainsPreferences: Record<string, boolean>;
    showPreviewDialog: boolean;
    isPreviewActive: boolean; // Assuming this maps to deletedPreviewSheets check or something similar?
    // Actually home.tsx uses `deletedPreviewSheets` for summary building
    deletedPreviewSheets: Set<string>;
    useWorkerFeatureFlag?: boolean; // Optional feature flag
}

export const useOptimization = ({
    cabinets,
    manualPanels,
    sheetWidth,
    sheetHeight,
    kerf,
    woodGrainsPreferences,
    showPreviewDialog,
    isPreviewActive,
    deletedPreviewSheets,
    useWorkerFeatureFlag = true
}: UseOptimizationProps) => {

    // State for Async Optimization Results
    const [previewBrandResults, setPreviewBrandResults] = useState<BrandResult[]>([]);
    const [liveMaterialSummary, setLiveMaterialSummary] = useState<MaterialSummary>(INITIAL_MATERIAL_SUMMARY);

    // Calculate cutting list summary with memoization
    const cuttingListSummary = useMemo(() => {
        return buildCuttingListSummary(cabinets);
    }, [cabinets]);

    // Async Optimization Effect
    useEffect(() => {
        const runOptimization = async () => {
            // Only calculate if preview dialog is open
            if (!showPreviewDialog || cabinets.length === 0) {
                setPreviewBrandResults([]);
                return;
            }

            try {
                const params = {
                    cabinets,
                    manualPanels,
                    sheetWidth,
                    sheetHeight,
                    kerf,
                    woodGrainsPreferences,
                    generatePanels,
                };

                const result = useWorkerFeatureFlag && window.Worker
                    ? await runOptimizerInWorker(params)
                    : await runOptimizerEngine(params);

                if (result.error) {
                    console.error('Optimizer failed:', result.error);
                    toastError(result.error);
                    return;
                }

                setPreviewBrandResults(result.brandResults);
            } catch (err) {
                console.error('Optimizer engine crashed:', err);
                toastError(err);
            }
        };

        runOptimization();
    }, [showPreviewDialog, cabinets, woodGrainsPreferences, sheetWidth, sheetHeight, kerf, manualPanels, deletedPreviewSheets, useWorkerFeatureFlag]);

    // Live Material Summary Effect
    useEffect(() => {
        const runSummary = async () => {
            // isPreviewActive check from home.tsx seems to correspond to "is valid to run summary"
            // In home.tsx: if (cabinets.length === 0 || !isPreviewActive || !showPreviewDialog)
            // But isPreviewActive isn't standard state, it was likely derived.
            // Let's assume passed prop is correct.

            if (cabinets.length === 0 || !isPreviewActive || !showPreviewDialog) {
                setLiveMaterialSummary(INITIAL_MATERIAL_SUMMARY);
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
    }, [cabinets, sheetWidth, sheetHeight, kerf, woodGrainsPreferences, deletedPreviewSheets, isPreviewActive, showPreviewDialog]);

    return {
        previewBrandResults,
        liveMaterialSummary,
        cuttingListSummary,
        // Expose setters if needed, but optimally we just read results
        setPreviewBrandResults,
        setLiveMaterialSummary
    };
};
