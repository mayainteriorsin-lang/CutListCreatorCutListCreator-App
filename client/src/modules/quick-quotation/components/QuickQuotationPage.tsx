/**
 * Quick Quotation Module - Main Page Component
 *
 * Complete quotation editor replacing the iframe-based version.
 */

import { useEffect } from 'react';
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
} from 'lucide-react';

import { useQuickQuotationStore, useQuotationMeta, useUI, useSettings } from '../store/quickQuotationStore';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { useAutoSave } from '../hooks/useAutoSave';
import { generateQuotationPDF } from '../engine/pdfGenerator';

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
  const quotationMeta = useQuotationMeta();
  const ui = useUI();
  const settings = useSettings();
  const { toast } = useToast();

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
  const client = useQuickQuotationStore(state => state.client);
  const mainItems = useQuickQuotationStore(state => state.mainItems);
  const additionalItems = useQuickQuotationStore(state => state.additionalItems);
  const getTotals = useQuickQuotationStore(state => state.getTotals);

  // Enable keyboard shortcuts
  useKeyboardShortcuts();

  // Enable auto-save
  useAutoSave();

  // Load saved state on mount
  useEffect(() => {
    loadFromLocalStorage();
  }, [loadFromLocalStorage]);

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
      await generateQuotationPDF({
        client,
        quotationMeta,
        mainItems,
        additionalItems,
        settings,
        totals: getTotals(),
      });
      toast({
        title: 'PDF Exported',
        description: 'Quotation PDF has been downloaded.',
      });
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

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header Bar */}
      <header className="sticky top-0 z-40 bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Left: Brand + Doc Info */}
            <div className="flex items-center gap-6">
              {/* Brand */}
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 bg-gradient-to-br from-amber-500 to-yellow-500 rounded-lg flex items-center justify-center shadow-md">
                  <Zap className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-slate-800">Quick Quote</h1>
                </div>
              </div>

              {/* Date & Quote Number */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-slate-500">Date</Label>
                  <Input
                    type="date"
                    value={quotationMeta.date}
                    onChange={(e) => setQuotationDate(e.target.value)}
                    className="h-8 w-36"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-slate-500">Quote #</Label>
                  <Input
                    value={quotationMeta.number}
                    onChange={(e) => setQuotationNumber(e.target.value)}
                    className="h-8 w-32 font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2">
              {/* Undo/Redo */}
              <div className="flex items-center border-r pr-2 mr-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={undo}
                  disabled={!canUndo()}
                  title="Undo (Ctrl+Z)"
                >
                  <Undo2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={redo}
                  disabled={!canRedo()}
                  title="Redo (Ctrl+Y)"
                >
                  <Redo2 className="h-4 w-4" />
                </Button>
              </div>

              {/* New */}
              <Button variant="outline" size="sm" onClick={handleNewQuotation}>
                <Plus className="h-4 w-4 mr-1" />
                New
              </Button>

              {/* Shortcuts */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveDialog('shortcuts')}
              >
                <Keyboard className="h-4 w-4 mr-1" />
                Shortcuts
              </Button>

              {/* Clients */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveDialog('clients')}
              >
                <FolderOpen className="h-4 w-4 mr-1" />
                Saved
              </Button>

              {/* Bank */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveDialog('bank')}
              >
                <Building className="h-4 w-4 mr-1" />
                Bank
              </Button>

              {/* Export PDF */}
              <Button
                onClick={handleExportPDF}
                disabled={ui.isGeneratingPdf}
                className="bg-gradient-to-r from-blue-600 to-indigo-600"
              >
                <FileDown className="h-4 w-4 mr-1" />
                {ui.isGeneratingPdf ? 'Generating...' : 'Export PDF'}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-3 space-y-3">
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

      {/* Footer */}
      <footer className="border-t bg-white mt-4">
        <div className="max-w-7xl mx-auto px-4 py-2">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center gap-3">
              <span>{settings.contactInfo.phone}</span>
              <span>{settings.contactInfo.email}</span>
              <span>{settings.contactInfo.location}</span>
            </div>
            <div>
              Auto-saved · <kbd className="px-1 py-0.5 bg-slate-100 rounded text-[10px]">Ctrl+S</kbd>
            </div>
          </div>
        </div>
      </footer>

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
