/**
 * Quick Quotation Module - Main Page Component
 *
 * Complete quotation editor replacing the iframe-based version.
 */

import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Zap,
  FileDown,
  Save,
  FolderOpen,
  Settings,
  Undo2,
  Redo2,
  Plus,
  Building,
  Keyboard,
  Share2,
  Printer,
  Copy,
  Search,
} from 'lucide-react';

import { useQuickQuotationStore, useQuotationMeta, useUI, useSettings } from '../store/quickQuotationStore';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { useAutoSave } from '../hooks/useAutoSave';
import { generateQuotationPDF } from '../engine/pdfGenerator';
import { saveVersionToQuickQuote } from '../storage/storage';

import { QuickQuotationErrorBoundary } from './ErrorBoundary';
import { ClientInfoCard } from './ClientInfoCard';
import { QuotationTable } from './QuotationTable';
import { SummaryPanel } from './SummaryPanel';
import { PaymentStages } from './PaymentStages';
import { ClientManagerDialog } from './ClientManagerDialog';
import { BankAccountDialog } from './BankAccountDialog';
import { ShortcutsDialog } from './ShortcutsDialog';
import { useToast } from '@/hooks/use-toast';

function QuickQuotationContent() {
  const [searchParams] = useSearchParams();
  const quotationMeta = useQuotationMeta();
  const ui = useUI();
  const settings = useSettings();
  const { toast } = useToast();
  const hasAppliedUrlParams = useRef(false);

  // Store actions
  const loadFromLocalStorage = useQuickQuotationStore(state => state.loadFromLocalStorage);
  const setQuotationDate = useQuickQuotationStore(state => state.setQuotationDate);
  const setQuotationNumber = useQuickQuotationStore(state => state.setQuotationNumber);
  const setActiveDialog = useQuickQuotationStore(state => state.setActiveDialog);
  const resetQuotation = useQuickQuotationStore(state => state.resetQuotation);
  const undo = useQuickQuotationStore(state => state.undo);
  const redo = useQuickQuotationStore(state => state.redo);
  const canUndo = useQuickQuotationStore(state => state.canUndo);
  const canRedo = useQuickQuotationStore(state => state.canRedo);
  const setGeneratingPdf = useQuickQuotationStore(state => state.setGeneratingPdf);
  const setClient = useQuickQuotationStore(state => state.setClient);
  const client = useQuickQuotationStore(state => state.client);
  const mainItems = useQuickQuotationStore(state => state.mainItems);
  const additionalItems = useQuickQuotationStore(state => state.additionalItems);
  const getTotals = useQuickQuotationStore(state => state.getTotals);

  // Enable keyboard shortcuts
  useKeyboardShortcuts();

  // Enable auto-save
  useAutoSave();

  // Load saved state on mount, then apply URL params if present
  useEffect(() => {
    loadFromLocalStorage();

    // Apply URL params after localStorage load (with small delay to ensure state is ready)
    if (!hasAppliedUrlParams.current) {
      const clientName = searchParams.get('clientName');
      const clientPhone = searchParams.get('clientPhone');
      const clientEmail = searchParams.get('clientEmail');
      const clientLocation = searchParams.get('clientLocation');
      const quoteNo = searchParams.get('quoteNo');

      // Only auto-fill if at least client name is provided
      if (clientName) {
        hasAppliedUrlParams.current = true;

        // Use setTimeout to ensure this runs after localStorage state is applied
        setTimeout(() => {
          setClient({
            name: clientName,
            contact: clientPhone || '',
            email: clientEmail || '',
            address: clientLocation || '',
          });

          if (quoteNo) {
            setQuotationNumber(quoteNo);
          }
        }, 50);
      }
    }
  }, [loadFromLocalStorage, searchParams, setClient, setQuotationNumber]);

  const handleExportPDF = async () => {
    if (!client.name) {
      toast({
        variant: 'destructive',
        title: 'Client Name Required',
        description: 'Please enter a client name before exporting.',
      });
      return;
    }

    try {
      setGeneratingPdf(true);

      // Auto-save a version before exporting PDF
      // This captures the exact state that was shared with the client
      const version = saveVersionToQuickQuote(quotationMeta.number, 'Shared via PDF');

      await generateQuotationPDF({
        client,
        quotationMeta,
        mainItems,
        additionalItems,
        settings,
        totals: getTotals(),
      });

      if (version) {
        toast({
          title: 'PDF Exported',
          description: `Downloaded and saved as v${version.version}`,
        });
      } else {
        toast({
          title: 'PDF Exported',
          description: 'Quotation PDF has been downloaded.',
        });
      }
    } catch (error) {
      console.error('PDF export error:', error);
      toast({
        variant: 'destructive',
        title: 'Export Failed',
        description: 'Could not generate PDF. Please try again.',
      });
    } finally {
      setGeneratingPdf(false);
    }
  };

  const handleNewQuotation = () => {
    if (confirm('Start a new quotation? Unsaved changes will be lost.')) {
      resetQuotation();
      toast({
        title: 'New Quotation',
        description: 'Started a new quotation.',
      });
    }
  };

  const handleDuplicateQuotation = () => {
    // Keep all items but clear client info and generate new quote number
    const newQuoteNumber = `MI-${new Date().getFullYear()}-${Math.floor(Math.random() * 900) + 100}`;
    setQuotationNumber(newQuoteNumber);
    setClient({
      name: '',
      contact: '',
      email: '',
      address: '',
    });
    toast({
      title: 'Quotation Duplicated',
      description: 'Items copied. Enter new client details.',
    });
  };

  const handleWhatsAppShare = () => {
    if (!client.name) {
      toast({
        variant: 'destructive',
        title: 'Client Name Required',
        description: 'Please enter a client name before sharing.',
      });
      return;
    }

    const totals = getTotals();
    const itemCount = mainItems.filter(i => i.type === 'item').length +
                      additionalItems.filter(i => i.type === 'item').length;

    // Create WhatsApp message
    const message = `*MAYA INTERIORS - Quotation*

*Quote No:* ${quotationMeta.number}
*Date:* ${quotationMeta.date}
*Client:* ${client.name}
${client.address ? `*Location:* ${client.address}` : ''}

*Items:* ${itemCount} items
*Total:* ₹${totals.grandTotal.toLocaleString('en-IN')}
${totals.gstAmount > 0 ? `(Incl. GST: ₹${totals.gstAmount.toLocaleString('en-IN')})` : ''}

Please download PDF for detailed quotation.

_Maya Interiors_
${settings.contactInfo.phone}`;

    const whatsappUrl = client.contact
      ? `https://wa.me/91${client.contact.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;

    window.open(whatsappUrl, '_blank');
  };

  const handlePrint = async () => {
    if (!client.name) {
      toast({
        variant: 'destructive',
        title: 'Client Name Required',
        description: 'Please enter a client name before printing.',
      });
      return;
    }

    try {
      setGeneratingPdf(true);

      // Generate PDF blob for printing
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();

      // Use the same PDF generation but open print dialog
      await generateQuotationPDF({
        client,
        quotationMeta,
        mainItems,
        additionalItems,
        settings,
        totals: getTotals(),
      });

      toast({
        title: 'PDF Ready',
        description: 'Open the downloaded PDF and press Ctrl+P to print.',
      });
    } catch (error) {
      console.error('Print error:', error);
      toast({
        variant: 'destructive',
        title: 'Print Failed',
        description: 'Could not prepare document for printing.',
      });
    } finally {
      setGeneratingPdf(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header Bar */}
      <header className="sticky top-0 z-40 bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 py-2 sm:py-3">
          {/* Mobile: Two rows, Desktop: Single row */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            {/* Left: Brand + Doc Info */}
            <div className="flex items-center justify-between sm:justify-start gap-3 sm:gap-6">
              {/* Brand */}
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 sm:w-9 sm:h-9 bg-gradient-to-br from-amber-500 to-yellow-500 rounded-lg flex items-center justify-center shadow-md">
                  <Zap className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                </div>
                <h1 className="text-base sm:text-lg font-semibold text-slate-800">Quick Quote</h1>
              </div>

              {/* Date & Quote Number - inline on mobile, larger on desktop */}
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="flex items-center gap-1 sm:gap-2">
                  <Label className="text-[10px] sm:text-xs text-slate-500 hidden xs:inline">Date</Label>
                  <Input
                    type="date"
                    value={quotationMeta.date}
                    onChange={(e) => setQuotationDate(e.target.value)}
                    className="h-7 sm:h-8 w-28 sm:w-36 text-xs sm:text-sm"
                  />
                </div>
                <div className="flex items-center gap-1 sm:gap-2">
                  <Label className="text-[10px] sm:text-xs text-slate-500 hidden xs:inline">#</Label>
                  <Input
                    value={quotationMeta.number}
                    onChange={(e) => setQuotationNumber(e.target.value)}
                    className="h-7 sm:h-8 w-20 sm:w-32 font-mono text-xs sm:text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Right: Actions - scrollable on mobile */}
            <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto scrollbar-hide -mx-2 px-2 sm:mx-0 sm:px-0">
              {/* Undo/Redo */}
              <div className="flex items-center border-r pr-1 sm:pr-2 mr-1 sm:mr-2 flex-shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 sm:h-8 sm:w-8"
                  onClick={undo}
                  disabled={!canUndo()}
                  title="Undo (Ctrl+Z)"
                >
                  <Undo2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 sm:h-8 sm:w-8"
                  onClick={redo}
                  disabled={!canRedo()}
                  title="Redo (Ctrl+Y)"
                >
                  <Redo2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </Button>
              </div>

              {/* New */}
              <Button variant="outline" size="sm" onClick={handleNewQuotation} className="h-7 sm:h-8 px-2 sm:px-3 flex-shrink-0">
                <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-1" />
                <span className="hidden sm:inline">New</span>
              </Button>

              {/* Duplicate */}
              <Button variant="outline" size="sm" onClick={handleDuplicateQuotation} className="h-7 sm:h-8 px-2 sm:px-3 flex-shrink-0" title="Duplicate for new client">
                <Copy className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-1" />
                <span className="hidden lg:inline">Duplicate</span>
              </Button>

              {/* Shortcuts */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveDialog('shortcuts')}
                className="h-7 sm:h-8 px-2 sm:px-3 flex-shrink-0"
              >
                <Keyboard className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-1" />
                <span className="hidden md:inline">Shortcuts</span>
              </Button>

              {/* Clients */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveDialog('clients')}
                className="h-7 sm:h-8 px-2 sm:px-3 flex-shrink-0"
              >
                <FolderOpen className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-1" />
                <span className="hidden md:inline">Saved</span>
              </Button>

              {/* Bank */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveDialog('bank')}
                className="h-7 sm:h-8 px-2 sm:px-3 flex-shrink-0"
              >
                <Building className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-1" />
                <span className="hidden md:inline">Bank</span>
              </Button>

              {/* WhatsApp Share */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleWhatsAppShare}
                className="h-7 sm:h-8 px-2 sm:px-3 flex-shrink-0 text-green-600 border-green-200 hover:bg-green-50 hover:text-green-700"
                title="Share via WhatsApp"
              >
                <Share2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-1" />
                <span className="hidden lg:inline">WhatsApp</span>
              </Button>

              {/* Print */}
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
                disabled={ui.isGeneratingPdf}
                className="h-7 sm:h-8 px-2 sm:px-3 flex-shrink-0"
                title="Print quotation"
              >
                <Printer className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-1" />
                <span className="hidden lg:inline">Print</span>
              </Button>

              {/* Export PDF */}
              <Button
                onClick={handleExportPDF}
                disabled={ui.isGeneratingPdf}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 h-7 sm:h-8 px-2 sm:px-3 flex-shrink-0"
              >
                <FileDown className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-1" />
                <span className="hidden sm:inline">{ui.isGeneratingPdf ? 'Generating...' : 'Export PDF'}</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-2 sm:px-4 py-2 sm:py-3 space-y-2 sm:space-y-3">
        {/* Top: Client Info */}
        <ClientInfoCard />

        {/* Middle: Quotation Table */}
        <QuotationTable />

        {/* Bottom: Summary + Payment Schedule (stacked) */}
        <div className="space-y-2">
          <SummaryPanel />
          <PaymentStages />
        </div>
      </main>

      {/* Desktop Footer - Hidden on mobile */}
      <footer className="hidden sm:block border-t bg-white mt-4">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 py-2">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-1 text-[10px] sm:text-xs text-slate-500">
            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
              <span>{settings.contactInfo.phone}</span>
              <span className="hidden xs:inline">{settings.contactInfo.email}</span>
              <span className="hidden sm:inline">{settings.contactInfo.location}</span>
            </div>
            <div className="text-slate-400 sm:text-slate-500">
              Auto-saved · <kbd className="px-1 py-0.5 bg-slate-100 rounded text-[10px]">Ctrl+S</kbd>
            </div>
          </div>
        </div>
      </footer>

      {/* Mobile Sticky Bottom Bar - Quick Actions */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg z-50">
        <div className="flex items-center justify-around py-2 px-3 max-w-md mx-auto">
          {/* WhatsApp */}
          <button
            onClick={handleWhatsAppShare}
            className="flex flex-col items-center justify-center w-14 h-14 rounded-full bg-green-50 text-green-600 active:bg-green-100 transition-colors"
            title="Share via WhatsApp"
          >
            <Share2 className="h-5 w-5" />
            <span className="text-[9px] font-medium mt-0.5">WhatsApp</span>
          </button>

          {/* PDF Export */}
          <button
            onClick={handleExportPDF}
            disabled={ui.isGeneratingPdf}
            className="flex flex-col items-center justify-center w-14 h-14 rounded-full bg-blue-50 text-blue-600 active:bg-blue-100 transition-colors disabled:opacity-50"
            title="Export PDF"
          >
            <FileDown className="h-5 w-5" />
            <span className="text-[9px] font-medium mt-0.5">PDF</span>
          </button>

          {/* Saved Clients */}
          <button
            onClick={() => setActiveDialog('clients')}
            className="flex flex-col items-center justify-center w-14 h-14 rounded-full bg-amber-50 text-amber-600 active:bg-amber-100 transition-colors"
            title="Saved Clients"
          >
            <FolderOpen className="h-5 w-5" />
            <span className="text-[9px] font-medium mt-0.5">Saved</span>
          </button>

          {/* New Quote */}
          <button
            onClick={handleNewQuotation}
            className="flex flex-col items-center justify-center w-14 h-14 rounded-full bg-slate-100 text-slate-600 active:bg-slate-200 transition-colors"
            title="New Quotation"
          >
            <Plus className="h-5 w-5" />
            <span className="text-[9px] font-medium mt-0.5">New</span>
          </button>
        </div>
      </div>

      {/* Mobile bottom bar spacer */}
      <div className="sm:hidden h-20" />

      {/* Dialogs */}
      <ClientManagerDialog />
      <BankAccountDialog />
      <ShortcutsDialog />
    </div>
  );
}

export default function QuickQuotationPage() {
  return (
    <QuickQuotationErrorBoundary>
      <QuickQuotationContent />
    </QuickQuotationErrorBoundary>
  );
}
