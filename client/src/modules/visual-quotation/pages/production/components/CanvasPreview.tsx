/**
 * CanvasPreview Component
 * -----------------------
 * Displays canvas snapshot preview for a unit.
 */

import React from "react";
import { ImageOff } from "lucide-react";

interface CanvasPreviewProps {
  snapshotSrc?: string;
  maxWidth?: number;
  maxHeight?: number;
}

const CanvasPreview: React.FC<CanvasPreviewProps> = ({
  snapshotSrc,
  maxWidth = 300,
  maxHeight = 300,
}) => {
  if (!snapshotSrc) {
    return (
      <div
        className="flex items-center justify-center bg-gray-50 rounded border border-gray-200"
        style={{ width: maxWidth, height: maxHeight }}
      >
        <div className="text-center text-gray-400">
          <ImageOff className="h-8 w-8 mx-auto mb-1" />
          <p className="text-xs">No Preview</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex items-center justify-center bg-gray-50 rounded border border-gray-200"
      style={{ width: maxWidth, height: maxHeight }}
    >
      <img
        src={snapshotSrc}
        alt="Canvas preview"
        style={{
          maxWidth: `${maxWidth - 16}px`,
          maxHeight: `${maxHeight - 16}px`,
          width: "auto",
          height: "auto",
          objectFit: "contain",
        }}
      />
    </div>
  );
};

export default React.memo(CanvasPreview);
