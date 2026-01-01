/**
 * ColorFrameEngine
 *
 * Handles Color Frame form defaults, validation, and summary computation.
 * Extracted from home.tsx for reuse in PDF and Quotation modules.
 */

export interface ColorFrameForm {
  height: number;
  width: number;
  laminateCode: string;
  quantity: number;
  note: string;
  customLaminateCode: string;
  plywoodType: string;
  grainDirection: boolean;
}

export interface ColorFrameSummary {
  height: number;
  width: number;
  quantity: number;
  laminateCode: string;
  plywoodType: string;
  grainDirection: boolean;
}

/**
 * Default values for the Color Frame form.
 */
export const DEFAULT_COLOR_FRAME_FORM: ColorFrameForm = {
  height: 2400,
  width: 80,
  laminateCode: '',
  quantity: 1,
  note: '',
  customLaminateCode: '',
  plywoodType: 'Apple Ply 16mm BWP',
  grainDirection: false
};

/**
 * Compute the Color Frame summary from form data.
 * Uses defaults for any missing values.
 */
export function computeColorFrameSummary(colorFrameForm: Partial<ColorFrameForm> | null | undefined): ColorFrameSummary {
  if (!colorFrameForm) {
    return {
      height: DEFAULT_COLOR_FRAME_FORM.height,
      width: DEFAULT_COLOR_FRAME_FORM.width,
      quantity: DEFAULT_COLOR_FRAME_FORM.quantity,
      laminateCode: DEFAULT_COLOR_FRAME_FORM.laminateCode,
      plywoodType: DEFAULT_COLOR_FRAME_FORM.plywoodType,
      grainDirection: DEFAULT_COLOR_FRAME_FORM.grainDirection
    };
  }

  return {
    height: colorFrameForm.height || DEFAULT_COLOR_FRAME_FORM.height,
    width: colorFrameForm.width || DEFAULT_COLOR_FRAME_FORM.width,
    quantity: colorFrameForm.quantity || DEFAULT_COLOR_FRAME_FORM.quantity,
    laminateCode: colorFrameForm.laminateCode || DEFAULT_COLOR_FRAME_FORM.laminateCode,
    plywoodType: colorFrameForm.plywoodType || DEFAULT_COLOR_FRAME_FORM.plywoodType,
    grainDirection: colorFrameForm.grainDirection ?? DEFAULT_COLOR_FRAME_FORM.grainDirection
  };
}

/**
 * Validate that Color Frame dimensions are reasonable.
 */
export function validateColorFrame(colorFrameForm: Partial<ColorFrameForm>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (colorFrameForm.height && colorFrameForm.height <= 0) {
    errors.push('Height must be greater than 0');
  }

  if (colorFrameForm.width && colorFrameForm.width <= 0) {
    errors.push('Width must be greater than 0');
  }

  if (colorFrameForm.quantity && colorFrameForm.quantity <= 0) {
    errors.push('Quantity must be at least 1');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
