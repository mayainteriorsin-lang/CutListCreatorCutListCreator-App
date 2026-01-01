import React from "react";
import { useVisualQuotationStore } from "../../store/visualQuotationStore";
import { calculatePricing } from "../../engine/pricingEngine";

const PriceSummary: React.FC = () => {
  const { units } = useVisualQuotationStore();
  const price = calculatePricing(units);

  return (
    <div style={styles.card}>
      <div style={styles.title}>Estimate</div>

      <div style={styles.row}>Carcass: {price.carcassSqft} sqft</div>
      <div style={styles.row}>Shutters: {price.shutterSqft} sqft</div>

      <hr />

      <div style={styles.row}>Subtotal: INR {price.subtotal}</div>
      <div style={styles.row}>GST (18%): INR {price.gst}</div>

      <div style={styles.total}>Total: INR {price.total}</div>
    </div>
  );
};

export default PriceSummary;

const styles: { [k: string]: React.CSSProperties } = {
  card: { background: "#fff", padding: 16, borderRadius: 8, border: "1px solid #e5e7eb" },
  title: { fontSize: 14, fontWeight: 800, marginBottom: 8 },
  row: { fontSize: 13, marginTop: 4 },
  total: { marginTop: 8, fontSize: 16, fontWeight: 900 },
};
