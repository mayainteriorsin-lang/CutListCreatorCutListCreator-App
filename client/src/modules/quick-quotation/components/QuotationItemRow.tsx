/**
 * Quick Quotation Module - Quotation Item Row (Compact)
 *
 * Single row in the quotation table (floor, room, or item).
 */

import { memo, useCallback, forwardRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Trash2, Building2, Home, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQuickQuotationStore } from '../store/quickQuotationStore';
import type { QuotationRow } from '../types';
import { formatCurrency } from '../constants';

interface QuotationItemRowProps {
  row: QuotationRow;
  index: number;
  itemNumber?: number;
}

export const QuotationItemRow = memo(forwardRef<HTMLTableRowElement, QuotationItemRowProps>(function QuotationItemRow({
  row,
  index,
  itemNumber,
}, ref) {
  const updateItem = useQuickQuotationStore(state => state.updateItem);
  const deleteItem = useQuickQuotationStore(state => state.deleteItem);
  const addItemAfter = useQuickQuotationStore(state => state.addItemAfter);

  const handleFieldChange = useCallback((field: keyof QuotationRow, value: string | number) => {
    updateItem(row.id, { [field]: value });
  }, [row.id, updateItem]);

  const handleDelete = useCallback(() => {
    deleteItem(row.id);
  }, [row.id, deleteItem]);

  const handleAddItem = useCallback(() => {
    addItemAfter(row.id);
  }, [row.id, addItemAfter]);

  // Floor row
  if (row.type === 'floor') {
    return (
      <tr ref={ref} className="bg-slate-600 text-white">
        <td colSpan={8} className="py-1.5 px-2">
          <div className="flex items-center gap-2">
            <Building2 className="h-3.5 w-3.5" />
            <Input
              value={row.name}
              onChange={(e) => handleFieldChange('name', e.target.value)}
              className="bg-transparent border-0 text-white placeholder:text-white/50 font-semibold uppercase tracking-wide h-6 text-sm p-0 focus-visible:ring-0"
              placeholder="Floor name"
            />
          </div>
        </td>
        <td className="py-1.5 px-2 text-right text-sm font-semibold">
          ₹{formatCurrency(Number(row.total) || 0)}
        </td>
        <td className="py-1.5 px-1">
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-white/70 hover:text-green-300 hover:bg-white/10"
              onClick={handleAddItem}
              title="Add item"
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-white/70 hover:text-white hover:bg-white/10"
              onClick={handleDelete}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </td>
      </tr>
    );
  }

  // Room row
  if (row.type === 'room') {
    return (
      <tr ref={ref} className="bg-slate-100 border-l-4 border-slate-400">
        <td colSpan={8} className="py-1.5 px-2 pl-6">
          <div className="flex items-center gap-2">
            <Home className="h-3.5 w-3.5 text-slate-500" />
            <Input
              value={row.name}
              onChange={(e) => handleFieldChange('name', e.target.value)}
              className="bg-transparent border-0 font-semibold text-slate-700 uppercase tracking-wide h-6 text-sm p-0 focus-visible:ring-0 w-auto"
              placeholder="Room name"
            />
          </div>
        </td>
        <td className="py-1.5 px-2 text-right text-sm font-semibold text-slate-600">
          ₹{formatCurrency(Number(row.total) || 0)}
        </td>
        <td className="py-1.5 px-1">
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-slate-400 hover:text-green-500"
              onClick={handleAddItem}
              title="Add item"
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-slate-400 hover:text-red-500"
              onClick={handleDelete}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </td>
      </tr>
    );
  }

  // Item row
  return (
    <tr ref={ref} className={cn(
      "border-b border-slate-100 hover:bg-slate-50 group",
      !row.name && "bg-red-50/50"
    )}>
      {/* Row number */}
      <td className="py-1 px-1 text-center">
        <span className="w-5 h-5 bg-slate-100 rounded-full flex items-center justify-center text-[10px] font-medium text-slate-500">
          {itemNumber}
        </span>
      </td>

      {/* Description */}
      <td className="py-1 px-1">
        <Input
          value={row.name || ''}
          onChange={(e) => handleFieldChange('name', e.target.value)}
          className="h-7 text-xs"
          placeholder="Description"
        />
      </td>

      {/* Height */}
      <td className="py-1 px-1">
        <Input
          type="number"
          value={row.height || ''}
          onChange={(e) => handleFieldChange('height', parseFloat(e.target.value) || 0)}
          className="h-7 text-xs text-center w-full"
          placeholder="H"
        />
      </td>

      {/* Width */}
      <td className="py-1 px-1">
        <Input
          type="number"
          value={row.width || ''}
          onChange={(e) => handleFieldChange('width', parseFloat(e.target.value) || 0)}
          className="h-7 text-xs text-center w-full"
          placeholder="W"
        />
      </td>

      {/* Sqft (calculated) */}
      <td className="py-1 px-1">
        <Input
          value={row.sqft ? Number(row.sqft).toFixed(2) : ''}
          className="h-7 text-xs text-center w-full bg-slate-50"
          placeholder="-"
          readOnly
        />
      </td>

      {/* Rate */}
      <td className="py-1 px-1">
        <Input
          type="number"
          value={row.rate || ''}
          onChange={(e) => handleFieldChange('rate', parseFloat(e.target.value) || 0)}
          className="h-7 text-xs text-center w-full"
          placeholder="Rate"
        />
      </td>

      {/* Amount (calculated or direct) */}
      <td className="py-1 px-1">
        <Input
          type="number"
          value={row.amount || ''}
          onChange={(e) => handleFieldChange('amount', parseFloat(e.target.value) || 0)}
          className="h-7 text-xs text-center w-full bg-slate-50"
          placeholder="Amount"
        />
      </td>

      {/* Qty */}
      <td className="py-1 px-1">
        <Input
          type="number"
          value={row.qty || 1}
          onChange={(e) => handleFieldChange('qty', parseInt(e.target.value) || 1)}
          className="h-7 text-xs text-center w-full"
          min={1}
        />
      </td>

      {/* Total (calculated) */}
      <td className="py-1 px-2 text-right text-xs font-semibold text-slate-700">
        {row.total ? `₹${formatCurrency(Number(row.total))}` : '-'}
      </td>

      {/* Actions */}
      <td className="py-1 px-1">
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-slate-400 hover:text-green-500"
            onClick={handleAddItem}
            title="Add item below"
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-slate-400 hover:text-red-500"
            onClick={handleDelete}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </td>
    </tr>
  );
}));
