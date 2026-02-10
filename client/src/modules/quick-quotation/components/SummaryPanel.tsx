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
      <CardContent className="p-3">
        <div className="flex items-center gap-4 flex-wrap">
          {/* Totals */}
          <div className="flex items-center gap-3 text-sm">
            <div className="text-center px-2">
              <div className="text-[10px] text-white/50 uppercase">Main</div>
              <div className="font-semibold">₹{formatCurrency(totals.mainTotal)}</div>
            </div>
            <div className="text-white/30">+</div>
            <div className="text-center px-2">
              <div className="text-[10px] text-white/50 uppercase">Additional</div>
              <div className="font-semibold">₹{formatCurrency(totals.additionalTotal)}</div>
            </div>
            <div className="text-white/30">=</div>
            <div className="text-center px-2">
              <div className="text-[10px] text-white/50 uppercase">Subtotal</div>
              <div className="font-semibold">₹{formatCurrency(totals.subtotal)}</div>
            </div>
          </div>

          <div className="w-px h-8 bg-white/20" />

          {/* Discount */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-white/50 uppercase">Disc</span>
            <Select
              value={settings.discountType}
              onValueChange={(value) => setDiscountType(value as DiscountType)}
            >
              <SelectTrigger className="w-14 h-7 text-xs bg-white/10 border-white/20 text-white px-1.5">
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
              className="w-20 h-7 text-xs bg-white/10 border-white/20 text-white placeholder:text-white/40"
              placeholder="0"
            />
            {totals.discountAmount > 0 && (
              <span className="text-xs text-red-300">-₹{formatCurrency(totals.discountAmount)}</span>
            )}
          </div>

          <div className="w-px h-8 bg-white/20" />

          {/* GST */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-white/50 uppercase">GST</span>
            <Switch
              checked={settings.gstEnabled}
              onCheckedChange={setGstEnabled}
              className="scale-75"
            />
            {settings.gstEnabled && (
              <>
                <Select
                  value={settings.gstRate.toString()}
                  onValueChange={(value) => setGstRate(parseInt(value) as GstRate)}
                >
                  <SelectTrigger className="w-16 h-7 text-xs bg-white/10 border-white/20 text-white px-1.5">
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
                <span className="text-xs text-green-300">+₹{formatCurrency(totals.gstAmount)}</span>
              </>
            )}
          </div>

          <div className="w-px h-8 bg-white/20" />

          {/* Grand Total */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-white/50 uppercase">Total</span>
            <span className="text-xl font-bold text-amber-400">₹{formatCurrency(totals.grandTotal)}</span>
          </div>

          <div className="w-px h-8 bg-white/20" />

          {/* Paid Amount */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-white/50 uppercase">Paid</span>
            <Input
              type="number"
              value={settings.paidAmount || ''}
              onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)}
              className="w-24 h-7 text-xs bg-white/10 border-white/20 text-white placeholder:text-white/40"
              placeholder="0"
            />
            {totals.balanceAmount > 0 && (
              <span className="text-xs text-red-300">Bal: ₹{formatCurrency(totals.balanceAmount)}</span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
