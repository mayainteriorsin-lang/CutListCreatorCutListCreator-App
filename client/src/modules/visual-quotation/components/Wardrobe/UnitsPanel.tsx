import { useVisualQuotationStore } from "../../store/visualQuotationStore";

const UnitsPanel: React.FC = () => {
  const { room, units, addWardrobeUnit, removeWardrobeUnit, updateWardrobeUnit, status } =
    useVisualQuotationStore();

  const locked = status === "APPROVED";

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <div>
          <div style={styles.title}>Wardrobes</div>
          <div style={styles.sub}>Units placed on: {room.selectedWallId}</div>
        </div>

        <button
          type="button"
          disabled={locked}
          style={locked ? styles.btnDisabled : styles.btnPrimary}
          onClick={() => addWardrobeUnit({ wallId: room.selectedWallId })}
          title={locked ? "Approved quotes are locked" : "Add wardrobe unit"}
        >
          Add Wardrobe
        </button>
      </div>

      {units.length === 0 ? (
        <div style={styles.empty}>No units yet. Click Add Wardrobe.</div>
      ) : (
        <div style={styles.list}>
          {units.map((u, idx) => (
            <div key={u.id} style={styles.unitRow}>
              <div style={styles.unitLeft}>
                <div style={styles.unitTitle}>
                  Unit {idx + 1} • {u.wallId}
                </div>
                <div style={styles.unitMeta}>
                  W {u.widthMm} mm × H {u.heightMm} mm × D {u.depthMm} mm • Loft {u.loftEnabled ? `ON (${u.loftHeightMm} mm)` : "OFF"} • Sections {u.sectionCount}
                </div>

                <div style={styles.controls}>
                  <label style={styles.label}>
                    W(mm)
                    <input
                      style={styles.input}
                      type="number"
                      disabled={locked}
                      value={u.widthMm}
                      onChange={(e) => updateWardrobeUnit(u.id, { widthMm: Number(e.target.value) })}
                    />
                  </label>
                  <label style={styles.label}>
                    H(mm)
                    <input
                      style={styles.input}
                      type="number"
                      disabled={locked}
                      value={u.heightMm}
                      onChange={(e) => updateWardrobeUnit(u.id, { heightMm: Number(e.target.value) })}
                    />
                  </label>
                  <label style={styles.label}>
                    D(mm)
                    <input
                      style={styles.input}
                      type="number"
                      disabled={locked}
                      value={u.depthMm}
                      onChange={(e) => updateWardrobeUnit(u.id, { depthMm: Number(e.target.value) })}
                    />
                  </label>
                  <label style={styles.label}>
                    Sections
                    <input
                      style={styles.input}
                      type="number"
                      min={1}
                      disabled={locked}
                      value={u.sectionCount}
                      onChange={(e) =>
                        updateWardrobeUnit(u.id, { sectionCount: Math.max(1, Number(e.target.value)) })
                      }
                    />
                  </label>
                </div>

                <div style={styles.controls}>
                  <label style={styles.checkbox}>
                    <input
                      type="checkbox"
                      disabled={locked}
                      checked={u.loftEnabled}
                      onChange={(e) => updateWardrobeUnit(u.id, { loftEnabled: e.target.checked })}
                    />
                    Loft
                  </label>

                  {u.loftEnabled && (
                    <label style={styles.label}>
                      Loft H(mm)
                      <input
                        style={styles.input}
                        type="number"
                        disabled={locked}
                        value={u.loftHeightMm}
                        onChange={(e) =>
                          updateWardrobeUnit(u.id, { loftHeightMm: Number(e.target.value) })
                        }
                      />
                    </label>
                  )}
                </div>
              </div>

              <button
                type="button"
                disabled={locked}
                style={locked ? styles.iconDisabled : styles.iconBtn}
                onClick={() => removeWardrobeUnit(u.id)}
                title={locked ? "Approved quotes are locked" : "Delete unit"}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      {locked && (
        <div style={styles.hint}>Approved quotes cannot be edited. Duplicate to make changes.</div>
      )}
    </div>
  );
};

export default UnitsPanel;

const styles: { [k: string]: React.CSSProperties } = {
  card: { background: "#fff", padding: 16, borderRadius: 8, border: "1px solid #e5e7eb" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 },
  title: { fontSize: 14, fontWeight: 800 },
  sub: { fontSize: 12, color: "#6b7280", marginTop: 2 },
  btnPrimary: {
    padding: "8px 12px",
    minHeight: 36,
    borderRadius: 8,
    border: "1px solid #2563eb",
    background: "#2563eb",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 700,
  },
  btnDisabled: {
    padding: "8px 12px",
    minHeight: 36,
    borderRadius: 8,
    border: "1px solid #d1d5db",
    background: "#e5e7eb",
    color: "#6b7280",
    cursor: "not-allowed",
    fontWeight: 700,
  },
  empty: { marginTop: 12, fontSize: 13, color: "#6b7280" },
  list: { marginTop: 12, display: "flex", flexDirection: "column", gap: 10 },
  unitRow: {
    border: "1px solid #e5e7eb",
    borderRadius: 10,
    padding: 12,
    display: "flex",
    gap: 10,
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  unitLeft: { flex: 1 },
  unitTitle: { fontWeight: 800, fontSize: 13, color: "#111827" },
  unitMeta: { marginTop: 4, fontSize: 12, color: "#6b7280" },
  controls: { marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" },
  label: { fontSize: 12, color: "#374151", display: "flex", gap: 6, alignItems: "center", fontWeight: 600 },
  input: {
    width: 92,
    padding: "6px 8px",
    borderRadius: 8,
    border: "1px solid #d1d5db",
    outline: "none",
  },
  checkbox: { fontSize: 12, color: "#374151", display: "flex", gap: 8, alignItems: "center" },
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
  hint: { marginTop: 8, fontSize: 12, color: "#6b7280" },
};
