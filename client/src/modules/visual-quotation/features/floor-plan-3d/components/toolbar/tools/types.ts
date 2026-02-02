/**
 * Shared types for 3D Floor Plan Tools
 */

export type SelectionType = "floor" | "wall" | "unit" | "model" | null;

export interface ToolSelection {
  type: SelectionType;
  id: string | null;
}

export interface ToolButtonProps {
  isActive?: boolean;
  onClick: () => void;
  title: string;
  disabled?: boolean;
  children: React.ReactNode;
  variant?: "default" | "danger" | "success" | "warning";
}

export interface ToolProps {
  selection: ToolSelection;
  onClearSelection?: () => void;
}
