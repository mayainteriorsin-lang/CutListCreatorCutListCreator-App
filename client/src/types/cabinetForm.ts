/**
 * PATCH 36: Strict Props Contracts + Defaults
 *
 * Strong type definitions for CabinetForm props.
 * These ensure components receive what they expect.
 */

import type { RefObject } from "react";
import type { UseFormReturn } from "react-hook-form";

export type LaminateCodeItem =
  | string
  | { id?: string; code: string };

export interface CabinetFormProps {
  form: UseFormReturn<any>;

  cabinetConfigMode: "basic" | "advanced";
  setCabinetConfigMode: (v: "basic" | "advanced") => void;

  updateShutters: () => void;

  panelsLinked: boolean;
  setPanelsLinked: (v: boolean) => void;

  laminateCodes: LaminateCodeItem[];     // ALWAYS array
  plywoodTypes: string[];                // ALWAYS array

  handleAddCabinet: () => void;

  shutterHeightInputRef: RefObject<HTMLInputElement>;
  cabinetSectionRef: RefObject<HTMLDivElement>;
  cabinetHeightInputRef?: RefObject<HTMLInputElement>;
}
