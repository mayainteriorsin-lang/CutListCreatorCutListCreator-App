/**
 * Quick Quotation Module - Version Comparison Dialog
 *
 * Shows detailed diff between two versions with:
 * - Summary (total change, item count change)
 * - Added items (green)
 * - Deleted items (red)
 * - Modified items (yellow/orange)
 * - Settings changes
 */

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Plus, Minus, Edit3, Settings, ArrowRight, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { VersionDiff, ItemChange, SettingsChange } from '../types';
import { formatCurrency } from '../constants';

interface VersionComparisonDialogProps {
  isOpen: boolean;
  onClose: () => void;
  diff: VersionDiff | null;
}

export function VersionComparisonDialog({
  isOpen,
  onClose,
  diff,
}: VersionComparisonDialogProps) {
  if (!diff) return null;

  const hasChanges =
    diff.addedItems.length > 0 ||
    diff.deletedItems.length > 0 ||
    diff.modifiedItems.length > 0 ||
    diff.settingsChanges.length > 0;

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-3">
            <span className="px-2 py-1 bg-slate-100 rounded-lg text-sm font-mono">
              v{diff.fromVersion}
            </span>
            <ArrowRight className="h-4 w-4 text-slate-400" />
            <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded-lg text-sm font-mono">
              v{diff.toVersion}
            </span>
            <span className="text-sm font-normal text-slate-500">
              {diff.fromDate} to {diff.toDate}
            </span>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6 py-4">
          {/* Summary Section */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            {/* Total Change */}
            <div className={cn(
              "p-4 rounded-xl border-2",
              diff.totalChange >= 0
                ? "bg-emerald-50 border-emerald-200"
                : "bg-red-50 border-red-200"
            )}>
              <div className="flex items-center gap-2 mb-1">
                {diff.totalChange >= 0 ? (
                  <TrendingUp className="h-4 w-4 text-emerald-600" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-600" />
                )}
                <span className="text-xs font-medium text-slate-600">Total Change</span>
              </div>
              <p className={cn(
                "text-xl font-bold",
                diff.totalChange >= 0 ? "text-emerald-700" : "text-red-700"
              )}>
                {diff.totalChange >= 0 ? '+' : ''}Rs.{formatCurrency(diff.totalChange)}
              </p>
            </div>

            {/* Item Count Change */}
            <div className="p-4 rounded-xl border-2 bg-slate-50 border-slate-200">
              <div className="flex items-center gap-2 mb-1">
                <Edit3 className="h-4 w-4 text-slate-600" />
                <span className="text-xs font-medium text-slate-600">Items</span>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="secondary" className="bg-green-100 text-green-700">
                  +{diff.addedItems.length} added
                </Badge>
                <Badge variant="secondary" className="bg-red-100 text-red-700">
                  -{diff.deletedItems.length} deleted
                </Badge>
                <Badge variant="secondary" className="bg-amber-100 text-amber-700">
                  {diff.modifiedItems.length} modified
                </Badge>
              </div>
            </div>
          </div>

          {!hasChanges ? (
            <div className="text-center py-12 text-slate-400">
              <Edit3 className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No changes between these versions</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Added Items */}
              {diff.addedItems.length > 0 && (
                <div>
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-emerald-700 mb-3">
                    <Plus className="h-4 w-4" />
                    Added ({diff.addedItems.length})
                  </h3>
                  <div className="space-y-2">
                    {diff.addedItems.map((change, idx) => (
                      <ItemChangeCard key={idx} change={change} />
                    ))}
                  </div>
                </div>
              )}

              {/* Deleted Items */}
              {diff.deletedItems.length > 0 && (
                <div>
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-red-700 mb-3">
                    <Minus className="h-4 w-4" />
                    Deleted ({diff.deletedItems.length})
                  </h3>
                  <div className="space-y-2">
                    {diff.deletedItems.map((change, idx) => (
                      <ItemChangeCard key={idx} change={change} />
                    ))}
                  </div>
                </div>
              )}

              {/* Modified Items */}
              {diff.modifiedItems.length > 0 && (
                <div>
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-amber-700 mb-3">
                    <Edit3 className="h-4 w-4" />
                    Modified ({diff.modifiedItems.length})
                  </h3>
                  <div className="space-y-2">
                    {diff.modifiedItems.map((change, idx) => (
                      <ModifiedItemCard key={idx} change={change} />
                    ))}
                  </div>
                </div>
              )}

              {/* Settings Changes */}
              {diff.settingsChanges.length > 0 && (
                <div>
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3">
                    <Settings className="h-4 w-4" />
                    Settings Changes ({diff.settingsChanges.length})
                  </h3>
                  <div className="space-y-2">
                    {diff.settingsChanges.map((change, idx) => (
                      <SettingsChangeCard key={idx} change={change} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

function ItemChangeCard({ change }: { change: ItemChange }) {
  const bgColor = change.type === 'added'
    ? 'bg-emerald-50 border-emerald-200'
    : change.type === 'deleted'
    ? 'bg-red-50 border-red-200'
    : 'bg-amber-50 border-amber-200';

  const textColor = change.type === 'added'
    ? 'text-emerald-700'
    : change.type === 'deleted'
    ? 'text-red-700'
    : 'text-amber-700';

  return (
    <div className={cn('p-3 rounded-lg border', bgColor)}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className={cn('font-medium truncate', textColor)}>
            {change.item.name || 'Unnamed Item'}
          </p>
          {change.location && (
            <p className="text-xs text-slate-500 mt-0.5">{change.location}</p>
          )}
        </div>
        <div className="text-right flex-shrink-0">
          <p className={cn('font-semibold', textColor)}>
            {change.type === 'deleted' ? '-' : ''}Rs.{formatCurrency(Number(change.item.total) || 0)}
          </p>
          <p className="text-xs text-slate-500">
            {change.section === 'main' ? 'Main Work' : 'Additional'}
          </p>
        </div>
      </div>
    </div>
  );
}

function ModifiedItemCard({ change }: { change: ItemChange }) {
  return (
    <div className="p-3 rounded-lg border bg-amber-50 border-amber-200">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-amber-700 truncate">
            {change.item.name || 'Unnamed Item'}
          </p>
          {change.location && (
            <p className="text-xs text-slate-500 mt-0.5">{change.location}</p>
          )}
        </div>
        <div className="text-right flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 line-through">
              Rs.{formatCurrency(Number(change.oldItem?.total) || 0)}
            </span>
            <ArrowRight className="h-3 w-3 text-slate-400" />
            <span className="font-semibold text-amber-700">
              Rs.{formatCurrency(Number(change.item.total) || 0)}
            </span>
          </div>
        </div>
      </div>

      {/* Field changes */}
      {change.fieldChanges && change.fieldChanges.length > 0 && (
        <div className="mt-2 pt-2 border-t border-amber-200 space-y-1">
          {change.fieldChanges.map((fc, idx) => (
            <div key={idx} className="flex items-center gap-2 text-xs">
              <span className="text-slate-500 w-16">{fc.field}:</span>
              <span className="text-red-600 line-through">
                {formatFieldValue(fc.field, fc.oldValue)}
              </span>
              <ArrowRight className="h-3 w-3 text-slate-400" />
              <span className="text-emerald-600 font-medium">
                {formatFieldValue(fc.field, fc.newValue)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SettingsChangeCard({ change }: { change: SettingsChange }) {
  return (
    <div className="p-3 rounded-lg border bg-slate-50 border-slate-200 flex items-center justify-between">
      <span className="text-sm text-slate-600">{change.label}</span>
      <div className="flex items-center gap-2">
        <span className="text-sm text-red-600 line-through">{String(change.oldValue)}</span>
        <ArrowRight className="h-3 w-3 text-slate-400" />
        <span className="text-sm text-emerald-600 font-medium">{String(change.newValue)}</span>
      </div>
    </div>
  );
}

function formatFieldValue(field: string, value: string | number | undefined): string {
  if (value === undefined || value === null || value === '') {
    return '-';
  }

  // Format currency fields
  if (['Rate', 'Amount', 'Total'].includes(field)) {
    return `Rs.${formatCurrency(Number(value) || 0)}`;
  }

  // Format dimensions
  if (['Height', 'Width', 'Sqft'].includes(field)) {
    return String(value);
  }

  return String(value);
}
