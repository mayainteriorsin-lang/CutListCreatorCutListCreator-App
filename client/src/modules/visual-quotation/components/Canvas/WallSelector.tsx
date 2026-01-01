import React from "react";
import { useVisualQuotationStore, WallId } from "../../store/visualQuotationStore";

const WALLS: { id: WallId; label: string }[] = [
  { id: "LEFT", label: "Left" },
  { id: "RIGHT", label: "Right" },
  { id: "CENTER", label: "Center" },
  { id: "FULL", label: "Full" },
];

const WallSelector: React.FC = () => {
  const { room, setSelectedWall } = useVisualQuotationStore();

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <div style={styles.title}>Wall</div>
        <div style={styles.badge}>Selected: {room.selectedWallId}</div>
      </div>

      <div style={styles.row}>
        {WALLS.map((w) => {
          const active = w.id === room.selectedWallId;
          return (
            <button
              key={w.id}
              style={active ? styles.activeBtn : styles.btn}
              onClick={() => setSelectedWall(w.id)}
              type="button"
            >
              {w.label}
            </button>
          );
        })}
      </div>

      <div style={styles.note}>
        Tip: Select wall first. All drawing/placement will be restricted to the selected wall region (advanced logic coming next).
      </div>
    </div>
  );
};

export default WallSelector;

const styles: { [k: string]: React.CSSProperties } = {
  card: {
    background: "#fff",
    padding: 16,
    borderRadius: 8,
    border: "1px solid #e5e7eb",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    gap: 8,
  },
  title: { fontSize: 14, fontWeight: 700 },
  badge: {
    fontSize: 12,
    padding: "2px 8px",
    borderRadius: 999,
    border: "1px solid #e5e7eb",
    color: "#374151",
    background: "#f9fafb",
  },
  row: { display: "flex", gap: 8, flexWrap: "wrap" },
  btn: {
    padding: "7px 12px",
    border: "1px solid #d1d5db",
    background: "#f9fafb",
    cursor: "pointer",
    borderRadius: 6,
  },
  activeBtn: {
    padding: "7px 12px",
    border: "1px solid #2563eb",
    background: "#2563eb",
    color: "#fff",
    cursor: "pointer",
    borderRadius: 6,
  },
  note: { marginTop: 10, fontSize: 12, color: "#6b7280", lineHeight: 1.4 },
};
