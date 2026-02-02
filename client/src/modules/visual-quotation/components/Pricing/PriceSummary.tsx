import React from "react";
import { IndianRupee, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useServices } from "../../services/useServices";

const PriceSummary: React.FC = () => {
  const { pricingService } = useServices();

  // Calculate pricing using the service
  const price = pricingService.calculateCurrentPricing() || {
    total: 0,
    subtotal: 0,
    gst: 0,
    totalSqft: 0,
    units: [],
    breakdown: {}
  };

  return (
    <Card className="border-slate-200 shadow-sm overflow-hidden">
      <CardContent className="p-0">
        {/* Header */}
        <div className="px-4 py-3 bg-gradient-to-r from-emerald-500 to-teal-500">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-white/80" />
            <span className="text-sm font-semibold text-white">Price Estimate</span>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3">
          {/* Area breakdown */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
              <p className="text-[10px] text-slate-500 uppercase tracking-wide">Total Area</p>
              <p className="text-sm font-bold text-slate-800">{price.totalSqft} sqft</p>
            </div>
            <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
              <p className="text-[10px] text-slate-500 uppercase tracking-wide">Units</p>
              <p className="text-sm font-bold text-slate-800">{price.units.length}</p>
            </div>
          </div>

          <Separator />

          {/* Price breakdown */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">Subtotal</span>
              <span className="font-medium text-slate-800">
                <IndianRupee className="h-3 w-3 inline-block" />
                {price.subtotal.toLocaleString("en-IN")}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">GST (18%)</span>
              <span className="font-medium text-slate-800">
                <IndianRupee className="h-3 w-3 inline-block" />
                {price.gst.toLocaleString("en-IN")}
              </span>
            </div>
          </div>

          <Separator />

          {/* Total */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-700">Total</span>
            <div className="flex items-center gap-1">
              <IndianRupee className="h-4 w-4 text-emerald-600" />
              <span className="text-xl font-bold text-emerald-600">
                {price.total.toLocaleString("en-IN")}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PriceSummary;
