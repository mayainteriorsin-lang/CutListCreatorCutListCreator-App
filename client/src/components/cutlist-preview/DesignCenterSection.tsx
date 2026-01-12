import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import DesignCenter from "@/components/ui/DesignCenter";

// PATCH 18: Strict prop typing
export interface DesignCenterSectionProps {
  handleDesignCenterExport: (data: any) => void;
}

export default function DesignCenterSection({
  handleDesignCenterExport,
}: DesignCenterSectionProps) {
  return (
    <Card className="bg-white border-gray-200 shadow-md mt-8" data-design-center-section>
      <CardHeader>
        <CardTitle className="text-gray-900">
          <i className="fas fa-pencil-ruler mr-2 text-teal-500"></i>
          Design Center (Smart Export)
        </CardTitle>
      </CardHeader>

      <CardContent className="p-0" style={{ minHeight: "600px" }}>
        <DesignCenter onExportToCutlist={handleDesignCenterExport} />
      </CardContent>
    </Card>
  );
}
