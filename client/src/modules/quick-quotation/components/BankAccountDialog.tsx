/**
 * Quick Quotation Module - Bank Account Dialog
 *
 * Dialog for managing bank accounts and QR codes.
 */

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trash2, Plus, Building, QrCode } from 'lucide-react';
import { useQuickQuotationStore, useUI, useSettings } from '../store/quickQuotationStore';
import type { BankAccount } from '../types';

export function BankAccountDialog() {
  const ui = useUI();
  const settings = useSettings();
  const closeDialog = useQuickQuotationStore(state => state.closeDialog);
  const addBankAccount = useQuickQuotationStore(state => state.addBankAccount);
  const updateBankAccount = useQuickQuotationStore(state => state.updateBankAccount);
  const deleteBankAccount = useQuickQuotationStore(state => state.deleteBankAccount);
  const setSelectedBank = useQuickQuotationStore(state => state.setSelectedBank);

  const [newAccount, setNewAccount] = useState({
    name: '',
    bank: '',
    accNo: '',
    ifsc: '',
    upi: '',
  });

  const isOpen = ui.activeDialog === 'bank';

  const handleAddAccount = () => {
    if (!newAccount.bank || !newAccount.accNo) return;

    addBankAccount({
      name: newAccount.name || `${newAccount.bank} Account`,
      bank: newAccount.bank,
      accNo: newAccount.accNo,
      ifsc: newAccount.ifsc,
      upi: newAccount.upi,
    });

    setNewAccount({ name: '', bank: '', accNo: '', ifsc: '', upi: '' });
  };

  const handleQrUpload = (accountId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      updateBankAccount(accountId, { qrCode: base64 });
    };
    reader.readAsDataURL(file);
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={() => closeDialog()}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Bank Accounts</DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          {/* Existing Accounts */}
          <RadioGroup
            value={settings.selectedBank.toString()}
            onValueChange={(value) => setSelectedBank(parseInt(value))}
            className="space-y-3 mb-6"
          >
            {settings.bankAccounts.map((account, index) => (
              <div
                key={account.id}
                className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg"
              >
                <RadioGroupItem value={index.toString()} id={account.id} className="mt-1" />
                <div className="flex-1 min-w-0">
                  <Label htmlFor={account.id} className="font-medium cursor-pointer">
                    {account.name}
                  </Label>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 text-xs text-slate-600">
                    <div>
                      <span className="text-slate-400">Bank:</span> {account.bank}
                    </div>
                    <div>
                      <span className="text-slate-400">A/C:</span> {account.accNo}
                    </div>
                    <div>
                      <span className="text-slate-400">IFSC:</span> {account.ifsc}
                    </div>
                    <div>
                      <span className="text-slate-400">UPI:</span> {account.upi}
                    </div>
                  </div>

                  {/* QR Code */}
                  <div className="mt-3 flex items-center gap-3">
                    {account.qrCode ? (
                      <img
                        src={account.qrCode}
                        alt="QR Code"
                        className="w-16 h-16 border rounded object-cover"
                      />
                    ) : (
                      <div className="w-16 h-16 border-2 border-dashed border-slate-300 rounded flex items-center justify-center">
                        <QrCode className="h-6 w-6 text-slate-300" />
                      </div>
                    )}
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleQrUpload(account.id, e)}
                      />
                      <span className="text-xs text-blue-600 hover:underline">
                        {account.qrCode ? 'Change QR' : 'Upload QR'}
                      </span>
                    </label>
                  </div>
                </div>

                {settings.bankAccounts.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-slate-400 hover:text-red-500"
                    onClick={() => deleteBankAccount(account.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </RadioGroup>

          {/* Add New Account */}
          <div className="border-t pt-4">
            <h4 className="text-sm font-medium text-slate-700 mb-3 flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add New Account
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label className="text-xs text-slate-500">Display Name</Label>
                <Input
                  value={newAccount.name}
                  onChange={(e) => setNewAccount(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., HDFC - Business"
                  className="h-9 mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-slate-500">Bank Name</Label>
                <Input
                  value={newAccount.bank}
                  onChange={(e) => setNewAccount(prev => ({ ...prev, bank: e.target.value }))}
                  placeholder="Bank name"
                  className="h-9 mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-slate-500">Account Number</Label>
                <Input
                  value={newAccount.accNo}
                  onChange={(e) => setNewAccount(prev => ({ ...prev, accNo: e.target.value }))}
                  placeholder="Account number"
                  className="h-9 mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-slate-500">IFSC Code</Label>
                <Input
                  value={newAccount.ifsc}
                  onChange={(e) => setNewAccount(prev => ({ ...prev, ifsc: e.target.value }))}
                  placeholder="IFSC code"
                  className="h-9 mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-slate-500">UPI ID</Label>
                <Input
                  value={newAccount.upi}
                  onChange={(e) => setNewAccount(prev => ({ ...prev, upi: e.target.value }))}
                  placeholder="UPI ID"
                  className="h-9 mt-1"
                />
              </div>
              <div className="col-span-2">
                <Button
                  onClick={handleAddAccount}
                  disabled={!newAccount.bank || !newAccount.accNo}
                  className="w-full"
                >
                  <Building className="h-4 w-4 mr-2" />
                  Add Bank Account
                </Button>
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="flex justify-end pt-4 border-t mt-4">
          <Button variant="outline" onClick={() => closeDialog()}>
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
