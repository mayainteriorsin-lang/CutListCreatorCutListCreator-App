
import React from 'react';
import { Cabinet } from '@shared/schema';
import { SummaryPanel } from '@/components/summary';
import { calculateShutterCount } from '@/lib/summary';
import { CabinetSection } from "@/features/home/components/CabinetSection";
import { UseFormReturn } from 'react-hook-form';
import { UndoRedoButtons } from "@/components/home/UndoRedoButtons";

interface SummarySectionProps {
    cabinets: Cabinet[];
    cuttingListSummary: any; // Type strictly if possible
    liveMaterialSummary: any;
    onExportExcel: () => void;
    onExportGoogleSheets: () => void;
    onPrint: () => void;
    // CabinetSection props
    removeCabinet: (id: string) => void;
    form: UseFormReturn<Cabinet>;
    // UndoRedo props
    canUndo: boolean;
    canRedo: boolean;
    onUndo: () => void;
    onRedo: () => void;
}

export const SummarySection: React.FC<SummarySectionProps> = ({
    cabinets,
    cuttingListSummary,
    liveMaterialSummary,
    onExportExcel,
    onExportGoogleSheets,
    onPrint,
    removeCabinet,
    form,
    canUndo,
    canRedo,
    onUndo,
    onRedo
}) => {
    return (
        <div className="space-y-6">
            {/* Summary Panel - Stats, Material Summary, Cutting List Summary */}
            <SummaryPanel
                cabinets={cabinets}
                cuttingListSummary={cuttingListSummary}
                liveMaterialSummary={liveMaterialSummary}
                shutterCount={calculateShutterCount(cabinets)}
                onExportExcel={onExportExcel}
                onExportGoogleSheets={onExportGoogleSheets}
                onPrint={onPrint}
            />

            {/* Undo/Redo Buttons */}
            <UndoRedoButtons
                canUndo={canUndo}
                canRedo={canRedo}
                onUndo={onUndo}
                onRedo={onRedo}
            />

            {/* Cabinet List */}
            <CabinetSection
                cabinets={cabinets}
                removeCabinet={removeCabinet}
                form={form}
            />
        </div>
    );
};
