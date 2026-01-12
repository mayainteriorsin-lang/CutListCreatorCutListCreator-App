import { RefObject } from "react";
import { UseFormReturn } from "react-hook-form";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import Spreadsheet from "@/components/Spreadsheet";

// PATCH 18: Strict prop typing
export interface SpreadsheetSectionProps {
  form: UseFormReturn<any>;
  panelsLinked: boolean;
  syncCabinetConfigFrontLaminate: (code: string, isUserSelection: boolean) => void;
  cabinetSectionRef: RefObject<HTMLDivElement>;
}

export default function SpreadsheetSection({
  form,
  panelsLinked,
  syncCabinetConfigFrontLaminate,
  cabinetSectionRef,
}: SpreadsheetSectionProps) {
  return (
    <Card className="bg-white border-gray-200 shadow-md mt-8" data-spreadsheet-section>
      <CardHeader>
        <CardTitle className="text-gray-900">
          <i className="fas fa-table mr-2 text-blue-400"></i>
          Panel Spreadsheet (Import/Export CSV)
        </CardTitle>
      </CardHeader>

      <CardContent>
        <Spreadsheet
          onAddToCabinet={(rowData: any) => {
            // Fill cabinet form from imported spreadsheet row
            if (rowData.height) form.setValue("height", parseFloat(rowData.height) || 0);
            if (rowData.width) form.setValue("width", parseFloat(rowData.width) || 0);
            if (rowData.qty) form.setValue("shutterCount", parseInt(rowData.qty) || 1);
            if (rowData.roomName) form.setValue("roomName", rowData.roomName);
            if (rowData.cabinetName) form.setValue("name", rowData.cabinetName);

            if (rowData.plywoodBrand) form.setValue("plywoodType", rowData.plywoodBrand);

            if (rowData.frontLaminate) {
              form.setValue("topPanelLaminateCode", rowData.frontLaminate);

              // Linked panels enabled
              if (panelsLinked) {
                syncCabinetConfigFrontLaminate(rowData.frontLaminate, true);
              }
            }

            if (rowData.innerLaminate) {
              form.setValue("innerLaminateCode", rowData.innerLaminate);
            }

            // Scroll into cabinet form section
            setTimeout(() => {
              if (cabinetSectionRef?.current) {
                cabinetSectionRef.current.scrollIntoView({
                  behavior: "smooth",
                  block: "center",
                });
              }

              toast({
                title: "Cabinet Data Loaded",
                description: "Spreadsheet row has been applied to cabinet form.",
              });
            }, 100);
          }}
        />
      </CardContent>
    </Card>
  );
}
