/**
 * Quick Quotation Module - Client Manager Dialog
 *
 * Dialog for saving and loading saved quotations.
 */

import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, User, Calendar, Trash2, Upload, Download } from 'lucide-react';
import { useQuickQuotationStore, useUI, useQuotationMeta } from '../store/quickQuotationStore';
import { useToast } from '@/hooks/use-toast';

export function ClientManagerDialog() {
  const ui = useUI();
  const quotationMeta = useQuotationMeta();
  const closeDialog = useQuickQuotationStore(state => state.closeDialog);
  const saveAsClient = useQuickQuotationStore(state => state.saveAsClient);
  const loadSavedClient = useQuickQuotationStore(state => state.loadSavedClient);
  const deleteSavedClient = useQuickQuotationStore(state => state.deleteSavedClient);
  const getSavedClients = useQuickQuotationStore(state => state.getSavedClients);

  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();

  const isOpen = ui.activeDialog === 'clients';
  const clients = getSavedClients();

  const filteredClients = useMemo(() => {
    if (!searchQuery.trim()) return clients;
    const query = searchQuery.toLowerCase();
    return clients.filter(c =>
      c.clientName.toLowerCase().includes(query) ||
      c.quoteNumber.toLowerCase().includes(query)
    );
  }, [clients, searchQuery]);

  const handleSave = () => {
    const success = saveAsClient(quotationMeta.number);
    if (success) {
      toast({
        title: 'Quotation Saved',
        description: `Saved as ${quotationMeta.number}`,
      });
    } else {
      toast({
        variant: 'destructive',
        title: 'Save Failed',
        description: 'Could not save the quotation.',
      });
    }
  };

  const handleLoad = (quoteNumber: string) => {
    const success = loadSavedClient(quoteNumber);
    if (success) {
      toast({
        title: 'Quotation Loaded',
        description: `Loaded ${quoteNumber}`,
      });
      closeDialog();
    } else {
      toast({
        variant: 'destructive',
        title: 'Load Failed',
        description: 'Could not load the quotation.',
      });
    }
  };

  const handleDelete = (quoteNumber: string) => {
    if (!confirm(`Delete quotation ${quoteNumber}?`)) return;

    const success = deleteSavedClient(quoteNumber);
    if (success) {
      toast({
        title: 'Quotation Deleted',
        description: `Deleted ${quoteNumber}`,
      });
    }
  };

  const formatDate = (isoString: string) => {
    try {
      return new Date(isoString).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return isoString;
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={() => closeDialog()}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Saved Quotations</span>
            <span className="text-sm font-normal text-slate-500">
              {clients.length} saved
            </span>
          </DialogTitle>
        </DialogHeader>

        {/* Save Current Button */}
        <Button onClick={handleSave} className="w-full mb-3">
          <Download className="h-4 w-4 mr-2" />
          Save Current Quotation ({quotationMeta.number})
        </Button>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by client or quote number..."
            className="pl-9"
          />
        </div>

        {/* Client List */}
        <ScrollArea className="flex-1 -mx-6 px-6">
          {filteredClients.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <User className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No saved quotations found.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredClients.map((client) => (
                <div
                  key={client.quoteNumber}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-slate-800 truncate">
                      {client.clientName || 'Unnamed Client'}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                      <span className="font-mono">{client.quoteNumber}</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(client.savedAt)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleLoad(client.quoteNumber)}
                    >
                      <Upload className="h-3.5 w-3.5 mr-1" />
                      Load
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-slate-400 hover:text-red-500"
                      onClick={() => handleDelete(client.quoteNumber)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        <div className="flex justify-end pt-4 border-t mt-4">
          <Button variant="outline" onClick={() => closeDialog()}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
