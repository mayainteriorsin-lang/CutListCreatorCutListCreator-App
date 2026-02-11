/**
 * Quick Quotation Module - Summary Panel (Compact)
 *
 * Displays totals, discount, GST, and grand total in a compact layout.
 */

import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Percent, IndianRupee } from 'lucide-react';
import { useSettings, useQuickQuotationStore, useMainItems, useAdditionalItems } from '../store/quickQuotationStore';
import { formatCurrency, GST_RATES } from '../constants';
import { calculateAllTotals } from '../engine/calculations';
import type { DiscountType, GstRate } from '../types';

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
    <Card className="bg-gradient-to-r from-slate-700 to-slate-800 text-white">
      <CardContent className="p-2 sm:p-3">
        {/* Mobile: Grid layout, Desktop: Flex row */}
        <div className="grid grid-cols-3 sm:flex sm:items-center gap-2 sm:gap-4 sm:flex-wrap">
          {/* Totals - spans full width on mobile */}
          <div className="col-span-3 flex items-center justify-center sm:justify-start gap-2 sm:gap-3 text-xs sm:text-sm pb-2 sm:pb-0 border-b sm:border-b-0 border-white/10">
            <div className="text-center px-1 sm:px-2">
              <div className="text-[8px] sm:text-[10px] text-white/50 uppercase">Main</div>
              <div className="font-semibold text-[11px] sm:text-sm">₹{formatCurrency(totals.mainTotal)}</div>
            </div>
            <div className="text-white/30 text-xs">+</div>
            <div className="text-center px-1 sm:px-2">
              <div className="text-[8px] sm:text-[10px] text-white/50 uppercase">Add'l</div>
              <div className="font-semibold text-[11px] sm:text-sm">₹{formatCurrency(totals.additionalTotal)}</div>
            </div>
            <div className="text-white/30 text-xs">=</div>
            <div className="text-center px-1 sm:px-2">
              <div className="text-[8px] sm:text-[10px] text-white/50 uppercase">Subtotal</div>
              <div className="font-semibold text-[11px] sm:text-sm">₹{formatCurrency(totals.subtotal)}</div>
            </div>
          </div>

          <div className="hidden sm:block w-px h-8 bg-white/20" />

          {/* Discount */}
          <div className="flex items-center gap-1 sm:gap-1.5">
            <span className="text-[8px] sm:text-[10px] text-white/50 uppercase">Disc</span>
            <Select
              value={settings.discountType}
              onValueChange={(value) => setDiscountType(value as DiscountType)}
            >
              <SelectTrigger className="w-10 sm:w-14 h-6 sm:h-7 text-[10px] sm:text-xs bg-white/10 border-white/20 text-white px-1 sm:px-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="amount">
                  <IndianRupee className="h-3 w-3 inline" />
                </SelectItem>
                <SelectItem value="percent">
                  <Percent className="h-3 w-3 inline" />
                </SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="number"
              value={settings.discountValue || ''}
              onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
              className="w-14 sm:w-20 h-6 sm:h-7 text-[10px] sm:text-xs bg-white/10 border-white/20 text-white placeholder:text-white/40"
              placeholder="0"
            />
            {totals.discountAmount > 0 && (
              <span className="text-[10px] sm:text-xs text-red-300 hidden xs:inline">-₹{formatCurrency(totals.discountAmount)}</span>
            )}
          </div>

          {/* GST */}
          <div className="flex items-center gap-1 sm:gap-1.5">
            <span className="text-[8px] sm:text-[10px] text-white/50 uppercase">GST</span>
            <Switch
              checked={settings.gstEnabled}
              onCheckedChange={setGstEnabled}
              className="scale-[0.65] sm:scale-75"
            />
            {settings.gstEnabled && (
              <>
                <Select
                  value={settings.gstRate.toString()}
                  onValueChange={(value) => setGstRate(parseInt(value) as GstRate)}
                >
                  <SelectTrigger className="w-12 sm:w-16 h-6 sm:h-7 text-[10px] sm:text-xs bg-white/10 border-white/20 text-white px-1 sm:px-1.5">
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
                <span className="text-[10px] sm:text-xs text-green-300 hidden xs:inline">+₹{formatCurrency(totals.gstAmount)}</span>
              </>
            )}
          </div>

          {/* Paid Amount */}
          <div className="flex items-center gap-1 sm:gap-1.5">
            <span className="text-[8px] sm:text-[10px] text-white/50 uppercase">Paid</span>
            <Input
              type="number"
              value={settings.paidAmount || ''}
              onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)}
              className="w-16 sm:w-24 h-6 sm:h-7 text-[10px] sm:text-xs bg-white/10 border-white/20 text-white placeholder:text-white/40"
              placeholder="0"
            />
          </div>

          {/* Grand Total - full width row on mobile */}
          <div className="col-span-3 flex items-center justify-between sm:justify-start gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/10">
            <div className="hidden sm:block w-px h-8 bg-white/20 mr-2" />
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-white/50 uppercase">Total</span>
              <span className="text-lg sm:text-xl font-bold text-amber-400">₹{formatCurrency(totals.grandTotal)}</span>
            </div>
            {totals.balanceAmount > 0 && (
              <span className="text-[10px] sm:text-xs text-red-300">Bal: ₹{formatCurrency(totals.balanceAmount)}</span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
