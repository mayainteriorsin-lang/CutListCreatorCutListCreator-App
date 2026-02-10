/**
 * Share Receipt Dialog - Shows after payment is added
 * Offers options to download PDF/Image, share on WhatsApp with image, or skip
 */

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Download,
  MessageCircle,
  CheckCircle2,
  Image,
  FileText,
  Loader2,
} from 'lucide-react';
import type { Quotation, PaymentEntry } from '../types';
import { generatePaymentReceipt } from './receiptGenerator';
import { shareReceiptOnWhatsApp, downloadReceiptImage } from './receiptImageGenerator';

interface ShareReceiptDialogProps {
  open: boolean;
  onClose: () => void;
  quotation: Quotation;
  payment: PaymentEntry;
  previousTotal: number; // Total paid before this payment
}

export function ShareReceiptDialog({
  open,
  onClose,
  quotation,
  payment,
  previousTotal,
}: ShareReceiptDialogProps) {
  const [isSharing, setIsSharing] = useState(false);
  const newBalance = quotation.finalTotal - quotation.totalPaid;

  // Handle PDF download
  const handleDownloadPDF = () => {
    generatePaymentReceipt(quotation, payment);
    onClose();
  };

  // Handle Image download
  const handleDownloadImage = async () => {
    setIsSharing(true);
    try {
      await downloadReceiptImage(quotation, payment, previousTotal);
      onClose();
    } catch (error) {
      console.error('Failed to download image:', error);
    } finally {
      setIsSharing(false);
    }
  };

  // Handle WhatsApp share with image
  const handleWhatsAppShare = async () => {
    setIsSharing(true);
    try {
      await shareReceiptOnWhatsApp(quotation, payment, previousTotal);
      onClose();
    } catch (error) {
      console.error('Failed to share:', error);
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-emerald-600">
            <CheckCircle2 className="h-5 w-5" />
            Payment Added!
          </DialogTitle>
        </DialogHeader>

        <div className="py-4">
          {/* Payment Summary */}
          <div className="bg-emerald-50 rounded-xl p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-slate-600">Amount Received</span>
              <span className="text-xl font-bold text-emerald-600">
                ₹{payment.amount.toLocaleString('en-IN')}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div className="bg-white rounded-lg p-2 text-center">
                <p className="text-[10px] text-slate-500">Previous</p>
                <p className="font-semibold text-slate-700">
                  ₹{previousTotal.toLocaleString('en-IN')}
                </p>
              </div>
              <div className="bg-white rounded-lg p-2 text-center">
                <p className="text-[10px] text-slate-500">Total Paid</p>
                <p className="font-semibold text-emerald-600">
                  ₹{quotation.totalPaid.toLocaleString('en-IN')}
                </p>
              </div>
              <div className="bg-white rounded-lg p-2 text-center">
                <p className="text-[10px] text-slate-500">Balance</p>
                <p className={`font-semibold ${newBalance <= 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                  ₹{Math.max(0, newBalance).toLocaleString('en-IN')}
                </p>
              </div>
            </div>
          </div>

          {/* Share Options - All visible buttons */}
          <p className="text-sm text-slate-600 mb-3 text-center">
            Share receipt with {quotation.clientName || 'client'}?
          </p>

          {/* 3 column layout for all options */}
          <div className="grid grid-cols-3 gap-3 mb-3">
            {/* WhatsApp */}
            <Button
              onClick={handleWhatsAppShare}
              disabled={isSharing}
              className="h-20 flex-col gap-1 bg-green-600 hover:bg-green-700"
            >
              {isSharing ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <>
                  <MessageCircle className="h-6 w-6" />
                  <span className="text-xs font-medium">WhatsApp</span>
                  <span className="text-[9px] opacity-80">with image</span>
                </>
              )}
            </Button>

            {/* Save as JPG */}
            <Button
              onClick={handleDownloadImage}
              variant="outline"
              disabled={isSharing}
              className="h-20 flex-col gap-1 border-amber-200 hover:bg-amber-50"
            >
              <Image className="h-6 w-6 text-amber-600" />
              <span className="text-xs font-medium text-amber-700">Save JPG</span>
              <span className="text-[9px] text-slate-400">image</span>
            </Button>

            {/* Save as PDF */}
            <Button
              onClick={handleDownloadPDF}
              variant="outline"
              disabled={isSharing}
              className="h-20 flex-col gap-1 border-red-200 hover:bg-red-50"
            >
              <FileText className="h-6 w-6 text-red-600" />
              <span className="text-xs font-medium text-red-700">Save PDF</span>
              <span className="text-[9px] text-slate-400">document</span>
            </Button>
          </div>

          <Button
            onClick={onClose}
            variant="ghost"
            className="w-full text-slate-500"
          >
            Skip for now
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
