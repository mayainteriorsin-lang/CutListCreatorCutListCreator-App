/**
 * Quick Quotation Module - Quotation Item Row (Compact)
 *
 * Single row in the quotation table (floor, room, or item).
 */

import { memo, useCallback, forwardRef, useState } from 'react';
import type { SyntheticListenerMap } from '@dnd-kit/core/dist/hooks/utilities';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Trash2, Building2, Home, Plus, StickyNote, GripVertical, Copy, ClipboardPaste, Highlighter } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQuickQuotationStore, useCopiedItem } from '../store/quickQuotationStore';
import { AutocompleteInput } from './AutocompleteInput';
import type { QuotationRow } from '../types';
import { formatCurrency } from '../constants';

interface QuotationItemRowProps {
  row: QuotationRow;
  index: number;
  itemNumber?: number;
  isDragging?: boolean;
  dragHandleProps?: {
    attributes: Record<string, unknown>;
    listeners: SyntheticListenerMap | undefined;
  };
  style?: React.CSSProperties;
  isHighlighted?: boolean;
}

export const QuotationItemRow = memo(forwardRef<HTMLTableRowElement, QuotationItemRowProps>(function QuotationItemRow({
  row,
  index,
  itemNumber,
  isDragging = false,
  dragHandleProps,
  style,
  isHighlighted = false,
}, ref) {
  const updateItem = useQuickQuotationStore(state => state.updateItem);
  const deleteItem = useQuickQuotationStore(state => state.deleteItem);
  const addItemAfter = useQuickQuotationStore(state => state.addItemAfter);
  const copyItem = useQuickQuotationStore(state => state.copyItem);
  const pasteItemAfter = useQuickQuotationStore(state => state.pasteItemAfter);
  const toggleHighlight = useQuickQuotationStore(state => state.toggleHighlight);
  const copiedItem = useCopiedItem();

  const handleFieldChange = useCallback((field: keyof QuotationRow, value: string | number) => {
    updateItem(row.id, { [field]: value });
  }, [row.id, updateItem]);

  const handleDelete = useCallback(() => {
    deleteItem(row.id);
  }, [row.id, deleteItem]);

  const handleCopy = useCallback(() => {
    copyItem(row.id);
  }, [row.id, copyItem]);

  const handlePaste = useCallback(() => {
    pasteItemAfter(row.id);
  }, [row.id, pasteItemAfter]);

  const handleAddItem = useCallback(() => {
    addItemAfter(row.id);
  }, [row.id, addItemAfter]);

  const handleToggleHighlight = useCallback(() => {
    toggleHighlight(row.id);
  }, [row.id, toggleHighlight]);

  // Handle description change with optional rate/amount from autocomplete
  const handleDescriptionChange = useCallback((value: string, suggestion?: { rate?: number; amount?: number }) => {
    const updates: Partial<QuotationRow> = { name: value };
    // If suggestion includes rate or amount, update those too
    if (suggestion?.rate !== undefined) {
      updates.rate = suggestion.rate;
    }
    if (suggestion?.amount !== undefined) {
      updates.amount = suggestion.amount;
    }
    updateItem(row.id, updates);
  }, [row.id, updateItem]);

  // Floor row
  if (row.type === 'floor') {
    return (
      <tr ref={ref} style={style} className={cn("bg-slate-600 text-white", isDragging && "opacity-50 shadow-lg")}>
        {/* Drag Handle */}
        <td
          className="py-1 sm:py-1.5 px-0.5 sm:px-1 cursor-grab active:cursor-grabbing text-white/70 hover:text-white"
          {...(dragHandleProps?.attributes || {})}
          {...(dragHandleProps?.listeners || {})}
        >
          <GripVertical className="h-3 w-3 sm:h-4 sm:w-4" />
        </td>
        <td colSpan={8} className="py-1 sm:py-1.5 px-1 sm:px-2">
          <div className="flex items-center gap-1 sm:gap-2">
            <Building2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            <Input
              value={row.name}
              onChange={(e) => handleFieldChange('name', e.target.value)}
              className="bg-transparent border-0 text-white placeholder:text-white/50 font-semibold uppercase tracking-wide h-5 sm:h-6 text-xs sm:text-sm p-0 focus-visible:ring-0"
              placeholder="Floor name"
            />
          </div>
        </td>
        <td className="py-1 sm:py-1.5 px-1 sm:px-2 text-right text-xs sm:text-sm font-semibold">
          ₹{formatCurrency(Number(row.total) || 0)}
        </td>
        <td className="py-1 sm:py-1.5 px-1">
          <div className="flex items-center gap-0.5 sm:gap-1">
            {/* Note Button for Floor */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-5 w-5 sm:h-6 sm:w-6 hover:bg-white/10",
                    row.note
                      ? "text-orange-300 hover:text-orange-200"
                      : "text-white/70 hover:text-orange-300"
                  )}
                  title={row.note ? "Edit note" : "Add note"}
                >
                  <StickyNote className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-2" align="end">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-600">Note</label>
                  <Textarea
                    value={row.note || ''}
                    onChange={(e) => handleFieldChange('note', e.target.value)}
                    placeholder="Add a note for this floor..."
                    className="min-h-[80px] text-xs resize-none"
                  />
                </div>
              </PopoverContent>
            </Popover>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 sm:h-6 sm:w-6 text-white/70 hover:text-blue-300 hover:bg-white/10"
              onClick={handleCopy}
              title="Copy row"
            >
              <Copy className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            </Button>
            {copiedItem && (
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 sm:h-6 sm:w-6 text-blue-300 hover:text-blue-200 hover:bg-white/10"
                onClick={handlePaste}
                title="Paste after"
              >
                <ClipboardPaste className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 sm:h-6 sm:w-6 text-white/70 hover:text-green-300 hover:bg-white/10"
              onClick={handleAddItem}
              title="Add item"
            >
              <Plus className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 sm:h-6 sm:w-6 text-white/70 hover:text-white hover:bg-white/10"
              onClick={handleDelete}
            >
              <Trash2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            </Button>
          </div>
        </td>
      </tr>
    );
  }

  // Room row
  if (row.type === 'room') {
    return (
      <tr ref={ref} style={style} className={cn("bg-slate-100 border-l-4 border-slate-400", isDragging && "opacity-50 shadow-lg")}>
        {/* Drag Handle */}
        <td
          className="py-1 sm:py-1.5 px-0.5 sm:px-1 cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600"
          {...(dragHandleProps?.attributes || {})}
          {...(dragHandleProps?.listeners || {})}
        >
          <GripVertical className="h-3 w-3 sm:h-4 sm:w-4" />
        </td>
        <td colSpan={8} className="py-1 sm:py-1.5 px-1 sm:px-2 pl-3 sm:pl-6">
          <div className="flex items-center gap-1 sm:gap-2">
            <Home className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-slate-500" />
            <Input
              value={row.name}
              onChange={(e) => handleFieldChange('name', e.target.value)}
              className="bg-transparent border-0 font-semibold text-slate-700 uppercase tracking-wide h-5 sm:h-6 text-xs sm:text-sm p-0 focus-visible:ring-0 w-auto"
              placeholder="Room name"
            />
          </div>
        </td>
        <td className="py-1 sm:py-1.5 px-1 sm:px-2 text-right text-xs sm:text-sm font-semibold text-slate-600">
          ₹{formatCurrency(Number(row.total) || 0)}
        </td>
        <td className="py-1 sm:py-1.5 px-1">
          <div className="flex items-center gap-0.5 sm:gap-1">
            {/* Note Button for Room */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-5 w-5 sm:h-6 sm:w-6",
                    row.note
                      ? "text-orange-500 hover:text-orange-600"
                      : "text-slate-400 hover:text-orange-500"
                  )}
                  title={row.note ? "Edit note" : "Add note"}
                >
                  <StickyNote className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-2" align="end">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-600">Note</label>
                  <Textarea
                    value={row.note || ''}
                    onChange={(e) => handleFieldChange('note', e.target.value)}
                    placeholder="Add a note for this room..."
                    className="min-h-[80px] text-xs resize-none"
                  />
                </div>
              </PopoverContent>
            </Popover>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 sm:h-6 sm:w-6 text-slate-400 hover:text-blue-500"
              onClick={handleCopy}
              title="Copy row"
            >
              <Copy className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            </Button>
            {copiedItem && (
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 sm:h-6 sm:w-6 text-blue-500 hover:text-blue-600"
                onClick={handlePaste}
                title="Paste after"
              >
                <ClipboardPaste className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 sm:h-6 sm:w-6 text-slate-400 hover:text-green-500"
              onClick={handleAddItem}
              title="Add item"
            >
              <Plus className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 sm:h-6 sm:w-6 text-slate-400 hover:text-red-500"
              onClick={handleDelete}
            >
              <Trash2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            </Button>
          </div>
        </td>
      </tr>
    );
  }

  // Item row
  return (
    <tr ref={ref} style={style} className={cn(
      "border-b border-slate-100 hover:bg-slate-50 group",
      !row.name && !row.highlighted && "bg-red-50/50",
      isDragging && "opacity-50 shadow-lg bg-slate-100",
      row.highlighted && "border-l-4 border-l-red-500 bg-red-50/30"
    )}>
      {/* Drag Handle - larger touch target */}
      <td
        className="py-1 sm:py-1.5 px-1 cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500"
        {...(dragHandleProps?.attributes || {})}
        {...(dragHandleProps?.listeners || {})}
      >
        <div className="flex items-center justify-center min-h-[32px] sm:min-h-[36px]">
          <GripVertical className="h-4 w-4 sm:h-5 sm:w-5" />
        </div>
      </td>
      {/* Row number */}
      <td className="py-1 sm:py-1.5 px-1 text-center">
        <span className="w-5 h-5 sm:w-6 sm:h-6 bg-slate-100 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-semibold text-slate-600">
          {itemNumber}
        </span>
      </td>

      {/* Description with Autocomplete */}
      <td className="py-1 sm:py-1.5 px-1">
        <div className="space-y-1">
          <AutocompleteInput
            value={row.name || ''}
            onChange={handleDescriptionChange}
            className="h-8 sm:h-9 text-sm sm:text-sm"
            placeholder="Description (type to search)"
          />
          {row.note && (
            <div className="flex items-start gap-1.5 px-1 py-0.5 bg-orange-50 rounded">
              <StickyNote className="h-3 w-3 text-orange-500 flex-shrink-0 mt-0.5" />
              <span className="text-[10px] sm:text-xs text-orange-700 line-clamp-1">
                {row.note}
              </span>
            </div>
          )}
        </div>
      </td>

      {/* Height */}
      <td className="py-1 sm:py-1.5 px-0.5 sm:px-1">
        <Input
          type="number"
          value={row.height || ''}
          onChange={(e) => handleFieldChange('height', parseFloat(e.target.value) || 0)}
          className="h-8 sm:h-9 text-sm text-center w-full font-medium"
          placeholder="H"
        />
      </td>

      {/* Width */}
      <td className="py-1 sm:py-1.5 px-0.5 sm:px-1">
        <Input
          type="number"
          value={row.width || ''}
          onChange={(e) => handleFieldChange('width', parseFloat(e.target.value) || 0)}
          className="h-8 sm:h-9 text-sm text-center w-full font-medium"
          placeholder="W"
        />
      </td>

      {/* Sqft (calculated) */}
      <td className="py-1 sm:py-1.5 px-0.5 sm:px-1">
        <div className="h-8 sm:h-9 flex items-center justify-center bg-slate-50 rounded-md border border-slate-200 text-sm font-medium text-slate-600">
          {row.sqft ? Number(row.sqft).toFixed(2) : '-'}
        </div>
      </td>

      {/* Rate */}
      <td className="py-1 sm:py-1.5 px-0.5 sm:px-1">
        <Input
          type="number"
          value={row.rate || ''}
          onChange={(e) => handleFieldChange('rate', parseFloat(e.target.value) || 0)}
          className="h-8 sm:h-9 text-sm text-center w-full font-medium"
          placeholder="Rate"
        />
      </td>

      {/* Amount (calculated or direct) */}
      <td className="py-1 sm:py-1.5 px-0.5 sm:px-1">
        <Input
          type="number"
          value={row.amount || ''}
          onChange={(e) => handleFieldChange('amount', parseFloat(e.target.value) || 0)}
          className="h-8 sm:h-9 text-sm text-center w-full font-medium bg-blue-50/50 border-blue-200"
          placeholder="Amount"
        />
      </td>

      {/* Qty */}
      <td className="py-1 sm:py-1.5 px-0.5 sm:px-1">
        <Input
          type="number"
          value={row.qty || 1}
          onChange={(e) => handleFieldChange('qty', parseInt(e.target.value) || 1)}
          className="h-8 sm:h-9 text-sm text-center w-full font-medium"
          min={1}
        />
      </td>

      {/* Total (calculated) - highlighted */}
      <td className="py-1 sm:py-1.5 px-1.5 sm:px-2 text-right">
        <div className="text-sm sm:text-base font-bold text-slate-800">
          {row.total ? `₹${formatCurrency(Number(row.total))}` : '-'}
        </div>
      </td>

      {/* Actions - larger touch targets (48px min) */}
      <td className="py-1 sm:py-1.5 px-1">
        <div className="flex items-center gap-0.5 sm:gap-1">
          {/* Highlight Button */}
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-8 w-8 sm:h-9 sm:w-9 rounded-lg",
              row.highlighted
                ? "text-red-500 hover:text-red-600 bg-red-100"
                : "text-slate-400 hover:text-red-500 hover:bg-red-50"
            )}
            onClick={handleToggleHighlight}
            title={row.highlighted ? "Remove highlight" : "Highlight row (shows in PDF)"}
          >
            <Highlighter className="h-4 w-4" />
          </Button>
          {/* Note Button with Popover */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-8 w-8 sm:h-9 sm:w-9 rounded-lg",
                  row.note
                    ? "text-orange-500 hover:text-orange-600 bg-orange-100"
                    : "text-slate-400 hover:text-orange-500 hover:bg-orange-50"
                )}
                title={row.note ? "Edit note" : "Add note"}
              >
                <StickyNote className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-3" align="end">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Note</label>
                <Textarea
                  value={row.note || ''}
                  onChange={(e) => handleFieldChange('note', e.target.value)}
                  placeholder="Add a note for this item..."
                  className="min-h-[100px] text-sm resize-none"
                />
              </div>
            </PopoverContent>
          </Popover>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-50"
            onClick={handleCopy}
            title="Copy row"
          >
            <Copy className="h-4 w-4" />
          </Button>
          {copiedItem && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg text-blue-500 hover:text-blue-600 bg-blue-50"
              onClick={handlePaste}
              title="Paste after"
            >
              <ClipboardPaste className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg text-slate-400 hover:text-green-500 hover:bg-green-50"
            onClick={handleAddItem}
            title="Add item below"
          >
            <Plus className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50"
            onClick={handleDelete}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </td>
    </tr>
  );
}));
