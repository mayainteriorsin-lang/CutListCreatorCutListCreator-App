import React, { useEffect } from "react";
import { useVisualQuotationStore } from "../../store/visualQuotationStore";
import { useMaterialStore } from "@/features/materialStore";

/**
 * LaminatePanel
 * --------------
 * Assigns laminates to wardrobe units using the Master Settings (Godown) list.
 */

const LaminatePanel: React.FC = () => {
  const { units, updateWardrobeUnit, status } = useVisualQuotationStore();
  const { laminateOptions, fetchMaterials } = useMaterialStore();
  const locked = status === "APPROVED";

  useEffect(() => {
    // Ensure we have the latest master list
    fetchMaterials();
  }, [fetchMaterials]);

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
              {laminateOptions.map((l) => (
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
              {laminateOptions.map((l) => (
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
    width: "100%",
  },
  hint: { marginTop: 8, fontSize: 12, color: "#6b7280" },
};
