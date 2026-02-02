
import React, { useRef, useState, useCallback, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { logger } from '../../../services/logger';
import * as THREE from 'three';

// Screenshot capture helper component
export function ScreenshotCapture({
    onCapture,
    panoramaConfig,
}: {
    onCapture: (captureFunc: () => string | null) => void;
    panoramaConfig?: { frames: number; onFrame: (dataUrl: string) => void; onComplete: () => void } | null;
}) {
    const { gl, scene, camera } = useThree();
    const frameRef = useRef(0);
    const [isPanorama, setIsPanorama] = useState(false);
    const originalCameraPos = useRef<THREE.Vector3 | null>(null);
    const panoramaTarget = useRef<THREE.Vector3>(new THREE.Vector3(0, 1.2, 0));

    // Capture single screenshot
    const captureScreenshot = useCallback(() => {
        try {
            gl.render(scene, camera);
            return gl.domElement.toDataURL("image/png");
        } catch (e) {
            logger.error('Screenshot capture failed', undefined, { context: 'floor-plan-3d' });
            return null;
        }
    }, [gl, scene, camera]);

    // Register capture function
    useEffect(() => {
        onCapture(captureScreenshot);
    }, [onCapture, captureScreenshot]);

    // Handle panorama capture
    useEffect(() => {
        if (panoramaConfig && !isPanorama) {
            // Defer state update to next tick to avoid synchronous setState warning
            const timer = setTimeout(() => {
                setIsPanorama(true);
                frameRef.current = 0;
                originalCameraPos.current = camera.position.clone();

                // Get scene center for panorama rotation
                if (camera instanceof THREE.PerspectiveCamera || camera instanceof THREE.OrthographicCamera) {
                    const target = new THREE.Vector3();
                    camera.getWorldDirection(target);
                    panoramaTarget.current.copy(camera.position).add(target.multiplyScalar(5));
                }
            }, 0);

            return () => clearTimeout(timer);
        }
    }, [panoramaConfig, isPanorama, camera]);

    // Panorama frame capture
    useFrame(() => {
        if (isPanorama && panoramaConfig && originalCameraPos.current) {
            const { frames, onFrame, onComplete } = panoramaConfig;

            if (frameRef.current < frames) {
                const angle = (frameRef.current / frames) * Math.PI * 2;
                const radius = originalCameraPos.current.distanceTo(panoramaTarget.current);

                camera.position.set(
                    panoramaTarget.current.x + Math.sin(angle) * radius,
                    camera.position.y,
                    panoramaTarget.current.z + Math.cos(angle) * radius
                );
                camera.lookAt(panoramaTarget.current);

                gl.render(scene, camera);
                const dataUrl = gl.domElement.toDataURL("image/png");
                onFrame(dataUrl);

                frameRef.current++;
            } else {
                // Restore camera and complete
                camera.position.copy(originalCameraPos.current);
                setIsPanorama(false);
                onComplete();
            }
        }
    });

    return null;
}

// Camera controller for zoom to fit and reset
export function CameraController({
    onReady,
    defaultPosition,
    defaultTarget,
    sceneBounds,
}: {
    onReady: (controller: { zoomToFit: () => void; resetCamera: () => void }) => void;
    defaultPosition: [number, number, number];
    defaultTarget: [number, number, number];
    sceneBounds: { min: THREE.Vector3; max: THREE.Vector3 } | null;
}) {
    const { camera, controls } = useThree();

    const zoomToFit = useCallback(() => {
        if (!sceneBounds) return;

        const center = new THREE.Vector3();
        center.addVectors(sceneBounds.min, sceneBounds.max).multiplyScalar(0.5);

        const size = new THREE.Vector3();
        size.subVectors(sceneBounds.max, sceneBounds.min);
        const maxDim = Math.max(size.x, size.y, size.z);

        // Position camera to fit the scene
        const distance = maxDim * 1.5;
        camera.position.set(center.x + distance * 0.7, center.y + distance * 0.5, center.z + distance * 0.7);

        // Make camera look at center
        camera.lookAt(center.x, center.y, center.z);

        // Update controls target if available
        if (controls && (controls as any).target) {
            (controls as any).target.set(center.x, center.y, center.z);
            (controls as any).update();
        }
    }, [camera, controls, sceneBounds]);

    const resetCamera = useCallback(() => {
        camera.position.set(...defaultPosition);

        // Make camera look at target
        camera.lookAt(...defaultTarget);

        // Update controls if available
        if (controls && (controls as any).target) {
            (controls as any).target.set(...defaultTarget);
            (controls as any).update();
        }
    }, [camera, controls, defaultPosition, defaultTarget]);

    useEffect(() => {
        onReady({ zoomToFit, resetCamera });
    }, [onReady, zoomToFit, resetCamera]);

    return null;
}
