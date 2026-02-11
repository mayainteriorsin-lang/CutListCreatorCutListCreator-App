
import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Cabinet } from '@shared/schema';
import { EmptyBlock } from "@/components/system/StatusBlocks";
import { CabinetSummaryPanel } from '@/components/summary/CabinetSummaryPanel';

interface CabinetSectionProps {
    cabinets: Cabinet[];
    removeCabinet: (id: string) => void;
    form: UseFormReturn<Cabinet>;
}

export const CabinetSection: React.FC<CabinetSectionProps> = ({
    cabinets,
    removeCabinet,
    form
}) => {
    if (!cabinets || cabinets.length === 0) {
        return (
            <EmptyBlock
                title="No cabinets added"
                description="Configure a cabinet and click 'Add Cabinet' to begin."
            />
        );
    }

    return (
        <CabinetSummaryPanel
            cabinets={cabinets}
            removeCabinet={removeCabinet}
            form={form}
        />
    );
};
