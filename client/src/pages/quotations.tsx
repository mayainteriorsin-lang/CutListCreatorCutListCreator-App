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
  Trash2,
  Edit3,
  Percent,
  X,
  Check,
  Send,
  XCircle,
  Zap,
  GitBranch,
  Save,
  FolderOpen,
  Ruler,
  CreditCard,
  FileSpreadsheet,
  User,
  Clock,
  IndianRupee,
  Receipt,
  History,
  FileImage,
  MessageSquare,
  Layers,
  ArrowRight,
  ArrowLeftRight,
  Camera,
  Upload,
  StickyNote,
  Tag,
  Heart,
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
import QuickQuotationPage from '@/pages/quick-quotation';

type FolderTab = 'payment' | 'quote' | 'info' | 'versions' | 'timeline' | 'documents' | 'notes';

const STATUS_CONFIG: Record<QuotationStatus, { label: string; color: string; bg: string; icon: typeof FileText }> = {
  DRAFT: { label: 'Draft', color: 'text-slate-600', bg: 'bg-slate-100', icon: Edit3 },
  SENT: { label: 'Sent', color: 'text-blue-600', bg: 'bg-blue-100', icon: Send },
  APPROVED: { label: 'Approved', color: 'text-emerald-600', bg: 'bg-emerald-100', icon: Check },
  REJECTED: { label: 'Rejected', color: 'text-red-600', bg: 'bg-red-100', icon: XCircle },
};

const FOLDER_TABS = [
  { id: 'payment' as FolderTab, label: 'Payment', icon: CreditCard },
  { id: 'quote' as FolderTab, label: 'Quote', icon: FileSpreadsheet },
  { id: 'versions' as FolderTab, label: 'Versions', icon: Layers },
  { id: 'timeline' as FolderTab, label: 'Timeline', icon: History },
  { id: 'documents' as FolderTab, label: 'Docs', icon: FileImage },
  { id: 'notes' as FolderTab, label: 'Notes', icon: MessageSquare },
  { id: 'info' as FolderTab, label: 'Info', icon: User },
];

// Compact Discount Section for Payment tab
const THANK_YOU_TEMPLATES = ['Thank you for choosing us!', 'We appreciate your business!', 'Looking forward to serving you!'];

function DiscountSection({ quotation, onUpdate }: { quotation: Quotation; onUpdate: (data: Partial<Quotation>) => void }) {
  const [discountPercent, setDiscountPercent] = useState(quotation.discountPercent || 0);
  const [discountFlat, setDiscountFlat] = useState(quotation.discountFlat || 0);
  const [thankYouMessage, setThankYouMessage] = useState(quotation.thankYouMessage || '');
  const [hasChanges, setHasChanges] = useState(false);

  const discountFromPercent = (quotation.subtotal * discountPercent) / 100;
  const totalDiscount = discountFromPercent + discountFlat;
  const newFinalTotal = Math.max(0, quotation.subtotal - totalDiscount);

  useEffect(() => {
    setHasChanges(
      discountPercent !== quotation.discountPercent ||
      discountFlat !== quotation.discountFlat ||
      thankYouMessage !== (quotation.thankYouMessage || '')
    );
  }, [discountPercent, discountFlat, thankYouMessage, quotation]);

  const handleApply = () => {
    onUpdate({
      discountPercent, discountFlat, thankYouMessage,
      finalTotal: newFinalTotal,
      pendingAmount: Math.max(0, newFinalTotal - quotation.totalPaid),
    });
    setHasChanges(false);
  };

  return (
    <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl p-3 space-y-2">
      <div className="flex items-center gap-2">
        <Tag className="h-4 w-4 text-orange-500" />
        <span className="text-xs font-semibold text-slate-700">Discount & Message</span>
        {totalDiscount > 0 && (
          <span className="ml-auto text-xs font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded">
            Save ₹{totalDiscount.toLocaleString('en-IN')}
          </span>
        )}
      </div>

      {/* Two column: Percentage & Flat */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-white/80 rounded-lg p-2">
          <span className="text-[10px] text-slate-500 flex items-center gap-1 mb-1"><Percent className="h-3 w-3" />Percentage</span>
          <div className="flex flex-wrap gap-1">
            {[0, 5, 10, 15, 20].map((pct) => (
              <button key={pct} onClick={() => setDiscountPercent(pct)}
                className={cn('px-2 py-1 rounded text-[10px] font-medium', discountPercent === pct ? 'bg-orange-500 text-white' : 'bg-slate-100 hover:bg-orange-100')}>
                {pct}%
              </button>
            ))}
            <Input type="number" value={discountPercent || ''} onChange={(e) => setDiscountPercent(Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
              className="w-12 h-6 text-[10px] px-1" placeholder="..." min={0} max={100} />
          </div>
        </div>
        <div className="bg-white/80 rounded-lg p-2">
          <span className="text-[10px] text-slate-500 flex items-center gap-1 mb-1"><IndianRupee className="h-3 w-3" />Flat Amount</span>
          <div className="flex flex-wrap gap-1">
            {[0, 1000, 2000, 5000].map((amt) => (
              <button key={amt} onClick={() => setDiscountFlat(amt)}
                className={cn('px-2 py-1 rounded text-[10px] font-medium', discountFlat === amt ? 'bg-orange-500 text-white' : 'bg-slate-100 hover:bg-orange-100')}>
                {amt === 0 ? '0' : `${amt/1000}k`}
              </button>
            ))}
            <Input type="number" value={discountFlat || ''} onChange={(e) => setDiscountFlat(Math.max(0, Number(e.target.value) || 0))}
              className="w-14 h-6 text-[10px] px-1" placeholder="..." min={0} />
          </div>
        </div>
      </div>

      {/* Thank You + Apply */}
      <div className="flex gap-2 items-center">
        <div className="flex-1 bg-white/80 rounded-lg p-2 flex items-center gap-2">
          <Heart className="h-3 w-3 text-pink-500 flex-shrink-0" />
          <div className="flex gap-1">
            {THANK_YOU_TEMPLATES.map((t, i) => (
              <button key={i} onClick={() => setThankYouMessage(t)}
                className={cn('w-5 h-5 rounded text-[9px]', thankYouMessage === t ? 'bg-pink-400 text-white' : 'bg-slate-100 hover:bg-pink-100')}>
                {i+1}
              </button>
            ))}
          </div>
          <Input value={thankYouMessage} onChange={(e) => setThankYouMessage(e.target.value)} placeholder="Thank you message..." className="h-6 text-[10px] flex-1" />
        </div>
        {hasChanges && (
          <Button onClick={handleApply} size="sm" className="h-7 px-3 bg-orange-500 hover:bg-orange-600 text-[10px]">
            <Check className="h-3 w-3 mr-1" />Apply
          </Button>
        )}
      </div>
    </div>
  );
}

export default function QuotationsPage() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<QuotationStatus | 'ALL'>('ALL');
  const [openFolderId, setOpenFolderId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<FolderTab>('payment');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [showVersions, setShowVersions] = useState(false);

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

    // Sort by date descending (newest first)
    result = [...result].sort((a, b) => b.date.localeCompare(a.date));

    return result;
  }, [quotations, statusFilter, search]);

  // Get open folder quotation
  const openFolder = openFolderId ? quotations.find(q => q.id === openFolderId) : null;

  // Check if quotation is from Quick Quote
  const isQuickQuote = (q: Quotation | null | undefined) => q?.source === 'quick-quote';

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
    if (!openFolder) return;
    if (isQuickQuote(openFolder)) return;
    setFormData({ ...openFolder });
    setEditMode(true);
    setShowCreateDialog(true);
  };

  // Handle save
  const handleSave = () => {
    if (editMode && openFolderId) {
      updateQuotation(openFolderId, formData);
      toast({ title: 'Client updated' });
    } else {
      const newQuot = createQuotation(formData);
      setOpenFolderId(newQuot.id);
      toast({ title: 'Client created', description: newQuot.quotationNumber });
    }
    setShowCreateDialog(false);
    refreshQuotations();
  };

  // Handle delete
  const handleDelete = () => {
    if (!deleteTargetId) return;
    if (deletePassword !== '4321') {
      setDeleteError('Incorrect password');
      return;
    }
    deleteQuotation(deleteTargetId);
    if (openFolderId === deleteTargetId) {
      setOpenFolderId(null);
    }
    setDeleteTargetId(null);
    setShowDeleteDialog(false);
    setDeletePassword('');
    setDeleteError('');
    refreshQuotations();
    toast({ title: 'Client deleted' });
  };

  const closeDeleteDialog = () => {
    setShowDeleteDialog(false);
    setDeletePassword('');
    setDeleteError('');
    setDeleteTargetId(null);
  };

  // Handle add payment
  const handleAddPayment = (data: {
    amount: number;
    method: PaymentMethod;
    reference?: string;
    note?: string;
    date?: string;
  }) => {
    if (!openFolderId) return;
    addPaymentToQuotation(openFolderId, data.amount, {
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
    if (!openFolderId) return;
    removePaymentFromQuotation(openFolderId, paymentId);
    refreshQuotations();
    toast({ title: 'Payment removed' });
  };

  // Handle status change
  const handleStatusChange = (status: QuotationStatus) => {
    if (!openFolderId) return;
    updateQuotation(openFolderId, { status });
    refreshQuotations();
    toast({ title: `Status changed to ${status}` });
  };

  // Handle save version
  const handleSaveVersion = () => {
    if (!openFolderId || isQuickQuote(openFolder)) return;
    const note = prompt('Version note (optional):') || undefined;
    const version = saveVersionToQuotation(openFolderId, note);
    if (version) {
      refreshQuotations();
      toast({ title: `Version v${version.version} saved` });
    }
  };

  // Handle delete version
  const handleDeleteVersion = (versionId: string) => {
    if (!openFolderId) return;
    if (confirm('Delete this version?')) {
      deleteVersionFromQuotation(openFolderId, versionId);
      refreshQuotations();
      toast({ title: 'Version deleted' });
    }
  };

  // Format currency
  const formatCurrency = (value: number) => `₹${value.toLocaleString('en-IN')}`;

  // Open a folder
  const openClientFolder = (id: string) => {
    setOpenFolderId(id);
    setActiveTab('payment');
    setShowVersions(false);
  };

  // Close folder
  const closeFolder = () => {
    setOpenFolderId(null);
  };

  return (
    <div className="h-screen overflow-hidden bg-gradient-to-br from-slate-100 via-slate-50 to-indigo-50/30 flex flex-col">
      {/* Header */}
      <header className="flex-shrink-0 bg-white/80 backdrop-blur-lg border-b border-slate-200/60 shadow-sm">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={() => navigate('/')}
                className="h-8 w-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors flex-shrink-0"
              >
                <ChevronLeft className="h-5 w-5 text-slate-600" />
              </button>
              <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 flex-shrink-0">
                <FolderOpen className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-sm sm:text-base font-bold text-slate-900 truncate">Client Folders</h1>
                <p className="text-[10px] sm:text-xs text-slate-500">{stats.total} clients</p>
              </div>
            </div>
            <Button
              onClick={handleCreate}
              className="h-8 px-2 sm:px-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-lg shadow-lg shadow-indigo-500/20 text-xs sm:text-sm"
            >
              <Plus className="h-4 w-4 sm:mr-1.5" />
              <span className="hidden sm:inline">New Client</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-hidden max-w-7xl mx-auto w-full px-2 sm:px-4 py-2 sm:py-3 flex flex-col">
        {/* Stats Row */}
        <div className="flex-shrink-0 grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-2 sm:mb-3">
          <div className="bg-white rounded-xl border border-slate-200 px-2 sm:px-3 py-1.5 sm:py-2 shadow-sm">
            <p className="text-[9px] sm:text-[10px] text-slate-500">Total Value</p>
            <p className="text-sm sm:text-base font-bold text-slate-800">₹{stats.totalValue.toLocaleString('en-IN')}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 px-2 sm:px-3 py-1.5 sm:py-2 shadow-sm">
            <p className="text-[9px] sm:text-[10px] text-slate-500">Received</p>
            <p className="text-sm sm:text-base font-bold text-emerald-600">₹{stats.totalReceived.toLocaleString('en-IN')}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 px-2 sm:px-3 py-1.5 sm:py-2 shadow-sm">
            <p className="text-[9px] sm:text-[10px] text-slate-500">Pending</p>
            <p className="text-sm sm:text-base font-bold text-amber-600">₹{stats.totalPending.toLocaleString('en-IN')}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 px-2 sm:px-3 py-1.5 sm:py-2 shadow-sm">
            <p className="text-[9px] sm:text-[10px] text-slate-500">Approved</p>
            <p className="text-sm sm:text-base font-bold text-indigo-600">{stats.approved}/{stats.total}</p>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="flex-shrink-0 flex flex-col sm:flex-row gap-2 mb-2 sm:mb-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by name, mobile..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 bg-white border-slate-200"
            />
          </div>
          <div className="flex gap-1 bg-white border border-slate-200 rounded-lg p-1 overflow-x-auto scrollbar-hide">
            {(['ALL', 'DRAFT', 'SENT', 'APPROVED', 'REJECTED'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={cn(
                  'px-2 sm:px-3 py-1 text-[10px] sm:text-xs font-medium rounded transition-colors whitespace-nowrap flex-shrink-0',
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

        {/* Main Content Area - Fill remaining height */}
        <div className="flex-1 flex gap-2 sm:gap-4 min-h-0 overflow-hidden">
          {/* Folders List - Left Side (hidden on mobile when folder is open) */}
          <div className={cn(
            'transition-all duration-300 overflow-y-auto',
            openFolderId ? 'hidden md:block w-80 flex-shrink-0' : 'w-full'
          )}>
            {filteredQuotations.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6 text-center shadow-sm">
                <FolderOpen className="h-8 sm:h-10 w-8 sm:w-10 text-slate-300 mx-auto mb-2 sm:mb-3" />
                <p className="text-sm sm:text-base text-slate-500">No clients found</p>
                <Button onClick={handleCreate} variant="outline" className="mt-2 sm:mt-3 text-xs sm:text-sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Add First Client
                </Button>
              </div>
            ) : (
              <div className={cn(
                'grid gap-2 sm:gap-3',
                openFolderId ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
              )}>
                {filteredQuotations.map((q) => {
                  const statusConfig = STATUS_CONFIG[q.status];
                  const StatusIcon = statusConfig.icon;
                  const isOpen = openFolderId === q.id;
                  const isQQ = isQuickQuote(q);
                  const paymentProgress = q.finalTotal > 0 ? Math.min(100, (q.totalPaid / q.finalTotal) * 100) : 0;

                  return (
                    <div
                      key={q.id}
                      onClick={() => !isOpen && openClientFolder(q.id)}
                      className={cn(
                        'group relative cursor-pointer transition-all duration-200',
                        isOpen && 'ring-2 ring-indigo-500 ring-offset-2'
                      )}
                    >
                      {/* Folder Tab */}
                      <div className={cn(
                        'absolute -top-3 left-3 sm:left-4 px-2 sm:px-3 py-0.5 sm:py-1 rounded-t-lg text-[10px] sm:text-xs font-medium z-10 transition-colors',
                        isOpen
                          ? 'bg-indigo-500 text-white'
                          : 'bg-amber-100 text-amber-700 group-hover:bg-amber-200'
                      )}>
                        {q.quotationNumber}
                        {isQQ && <Zap className="h-3 w-3 inline ml-1" />}
                      </div>

                      {/* Folder Body */}
                      <div className={cn(
                        'bg-white rounded-xl border-2 shadow-sm overflow-hidden transition-all',
                        isOpen
                          ? 'border-indigo-200 bg-indigo-50/30'
                          : 'border-slate-200 hover:border-indigo-300 hover:shadow-md'
                      )}>
                        {/* Folder Header */}
                        <div className="p-2 sm:p-3 pt-3 sm:pt-4">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-sm sm:text-base text-slate-900 truncate">
                                {q.clientName || 'Unnamed Client'}
                              </h3>
                              <div className="flex items-center gap-2 mt-0.5 sm:mt-1 text-[10px] sm:text-xs text-slate-500">
                                <Phone className="h-3 w-3" />
                                <span>{q.clientMobile || 'No phone'}</span>
                              </div>
                            </div>
                            <span className={cn(
                              'flex-shrink-0 inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-[9px] sm:text-[10px] font-medium',
                              statusConfig.bg, statusConfig.color
                            )}>
                              <StatusIcon className="h-2.5 sm:h-3 w-2.5 sm:w-3" />
                              <span className="hidden xs:inline">{statusConfig.label}</span>
                            </span>
                          </div>

                          {/* Amount Bar */}
                          <div className="mt-2 sm:mt-3">
                            <div className="flex items-center justify-between text-xs sm:text-sm mb-1">
                              <span className="font-bold text-slate-800">
                                {formatCurrency(q.finalTotal)}
                              </span>
                              {q.pendingAmount > 0 ? (
                                <span className="text-amber-600 font-medium text-[10px] sm:text-xs">
                                  {formatCurrency(q.pendingAmount)} due
                                </span>
                              ) : (
                                <span className="text-emerald-600 font-medium text-[10px] sm:text-xs flex items-center gap-1">
                                  <Check className="h-3 w-3" />
                                  Paid
                                </span>
                              )}
                            </div>
                            <div className="h-1.5 sm:h-2 bg-slate-200 rounded-full overflow-hidden">
                              <div
                                className={cn(
                                  'h-full rounded-full transition-all',
                                  paymentProgress >= 100
                                    ? 'bg-emerald-500'
                                    : 'bg-gradient-to-r from-emerald-400 to-teal-500'
                                )}
                                style={{ width: `${paymentProgress}%` }}
                              />
                            </div>
                          </div>

                          {/* Quick Stats (when collapsed) - hidden on mobile to save space */}
                          {!openFolderId && (
                            <div className="hidden sm:flex items-center gap-3 mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500">
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {q.date}
                              </div>
                              <div className="flex items-center gap-1">
                                <Receipt className="h-3 w-3" />
                                {q.payments.length} payments
                              </div>
                              {q.clientLocation && (
                                <div className="flex items-center gap-1 truncate">
                                  <MapPin className="h-3 w-3 flex-shrink-0" />
                                  <span className="truncate">{q.clientLocation}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Delete button on hover */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteTargetId(q.id);
                            setShowDeleteDialog(true);
                          }}
                          className="absolute top-2 right-2 h-6 w-6 rounded-lg bg-white shadow-sm border border-slate-200 flex items-center justify-center text-slate-400 hover:text-red-500 hover:border-red-200 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Open Folder Content - Right Side (full width on mobile) */}
          {openFolderId && openFolder && (
            <div className="flex-1 bg-white rounded-xl border-2 border-indigo-200 shadow-lg overflow-hidden flex flex-col min-h-0">
              {/* Folder Content Header */}
              <div className="flex-shrink-0 bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-2 sm:px-4 py-2 sm:py-3">
                <div className="flex items-center justify-between mb-2 sm:mb-3">
                  <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
                    {/* Back button on mobile */}
                    <button
                      onClick={closeFolder}
                      className="md:hidden h-7 w-7 rounded-lg flex-shrink-0 bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <h2 className="text-sm sm:text-base font-bold truncate">{openFolder.clientName || 'Unnamed Client'}</h2>
                    {isQuickQuote(openFolder) && (
                      <span className="hidden xs:flex flex-shrink-0 px-1.5 sm:px-2 py-0.5 rounded-full bg-amber-400 text-amber-900 text-[9px] sm:text-[10px] font-bold">
                        Quick
                      </span>
                    )}
                    <span className="hidden sm:inline text-indigo-200 text-xs">• {openFolder.quotationNumber}</span>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    {/* 2D Quotation Link - Always visible */}
                    <Button
                      onClick={() => {
                        const params = new URLSearchParams({
                          clientName: openFolder.clientName || '',
                          clientPhone: openFolder.clientMobile || '',
                          clientLocation: openFolder.clientLocation || '',
                          quoteNo: openFolder.quotationNumber || '',
                        });
                        navigate(`/2d-quotation?${params.toString()}`);
                      }}
                      size="sm"
                      className="h-6 sm:h-7 px-2 sm:px-3 bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] sm:text-xs font-medium"
                    >
                      <Ruler className="h-3 sm:h-3.5 w-3 sm:w-3.5 sm:mr-1" />
                      <span className="hidden sm:inline">2D Design</span>
                    </Button>
                    <button
                      onClick={closeFolder}
                      className="hidden md:flex h-7 w-7 rounded-lg flex-shrink-0 bg-white/20 hover:bg-white/30 items-center justify-center transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Single Row Tabs - scrollable on mobile */}
                <div className="flex gap-1 bg-white/10 p-0.5 sm:p-1 rounded-lg overflow-x-auto scrollbar-hide">
                  {FOLDER_TABS.map((tab) => {
                    const TabIcon = tab.icon;
                    const isActive = activeTab === tab.id;
                    const badge = tab.id === 'versions' ? (openFolder.versions?.length || 0) : null;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={cn(
                          'flex-shrink-0 sm:flex-1 flex items-center justify-center gap-0.5 sm:gap-1 px-2 sm:px-2 py-1 sm:py-1.5 rounded-md text-[10px] sm:text-xs font-medium transition-all relative',
                          isActive
                            ? 'bg-white text-indigo-600 shadow-sm'
                            : 'text-white/80 hover:bg-white/10'
                        )}
                      >
                        <TabIcon className="h-3 sm:h-3.5 w-3 sm:w-3.5" />
                        <span className="hidden xs:inline">{tab.label}</span>
                        {badge !== null && badge > 0 && (
                          <span className={cn(
                            'px-1 sm:px-1.5 py-0.5 rounded-full text-[8px] sm:text-[9px] font-bold',
                            isActive ? 'bg-indigo-100 text-indigo-700' : 'bg-white/20 text-white'
                          )}>
                            {badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tab Content */}
              <div className="flex-1 p-2 sm:p-3 overflow-y-auto">
                {/* Payment Tab */}
                {activeTab === 'payment' && (
                  <div className="h-full flex flex-col gap-2 sm:gap-3">
                    {/* Payment Section Component */}
                    <PaymentSection
                      quotation={openFolder}
                      onAddPayment={handleAddPayment}
                      onRemovePayment={handleRemovePayment}
                    />

                    {/* Discount Section */}
                    <DiscountSection
                      quotation={openFolder}
                      onUpdate={(data) => {
                        if (!openFolderId) return;
                        updateQuotation(openFolderId, data);
                        refreshQuotations();
                        toast({ title: 'Discount updated' });
                      }}
                    />
                  </div>
                )}

                {/* Quick Quote Tab */}
                {activeTab === 'quote' && (
                  <div>
                    {isQuickQuote(openFolder) ? (
                      <QuickQuotationPage />
                    ) : (
                      <div className="text-center py-12">
                        <FileSpreadsheet className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                        <p className="text-slate-500 mb-2">This is a native client entry</p>
                        <p className="text-sm text-slate-400">Use Quick Quotation page to create detailed quotes</p>
                        <Button
                          onClick={() => navigate('/quick-quotation')}
                          variant="outline"
                          className="mt-4"
                        >
                          <Zap className="h-4 w-4 mr-1" />
                          Open Quick Quotation
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {/* Versions Tab - Visual Version Cards */}
                {activeTab === 'versions' && (
                  <div className="space-y-3 sm:space-y-4">
                    {/* Current Version */}
                    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-3 sm:p-4 border-2 border-indigo-200">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2">
                          <span className="px-2 sm:px-3 py-0.5 sm:py-1 rounded-full bg-indigo-500 text-white text-xs sm:text-sm font-bold">
                            CURRENT
                          </span>
                          <span className="text-[10px] sm:text-sm text-slate-500">Updated: {openFolder.updatedAt.split('T')[0]}</span>
                        </div>
                        {!isQuickQuote(openFolder) && (
                          <Button
                            onClick={handleSaveVersion}
                            size="sm"
                            className="bg-indigo-500 hover:bg-indigo-600 h-7 sm:h-8 text-xs"
                          >
                            <Save className="h-3 sm:h-3.5 w-3 sm:w-3.5 mr-1" />
                            Save Version
                          </Button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
                        <div>
                          <p className="text-[10px] sm:text-xs text-slate-500">Subtotal</p>
                          <p className="text-sm sm:text-lg font-bold text-slate-800">{formatCurrency(openFolder.subtotal)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] sm:text-xs text-slate-500">Discount</p>
                          <p className="text-sm sm:text-lg font-bold text-orange-600">
                            {openFolder.discountPercent > 0 ? `${openFolder.discountPercent}%` : ''}
                            {openFolder.discountPercent > 0 && openFolder.discountFlat > 0 ? ' + ' : ''}
                            {openFolder.discountFlat > 0 ? formatCurrency(openFolder.discountFlat) : ''}
                            {!openFolder.discountPercent && !openFolder.discountFlat ? '-' : ''}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] sm:text-xs text-slate-500">Final Total</p>
                          <p className="text-sm sm:text-lg font-bold text-indigo-600">{formatCurrency(openFolder.finalTotal)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] sm:text-xs text-slate-500">Status</p>
                          <span className={cn('inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium', STATUS_CONFIG[openFolder.status].bg, STATUS_CONFIG[openFolder.status].color)}>
                            {STATUS_CONFIG[openFolder.status].label}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Previous Versions */}
                    <div>
                      <h3 className="text-xs sm:text-sm font-semibold text-slate-700 mb-2 sm:mb-3 flex items-center gap-2">
                        <GitBranch className="h-3.5 sm:h-4 w-3.5 sm:w-4" />
                        Previous Versions ({openFolder.versions?.length || 0})
                      </h3>

                      {(openFolder.versions?.length || 0) > 0 ? (
                        <div className="space-y-2 sm:space-y-3">
                          {[...(openFolder.versions || [])].reverse().map((v, idx) => (
                            <div key={v.id} className="bg-white rounded-xl p-3 sm:p-4 border border-slate-200 hover:border-indigo-200 transition-colors">
                              <div className="flex items-center justify-between mb-2 sm:mb-3">
                                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                                  <span className="px-2 sm:px-3 py-0.5 sm:py-1 rounded-full bg-slate-100 text-slate-700 text-xs sm:text-sm font-bold">
                                    v{v.version}
                                  </span>
                                  <span className="text-[10px] sm:text-sm text-slate-500">{v.date}</span>
                                  {v.note && (
                                    <span className="hidden sm:inline text-xs text-slate-400 italic">"{v.note}"</span>
                                  )}
                                </div>
                                <Button
                                  onClick={() => handleDeleteVersion(v.id)}
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 sm:h-7 w-6 sm:w-7 p-0 text-slate-400 hover:text-red-500"
                                >
                                  <Trash2 className="h-3 sm:h-3.5 w-3 sm:w-3.5" />
                                </Button>
                              </div>
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-4 text-xs sm:text-sm">
                                <div>
                                  <p className="text-[10px] sm:text-xs text-slate-500">Subtotal</p>
                                  <p className="font-semibold text-slate-700">{formatCurrency(v.subtotal)}</p>
                                </div>
                                <div>
                                  <p className="text-[10px] sm:text-xs text-slate-500">Final Total</p>
                                  <p className="font-semibold text-indigo-600">{formatCurrency(v.finalTotal)}</p>
                                </div>
                                <div className="hidden sm:flex items-center gap-2">
                                  {idx < (openFolder.versions?.length || 0) - 1 && (
                                    <div className="flex items-center gap-1 text-xs">
                                      <ArrowLeftRight className="h-3 w-3 text-slate-400" />
                                      <span className={cn(
                                        'font-medium',
                                        v.finalTotal > (openFolder.versions?.[openFolder.versions.length - 1 - idx - 1]?.finalTotal || 0)
                                          ? 'text-emerald-600'
                                          : 'text-red-500'
                                      )}>
                                        {v.finalTotal > (openFolder.versions?.[openFolder.versions.length - 1 - idx - 1]?.finalTotal || 0) ? '+' : ''}
                                        {formatCurrency(v.finalTotal - (openFolder.versions?.[openFolder.versions.length - 1 - idx - 1]?.finalTotal || 0))}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-6 sm:py-8 bg-slate-50 rounded-xl">
                          <Layers className="h-10 sm:h-12 w-10 sm:w-12 text-slate-300 mx-auto mb-2" />
                          <p className="text-sm sm:text-base text-slate-500">No versions saved yet</p>
                          <p className="text-[10px] sm:text-xs text-slate-400 mt-1">Save a version to track changes</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Timeline Tab - Activity History */}
                {activeTab === 'timeline' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                        <History className="h-4 w-4" />
                        Activity Timeline
                      </h3>
                    </div>

                    <div className="relative">
                      {/* Timeline Line */}
                      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-200" />

                      <div className="space-y-4">
                        {/* Created Event */}
                        <div className="relative flex gap-4 pl-10">
                          <div className="absolute left-2 w-5 h-5 rounded-full bg-indigo-500 border-2 border-white shadow flex items-center justify-center">
                            <Plus className="h-3 w-3 text-white" />
                          </div>
                          <div className="flex-1 bg-indigo-50 rounded-lg p-3">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-indigo-700">Quotation Created</span>
                              <span className="text-xs text-slate-500">{openFolder.createdAt.split('T')[0]}</span>
                            </div>
                            <p className="text-xs text-slate-600 mt-1">
                              Initial amount: {formatCurrency(openFolder.subtotal)}
                            </p>
                          </div>
                        </div>

                        {/* Payment Events */}
                        {openFolder.payments.map((payment, idx) => (
                          <div key={payment.id} className="relative flex gap-4 pl-10">
                            <div className="absolute left-2 w-5 h-5 rounded-full bg-emerald-500 border-2 border-white shadow flex items-center justify-center">
                              <IndianRupee className="h-3 w-3 text-white" />
                            </div>
                            <div className="flex-1 bg-emerald-50 rounded-lg p-3">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-emerald-700">
                                  Payment Received - {formatCurrency(payment.amount)}
                                </span>
                                <span className="text-xs text-slate-500">{payment.date}</span>
                              </div>
                              <p className="text-xs text-slate-600 mt-1">
                                {payment.method.toUpperCase()}
                                {payment.reference && ` • Ref: ${payment.reference}`}
                                {payment.note && ` • ${payment.note}`}
                              </p>
                            </div>
                          </div>
                        ))}

                        {/* Version Events */}
                        {openFolder.versions?.map((version) => (
                          <div key={version.id} className="relative flex gap-4 pl-10">
                            <div className="absolute left-2 w-5 h-5 rounded-full bg-purple-500 border-2 border-white shadow flex items-center justify-center">
                              <GitBranch className="h-3 w-3 text-white" />
                            </div>
                            <div className="flex-1 bg-purple-50 rounded-lg p-3">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-purple-700">
                                  Version v{version.version} Saved
                                </span>
                                <span className="text-xs text-slate-500">{version.date}</span>
                              </div>
                              <p className="text-xs text-slate-600 mt-1">
                                Total: {formatCurrency(version.finalTotal)}
                                {version.note && ` • "${version.note}"`}
                              </p>
                            </div>
                          </div>
                        ))}

                        {/* Status Change (simulated - last update) */}
                        {openFolder.status !== 'DRAFT' && (
                          <div className="relative flex gap-4 pl-10">
                            <div className={cn(
                              'absolute left-2 w-5 h-5 rounded-full border-2 border-white shadow flex items-center justify-center',
                              openFolder.status === 'APPROVED' ? 'bg-emerald-500' :
                              openFolder.status === 'SENT' ? 'bg-blue-500' : 'bg-red-500'
                            )}>
                              {openFolder.status === 'APPROVED' ? <Check className="h-3 w-3 text-white" /> :
                               openFolder.status === 'SENT' ? <Send className="h-3 w-3 text-white" /> :
                               <XCircle className="h-3 w-3 text-white" />}
                            </div>
                            <div className={cn(
                              'flex-1 rounded-lg p-3',
                              openFolder.status === 'APPROVED' ? 'bg-emerald-50' :
                              openFolder.status === 'SENT' ? 'bg-blue-50' : 'bg-red-50'
                            )}>
                              <div className="flex items-center justify-between">
                                <span className={cn(
                                  'text-sm font-medium',
                                  openFolder.status === 'APPROVED' ? 'text-emerald-700' :
                                  openFolder.status === 'SENT' ? 'text-blue-700' : 'text-red-700'
                                )}>
                                  Status: {STATUS_CONFIG[openFolder.status].label}
                                </span>
                                <span className="text-xs text-slate-500">{openFolder.updatedAt.split('T')[0]}</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Documents Tab */}
                {activeTab === 'documents' && (
                  <div className="space-y-3 sm:space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs sm:text-sm font-semibold text-slate-700 flex items-center gap-2">
                        <FileImage className="h-3.5 sm:h-4 w-3.5 sm:w-4" />
                        Documents & Photos
                      </h3>
                      <Button size="sm" variant="outline" className="h-7 sm:h-8 text-xs">
                        <Upload className="h-3 sm:h-3.5 w-3 sm:w-3.5 mr-1" />
                        Upload
                      </Button>
                    </div>

                    {/* Document Categories */}
                    <div className="grid grid-cols-3 gap-2 sm:gap-3">
                      <div className="bg-blue-50 rounded-xl p-2 sm:p-4 text-center border-2 border-dashed border-blue-200 hover:border-blue-400 cursor-pointer transition-colors">
                        <FileText className="h-6 sm:h-8 w-6 sm:w-8 text-blue-400 mx-auto mb-1 sm:mb-2" />
                        <p className="text-[10px] sm:text-sm font-medium text-blue-700">Contracts</p>
                        <p className="text-[9px] sm:text-xs text-blue-500">0 files</p>
                      </div>
                      <div className="bg-amber-50 rounded-xl p-2 sm:p-4 text-center border-2 border-dashed border-amber-200 hover:border-amber-400 cursor-pointer transition-colors">
                        <Camera className="h-6 sm:h-8 w-6 sm:w-8 text-amber-400 mx-auto mb-1 sm:mb-2" />
                        <p className="text-[10px] sm:text-sm font-medium text-amber-700">Photos</p>
                        <p className="text-[9px] sm:text-xs text-amber-500">0 files</p>
                      </div>
                      <div className="bg-emerald-50 rounded-xl p-2 sm:p-4 text-center border-2 border-dashed border-emerald-200 hover:border-emerald-400 cursor-pointer transition-colors">
                        <Receipt className="h-6 sm:h-8 w-6 sm:w-8 text-emerald-400 mx-auto mb-1 sm:mb-2" />
                        <p className="text-[10px] sm:text-sm font-medium text-emerald-700">Receipts</p>
                        <p className="text-[9px] sm:text-xs text-emerald-500">{openFolder.payments.length}</p>
                      </div>
                    </div>

                    {/* Empty State */}
                    <div className="text-center py-6 sm:py-8 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                      <Upload className="h-10 sm:h-12 w-10 sm:w-12 text-slate-300 mx-auto mb-2" />
                      <p className="text-sm sm:text-base text-slate-500">Drop files here or click to upload</p>
                      <p className="text-[10px] sm:text-xs text-slate-400 mt-1">PDF, JPG, PNG (max 10MB)</p>
                    </div>
                  </div>
                )}

                {/* Notes Tab */}
                {activeTab === 'notes' && (
                  <div className="space-y-3 sm:space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs sm:text-sm font-semibold text-slate-700 flex items-center gap-2">
                        <MessageSquare className="h-3.5 sm:h-4 w-3.5 sm:w-4" />
                        Notes & Comments
                      </h3>
                      <Button size="sm" variant="outline" className="h-7 sm:h-8 text-xs">
                        <Plus className="h-3 sm:h-3.5 w-3 sm:w-3.5 mr-1" />
                        Add
                      </Button>
                    </div>

                    {/* Existing Notes */}
                    {openFolder.notes ? (
                      <div className="bg-yellow-50 rounded-xl p-3 sm:p-4 border border-yellow-200">
                        <div className="flex items-start gap-2 sm:gap-3">
                          <StickyNote className="h-4 sm:h-5 w-4 sm:w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-xs sm:text-sm text-slate-700">{openFolder.notes}</p>
                            <p className="text-[10px] sm:text-xs text-slate-400 mt-1 sm:mt-2">Added on {openFolder.createdAt.split('T')[0]}</p>
                          </div>
                        </div>
                      </div>
                    ) : null}

                    {/* Quick Notes Templates */}
                    <div>
                      <p className="text-[10px] sm:text-xs font-medium text-slate-500 mb-1.5 sm:mb-2">Quick Notes</p>
                      <div className="flex flex-wrap gap-1.5 sm:gap-2">
                        {['Site visit', 'Waiting approval', 'Design changes', 'Production', 'Installation'].map((note) => (
                          <button
                            key={note}
                            className="px-2 sm:px-3 py-1 sm:py-1.5 bg-slate-100 hover:bg-slate-200 rounded-full text-[10px] sm:text-xs text-slate-600 transition-colors"
                          >
                            {note}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Add Note Input */}
                    <div className="bg-slate-50 rounded-xl p-3 sm:p-4">
                      <textarea
                        placeholder="Add a note about this client..."
                        className="w-full bg-white rounded-lg border border-slate-200 p-2 sm:p-3 text-xs sm:text-sm resize-none h-20 sm:h-24 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <div className="flex justify-end mt-2">
                        <Button size="sm" className="bg-indigo-500 hover:bg-indigo-600 h-7 sm:h-8 text-xs">
                          <Save className="h-3 sm:h-3.5 w-3 sm:w-3.5 mr-1" />
                          Save
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Client Info Tab */}
                {activeTab === 'info' && (
                  <div className="space-y-3 sm:space-y-4">
                    {/* Client Details Card */}
                    <div className="bg-gradient-to-r from-slate-50 to-indigo-50/50 rounded-xl p-3 sm:p-4">
                      <h3 className="font-semibold text-xs sm:text-base text-slate-800 flex items-center gap-2 mb-3 sm:mb-4">
                        <User className="h-3.5 sm:h-4 w-3.5 sm:w-4 text-indigo-500" />
                        Client Details
                      </h3>
                      <div className="grid grid-cols-2 gap-2 sm:gap-4">
                        <div className="bg-white rounded-lg p-2 sm:p-3 border border-slate-100">
                          <p className="text-[9px] sm:text-[10px] text-slate-500 uppercase tracking-wide">Name</p>
                          <p className="font-semibold text-xs sm:text-base text-slate-800 truncate">{openFolder.clientName || '-'}</p>
                        </div>
                        <div className="bg-white rounded-lg p-2 sm:p-3 border border-slate-100">
                          <p className="text-[9px] sm:text-[10px] text-slate-500 uppercase tracking-wide">Phone</p>
                          <div className="flex items-center gap-1 sm:gap-2">
                            <Phone className="h-3 sm:h-3.5 w-3 sm:w-3.5 text-indigo-400" />
                            <p className="font-semibold text-xs sm:text-base text-slate-800">{openFolder.clientMobile || '-'}</p>
                          </div>
                        </div>
                        <div className="bg-white rounded-lg p-2 sm:p-3 border border-slate-100">
                          <p className="text-[9px] sm:text-[10px] text-slate-500 uppercase tracking-wide">Location</p>
                          <div className="flex items-center gap-1 sm:gap-2">
                            <MapPin className="h-3 sm:h-3.5 w-3 sm:w-3.5 text-indigo-400" />
                            <p className="font-semibold text-xs sm:text-base text-slate-800 truncate">{openFolder.clientLocation || '-'}</p>
                          </div>
                        </div>
                        <div className="bg-white rounded-lg p-2 sm:p-3 border border-slate-100">
                          <p className="text-[9px] sm:text-[10px] text-slate-500 uppercase tracking-wide">Email</p>
                          <p className="font-semibold text-xs sm:text-base text-slate-800 truncate">{openFolder.clientEmail || '-'}</p>
                        </div>
                      </div>
                    </div>

                    {/* Quotation Details Card */}
                    <div className="bg-gradient-to-r from-purple-50/50 to-indigo-50 rounded-xl p-3 sm:p-4">
                      <h3 className="font-semibold text-xs sm:text-base text-slate-800 flex items-center gap-2 mb-3 sm:mb-4">
                        <FileText className="h-3.5 sm:h-4 w-3.5 sm:w-4 text-purple-500" />
                        Quotation Details
                      </h3>
                      <div className="grid grid-cols-3 gap-2 sm:gap-3">
                        <div className="bg-white rounded-lg p-2 sm:p-3 border border-slate-100">
                          <p className="text-[9px] sm:text-[10px] text-slate-500 uppercase tracking-wide">Quote #</p>
                          <p className="font-mono font-semibold text-[10px] sm:text-base text-slate-800 truncate">{openFolder.quotationNumber}</p>
                        </div>
                        <div className="bg-white rounded-lg p-2 sm:p-3 border border-slate-100">
                          <p className="text-[9px] sm:text-[10px] text-slate-500 uppercase tracking-wide">Date</p>
                          <div className="flex items-center gap-1 sm:gap-2">
                            <Calendar className="hidden sm:block h-3.5 w-3.5 text-purple-400" />
                            <p className="font-semibold text-[10px] sm:text-base text-slate-800">{openFolder.date}</p>
                          </div>
                        </div>
                        <div className="bg-white rounded-lg p-2 sm:p-3 border border-slate-100">
                          <p className="text-[9px] sm:text-[10px] text-slate-500 uppercase tracking-wide">Valid</p>
                          <div className="flex items-center gap-1 sm:gap-2">
                            <Clock className="hidden sm:block h-3.5 w-3.5 text-purple-400" />
                            <p className="font-semibold text-[10px] sm:text-base text-slate-800">{openFolder.validityDate}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Quick Actions - 2D Design Link */}
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-3 sm:p-4">
                      <h3 className="font-semibold text-xs sm:text-base text-slate-800 mb-2 sm:mb-3 flex items-center gap-2">
                        <Ruler className="h-3.5 sm:h-4 w-3.5 sm:w-4 text-blue-500" />
                        Design Tools
                      </h3>
                      <Button
                        onClick={() => {
                          const params = new URLSearchParams({
                            clientName: openFolder.clientName || '',
                            clientPhone: openFolder.clientMobile || '',
                            clientLocation: openFolder.clientLocation || '',
                            quoteNo: openFolder.quotationNumber || '',
                          });
                          navigate(`/2d-quotation?${params.toString()}`);
                        }}
                        className="w-full h-10 sm:h-12 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white text-sm sm:text-base font-medium"
                      >
                        <Ruler className="h-4 sm:h-5 w-4 sm:w-5 mr-2" />
                        Open 2D Quotation Designer
                        <ArrowRight className="h-4 sm:h-5 w-4 sm:w-5 ml-2" />
                      </Button>
                      <p className="text-[10px] sm:text-xs text-slate-500 mt-2 text-center">
                        Client details will be auto-filled
                      </p>
                    </div>

                    {/* Status Actions */}
                    <div className="bg-gradient-to-r from-emerald-50/50 to-teal-50 rounded-xl p-3 sm:p-4">
                      <h3 className="font-semibold text-xs sm:text-base text-slate-800 mb-2 sm:mb-3 flex items-center gap-2">
                        <Check className="h-3.5 sm:h-4 w-3.5 sm:w-4 text-emerald-500" />
                        Status & Actions
                      </h3>
                      <div className="flex flex-wrap gap-1.5 sm:gap-2">
                        {!isQuickQuote(openFolder) && (
                          <Button
                            onClick={handleEdit}
                            variant="outline"
                            size="sm"
                            className="h-7 sm:h-8 text-[10px] sm:text-xs"
                          >
                            <Edit3 className="h-3 sm:h-3.5 w-3 sm:w-3.5 mr-1" />
                            Edit
                          </Button>
                        )}
                        {openFolder.status !== 'SENT' && (
                          <Button
                            onClick={() => handleStatusChange('SENT')}
                            variant="outline"
                            size="sm"
                            className="h-7 sm:h-8 text-[10px] sm:text-xs border-blue-200 text-blue-600 hover:bg-blue-50"
                          >
                            <Send className="h-3 sm:h-3.5 w-3 sm:w-3.5 mr-1" />
                            Sent
                          </Button>
                        )}
                        {openFolder.status !== 'APPROVED' && (
                          <Button
                            onClick={() => handleStatusChange('APPROVED')}
                            size="sm"
                            className="h-7 sm:h-8 text-[10px] sm:text-xs bg-emerald-500 hover:bg-emerald-600"
                          >
                            <Check className="h-3 sm:h-3.5 w-3 sm:w-3.5 mr-1" />
                            Approve
                          </Button>
                        )}
                        {openFolder.status !== 'REJECTED' && (
                          <Button
                            onClick={() => handleStatusChange('REJECTED')}
                            variant="outline"
                            size="sm"
                            className="h-7 sm:h-8 text-[10px] sm:text-xs text-red-600 border-red-200 hover:bg-red-50"
                          >
                            <XCircle className="h-3 sm:h-3.5 w-3 sm:w-3.5 mr-1" />
                            Reject
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Source Info */}
                    <div className="bg-slate-100 rounded-lg p-2 sm:p-3 flex items-center justify-between">
                      <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs text-slate-500">
                        <span>Source:</span>
                        <span className={cn(
                          'px-1.5 sm:px-2 py-0.5 rounded-full font-medium',
                          isQuickQuote(openFolder) ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'
                        )}>
                          {isQuickQuote(openFolder) ? 'Quick' : 'Native'}
                        </span>
                      </div>
                      <div className="text-[10px] sm:text-xs text-slate-400">
                        {openFolder.createdAt.split('T')[0]}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Create/Edit Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto mx-2 sm:mx-auto">
          <DialogHeader>
            <DialogTitle className="text-sm sm:text-base">{editMode ? 'Edit Client' : 'New Client'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 sm:space-y-4 py-2 sm:py-4">
            {/* Client Info */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
              <div>
                <label className="text-[10px] sm:text-xs font-medium text-slate-600 mb-1 block">Client Name</label>
                <Input
                  value={formData.clientName || ''}
                  onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                  placeholder="Name"
                  className="h-8 sm:h-9 text-sm"
                />
              </div>
              <div>
                <label className="text-[10px] sm:text-xs font-medium text-slate-600 mb-1 block">Mobile</label>
                <Input
                  value={formData.clientMobile || ''}
                  onChange={(e) => setFormData({ ...formData, clientMobile: e.target.value })}
                  placeholder="9876543210"
                  className="h-8 sm:h-9 text-sm"
                />
              </div>
              <div>
                <label className="text-[10px] sm:text-xs font-medium text-slate-600 mb-1 block">Location</label>
                <Input
                  value={formData.clientLocation || ''}
                  onChange={(e) => setFormData({ ...formData, clientLocation: e.target.value })}
                  placeholder="City"
                  className="h-8 sm:h-9 text-sm"
                />
              </div>
            </div>

            {/* Quotation Details */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
              <div>
                <label className="text-[10px] sm:text-xs font-medium text-slate-600 mb-1 block">Quotation No.</label>
                <Input
                  value={formData.quotationNumber || ''}
                  onChange={(e) => setFormData({ ...formData, quotationNumber: e.target.value })}
                  placeholder="Q-2026-001"
                  className="h-8 sm:h-9 text-sm"
                />
              </div>
              <div>
                <label className="text-[10px] sm:text-xs font-medium text-slate-600 mb-1 block">Date</label>
                <Input
                  type="date"
                  value={formData.date || ''}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="h-8 sm:h-9 text-sm"
                />
              </div>
              <div>
                <label className="text-[10px] sm:text-xs font-medium text-slate-600 mb-1 block">Valid Till</label>
                <Input
                  type="date"
                  value={formData.validityDate || ''}
                  onChange={(e) => setFormData({ ...formData, validityDate: e.target.value })}
                  className="h-8 sm:h-9 text-sm"
                />
              </div>
            </div>

            {/* Amounts */}
            <div className="bg-slate-50 rounded-xl p-2 sm:p-3 space-y-2 sm:space-y-3">
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                <div>
                  <label className="text-[10px] sm:text-xs font-medium text-slate-600 mb-1 block">Subtotal (₹)</label>
                  <Input
                    type="number"
                    value={formData.subtotal || ''}
                    onChange={(e) => setFormData({ ...formData, subtotal: Number(e.target.value) || 0 })}
                    placeholder="0"
                    className="h-8 sm:h-9 text-sm"
                  />
                </div>
                <div>
                  <label className="text-[10px] sm:text-xs font-medium text-slate-600 mb-1 block">Discount %</label>
                  <Input
                    type="number"
                    value={formData.discountPercent || ''}
                    onChange={(e) => setFormData({ ...formData, discountPercent: Number(e.target.value) || 0 })}
                    placeholder="0"
                    className="h-8 sm:h-9 text-sm"
                  />
                </div>
                <div>
                  <label className="text-[10px] sm:text-xs font-medium text-slate-600 mb-1 block">Flat (₹)</label>
                  <Input
                    type="number"
                    value={formData.discountFlat || ''}
                    onChange={(e) => setFormData({ ...formData, discountFlat: Number(e.target.value) || 0 })}
                    placeholder="0"
                    className="h-8 sm:h-9 text-sm"
                  />
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs sm:text-sm text-slate-600">Final: </span>
                <span className="text-sm sm:text-lg font-bold text-indigo-600">
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
              <label className="text-[10px] sm:text-xs font-medium text-slate-600 mb-1 block">Notes</label>
              <Input
                value={formData.notes || ''}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Terms, conditions..."
                className="h-8 sm:h-9 text-sm"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowCreateDialog(false)} className="h-8 sm:h-9 text-xs sm:text-sm">
              Cancel
            </Button>
            <Button onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-700 h-8 sm:h-9 text-xs sm:text-sm">
              {editMode ? 'Save' : 'Create'}
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
              This will permanently delete this client and all payment records.
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
