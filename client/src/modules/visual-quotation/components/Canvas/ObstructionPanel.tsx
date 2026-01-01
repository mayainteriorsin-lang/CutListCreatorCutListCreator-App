import React, { useMemo, useState } from "react";
import { useVisualQuotationStore, ObstructionType } from "../../store/visualQuotationStore";

/**
 * ObstructionPanel
 * -----------------
 * Adds site constraints as rectangles (px) on the canvas.
 * For now, user enters rectangle values manually (fast).
 * Next step: draw obstructions directly on canvas (click-drag).
 */

const TYPE_OPTIONS: { type: ObstructionType; label: string }[] = [
  { type: "BEAM", label: "Beam Drop" },
  { type: "SKIRTING", label: "Skirting" },
  { type: "WINDOW", label: "Window" },
  { type: "SWITCHBOARD", label: "Switchboard" },
  { type: "DOOR_SWING", label: "Door Swing" },
  { type: "PLINTH", label: "Plinth" },
  { type: "OTHER", label: "Other" },
];

const ObstructionPanel: React.FC = () => {
  const { room, addObstruction, removeObstruction, clearObstructions, status } = useVisualQuotationStore();

  const locked = status === "APPROVED";

  const [type, setType] = useState<ObstructionType>("BEAM");
  const [label, setLabel] = useState<string>("Beam Drop");
  const [x, setX] = useState<number>(80);
  const [y, setY] = useState<number>(80);
  const [w, setW] = useState<number>(160);
  const [h, setH] = useState<number>(60);

  const canAdd = useMemo(() => w > 0 && h > 0, [w, h]);

  const onAdd = () => {
    addObstruction({
      type,
      label,
      rect: { x, y, w, h },
    });
  };

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <div>
          <div style={styles.title}>Site Conditions</div>
          <div style={styles.sub}>Mark beams, windows, switchboards, door swing, etc.</div>
        </div>

        <div style={styles.actions}>
          <button
            type="button"
            disabled={locked || room.obstructions.length === 0}
            style={locked ? styles.btnDisabled : styles.btnGhost}
            onClick={clearObstructions}
          >
            Clear All
          </button>
        </div>
      </div>

      <div style={styles.form}>
        <label style={styles.label}>
          Type
          <select
            style={styles.input}
            value={type}
            disabled={locked}
            onChange={(e) => {
              const t = e.target.value as ObstructionType;
              setType(t);
              const found = TYPE_OPTIONS.find((o) => o.type === t);
              setLabel(found?.label || "Other");
            }}
          >
            {TYPE_OPTIONS.map((o) => (
              <option key={o.type} value={o.type}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        <label style={styles.label}>
          Label
          <input
            style={styles.input}
            value={label}
            disabled={locked}
            onChange={(e) => setLabel(e.target.value)}
          />
        </label>

        <div style={styles.xywh}>
          <label style={styles.label}>
            X(px)
            <input style={styles.input} type="number" disabled={locked} value={x} onChange={(e) => setX(Number(e.target.value))} />
          </label>
          <label style={styles.label}>
            Y(px)
            <input style={styles.input} type="number" disabled={locked} value={y} onChange={(e) => setY(Number(e.target.value))} />
          </label>
          <label style={styles.label}>
            W(px)
            <input style={styles.input} type="number" disabled={locked} value={w} onChange={(e) => setW(Number(e.target.value))} />
          </label>
          <label style={styles.label}>
            H(px)
            <input style={styles.input} type="number" disabled={locked} value={h} onChange={(e) => setH(Number(e.target.value))} />
          </label>
        </div>

        <button
          type="button"
          disabled={locked || !canAdd}
          style={locked || !canAdd ? styles.btnDisabled : styles.btnPrimary}
          onClick={onAdd}
        >
          + Add Constraint
        </button>
      </div>

      <div style={styles.list}>
        {room.obstructions.length === 0 ? (
          <div style={styles.empty}>No constraints added yet.</div>
        ) : (
          room.obstructions.map((o) => (
            <div key={o.id} style={styles.row}>
              <div style={styles.rowLeft}>
                <div style={styles.rowTitle}>
                  {o.label} <span style={styles.pill}>{o.type}</span>
                </div>
                <div style={styles.rowMeta}>
                  x:{o.rect.x} y:{o.rect.y} w:{o.rect.w} h:{o.rect.h}
                </div>
              </div>
              <button
                type="button"
                disabled={locked}
                style={locked ? styles.iconDisabled : styles.iconBtn}
                onClick={() => removeObstruction(o.id)}
                title={locked ? "Approved quotes are locked" : "Remove"}
              >
                Remove
              </button>
            </div>
          ))
        )}
      </div>

      <div style={styles.note}>
        Next step: you will draw these directly on canvas using click-drag rectangles.
      </div>

      {locked && (
        <div style={styles.hint}>Approved quotes cannot be edited. Duplicate to make changes.</div>
      )}
    </div>
  );
};

export default ObstructionPanel;

const styles: { [k: string]: React.CSSProperties } = {
  card: { background: "#fff", padding: 16, borderRadius: 8, border: "1px solid #e5e7eb" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 },
  title: { fontSize: 14, fontWeight: 800 },
  sub: { marginTop: 2, fontSize: 12, color: "#6b7280" },
  actions: { display: "flex", gap: 8 },
  btnGhost: {
    padding: "8px 10px",
    borderRadius: 10,
    border: "1px solid #d1d5db",
    background: "#fff",
    cursor: "pointer",
    fontWeight: 700,
    minHeight: 36,
  },
  btnPrimary: {
    padding: "9px 12px",
    minHeight: 36,
    borderRadius: 10,
    border: "1px solid #2563eb",
    background: "#2563eb",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 800,
    width: "fit-content",
  },
  btnDisabled: {
    padding: "9px 12px",
    minHeight: 36,
    borderRadius: 10,
    border: "1px solid #d1d5db",
    background: "#e5e7eb",
    color: "#6b7280",
    cursor: "not-allowed",
    fontWeight: 800,
    width: "fit-content",
  },
  form: { marginTop: 12, display: "flex", flexDirection: "column", gap: 10 },
  label: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    fontSize: 12,
    color: "#374151",
    fontWeight: 600,
  },
  input: { padding: "8px 10px", borderRadius: 10, border: "1px solid #d1d5db", outline: "none" },
  xywh: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 },
  list: { marginTop: 12, display: "flex", flexDirection: "column", gap: 8 },
  empty: { fontSize: 12, color: "#6b7280" },
  row: {
    border: "1px solid #e5e7eb",
    borderRadius: 10,
    padding: 10,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  rowLeft: { display: "flex", flexDirection: "column", gap: 2 },
  rowTitle: { fontSize: 12, fontWeight: 800, color: "#111827" },
  rowMeta: { fontSize: 12, color: "#6b7280" },
  pill: {
    marginLeft: 6,
    fontSize: 11,
    padding: "2px 6px",
    borderRadius: 999,
    border: "1px solid #e5e7eb",
    color: "#374151",
    background: "#f9fafb",
  },
  iconBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    border: "1px solid #ef4444",
    background: "#fff",
    color: "#ef4444",
    cursor: "pointer",
    fontWeight: 900,
    lineHeight: "28px",
  },
  iconDisabled: {
    width: 30,
    height: 30,
    borderRadius: 8,
    border: "1px solid #d1d5db",
    background: "#f3f4f6",
    color: "#9ca3af",
    cursor: "not-allowed",
    fontWeight: 900,
    lineHeight: "28px",
  },
  note: { marginTop: 10, fontSize: 12, color: "#6b7280", lineHeight: 1.4 },
  hint: { marginTop: 8, fontSize: 12, color: "#6b7280" },
};
