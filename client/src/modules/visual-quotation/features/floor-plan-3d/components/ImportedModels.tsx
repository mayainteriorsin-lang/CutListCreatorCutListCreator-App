
import React, { useState, useRef, useMemo, Suspense } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { logger } from '../../../services/logger';
import type { Imported3DModel } from '../../state/types';

export function ModelLoadingPlaceholder({ position }: { position: [number, number, number] }) {
    const meshRef = useRef<THREE.Mesh>(null);

    useFrame((state) => {
        if (meshRef.current) {
            meshRef.current.rotation.y = state.clock.elapsedTime;
        }
    });

    return (
        <mesh ref={meshRef} position={position}>
            <boxGeometry args={[0.3, 0.3, 0.3]} />
            <meshStandardMaterial color="#6366f1" wireframe />
        </mesh>
    );
}

export function ImportedModel3D({
    model,
    isSelected,
    onSelect,
}: {
    model: Imported3DModel;
    isSelected?: boolean;
    onSelect?: (modelId: string) => void;
}) {
    const [hovered, setHovered] = useState(false);
    const [loadError, setLoadError] = useState(false);
    const groupRef = useRef<THREE.Group>(null);

    const { scene } = useGLTF(model.sourceUrl || "", undefined, undefined, (error) => {
        logger.error('3D model load failed', error instanceof Error ? error : new Error(String(error)), { context: 'floor-plan-3d' });
        setLoadError(true);
    });

    const clonedScene = useMemo(() => {
        if (!scene) return null;
        const clone = scene.clone();
        clone.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });
        return clone;
    }, [scene]);

    if (loadError || !model.visible) {
        return null;
    }

    if (!clonedScene) {
        return <ModelLoadingPlaceholder position={[model.position.x, model.position.y, model.position.z]} />;
    }

    return (
        <group
            ref={groupRef}
            position={[model.position.x, model.position.y, model.position.z]}
            rotation={[model.rotation.x, model.rotation.y, model.rotation.z]}
            scale={[model.scale.x, model.scale.y, model.scale.z]}
            onClick={(e) => {
                e.stopPropagation();
                if (!model.locked) {
                    onSelect?.(model.id);
                }
            }}
            onPointerOver={(e) => {
                e.stopPropagation();
                if (!model.locked) {
                    setHovered(true);
                    document.body.style.cursor = "pointer";
                }
            }}
            onPointerOut={() => {
                setHovered(false);
                document.body.style.cursor = "default";
            }}
        >
            {isSelected && (
                <mesh>
                    <boxGeometry args={[1.1, 1.1, 1.1]} />
                    <meshBasicMaterial color="#00aaff" wireframe transparent opacity={0.5} />
                </mesh>
            )}

            {hovered && !isSelected && (
                <mesh>
                    <boxGeometry args={[1.05, 1.05, 1.05]} />
                    <meshBasicMaterial color="#ffffff" wireframe transparent opacity={0.3} />
                </mesh>
            )}

            <primitive object={clonedScene} />

            {(isSelected || hovered) && (
                <Html position={[0, 1.2, 0]} center distanceFactor={10}>
                    <div className="bg-slate-800/90 px-2 py-1 rounded text-[10px] text-white whitespace-nowrap border border-slate-600/50 shadow-lg">
                        {model.name}
                        {model.locked && " 🔒"}
                    </div>
                </Html>
            )}
        </group>
    );
}

export function ImportedModel3DWrapper({
    model,
    isSelected,
    onSelect,
}: {
    model: Imported3DModel;
    isSelected?: boolean;
    onSelect?: (modelId: string) => void;
}) {
    if (!model.sourceUrl) {
        return null;
    }

    return (
        <Suspense fallback={<ModelLoadingPlaceholder position={[model.position.x, model.position.y, model.position.z]} />}>
            <ImportedModel3D model={model} isSelected={isSelected} onSelect={onSelect} />
        </Suspense>
    );
}
