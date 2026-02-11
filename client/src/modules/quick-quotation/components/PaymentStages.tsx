/**
 * Quick Quotation Module - Payment Stages (Compact)
 *
 * Displays the 5-45-45-5 payment schedule breakdown inline.
 */

import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { CreditCard, ArrowRight } from 'lucide-react';
import { useSettings, useMainItems, useAdditionalItems } from '../store/quickQuotationStore';
import { formatCurrency, PAYMENT_STAGE_PERCENTAGES } from '../constants';
import { calculateAllTotals } from '../engine/calculations';

export function PaymentStages() {
  const settings = useSettings();
  const mainItems = useMainItems();
  const additionalItems = useAdditionalItems();

  const totals = useMemo(
    () =>
      calculateAllTotals(
        mainItems,
        additionalItems,
        settings.discountType,
        settings.discountValue,
        settings.gstEnabled,
        settings.gstRate,
        settings.paidAmount
      ),
    [mainItems, additionalItems, settings.discountType, settings.discountValue, settings.gstEnabled, settings.gstRate, settings.paidAmount]
  );

  const stages = [
    { name: 'Booking', percent: PAYMENT_STAGE_PERCENTAGES.booking, amount: totals.paymentStages.booking },
    { name: 'Production', percent: PAYMENT_STAGE_PERCENTAGES.production, amount: totals.paymentStages.production },
    { name: 'Factory', percent: PAYMENT_STAGE_PERCENTAGES.factory, amount: totals.paymentStages.factory },
    { name: 'Handover', percent: PAYMENT_STAGE_PERCENTAGES.handover, amount: totals.paymentStages.handover },
  ];

  return (
    <Card>
      <CardContent className="p-2 sm:p-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <div className="flex items-center gap-1.5 text-slate-500">
            <CreditCard className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            <span className="text-[9px] sm:text-[10px] uppercase font-medium">Payment</span>
          </div>

          {/* Mobile: 2x2 grid, Desktop: horizontal row */}
          <div className="grid grid-cols-2 sm:flex sm:items-center gap-1.5 sm:gap-1 flex-1">
            {stages.map((stage, index) => (
              <div key={stage.name} className="flex items-center">
                <div className="text-center px-2 sm:px-3 py-1 sm:py-1.5 bg-slate-50 border border-slate-200 rounded hover:border-blue-300 hover:bg-blue-50 transition-colors flex-1 sm:flex-none">
                  <div className="text-xs sm:text-sm font-bold text-slate-700">{stage.percent}%</div>
                  <div className="text-[8px] sm:text-[9px] text-slate-400 uppercase">{stage.name}</div>
                  <div className="text-[10px] sm:text-xs font-medium text-blue-600">₹{formatCurrency(stage.amount)}</div>
                </div>
                {index < stages.length - 1 && (
                  <ArrowRight className="hidden sm:block h-3.5 w-3.5 mx-1 text-slate-300 flex-shrink-0" />
                )}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
