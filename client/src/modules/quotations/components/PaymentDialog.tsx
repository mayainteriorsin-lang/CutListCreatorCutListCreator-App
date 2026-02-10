/**
 * Payment Dialog - Full form for adding payments with method, reference, etc.
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Banknote,
  Smartphone,
  Building2,
  FileCheck,
  CreditCard,
  IndianRupee,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PaymentMethod } from '../types';

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    amount: number;
    method: PaymentMethod;
    reference?: string;
    note?: string;
    date?: string;
  }) => void;
  pendingAmount?: number;
  clientName?: string;
}

const PAYMENT_METHODS: { value: PaymentMethod; label: string; icon: typeof Banknote; color: string }[] = [
  { value: 'cash', label: 'Cash', icon: Banknote, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  { value: 'upi', label: 'UPI', icon: Smartphone, color: 'text-purple-600 bg-purple-50 border-purple-200' },
  { value: 'bank', label: 'Bank Transfer', icon: Building2, color: 'text-blue-600 bg-blue-50 border-blue-200' },
  { value: 'cheque', label: 'Cheque', icon: FileCheck, color: 'text-amber-600 bg-amber-50 border-amber-200' },
  { value: 'card', label: 'Card', icon: CreditCard, color: 'text-slate-600 bg-slate-50 border-slate-200' },
];

export function PaymentDialog({
  open,
  onOpenChange,
  onSubmit,
  pendingAmount = 0,
  clientName = '',
}: PaymentDialogProps) {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const handleSubmit = () => {
    const numAmount = Number(amount);
    if (numAmount <= 0) return;

    onSubmit({
      amount: numAmount,
      method,
      reference: reference.trim() || undefined,
      note: note.trim() || undefined,
      date,
    });

    // Reset form
    setAmount('');
    setMethod('cash');
    setReference('');
    setNote('');
    setDate(new Date().toISOString().split('T')[0]);
    onOpenChange(false);
  };

  const handleQuickAmount = (value: number) => {
    setAmount(String(value));
  };

  const selectedMethodConfig = PAYMENT_METHODS.find(m => m.value === method);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <IndianRupee className="h-5 w-5 text-emerald-600" />
            Add Payment
          </DialogTitle>
          {clientName && (
            <p className="text-sm text-slate-500">Client: {clientName}</p>
          )}
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Pending Amount Banner */}
          {pendingAmount > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center justify-between">
              <span className="text-sm text-amber-700">Pending Amount</span>
              <span className="text-lg font-bold text-amber-600">
                ₹{pendingAmount.toLocaleString('en-IN')}
              </span>
            </div>
          )}

          {/* Amount Input */}
          <div>
            <Label className="text-xs font-medium text-slate-600 mb-1.5 block">
              Amount (₹)
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">₹</span>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                className="pl-7 text-lg font-semibold h-12"
                autoFocus
              />
            </div>
            {/* Quick amount buttons */}
            <div className="flex gap-2 mt-2">
              {pendingAmount > 0 && (
                <button
                  type="button"
                  onClick={() => handleQuickAmount(pendingAmount)}
                  className="px-3 py-1.5 text-xs bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors"
                >
                  Full Amount
                </button>
              )}
              {[5000, 10000, 25000, 50000].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => handleQuickAmount(val)}
                  className="px-2 py-1.5 text-xs bg-slate-50 text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  {val >= 1000 ? `${val / 1000}K` : val}
                </button>
              ))}
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <Label className="text-xs font-medium text-slate-600 mb-1.5 block">
              Payment Method
            </Label>
            <div className="grid grid-cols-5 gap-2">
              {PAYMENT_METHODS.map((m) => {
                const Icon = m.icon;
                const isSelected = method === m.value;
                return (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setMethod(m.value)}
                    className={cn(
                      'flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition-all',
                      isSelected
                        ? m.color + ' border-current'
                        : 'border-slate-100 hover:border-slate-200 text-slate-400'
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="text-[10px] font-medium">{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date */}
          <div>
            <Label className="text-xs font-medium text-slate-600 mb-1.5 block">
              Payment Date
            </Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-10"
            />
          </div>

          {/* Reference (shown for non-cash) */}
          {method !== 'cash' && (
            <div>
              <Label className="text-xs font-medium text-slate-600 mb-1.5 block">
                {method === 'upi' ? 'UPI Transaction ID' :
                 method === 'bank' ? 'Transaction Reference' :
                 method === 'cheque' ? 'Cheque Number' :
                 'Transaction ID'}
              </Label>
              <Input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder={
                  method === 'upi' ? 'e.g., 123456789012' :
                  method === 'cheque' ? 'e.g., 000123' :
                  'Reference number'
                }
                className="h-10 font-mono"
              />
            </div>
          )}

          {/* Note */}
          <div>
            <Label className="text-xs font-medium text-slate-600 mb-1.5 block">
              Note (optional)
            </Label>
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g., Booking advance, Production payment..."
              className="h-10"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!amount || Number(amount) <= 0}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            <IndianRupee className="h-4 w-4 mr-1" />
            Add ₹{Number(amount || 0).toLocaleString('en-IN')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
