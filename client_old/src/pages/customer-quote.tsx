import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { getLeads, getQuoteById } from "@/modules/crm/storage";
import type { LeadRecord, QuoteSummary } from "@/modules/crm/types";
import { Button } from "@/components/ui/button";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

interface QuoteViewModel {
  quote: QuoteSummary;
  lead: LeadRecord;
}

export default function CustomerQuotePage() {
  const { quoteId } = useParams<{ quoteId: string }>();
  const [vm, setVm] = useState<QuoteViewModel | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>("Loading quotation...");
  const contentRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!quoteId) {
      setStatusMessage("Quotation not available");
      return;
    }

    const quote = getQuoteById(quoteId);
    if (!quote) {
      setStatusMessage("Quotation not available");
      return;
    }

    if (quote.status !== "APPROVED") {
      setStatusMessage("Quotation not available");
      return;
    }

    const leads = getLeads();
    const lead = leads.find((l) => l.id === quote.leadId);

    if (!lead) {
      setStatusMessage("Quotation not available");
      return;
    }

    setVm({ quote, lead });
    setStatusMessage("");
  }, [quoteId]);

  const shareLink = useMemo(() => {
    if (typeof window === "undefined" || !quoteId) return "";
    return `${window.location.origin}/quote/${quoteId}`;
  }, [quoteId]);

  const totalPrice = vm?.quote?.amount ?? 0;
  const approvedDate = vm?.quote?.updatedAt ? new Date(vm.quote.updatedAt).toLocaleDateString() : "—";

  const handleDownloadPdf = async () => {
    if (!contentRef.current || !quoteId) return;
    const canvas = await html2canvas(contentRef.current, { scale: 2 });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgProps = pdf.getImageProperties(imgData);
    const imgHeight = (imgProps.height * pageWidth) / imgProps.width;
    pdf.addImage(imgData, "PNG", 0, 0, pageWidth, imgHeight);
    pdf.save(`Quotation_${quoteId}.pdf`);
  };

  const handleCopyLink = async () => {
    if (!shareLink) return;
    try {
      await navigator.clipboard.writeText(shareLink);
      setStatusMessage("Link copied");
      setTimeout(() => setStatusMessage(""), 2000);
    } catch {
      setStatusMessage("Unable to copy link");
    }
  };

  const handleWhatsapp = () => {
    if (!vm || !shareLink) return;
    const mobile = (vm.lead.mobile || "").replace(/\D/g, "");
    const msg = `Hello ${vm.lead.name || "Customer"},\nYour quotation is ready.\nAmount: INR ${totalPrice}\nView: ${shareLink}`;
    const url = `https://wa.me/91${mobile}?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
  };

  const handleEmail = () => {
    if (!vm || !shareLink) return;
    const subject = "Your Approved Quotation";
    const body = `Hello ${vm.lead.name || "Customer"},%0D%0A%0D%0AYour quotation is ready.%0D%0AAmount: INR ${totalPrice}%0D%0AView: ${shareLink}`;
    window.location.href = `mailto:${vm.lead.email || ""}?subject=${encodeURIComponent(subject)}&body=${body}`;
  };

  if (!vm) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <div className="text-center space-y-2">
          <div className="text-lg font-semibold text-gray-900">Customer Quotation</div>
          <div className="text-sm text-gray-600">{statusMessage || "Loading..."}</div>
        </div>
      </div>
    );
  }

  const { lead, quote } = vm;

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="text-2xl font-semibold text-gray-900">Customer Quotation</div>
            <div className="text-sm text-gray-600">Approved quotation overview</div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleCopyLink}>Copy Link</Button>
            <Button variant="outline" onClick={handleWhatsapp}>Share WhatsApp</Button>
            <Button variant="outline" onClick={handleEmail}>Share Email</Button>
            <Button onClick={handleDownloadPdf}>Download PDF</Button>
          </div>
        </div>

        <div
          ref={contentRef}
          className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 space-y-4"
        >
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="text-lg font-semibold text-gray-900">Maya Interiors</div>
              <div className="text-sm text-gray-600">Quotation No: {quote.quoteId}</div>
              <div className="text-sm text-gray-600">Approved on: {approvedDate}</div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-600">Amount</div>
              <div className="text-2xl font-bold text-gray-900">INR {totalPrice.toLocaleString()}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <div className="text-xs font-semibold text-gray-600">Customer</div>
              <div className="text-sm font-medium text-gray-900">{lead.name}</div>
              <div className="text-sm text-gray-700">{lead.mobile}</div>
              {lead.email ? <div className="text-sm text-gray-700">{lead.email}</div> : null}
            </div>
            <div className="space-y-1">
              <div className="text-xs font-semibold text-gray-600">Project</div>
              <div className="text-sm font-medium text-gray-900">Wardrobe Project</div>
              <div className="text-sm text-gray-700">
                {lead.location?.trim() ? lead.location : "Location not provided"}
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-xs font-semibold text-gray-600">Material Summary</div>
            <div className="text-sm text-gray-800">
              Materials and design details as per approved visual quotation.
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-xs font-semibold text-gray-600">Notes</div>
            <div className="text-sm text-gray-800">Thank you for choosing us.</div>
          </div>
        </div>

        {statusMessage && (
          <div className="text-xs text-gray-600 text-right">{statusMessage}</div>
        )}
      </div>
    </div>
  );
}

