/**
 * Room-related types for Visual Quotation module
 * Scale calibration, room images, walls, obstructions
 */

import type { Confidence, WallId } from "./core";

export interface ScaleCalibration {
  refPx: number;
  refMm: number;
  pxToMm: number;
  confidence: Confidence;
}

export interface RoomImage {
  src: string;
  widthPx: number;
  heightPx: number;
}

export interface RoomPhoto {
  src: string;
  width: number;
  height: number;
}

export interface ReferencePhoto {
  id: string;
  src: string;
  width: number;
  height: number;
}

export interface ScaleState {
  px: number;
  mm: number;
  ratio: number;
  // Extended properties used in V2 store
  factor?: number;
  pixelsPerMm?: number;
  calibrated?: boolean;
  lineStart?: { x: number; y: number } | null;
  lineEnd?: { x: number; y: number } | null;
  realWorldMm?: number;
}

export interface ScaleLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  lengthPx: number;
}

export interface WallRegion {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Wall {
  id: WallId;
  label: string;
  region?: WallRegion;
}

export interface Obstruction {
  id: string;
  type: import("./core").ObstructionType;
  label: string;
  rect: { x: number; y: number; w: number; h: number };
  heightMm?: number;
  notes?: string;
}
