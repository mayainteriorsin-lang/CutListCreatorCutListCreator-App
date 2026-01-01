import ViewToggle from "../components/ViewToggle/ViewToggle";
import ExportPanel from "../components/Export/ExportPanel";
import ApprovalBar from "../components/Approval/ApprovalBar";
import React, { useEffect, useState } from "react";
import RoomInputPanel from "../components/RoomInput/RoomInputPanel";
import CanvasStage from "../components/Canvas/CanvasStage";
import WallSelector from "../components/Canvas/WallSelector";
import ScaleCalibrationPanel from "../components/RoomInput/ScaleCalibrationPanel";
import ObstructionPanel from "../components/Canvas/ObstructionPanel";
import UnitsPanel from "../components/Wardrobe/UnitsPanel";
import LaminatePanel from "../components/Materials/LaminatePanel";
import PriceSummary from "../components/Pricing/PriceSummary";
import { useSearchParams } from "react-router-dom";
import { useVisualQuotationStore } from "../store/visualQuotationStore";
import { PlywoodSelector } from "@/components/master-settings/PlywoodSelector";

const VisualQuotationPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const syncFromUrl = useVisualQuotationStore((s) => s.syncFromUrl);
  const leadId = searchParams.get("leadId");
  const quoteId = searchParams.get("quoteId");
  const [plywoodBrand, setPlywoodBrand] = useState("");

  useEffect(() => {
    syncFromUrl({ leadId, quoteId });
  }, [leadId, quoteId, syncFromUrl]);

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <h1 style={styles.title}>AI Visual Quotation</h1>
        <p style={styles.subtitle}>Photo + Design + Laminate + Price + Production</p>
      </header>

      <main style={styles.main}>
        <div style={styles.left}>
          <ViewToggle />
          <RoomInputPanel />
          <ScaleCalibrationPanel />
          <WallSelector />
          <ObstructionPanel />
          <div style={styles.card}>
            <div style={styles.title}>Plywood</div>
            <PlywoodSelector value={plywoodBrand} onChange={setPlywoodBrand} />
          </div>
          <UnitsPanel />
          <LaminatePanel />
          <PriceSummary />
          <ExportPanel />
          </div>

        <div style={styles.right}>
          <CanvasStage />
        </div>
      </main>
    <ApprovalBar />
    </div>
  );
};

export default VisualQuotationPage;

const styles: { [key: string]: React.CSSProperties } = {
  page: { minHeight: "100vh", backgroundColor: "#f7f9fc", display: "flex", flexDirection: "column" },
  header: { padding: "16px 24px", backgroundColor: "#ffffff", borderBottom: "1px solid #e5e7eb" },
  title: { margin: 0, fontSize: 20, fontWeight: 700 },
  subtitle: { marginTop: 4, fontSize: 13, color: "#6b7280" },
  main: { display: "grid", gridTemplateColumns: "380px 1fr", gap: 16, padding: 16 },
  left: { display: "flex", flexDirection: "column", gap: 16 },
  right: { display: "flex", flexDirection: "column", gap: 16 },
  card: { background: "#fff", padding: 16, borderRadius: 8, border: "1px solid #e5e7eb" },
};
