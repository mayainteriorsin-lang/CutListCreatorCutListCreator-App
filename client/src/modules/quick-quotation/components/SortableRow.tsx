/**
 * Quick Quotation Module - Sortable Row Wrapper
 *
 * Wraps QuotationItemRow with @dnd-kit sortable functionality
 * for drag-and-drop row reordering.
 */

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { forwardRef } from 'react';
import { QuotationItemRow } from './QuotationItemRow';
import type { QuotationRow } from '../types';

interface SortableRowProps {
  row: QuotationRow;
  index: number;
  itemNumber?: number;
  isHighlighted?: boolean;
}

export const SortableRow = forwardRef<HTMLTableRowElement, SortableRowProps>(
  function SortableRow({ row, index, itemNumber, isHighlighted }, ref) {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: row.id });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
    };

    return (
      <QuotationItemRow
        ref={(node) => {
          setNodeRef(node);
          if (typeof ref === 'function') {
            ref(node);
          } else if (ref) {
            ref.current = node;
          }
        }}
        row={row}
        index={index}
        itemNumber={itemNumber}
        isDragging={isDragging}
        dragHandleProps={{ attributes, listeners }}
        style={style}
        isHighlighted={isHighlighted}
      />
    );
  }
);
