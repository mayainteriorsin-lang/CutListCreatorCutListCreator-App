/**
 * Payment Section - Compact payment management UI
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Plus,
  X,
  Download,
  Clock,
  Check,
  Banknote,
  Smartphone,
  Building2,
  FileCheck,
  CreditCard,
  Receipt,
  MessageCircle,
  Bell,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PaymentEntry, PaymentMethod, Quotation } from '../types';
import { PaymentDialog } from './PaymentDialog';
import { generatePaymentReceipt } from './receiptGenerator';

interface PaymentSectionProps {
  quotation: Quotation;
  onAddPayment: (data: {
    amount: number;
    method: PaymentMethod;
    reference?: string;
    note?: string;
    date?: string;
  }) => void;
  onRemovePayment: (paymentId: string) => void;
}

const METHOD_ICONS: Record<PaymentMethod, typeof Banknote> = {
  cash: Banknote,
  upi: Smartphone,
  bank: Building2,
  cheque: FileCheck,
  card: CreditCard,
};

const METHOD_COLORS: Record<PaymentMethod, string> = {
  cash: 'text-emerald-600 bg-emerald-50',
  upi: 'text-purple-600 bg-purple-50',
  bank: 'text-blue-600 bg-blue-50',
  cheque: 'text-amber-600 bg-amber-50',
  card: 'text-slate-600 bg-slate-50',
};

export function PaymentSection({
  quotation,
  onAddPayment,
  onRemovePayment,
}: PaymentSectionProps) {
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);

  const { finalTotal, totalPaid, pendingAmount, payments, clientName, clientMobile } = quotation;
  const progressPercent = finalTotal > 0 ? Math.min(100, (totalPaid / finalTotal) * 100) : 0;
  const isFullyPaid = pendingAmount <= 0;

  const handleDownloadReceipt = (payment: PaymentEntry) => {
    generatePaymentReceipt(quotation, payment);
  };

  const handleWhatsAppShare = (payment: PaymentEntry) => {
    const message = encodeURIComponent(
      `Payment Receipt\n` +
      `Receipt: ${payment.receiptNumber || payment.id}\n` +
      `Amount: ₹${payment.amount.toLocaleString('en-IN')}\n` +
      `Date: ${payment.date}\n` +
      `Method: ${payment.method.toUpperCase()}\n` +
      (payment.reference ? `Ref: ${payment.reference}\n` : '') +
      `\nThank you!`
    );
    const phone = clientMobile?.replace(/[^0-9]/g, '') || '';
    const url = phone ? `https://wa.me/91${phone}?text=${message}` : `https://wa.me/?text=${message}`;
    window.open(url, '_blank');
  };

  const handleSendReminder = () => {
    const message = encodeURIComponent(
      `Payment Reminder\n\nDear ${clientName},\n` +
      `Total: ₹${finalTotal.toLocaleString('en-IN')}\n` +
      `Paid: ₹${totalPaid.toLocaleString('en-IN')}\n` +
      `Pending: ₹${pendingAmount.toLocaleString('en-IN')}\n\n` +
      `Please make the payment at your earliest.\nThank you!`
    );
    const phone = clientMobile?.replace(/[^0-9]/g, '') || '';
    const url = phone ? `https://wa.me/91${phone}?text=${message}` : `https://wa.me/?text=${message}`;
    window.open(url, '_blank');
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* Header with Summary & Progress */}
      <div className="px-3 py-2 bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-100">
        {/* Summary Row */}
        <div className="flex items-center gap-4 mb-2">
          <div className="flex items-center gap-4 flex-1">
            <div>
              <span className="text-[9px] text-slate-500 block">Total</span>
              <p className="text-sm font-bold text-slate-800">₹{finalTotal.toLocaleString('en-IN')}</p>
            </div>
            <div>
              <span className="text-[9px] text-slate-500 block">Paid</span>
              <p className="text-sm font-bold text-emerald-600">₹{totalPaid.toLocaleString('en-IN')}</p>
            </div>
            <div>
              <span className="text-[9px] text-slate-500 block">Due</span>
              <p className={cn('text-sm font-bold', pendingAmount > 0 ? 'text-amber-600' : 'text-emerald-600')}>
                ₹{Math.max(0, pendingAmount).toLocaleString('en-IN')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isFullyPaid && (
              <button onClick={handleSendReminder} className="text-[10px] text-amber-600 hover:text-amber-700 flex items-center gap-0.5">
                <Bell className="h-3 w-3" />Remind
              </button>
            )}
            <Button onClick={() => setShowPaymentDialog(true)} size="sm" className="h-7 text-xs px-3 bg-emerald-600 hover:bg-emerald-700">
              <Plus className="h-3.5 w-3.5 mr-1" />Payment
            </Button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
          <div className={cn('h-full rounded-full transition-all', isFullyPaid ? 'bg-emerald-500' : 'bg-gradient-to-r from-emerald-400 to-teal-500')}
            style={{ width: `${progressPercent}%` }} />
        </div>
        <div className="flex justify-between mt-0.5">
          <span className="text-[9px] text-slate-500">{progressPercent.toFixed(0)}% paid</span>
          {isFullyPaid && <span className="text-[9px] text-emerald-600 font-medium flex items-center gap-0.5"><Check className="h-2.5 w-2.5" />Fully Paid</span>}
        </div>
      </div>

      {/* Payment History */}
      <div className="p-2">
        {payments.length === 0 ? (
          <div className="text-center py-3 text-slate-400">
            <Receipt className="h-6 w-6 mx-auto mb-1 opacity-50" />
            <p className="text-[10px]">No payments yet</p>
          </div>
        ) : (
          <div className="space-y-1 max-h-28 overflow-y-auto">
            {[...payments].reverse().map((payment) => {
              const MethodIcon = METHOD_ICONS[payment.method || 'cash'];
              const methodColor = METHOD_COLORS[payment.method || 'cash'];
              return (
                <div key={payment.id} className="flex items-center justify-between bg-slate-50 rounded-lg px-2 py-1.5 group hover:bg-slate-100">
                  <div className="flex items-center gap-2">
                    <div className={cn('h-6 w-6 rounded flex items-center justify-center', methodColor)}>
                      <MethodIcon className="h-3 w-3" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-slate-800">₹{payment.amount.toLocaleString('en-IN')}</span>
                        <span className="text-[8px] px-1 py-0.5 rounded bg-slate-200 text-slate-500 capitalize">{payment.method || 'cash'}</span>
                      </div>
                      <span className="text-[9px] text-slate-400">{payment.date}</span>
                    </div>
                  </div>
                  <div className="flex gap-0.5 opacity-0 group-hover:opacity-100">
                    <button onClick={() => handleDownloadReceipt(payment)} className="h-5 w-5 rounded hover:bg-emerald-100 flex items-center justify-center text-slate-400 hover:text-emerald-600">
                      <Download className="h-2.5 w-2.5" />
                    </button>
                    <button onClick={() => handleWhatsAppShare(payment)} className="h-5 w-5 rounded hover:bg-green-100 flex items-center justify-center text-slate-400 hover:text-green-600">
                      <MessageCircle className="h-2.5 w-2.5" />
                    </button>
                    <button onClick={() => onRemovePayment(payment.id)} className="h-5 w-5 rounded hover:bg-red-100 flex items-center justify-center text-slate-400 hover:text-red-500">
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <PaymentDialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog} onSubmit={onAddPayment} pendingAmount={pendingAmount} clientName={clientName} />
    </div>
  );
}
