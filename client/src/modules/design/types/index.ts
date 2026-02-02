/**
 * Design Module - Type Definitions
 *
 * Central location for all design module types.
 * Extracted from DesignCenter.tsx for better organization and reusability.
 */

// =============================================================================
// BASIC TYPES
// =============================================================================

/**
 * Unique identifier for shapes and elements
 */
export type Id = string;

/**
 * Drawing/interaction mode for the canvas
 * Determines what action occurs on mouse events
 */
export type Mode =
  | "select"      // Select and manipulate existing shapes
  | "line"        // Draw line segments
  | "rect"        // Draw rectangles
  | "move"        // Move selected shapes
  | "trim"        // Trim/extend lines
  | "dimHoriz"    // Add horizontal dimension
  | "dimVert"     // Add vertical dimension
  | "dimRadius"   // Add radius dimension
  | "quickDim"    // Quick dimension mode
  | "measure"     // Measure distances
  | "component";  // Place component templates

/**
 * Action mode for shape manipulation
 * Used when interacting with shapes after selection
 */
export type ActionMode = "copy" | "move" | "delete" | "resize" | null;

// =============================================================================
// SHAPE TYPES
// =============================================================================

/**
 * Base properties shared by all shape types
 */
export type BaseShape = {
  id: Id;
  type: "line" | "rect" | "dimension";
};

/**
 * Line shape - represents a line segment with optional styling
 * Used for cabinet outlines, dividers, and structural elements
 */
export type LineShape = BaseShape & {
  type: "line";
  x1: number;           // Start X coordinate
  y1: number;           // Start Y coordinate
  x2: number;           // End X coordinate
  y2: number;           // End Y coordinate
  thickness?: number;   // Line thickness in pixels
  color?: string;       // Line color (CSS color value)
  marker?: "none" | "arrow" | "circle";  // End marker style
  customLabel?: string; // Optional label text
  showDimension?: boolean;  // Whether to show dimension text
};

/**
 * Rectangle shape - represents a filled/stroked rectangle
 * Used for panels, shelves, and rectangular components
 */
export type RectShape = BaseShape & {
  type: "rect";
  x: number;            // Top-left X coordinate
  y: number;            // Top-left Y coordinate
  w: number;            // Width
  h: number;            // Height
  fill?: string;        // Fill color (CSS color value)
  stroke?: string;      // Stroke color (CSS color value)
  strokeWidth?: number; // Stroke width in pixels
  rx?: number;          // Border radius for rounded corners
  opacity?: number;     // Opacity (0-1)
};

/**
 * Dimension shape - represents a measurement annotation
 * Used to display dimensions on drawings
 */
export type DimensionShape = BaseShape & {
  type: "dimension";
  x1: number;           // Start X coordinate
  y1: number;           // Start Y coordinate
  x2: number;           // End X coordinate
  y2: number;           // End Y coordinate
  label: string;        // Dimension text label
  dimType: "horizontal" | "vertical" | "radius";  // Dimension orientation
  offset?: number;      // Offset from the measured line
};

/**
 * Union type of all shape types
 */
export type Shape = LineShape | RectShape | DimensionShape;

/**
 * Shape without ID - used when creating new shapes before ID assignment
 */
export type ShapeWithoutId =
  | Omit<LineShape, "id">
  | Omit<RectShape, "id">
  | Omit<DimensionShape, "id">;

/**
 * Drag origin point for move operations
 */
export interface DragOrigin {
  x: number;
  y: number;
}

/**
 * Extended shape with drag origin - used during move operations
 * The __dragOrigin field tracks the starting point for calculating offsets
 */
export type TempShapeWithDragOrigin = Shape & {
  __dragOrigin?: DragOrigin;
};

/**
 * Partial shape used as temp during drawing operations
 */
export type TempShape = Partial<Shape> & {
  __dragOrigin?: DragOrigin;
};

/**
 * Component shape definition - used in component templates
 * Includes position and size properties for both rect and line types
 */
export interface ComponentRectDef {
  type: "rect";
  x?: number;
  y?: number;
  w: number;
  h: number;
}

export interface ComponentLineDef {
  type: "line";
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
}

export type ComponentShapeDef = ComponentRectDef | ComponentLineDef;

// =============================================================================
// COMPONENT TYPES
// =============================================================================

/**
 * Component template - predefined shape collections for furniture parts
 * Used in component library and drag-drop placement
 */
export interface ComponentTemplate {
  id: string;                                    // Unique template identifier
  name: string;                                  // Display name
  icon: string;                                  // Icon identifier or path
  category: "cabinet" | "hardware" | "accessory";  // Component category
  shapes: ShapeWithoutId[];                      // Shapes that make up this component
  width: number;                                 // Component bounding width
  height: number;                                // Component bounding height
}

// =============================================================================
// UI/INTERACTION TYPES
// =============================================================================

/**
 * Alignment guide - snap-to guides for precise positioning
 * Displayed during drag operations
 */
export interface AlignmentGuide {
  type: "horizontal" | "vertical";  // Guide orientation
  position: number;                  // Position along perpendicular axis
  start: number;                     // Start of guide line
  end: number;                       // End of guide line
}

/**
 * Measurement result - aggregated measurements for selected shapes
 * Displayed in measurement panel
 */
export interface MeasurementResult {
  totalLength: number;     // Total length of all selected lines
  area: number;            // Total area of all selected rectangles
  perimeter: number;       // Total perimeter
  selectedCount: number;   // Number of shapes included in measurement
}

// =============================================================================
// STATE TYPES
// =============================================================================

/**
 * History entry - snapshot for undo/redo functionality
 */
export type HistoryEntry = {
  shapes: Shape[];      // Complete shape state at this point
  description: string;  // Human-readable action description
};

// =============================================================================
// PROPS TYPES
// =============================================================================

/**
 * Props for DesignCenter component
 */
export interface DesignCenterProps {
  /** Callback when exporting design to cutlist */
  onExportToCutlist?: (data: {
    width: number;
    height: number;
    depth: number;
    name: string;
  }) => void;
}

// =============================================================================
// STORE STATE TYPES (for Zustand slices)
// =============================================================================

/**
 * Canvas state slice - viewport and canvas properties
 */
export interface CanvasState {
  zoom: number;
  panX: number;
  panY: number;
  canvasWidth: number;
  canvasHeight: number;
  gridSize: number;
  snapToGrid: boolean;
}

/**
 * Shapes state slice - shape data and selection
 */
export interface ShapesState {
  shapes: Shape[];
  selectedIds: Set<Id>;
  hoveredId: Id | null;
  clipboardShapes: Shape[];
}

/**
 * Tools state slice - active mode and tool settings
 */
export interface ToolsState {
  mode: Mode;
  actionMode: ActionMode;
  currentColor: string;
  currentThickness: number;
  showDimensions: boolean;
}

/**
 * History state slice - undo/redo stack
 */
export interface HistoryState {
  history: HistoryEntry[];
  historyIndex: number;
  maxHistorySize: number;
}

/**
 * Module state slice - furniture module configuration
 */
export interface ModuleState {
  moduleWidth: number;
  moduleHeight: number;
  moduleDepth: number;
  moduleName: string;
  sections: number;
  centerPostPositions: number[];
}

/**
 * Complete design store state - union of all slices
 */
export interface DesignStoreState
  extends CanvasState,
    ShapesState,
    ToolsState,
    HistoryState,
    ModuleState {}
