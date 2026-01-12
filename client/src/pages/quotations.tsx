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
  History,
  X,
  Check,
  Send,
  XCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Quotation, QuotationStatus } from '@/modules/quotations/types';
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
} from '@/modules/quotations/storage';

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
  const [editMode, setEditMode] = useState(false);

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

  // Filtered quotations
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

    return result;
  }, [quotations, statusFilter, search]);

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

  // Handle edit
  const handleEdit = () => {
    if (!selected) return;
    setFormData({ ...selected });
    setEditMode(true);
    setShowCreateDialog(true);
  };

  // Handle save
  const handleSave = () => {
    if (editMode && selectedId) {
      updateQuotation(selectedId, formData);
      toast({ title: 'Quotation updated' });
    } else {
      const newQuot = createQuotation(formData);
      setSelectedId(newQuot.id);
      toast({ title: 'Quotation created', description: newQuot.quotationNumber });
    }
    setShowCreateDialog(false);
    refreshQuotations();
  };

  // Handle delete
  const handleDelete = () => {
    if (!selectedId) return;
    deleteQuotation(selectedId);
    setSelectedId(null);
    setShowDeleteDialog(false);
    refreshQuotations();
    toast({ title: 'Quotation deleted' });
  };

  // Handle add payment
  const handleAddPayment = () => {
    if (!selectedId) return;
    const amt = prompt('Enter payment amount:');
    if (!amt) return;
    const note = prompt('Payment note (optional):') || '';
    addPaymentToQuotation(selectedId, Number(amt), note);
    refreshQuotations();
    toast({ title: 'Payment added' });
  };

  // Handle remove payment
  const handleRemovePayment = (paymentId: string) => {
    if (!selectedId) return;
    removePaymentFromQuotation(selectedId, paymentId);
    refreshQuotations();
  };

  // Handle status change
  const handleStatusChange = (status: QuotationStatus) => {
    if (!selectedId) return;
    updateQuotation(selectedId, { status });
    refreshQuotations();
    toast({ title: `Status changed to ${status}` });
  };

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
                <h1 className="text-lg font-bold text-slate-900">Quotations</h1>
                <p className="text-xs text-slate-500">{stats.total} quotations</p>
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Quotations List */}
          <div className="lg:col-span-1 space-y-2">
            {filteredQuotations.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
                <FileText className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">No quotations found</p>
                <Button onClick={handleCreate} variant="outline" className="mt-3">
                  <Plus className="h-4 w-4 mr-1" />
                  Create First Quotation
                </Button>
              </div>
            ) : (
              filteredQuotations.map((q) => {
                const statusConfig = STATUS_CONFIG[q.status];
                const StatusIcon = statusConfig.icon;
                return (
                  <button
                    key={q.id}
                    onClick={() => setSelectedId(q.id)}
                    className={cn(
                      'w-full text-left bg-white rounded-xl border p-3 transition-all',
                      selectedId === q.id
                        ? 'border-indigo-300 ring-2 ring-indigo-100 shadow-md'
                        : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'
                    )}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-semibold text-slate-900 text-sm">{q.clientName || 'Unnamed'}</p>
                        <p className="text-[10px] text-slate-500 font-mono">{q.quotationNumber}</p>
                      </div>
                      <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-medium flex items-center gap-1', statusConfig.bg, statusConfig.color)}>
                        <StatusIcon className="h-3 w-3" />
                        {statusConfig.label}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">{q.date}</span>
                      <span className="font-bold text-indigo-600">₹{q.finalTotal.toLocaleString('en-IN')}</span>
                    </div>
                    {q.pendingAmount > 0 && (
                      <div className="mt-1.5 text-[10px] text-amber-600 bg-amber-50 rounded px-2 py-0.5 inline-block">
                        Pending: ₹{q.pendingAmount.toLocaleString('en-IN')}
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Detail Panel */}
          <div className="lg:col-span-2">
            {selected ? (
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

                  {/* Payment History */}
                  <div className="bg-emerald-50/50 rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-emerald-700 flex items-center gap-1">
                        <History className="h-3.5 w-3.5" />
                        Payment History ({selected.payments.length})
                      </span>
                      <Button
                        onClick={handleAddPayment}
                        size="sm"
                        className="h-7 px-2 text-xs bg-emerald-500 hover:bg-emerald-600"
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Add
                      </Button>
                    </div>
                    {selected.payments.length > 0 ? (
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {selected.payments.map((p) => (
                          <div key={p.id} className="flex items-center justify-between bg-white rounded-md px-3 py-2 text-xs">
                            <div className="flex items-center gap-3">
                              <span className="font-medium text-emerald-600">₹{p.amount.toLocaleString('en-IN')}</span>
                              <span className="text-slate-400">{p.date}</span>
                              {p.note && <span className="text-slate-500 truncate max-w-32">{p.note}</span>}
                            </div>
                            <button
                              onClick={() => handleRemovePayment(p.id)}
                              className="h-6 w-6 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded flex items-center justify-center transition-colors"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 text-center py-2">No payments recorded</p>
                    )}
                    {/* Pending Banner */}
                    <div className={cn(
                      'flex items-center justify-between px-3 py-2 rounded-lg',
                      selected.pendingAmount > 0
                        ? 'bg-gradient-to-r from-amber-100 to-orange-100 border border-amber-200/50'
                        : 'bg-gradient-to-r from-emerald-100 to-green-100 border border-emerald-200/50'
                    )}>
                      <div className="flex items-center gap-2">
                        <div className={cn('h-6 w-6 rounded-full flex items-center justify-center', selected.pendingAmount > 0 ? 'bg-amber-200' : 'bg-emerald-200')}>
                          {selected.pendingAmount > 0 ? (
                            <Clock className="h-3 w-3 text-amber-600" />
                          ) : (
                            <Check className="h-3 w-3 text-emerald-600" />
                          )}
                        </div>
                        <span className={cn('text-xs font-medium', selected.pendingAmount > 0 ? 'text-amber-700' : 'text-emerald-700')}>
                          {selected.pendingAmount > 0 ? 'Balance Due' : 'Fully Paid'}
                        </span>
                      </div>
                      <span className={cn('text-base font-bold', selected.pendingAmount > 0 ? 'text-amber-600' : 'text-emerald-600')}>
                        ₹{Math.max(0, selected.pendingAmount).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>

                  {/* Notes */}
                  {selected.notes && (
                    <div className="bg-slate-50 rounded-lg p-3">
                      <p className="text-xs text-slate-500 mb-1">Notes</p>
                      <p className="text-sm text-slate-700">{selected.notes}</p>
                    </div>
                  )}

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
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center">
                <FileText className="h-16 w-16 text-slate-200 mx-auto mb-4" />
                <p className="text-slate-500">Select a quotation to view details</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Create/Edit Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editMode ? 'Edit Quotation' : 'New Quotation'}</DialogTitle>
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

      {/* Delete Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Quotation?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600 py-4">
            This will permanently delete quotation <strong>{selected?.quotationNumber}</strong> and all payment records.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
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
