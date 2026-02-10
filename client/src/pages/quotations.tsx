import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
  FileText,
  Plus,
  Search,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Phone,
  MapPin,
  Calendar,
  Clock,
  Trash2,
  Edit3,
  IndianRupee,
  Percent,
  X,
  Check,
  Send,
  XCircle,
  Zap,
  GitBranch,
  ArrowUpRight,
  ArrowDownRight,
  Save,
  ArrowUpDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Quotation, QuotationStatus, PaymentMethod } from '@/modules/quotations/types';
import { PaymentSection } from '@/modules/quotations/components';
import {
  readQuotations,
  createQuotation,
  updateQuotation,
  deleteQuotation,
  addPaymentToQuotation,
  removePaymentFromQuotation,
  subscribeQuotationUpdates,
  getQuotationsStats,
  generateQuotationNumber,
  saveVersionToQuotation,
  deleteVersionFromQuotation,
} from '@/modules/quotations/storage';
import type { QuotationVersion } from '@/modules/quotations/types';
import QuickQuotationPage from '@/pages/quick-quotation';

const STATUS_CONFIG: Record<QuotationStatus, { label: string; color: string; bg: string; icon: typeof FileText }> = {
  DRAFT: { label: 'Draft', color: 'text-slate-600', bg: 'bg-slate-100', icon: Edit3 },
  SENT: { label: 'Sent', color: 'text-blue-600', bg: 'bg-blue-100', icon: Send },
  APPROVED: { label: 'Approved', color: 'text-emerald-600', bg: 'bg-emerald-100', icon: Check },
  REJECTED: { label: 'Rejected', color: 'text-red-600', bg: 'bg-red-100', icon: XCircle },
};

export default function QuotationsPage() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<QuotationStatus | 'ALL'>('ALL');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [showVersions, setShowVersions] = useState(false);

  // Sort state
  const [sortColumn, setSortColumn] = useState<'client' | 'date' | 'total' | 'pending'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Form state
  const [formData, setFormData] = useState<Partial<Quotation>>({});

  // Load quotations
  const refreshQuotations = () => {
    setQuotations(readQuotations());
  };

  useEffect(() => {
    refreshQuotations();
    return subscribeQuotationUpdates(refreshQuotations);
  }, []);

  // Stats
  const stats = useMemo(() => getQuotationsStats(), [quotations]);

  // Filtered and sorted quotations
  const filteredQuotations = useMemo(() => {
    let result = quotations;

    if (statusFilter !== 'ALL') {
      result = result.filter(q => q.status === statusFilter);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        q2 =>
          q2.clientName.toLowerCase().includes(q) ||
          q2.clientMobile.includes(q) ||
          q2.quotationNumber.toLowerCase().includes(q)
      );
    }

    // Sort
    result = [...result].sort((a, b) => {
      let comparison = 0;
      switch (sortColumn) {
        case 'client':
          comparison = (a.clientName || '').localeCompare(b.clientName || '');
          break;
        case 'date':
          comparison = a.date.localeCompare(b.date);
          break;
        case 'total':
          comparison = a.finalTotal - b.finalTotal;
          break;
        case 'pending':
          comparison = a.pendingAmount - b.pendingAmount;
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [quotations, statusFilter, search, sortColumn, sortDirection]);

  // Selected quotation
  const selected = selectedId ? quotations.find(q => q.id === selectedId) : null;

  // Handle create
  const handleCreate = () => {
    setFormData({
      quotationNumber: generateQuotationNumber(),
      date: new Date().toISOString().split('T')[0],
      validityDate: (() => {
        const d = new Date();
        d.setDate(d.getDate() + 15);
        return d.toISOString().split('T')[0];
      })(),
      status: 'DRAFT',
      subtotal: 0,
      discountPercent: 0,
      discountFlat: 0,
      payments: [],
    });
    setEditMode(false);
    setShowCreateDialog(true);
  };

  // Check if a quotation is from Quick Quote
  const isQuickQuote = (q: Quotation | null | undefined) => q?.source === 'quick-quote';

  // Handle edit
  const handleEdit = () => {
    if (!selected) return;
    // Quick Quote entries are edited inline via embedded QuickQuotationPage
    if (isQuickQuote(selected)) {
      return; // Already showing the editor
    }
    setFormData({ ...selected });
    setEditMode(true);
    setShowCreateDialog(true);
  };

  // Handle save
  const handleSave = () => {
    if (editMode && selectedId) {
      updateQuotation(selectedId, formData);
      toast({ title: 'Client updated' });
    } else {
      const newQuot = createQuotation(formData);
      setSelectedId(newQuot.id);
      toast({ title: 'Client created', description: newQuot.quotationNumber });
    }
    setShowCreateDialog(false);
    refreshQuotations();
  };

  // Handle delete with password verification
  const handleDelete = () => {
    if (!selectedId) return;
    if (deletePassword !== '4321') {
      setDeleteError('Incorrect password');
      return;
    }
    deleteQuotation(selectedId);
    setSelectedId(null);
    setShowDeleteDialog(false);
    setDeletePassword('');
    setDeleteError('');
    refreshQuotations();
    toast({ title: 'Client deleted' });
  };

  // Reset delete dialog state when closing
  const closeDeleteDialog = () => {
    setShowDeleteDialog(false);
    setDeletePassword('');
    setDeleteError('');
  };

  // Handle add payment (used by PaymentSection)
  const handleAddPayment = (data: {
    amount: number;
    method: PaymentMethod;
    reference?: string;
    note?: string;
    date?: string;
  }) => {
    if (!selectedId) return;
    addPaymentToQuotation(selectedId, data.amount, {
      method: data.method,
      reference: data.reference,
      note: data.note,
      date: data.date,
    });
    refreshQuotations();
    toast({ title: 'Payment added' });
  };

  // Handle remove payment
  const handleRemovePayment = (paymentId: string) => {
    if (!selectedId) return;
    removePaymentFromQuotation(selectedId, paymentId);
    refreshQuotations();
    toast({ title: 'Payment removed' });
  };

  // Handle status change
  const handleStatusChange = (status: QuotationStatus) => {
    if (!selectedId) return;
    updateQuotation(selectedId, { status });
    refreshQuotations();
    toast({ title: `Status changed to ${status}` });
  };

  // Handle save version
  const handleSaveVersion = () => {
    if (!selectedId || isQuickQuote(selected)) return;
    const note = prompt('Version note (optional):') || undefined;
    const version = saveVersionToQuotation(selectedId, note);
    if (version) {
      refreshQuotations();
      toast({ title: `Version v${version.version} saved` });
    }
  };

  // Handle delete version
  const handleDeleteVersion = (versionId: string) => {
    if (!selectedId) return;
    if (confirm('Delete this version?')) {
      deleteVersionFromQuotation(selectedId, versionId);
      refreshQuotations();
      toast({ title: 'Version deleted' });
    }
  };

  // Handle sort column click
  const handleSort = (column: 'client' | 'date' | 'total' | 'pending') => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection(column === 'client' ? 'asc' : 'desc'); // Default: A-Z for client, newest first for others
    }
  };

  // Format currency
  const formatCurrency = (value: number) => `₹${value.toLocaleString('en-IN')}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-slate-200/60 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/')}
                className="h-9 w-9 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
              >
                <ChevronLeft className="h-5 w-5 text-slate-600" />
              </button>
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <FileText className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-900">Client Info</h1>
                <p className="text-xs text-slate-500">{stats.total} clients</p>
              </div>
            </div>
            <Button
              onClick={handleCreate}
              className="h-9 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl shadow-lg shadow-indigo-500/20"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              New
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-4">
        {/* Stats Row */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm">
            <p className="text-[10px] text-slate-500 mb-0.5">Total Value</p>
            <p className="text-lg font-bold text-slate-800">₹{stats.totalValue.toLocaleString('en-IN')}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm">
            <p className="text-[10px] text-slate-500 mb-0.5">Received</p>
            <p className="text-lg font-bold text-emerald-600">₹{stats.totalReceived.toLocaleString('en-IN')}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm">
            <p className="text-[10px] text-slate-500 mb-0.5">Pending</p>
            <p className="text-lg font-bold text-amber-600">₹{stats.totalPending.toLocaleString('en-IN')}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm">
            <p className="text-[10px] text-slate-500 mb-0.5">Approved</p>
            <p className="text-lg font-bold text-indigo-600">{stats.approved}/{stats.total}</p>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="flex gap-2 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by name, mobile, or quotation no..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-10 bg-white border-slate-200"
            />
          </div>
          <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1">
            {(['ALL', 'DRAFT', 'SENT', 'APPROVED', 'REJECTED'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
                  statusFilter === status
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'text-slate-600 hover:bg-slate-50'
                )}
              >
                {status === 'ALL' ? 'All' : status.charAt(0) + status.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          {/* Clients Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            {filteredQuotations.length === 0 ? (
              <div className="p-8 text-center">
                <FileText className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">No clients found</p>
                <Button onClick={handleCreate} variant="outline" className="mt-3">
                  <Plus className="h-4 w-4 mr-1" />
                  Add First Client
                </Button>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th
                      onClick={() => handleSort('client')}
                      className="px-4 py-3 text-left text-xs font-semibold text-slate-600 cursor-pointer hover:bg-slate-100 transition-colors select-none"
                    >
                      <span className="flex items-center gap-1">
                        Client
                        <ArrowUpDown className={cn('h-3 w-3', sortColumn === 'client' ? 'text-indigo-600' : 'text-slate-400')} />
                        {sortColumn === 'client' && (
                          <span className="text-[10px] text-indigo-600">{sortDirection === 'asc' ? 'A-Z' : 'Z-A'}</span>
                        )}
                      </span>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Quote #</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Phone</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Location</th>
                    <th
                      onClick={() => handleSort('date')}
                      className="px-4 py-3 text-left text-xs font-semibold text-slate-600 cursor-pointer hover:bg-slate-100 transition-colors select-none"
                    >
                      <span className="flex items-center gap-1">
                        Date
                        <ArrowUpDown className={cn('h-3 w-3', sortColumn === 'date' ? 'text-indigo-600' : 'text-slate-400')} />
                        {sortColumn === 'date' && (
                          <span className="text-[10px] text-indigo-600">{sortDirection === 'desc' ? 'New' : 'Old'}</span>
                        )}
                      </span>
                    </th>
                    <th
                      onClick={() => handleSort('total')}
                      className="px-4 py-3 text-right text-xs font-semibold text-slate-600 cursor-pointer hover:bg-slate-100 transition-colors select-none"
                    >
                      <span className="flex items-center justify-end gap-1">
                        Total
                        <ArrowUpDown className={cn('h-3 w-3', sortColumn === 'total' ? 'text-indigo-600' : 'text-slate-400')} />
                        {sortColumn === 'total' && (
                          <span className="text-[10px] text-indigo-600">{sortDirection === 'desc' ? 'Hi' : 'Lo'}</span>
                        )}
                      </span>
                    </th>
                    <th
                      onClick={() => handleSort('pending')}
                      className="px-4 py-3 text-right text-xs font-semibold text-slate-600 cursor-pointer hover:bg-slate-100 transition-colors select-none"
                    >
                      <span className="flex items-center justify-end gap-1">
                        Pending
                        <ArrowUpDown className={cn('h-3 w-3', sortColumn === 'pending' ? 'text-indigo-600' : 'text-slate-400')} />
                        {sortColumn === 'pending' && (
                          <span className="text-[10px] text-indigo-600">{sortDirection === 'desc' ? 'Hi' : 'Lo'}</span>
                        )}
                      </span>
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600">Status</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredQuotations.map((q) => {
                    const statusConfig = STATUS_CONFIG[q.status];
                    const StatusIcon = statusConfig.icon;
                    const isSelected = selectedId === q.id;
                    return (
                      <tr
                        key={q.id}
                        onClick={() => setSelectedId(isSelected ? null : q.id)}
                        className={cn(
                          'cursor-pointer transition-colors',
                          isSelected
                            ? 'bg-indigo-50'
                            : 'hover:bg-slate-50'
                        )}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {q.source === 'quick-quote' && (
                              <Zap className="h-3.5 w-3.5 text-amber-500" />
                            )}
                            <span className="font-medium text-slate-900 text-sm">{q.clientName || 'Unnamed'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-mono text-slate-500">{q.quotationNumber}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-slate-600">{q.clientMobile || '-'}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-slate-500">{q.clientLocation || '-'}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-slate-500">{q.date}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-sm font-semibold text-slate-800">₹{q.finalTotal.toLocaleString('en-IN')}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {q.pendingAmount > 0 ? (
                            <span className="text-sm font-medium text-amber-600">₹{q.pendingAmount.toLocaleString('en-IN')}</span>
                          ) : (
                            <span className="text-sm text-emerald-600">Paid</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={cn('inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium', statusConfig.bg, statusConfig.color)}>
                            <StatusIcon className="h-3 w-3" />
                            {statusConfig.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={(e) => { e.stopPropagation(); setSelectedId(q.id); }}
                              className="h-7 w-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-indigo-600 transition-colors"
                              title="View"
                            >
                              <ChevronDown className={cn('h-4 w-4 transition-transform', isSelected && 'rotate-180')} />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); setSelectedId(q.id); setShowDeleteDialog(true); }}
                              className="h-7 w-7 rounded-lg hover:bg-red-50 flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Detail Panel - Shows below table when client selected */}
          <div>
            {selected && isQuickQuote(selected) ? (
              /* Quick Quote Editor - embedded */
              <div className="bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden">
                <QuickQuotationPage />
              </div>
            ) : selected ? (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden">
                {/* Detail Header */}
                <div className="px-5 py-4 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                        <FileText className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-base font-semibold text-white">{selected.clientName || 'Unnamed'}</h2>
                          <span className={cn('px-2 py-0.5 rounded text-[10px] font-medium',
                            selected.status === 'DRAFT' ? 'bg-white/20 text-white' :
                            selected.status === 'SENT' ? 'bg-blue-400/30 text-blue-100' :
                            selected.status === 'APPROVED' ? 'bg-emerald-400/30 text-emerald-100' :
                            'bg-red-400/30 text-red-100'
                          )}>
                            {selected.status}
                          </span>
                        </div>
                        <p className="text-xs text-white/70 font-mono">{selected.quotationNumber}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleEdit}
                        className="h-8 w-8 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
                        title="Edit"
                      >
                        <Edit3 className="h-4 w-4 text-white" />
                      </button>
                      <button
                        onClick={() => setShowDeleteDialog(true)}
                        className="h-8 w-8 rounded-lg bg-white/20 hover:bg-red-500/50 flex items-center justify-center transition-colors"
                      >
                        <Trash2 className="h-4 w-4 text-white" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Amount Stats */}
                <div className="grid grid-cols-4 border-b border-slate-100">
                  <div className="px-4 py-3 border-r border-slate-100">
                    <p className="text-[10px] text-slate-500 mb-0.5">Subtotal</p>
                    <p className="text-sm font-bold text-slate-800">₹{selected.subtotal.toLocaleString('en-IN')}</p>
                  </div>
                  <div className="px-4 py-3 border-r border-slate-100">
                    <p className="text-[10px] text-slate-500 mb-0.5">Final</p>
                    <p className="text-sm font-bold text-indigo-600">₹{selected.finalTotal.toLocaleString('en-IN')}</p>
                  </div>
                  <div className="px-4 py-3 border-r border-slate-100">
                    <p className="text-[10px] text-slate-500 mb-0.5">Received</p>
                    <p className="text-sm font-bold text-emerald-600">₹{selected.totalPaid.toLocaleString('en-IN')}</p>
                  </div>
                  <div className="px-4 py-3">
                    <p className="text-[10px] text-slate-500 mb-0.5">Pending</p>
                    <p className={cn('text-sm font-bold', selected.pendingAmount > 0 ? 'text-amber-600' : 'text-emerald-600')}>
                      ₹{Math.max(0, selected.pendingAmount).toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>

                {/* Details */}
                <div className="p-4 space-y-4">
                  {/* Client Info */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-slate-400" />
                      <span className="text-slate-600">{selected.clientMobile || '-'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-slate-400" />
                      <span className="text-slate-600">{selected.clientLocation || '-'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-slate-400" />
                      <span className="text-slate-600">Valid till {selected.validityDate}</span>
                    </div>
                  </div>

                  {/* Discount Info */}
                  {(selected.discountPercent > 0 || selected.discountFlat > 0) && (
                    <div className="bg-orange-50 rounded-lg p-3 flex items-center gap-3">
                      <Percent className="h-4 w-4 text-orange-500" />
                      <span className="text-sm text-orange-700">
                        Discount: {selected.discountPercent > 0 && `${selected.discountPercent}%`}
                        {selected.discountPercent > 0 && selected.discountFlat > 0 && ' + '}
                        {selected.discountFlat > 0 && `₹${selected.discountFlat.toLocaleString('en-IN')}`}
                      </span>
                    </div>
                  )}

                  {/* Payment Section */}
                  <PaymentSection
                    quotation={selected}
                    onAddPayment={handleAddPayment}
                    onRemovePayment={handleRemovePayment}
                  />

                  {/* Notes */}
                  {selected.notes && (
                    <div className="bg-slate-50 rounded-lg p-3">
                      <p className="text-xs text-slate-500 mb-1">Notes</p>
                      <p className="text-sm text-slate-700">{selected.notes}</p>
                    </div>
                  )}

                  {/* Version History */}
                  <div className="bg-indigo-50/50 rounded-xl p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <button
                          onClick={() => setShowVersions(!showVersions)}
                          className="text-xs font-medium text-indigo-700 flex items-center gap-1 hover:text-indigo-800 transition-colors"
                        >
                          <GitBranch className="h-3.5 w-3.5" />
                          Version History ({selected.versions?.length || 0})
                          {showVersions ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        </button>
                        <Button
                          onClick={handleSaveVersion}
                          size="sm"
                          className="h-7 px-2 text-xs bg-indigo-500 hover:bg-indigo-600"
                        >
                          <Save className="h-3 w-3 mr-1" />
                          Save Version
                        </Button>
                      </div>

                      {showVersions && (
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {(selected.versions?.length || 0) > 0 ? (
                            [...(selected.versions || [])].reverse().map((v, idx) => (
                              <div key={v.id} className="bg-white rounded-lg p-3 border border-indigo-100">
                                <div className="flex items-start justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold">
                                      v{v.version}
                                    </span>
                                    <span className="text-xs text-slate-500">{v.date}</span>
                                    {v.note && (
                                      <span className="text-xs text-slate-600 italic truncate max-w-32">
                                        "{v.note}"
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-bold text-indigo-600">
                                      {formatCurrency(v.finalTotal)}
                                    </span>
                                    <button
                                      onClick={() => handleDeleteVersion(v.id)}
                                      className="h-5 w-5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded flex items-center justify-center transition-colors"
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  </div>
                                </div>

                                {/* Changes from previous version */}
                                {v.changes && v.changes.length > 0 && (
                                  <div className="mt-2 pt-2 border-t border-indigo-50">
                                    <p className="text-[10px] text-slate-500 mb-1">Changes:</p>
                                    <div className="space-y-1">
                                      {v.changes.map((c, cIdx) => (
                                        <div key={cIdx} className="flex items-center gap-2 text-xs">
                                          <span className="text-slate-500 min-w-20">{c.field}:</span>
                                          <span className="text-red-500 flex items-center gap-0.5 line-through">
                                            <ArrowDownRight className="h-3 w-3" />
                                            {typeof c.oldValue === 'number' ? formatCurrency(c.oldValue) : c.oldValue}
                                          </span>
                                          <span className="text-emerald-600 flex items-center gap-0.5 font-medium">
                                            <ArrowUpRight className="h-3 w-3" />
                                            {typeof c.newValue === 'number' ? formatCurrency(c.newValue) : c.newValue}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Show summary for first version */}
                                {idx === (selected.versions?.length || 0) - 1 && (
                                  <div className="mt-1 text-[10px] text-slate-400">
                                    Initial version
                                  </div>
                                )}
                              </div>
                            ))
                          ) : (
                            <div className="text-center py-4">
                              <p className="text-xs text-slate-400 mb-2">No versions saved yet</p>
                              <p className="text-[10px] text-slate-400">
                                Save a version to track changes over time
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                  {/* Status Actions */}
                  <div className="flex gap-2 pt-2">
                    {selected.status !== 'SENT' && (
                        <Button
                          onClick={() => handleStatusChange('SENT')}
                          variant="outline"
                          size="sm"
                          className="flex-1"
                        >
                          <Send className="h-3.5 w-3.5 mr-1.5" />
                          Mark Sent
                        </Button>
                      )}
                      {selected.status !== 'APPROVED' && (
                        <Button
                          onClick={() => handleStatusChange('APPROVED')}
                          size="sm"
                          className="flex-1 bg-emerald-500 hover:bg-emerald-600"
                        >
                          <Check className="h-3.5 w-3.5 mr-1.5" />
                          Approve
                        </Button>
                      )}
                      {selected.status !== 'REJECTED' && (
                      <Button
                        onClick={() => handleStatusChange('REJECTED')}
                        variant="outline"
                        size="sm"
                        className="flex-1 text-red-600 border-red-200 hover:bg-red-50"
                      >
                        <XCircle className="h-3.5 w-3.5 mr-1.5" />
                        Reject
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </main>

      {/* Create/Edit Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editMode ? 'Edit Client' : 'New Client'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Client Info */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Client Name</label>
                <Input
                  value={formData.clientName || ''}
                  onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                  placeholder="Name"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Mobile</label>
                <Input
                  value={formData.clientMobile || ''}
                  onChange={(e) => setFormData({ ...formData, clientMobile: e.target.value })}
                  placeholder="9876543210"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Location</label>
                <Input
                  value={formData.clientLocation || ''}
                  onChange={(e) => setFormData({ ...formData, clientLocation: e.target.value })}
                  placeholder="City"
                />
              </div>
            </div>

            {/* Quotation Details */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Quotation No.</label>
                <Input
                  value={formData.quotationNumber || ''}
                  onChange={(e) => setFormData({ ...formData, quotationNumber: e.target.value })}
                  placeholder="Q-2026-001"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Date</label>
                <Input
                  type="date"
                  value={formData.date || ''}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Valid Till</label>
                <Input
                  type="date"
                  value={formData.validityDate || ''}
                  onChange={(e) => setFormData({ ...formData, validityDate: e.target.value })}
                />
              </div>
            </div>

            {/* Amounts */}
            <div className="bg-slate-50 rounded-xl p-3 space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">Subtotal (₹)</label>
                  <Input
                    type="number"
                    value={formData.subtotal || ''}
                    onChange={(e) => setFormData({ ...formData, subtotal: Number(e.target.value) || 0 })}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">Discount %</label>
                  <Input
                    type="number"
                    value={formData.discountPercent || ''}
                    onChange={(e) => setFormData({ ...formData, discountPercent: Number(e.target.value) || 0 })}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">Discount Flat (₹)</label>
                  <Input
                    type="number"
                    value={formData.discountFlat || ''}
                    onChange={(e) => setFormData({ ...formData, discountFlat: Number(e.target.value) || 0 })}
                    placeholder="0"
                  />
                </div>
              </div>
              <div className="text-right">
                <span className="text-sm text-slate-600">Final: </span>
                <span className="text-lg font-bold text-indigo-600">
                  ₹{(
                    (formData.subtotal || 0) -
                    ((formData.subtotal || 0) * (formData.discountPercent || 0) / 100) -
                    (formData.discountFlat || 0)
                  ).toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Notes</label>
              <Input
                value={formData.notes || ''}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Terms, conditions..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-700">
              {editMode ? 'Save Changes' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog with Password */}
      <Dialog open={showDeleteDialog} onOpenChange={closeDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Client?</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <p className="text-sm text-slate-600">
              This will permanently delete client <strong>{selected?.quotationNumber}</strong> and all payment records.
            </p>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">
                Enter password to confirm delete
              </label>
              <Input
                type="password"
                value={deletePassword}
                onChange={(e) => {
                  setDeletePassword(e.target.value);
                  setDeleteError('');
                }}
                placeholder="Enter 4-digit password"
                maxLength={4}
                className={cn(deleteError && 'border-red-500')}
              />
              {deleteError && (
                <p className="text-xs text-red-500 mt-1">{deleteError}</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDeleteDialog}>
              Cancel
            </Button>
            <Button onClick={handleDelete} variant="destructive">
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
