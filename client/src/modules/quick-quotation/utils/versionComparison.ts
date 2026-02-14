/**
 * Quick Quotation Module - Version Comparison Utility
 *
 * Compares two versions and generates a detailed diff showing:
 * - Added items
 * - Deleted items
 * - Modified items (with field-level changes)
 * - Settings changes
 */

import type {
  QuotationVersion,
  QuotationRow,
  VersionDiff,
  ItemChange,
  SettingsChange,
} from '../types';

/**
 * Compare two versions and return detailed diff
 */
export function compareVersions(
  oldVersion: QuotationVersion,
  newVersion: QuotationVersion
): VersionDiff {
  const addedItems: ItemChange[] = [];
  const deletedItems: ItemChange[] = [];
  const modifiedItems: ItemChange[] = [];
  const settingsChanges: SettingsChange[] = [];

  // Compare main items
  compareItems(
    oldVersion.mainItems || [],
    newVersion.mainItems || [],
    'main',
    addedItems,
    deletedItems,
    modifiedItems
  );

  // Compare additional items
  compareItems(
    oldVersion.additionalItems || [],
    newVersion.additionalItems || [],
    'additional',
    addedItems,
    deletedItems,
    modifiedItems
  );

  // Compare settings
  compareSettings(oldVersion, newVersion, settingsChanges);

  return {
    fromVersion: oldVersion.version,
    toVersion: newVersion.version,
    fromDate: oldVersion.date,
    toDate: newVersion.date,
    totalChange: (newVersion.grandTotal || 0) - (oldVersion.grandTotal || 0),
    itemCountChange: (newVersion.itemCount || 0) - (oldVersion.itemCount || 0),
    addedItems,
    deletedItems,
    modifiedItems,
    settingsChanges,
  };
}

/**
 * Compare items between two versions
 */
function compareItems(
  oldItems: QuotationRow[],
  newItems: QuotationRow[],
  section: 'main' | 'additional',
  addedItems: ItemChange[],
  deletedItems: ItemChange[],
  modifiedItems: ItemChange[]
): void {
  // Create maps for quick lookup
  const oldItemMap = new Map<string, QuotationRow>();
  const newItemMap = new Map<string, QuotationRow>();

  // Build context (floor/room) for each item
  const oldItemContext = buildItemContextMap(oldItems);
  const newItemContext = buildItemContextMap(newItems);

  oldItems.forEach(item => {
    if (item.type === 'item') {
      oldItemMap.set(item.id, item);
    }
  });

  newItems.forEach(item => {
    if (item.type === 'item') {
      newItemMap.set(item.id, item);
    }
  });

  // Find added and modified items
  newItemMap.forEach((newItem, id) => {
    const oldItem = oldItemMap.get(id);
    const location = newItemContext.get(id) || '';

    if (!oldItem) {
      // Item was added
      addedItems.push({
        type: 'added',
        item: newItem,
        section,
        location,
      });
    } else {
      // Check if item was modified
      const fieldChanges = getFieldChanges(oldItem, newItem);
      if (fieldChanges.length > 0) {
        modifiedItems.push({
          type: 'modified',
          item: newItem,
          oldItem,
          section,
          location,
          fieldChanges,
        });
      }
    }
  });

  // Find deleted items
  oldItemMap.forEach((oldItem, id) => {
    if (!newItemMap.has(id)) {
      const location = oldItemContext.get(id) || '';
      deletedItems.push({
        type: 'deleted',
        item: oldItem,
        section,
        location,
      });
    }
  });
}

/**
 * Build a map of item ID to its context (floor > room)
 */
function buildItemContextMap(items: QuotationRow[]): Map<string, string> {
  const contextMap = new Map<string, string>();
  let currentFloor = '';
  let currentRoom = '';

  items.forEach(item => {
    if (item.type === 'floor') {
      currentFloor = item.name || '';
      currentRoom = '';
    } else if (item.type === 'room') {
      currentRoom = item.name || '';
    } else if (item.type === 'item') {
      const parts = [];
      if (currentFloor) parts.push(currentFloor);
      if (currentRoom) parts.push(currentRoom);
      contextMap.set(item.id, parts.join(' > '));
    }
  });

  return contextMap;
}

/**
 * Get field-level changes between two items
 */
function getFieldChanges(
  oldItem: QuotationRow,
  newItem: QuotationRow
): { field: string; oldValue: string | number | undefined; newValue: string | number | undefined }[] {
  const changes: { field: string; oldValue: string | number | undefined; newValue: string | number | undefined }[] = [];

  // Compare relevant fields
  const fieldsToCompare: { key: keyof QuotationRow; label: string }[] = [
    { key: 'name', label: 'Description' },
    { key: 'height', label: 'Height' },
    { key: 'width', label: 'Width' },
    { key: 'sqft', label: 'Sqft' },
    { key: 'rate', label: 'Rate' },
    { key: 'amount', label: 'Amount' },
    { key: 'qty', label: 'Qty' },
    { key: 'total', label: 'Total' },
    { key: 'note', label: 'Note' },
  ];

  fieldsToCompare.forEach(({ key, label }) => {
    const oldValue = oldItem[key];
    const newValue = newItem[key];

    // Compare values (handle undefined/null)
    if (normalizeValue(oldValue) !== normalizeValue(newValue)) {
      changes.push({
        field: label,
        oldValue: oldValue as string | number | undefined,
        newValue: newValue as string | number | undefined,
      });
    }
  });

  return changes;
}

/**
 * Normalize value for comparison
 */
function normalizeValue(value: unknown): string {
  if (value === undefined || value === null || value === '') {
    return '';
  }
  if (typeof value === 'number') {
    return value.toString();
  }
  return String(value);
}

/**
 * Compare settings between two versions
 */
function compareSettings(
  oldVersion: QuotationVersion,
  newVersion: QuotationVersion,
  changes: SettingsChange[]
): void {
  const oldSettings = oldVersion.settings || {};
  const newSettings = newVersion.settings || {};

  // GST
  if (oldSettings.gstEnabled !== newSettings.gstEnabled) {
    changes.push({
      field: 'gstEnabled',
      label: 'GST',
      oldValue: oldSettings.gstEnabled ? 'Enabled' : 'Disabled',
      newValue: newSettings.gstEnabled ? 'Enabled' : 'Disabled',
    });
  }

  if (oldSettings.gstRate !== newSettings.gstRate) {
    changes.push({
      field: 'gstRate',
      label: 'GST Rate',
      oldValue: `${oldSettings.gstRate || 0}%`,
      newValue: `${newSettings.gstRate || 0}%`,
    });
  }

  // Discount
  if (oldSettings.discountType !== newSettings.discountType) {
    changes.push({
      field: 'discountType',
      label: 'Discount Type',
      oldValue: oldSettings.discountType === 'percent' ? 'Percentage' : 'Amount',
      newValue: newSettings.discountType === 'percent' ? 'Percentage' : 'Amount',
    });
  }

  if (oldSettings.discountValue !== newSettings.discountValue) {
    const oldDiscount = oldSettings.discountType === 'percent'
      ? `${oldSettings.discountValue || 0}%`
      : `Rs.${oldSettings.discountValue || 0}`;
    const newDiscount = newSettings.discountType === 'percent'
      ? `${newSettings.discountValue || 0}%`
      : `Rs.${newSettings.discountValue || 0}`;
    changes.push({
      field: 'discountValue',
      label: 'Discount',
      oldValue: oldDiscount,
      newValue: newDiscount,
    });
  }

  // Paid amount
  if (oldSettings.paidAmount !== newSettings.paidAmount) {
    changes.push({
      field: 'paidAmount',
      label: 'Paid Amount',
      oldValue: oldSettings.paidAmount || 0,
      newValue: newSettings.paidAmount || 0,
    });
  }

  // Client info changes
  const oldClient = oldVersion.client || {};
  const newClient = newVersion.client || {};

  if (oldClient.name !== newClient.name) {
    changes.push({
      field: 'clientName',
      label: 'Client Name',
      oldValue: oldClient.name || '-',
      newValue: newClient.name || '-',
    });
  }

  if (oldClient.contact !== newClient.contact) {
    changes.push({
      field: 'clientContact',
      label: 'Contact',
      oldValue: oldClient.contact || '-',
      newValue: newClient.contact || '-',
    });
  }

  if (oldClient.address !== newClient.address) {
    changes.push({
      field: 'clientAddress',
      label: 'Address',
      oldValue: oldClient.address || '-',
      newValue: newClient.address || '-',
    });
  }
}

/**
 * Format currency for display
 */
export function formatCurrencyChange(value: number): string {
  const prefix = value >= 0 ? '+' : '';
  return `${prefix}Rs.${Math.abs(value).toLocaleString('en-IN')}`;
}

/**
 * Get summary text for a diff
 */
export function getDiffSummary(diff: VersionDiff): string {
  const parts: string[] = [];

  if (diff.addedItems.length > 0) {
    parts.push(`${diff.addedItems.length} added`);
  }
  if (diff.deletedItems.length > 0) {
    parts.push(`${diff.deletedItems.length} deleted`);
  }
  if (diff.modifiedItems.length > 0) {
    parts.push(`${diff.modifiedItems.length} modified`);
  }

  return parts.length > 0 ? parts.join(', ') : 'No changes';
}
