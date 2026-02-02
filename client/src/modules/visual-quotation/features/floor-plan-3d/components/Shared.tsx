
import React from 'react';
import { Html } from '@react-three/drei';
import type { UnitType } from '../../../types';

export function DimensionLabel({
    position,
    text,
    color = "#ffffff",
}: {
    position: [number, number, number];
    text: string;
    color?: string;
}) {
    return (
        <Html position={position} center distanceFactor={10}>
            <div className="bg-slate-800/90 px-1.5 py-0.5 rounded text-[10px] text-white whitespace-nowrap border border-slate-600/50 shadow-lg">
                {text}
            </div>
        </Html>
    );
}

export function CabinetHandle({
    position,
    rotation = 0,
    isVertical = true,
}: {
    position: [number, number, number];
    rotation?: number;
    isVertical?: boolean;
}) {
    const handleLength = isVertical ? 0.12 : 0.08;
    const handleRadius = 0.008;

    return (
        <group position={position} rotation={[0, rotation, 0]}>
            <mesh rotation={isVertical ? [0, 0, 0] : [0, 0, Math.PI / 2]}>
                <capsuleGeometry args={[handleRadius, handleLength, 4, 8]} />
                <meshStandardMaterial color="#c0c0c0" metalness={0.8} roughness={0.2} />
            </mesh>
            <mesh position={[0, isVertical ? handleLength / 2 + 0.01 : 0, -0.01]}>
                <cylinderGeometry args={[0.012, 0.012, 0.02, 8]} />
                <meshStandardMaterial color="#a0a0a0" metalness={0.6} roughness={0.3} />
            </mesh>
            <mesh position={[0, isVertical ? -handleLength / 2 - 0.01 : 0, -0.01]}>
                <cylinderGeometry args={[0.012, 0.012, 0.02, 8]} />
                <meshStandardMaterial color="#a0a0a0" metalness={0.6} roughness={0.3} />
            </mesh>
        </group>
    );
}


// Unit type colors
export const UNIT_COLORS: Record<UnitType, { body: string; accent: string }> = {
    wardrobe: { body: "#8B4513", accent: "#A0522D" }, // Brown wood
    kitchen: { body: "#4a7c59", accent: "#2d2d2d" }, // Green with dark counter
    tv_unit: { body: "#2F4F4F", accent: "#1a1a1a" }, // Dark slate
    shoe_rack: { body: "#CD853F", accent: "#8B4513" }, // Peru brown
    study_table: { body: "#5F9EA0", accent: "#4682B4" }, // Cadet blue
    dresser: { body: "#BC8F8F", accent: "#8B7355" }, // Rosy brown
    book_shelf: { body: "#8B7355", accent: "#6B4423" }, // Tan
    crockery: { body: "#E6E6FA", accent: "#B0C4DE" }, // Lavender
    pooja: { body: "#FFD700", accent: "#DAA520" }, // Gold
    vanity: { body: "#F5F5DC", accent: "#D3D3D3" }, // Beige
    bar_unit: { body: "#4A0E0E", accent: "#1a1a1a" }, // Dark red
    display_unit: { body: "#87CEEB", accent: "#4682B4" }, // Sky blue
};
