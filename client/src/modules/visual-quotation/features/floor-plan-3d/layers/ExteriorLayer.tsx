
import React, { useCallback } from 'react';
import { useDesignCanvasStore } from '../../../store/v2/useDesignCanvasStore';
import { Floor3D } from '../components/Floor3D';
import { Wall3D } from '../components/Wall3D';

interface ExteriorLayerProps {
    scaleMmPerPx: number;
    selectedFloorId: string | null;
    selectedWallId: string | null;
    onSelectFloor: (id: string) => void;
    onSelectWall: (id: string) => void;
}

export function ExteriorLayer({
    scaleMmPerPx,
    selectedFloorId,
    selectedWallId,
    onSelectFloor,
    onSelectWall,
}: ExteriorLayerProps) {
    // Selectors
    const floors = useDesignCanvasStore(s => s.floorPlan.floors);
    const walls = useDesignCanvasStore(s => s.floorPlan.walls);
    const drawMode = useDesignCanvasStore(s => s.floorPlan.drawMode);
    const updateFloorPlanFloor = useDesignCanvasStore(s => s.updateFloorPlanFloor);
    const updateFloorPlanWall = useDesignCanvasStore(s => s.updateFloorPlanWall);

    const isSelectMode = drawMode === 'select';
    const isMoveMode = drawMode === 'move';

    // Handlers
    const handleMoveFloor = useCallback((floorId: string, deltaX: number, deltaY: number) => {
        const floor = floors.find(f => f.id === floorId);
        if (!floor) return;
        updateFloorPlanFloor(floorId, {
            x: floor.x + deltaX,
            y: floor.y + deltaY,
        });
    }, [floors, updateFloorPlanFloor]);

    const handleMoveWall = useCallback((wallId: string, deltaX: number, deltaY: number) => {
        const wall = walls.find(w => w.id === wallId);
        if (!wall || !wall.startPoint || !wall.endPoint) return;
        updateFloorPlanWall(wallId, {
            startPoint: {
                x: wall.startPoint.x + deltaX,
                y: wall.startPoint.y + deltaY,
            },
            endPoint: {
                x: wall.endPoint.x + deltaX,
                y: wall.endPoint.y + deltaY,
            },
        });
    }, [walls, updateFloorPlanWall]);

    return (
        <>
            <group name="floors">
                {floors.map(floor => (
                    <Floor3D
                        key={floor.id}
                        floor={floor}
                        scaleMmPerPx={scaleMmPerPx}
                        isSelected={selectedFloorId === floor.id}
                        onSelect={onSelectFloor}
                        isSelectMode={isSelectMode}
                        isMoveMode={isMoveMode}
                        onMove={handleMoveFloor}
                    />
                ))}
            </group>

            <group name="walls">
                {walls.map(wall => (
                    <Wall3D
                        key={wall.id}
                        wall={wall}
                        scaleMmPerPx={scaleMmPerPx}
                        isSelected={selectedWallId === wall.id}
                        onSelect={onSelectWall}
                        isSelectMode={isSelectMode}
                        isMoveMode={isMoveMode}
                        onMove={handleMoveWall}
                    />
                ))}
            </group>
        </>
    );
}
