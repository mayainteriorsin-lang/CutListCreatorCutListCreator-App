/**
 * Design Module - File I/O Utilities
 *
 * Functions for saving, loading, and exporting design data.
 * Extracted from DesignCenter.tsx for better modularity.
 */

import type { Shape, LineShape } from "../types";
import { uid } from "./geometry";
import {
  DEFAULT_LINE_THICKNESS,
  DEFAULT_LINE_COLOR,
  DXF_IMPORT_PADDING,
  DXF_DEFAULT_COLOR,
  EXPORT_BACKGROUND,
  SVG_MIME_TYPE,
  PNG_MIME_TYPE,
} from "./constants";

// =============================================================================
// TYPES
// =============================================================================

/**
 * JSON export format for design files
 */
export interface DesignFileData {
  shapes: Shape[];
  gridSize: number;
  lineThickness: number;
  version?: string;
}

/**
 * DXF line entity from parser
 */
export interface DXFLine {
  type: "line";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color?: string;
}

/**
 * Parsed DXF data structure
 */
export interface ParsedDXFData {
  lines: DXFLine[];
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
}

/**
 * Import result with converted shapes
 */
export interface ImportResult {
  shapes: LineShape[];
  success: boolean;
  error?: string;
}

// =============================================================================
// DOWNLOAD HELPERS
// =============================================================================

/**
 * Trigger download of a blob with specified filename
 */
const downloadBlob = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

// =============================================================================
// JSON EXPORT/IMPORT
// =============================================================================

/**
 * Save shapes as JSON file
 * @param shapes - Array of shapes to save
 * @param gridSize - Current grid size setting
 * @param lineThickness - Current line thickness setting
 * @param filename - Output filename (default: design-center.json)
 */
export const saveAsJSON = (
  shapes: Shape[],
  gridSize: number,
  lineThickness: number,
  filename: string = "design-center.json"
): void => {
  const data: DesignFileData = {
    shapes,
    gridSize,
    lineThickness,
    version: "1.0",
  };
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  downloadBlob(blob, filename);
};

/**
 * Load shapes from JSON file
 * @param file - File to load
 * @returns Promise with loaded data
 */
export const loadFromJSON = async (
  file: File
): Promise<DesignFileData | null> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const data = JSON.parse(content) as DesignFileData;
        resolve(data);
      } catch (err) {
        reject(new Error("Failed to parse JSON file"));
      }
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsText(file);
  });
};

// =============================================================================
// DXF EXPORT
// =============================================================================

/**
 * Generate DXF content from shapes
 * @param shapes - Array of shapes to export
 * @returns DXF file content as string
 */
export const generateDXFContent = (shapes: Shape[]): string => {
  let dxfContent =
    "0\nSECTION\n2\nHEADER\n0\nENDSEC\n0\nSECTION\n2\nENTITIES\n";

  for (const shape of shapes) {
    if (shape.type === "line") {
      const l = shape as LineShape;
      dxfContent += `0\nLINE\n8\n0\n10\n${l.x1}\n20\n${l.y1}\n11\n${l.x2}\n21\n${l.y2}\n`;
    }
    // Rectangles are exported as 4 lines
    if (shape.type === "rect") {
      const r = shape;
      const { x, y, w, h } = r;
      // Top
      dxfContent += `0\nLINE\n8\n0\n10\n${x}\n20\n${y}\n11\n${x + w}\n21\n${y}\n`;
      // Right
      dxfContent += `0\nLINE\n8\n0\n10\n${x + w}\n20\n${y}\n11\n${x + w}\n21\n${y + h}\n`;
      // Bottom
      dxfContent += `0\nLINE\n8\n0\n10\n${x + w}\n20\n${y + h}\n11\n${x}\n21\n${y + h}\n`;
      // Left
      dxfContent += `0\nLINE\n8\n0\n10\n${x}\n20\n${y + h}\n11\n${x}\n21\n${y}\n`;
    }
  }

  dxfContent += "0\nENDSEC\n0\nEOF\n";
  return dxfContent;
};

/**
 * Save shapes as DXF file
 * @param shapes - Array of shapes to save
 * @param filename - Output filename (default: design-center.dxf)
 */
export const saveAsDXF = (
  shapes: Shape[],
  filename: string = "design-center.dxf"
): void => {
  const dxfContent = generateDXFContent(shapes);
  const blob = new Blob([dxfContent], { type: "text/plain" });
  downloadBlob(blob, filename);
};

// =============================================================================
// DXF IMPORT
// =============================================================================

/**
 * Parse DXF file content
 * @param fileContent - Raw DXF file content
 * @returns Parsed DXF data with lines and bounds
 */
export const parseDXF = (fileContent: string): ParsedDXFData => {
  const lines: DXFLine[] = [];
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;

  // Split into sections
  const sections = fileContent.split(/SECTION|ENDSEC/).filter((s) => s.trim());
  const entitiesSection = sections.find((s) => s.includes("ENTITIES"));

  if (!entitiesSection) {
    return { lines, bounds: { minX: 0, minY: 0, maxX: 1000, maxY: 1000 } };
  }

  // Parse ENTITIES section
  const entities = entitiesSection.split(/^\s*0\s*$/m).filter((e) => e.trim());

  for (const entity of entities) {
    const linesRaw = entity
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l);

    // Parse LINE entity
    if (entity.includes("LINE")) {
      let x1 = 0,
        y1 = 0,
        x2 = 0,
        y2 = 0;
      for (let i = 0; i < linesRaw.length; i++) {
        if (linesRaw[i] === "10") x1 = parseFloat(linesRaw[i + 1] || "0");
        if (linesRaw[i] === "20") y1 = parseFloat(linesRaw[i + 1] || "0");
        if (linesRaw[i] === "11") x2 = parseFloat(linesRaw[i + 1] || "0");
        if (linesRaw[i] === "21") y2 = parseFloat(linesRaw[i + 1] || "0");
      }

      const line: DXFLine = {
        type: "line",
        x1,
        y1,
        x2,
        y2,
        color: DXF_DEFAULT_COLOR,
      };
      lines.push(line);

      minX = Math.min(minX, x1, x2);
      minY = Math.min(minY, y1, y2);
      maxX = Math.max(maxX, x1, x2);
      maxY = Math.max(maxY, y1, y2);
    }

    // Parse LWPOLYLINE (lightweight polyline) as series of lines
    if (entity.includes("LWPOLYLINE")) {
      const coords: [number, number][] = [];
      for (let i = 0; i < linesRaw.length; i++) {
        if (linesRaw[i] === "10") {
          const x = parseFloat(linesRaw[i + 1] || "0");
          const y = parseFloat(linesRaw[i + 2] || "0");
          coords.push([x, y]);
        }
      }

      // Create lines between consecutive points
      for (let i = 0; i < coords.length - 1; i++) {
        const [x1, y1] = coords[i];
        const [x2, y2] = coords[i + 1];
        lines.push({ type: "line", x1, y1, x2, y2, color: DXF_DEFAULT_COLOR });

        minX = Math.min(minX, x1, x2);
        minY = Math.min(minY, y1, y2);
        maxX = Math.max(maxX, x1, x2);
        maxY = Math.max(maxY, y1, y2);
      }
    }
  }

  // Normalize bounds if no entities found
  if (minX === Infinity) {
    minX = 0;
    minY = 0;
    maxX = 1000;
    maxY = 1000;
  }

  return {
    lines,
    bounds: { minX, minY, maxX, maxY },
  };
};

/**
 * Convert parsed DXF lines to our LineShape format
 * @param parsed - Parsed DXF data
 * @param lineThickness - Thickness to apply to imported lines
 * @returns Array of LineShape objects
 */
export const convertDXFToShapes = (
  parsed: ParsedDXFData,
  lineThickness: number = DEFAULT_LINE_THICKNESS
): LineShape[] => {
  const padding = DXF_IMPORT_PADDING;
  const offsetX = -parsed.bounds.minX + padding;
  const offsetY = -parsed.bounds.minY + padding;

  return parsed.lines.map((line) => ({
    id: uid("CAD-"),
    type: "line" as const,
    x1: line.x1 + offsetX,
    y1: line.y1 + offsetY,
    x2: line.x2 + offsetX,
    y2: line.y2 + offsetY,
    thickness: lineThickness,
    color: line.color || DEFAULT_LINE_COLOR,
    marker: "none" as const,
  }));
};

/**
 * Import DXF file and convert to shapes
 * @param file - File to import
 * @param lineThickness - Thickness for imported lines
 * @returns Promise with import result
 */
export const importDXF = async (
  file: File,
  lineThickness: number = DEFAULT_LINE_THICKNESS
): Promise<ImportResult> => {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = parseDXF(content);
        const shapes = convertDXFToShapes(parsed, lineThickness);
        resolve({ shapes, success: true });
      } catch (err) {
        resolve({
          shapes: [],
          success: false,
          error: "Failed to parse DXF file",
        });
      }
    };

    reader.onerror = () => {
      resolve({
        shapes: [],
        success: false,
        error: "Failed to read file",
      });
    };

    reader.readAsText(file);
  });
};

/**
 * Import DWG file via server conversion
 * @param file - DWG file to import
 * @param apiBase - API base URL for conversion endpoint
 * @param lineThickness - Thickness for imported lines
 * @returns Promise with import result
 */
export const importDWG = async (
  file: File,
  apiBase: string,
  lineThickness: number = DEFAULT_LINE_THICKNESS
): Promise<ImportResult> => {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = async (event) => {
      try {
        // Send binary to server for conversion
        const response = await fetch(`${apiBase}/api/convert-dwg-to-dxf`, {
          method: "POST",
          headers: { "Content-Type": "application/octet-stream" },
          body: event.target?.result as ArrayBuffer,
        });

        if (!response.ok) {
          const error = await response.json().catch(() => ({}));
          throw new Error(error.error || "DWG conversion failed on server");
        }

        const { dxfContent } = await response.json();
        const parsed = parseDXF(dxfContent);
        const shapes = convertDXFToShapes(parsed, lineThickness);
        resolve({ shapes, success: true });
      } catch (err) {
        resolve({
          shapes: [],
          success: false,
          error: err instanceof Error ? err.message : "DWG import failed",
        });
      }
    };

    reader.onerror = () => {
      resolve({
        shapes: [],
        success: false,
        error: "Failed to read file",
      });
    };

    reader.readAsArrayBuffer(file);
  });
};

/**
 * Import CAD file (DXF or DWG)
 * @param file - File to import
 * @param apiBase - API base URL for DWG conversion
 * @param lineThickness - Thickness for imported lines
 * @returns Promise with import result
 */
export const importCADFile = async (
  file: File,
  apiBase: string,
  lineThickness: number = DEFAULT_LINE_THICKNESS
): Promise<ImportResult> => {
  const isDWG = file.name.toLowerCase().endsWith(".dwg");

  if (isDWG) {
    return importDWG(file, apiBase, lineThickness);
  } else {
    return importDXF(file, lineThickness);
  }
};

// =============================================================================
// SVG EXPORT
// =============================================================================

/**
 * Export SVG element as SVG file
 * @param svg - SVG element to export
 * @param filename - Output filename (default: design-center.svg)
 */
export const exportSVG = (
  svg: SVGSVGElement,
  filename: string = "design-center.svg"
): void => {
  const serializer = new XMLSerializer();
  const source = serializer.serializeToString(svg);
  const blob = new Blob([source], { type: SVG_MIME_TYPE });
  downloadBlob(blob, filename);
};

// =============================================================================
// PNG EXPORT
// =============================================================================

/**
 * Export SVG element as PNG file
 * @param svg - SVG element to export
 * @param width - Canvas width
 * @param height - Canvas height
 * @param filename - Output filename (default: design-center.png)
 * @returns Promise that resolves when export is complete
 */
export const exportPNG = (
  svg: SVGSVGElement,
  width: number,
  height: number,
  filename: string = "design-center.png"
): Promise<void> => {
  return new Promise((resolve, reject) => {
    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svg);
    const img = new Image();
    const svgBlob = new Blob([source], { type: SVG_MIME_TYPE });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error("Failed to get canvas context"));
        return;
      }

      ctx.fillStyle = EXPORT_BACKGROUND;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);

      const a = document.createElement("a");
      a.href = canvas.toDataURL(PNG_MIME_TYPE);
      a.download = filename;
      a.click();

      resolve();
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load SVG as image"));
    };

    img.src = url;
  });
};

// =============================================================================
// FILE SELECTION HELPERS
// =============================================================================

/**
 * Open file picker for CAD files (DXF/DWG)
 * @returns Promise with selected file, or null if cancelled
 */
export const selectCADFile = (): Promise<File | null> => {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".dxf,.dwg";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0] || null;
      resolve(file);
    };
    input.click();
  });
};

/**
 * Open file picker for JSON design files
 * @returns Promise with selected file, or null if cancelled
 */
export const selectJSONFile = (): Promise<File | null> => {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0] || null;
      resolve(file);
    };
    input.click();
  });
};
