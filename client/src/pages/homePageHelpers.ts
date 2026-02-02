/**
 * Helper functions extracted from home.tsx for better organization
 */

import type { Cabinet } from '@shared/schema';
import type { UseFormReturn, FieldValues } from 'react-hook-form';

/**
 * Updates wood grain direction for all cabinets and form fields
 * that use the specified laminate code.
 * 
 * @param laminateCode - The laminate code that was updated
 * @param woodGrainsEnabled - Whether wood grains are enabled for this code
 * @param setCabinets - State setter for cabinets
 * @param form - React Hook Form instance
 */
export function applyWoodGrainToAll(
    laminateCode: string,
    woodGrainsEnabled: boolean,
    setCabinets: (updater: (prev: Cabinet[]) => Cabinet[]) => void,
    form: UseFormReturn<FieldValues>
): void {
    // Update all existing cabinets that use this specific laminate code
    setCabinets(prevCabinets =>
        prevCabinets.map(cabinet => {
            const updated = { ...cabinet };
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

            return hasChanges ? updated : cabinet;
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
}
