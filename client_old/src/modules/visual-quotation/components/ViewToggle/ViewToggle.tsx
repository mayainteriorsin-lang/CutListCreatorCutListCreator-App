import React from "react";
import { useVisualQuotationStore } from "../../store/visualQuotationStore";

const ViewToggle: React.FC = () => {
  const { viewMode, setViewMode } = useVisualQuotationStore();

  return (
    <div style={styles.card}>
      <div style={styles.title}>View</div>
      <div style={styles.row}>
        <button
          type="button"
          onClick={() => setViewMode("CUSTOMER")}
          style={viewMode === "CUSTOMER" ? styles.active : styles.btn}
        >
          Customer
        </button>
        <button
          type="button"
          onClick={() => setViewMode("PRODUCTION")}
          style={viewMode === "PRODUCTION" ? styles.active : styles.btn}
        >
          Production
        </button>
      </div>
      <div style={styles.note}>
        Customer view hides technical details. Production view shows sizes, laminates, and counts.
      </div>
    </div>
  );
};

export default ViewToggle;

const styles: { [k: string]: React.CSSProperties } = {
  card: { background: "#fff", padding: 16, borderRadius: 8, border: "1px solid #e5e7eb" },
  title: { fontSize: 14, fontWeight: 800, marginBottom: 8 },
  row: { display: "flex", gap: 8 },
  btn: {
    padding: "8px 12px",
    borderRadius: 10,
    border: "1px solid #d1d5db",
    background: "#f9fafb",
    cursor: "pointer",
    fontWeight: 700,
  },
  active: {
    padding: "8px 12px",
    borderRadius: 10,
    border: "1px solid #2563eb",
    background: "#2563eb",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 800,
  },
  note: { marginTop: 8, fontSize: 12, color: "#6b7280" },
};
