import React, { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import {
  CheckCircle2,
  Copy,
  Mail,
  Link2,
  MessageCircle,
  Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
Amount: ₹${totalAmount.toLocaleString("en-IN")}
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
    <div className="flex-shrink-0 h-10 bg-white border-t border-slate-200 shadow-lg">
      <div className="h-full px-3 flex items-center justify-between gap-2">
        {/* Status */}
        <div className="flex items-center gap-2">
          {isApproved ? (
            <Badge className="bg-green-100 text-green-700 border-green-200 gap-1 h-6 text-[10px]">
              <CheckCircle2 className="h-3 w-3" />
              Approved
            </Badge>
          ) : (
            <Badge variant="secondary" className="gap-1 h-6 text-[10px]">
              <Clock className="h-3 w-3" />
              Draft
            </Badge>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          {/* Share buttons (only when approved) */}
          {isApproved && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleWhatsappShare}
                disabled={!customerMobile}
                className="h-7 text-[10px] px-2 bg-green-50 border-green-200 text-green-700"
              >
                <MessageCircle className="h-3 w-3 mr-1" />
                WhatsApp
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleEmailShare}
                className="h-7 text-[10px] px-2"
              >
                <Mail className="h-3 w-3 mr-1" />
                Email
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyLink}
                className="h-7 text-[10px] px-2"
              >
                <Link2 className="h-3 w-3" />
              </Button>
            </>
          )}

          {/* Main action button */}
          {!isApproved ? (
            <Button
              onClick={approveQuote}
              size="sm"
              className="h-7 text-[10px] px-3 bg-green-600 hover:bg-green-700"
            >
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Approve
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={resetDraft}
              className="h-7 text-[10px] px-2"
            >
              <Copy className="h-3 w-3 mr-1" />
              Duplicate
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ApprovalBar;
