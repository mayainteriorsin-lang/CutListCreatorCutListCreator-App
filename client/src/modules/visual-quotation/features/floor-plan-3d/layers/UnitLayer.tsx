
import React, { useCallback } from 'react';
import { useDesignCanvasStore } from '../../../store/v2/useDesignCanvasStore';
import { DrawnUnit3D } from '../components/DrawnUnit3D';
import { KitchenBaseUnit3D, KitchenWallUnit3D, Appliance3D } from '../components/KitchenUnits';
import { ImportedModel3DWrapper } from '../components/ImportedModels';

interface UnitLayerProps {
    canvasWidth: number;
    canvasHeight: number;
}

export function UnitLayer({ canvasWidth, canvasHeight }: UnitLayerProps) {
    // Selectors
    const drawnUnits = useDesignCanvasStore(s => s.drawnUnits);
    const floors = useDesignCanvasStore(s => s.floorPlan.floors);
    const scaleMmPerPx = useDesignCanvasStore(s => s.floorPlan.scaleMmPerPx);
    const selectedUnitId = useDesignCanvasStore(s => s.selectedUnitIndices.length > 0 ? s.drawnUnits[s.selectedUnitIndices[0]]?.id : null);
    const drawMode = useDesignCanvasStore(s => s.floorPlan.drawMode);

    // Kitchen Specific
    const kitchenConfig = useDesignCanvasStore(s => s.floorPlan.kitchenConfig);
    const appliances = useDesignCanvasStore(s => s.floorPlan.appliances);

    // Imported Models
    const imported3DModels = useDesignCanvasStore(s => s.models3D.imported3DModels);
    const selectedModelId = useDesignCanvasStore(s => s.models3D.selectedModelId);

    // Actions
    const updateDrawnUnitById = useDesignCanvasStore(s => s.updateDrawnUnitById);
    const setSelectedUnitIndices = useDesignCanvasStore(s => s.setSelectedUnitIndices);
    const select3DModel = useDesignCanvasStore(s => s.select3DModel);

    const hasFloorPlan = floors.length > 0;
    const isSelectMode = drawMode === 'select';
    const isMoveMode = drawMode === 'move';

    const handleMoveUnit = useCallback((unitId: string, deltaX: number, deltaY: number) => {
        const unit = drawnUnits.find(u => u.id === unitId);
        if (!unit) return;
        updateDrawnUnitById(unitId, {
            box: {
                ...unit.box,
                x: unit.box.x + deltaX,
                y: unit.box.y + deltaY,
            },
        });
    }, [drawnUnits, updateDrawnUnitById]);

    // Handle unit selection
    const handleSelectUnit = useCallback((unitId: string | null) => {
        if (unitId) {
            const index = drawnUnits.findIndex(u => u.id === unitId);
            if (index !== -1) {
                setSelectedUnitIndices([index]);
                select3DModel(null); // Deselect model
            }
        } else {
            setSelectedUnitIndices([]);
        }
    }, [drawnUnits, setSelectedUnitIndices, select3DModel]);

    const handleSelectModel = useCallback((modelId: string | null) => {
        select3DModel(modelId);
        if (modelId) {
            setSelectedUnitIndices([]); // Deselect unit
        }
    }, [select3DModel, setSelectedUnitIndices]);


    return (
        <>
            <group name="drawn-units">
                {drawnUnits.map((unit) => (
                    <DrawnUnit3D
                        key={unit.id}
                        unit={unit}
                        canvasWidth={canvasWidth}
                        canvasHeight={canvasHeight}
                        useFloorPlanCoords={hasFloorPlan}
                        scaleMmPerPx={scaleMmPerPx}
                        isSelected={selectedUnitId === unit.id}
                        onSelect={handleSelectUnit}
                        showDimensions={!!selectedUnitId && selectedUnitId === unit.id}
                        isSelectMode={isSelectMode}
                        isMoveMode={isMoveMode}
                        onMove={handleMoveUnit}
                    />
                ))}
            </group>

            <group name="kitchen-units">
                {hasFloorPlan && kitchenConfig?.baseUnit?.runs.map((run) => (
                    <KitchenBaseUnit3D key={run.id} run={run} scaleMmPerPx={scaleMmPerPx} />
                ))}
                {hasFloorPlan && kitchenConfig?.wallUnit?.runs.map((run) => (
                    <KitchenWallUnit3D key={run.id} run={run} scaleMmPerPx={scaleMmPerPx} />
                ))}
                {hasFloorPlan && appliances.map((appliance) => (
                    <Appliance3D key={appliance.id} appliance={appliance} scaleMmPerPx={scaleMmPerPx} />
                ))}
            </group>

            <group name="imported-models">
                {imported3DModels?.map((model) => (
                    <ImportedModel3DWrapper
                        key={model.id}
                        model={model}
                        isSelected={selectedModelId === model.id}
                        onSelect={handleSelectModel}
                    />
                ))}
            </group>
        </>
    );
}
