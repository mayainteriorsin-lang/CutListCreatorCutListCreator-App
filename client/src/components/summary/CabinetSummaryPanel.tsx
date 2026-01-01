import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Cabinet, cabinetTypes } from "@shared/schema";
import { generateUUID } from "@/lib/uuid";

interface CabinetSummaryPanelProps {
  cabinets: Cabinet[];
  removeCabinet: (id: string) => void;
  form: any;
}

export function CabinetSummaryPanel({
  cabinets,
  removeCabinet,
  form
}: CabinetSummaryPanelProps) {
  return (
    <Card className="bg-white border-gray-200 shadow-xl">
      <CardHeader>
        <CardTitle className="flex items-center text-slate-900">
          <i className="fas fa-cube mr-2 text-blue-600"></i>
          Configured Cabinets
          <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
            {cabinets.length}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {cabinets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-slate-500">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
              <i className="fas fa-cubes text-2xl text-slate-300"></i>
            </div>
            <h3 className="text-lg font-medium text-slate-900 mb-1">Your list is empty</h3>
            <p className="max-w-[250px] text-sm">
              Configure your first cabinet on the left and click <span className="font-semibold text-primary-600">Add Cabinet</span>.
            </p>
          </div>
        ) : (
          <>
            {cabinets.map((cabinet) => (
              <div key={cabinet.id} className="border border-slate-200 rounded-lg p-4 mb-3 last:mb-0">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="text-sm font-medium text-slate-900">{cabinet.name}</h4>
                    <div className="text-xs text-slate-500">
                      {cabinetTypes.find(t => t.value === cabinet.type)?.label} • 18mm thickness
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeCabinet(cabinet.id)}
                    className="text-red-600 hover:text-red-700 p-1"
                  >
                    <i className="fas fa-trash text-sm"></i>
                  </Button>
                </div>

                {/* Dimensions & Details */}
                <div className="text-xs text-slate-500 space-y-1">
                  <div className="font-medium text-slate-700">Dimensions:</div>
                  <div>{cabinet.height}mm H × {cabinet.width}mm W</div>
                  <div>
                    {cabinet.shuttersEnabled ? `${cabinet.shutterCount} Shutters included` : 'No shutters'}
                  </div>
                  <div>
                    5 Panels
                  </div>
                </div>
              </div>
            ))}

            <Button
              variant="outline"
              className="w-full mt-4 border-2 border-dashed border-slate-300 text-slate-600 hover:border-slate-400 hover:text-slate-700"
              onClick={() => {
                form.reset({
                  id: generateUUID(),
                  name: `Shutter #${cabinets.length + 1}`,
                  height: 800,
                  width: 600,
                  depth: 450,
                  shuttersEnabled: false,
                  shutterCount: 1,
                  shutterType: 'Standard',
                  shutters: [
                    { width: 282, height: 784 },
                    { width: 282, height: 784 }
                  ],
                  topPanelLaminateCode: '',
                  bottomPanelLaminateCode: '',
                  leftPanelLaminateCode: '',
                  rightPanelLaminateCode: '',
                  backPanelLaminateCode: '',
                  topPanelInnerLaminateCode: '',
                  bottomPanelInnerLaminateCode: '',
                  leftPanelInnerLaminateCode: '',
                  rightPanelInnerLaminateCode: '',
                  backPanelInnerLaminateCode: '',
                  innerLaminateCode: ''
                });
              }}
            >
              <i className="fas fa-plus mr-2"></i>
              Add Another Cabinet
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
