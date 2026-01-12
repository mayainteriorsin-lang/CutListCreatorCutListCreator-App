import React from "react";
import { FileText, FileSpreadsheet, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
    <Card className="border-slate-200 shadow-sm">
      <CardContent className="p-4 space-y-3">
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={exportPdf}
            className="flex-1"
          >
            <FileText className="h-4 w-4 mr-2" />
            PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={exportExcel}
            className="flex-1"
          >
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Excel
          </Button>
        </div>

        {status !== "APPROVED" && (
          <div className="flex items-start gap-2 p-2 rounded-lg bg-blue-50 border border-blue-100">
            <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
            <p className="text-[11px] text-blue-700">
              Approve the quote before sharing with customer.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ExportPanel;
