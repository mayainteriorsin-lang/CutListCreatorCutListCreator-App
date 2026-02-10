/**
 * Quick Quotation Module - Shortcuts Dialog (Full Page)
 *
 * Full page dialog for managing floor/room/item shortcuts with edit support.
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trash2, Plus, Building2, Home, Package, RotateCcw, X, Keyboard, Pencil, Check } from 'lucide-react';
import { useQuickQuotationStore, useUI, useShortcuts } from '../store/quickQuotationStore';

type ShortcutType = 'floors' | 'rooms' | 'items';

interface EditingState {
  code: string;
  type: ShortcutType;
  name: string;
  rate: string;
  amount: string;
}

export function ShortcutsDialog() {
  const ui = useUI();
  const shortcuts = useShortcuts();
  const closeDialog = useQuickQuotationStore(state => state.closeDialog);
  const addShortcut = useQuickQuotationStore(state => state.addShortcut);
  const deleteShortcut = useQuickQuotationStore(state => state.deleteShortcut);
  const resetShortcuts = useQuickQuotationStore(state => state.resetShortcuts);

  const [activeTab, setActiveTab] = useState<ShortcutType>('floors');
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newRate, setNewRate] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [editing, setEditing] = useState<EditingState | null>(null);

  const isOpen = ui.activeDialog === 'shortcuts';

  const handleAdd = () => {
    if (!newCode.trim() || !newName.trim()) return;

    if (activeTab === 'items') {
      addShortcut('items', newCode, {
        name: newName,
        rate: parseFloat(newRate) || undefined,
        amount: parseFloat(newAmount) || undefined
      });
    } else {
      addShortcut(activeTab, newCode, newName);
    }

    setNewCode('');
    setNewName('');
    setNewRate('');
    setNewAmount('');
  };

  const handleReset = () => {
    if (confirm('Reset all shortcuts to defaults? This will remove any custom shortcuts.')) {
      resetShortcuts();
    }
  };

  const startEditing = (type: ShortcutType, code: string, value: string | { name: string; rate?: number; amount?: number }) => {
    if (type === 'items') {
      const itemValue = value as { name: string; rate?: number; amount?: number };
      setEditing({
        code,
        type,
        name: itemValue.name,
        rate: itemValue.rate?.toString() || '',
        amount: itemValue.amount?.toString() || ''
      });
    } else {
      setEditing({ code, type, name: value as string, rate: '', amount: '' });
    }
  };

  const saveEdit = () => {
    if (!editing || !editing.name.trim()) return;

    if (editing.type === 'items') {
      addShortcut('items', editing.code, {
        name: editing.name,
        rate: parseFloat(editing.rate) || undefined,
        amount: parseFloat(editing.amount) || undefined
      });
    } else {
      addShortcut(editing.type, editing.code, editing.name);
    }

    setEditing(null);
  };

  const cancelEdit = () => {
    setEditing(null);
  };

  const renderShortcutList = (type: ShortcutType) => {
    const entries = Object.entries(
      type === 'items' ? shortcuts.items : shortcuts[type]
    );

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
        {entries.map(([code, value]) => {
          const isEditing = editing?.code === code && editing?.type === type;

          if (isEditing) {
            return (
              <div
                key={code}
                className="p-2 bg-blue-50 border-2 border-blue-300 rounded-lg space-y-2"
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded font-bold uppercase">
                    {code}
                  </span>
                  <Input
                    value={editing.name}
                    onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                    className="h-7 text-sm flex-1"
                    placeholder="Name"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveEdit();
                      if (e.key === 'Escape') cancelEdit();
                    }}
                  />
                </div>
                {type === 'items' && (
                  <div className="flex items-center gap-2 pl-12">
                    <span className="text-xs text-slate-500">Rate:</span>
                    <Input
                      type="number"
                      value={editing.rate}
                      onChange={(e) => setEditing({ ...editing, rate: e.target.value })}
                      className="h-7 text-sm w-20"
                      placeholder="0"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveEdit();
                        if (e.key === 'Escape') cancelEdit();
                      }}
                    />
                    <span className="text-xs text-slate-500">Amount:</span>
                    <Input
                      type="number"
                      value={editing.amount}
                      onChange={(e) => setEditing({ ...editing, amount: e.target.value })}
                      className="h-7 text-sm w-24"
                      placeholder="0"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveEdit();
                        if (e.key === 'Escape') cancelEdit();
                      }}
                    />
                  </div>
                )}
                <div className="flex justify-end gap-1">
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={cancelEdit}>
                    Cancel
                  </Button>
                  <Button size="sm" className="h-7 text-xs" onClick={saveEdit}>
                    Save
                  </Button>
                </div>
              </div>
            );
          }

          return (
            <div
              key={code}
              className="flex items-center justify-between p-2 bg-white border rounded-lg hover:border-slate-300 transition-colors group"
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className="font-mono text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded font-bold uppercase flex-shrink-0">
                  {code}
                </span>
                <span className="text-sm truncate">
                  {type === 'items'
                    ? `${(value as { name: string; rate?: number; amount?: number }).name}`
                    : (value as string)}
                </span>
                {type === 'items' && (
                  <span className="text-xs text-slate-500 flex-shrink-0">
                    {(value as { name: string; rate?: number; amount?: number }).rate && `R:₹${(value as { name: string; rate?: number; amount?: number }).rate}`}
                    {(value as { name: string; rate?: number; amount?: number }).rate && (value as { name: string; rate?: number; amount?: number }).amount && ' · '}
                    {(value as { name: string; rate?: number; amount?: number }).amount && `A:₹${(value as { name: string; rate?: number; amount?: number }).amount}`}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-slate-400 hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => startEditing(type, code, value)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => deleteShortcut(type, code)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          );
        })}
        {entries.length === 0 && (
          <p className="col-span-full text-center text-slate-400 py-8">
            No shortcuts defined. Add one above.
          </p>
        )}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-lg flex items-center justify-center shadow-md">
                <Keyboard className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-slate-800">Manage Shortcuts</h1>
                <p className="text-xs text-slate-500">Define quick codes for floors, rooms, and items</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={handleReset} className="text-slate-500">
                <RotateCcw className="h-4 w-4 mr-1" />
                Reset
              </Button>
              <Button variant="outline" onClick={() => closeDialog()}>
                <X className="h-4 w-4 mr-1" />
                Close
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-4">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ShortcutType)}>
          {/* Tab Navigation */}
          <div className="flex items-center justify-between mb-4">
            <TabsList className="grid grid-cols-3 w-auto">
              <TabsTrigger value="floors" className="flex items-center gap-1.5 px-6">
                <Building2 className="h-4 w-4" />
                Floors
                <span className="text-xs bg-slate-200 px-1.5 rounded ml-1">
                  {Object.keys(shortcuts.floors).length}
                </span>
              </TabsTrigger>
              <TabsTrigger value="rooms" className="flex items-center gap-1.5 px-6">
                <Home className="h-4 w-4" />
                Rooms
                <span className="text-xs bg-slate-200 px-1.5 rounded ml-1">
                  {Object.keys(shortcuts.rooms).length}
                </span>
              </TabsTrigger>
              <TabsTrigger value="items" className="flex items-center gap-1.5 px-6">
                <Package className="h-4 w-4" />
                Items
                <span className="text-xs bg-slate-200 px-1.5 rounded ml-1">
                  {Object.keys(shortcuts.items).length}
                </span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Add New Shortcut Form */}
          <Card className="mb-4">
            <CardContent className="p-3">
              <div className="flex items-end gap-3">
                <div className="w-24">
                  <Label className="text-xs text-slate-500">Code</Label>
                  <Input
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value.slice(0, 4))}
                    placeholder="e.g., gf"
                    className="h-9 mt-1 font-mono uppercase"
                    maxLength={4}
                    onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                  />
                </div>
                <div className="flex-1">
                  <Label className="text-xs text-slate-500">Name</Label>
                  <Input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder={activeTab === 'items' ? 'Item name' : `${activeTab.slice(0, -1)} name`}
                    className="h-9 mt-1"
                    onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                  />
                </div>
                {activeTab === 'items' && (
                  <>
                    <div className="w-28">
                      <Label className="text-xs text-slate-500">Rate (₹)</Label>
                      <Input
                        type="number"
                        value={newRate}
                        onChange={(e) => setNewRate(e.target.value)}
                        placeholder="Rate"
                        className="h-9 mt-1"
                        onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                      />
                    </div>
                    <div className="w-28">
                      <Label className="text-xs text-slate-500">Amount (₹)</Label>
                      <Input
                        type="number"
                        value={newAmount}
                        onChange={(e) => setNewAmount(e.target.value)}
                        placeholder="Amount"
                        className="h-9 mt-1"
                        onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                      />
                    </div>
                  </>
                )}
                <Button
                  onClick={handleAdd}
                  disabled={!newCode.trim() || !newName.trim()}
                  className="h-9"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Shortcut Lists */}
          <Card>
            <CardContent className="p-4">
              <TabsContent value="floors" className="mt-0">
                <div className="mb-3 text-sm text-slate-500">
                  Floor shortcuts help you quickly add floor sections (e.g., type "gf" for Ground Floor)
                </div>
                {renderShortcutList('floors')}
              </TabsContent>
              <TabsContent value="rooms" className="mt-0">
                <div className="mb-3 text-sm text-slate-500">
                  Room shortcuts let you add rooms quickly (e.g., type "mbr" for Master Bedroom)
                </div>
                {renderShortcutList('rooms')}
              </TabsContent>
              <TabsContent value="items" className="mt-0">
                <div className="mb-3 text-sm text-slate-500">
                  Item shortcuts auto-fill item names and rates (e.g., type "tv" for TV Unit @ ₹80000)
                </div>
                {renderShortcutList('items')}
              </TabsContent>
            </CardContent>
          </Card>

          {/* Tips */}
          <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-lg">
            <h3 className="text-sm font-medium text-blue-800 mb-1">Quick Tips</h3>
            <ul className="text-xs text-blue-700 space-y-1">
              <li>• Type the shortcut code in the quick entry input and press Enter to add it</li>
              <li>• Shortcuts are case-insensitive (GF = gf = Gf)</li>
              <li>• Hover over a shortcut to edit or delete it</li>
              <li>• Press Enter to save edits, Escape to cancel</li>
            </ul>
          </div>
        </Tabs>
      </main>
    </div>
  );
}
