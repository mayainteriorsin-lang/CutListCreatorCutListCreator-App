import React from "react";
import { useVisualQuotationStore } from "../../store/visualQuotationStore";

/**
 * LaminatePanel
 * --------------
 * Simple laminate assignment by code.
 * Later this becomes drag & drop with textures.
 */

const LAMINATES = [
  { code: "L-101", name: "White Matte" },
  { code: "L-205", name: "Walnut" },
  { code: "L-330", name: "Grey Gloss" },
];

const LaminatePanel: React.FC = () => {
  const { units, updateWardrobeUnit, status } = useVisualQuotationStore();
  const locked = status === "APPROVED";

  return (
    <div style={styles.card}>
      <div style={styles.title}>Finishes</div>

      {units.length === 0 ? (
        <div style={styles.empty}>Add a wardrobe first.</div>
      ) : (
        units.map((u) => (
          <div key={u.id} style={styles.unitRow}>
            <div style={styles.unitTitle}>Unit • {u.wallId}</div>

            <select
              disabled={locked}
              style={styles.select}
              value={u.finish.shutterLaminateCode || ""}
              onChange={(e) =>
                updateWardrobeUnit(u.id, {
                  finish: { ...u.finish, shutterLaminateCode: e.target.value },
                })
              }
            >
              <option value="">Select shutter laminate</option>
              {LAMINATES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.code} - {l.name}
                </option>
              ))}
            </select>

            <select
              disabled={locked}
              style={styles.select}
              value={u.finish.loftLaminateCode || ""}
              onChange={(e) =>
                updateWardrobeUnit(u.id, {
                  finish: { ...u.finish, loftLaminateCode: e.target.value },
                })
              }
            >
              <option value="">Select loft laminate</option>
              {LAMINATES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.code} - {l.name}
                </option>
              ))}
            </select>
          </div>
        ))
      )}

      {locked && (
        <div style={styles.hint}>Approved quotes cannot be edited. Duplicate to make changes.</div>
      )}
    </div>
  );
};

export default LaminatePanel;

const styles: { [k: string]: React.CSSProperties } = {
  card: { background: "#fff", padding: 16, borderRadius: 8, border: "1px solid #e5e7eb" },
  title: { fontSize: 14, fontWeight: 800, marginBottom: 8 },
  empty: { fontSize: 12, color: "#6b7280" },
  unitRow: { marginTop: 10, display: "flex", flexDirection: "column", gap: 6 },
  unitTitle: { fontSize: 12, fontWeight: 700 },
  select: {
    padding: "8px 10px",
    minHeight: 36,
    borderRadius: 10,
    border: "1px solid #d1d5db",
  },
  hint: { marginTop: 8, fontSize: 12, color: "#6b7280" },
};
