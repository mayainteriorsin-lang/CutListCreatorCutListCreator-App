import React, { useEffect, useMemo, useState } from "react";
import { useVisualQuotationStore } from "../../store/visualQuotationStore";

const ScaleCalibrationPanel: React.FC = () => {
  const {
    roomPhoto,
    scale,
    scaleLine,
    scaleDrawMode,
    setScaleDrawMode,
    setScaleLine,
    setScale,
    clearScale,
    status,
  } = useVisualQuotationStore();

  const locked = status === "APPROVED";
  const [refMm, setRefMm] = useState<number>(scale?.mm ?? 0);

  useEffect(() => {
    setRefMm(scale?.mm ?? 0);
  }, [scale?.mm]);

  const canDraw = !!roomPhoto && !locked && !scaleDrawMode;
  const canApply = !!scaleLine && refMm > 0 && !locked;
  const ratioPreview = useMemo(() => {
    if (!scaleLine || refMm <= 0) return 0;
    return refMm / scaleLine.lengthPx;
  }, [scaleLine, refMm]);

  const startDraw = () => {
    if (!roomPhoto || locked) return;
    setScaleLine(undefined);
    setScaleDrawMode(true);
  };

  const applyScale = () => {
    if (!scaleLine || refMm <= 0) return;
    setScale(scaleLine.lengthPx, refMm);
  };

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <div>
          <div style={styles.title}>Set Scale</div>
          <div style={styles.sub}>Draw one line on the photo, enter real length (mm), apply.</div>
        </div>
        <div style={styles.badge}>{scale ? `${scale.ratio.toFixed(3)} mm/px` : "Not set"}</div>
      </div>

      <div style={styles.row}>
        <button
          type="button"
          style={canDraw ? styles.primaryBtn : styles.disabledBtn}
          onClick={startDraw}
          disabled={!canDraw}
        >
          {scaleDrawMode ? "Drawing..." : "Draw Scale Line"}
        </button>
        <div style={styles.info}>
          <div style={styles.label}>Line Pixels</div>
          <div style={styles.value}>
            {scaleLine ? `${scaleLine.lengthPx.toFixed(1)} px` : roomPhoto ? "Draw line" : "No photo"}
          </div>
        </div>
      </div>

      <div style={styles.row}>
        <label style={styles.labelCol}>
          Real Length (mm)
          <input
            style={styles.input}
            type="number"
            min={1}
            value={refMm || ""}
            onChange={(e) => setRefMm(Number(e.target.value))}
            disabled={locked}
            placeholder="e.g., 600"
          />
        </label>

        <div style={styles.preview}>
          <div style={styles.label}>Preview ratio</div>
          <div style={styles.value}>{ratioPreview > 0 ? `${ratioPreview.toFixed(3)} mm/px` : "-"}</div>
        </div>
      </div>

      <div style={styles.row}>
        <button
          type="button"
          style={canApply ? styles.primaryBtn : styles.disabledBtn}
          onClick={applyScale}
          disabled={!canApply}
        >
          Apply Scale
        </button>
        <button
          type="button"
          style={scale ? styles.outlineBtn : styles.disabledBtn}
          onClick={() => clearScale()}
          disabled={!scale || locked}
        >
          Clear Scale
        </button>
      </div>

      {locked && <div style={styles.hint}>Approved quotes cannot be edited.</div>}
      {!roomPhoto && <div style={styles.hint}>Add a room photo to calibrate scale.</div>}
    </div>
  );
};

export default ScaleCalibrationPanel;

const styles: { [k: string]: React.CSSProperties } = {
  card: { background: "#fff", padding: 16, borderRadius: 8, border: "1px solid #e5e7eb" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 },
  title: { fontSize: 14, fontWeight: 800 },
  sub: { marginTop: 2, fontSize: 12, color: "#6b7280", lineHeight: 1.4 },
  badge: {
    fontSize: 12,
    padding: "4px 8px",
    borderRadius: 12,
    border: "1px solid #e5e7eb",
    background: "#f9fafb",
    color: "#374151",
  },
  row: { marginTop: 12, display: "flex", alignItems: "center", gap: 12 },
  info: { flex: 1, background: "#f9fafb", borderRadius: 8, padding: "8px 10px", border: "1px solid #e5e7eb" },
  label: { fontSize: 12, color: "#6b7280" },
  value: { fontSize: 13, fontWeight: 700, color: "#111827", marginTop: 4 },
  labelCol: { flex: 1, display: "flex", flexDirection: "column", gap: 6, fontSize: 12, fontWeight: 700, color: "#374151" },
  input: { padding: "8px 10px", borderRadius: 8, border: "1px solid #d1d5db" },
  preview: { flex: 1, background: "#f9fafb", borderRadius: 8, padding: "8px 10px", border: "1px dashed #e5e7eb" },
  primaryBtn: {
    padding: "9px 12px",
    minHeight: 36,
    borderRadius: 10,
    border: "1px solid #2563eb",
    background: "#2563eb",
    color: "#fff",
    fontWeight: 800,
    cursor: "pointer",
  },
  outlineBtn: {
    padding: "9px 12px",
    minHeight: 36,
    borderRadius: 10,
    border: "1px solid #d1d5db",
    background: "#fff",
    color: "#374151",
    fontWeight: 700,
    cursor: "pointer",
  },
  disabledBtn: {
    padding: "9px 12px",
    minHeight: 36,
    borderRadius: 10,
    border: "1px solid #d1d5db",
    background: "#e5e7eb",
    color: "#9ca3af",
    fontWeight: 800,
    cursor: "not-allowed",
  },
  hint: { marginTop: 8, fontSize: 12, color: "#6b7280" },
};

