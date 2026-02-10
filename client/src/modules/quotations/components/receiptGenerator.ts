/**
 * Receipt PDF Generator
 * Generates professional payment receipts using jsPDF
 */

import jsPDF from 'jspdf';
import type { Quotation, PaymentEntry } from '../types';

const METHOD_LABELS: Record<string, string> = {
  cash: 'Cash',
  upi: 'UPI',
  bank: 'Bank Transfer',
  cheque: 'Cheque',
  card: 'Card',
};

export function generatePaymentReceipt(quotation: Quotation, payment: PaymentEntry): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a5', // A5 for receipt size
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  let y = margin;

  // Colors
  const primaryColor: [number, number, number] = [16, 185, 129]; // Emerald-500
  const darkColor: [number, number, number] = [30, 41, 59]; // Slate-800
  const mutedColor: [number, number, number] = [100, 116, 139]; // Slate-500

  // Header background
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 35, 'F');

  // Header text
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('PAYMENT RECEIPT', pageWidth / 2, 15, { align: 'center' });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(payment.receiptNumber || payment.id, pageWidth / 2, 23, { align: 'center' });

  y = 45;

  // Receipt details box
  doc.setDrawColor(226, 232, 240); // Slate-200
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 85, 3, 3);

  y += 8;
  const leftCol = margin + 5;
  const rightCol = pageWidth - margin - 5;

  // Amount (prominent)
  doc.setFontSize(12);
  doc.setTextColor(...mutedColor);
  doc.text('Amount Received', leftCol, y);
  doc.setFontSize(24);
  doc.setTextColor(...primaryColor);
  doc.setFont('helvetica', 'bold');
  doc.text(`₹${payment.amount.toLocaleString('en-IN')}`, leftCol, y + 10);

  y += 22;

  // Divider
  doc.setDrawColor(226, 232, 240);
  doc.line(margin + 5, y, pageWidth - margin - 5, y);
  y += 8;

  // Details grid
  const details = [
    { label: 'Date', value: payment.date },
    { label: 'Payment Method', value: METHOD_LABELS[payment.method] || payment.method },
    { label: 'Reference', value: payment.reference || '-' },
    { label: 'Note', value: payment.note || '-' },
  ];

  doc.setFontSize(9);
  for (const detail of details) {
    doc.setTextColor(...mutedColor);
    doc.setFont('helvetica', 'normal');
    doc.text(detail.label, leftCol, y);
    doc.setTextColor(...darkColor);
    doc.setFont('helvetica', 'bold');
    doc.text(detail.value, rightCol, y, { align: 'right' });
    y += 7;
  }

  y += 15;

  // Client info section
  doc.setFillColor(248, 250, 252); // Slate-50
  doc.roundedRect(margin, y, pageWidth - margin * 2, 30, 3, 3, 'F');

  y += 8;
  doc.setFontSize(9);
  doc.setTextColor(...mutedColor);
  doc.setFont('helvetica', 'normal');
  doc.text('Received From', leftCol, y);

  y += 6;
  doc.setFontSize(11);
  doc.setTextColor(...darkColor);
  doc.setFont('helvetica', 'bold');
  doc.text(quotation.clientName || 'Customer', leftCol, y);

  y += 5;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...mutedColor);
  const clientInfo = [quotation.clientMobile, quotation.clientLocation].filter(Boolean).join(' | ');
  if (clientInfo) {
    doc.text(clientInfo, leftCol, y);
  }

  y += 15;

  // Quote reference
  doc.setFontSize(9);
  doc.setTextColor(...mutedColor);
  doc.text(`Quote: ${quotation.quotationNumber}`, leftCol, y);

  // Payment summary
  y += 10;
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  const summaryData = [
    { label: 'Total Quote Value', value: `₹${quotation.finalTotal.toLocaleString('en-IN')}` },
    { label: 'Total Paid', value: `₹${quotation.totalPaid.toLocaleString('en-IN')}` },
    { label: 'Balance Due', value: `₹${Math.max(0, quotation.pendingAmount).toLocaleString('en-IN')}`, highlight: quotation.pendingAmount > 0 },
  ];

  for (const item of summaryData) {
    doc.setFontSize(9);
    doc.setTextColor(...mutedColor);
    doc.setFont('helvetica', 'normal');
    doc.text(item.label, leftCol, y);

    if (item.highlight) {
      doc.setTextColor(245, 158, 11); // Amber-500
    } else {
      doc.setTextColor(...darkColor);
    }
    doc.setFont('helvetica', 'bold');
    doc.text(item.value, rightCol, y, { align: 'right' });
    y += 6;
  }

  // Footer
  y = doc.internal.pageSize.getHeight() - 20;
  doc.setFontSize(8);
  doc.setTextColor(...mutedColor);
  doc.setFont('helvetica', 'normal');
  doc.text('Thank you for your payment!', pageWidth / 2, y, { align: 'center' });
  doc.text(`Generated on ${new Date().toLocaleDateString('en-IN')}`, pageWidth / 2, y + 5, { align: 'center' });

  // Save
  const fileName = `Receipt-${payment.receiptNumber || payment.id}-${payment.date}.pdf`;
  doc.save(fileName);
}

// Generate all receipts for a quotation
export function generateAllReceipts(quotation: Quotation): void {
  for (const payment of quotation.payments) {
    generatePaymentReceipt(quotation, payment);
  }
}
