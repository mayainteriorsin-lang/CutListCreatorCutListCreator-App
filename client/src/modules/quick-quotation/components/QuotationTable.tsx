/**
 * Quick Quotation Module - Quotation Table
 *
 * Main table component for quotation items with floor/room/item hierarchy.
 */

import { useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, FileText, Building2, Home, ChevronDown, ChevronUp } from 'lucide-react';
import { useMainItems, useAdditionalItems, useQuickQuotationStore, useShortcuts, useUI } from '../store/quickQuotationStore';
import { QuotationItemRow } from './QuotationItemRow';
import { QuickEntryInput } from './QuickEntryInput';
import { formatCurrency } from '../constants';
import type { QuotationRow } from '../types';

function TableHeader() {
  return (
    <thead>
      <tr className="bg-slate-50 text-[10px] text-slate-500 uppercase">
        <th className="py-1.5 px-1 text-center w-10">#</th>
        <th className="py-1.5 px-1 text-left">Description</th>
        <th className="py-1.5 px-2 text-center w-20">H</th>
        <th className="py-1.5 px-2 text-center w-20">W</th>
        <th className="py-1.5 px-2 text-center w-20">Sqft</th>
        <th className="py-1.5 px-2 text-center w-24">Rate</th>
        <th className="py-1.5 px-2 text-center w-28">Amount</th>
        <th className="py-1.5 px-2 text-center w-16">Qty</th>
        <th className="py-1.5 px-2 text-right w-28">Total</th>
        <th className="py-1.5 px-1 w-16"></th>
      </tr>
    </thead>
  );
}

interface QuotationSectionProps {
  title: string;
  items: QuotationRow[];
  isAdditional?: boolean;
  total: number;
}

function QuotationSection({ title, items, isAdditional = false, total }: QuotationSectionProps) {
  const shortcuts = useShortcuts();
  const addFloor = useQuickQuotationStore(state => state.addFloor);
  const addRoom = useQuickQuotationStore(state => state.addRoom);
  const addItem = useQuickQuotationStore(state => state.addItem);

  // Ref to track the last row for auto-scroll
  const lastRowRef = useRef<HTMLTableRowElement>(null);
  const prevItemsLengthRef = useRef(items.length);

  // Auto-scroll to bottom when new items are added
  useEffect(() => {
    if (items.length > prevItemsLengthRef.current && lastRowRef.current) {
      lastRowRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    prevItemsLengthRef.current = items.length;
  }, [items.length]);

  // Count items for numbering (only actual items, not floors/rooms)
  let itemNumber = 0;

  const handleAddFloor = (value: string) => {
    if (value === '__custom__') {
      addFloor('NEW FLOOR', isAdditional);
    } else {
      addFloor(shortcuts.floors[value] || value, isAdditional);
    }
  };

  const handleAddRoom = (value: string) => {
    if (value === '__custom__') {
      addRoom('NEW ROOM', isAdditional);
    } else {
      addRoom(shortcuts.rooms[value] || value, isAdditional);
    }
  };

  const handleAddItem = () => {
    addItem({ name: '', qty: 1 }, isAdditional);
  };

  return (
    <Card>
      <CardContent className="p-0">
        {/* Compact Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b bg-slate-50">
          <div className="flex items-center gap-2 text-slate-600">
            <FileText className="h-3.5 w-3.5" />
            <span className="text-xs font-semibold uppercase">{title}</span>
            <span className="text-[10px] text-slate-400">
              ({items.filter(i => i.type === 'item').length})
            </span>
          </div>
          <span className="text-sm font-bold text-slate-800">
            ₹{formatCurrency(total)}
          </span>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <TableHeader />
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-6 text-center text-slate-400 text-sm">
                    No items yet. Use quick entry below.
                  </td>
                </tr>
              ) : (
                items.map((row, index) => {
                  if (row.type === 'item') {
                    itemNumber++;
                  }
                  const isLastRow = index === items.length - 1;
                  return (
                    <QuotationItemRow
                      key={row.id}
                      row={row}
                      index={index}
                      itemNumber={row.type === 'item' ? itemNumber : undefined}
                      ref={isLastRow ? lastRowRef : undefined}
                    />
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Quick Actions Bar - compact */}
        <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border-t">
          <div className="flex-1">
            <QuickEntryInput isAdditional={isAdditional} />
          </div>

          {/* Floor Selector */}
          <Select onValueChange={handleAddFloor}>
            <SelectTrigger className="w-28 h-8 text-xs">
              <Building2 className="h-3.5 w-3.5 mr-1 text-slate-400" />
              <SelectValue placeholder="Floor" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(shortcuts.floors).map(([code, name]) => (
                <SelectItem key={code} value={code}>
                  <span className="font-mono text-[10px] bg-slate-100 px-1 rounded mr-1">{code}</span>
                  {name}
                </SelectItem>
              ))}
              <SelectItem value="__custom__">+ Custom</SelectItem>
            </SelectContent>
          </Select>

          {/* Room Selector */}
          <Select onValueChange={handleAddRoom}>
            <SelectTrigger className="w-28 h-8 text-xs">
              <Home className="h-3.5 w-3.5 mr-1 text-slate-400" />
              <SelectValue placeholder="Room" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(shortcuts.rooms).map(([code, name]) => (
                <SelectItem key={code} value={code}>
                  <span className="font-mono text-[10px] bg-slate-100 px-1 rounded mr-1">{code}</span>
                  {name}
                </SelectItem>
              ))}
              <SelectItem value="__custom__">+ Custom</SelectItem>
            </SelectContent>
          </Select>

          {/* Add Item Button */}
          <Button
            variant="default"
            size="sm"
            className="h-8 text-xs"
            onClick={handleAddItem}
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Item
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function QuotationTable() {
  const mainItems = useMainItems();
  const additionalItems = useAdditionalItems();
  const ui = useUI();
  const toggleAdditionalSection = useQuickQuotationStore(state => state.toggleAdditionalSection);
  const getTotals = useQuickQuotationStore(state => state.getTotals);
  const totals = getTotals();

  return (
    <div className="space-y-2">
      {/* Main Work Section */}
      <QuotationSection
        title="Main Work"
        items={mainItems}
        isAdditional={false}
        total={totals.mainTotal}
      />

      {/* Additional Work Toggle */}
      <Button
        variant="outline"
        className="w-full h-8 text-xs border-dashed"
        onClick={toggleAdditionalSection}
      >
        {ui.additionalSectionVisible ? (
          <>
            <ChevronUp className="h-3.5 w-3.5 mr-1" />
            Hide Additional Work
          </>
        ) : (
          <>
            <ChevronDown className="h-3.5 w-3.5 mr-1" />
            Add Additional Work
          </>
        )}
      </Button>

      {/* Additional Work Section */}
      {ui.additionalSectionVisible && (
        <QuotationSection
          title="Additional Work"
          items={additionalItems}
          isAdditional={true}
          total={totals.additionalTotal}
        />
      )}
    </div>
  );
}
