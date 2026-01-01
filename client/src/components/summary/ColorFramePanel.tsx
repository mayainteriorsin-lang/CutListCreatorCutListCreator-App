import { ColorFrameSummary } from "@/lib/colorframe/ColorFrameEngine";

interface ColorFramePanelProps {
  colorFrame: ColorFrameSummary | null;
  enabled: boolean;
}

/**
 * ColorFramePanel - Displays Color Frame summary in cutlist preview.
 * Extracted from PreviewDialog.tsx for reuse.
 */
export default function ColorFramePanel({ colorFrame, enabled }: ColorFramePanelProps) {
  if (!enabled || !colorFrame) return null;

  return (
    <>
      <h2 className="font-bold text-lg mt-4 border-b pb-1">Colour Frame</h2>
      <div className="text-sm">
        {colorFrame.quantity} × {colorFrame.height} × {colorFrame.width} mm
      </div>
    </>
  );
}
