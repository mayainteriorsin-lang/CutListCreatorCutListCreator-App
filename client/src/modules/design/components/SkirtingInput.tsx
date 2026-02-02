/**
 * Skirting Input Component
 * Checkbox + numeric input for skirting height with smooth editing.
 * Uses local state for instant visual feedback while typing.
 */

import { useState, useEffect } from "react";

export interface SkirtingInputProps {
  enabled: boolean;
  height: number;
  onEnabledChange: (enabled: boolean) => void;
  onHeightChange: (height: number) => void;
  rowStyle: React.CSSProperties;
  labelStyle: React.CSSProperties;
  numberInputStyle: React.CSSProperties;
}

export default function SkirtingInput({
  enabled, height, onEnabledChange, onHeightChange,
  rowStyle, labelStyle, numberInputStyle
}: SkirtingInputProps) {
  const [localValue, setLocalValue] = useState(String(height));

  // Sync local value when external height changes
  useEffect(() => {
    setLocalValue(String(height));
  }, [height]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    // Allow empty and partial input while typing
    if (raw === "" || /^\d*$/.test(raw)) {
      setLocalValue(raw);
      // Instant visual update for valid numbers
      const num = parseInt(raw);
      if (!isNaN(num) && num >= 20) {
        onHeightChange(Math.min(300, num));
      }
    }
  };

  const handleBlur = () => {
    // On blur, commit the value (default to 115 if empty/invalid)
    const parsed = parseInt(localValue) || 115;
    const clamped = Math.max(50, Math.min(300, parsed));
    setLocalValue(String(clamped));
    onHeightChange(clamped);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      (e.target as HTMLInputElement).blur();
    }
  };

  return (
    <div style={{ ...rowStyle, marginTop: 6, marginBottom: 0 }}>
      <label style={{ ...labelStyle, marginBottom: 0, display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onEnabledChange(e.target.checked)}
          style={{ accentColor: "#0d9488", cursor: "pointer" }}
        />
        Skirting
      </label>
      {enabled && (
        <input
          type="text"
          inputMode="numeric"
          value={localValue}
          onChange={handleChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          style={numberInputStyle}
          title="Skirting height (mm) - 50 to 300"
        />
      )}
    </div>
  );
}
