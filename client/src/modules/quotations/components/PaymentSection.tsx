/**
 * Payment Section - Complete payment management UI
 * Includes: Progress bar, payment history table, receipt actions
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Plus,
  X,
  Download,
  Share2,
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

  // Handle receipt download
  const handleDownloadReceipt = (payment: PaymentEntry) => {
    generatePaymentReceipt(quotation, payment);
  };

  // Handle WhatsApp share
  const handleWhatsAppShare = (payment: PaymentEntry) => {
    const message = encodeURIComponent(
      `Payment Receipt\n\n` +
      `Receipt No: ${payment.receiptNumber || payment.id}\n` +
      `Amount: ₹${payment.amount.toLocaleString('en-IN')}\n` +
      `Date: ${payment.date}\n` +
      `Method: ${payment.method.toUpperCase()}\n` +
      (payment.reference ? `Ref: ${payment.reference}\n` : '') +
      `\nThank you for your payment!`
    );
    const phone = clientMobile?.replace(/[^0-9]/g, '') || '';
    const url = phone
      ? `https://wa.me/91${phone}?text=${message}`
      : `https://wa.me/?text=${message}`;
    window.open(url, '_blank');
  };

  // Handle send reminder
  const handleSendReminder = () => {
    const message = encodeURIComponent(
      `Payment Reminder\n\n` +
      `Dear ${clientName},\n\n` +
      `This is a gentle reminder for your pending payment.\n\n` +
      `Total Amount: ₹${finalTotal.toLocaleString('en-IN')}\n` +
      `Paid: ₹${totalPaid.toLocaleString('en-IN')}\n` +
      `Pending: ₹${pendingAmount.toLocaleString('en-IN')}\n\n` +
      `Please make the payment at your earliest convenience.\n\n` +
      `Thank you!`
    );
    const phone = clientMobile?.replace(/[^0-9]/g, '') || '';
    const url = phone
      ? `https://wa.me/91${phone}?text=${message}`
      : `https://wa.me/?text=${message}`;
    window.open(url, '_blank');
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* Header with Progress */}
      <div className="px-4 py-3 bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-100">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
            <Receipt className="h-4 w-4 text-emerald-600" />
            Payment Summary
          </h3>
          <Button
            onClick={() => setShowPaymentDialog(true)}
            size="sm"
            className="h-8 bg-emerald-600 hover:bg-emerald-700"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add Payment
          </Button>
        </div>

        {/* Amount Summary */}
        <div className="grid grid-cols-3 gap-4 mb-3">
          <div>
            <p className="text-[10px] text-slate-500">Total</p>
            <p className="text-base font-bold text-slate-800">₹{finalTotal.toLocaleString('en-IN')}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-500">Received</p>
            <p className="text-base font-bold text-emerald-600">₹{totalPaid.toLocaleString('en-IN')}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-500">Pending</p>
            <p className={cn('text-base font-bold', isFullyPaid ? 'text-emerald-600' : 'text-amber-600')}>
              ₹{Math.max(0, pendingAmount).toLocaleString('en-IN')}
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="relative">
          <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-500',
                isFullyPaid ? 'bg-emerald-500' : 'bg-gradient-to-r from-emerald-400 to-teal-500'
              )}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-[10px] text-slate-500">{progressPercent.toFixed(0)}% Paid</span>
            {isFullyPaid ? (
              <span className="text-[10px] text-emerald-600 font-medium flex items-center gap-1">
                <Check className="h-3 w-3" />
                Fully Paid
              </span>
            ) : (
              <button
                onClick={handleSendReminder}
                className="text-[10px] text-amber-600 font-medium flex items-center gap-1 hover:text-amber-700"
              >
                <Bell className="h-3 w-3" />
                Send Reminder
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Payment History */}
      <div className="p-4">
        <h4 className="text-xs font-medium text-slate-600 mb-2">
          Payment History ({payments.length})
        </h4>

        {payments.length === 0 ? (
          <div className="text-center py-6 text-slate-400">
            <Receipt className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No payments recorded yet</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {[...payments].reverse().map((payment) => {
              const MethodIcon = METHOD_ICONS[payment.method || 'cash'];
              const methodColor = METHOD_COLORS[payment.method || 'cash'];

              return (
                <div
                  key={payment.id}
                  className="flex items-center justify-between bg-slate-50 rounded-lg p-3 group hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {/* Method Icon */}
                    <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center', methodColor)}>
                      <MethodIcon className="h-4 w-4" />
                    </div>

                    {/* Details */}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-800">
                          ₹{payment.amount.toLocaleString('en-IN')}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-600 capitalize">
                          {payment.method || 'cash'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500">
                        <span>{payment.date}</span>
                        {payment.reference && (
                          <>
                            <span>•</span>
                            <span className="font-mono">{payment.reference}</span>
                          </>
                        )}
                        {payment.note && (
                          <>
                            <span>•</span>
                            <span className="truncate max-w-24">{payment.note}</span>
                          </>
                        )}
                      </div>
                      {payment.receiptNumber && (
                        <span className="text-[9px] text-slate-400 font-mono">
                          {payment.receiptNumber}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleDownloadReceipt(payment)}
                      className="h-7 w-7 rounded-lg hover:bg-emerald-100 flex items-center justify-center text-slate-400 hover:text-emerald-600 transition-colors"
                      title="Download Receipt"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleWhatsAppShare(payment)}
                      className="h-7 w-7 rounded-lg hover:bg-green-100 flex items-center justify-center text-slate-400 hover:text-green-600 transition-colors"
                      title="Share on WhatsApp"
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => onRemovePayment(payment.id)}
                      className="h-7 w-7 rounded-lg hover:bg-red-100 flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors"
                      title="Delete"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Payment Dialog */}
      <PaymentDialog
        open={showPaymentDialog}
        onOpenChange={setShowPaymentDialog}
        onSubmit={onAddPayment}
        pendingAmount={pendingAmount}
        clientName={clientName}
      />
    </div>
  );
}
