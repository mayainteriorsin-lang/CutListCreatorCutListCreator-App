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
  primary: '#85BB65',       // Sage green (professional green)
  accent: '#85BB65',        // Sage green (for headers)
  text: '#111827',          // Gray-900 (black text)
  lightText: '#6b7280',     // Gray-500 (muted text)
  background: '#f3f4f6',    // Gray-100 (light bg)
  white: '#FFFFFF',
  additionalHeader: '#64748b', // Slate-500 for additional section
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
  const bankAccounts = settings.bankAccounts || [];
  const selectedBank = bankAccounts[settings.selectedBank] || bankAccounts[0];
  if (selectedBank) {
    yPos = renderBankDetails(doc, selectedBank, yPos);
  }

  // === Terms ===
  yPos = renderTerms(doc, yPos);

  // === Footer ===
  renderFooter(doc, settings);

  // === Save PDF ===
  const clientName = sanitizeFilename(client.name);
  const address = sanitizeFilename((client.address || '').split(',')[0] || 'Site');
  const quoteNum = quotationMeta.number || 'Quote';
  const filename = `${clientName}_${address}_${quoteNum}.pdf`;

  doc.save(filename);
}

// ============================================
// Section Renderers
// ============================================

function renderHeader(doc: jsPDF, meta: QuotationMeta, yPos: number): number {
  // Logo placeholder (M in circle)
  doc.setFillColor(133, 187, 101); // Sage green #85BB65
  doc.circle(MARGIN + 8, yPos + 8, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('M', MARGIN + 5.5, yPos + 11);

  // Company name
  doc.setTextColor(17, 24, 39); // Gray-900
  doc.setFontSize(16);
  doc.text('MAYA', MARGIN + 20, yPos + 7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(107, 114, 128); // Gray-500
  doc.text('INTERIORS', MARGIN + 42, yPos + 7);

  // Tagline
  doc.setFontSize(7);
  doc.setTextColor(75, 85, 99); // Gray-600
  doc.text('CRAFTING BEAUTIFUL SPACES', MARGIN + 20, yPos + 12);

  // Date and Quote number (right side)
  doc.setTextColor(17, 24, 39); // Gray-900 (black)
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(formatDate(meta.date || ''), PAGE_WIDTH - MARGIN, yPos + 7, { align: 'right' });
  doc.setFontSize(9);
  doc.setTextColor(107, 142, 35); // Darker green for text readability
  doc.text(`Quote No: ${meta.number || '-'}`, PAGE_WIDTH - MARGIN, yPos + 12, { align: 'right' });

  return yPos + 22;
}

function renderClientInfo(doc: jsPDF, client: QuickQuoteClient, yPos: number): number {
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
    doc.setTextColor(107, 114, 128); // Gray-500
    doc.text(field.label, xPos, yPos);

    doc.setFontSize(10);
    doc.setTextColor(31, 41, 55); // Gray-800
    doc.setFont('helvetica', 'normal');

    // Truncate long values
    const maxWidth = colWidth - 5;
    const value = doc.splitTextToSize(field.value, maxWidth)[0] || '-';
    doc.text(value, xPos, yPos + 5);
  });

  // Underline
  doc.setDrawColor(209, 213, 219); // Gray-300
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

  // Render section title header
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(17, 24, 39); // Gray-900
  doc.text(sectionTitle, MARGIN, yPos);
  yPos += 6;

  // Prepare table data
  const tableData: any[][] = [];
  const highlightedRowIndices: Set<number> = new Set(); // Track which body rows are highlighted
  let rowNumber = 1;
  let tableRowIndex = 0;

  items.forEach(item => {
    if (item.type === 'floor') {
      // Floor row - full width colored background (include note if exists)
      const floorName = item.note
        ? `${item.name}\n[${item.note}]`
        : item.name;
      tableData.push([
        { content: floorName, colSpan: 8, styles: { fillColor: headerColor, textColor: '#FFFFFF', fontStyle: 'bold', halign: 'left' } },
        { content: `Rs.${formatCurrency(item.total || 0)}`, styles: { fillColor: headerColor, textColor: '#FFFFFF', fontStyle: 'bold', halign: 'right' } },
      ] as any);
      tableRowIndex++;
    } else if (item.type === 'room') {
      // Room row - spans all columns with name on left and total on right (include note if exists)
      const roomName = item.note
        ? `${item.name}\n[${item.note}]`
        : item.name;
      tableData.push([
        { content: '', styles: { cellWidth: 10 } },  // # column placeholder
        { content: roomName, colSpan: 7, styles: { fontStyle: 'bold', textColor: COLORS.accent, halign: 'left' } },
        { content: `Rs.${formatCurrency(item.total || 0)}`, styles: { fontStyle: 'bold', textColor: COLORS.accent, halign: 'right' } },
      ] as any);
      tableRowIndex++;
    } else {
      // Item row - add note below description if exists
      const itemName = item.note
        ? `${item.name || ''}\n[Note: ${item.note}]`
        : (item.name || '');

      // Track highlighted rows
      if (item.highlighted) {
        highlightedRowIndices.add(tableRowIndex);
      }

      // Regular item row
      tableData.push([
        rowNumber++,
        itemName,
        item.height != null && item.height !== 0 ? item.height : '-',
        item.width != null && item.width !== 0 ? item.width : '-',
        item.sqft != null && item.sqft !== 0 ? item.sqft.toFixed(2) : '-',
        item.rate != null && item.rate !== 0 ? `Rs.${formatCurrency(item.rate)}` : '-',
        item.amount != null && item.amount !== 0 ? `Rs.${formatCurrency(item.amount)}` : '-',
        item.qty || 1,
        item.total != null && item.total !== 0 ? `Rs.${formatCurrency(item.total)}` : '-',
      ]);
      tableRowIndex++;
    }
  });

  autoTable(doc, {
    startY: yPos,
    head: [[
      { content: '#', styles: { halign: 'center' } },
      'DESCRIPTION',
      { content: 'H', styles: { halign: 'center' } },
      { content: 'W', styles: { halign: 'center' } },
      { content: 'SQFT', styles: { halign: 'center' } },
      { content: 'RATE', styles: { halign: 'center' } },
      { content: 'AMT', styles: { halign: 'center' } },
      { content: 'QTY', styles: { halign: 'center' } },
      { content: 'TOTAL', styles: { halign: 'right' } },
    ]],
    body: tableData,
    theme: 'plain',
    styles: {
      fontSize: 8,
      cellPadding: 2,
      textColor: COLORS.text,
      overflow: 'linebreak',
    },
    headStyles: {
      fillColor: COLORS.background,
      textColor: COLORS.text,
      fontStyle: 'bold',
      fontSize: 7,
      cellPadding: 2,
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center', overflow: 'visible' },  // # - wider for 2-digit numbers
      1: { cellWidth: 'auto', overflow: 'linebreak' },              // Description - allow wrap
      2: { cellWidth: 12, halign: 'center', overflow: 'visible' },  // H
      3: { cellWidth: 12, halign: 'center', overflow: 'visible' },  // W
      4: { cellWidth: 14, halign: 'center', overflow: 'visible' },  // SQFT
      5: { cellWidth: 18, halign: 'right', overflow: 'visible' },   // RATE
      6: { cellWidth: 20, halign: 'right', overflow: 'visible' },   // AMOUNT
      7: { cellWidth: 12, halign: 'center', overflow: 'visible' },  // QTY - wider
      8: { cellWidth: 22, halign: 'right', overflow: 'visible' },   // TOTAL
    },
    margin: { left: MARGIN, right: MARGIN },
    showHead: 'firstPage',  // Only show header on first page of table
    // Apply red background with black text for highlighted rows
    didParseCell: (data) => {
      if (data.section === 'body' && highlightedRowIndices.has(data.row.index)) {
        data.cell.styles.fillColor = '#EF4444'; // Red-500 background
        data.cell.styles.textColor = '#000000'; // Black text
      }
    },
  });

  const finalY = (doc as any).lastAutoTable?.finalY || yPos + 50;
  return finalY + 5;
}

function renderSummary(
  doc: jsPDF,
  settings: QuickQuoteSettings,
  totals: CalculatedTotals,
  yPos: number
): number {
  const pageHeight = doc.internal.pageSize.getHeight();

  // Check if we need a new page (need ~50mm for summary)
  if (yPos + 50 > pageHeight - 40) {
    doc.addPage();
    yPos = MARGIN;
  }

  // Section header
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(17, 24, 39); // Gray-900
  doc.text('Summary', MARGIN, yPos);
  yPos += 6;

  // Summary rows - left side
  const rows: { label: string; value: string }[] = [];

  // Add Main Work total
  rows.push({ label: 'Main Work', value: `Rs.${formatCurrency(totals.mainTotal || 0)}` });

  // Add Additional Work total (only if > 0)
  if ((totals.additionalTotal || 0) > 0) {
    rows.push({ label: 'Additional Work', value: `Rs.${formatCurrency(totals.additionalTotal || 0)}` });
  }

  // Add Subtotal
  rows.push({ label: 'Subtotal', value: `Rs.${formatCurrency(totals.subtotal || 0)}` });

  if ((totals.discountAmount || 0) > 0) {
    const discountLabel = settings.discountType === 'percent'
      ? `Discount (${settings.discountValue || 0}%)`
      : 'Discount';
    rows.push({ label: discountLabel, value: `-Rs.${formatCurrency(totals.discountAmount || 0)}` });
  }

  if (settings.gstEnabled && (totals.gstAmount || 0) > 0) {
    rows.push({ label: `GST (${settings.gstRate || 0}%)`, value: `Rs.${formatCurrency(totals.gstAmount || 0)}` });
  }

  // Calculate right side row count for box height
  let rightRowCount = 1; // Grand Total always shown
  if ((settings.paidAmount || 0) > 0) rightRowCount++; // Paid
  if ((settings.paidAmount || 0) > 0 && (totals.balanceAmount || 0) > 0) rightRowCount++; // Balance

  // Calculate dynamic box height based on number of rows (use max of left and right)
  const maxRows = Math.max(rows.length, rightRowCount + 1); // +1 for grand total which takes more space
  const boxHeight = Math.max(40, 14 + (maxRows * 6));
  doc.setFillColor(75, 85, 99); // Gray-600 background
  doc.roundedRect(MARGIN, yPos, CONTENT_WIDTH, boxHeight, 3, 3, 'F');

  // Left side - breakdown rows
  let textY = yPos + 8;
  doc.setFontSize(9);
  const leftColX = MARGIN + 10;
  const leftValX = MARGIN + 70;

  rows.forEach(row => {
    doc.setTextColor(200, 200, 210);  // Light gray for labels
    doc.text(row.label, leftColX, textY);
    doc.setTextColor(133, 187, 101);  // Sage green #85BB65 for values
    doc.text(row.value, leftValX, textY);
    textY += 6;
  });

  // Right side - Grand Total, Paid, Balance
  const rightX = PAGE_WIDTH - MARGIN - 60;
  let rightY = yPos + 10;

  // Grand Total (large, prominent)
  doc.setFontSize(8);
  doc.setTextColor(200, 200, 210);
  doc.text('GRAND TOTAL', rightX, rightY);

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(133, 187, 101);  // Sage green #85BB65
  doc.text(`Rs.${formatCurrency(totals.grandTotal || 0)}`, rightX, rightY + 8);
  rightY += 16;

  // Paid and Balance (smaller, below grand total)
  if ((settings.paidAmount || 0) > 0) {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(200, 200, 210);
    doc.text('Paid:', rightX, rightY);
    doc.setTextColor(144, 238, 144); // Light green for paid
    doc.text(`Rs.${formatCurrency(settings.paidAmount || 0)}`, rightX + 20, rightY);
    rightY += 6;

    if ((totals.balanceAmount || 0) > 0) {
      doc.setTextColor(200, 200, 210);
      doc.text('Balance:', rightX, rightY);
      doc.setTextColor(255, 182, 193); // Light red/pink for balance
      doc.text(`Rs.${formatCurrency(totals.balanceAmount || 0)}`, rightX + 20, rightY);
    }
  }

  doc.setFont('helvetica', 'normal');

  return yPos + boxHeight + 10;
}

function renderPaymentStages(doc: jsPDF, totals: CalculatedTotals, yPos: number): number {
  const pageHeight = doc.internal.pageSize.getHeight();

  // Check if we need a new page (need ~40mm for payment stages, leave 45mm for signatures/footer)
  if (yPos + 40 > pageHeight - 45) {
    doc.addPage();
    yPos = MARGIN;
  }

  const paymentStages = totals.paymentStages || { booking: 0, production: 0, factory: 0, handover: 0 };
  const stages = [
    { name: 'Booking', percent: PAYMENT_STAGE_PERCENTAGES.booking, amount: paymentStages.booking || 0 },
    { name: 'Production', percent: PAYMENT_STAGE_PERCENTAGES.production, amount: paymentStages.production || 0 },
    { name: 'Factory', percent: PAYMENT_STAGE_PERCENTAGES.factory, amount: paymentStages.factory || 0 },
    { name: 'Handover', percent: PAYMENT_STAGE_PERCENTAGES.handover, amount: paymentStages.handover || 0 },
  ];

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(17, 24, 39); // Gray-900
  doc.text('Payment Schedule', MARGIN, yPos);

  yPos += 7;

  const stageWidth = CONTENT_WIDTH / 4 - 3;

  stages.forEach((stage, index) => {
    const xPos = MARGIN + (index * (stageWidth + 4));

    // Stage box
    doc.setFillColor(249, 250, 251); // Gray-50
    doc.setDrawColor(209, 213, 219); // Gray-300
    doc.roundedRect(xPos, yPos, stageWidth, 22, 2, 2, 'FD');

    // Percentage
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(17, 24, 39); // Gray-900
    doc.text(`${stage.percent}%`, xPos + stageWidth / 2, yPos + 8, { align: 'center' });

    // Name
    doc.setFontSize(7);
    doc.setTextColor(107, 114, 128); // Gray-500
    doc.text(stage.name.toUpperCase(), xPos + stageWidth / 2, yPos + 13, { align: 'center' });

    // Amount
    doc.setFontSize(9);
    doc.setTextColor(107, 142, 35); // Darker green for text readability
    doc.text(`Rs.${formatCurrency(stage.amount)}`, xPos + stageWidth / 2, yPos + 19, { align: 'center' });

    // Arrow (except last) - use simple arrow since Unicode may not render
    if (index < 3) {
      doc.setTextColor(156, 163, 175); // Gray-400
      doc.setFontSize(10);
      doc.text('>', xPos + stageWidth + 1, yPos + 12);
    }
  });

  return yPos + 30;
}

function renderBankDetails(doc: jsPDF, bank: BankAccount, yPos: number): number {
  const pageHeight = doc.internal.pageSize.getHeight();

  // Check if we need a new page (need ~30mm for bank details, leave 45mm for signatures/footer)
  if (yPos + 30 > pageHeight - 45) {
    doc.addPage();
    yPos = MARGIN;
  }

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(17, 24, 39); // Gray-900
  doc.text('Bank Details', MARGIN, yPos);

  yPos += 6;

  const details = [
    { label: 'Bank', value: bank.bank || '-' },
    { label: 'Account', value: bank.accNo || '-' },
    { label: 'IFSC', value: bank.ifsc || '-' },
    { label: 'UPI', value: bank.upi || '-' },
  ];

  doc.setFontSize(8);
  const colWidth = 45;

  details.forEach((detail, index) => {
    const col = index % 2;
    const row = Math.floor(index / 2);
    const xPos = MARGIN + (col * colWidth);
    const rowY = yPos + (row * 10);

    doc.setTextColor(107, 114, 128); // Gray-500
    doc.setFont('helvetica', 'normal');
    doc.text(detail.label, xPos, rowY);

    doc.setTextColor(31, 41, 55); // Gray-800
    doc.setFont('helvetica', 'bold');
    doc.text(detail.value, xPos, rowY + 4);
  });

  return yPos + 25;
}

function renderTerms(doc: jsPDF, yPos: number): number {
  const pageHeight = doc.internal.pageSize.getHeight();

  // Check if we need a new page (need ~30mm for terms, leave 45mm for signatures/footer)
  if (yPos + 30 > pageHeight - 45) {
    doc.addPage();
    yPos = MARGIN;
  }

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(17, 24, 39); // Gray-900
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
  doc.setTextColor(75, 85, 99); // Gray-600

  terms.forEach((term, index) => {
    doc.text(`- ${term}`, MARGIN, yPos + (index * 4));
  });

  return yPos + 25;
}

function renderFooter(doc: jsPDF, settings: QuickQuoteSettings): void {
  const pageCount = doc.getNumberOfPages();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Add footer to all pages
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const footerY = pageHeight - 10;

    // Contact info
    doc.setFontSize(8);
    doc.setTextColor(107, 114, 128); // Gray-500
    const contact = settings.contactInfo || { phone: '', email: '', location: '' };
    doc.text(
      `${contact.phone || ''} | ${contact.email || ''} | ${contact.location || ''}`,
      PAGE_WIDTH / 2,
      footerY,
      { align: 'center' }
    );
  }

  // Add signature lines only on the last page
  doc.setPage(pageCount);
  const sigY = pageHeight - 30;
  doc.setDrawColor(156, 163, 175); // Gray-400

  doc.line(MARGIN, sigY, MARGIN + 50, sigY);
  doc.setFontSize(7);
  doc.setTextColor(107, 114, 128); // Gray-500
  doc.text('Client Signature', MARGIN, sigY + 4);

  doc.line(PAGE_WIDTH - MARGIN - 50, sigY, PAGE_WIDTH - MARGIN, sigY);
  doc.text('Authorized Signature', PAGE_WIDTH - MARGIN - 50, sigY + 4);
}
