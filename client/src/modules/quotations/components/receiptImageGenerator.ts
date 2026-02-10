/**
 * Receipt Image Generator
 * Creates a professional receipt image (JPG) for WhatsApp sharing
 */

import type { Quotation, PaymentEntry } from '../types';

const METHOD_LABELS: Record<string, string> = {
  cash: 'Cash',
  upi: 'UPI',
  bank: 'Bank Transfer',
  cheque: 'Cheque',
  card: 'Card',
};

interface CompanyInfo {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
}

// Get company info from localStorage or defaults
function getCompanyInfo(): CompanyInfo {
  try {
    const stored = localStorage.getItem('companyInfo');
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {}
  return {
    name: 'Maya Interiors',
    phone: '',
    email: '',
    address: '',
  };
}

export async function generateReceiptImage(
  quotation: Quotation,
  payment: PaymentEntry,
  previousTotal: number
): Promise<Blob> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;

  // Canvas size (optimized for mobile sharing)
  const width = 600;
  const height = 800;
  canvas.width = width;
  canvas.height = height;

  const company = getCompanyInfo();
  const newBalance = quotation.finalTotal - (previousTotal + payment.amount);

  // Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  // Header gradient
  const headerGradient = ctx.createLinearGradient(0, 0, width, 120);
  headerGradient.addColorStop(0, '#10b981');  // Emerald
  headerGradient.addColorStop(1, '#14b8a6');  // Teal
  ctx.fillStyle = headerGradient;
  ctx.fillRect(0, 0, width, 120);

  // Company name
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 28px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(company.name, width / 2, 45);

  // Receipt title
  ctx.font = '16px Arial, sans-serif';
  ctx.fillText('PAYMENT RECEIPT', width / 2, 75);

  // Receipt number
  ctx.font = '14px Arial, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.fillText(payment.receiptNumber || payment.id, width / 2, 100);

  let y = 150;
  const margin = 40;
  const contentWidth = width - margin * 2;

  // Amount section - big and prominent
  ctx.fillStyle = '#f0fdf4';  // Light green bg
  roundRect(ctx, margin, y, contentWidth, 80, 12);
  ctx.fill();

  ctx.fillStyle = '#64748b';
  ctx.font = '14px Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('Amount Received', margin + 20, y + 30);

  ctx.fillStyle = '#10b981';
  ctx.font = 'bold 36px Arial, sans-serif';
  ctx.fillText(`₹${payment.amount.toLocaleString('en-IN')}`, margin + 20, y + 65);

  y += 100;

  // Divider
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(margin, y);
  ctx.lineTo(width - margin, y);
  ctx.stroke();

  y += 25;

  // Payment details
  const details = [
    { label: 'Date', value: payment.date },
    { label: 'Payment Method', value: METHOD_LABELS[payment.method] || payment.method },
    { label: 'Reference', value: payment.reference || '-' },
  ];

  ctx.font = '14px Arial, sans-serif';
  for (const detail of details) {
    ctx.fillStyle = '#64748b';
    ctx.textAlign = 'left';
    ctx.fillText(detail.label, margin, y);

    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 14px Arial, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(detail.value, width - margin, y);

    ctx.font = '14px Arial, sans-serif';
    y += 28;
  }

  y += 10;

  // Client info box
  ctx.fillStyle = '#f8fafc';
  roundRect(ctx, margin, y, contentWidth, 70, 12);
  ctx.fill();

  ctx.fillStyle = '#64748b';
  ctx.font = '12px Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('Received From', margin + 15, y + 22);

  ctx.fillStyle = '#1e293b';
  ctx.font = 'bold 16px Arial, sans-serif';
  ctx.fillText(quotation.clientName || 'Customer', margin + 15, y + 45);

  const clientInfo = [quotation.clientMobile, quotation.clientLocation].filter(Boolean).join(' | ');
  if (clientInfo) {
    ctx.fillStyle = '#64748b';
    ctx.font = '12px Arial, sans-serif';
    ctx.fillText(clientInfo, margin + 15, y + 62);
  }

  y += 90;

  // Quote reference
  ctx.fillStyle = '#94a3b8';
  ctx.font = '12px Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`Quote: ${quotation.quotationNumber}`, margin, y);

  y += 25;

  // Divider
  ctx.strokeStyle = '#e2e8f0';
  ctx.beginPath();
  ctx.moveTo(margin, y);
  ctx.lineTo(width - margin, y);
  ctx.stroke();

  y += 25;

  // Payment summary section
  ctx.fillStyle = '#1e293b';
  ctx.font = 'bold 14px Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('Payment Summary', margin, y);

  y += 25;

  const summaryItems = [
    { label: 'Total Quote Value', value: `₹${quotation.finalTotal.toLocaleString('en-IN')}`, color: '#1e293b' },
    { label: 'Previous Received', value: `₹${previousTotal.toLocaleString('en-IN')}`, color: '#64748b' },
    { label: 'This Payment', value: `₹${payment.amount.toLocaleString('en-IN')}`, color: '#10b981' },
    { label: 'Total Paid', value: `₹${(previousTotal + payment.amount).toLocaleString('en-IN')}`, color: '#1e293b' },
    { label: 'Balance Due', value: `₹${Math.max(0, newBalance).toLocaleString('en-IN')}`, color: newBalance > 0 ? '#f59e0b' : '#10b981' },
  ];

  for (const item of summaryItems) {
    ctx.fillStyle = '#64748b';
    ctx.font = '13px Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(item.label, margin, y);

    ctx.fillStyle = item.color;
    ctx.font = 'bold 13px Arial, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(item.value, width - margin, y);

    y += 24;
  }

  y += 20;

  // Status badge
  if (newBalance <= 0) {
    ctx.fillStyle = '#dcfce7';
    roundRect(ctx, width / 2 - 60, y, 120, 30, 15);
    ctx.fill();

    ctx.fillStyle = '#16a34a';
    ctx.font = 'bold 14px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('✓ FULLY PAID', width / 2, y + 20);
  }

  // Footer
  y = height - 60;

  ctx.fillStyle = '#94a3b8';
  ctx.font = '12px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Thank you for your payment!', width / 2, y);

  ctx.font = '11px Arial, sans-serif';
  ctx.fillText(`Generated on ${new Date().toLocaleDateString('en-IN')}`, width / 2, y + 18);

  // Company contact in footer
  if (company.phone) {
    ctx.fillText(`Contact: ${company.phone}`, width / 2, y + 35);
  }

  // Convert to blob
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      resolve(blob!);
    }, 'image/jpeg', 0.9);
  });
}

// Helper function to draw rounded rectangle
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

// Share receipt image via WhatsApp (with Web Share API fallback)
export async function shareReceiptOnWhatsApp(
  quotation: Quotation,
  payment: PaymentEntry,
  previousTotal: number
): Promise<void> {
  try {
    const blob = await generateReceiptImage(quotation, payment, previousTotal);
    const file = new File([blob], `Receipt-${payment.receiptNumber || payment.id}.jpg`, { type: 'image/jpeg' });

    // Try Web Share API first (works on mobile)
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      await navigator.share({
        title: 'Payment Receipt',
        text: `Payment receipt for ${quotation.clientName}`,
        files: [file],
      });
      return;
    }

    // Fallback: Download image and open WhatsApp with text
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Receipt-${payment.receiptNumber || payment.id}.jpg`;
    link.click();
    URL.revokeObjectURL(url);

    // Open WhatsApp with message
    const newBalance = quotation.finalTotal - (previousTotal + payment.amount);
    const message = encodeURIComponent(
      `✅ Payment Receipt\n\n` +
      `Receipt: ${payment.receiptNumber || payment.id}\n` +
      `Amount: ₹${payment.amount.toLocaleString('en-IN')}\n\n` +
      `📎 Please see the attached receipt image.\n\n` +
      `Balance: ₹${Math.max(0, newBalance).toLocaleString('en-IN')}`
    );
    const phone = quotation.clientMobile?.replace(/[^0-9]/g, '') || '';
    const whatsappUrl = phone
      ? `https://wa.me/91${phone}?text=${message}`
      : `https://wa.me/?text=${message}`;

    window.open(whatsappUrl, '_blank');
  } catch (error) {
    console.error('Error sharing receipt:', error);
    throw error;
  }
}

// Download receipt as image
export async function downloadReceiptImage(
  quotation: Quotation,
  payment: PaymentEntry,
  previousTotal: number
): Promise<void> {
  const blob = await generateReceiptImage(quotation, payment, previousTotal);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Receipt-${payment.receiptNumber || payment.id}-${payment.date}.jpg`;
  link.click();
  URL.revokeObjectURL(url);
}
