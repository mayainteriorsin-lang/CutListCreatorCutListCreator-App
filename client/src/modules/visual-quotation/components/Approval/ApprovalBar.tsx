import React, { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import {
  CheckCircle2,
  Copy,
  Mail,
  Link2,
  MessageCircle,
  Clock,
  Send,
  FileText,
  IndianRupee,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useDesignCanvasStore } from "../../store/v2/useDesignCanvasStore";
import { useQuotationMetaStore } from "../../store/v2/useQuotationMetaStore";
import { useServices } from "../../services/useServices";
import { logger } from "../../services/logger";

// Lazy import CRM to avoid bundling with visual-quotation
const getCrmStorage = () => import("@/modules/crm/storage");

const ApprovalBar: React.FC = () => {
  const { status, setStatus, client, meta, leadId, quoteId } = useQuotationMetaStore();
  const { drawnUnits } = useDesignCanvasStore();

  const approveQuote = () => setStatus("APPROVED");
  const resetDraft = () => setStatus("DRAFT");

  const { pricingService } = useServices();
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

  const pricing = useMemo(() => pricingService.calculate(drawnUnits || []), [drawnUnits, pricingService]);
  const totalAmount = pricing.total || 0;

  const quotationLink =
    typeof window !== "undefined"
      ? `${window.location.origin}/quote/${quotationId}`
      : `/quote/${quotationId}`;

  const logShare = (channel: "whatsapp" | "email" | "copy_link") => {
    if (!leadId) return;
    // Lazy load CRM and log activity
    getCrmStorage().then((crm) => {
      crm.logActivity({
        leadId,
        type: "QUOTE_SHARED",
        message: `Quote shared via ${channel}.`,
        meta: { channel, quoteId: quoteId ?? undefined },
      });
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
      logger.error('Clipboard copy failed', { error: String(error), context: 'approval-bar' });
    }
  };

  return (
    <div className="flex-shrink-0 h-14 bg-white border-t border-gray-200 shadow-lg">
      <div className="h-full px-4 flex items-center justify-between">
        {/* Left: Status & Quote Info */}
        <div className="flex items-center gap-4">
          {isApproved ? (
            <Badge className="bg-green-50 text-green-700 border border-green-200 gap-1.5 h-7 px-3 text-xs font-medium">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Approved
            </Badge>
          ) : (
            <Badge variant="secondary" className="bg-gray-100 text-gray-600 border border-gray-200 gap-1.5 h-7 px-3 text-xs font-medium">
              <Clock className="h-3.5 w-3.5" />
              Draft
            </Badge>
          )}

          {/* Quote ID */}
          <div className="flex items-center gap-2 text-sm">
            <FileText className="h-4 w-4 text-gray-400" />
            <span className="text-gray-500">Quote:</span>
            <span className="font-medium text-gray-900">{quotationId}</span>
          </div>

          {/* Total Amount */}
          {totalAmount > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 rounded-lg border border-emerald-200">
              <IndianRupee className="h-4 w-4 text-emerald-600" />
              <span className="text-sm font-bold text-emerald-700">
                {totalAmount.toLocaleString("en-IN")}
              </span>
            </div>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* Share buttons (only when approved) */}
          {isApproved && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleWhatsappShare}
                disabled={!customerMobile}
                className="h-9 px-3 text-xs font-medium bg-green-50 border-green-200 text-green-700 hover:bg-green-100 hover:border-green-300"
              >
                <MessageCircle className="h-4 w-4 mr-1.5" />
                WhatsApp
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleEmailShare}
                className="h-9 px-3 text-xs font-medium border-gray-200 text-gray-600 hover:bg-gray-50"
              >
                <Mail className="h-4 w-4 mr-1.5" />
                Email
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyLink}
                className="h-9 w-9 p-0 border-gray-200 text-gray-500 hover:bg-gray-50"
                title="Copy link"
              >
                <Link2 className="h-4 w-4" />
              </Button>
              <div className="w-px h-6 bg-gray-200 mx-1" />
            </>
          )}

          {/* Main action button */}
          {!isApproved ? (
            <Button
              onClick={approveQuote}
              size="sm"
              className="h-9 px-4 text-xs font-semibold bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white shadow-md"
            >
              <CheckCircle2 className="h-4 w-4 mr-1.5" />
              Approve Quotation
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={resetDraft}
              className="h-9 px-3 text-xs font-medium border-gray-200 text-gray-600 hover:bg-gray-50"
            >
              <Copy className="h-4 w-4 mr-1.5" />
              Duplicate
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ApprovalBar;
