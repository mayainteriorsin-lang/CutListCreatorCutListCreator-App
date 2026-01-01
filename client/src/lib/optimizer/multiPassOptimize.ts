import { optimizeStandardCutlist } from '@/features/standard/optimizer';

/**
 * Optimize parts using standard optimizer.
 * @param parts - Array of parts to optimize
 * @param sheetWidth - Sheet width (default 1210mm)
 * @param sheetHeight - Sheet height (default 2420mm)
 * @param kerf - Blade kerf width (default 5mm)
 * @returns Best optimization result
 */
export async function multiPassOptimize(
  parts: Array<any>,
  sheetWidth: number = 1210,
  sheetHeight: number = 2420,
  kerf: number = 5
): Promise<any[]> {
  console.log('📦 Using standard optimizer');
  return await optimizeStandardCutlist(parts, sheetWidth, sheetHeight, kerf);
}
