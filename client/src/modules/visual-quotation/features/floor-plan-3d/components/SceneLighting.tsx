
import React, { useMemo } from 'react';
import type { FloorPlanFloor } from '../../state/types';

const MM_TO_M = 0.001;

// Fallback lighting
export function FallbackLighting() {
    return (
        <>
            <hemisphereLight args={["#87CEEB", "#f5f5f5", 0.6]} />
            <directionalLight position={[10, 10, 5]} intensity={0.5} castShadow />
        </>
    );
}

export function SceneLighting({
    floors,
    scaleMmPerPx
}: {
    floors: FloorPlanFloor[];
    scaleMmPerPx: number;
}) {
    const hasFloorPlan = floors.length > 0;

    // Calculate scene center
    const sceneCenter = useMemo(() => {
        if (hasFloorPlan) {
            const floor = floors[0];
            const centerX = ((floor.x + floor.width / 2) * scaleMmPerPx) * MM_TO_M;
            const centerZ = ((floor.y + floor.height / 2) * scaleMmPerPx) * MM_TO_M;
            return { x: centerX, z: centerZ };
        }
        return { x: 0, z: 0 };
    }, [floors, scaleMmPerPx, hasFloorPlan]);

    return (
        <>
            <ambientLight intensity={0.4} />
            <directionalLight
                position={[sceneCenter.x + 5, 10, sceneCenter.z + 5]}
                intensity={0.8}
                castShadow
                shadow-mapSize={[2048, 2048]}
            />
            <directionalLight position={[sceneCenter.x - 5, 5, sceneCenter.z + 3]} intensity={0.3} />
            <FallbackLighting />

            <pointLight position={[sceneCenter.x, 4, sceneCenter.z]} intensity={0.3} color="#fff5e6" />
            <pointLight position={[sceneCenter.x - 3, 2, sceneCenter.z + 3]} intensity={0.15} color="#e6f0ff" />
        </>
    );
}
