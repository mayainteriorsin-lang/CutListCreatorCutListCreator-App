
import React from 'react';
import { FloorPlanAppliance } from '../../state/types';

const MM_TO_M = 0.001;

export function KitchenBaseUnit3D({
    run,
    scaleMmPerPx,
}: {
    run: {
        id: string;
        startPoint: { x: number; y: number };
        endPoint: { x: number; y: number };
        lengthFt: number;
        depthMm: number;
        heightMm: number;
        rotation: number;
    };
    scaleMmPerPx: number;
}) {
    const startXM = (run.startPoint.x * scaleMmPerPx) * MM_TO_M;
    const startZM = (run.startPoint.y * scaleMmPerPx) * MM_TO_M;
    const endXM = (run.endPoint.x * scaleMmPerPx) * MM_TO_M;
    const endZM = (run.endPoint.y * scaleMmPerPx) * MM_TO_M;

    const lengthM = run.lengthFt * 0.3048;
    const depthM = run.depthMm * MM_TO_M;
    const heightM = run.heightMm * MM_TO_M;

    const centerX = (startXM + endXM) / 2;
    const centerZ = (startZM + endZM) / 2;
    const centerY = heightM / 2;
    const angle = Math.atan2(endZM - startZM, endXM - startXM);

    const offsetZ = depthM / 2 + 0.02;
    const offsetX = Math.sin(angle) * offsetZ;
    const offsetZFinal = Math.cos(angle) * offsetZ;

    return (
        <group position={[centerX + offsetX, 0, centerZ + offsetZFinal]}>
            <mesh position={[0, centerY, 0]} rotation={[0, -angle, 0]} castShadow receiveShadow>
                <boxGeometry args={[lengthM, heightM, depthM]} />
                <meshStandardMaterial color="#4a7c59" />
            </mesh>
            <mesh position={[0, heightM + 0.02, 0]} rotation={[0, -angle, 0]} castShadow receiveShadow>
                <boxGeometry args={[lengthM + 0.05, 0.04, depthM + 0.025]} />
                <meshStandardMaterial color="#2d2d2d" />
            </mesh>
        </group>
    );
}

export function KitchenWallUnit3D({
    run,
    scaleMmPerPx,
}: {
    run: {
        id: string;
        startPoint: { x: number; y: number };
        endPoint: { x: number; y: number };
        lengthFt: number;
        depthMm: number;
        heightMm: number;
        rotation: number;
    };
    scaleMmPerPx: number;
}) {
    const startXM = (run.startPoint.x * scaleMmPerPx) * MM_TO_M;
    const startZM = (run.startPoint.y * scaleMmPerPx) * MM_TO_M;
    const endXM = (run.endPoint.x * scaleMmPerPx) * MM_TO_M;
    const endZM = (run.endPoint.y * scaleMmPerPx) * MM_TO_M;

    const lengthM = run.lengthFt * 0.3048;
    const depthM = run.depthMm * MM_TO_M;
    const heightM = run.heightMm * MM_TO_M;
    const bottomY = 1.4;

    const centerX = (startXM + endXM) / 2;
    const centerZ = (startZM + endZM) / 2;
    const centerY = bottomY + heightM / 2;
    const angle = Math.atan2(endZM - startZM, endXM - startXM);

    const offsetZ = depthM / 2 + 0.01;
    const offsetX = Math.sin(angle) * offsetZ;
    const offsetZFinal = Math.cos(angle) * offsetZ;

    return (
        <mesh
            position={[centerX + offsetX, centerY, centerZ + offsetZFinal]}
            rotation={[0, -angle, 0]}
            castShadow
            receiveShadow
        >
            <boxGeometry args={[lengthM, heightM, depthM]} />
            <meshStandardMaterial color="#3b6b4a" />
        </mesh>
    );
}

export function Appliance3D({
    appliance,
    scaleMmPerPx,
}: {
    appliance: FloorPlanAppliance;
    scaleMmPerPx: number;
}) {
    const xM = ((appliance.x + appliance.widthPx / 2) * scaleMmPerPx) * MM_TO_M;
    const zM = ((appliance.y + appliance.heightPx / 2) * scaleMmPerPx) * MM_TO_M;
    const widthM = (appliance.widthPx * scaleMmPerPx) * MM_TO_M;
    const depthM = (appliance.heightPx * scaleMmPerPx) * MM_TO_M;

    let heightM = 0.1;
    let color = "#666666";
    let yPos = 0.85;

    switch (appliance.type) {
        case "hob": heightM = 0.05; color = "#1a1a1a"; yPos = 0.87; break;
        case "sink": heightM = 0.2; color = "#c0c0c0"; yPos = 0.85; break;
        case "chimney": heightM = 0.6; color = "#808080"; yPos = 1.8; break;
        case "fridge": heightM = 1.8; color = "#f0f0f0"; yPos = heightM / 2; break;
        case "microwave": heightM = 0.35; color = "#2a2a2a"; yPos = 1.5; break;
        case "oven": heightM = 0.6; color = "#333333"; yPos = 0.45; break;
        case "dishwasher": heightM = 0.82; color = "#e0e0e0"; yPos = heightM / 2; break;
        case "washing_machine": heightM = 0.85; color = "#f5f5f5"; yPos = heightM / 2; break;
    }

    return (
        <mesh position={[xM, yPos, zM]} rotation={[0, (appliance.rotation * Math.PI) / 180, 0]} castShadow receiveShadow>
            <boxGeometry args={[widthM, heightM, depthM]} />
            <meshStandardMaterial color={color} />
        </mesh>
    );
}
