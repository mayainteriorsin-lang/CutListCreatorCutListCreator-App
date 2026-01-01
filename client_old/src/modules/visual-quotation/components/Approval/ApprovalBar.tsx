import React, { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useVisualQuotationStore } from "../../store/visualQuotationStore";
import { calculatePricing } from "../../engine/pricingEngine";
import { logActivity } from "@/modules/crm/storage";

const ApprovalBar: React.FC = () => {
  const { status, approveQuote, resetDraft, client, meta, units, leadId, quoteId } =
    useVisualQuotationStore();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const isApproved = status === "APPROVED";
  const quotationId = meta?.quoteNo || "QUOTE";
  const projectName = searchParams.get("project") || "Wardrobe Project";
  const customerName = client?.name?.trim() || "Customer";
  const phoneParam =
    searchParams.get("mobile") ||
    searchParams.get("phone") ||
    searchParams.get("customerMobile") ||
    "";
  const customerMobile = (phoneParam || client?.phone || "").replace(/\D/g, "");

  const pricing = useMemo(() => calculatePricing(units || []), [units]);
  const totalAmount = pricing.total || 0;

  const quotationLink =
    typeof window !== "undefined"
      ? `${window.location.origin}/quote/${quotationId}`
      : `/quote/${quotationId}`;

  const logShare = (channel: "whatsapp" | "email" | "copy_link") => {
    if (!leadId) return;
    logActivity({
      leadId,
      type: "QUOTE_SHARED",
      message: `Quote shared via ${channel}.`,
      meta: { channel, quoteId: quoteId ?? undefined },
    });
  };

  const shareMessage = `Hello ${customerName},
Your quotation for ${projectName} is ready.
Quotation No: ${quotationId}
Amount: ₹${totalAmount}
View here: ${quotationLink}`;

  const handleWhatsappShare = () => {
    if (!isApproved || !customerMobile) return;
    logShare("whatsapp");
    const url = `https://wa.me/91${customerMobile}?text=${encodeURIComponent(shareMessage)}`;
    window.open(url, "_blank");
  };

  const handleEmailShare = () => {
    if (!isApproved) return;
    const subject = "Wardrobe Quotation – Maya Interiors";
    const body = encodeURIComponent(shareMessage);
    logShare("email");
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${body}`;
  };

  const handleCopyLink = async () => {
    if (!isApproved) return;
    try {
      await navigator.clipboard.writeText(quotationLink);
      logShare("copy_link");
      toast({
        title: "Link copied",
        description: "Quotation link copied to clipboard.",
      });
    } catch (error) {
      console.error("Copy failed", error);
    }
  };

  return (
    <div style={styles.bar}>
      <div style={styles.left}>
        Status: <strong>{status}</strong>
      </div>

      <div style={styles.right}>
        {isApproved && (
          <div style={styles.share}>
            <span style={styles.shareLabel}>Share:</span>
            <div style={styles.shareButtons}>
              <button
                style={{ ...styles.shareButton, background: "#22c55e", color: "#fff" }}
                onClick={handleWhatsappShare}
                disabled={!isApproved || !customerMobile}
              >
                Share via WhatsApp
              </button>
              <button
                style={{ ...styles.shareButton, background: "#2563eb", color: "#fff" }}
                onClick={handleEmailShare}
                disabled={!isApproved}
              >
                Share via Email
              </button>
              <button
                style={{ ...styles.shareButton, background: "#f3f4f6", color: "#111827" }}
                onClick={handleCopyLink}
                disabled={!isApproved}
              >
                Copy Link
              </button>
            </div>
          </div>
        )}

        {status !== "APPROVED" ? (
          <button style={styles.approve} onClick={approveQuote}>
            Approve Quote
          </button>
        ) : (
          <button style={styles.reset} onClick={resetDraft}>
            Duplicate Quote
          </button>
        )}
      </div>
    </div>
  );
};

export default ApprovalBar;

const styles: { [k: string]: React.CSSProperties } = {
  bar: {
    position: "sticky",
    bottom: 0,
    background: "#ffffff",
    borderTop: "1px solid #e5e7eb",
    padding: "10px 16px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    zIndex: 10,
  },
  left: { fontSize: 13 },
  right: { display: "flex", gap: 8 },
  approve: {
    padding: "8px 14px",
    borderRadius: 10,
    border: "1px solid #16a34a",
    background: "#16a34a",
    color: "#fff",
    fontWeight: 800,
    cursor: "pointer",
  },
  reset: {
    padding: "8px 14px",
    borderRadius: 10,
    border: "1px solid #d1d5db",
    background: "#f9fafb",
    fontWeight: 800,
    cursor: "pointer",
  },
  share: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  shareLabel: { fontSize: 12, color: "#374151", fontWeight: 700 },
  shareButtons: { display: "flex", gap: 6, flexWrap: "wrap" },
  shareButton: {
    padding: "8px 12px",
    borderRadius: 8,
    border: "1px solid #e5e7eb",
    fontWeight: 700,
    cursor: "pointer",
    fontSize: 12,
  },
};
