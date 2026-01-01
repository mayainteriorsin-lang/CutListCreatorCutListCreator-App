import React from "react";
import { useVisualQuotationStore } from "../../store/visualQuotationStore";

const ExportPanel: React.FC = () => {
  const { status } = useVisualQuotationStore();

  const exportPdf = () => {
    alert("PDF export hook. Connect pdfmake / react-pdf later.");
  };

  const exportExcel = () => {
    alert("Excel export hook. Connect SheetJS later.");
  };

  return (
    <div style={styles.card}>
      <div style={styles.title}>Share</div>
      <div style={styles.row}>
        <button style={styles.btn} onClick={exportPdf}>
          Download PDF
        </button>
        <button style={styles.btn} onClick={exportExcel}>
          Download Excel
        </button>
      </div>
      {status !== "APPROVED" && (
        <div style={styles.note}>Tip: Approve quote before sharing.</div>
      )}
    </div>
  );
};

export default ExportPanel;

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
  note: { marginTop: 8, fontSize: 12, color: "#6b7280" },
};
