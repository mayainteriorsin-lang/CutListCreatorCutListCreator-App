/**
 * Quick Quotation Module - Summary Panel (Premium Design)
 *
 * Displays totals, discount, GST, and grand total with premium styling.
 * Mobile-optimized with large tap targets and clear visual hierarchy.
 * Single column layout on mobile, 3-column on desktop.
 */

import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Percent, IndianRupee, Sparkles, TrendingDown, Receipt, Wallet } from 'lucide-react';
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
    <Card className="overflow-hidden border-0 shadow-xl">
      <CardContent className="p-0">
        {/* Top: Subtotals bar - cleaner layout */}
        <div className="bg-gradient-to-r from-slate-700 to-slate-800 px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-center gap-4 sm:gap-8 text-white">
            <div className="text-center">
              <div className="text-[10px] sm:text-xs text-white/50 uppercase tracking-wider font-medium mb-0.5">Main</div>
              <div className="font-bold text-sm sm:text-lg">₹{formatCurrency(totals.mainTotal)}</div>
            </div>
            <div className="text-white/30 text-xl sm:text-2xl font-light">+</div>
            <div className="text-center">
              <div className="text-[10px] sm:text-xs text-white/50 uppercase tracking-wider font-medium mb-0.5">Additional</div>
              <div className="font-bold text-sm sm:text-lg">₹{formatCurrency(totals.additionalTotal)}</div>
            </div>
            <div className="text-white/30 text-xl sm:text-2xl font-light">=</div>
            <div className="text-center">
              <div className="text-[10px] sm:text-xs text-emerald-400/80 uppercase tracking-wider font-medium mb-0.5">Subtotal</div>
              <div className="font-bold text-sm sm:text-lg text-emerald-400">₹{formatCurrency(totals.subtotal)}</div>
            </div>
          </div>
        </div>

        {/* Middle: Controls - Single column on mobile, 3-column on desktop */}
        <div className="bg-slate-800 px-4 sm:px-6 py-4 sm:py-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            {/* Discount */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
                  <TrendingDown className="h-4 w-4 text-red-400" />
                </div>
                <label className="text-xs sm:text-sm text-white/70 uppercase tracking-wide font-medium">
                  Discount
                </label>
              </div>
              <div className="flex items-center gap-2">
                <Select
                  value={settings.discountType}
                  onValueChange={(value) => setDiscountType(value as DiscountType)}
                >
                  <SelectTrigger className="w-14 sm:w-16 h-12 sm:h-11 text-sm bg-white/10 border-white/20 text-white hover:bg-white/15 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="amount">
                      <IndianRupee className="h-4 w-4" />
                    </SelectItem>
                    <SelectItem value="percent">
                      <Percent className="h-4 w-4" />
                    </SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  inputMode="decimal"
                  value={settings.discountValue || ''}
                  onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                  className="flex-1 h-12 sm:h-11 text-base sm:text-sm bg-white/10 border-white/20 text-white placeholder:text-white/30 text-center rounded-xl font-medium"
                  placeholder="0"
                />
              </div>
              {totals.discountAmount > 0 && (
                <div className="text-sm text-red-400 font-semibold flex items-center gap-1 pl-1">
                  <span>-₹{formatCurrency(totals.discountAmount)}</span>
                </div>
              )}
            </div>

            {/* GST */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <Receipt className="h-4 w-4 text-green-400" />
                </div>
                <label className="text-xs sm:text-sm text-white/70 uppercase tracking-wide font-medium">
                  GST
                </label>
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between bg-white/10 rounded-xl px-4 h-12 sm:h-11">
                  <span className="text-sm text-white/80">Enable GST</span>
                  <Switch
                    checked={settings.gstEnabled}
                    onCheckedChange={setGstEnabled}
                    className="data-[state=checked]:bg-green-500 scale-110"
                  />
                </div>
                {settings.gstEnabled && (
                  <Select
                    value={settings.gstRate.toString()}
                    onValueChange={(value) => setGstRate(parseInt(value) as GstRate)}
                  >
                    <SelectTrigger className="h-12 sm:h-11 text-base sm:text-sm bg-white/10 border-white/20 text-white rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {GST_RATES.map(rate => (
                        <SelectItem key={rate} value={rate.toString()}>
                          {rate}% GST
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              {settings.gstEnabled && totals.gstAmount > 0 && (
                <div className="text-sm text-green-400 font-semibold flex items-center gap-1 pl-1">
                  <span>+₹{formatCurrency(totals.gstAmount)}</span>
                </div>
              )}
            </div>

            {/* Paid Amount */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <Wallet className="h-4 w-4 text-blue-400" />
                </div>
                <label className="text-xs sm:text-sm text-white/70 uppercase tracking-wide font-medium">
                  Paid Amount
                </label>
              </div>
              <Input
                type="number"
                inputMode="decimal"
                value={settings.paidAmount || ''}
                onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)}
                className="h-12 sm:h-11 text-base sm:text-sm bg-white/10 border-white/20 text-white placeholder:text-white/30 text-center rounded-xl font-medium"
                placeholder="₹0"
              />
              {totals.balanceAmount > 0 && (
                <div className="text-sm text-orange-400 font-semibold flex items-center gap-1 pl-1">
                  <span>Balance: ₹{formatCurrency(totals.balanceAmount)}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom: Grand Total - Premium highlight with glass effect */}
        <div className="relative overflow-hidden">
          {/* Background gradient */}
          <div className="absolute inset-0 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500" />
          {/* Animated shimmer effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />

          <div className="relative px-5 sm:px-8 py-5 sm:py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-amber-900/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                  <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-amber-900" />
                </div>
                <div>
                  <span className="text-sm sm:text-base font-bold text-amber-900/90 uppercase tracking-wide">
                    Grand Total
                  </span>
                  {totals.balanceAmount > 0 && totals.balanceAmount !== totals.grandTotal && (
                    <div className="text-xs sm:text-sm text-amber-800/70 font-medium">
                      Due: ₹{formatCurrency(totals.balanceAmount)}
                    </div>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl sm:text-4xl font-black text-amber-900 tracking-tight">
                  ₹{formatCurrency(totals.grandTotal)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
