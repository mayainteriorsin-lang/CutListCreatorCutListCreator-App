/**
 * Quick Quotation Module - Quotation Table
 *
 * Main table component for quotation items with floor/room/item hierarchy.
 */

import { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, FileText, Building2, Home, ChevronDown, ChevronUp, Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useMainItems, useAdditionalItems, useQuickQuotationStore, useShortcuts, useUI } from '../store/quickQuotationStore';
import { SortableRow } from './SortableRow';
import { QuickEntryInput } from './QuickEntryInput';
import { formatCurrency } from '../constants';
import type { QuotationRow } from '../types';

function TableHeader() {
  return (
    <thead>
      <tr className="bg-slate-50 text-[9px] sm:text-[10px] text-slate-500 uppercase">
        <th className="py-1 sm:py-1.5 px-0.5 sm:px-1 w-6 sm:w-8"></th>
        <th className="py-1 sm:py-1.5 px-1 text-center w-8 sm:w-10">#</th>
        <th className="py-1 sm:py-1.5 px-1 text-left min-w-[120px]">Description</th>
        <th className="py-1 sm:py-1.5 px-1 sm:px-2 text-center w-14 sm:w-20">H</th>
        <th className="py-1 sm:py-1.5 px-1 sm:px-2 text-center w-14 sm:w-20">W</th>
        <th className="py-1 sm:py-1.5 px-1 sm:px-2 text-center w-14 sm:w-20">Sqft</th>
        <th className="py-1 sm:py-1.5 px-1 sm:px-2 text-center w-16 sm:w-24">Rate</th>
        <th className="py-1 sm:py-1.5 px-1 sm:px-2 text-center w-20 sm:w-28">Amount</th>
        <th className="py-1 sm:py-1.5 px-1 sm:px-2 text-center w-12 sm:w-16">Qty</th>
        <th className="py-1 sm:py-1.5 px-1 sm:px-2 text-right w-20 sm:w-28">Total</th>
        <th className="py-1 sm:py-1.5 px-1 w-12 sm:w-16"></th>
      </tr>
    </thead>
  );
}

interface QuotationSectionProps {
  title: string;
  items: QuotationRow[];
  isAdditional?: boolean;
  total: number;
  searchTerm?: string;
}

function QuotationSection({ title, items, isAdditional = false, total, searchTerm = '' }: QuotationSectionProps) {
  const shortcuts = useShortcuts();
  const addFloor = useQuickQuotationStore(state => state.addFloor);
  const addRoom = useQuickQuotationStore(state => state.addRoom);
  const addItem = useQuickQuotationStore(state => state.addItem);
  const reorderItems = useQuickQuotationStore(state => state.reorderItems);

  // Ref to track the last row for auto-scroll
  const lastRowRef = useRef<HTMLTableRowElement>(null);
  const prevItemsLengthRef = useRef(items.length);

  // Drag-and-drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement required before drag starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle drag end
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      reorderItems(String(active.id), String(over.id), isAdditional ? 'additional' : 'main');
    }
  }, [reorderItems, isAdditional]);

  // Auto-scroll to bottom when new items are added
  useEffect(() => {
    if (items.length > prevItemsLengthRef.current && lastRowRef.current) {
      lastRowRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    prevItemsLengthRef.current = items.length;
  }, [items.length]);

  // Filter items based on search term
  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) return items;
    const term = searchTerm.toLowerCase();
    return items.filter(item =>
      item.name?.toLowerCase().includes(term) ||
      item.note?.toLowerCase().includes(term) ||
      item.type === 'floor' || // Always show floors for context
      item.type === 'room' // Always show rooms for context
    );
  }, [items, searchTerm]);

  // Count of matching items (excluding floors/rooms)
  const matchCount = useMemo(() => {
    if (!searchTerm.trim()) return 0;
    const term = searchTerm.toLowerCase();
    return items.filter(item =>
      item.type === 'item' &&
      (item.name?.toLowerCase().includes(term) || item.note?.toLowerCase().includes(term))
    ).length;
  }, [items, searchTerm]);

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
        {/* Section Header - improved mobile design */}
        <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 border-b bg-gradient-to-r from-slate-50 to-slate-100">
          <div className="flex items-center gap-2 sm:gap-2.5 text-slate-700">
            <div className="w-7 h-7 sm:w-8 sm:h-8 bg-white rounded-lg shadow-sm flex items-center justify-center">
              <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-500" />
            </div>
            <div>
              <span className="text-xs sm:text-sm font-bold uppercase tracking-wide">{title}</span>
              <div className="flex items-center gap-1.5 text-slate-500">
                <span className="text-[10px] sm:text-xs">
                  {items.filter(i => i.type === 'item').length} items
                </span>
                {searchTerm && matchCount > 0 && (
                  <span className="text-[10px] sm:text-xs text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded-full font-medium">
                    {matchCount} found
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-500 uppercase tracking-wide">Total</div>
            <span className="text-base sm:text-lg font-black text-slate-800">
              ₹{formatCurrency(total)}
            </span>
          </div>
        </div>

        {/* Table */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <div className="overflow-x-auto scrollbar-hide">
            <table className="w-full min-w-[700px] sm:min-w-[900px]">
              <TableHeader />
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-4 sm:py-6 text-center text-slate-400 text-xs sm:text-sm">
                      No items yet. Use quick entry below.
                    </td>
                  </tr>
                ) : filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-4 sm:py-6 text-center text-amber-600 text-xs sm:text-sm">
                      No items match "{searchTerm}"
                    </td>
                  </tr>
                ) : (
                  <SortableContext
                    items={items.map(item => item.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {filteredItems.map((row, index) => {
                      if (row.type === 'item') {
                        itemNumber++;
                      }
                      const isLastRow = index === filteredItems.length - 1;
                      const isMatch = searchTerm && row.type === 'item' &&
                        (row.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         row.note?.toLowerCase().includes(searchTerm.toLowerCase()));
                      return (
                        <SortableRow
                          key={row.id}
                          row={row}
                          index={index}
                          itemNumber={row.type === 'item' ? itemNumber : undefined}
                          ref={isLastRow ? lastRowRef : undefined}
                          isHighlighted={isMatch}
                        />
                      );
                    })}
                  </SortableContext>
                )}
              </tbody>
            </table>
          </div>
        </DndContext>

        {/* Quick Actions Bar - improved mobile layout */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 px-3 sm:px-4 py-3 bg-slate-50 border-t">
          {/* Quick Entry - full width on mobile */}
          <div className="flex-1 order-1 sm:order-none">
            <QuickEntryInput isAdditional={isAdditional} />
          </div>

          {/* Selectors and Button - better touch targets */}
          <div className="flex items-center gap-2 order-2 sm:order-none overflow-x-auto scrollbar-hide">
            {/* Floor Selector - larger on mobile */}
            <Select onValueChange={handleAddFloor}>
              <SelectTrigger className="w-24 sm:w-28 h-10 sm:h-9 text-xs sm:text-xs flex-shrink-0 rounded-xl touch-manipulation">
                <Building2 className="h-4 w-4 sm:h-3.5 sm:w-3.5 mr-1 text-slate-500" />
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
              <SelectTrigger className="w-24 sm:w-28 h-10 sm:h-9 text-xs sm:text-xs flex-shrink-0 rounded-xl touch-manipulation">
                <Home className="h-4 w-4 sm:h-3.5 sm:w-3.5 mr-1 text-slate-500" />
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

            {/* Add Item Button - prominent */}
            <Button
              variant="default"
              size="sm"
              className="h-10 sm:h-9 text-xs px-4 sm:px-3 flex-shrink-0 rounded-xl touch-manipulation shadow-sm"
              onClick={handleAddItem}
            >
              <Plus className="h-4 w-4 sm:h-3.5 sm:w-3.5 mr-1" />
              Item
            </Button>
          </div>
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
  const [searchTerm, setSearchTerm] = useState('');

  const totalItemCount = mainItems.filter(i => i.type === 'item').length +
                         additionalItems.filter(i => i.type === 'item').length;

  return (
    <div className="space-y-3">
      {/* Search Bar - only show if there are items */}
      {totalItemCount > 3 && (
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <Input
            type="text"
            placeholder="Search items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-11 pr-11 h-12 sm:h-10 text-base sm:text-sm rounded-xl"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      )}

      {/* Main Work Section */}
      <QuotationSection
        title="Main Work"
        items={mainItems}
        isAdditional={false}
        total={totals.mainTotal}
        searchTerm={searchTerm}
      />

      {/* Additional Work Toggle */}
      <Button
        variant="outline"
        className="w-full h-7 sm:h-8 text-[10px] sm:text-xs border-dashed"
        onClick={toggleAdditionalSection}
      >
        {ui.additionalSectionVisible ? (
          <>
            <ChevronUp className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1" />
            <span className="hidden xs:inline">Hide</span> Additional Work
          </>
        ) : (
          <>
            <ChevronDown className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1" />
            <span className="hidden xs:inline">Add</span> Additional Work
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
          searchTerm={searchTerm}
        />
      )}
    </div>
  );
}
