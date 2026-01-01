import React from "react";
import "./RightPanel.css";

type PremiumToolbarProps = {
  onUpload: () => void;
  onReplace: () => void;
  onClear: () => void;
  onMove: () => void;
  onLoft: () => void;
  onDivider: () => void;
  onSnap: () => void;
  onReset: () => void;
};

export default function PremiumToolbar({
  onUpload,
  onReplace,
  onClear,
  onMove,
  onLoft,
  onDivider,
  onSnap,
  onReset
}: PremiumToolbarProps) {
  return (
    <div className="top-toolbar">
      <div className="toolbar-left">
        <button onClick={onUpload}>Upload</button>
        <button onClick={onReplace}>Replace</button>
        <button onClick={onClear}>Clear</button>
      </div>

      <div className="toolbar-right">
        <button onClick={onMove}>Move</button>
        <button onClick={onLoft}>Loft</button>
        <button onClick={onDivider}>Divider</button>
        <button onClick={onSnap}>Snap</button>
        <button onClick={onReset}>Reset</button>
      </div>
    </div>
  );
}
