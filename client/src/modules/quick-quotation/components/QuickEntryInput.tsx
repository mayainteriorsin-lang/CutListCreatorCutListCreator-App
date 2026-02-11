/**
 * Quick Quotation Module - Quick Entry Input
 *
 * Input that expands shortcut codes (gf, lr, tv) into full items.
 */

import { useState, useCallback, KeyboardEvent } from 'react';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { useQuickQuotationStore } from '../store/quickQuotationStore';

interface QuickEntryInputProps {
  isAdditional?: boolean;
  placeholder?: string;
}

export function QuickEntryInput({
  isAdditional = false,
  placeholder = "Type shortcut or item name..."
}: QuickEntryInputProps) {
  const [value, setValue] = useState('');

  const expandShortcut = useQuickQuotationStore(state => state.expandShortcut);
  const addFloor = useQuickQuotationStore(state => state.addFloor);
  const addRoom = useQuickQuotationStore(state => state.addRoom);
  const addItem = useQuickQuotationStore(state => state.addItem);

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;

    const input = value.trim();
    if (!input) return;

    // Try to expand shortcut
    const result = expandShortcut(input);

    if (result) {
      switch (result.type) {
        case 'floor':
          addFloor(result.value as string, isAdditional);
          break;
        case 'room':
          addRoom(result.value as string, isAdditional);
          break;
        case 'item':
          const itemData = result.value as { name: string; rate?: number; amount?: number };
          addItem({
            name: itemData.name,
            rate: itemData.rate,
            amount: itemData.amount
          }, isAdditional);
          break;
      }
      setValue('');
    } else {
      // No shortcut match - add as plain item with the input as name
      addItem({ name: input }, isAdditional);
      setValue('');
    }
  }, [value, expandShortcut, addFloor, addRoom, addItem, isAdditional]);

  return (
    <div className="relative flex items-center">
      <Search className="absolute left-2 sm:left-2.5 h-3 w-3 sm:h-3.5 sm:w-3.5 text-slate-400" />
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="pl-7 sm:pl-8 pr-10 sm:pr-14 h-7 sm:h-8 text-[10px] sm:text-xs"
      />
      <span className="absolute right-1.5 sm:right-2 text-[9px] sm:text-[10px] bg-slate-100 text-slate-500 px-1 py-0.5 rounded hidden xs:inline">
        Enter
      </span>
    </div>
  );
}
