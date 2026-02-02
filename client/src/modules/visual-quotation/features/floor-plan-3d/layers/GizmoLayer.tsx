
import React, { useMemo } from 'react';
import { useDesignCanvasStore } from '../../../store/v2/useDesignCanvasStore';
import Toolbar3D from '../components/toolbar/Toolbar3D';
import Model3DControls from '../components/Model3DControls';

interface GizmoLayerProps {
    onZoomToFit: () => void;
    onResetCamera: () => void;
    showDimensions: boolean;
    onToggleDimensions: () => void;
    selectedFloorId: string | null;
    selectedWallId: string | null;
    selectedUnitId: string | null;
    onClearSelection: () => void;
    setSelectedUnitId: (id: string | null) => void;
}

export function GizmoLayer({
    onZoomToFit,
    onResetCamera,
    showDimensions,
    onToggleDimensions,
    selectedFloorId,
    selectedWallId,
    selectedUnitId,
    onClearSelection,
    setSelectedUnitId
}: GizmoLayerProps) {
    // Selectors
    const floats = useDesignCanvasStore(s => s.floorPlan.floors);
    const walls = useDesignCanvasStore(s => s.floorPlan.walls);
    const drawnUnits = useDesignCanvasStore(s => s.drawnUnits);
    const selectedModelId = useDesignCanvasStore(s => s.models3D.selectedModelId);

    const drawMode = useDesignCanvasStore(s => s.floorPlan.drawMode);
    const scaleMmPerPx = useDesignCanvasStore(s => s.floorPlan.scaleMmPerPx);

    const isSelectMode = drawMode === 'select';
    const isMoveMode = drawMode === 'move';

    // Memoize active selections for display
    const activeFloor = useMemo(() =>
        selectedFloorId ? floats.find(f => f.id === selectedFloorId) : null,
        [selectedFloorId, floats]
    );

    const activeWall = useMemo(() =>
        selectedWallId ? walls.find(w => w.id === selectedWallId) : null,
        [selectedWallId, walls]
    );

    const activeUnit = useMemo(() =>
        selectedUnitId ? drawnUnits.find(u => u.id === selectedUnitId) : null,
        [selectedUnitId, drawnUnits]
    );

    return (
        <>
            {/* Select Mode Indicator */}
            {isSelectMode && (
                <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20 bg-blue-600 px-3 py-1 rounded-full text-[10px] font-semibold text-white shadow-lg">
                    SELECT MODE - Click on Floor or Wall to select
                </div>
            )}

            {/* Move Mode Indicator */}
            {isMoveMode && (
                <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20 bg-green-600 px-3 py-1 rounded-full text-[10px] font-semibold text-white shadow-lg">
                    MOVE MODE - Drag selected Floor or Wall to reposition
                </div>
            )}

            {/* Floating toolbar for 3D controls */}
            <Toolbar3D
                onZoomToFit={onZoomToFit}
                onResetCamera={onResetCamera}
                selectedFloorId={selectedFloorId}
                selectedWallId={selectedWallId}
                selectedUnitId={selectedUnitId}
                onClearSelection={onClearSelection}
                showDimensions={showDimensions}
                onToggleDimensions={onToggleDimensions}
            />

            {/* Selected unit info */}
            {selectedUnitId && activeUnit && (
                <div className="absolute bottom-2 left-2 z-10 bg-slate-800/90 p-2 rounded-lg shadow-lg backdrop-blur-sm text-xs text-white">
                    <div className="flex items-center gap-2">
                        <span className="text-slate-400">Selected:</span>
                        <span className="font-medium">{activeUnit.unitType || "Unit"}</span>
                        <button
                            onClick={() => setSelectedUnitId(null)}
                            className="ml-2 text-slate-400 hover:text-white"
                        >
                            ✕
                        </button>
                    </div>
                </div>
            )}

            {/* 3D Model Controls Panel */}
            {selectedModelId && (
                <Model3DControls className="absolute bottom-2 left-2 z-10 w-64" />
            )}

            {/* Selected Floor/Wall Info Panel */}
            {(isSelectMode || isMoveMode) && (selectedFloorId || selectedWallId) && (
                <div className="absolute bottom-2 left-2 z-10 bg-slate-800/90 p-3 rounded-lg shadow-lg backdrop-blur-sm text-xs text-white min-w-[200px]">
                    <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-slate-300">
                            {selectedFloorId ? "Floor Selected" : "Wall Selected"}
                        </span>
                        <button
                            onClick={onClearSelection}
                            className="text-slate-400 hover:text-white"
                        >
                            ✕
                        </button>
                    </div>
                    {activeFloor && (() => {
                        const widthMm = activeFloor.width * scaleMmPerPx;
                        const depthMm = activeFloor.height * scaleMmPerPx;
                        return (
                            <div className="space-y-1">
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Width:</span>
                                    <span className="text-amber-400 font-medium">{(widthMm / 1000).toFixed(2)}m</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Depth:</span>
                                    <span className="text-amber-400 font-medium">{(depthMm / 1000).toFixed(2)}m</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Area:</span>
                                    <span className="text-green-400 font-medium">{((widthMm / 1000) * (depthMm / 1000)).toFixed(2)} m²</span>
                                </div>
                            </div>
                        );
                    })()}
                    {activeWall && (
                        <div className="space-y-1">
                            <div className="flex justify-between">
                                <span className="text-slate-400">Length:</span>
                                <span className="text-slate-200 font-medium">{(activeWall.lengthMm / 1000).toFixed(2)}m</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-400">Height:</span>
                                <span className="text-slate-200 font-medium">{(activeWall.heightMm / 1000).toFixed(2)}m</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-400">Thickness:</span>
                                <span className="text-slate-200 font-medium">{activeWall.thicknessMm}mm</span>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </>
    );
}
