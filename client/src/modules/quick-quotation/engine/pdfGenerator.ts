/**
 * Quick Quotation Module - PDF Generator
 *
 * Generates professional PDF quotations using jsPDF.
 * No external CDN dependencies.
 */

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

import type {
  QuickQuoteClient,
  QuotationMeta,
  QuotationRow,
  QuickQuoteSettings,
  CalculatedTotals,
  BankAccount,
} from '../types';

import { formatCurrency, PAYMENT_STAGE_PERCENTAGES } from '../constants';

// ============================================
// Types
// ============================================

interface PDFGenerationParams {
  client: QuickQuoteClient;
  quotationMeta: QuotationMeta;
  mainItems: QuotationRow[];
  additionalItems: QuotationRow[];
  settings: QuickQuoteSettings;
  totals: CalculatedTotals;
}

// ============================================
// Constants
// ============================================

const COLORS = {
  primary: '#475569',       // Slate-600
  accent: '#C4705A',        // Terracotta
  text: '#3D3227',          // Dark brown
  lightText: '#8C7E6F',     // Light brown
  background: '#FDF6EC',    // Cream
  white: '#FFFFFF',
  additionalHeader: '#475569', // Slate for additional section
};

const MARGIN = 15;
const PAGE_WIDTH = 210; // A4 width in mm
const CONTENT_WIDTH = PAGE_WIDTH - (MARGIN * 2);

// ============================================
// Helper Functions
// ============================================

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;

    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  } catch {
    return dateStr;
  }
}

function sanitizeFilename(name: string): string {
  if (!name) return 'Client';
  return name.trim().replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_');
}

// ============================================
// PDF Generation
// ============================================

export async function generateQuotationPDF(params: PDFGenerationParams): Promise<void> {
  const { client, quotationMeta, mainItems, additionalItems, settings, totals } = params;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  let yPos = MARGIN;

  // === Header ===
  yPos = renderHeader(doc, quotationMeta, yPos);

  // === Client Info ===
  yPos = renderClientInfo(doc, client, yPos);

  // === Main Items Table ===
  yPos = renderItemsTable(doc, mainItems, 'MAIN WORK', COLORS.accent, yPos);

  // === Additional Items Table (if any) ===
  if (additionalItems.length > 0) {
    yPos = renderItemsTable(doc, additionalItems, 'ADDITIONAL WORK', COLORS.additionalHeader, yPos);
  }

  // === Summary ===
  yPos = renderSummary(doc, settings, totals, yPos);

  // === Payment Stages ===
  yPos = renderPaymentStages(doc, totals, yPos);

  // === Bank Details ===
  const selectedBank = settings.bankAccounts[settings.selectedBank] || settings.bankAccounts[0];
  if (selectedBank) {
    yPos = renderBankDetails(doc, selectedBank, yPos);
  }

  // === Terms ===
  yPos = renderTerms(doc, yPos);

  // === Footer ===
  renderFooter(doc, settings);

  // === Save PDF ===
  const clientName = sanitizeFilename(client.name);
  const address = sanitizeFilename(client.address.split(',')[0] || 'Site');
  const filename = `${clientName}_${address}_${quotationMeta.number}.pdf`;

  doc.save(filename);
}

// ============================================
// Section Renderers
// ============================================

function renderHeader(doc: jsPDF, meta: QuotationMeta, yPos: number): number {
  // Logo placeholder (M in circle)
  doc.setFillColor(196, 112, 90); // Accent color
  doc.circle(MARGIN + 8, yPos + 8, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('M', MARGIN + 5.5, yPos + 11);

  // Company name
  doc.setTextColor(61, 50, 39);
  doc.setFontSize(16);
  doc.text('MAYA', MARGIN + 20, yPos + 7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(140, 126, 111);
  doc.text('INTERIORS', MARGIN + 42, yPos + 7);

  // Tagline
  doc.setFontSize(7);
  doc.setTextColor(196, 112, 90);
  doc.text('CRAFTING BEAUTIFUL SPACES', MARGIN + 20, yPos + 12);

  // Date and Quote number (right side)
  doc.setTextColor(61, 50, 39);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(formatDate(meta.date), PAGE_WIDTH - MARGIN, yPos + 7, { align: 'right' });
  doc.setFontSize(9);
  doc.setTextColor(196, 112, 90);
  doc.text(`Quote No: ${meta.number}`, PAGE_WIDTH - MARGIN, yPos + 12, { align: 'right' });

  return yPos + 22;
}

function renderClientInfo(doc: jsPDF, client: QuickQuoteClient, yPos: number): number {
  const labelStyle = { fontSize: 7, textColor: COLORS.lightText };
  const valueStyle = { fontSize: 10, textColor: COLORS.text };

  const fields = [
    { label: 'CLIENT', value: client.name || '-' },
    { label: 'CONTACT', value: client.contact || '-' },
    { label: 'EMAIL', value: client.email || '-' },
    { label: 'ADDRESS', value: client.address || '-' },
  ];

  const colWidth = CONTENT_WIDTH / 4;

  fields.forEach((field, index) => {
    const xPos = MARGIN + (index * colWidth);

    doc.setFontSize(7);
    doc.setTextColor(140, 126, 111);
    doc.text(field.label, xPos, yPos);

    doc.setFontSize(10);
    doc.setTextColor(61, 50, 39);
    doc.setFont('helvetica', 'normal');

    // Truncate long values
    const maxWidth = colWidth - 5;
    const value = doc.splitTextToSize(field.value, maxWidth)[0] || '-';
    doc.text(value, xPos, yPos + 5);
  });

  // Underline
  doc.setDrawColor(232, 223, 212);
  doc.line(MARGIN, yPos + 8, PAGE_WIDTH - MARGIN, yPos + 8);

  return yPos + 15;
}

function renderItemsTable(
  doc: jsPDF,
  items: QuotationRow[],
  sectionTitle: string,
  headerColor: string,
  yPos: number
): number {
  if (items.length === 0) return yPos;

  // Prepare table data
  const tableData: (string | number)[][] = [];
  let rowNumber = 1;

  items.forEach(item => {
    if (item.type === 'floor') {
      // Floor row - full width colored background
      tableData.push([
        { content: item.name, colSpan: 8, styles: { fillColor: headerColor, textColor: '#FFFFFF', fontStyle: 'bold', halign: 'left' } },
        { content: `₹${formatCurrency(item.total || 0)}`, styles: { fillColor: headerColor, textColor: '#FFFFFF', fontStyle: 'bold', halign: 'right' } },
      ] as any);
    } else if (item.type === 'room') {
      // Room row
      tableData.push([
        { content: item.name, colSpan: 5, styles: { fontStyle: 'bold', textColor: COLORS.accent } },
        { content: '', colSpan: 3 },
        { content: `₹${formatCurrency(item.total || 0)}`, styles: { fontStyle: 'bold', textColor: COLORS.accent, halign: 'right' } },
      ] as any);
    } else {
      // Item row
      tableData.push([
        rowNumber++,
        item.name || '',
        item.height || '-',
        item.width || '-',
        item.sqft ? item.sqft.toFixed(2) : '-',
        item.rate ? `₹${formatCurrency(item.rate)}` : '-',
        item.amount ? `₹${formatCurrency(item.amount)}` : '-',
        item.qty || 1,
        item.total ? `₹${formatCurrency(item.total)}` : '-',
      ]);
    }
  });

  autoTable(doc, {
    startY: yPos,
    head: [[
      { content: '#', styles: { halign: 'center' } },
      'DESCRIPTION',
      { content: 'H', styles: { halign: 'center' } },
      { content: 'W', styles: { halign: 'center' } },
      { content: 'SQ.FT', styles: { halign: 'center' } },
      { content: 'RATE', styles: { halign: 'center' } },
      { content: 'AMOUNT', styles: { halign: 'center' } },
      { content: 'QTY', styles: { halign: 'center' } },
      { content: 'TOTAL', styles: { halign: 'right' } },
    ]],
    body: tableData,
    theme: 'plain',
    styles: {
      fontSize: 9,
      cellPadding: 3,
      textColor: COLORS.text,
    },
    headStyles: {
      fillColor: COLORS.background,
      textColor: COLORS.text,
      fontStyle: 'bold',
      fontSize: 8,
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 12, halign: 'center' },
      3: { cellWidth: 12, halign: 'center' },
      4: { cellWidth: 15, halign: 'center' },
      5: { cellWidth: 20, halign: 'center' },
      6: { cellWidth: 22, halign: 'center' },
      7: { cellWidth: 10, halign: 'center' },
      8: { cellWidth: 22, halign: 'right' },
    },
    margin: { left: MARGIN, right: MARGIN },
  });

  return (doc as any).lastAutoTable.finalY + 5;
}

function renderSummary(
  doc: jsPDF,
  settings: QuickQuoteSettings,
  totals: CalculatedTotals,
  yPos: number
): number {
  const boxWidth = 70;
  const boxX = PAGE_WIDTH - MARGIN - boxWidth;

  // Background box
  doc.setFillColor(71, 85, 105); // Primary color
  doc.roundedRect(boxX, yPos, boxWidth, 45, 3, 3, 'F');

  // Summary rows
  const rows = [
    { label: 'Subtotal', value: `₹${formatCurrency(totals.subtotal)}` },
  ];

  if (totals.discountAmount > 0) {
    const discountLabel = settings.discountType === 'percent'
      ? `Discount (${settings.discountValue}%)`
      : 'Discount';
    rows.push({ label: discountLabel, value: `-₹${formatCurrency(totals.discountAmount)}` });
  }

  if (settings.gstEnabled && totals.gstAmount > 0) {
    rows.push({ label: `GST (${settings.gstRate}%)`, value: `₹${formatCurrency(totals.gstAmount)}` });
  }

  let textY = yPos + 8;
  doc.setFontSize(9);

  rows.forEach(row => {
    doc.setTextColor(255, 255, 255, 0.7);
    doc.text(row.label, boxX + 5, textY);
    doc.setTextColor(255, 255, 255);
    doc.text(row.value, boxX + boxWidth - 5, textY, { align: 'right' });
    textY += 7;
  });

  // Grand total (larger)
  doc.setDrawColor(255, 255, 255, 0.3);
  doc.line(boxX + 5, textY, boxX + boxWidth - 5, textY);
  textY += 8;

  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255, 0.7);
  doc.text('GRAND TOTAL', boxX + 5, textY);

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text(`₹${formatCurrency(totals.grandTotal)}`, boxX + boxWidth - 5, textY + 1, { align: 'right' });

  return yPos + 55;
}

function renderPaymentStages(doc: jsPDF, totals: CalculatedTotals, yPos: number): number {
  const stages = [
    { name: 'Booking', percent: PAYMENT_STAGE_PERCENTAGES.booking, amount: totals.paymentStages.booking },
    { name: 'Production', percent: PAYMENT_STAGE_PERCENTAGES.production, amount: totals.paymentStages.production },
    { name: 'Factory', percent: PAYMENT_STAGE_PERCENTAGES.factory, amount: totals.paymentStages.factory },
    { name: 'Handover', percent: PAYMENT_STAGE_PERCENTAGES.handover, amount: totals.paymentStages.handover },
  ];

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(61, 50, 39);
  doc.text('Payment Schedule', MARGIN, yPos);

  yPos += 7;

  const stageWidth = CONTENT_WIDTH / 4 - 3;

  stages.forEach((stage, index) => {
    const xPos = MARGIN + (index * (stageWidth + 4));

    // Stage box
    doc.setFillColor(250, 250, 250);
    doc.setDrawColor(228, 228, 231);
    doc.roundedRect(xPos, yPos, stageWidth, 22, 2, 2, 'FD');

    // Percentage
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(39, 39, 42);
    doc.text(`${stage.percent}%`, xPos + stageWidth / 2, yPos + 8, { align: 'center' });

    // Name
    doc.setFontSize(7);
    doc.setTextColor(113, 113, 122);
    doc.text(stage.name.toUpperCase(), xPos + stageWidth / 2, yPos + 13, { align: 'center' });

    // Amount
    doc.setFontSize(9);
    doc.setTextColor(59, 130, 246);
    doc.text(`₹${formatCurrency(stage.amount)}`, xPos + stageWidth / 2, yPos + 19, { align: 'center' });

    // Arrow (except last)
    if (index < 3) {
      doc.setTextColor(212, 212, 216);
      doc.setFontSize(12);
      doc.text('→', xPos + stageWidth + 1, yPos + 12);
    }
  });

  return yPos + 30;
}

function renderBankDetails(doc: jsPDF, bank: BankAccount, yPos: number): number {
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(61, 50, 39);
  doc.text('Bank Details', MARGIN, yPos);

  yPos += 6;

  const details = [
    { label: 'Bank', value: bank.bank },
    { label: 'Account', value: bank.accNo },
    { label: 'IFSC', value: bank.ifsc },
    { label: 'UPI', value: bank.upi },
  ];

  doc.setFontSize(8);
  const colWidth = 45;

  details.forEach((detail, index) => {
    const col = index % 2;
    const row = Math.floor(index / 2);
    const xPos = MARGIN + (col * colWidth);
    const rowY = yPos + (row * 10);

    doc.setTextColor(140, 126, 111);
    doc.setFont('helvetica', 'normal');
    doc.text(detail.label, xPos, rowY);

    doc.setTextColor(61, 50, 39);
    doc.setFont('helvetica', 'bold');
    doc.text(detail.value, xPos, rowY + 4);
  });

  return yPos + 25;
}

function renderTerms(doc: jsPDF, yPos: number): number {
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(61, 50, 39);
  doc.text('Terms & Conditions', MARGIN, yPos);

  yPos += 6;

  const terms = [
    'Rates valid for 30 days from quote date',
    'Warranty as per product manufacturer',
    'Changes to design may affect final price',
    'Site must be ready before installation',
    'No cancellation after production starts',
  ];

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(82, 82, 91);

  terms.forEach((term, index) => {
    doc.text(`• ${term}`, MARGIN, yPos + (index * 4));
  });

  return yPos + 25;
}

function renderFooter(doc: jsPDF, settings: QuickQuoteSettings): void {
  const pageHeight = doc.internal.pageSize.getHeight();
  const footerY = pageHeight - 15;

  // Contact info
  doc.setFontSize(8);
  doc.setTextColor(140, 126, 111);
  doc.text(
    `${settings.contactInfo.phone} | ${settings.contactInfo.email} | ${settings.contactInfo.location}`,
    PAGE_WIDTH / 2,
    footerY,
    { align: 'center' }
  );

  // Signature lines
  const sigY = footerY - 15;
  doc.setDrawColor(200, 200, 200);

  doc.line(MARGIN, sigY, MARGIN + 50, sigY);
  doc.setFontSize(7);
  doc.text('Client Signature', MARGIN, sigY + 4);

  doc.line(PAGE_WIDTH - MARGIN - 50, sigY, PAGE_WIDTH - MARGIN, sigY);
  doc.text('Authorized Signature', PAGE_WIDTH - MARGIN - 50, sigY + 4);
}
