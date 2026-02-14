/**
 * Quick Quotation Module - Payment Stages (Premium Cards)
 *
 * Displays the 5-45-45-5 payment schedule in clean, equal-width cards.
 * Mobile: 2x2 grid with proper spacing, Desktop: horizontal row.
 */

import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { CreditCard, Wallet, Factory, PackageCheck, Handshake, ChevronRight } from 'lucide-react';
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
  booking: {
    gradient: 'from-blue-500 to-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-600',
    badge: 'bg-blue-500',
  },
  production: {
    gradient: 'from-indigo-500 to-indigo-600',
    bg: 'bg-indigo-50',
    border: 'border-indigo-200',
    text: 'text-indigo-600',
    badge: 'bg-indigo-500',
  },
  factory: {
    gradient: 'from-violet-500 to-violet-600',
    bg: 'bg-violet-50',
    border: 'border-violet-200',
    text: 'text-violet-600',
    badge: 'bg-violet-500',
  },
  handover: {
    gradient: 'from-emerald-500 to-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    text: 'text-emerald-600',
    badge: 'bg-emerald-500',
  },
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
    <Card className="border-slate-200 shadow-md">
      <CardContent className="p-4 sm:p-5">
        {/* Header - cleaner design */}
        <div className="flex items-center gap-3 mb-4 sm:mb-5">
          <div className="w-10 h-10 sm:w-11 sm:h-11 bg-gradient-to-br from-slate-700 to-slate-800 rounded-xl flex items-center justify-center shadow-sm">
            <CreditCard className="h-5 w-5 sm:h-5 sm:w-5 text-white" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-800">Payment Schedule</h3>
            <p className="text-xs sm:text-sm text-slate-500 font-medium">5% → 45% → 45% → 5%</p>
          </div>
        </div>

        {/* Payment Cards Grid - improved spacing */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          {stages.map((stage, index) => {
            const Icon = stageIcons[stage.key];
            const colors = stageColors[stage.key];
            return (
              <div
                key={stage.key}
                className={cn(
                  "relative overflow-hidden rounded-2xl border-2 p-4 sm:p-5 transition-all duration-200",
                  "hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]",
                  colors.bg,
                  colors.border
                )}
              >
                {/* Percentage badge - top right */}
                <div className={cn(
                  "absolute -top-1 -right-1 w-12 h-12 sm:w-14 sm:h-14 rounded-bl-2xl flex items-end justify-start pb-1.5 pl-1.5",
                  colors.badge
                )}>
                  <span className="text-white font-black text-sm sm:text-base">{stage.percent}%</span>
                </div>

                {/* Icon */}
                <div className="mb-3">
                  <div className={cn(
                    "w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center",
                    "bg-white/80 shadow-sm border",
                    colors.border
                  )}>
                    <Icon className={cn("h-5 w-5 sm:h-5 sm:w-5", colors.text)} />
                  </div>
                </div>

                {/* Stage name */}
                <div className={cn(
                  "text-xs sm:text-sm uppercase tracking-wide font-semibold mb-1",
                  colors.text
                )}>
                  {stage.name}
                </div>

                {/* Amount */}
                <div className="text-lg sm:text-xl font-black text-slate-800">
                  ₹{formatCurrency(stage.amount)}
                </div>

                {/* Arrow indicator between cards (desktop only) */}
                {index < 3 && (
                  <div className="hidden sm:flex absolute -right-4 top-1/2 -translate-y-1/2 z-10">
                    <ChevronRight className="h-5 w-5 text-slate-300" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Total confirmation - premium style */}
        <div className="mt-4 sm:mt-5 pt-4 border-t-2 border-dashed border-slate-200 flex items-center justify-between">
          <span className="text-sm sm:text-base text-slate-500 font-medium">Total of all stages</span>
          <span className="text-lg sm:text-xl font-black text-slate-800">₹{formatCurrency(totals.grandTotal)}</span>
        </div>
      </CardContent>
    </Card>
  );
}
