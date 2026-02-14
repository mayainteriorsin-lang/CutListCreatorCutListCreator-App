/**
 * Quick Quotation Module - Payment Stages (Premium Cards)
 *
 * Displays the 5-45-45-5 payment schedule in clean, equal-width cards.
 * Mobile: 2x2 grid, Desktop: horizontal row.
 */

import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { CreditCard, Wallet, Factory, PackageCheck, Handshake } from 'lucide-react';
import { useSettings, useMainItems, useAdditionalItems } from '../store/quickQuotationStore';
import { formatCurrency, PAYMENT_STAGE_PERCENTAGES } from '../constants';
import { calculateAllTotals } from '../engine/calculations';
import { cn } from '@/lib/utils';

const stageIcons = {
  booking: Wallet,
  production: Factory,
  factory: PackageCheck,
  handover: Handshake,
};

const stageColors = {
  booking: 'from-blue-500 to-blue-600',
  production: 'from-indigo-500 to-indigo-600',
  factory: 'from-violet-500 to-violet-600',
  handover: 'from-emerald-500 to-emerald-600',
};

const stageBgColors = {
  booking: 'bg-blue-50 border-blue-200',
  production: 'bg-indigo-50 border-indigo-200',
  factory: 'bg-violet-50 border-violet-200',
  handover: 'bg-emerald-50 border-emerald-200',
};

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
    { key: 'booking', name: 'Booking', percent: PAYMENT_STAGE_PERCENTAGES.booking, amount: totals.paymentStages.booking },
    { key: 'production', name: 'Production', percent: PAYMENT_STAGE_PERCENTAGES.production, amount: totals.paymentStages.production },
    { key: 'factory', name: 'Factory', percent: PAYMENT_STAGE_PERCENTAGES.factory, amount: totals.paymentStages.factory },
    { key: 'handover', name: 'Handover', percent: PAYMENT_STAGE_PERCENTAGES.handover, amount: totals.paymentStages.handover },
  ] as const;

  return (
    <Card className="border-slate-200">
      <CardContent className="p-3 sm:p-4">
        {/* Header */}
        <div className="flex items-center gap-2 mb-3 sm:mb-4">
          <div className="w-8 h-8 sm:w-9 sm:h-9 bg-gradient-to-br from-slate-600 to-slate-700 rounded-lg flex items-center justify-center">
            <CreditCard className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-semibold text-slate-800">Payment Schedule</h3>
            <p className="text-[10px] sm:text-xs text-slate-500">5% - 45% - 45% - 5% structure</p>
          </div>
        </div>

        {/* Payment Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          {stages.map((stage) => {
            const Icon = stageIcons[stage.key];
            return (
              <div
                key={stage.key}
                className={cn(
                  "relative overflow-hidden rounded-xl border p-3 sm:p-4 transition-all hover:shadow-md",
                  stageBgColors[stage.key]
                )}
              >
                {/* Percentage badge */}
                <div className={cn(
                  "absolute top-2 right-2 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br flex items-center justify-center",
                  stageColors[stage.key]
                )}>
                  <span className="text-white font-bold text-xs sm:text-sm">{stage.percent}%</span>
                </div>

                {/* Icon */}
                <div className="mb-2">
                  <Icon className="h-5 w-5 sm:h-6 sm:w-6 text-slate-600" />
                </div>

                {/* Stage name */}
                <div className="text-[10px] sm:text-xs text-slate-500 uppercase tracking-wide font-medium mb-1">
                  {stage.name}
                </div>

                {/* Amount */}
                <div className="text-base sm:text-lg font-bold text-slate-800">
                  ₹{formatCurrency(stage.amount)}
                </div>
              </div>
            );
          })}
        </div>

        {/* Total confirmation */}
        <div className="mt-3 sm:mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-xs sm:text-sm">
          <span className="text-slate-500">Total of all stages</span>
          <span className="font-semibold text-slate-800">₹{formatCurrency(totals.grandTotal)}</span>
        </div>
      </CardContent>
    </Card>
  );
}
