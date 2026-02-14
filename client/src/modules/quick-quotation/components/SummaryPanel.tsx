/**
 * Quick Quotation Module - Summary Panel (Premium Design)
 *
 * Displays totals, discount, GST, and grand total with premium styling.
 * Mobile-optimized with large tap targets and clear visual hierarchy.
 */

import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Percent, IndianRupee, Sparkles } from 'lucide-react';
import { useSettings, useQuickQuotationStore, useMainItems, useAdditionalItems } from '../store/quickQuotationStore';
import { formatCurrency, GST_RATES } from '../constants';
import { calculateAllTotals } from '../engine/calculations';
import type { DiscountType, GstRate } from '../types';
import { cn } from '@/lib/utils';

export function SummaryPanel() {
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

  const setDiscountType = useQuickQuotationStore(state => state.setDiscountType);
  const setDiscountValue = useQuickQuotationStore(state => state.setDiscountValue);
  const setGstEnabled = useQuickQuotationStore(state => state.setGstEnabled);
  const setGstRate = useQuickQuotationStore(state => state.setGstRate);
  const setPaidAmount = useQuickQuotationStore(state => state.setPaidAmount);

  return (
    <Card className="overflow-hidden border-0 shadow-lg">
      {/* Main dark section */}
      <CardContent className="p-0">
        {/* Top: Subtotals bar */}
        <div className="bg-slate-700 px-3 sm:px-4 py-2.5 sm:py-3">
          <div className="flex items-center justify-center gap-3 sm:gap-6 text-white">
            <div className="text-center">
              <div className="text-[10px] sm:text-xs text-white/60 uppercase tracking-wide">Main</div>
              <div className="font-semibold text-sm sm:text-base">₹{formatCurrency(totals.mainTotal)}</div>
            </div>
            <div className="text-white/40 text-lg">+</div>
            <div className="text-center">
              <div className="text-[10px] sm:text-xs text-white/60 uppercase tracking-wide">Additional</div>
              <div className="font-semibold text-sm sm:text-base">₹{formatCurrency(totals.additionalTotal)}</div>
            </div>
            <div className="text-white/40 text-lg">=</div>
            <div className="text-center">
              <div className="text-[10px] sm:text-xs text-white/60 uppercase tracking-wide">Subtotal</div>
              <div className="font-bold text-sm sm:text-base text-white">₹{formatCurrency(totals.subtotal)}</div>
            </div>
          </div>
        </div>

        {/* Middle: Controls */}
        <div className="bg-slate-800 px-3 sm:px-4 py-3 sm:py-4">
          <div className="grid grid-cols-3 gap-3 sm:gap-4">
            {/* Discount */}
            <div className="space-y-1.5">
              <label className="text-[10px] sm:text-xs text-white/50 uppercase tracking-wide font-medium">
                Discount
              </label>
              <div className="flex items-center gap-1.5">
                <Select
                  value={settings.discountType}
                  onValueChange={(value) => setDiscountType(value as DiscountType)}
                >
                  <SelectTrigger className="w-12 sm:w-14 h-10 sm:h-11 text-xs bg-white/10 border-white/20 text-white hover:bg-white/15">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="amount">
                      <IndianRupee className="h-3.5 w-3.5" />
                    </SelectItem>
                    <SelectItem value="percent">
                      <Percent className="h-3.5 w-3.5" />
                    </SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  value={settings.discountValue || ''}
                  onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                  className="flex-1 h-10 sm:h-11 text-sm bg-white/10 border-white/20 text-white placeholder:text-white/40 text-center"
                  placeholder="0"
                />
              </div>
              {totals.discountAmount > 0 && (
                <div className="text-xs text-red-400 font-medium">
                  -₹{formatCurrency(totals.discountAmount)}
                </div>
              )}
            </div>

            {/* GST */}
            <div className="space-y-1.5">
              <label className="text-[10px] sm:text-xs text-white/50 uppercase tracking-wide font-medium">
                GST
              </label>
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between bg-white/10 rounded-lg px-3 h-10 sm:h-11">
                  <span className="text-xs text-white/70">Enable</span>
                  <Switch
                    checked={settings.gstEnabled}
                    onCheckedChange={setGstEnabled}
                    className="data-[state=checked]:bg-green-500"
                  />
                </div>
                {settings.gstEnabled && (
                  <Select
                    value={settings.gstRate.toString()}
                    onValueChange={(value) => setGstRate(parseInt(value) as GstRate)}
                  >
                    <SelectTrigger className="h-10 sm:h-11 text-sm bg-white/10 border-white/20 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {GST_RATES.map(rate => (
                        <SelectItem key={rate} value={rate.toString()}>
                          {rate}%
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              {settings.gstEnabled && totals.gstAmount > 0 && (
                <div className="text-xs text-green-400 font-medium">
                  +₹{formatCurrency(totals.gstAmount)}
                </div>
              )}
            </div>

            {/* Paid Amount */}
            <div className="space-y-1.5">
              <label className="text-[10px] sm:text-xs text-white/50 uppercase tracking-wide font-medium">
                Paid
              </label>
              <Input
                type="number"
                value={settings.paidAmount || ''}
                onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)}
                className="h-10 sm:h-11 text-sm bg-white/10 border-white/20 text-white placeholder:text-white/40 text-center"
                placeholder="₹0"
              />
              {totals.balanceAmount > 0 && (
                <div className="text-xs text-orange-400 font-medium">
                  Balance: ₹{formatCurrency(totals.balanceAmount)}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom: Grand Total - Premium highlight */}
        <div className="bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500 px-4 sm:px-6 py-4 sm:py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-amber-900/70" />
              <span className="text-sm sm:text-base font-semibold text-amber-900/80 uppercase tracking-wide">
                Grand Total
              </span>
            </div>
            <div className="text-right">
              <div className="text-2xl sm:text-3xl font-bold text-amber-900">
                ₹{formatCurrency(totals.grandTotal)}
              </div>
              {totals.balanceAmount > 0 && totals.balanceAmount !== totals.grandTotal && (
                <div className="text-xs sm:text-sm text-amber-800/80 font-medium mt-0.5">
                  Due: ₹{formatCurrency(totals.balanceAmount)}
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
