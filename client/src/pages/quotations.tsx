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

type FolderTab = 'payment' | 'quote' | 'info';

const STATUS_CONFIG: Record<QuotationStatus, { label: string; color: string; bg: string; icon: typeof FileText }> = {
  DRAFT: { label: 'Draft', color: 'text-slate-600', bg: 'bg-slate-100', icon: Edit3 },
  SENT: { label: 'Sent', color: 'text-blue-600', bg: 'bg-blue-100', icon: Send },
  APPROVED: { label: 'Approved', color: 'text-emerald-600', bg: 'bg-emerald-100', icon: Check },
  REJECTED: { label: 'Rejected', color: 'text-red-600', bg: 'bg-red-100', icon: XCircle },
};

const FOLDER_TABS = [
  { id: 'payment' as FolderTab, label: 'Payment', icon: CreditCard, color: 'emerald' },
  { id: 'quote' as FolderTab, label: 'Quick Quote', icon: FileSpreadsheet, color: 'amber' },
  { id: 'info' as FolderTab, label: 'Client Info', icon: User, color: 'indigo' },
];

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
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-indigo-50/30">
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
                <FolderOpen className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-900">Client Folders</h1>
                <p className="text-xs text-slate-500">{stats.total} clients</p>
              </div>
            </div>
            <Button
              onClick={handleCreate}
              className="h-9 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl shadow-lg shadow-indigo-500/20"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              New Client
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

        {/* Main Content Area */}
        <div className="flex gap-4">
          {/* Folders List - Left Side */}
          <div className={cn(
            'transition-all duration-300',
            openFolderId ? 'w-80 flex-shrink-0' : 'w-full'
          )}>
            {filteredQuotations.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-8 text-center shadow-sm">
                <FolderOpen className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">No clients found</p>
                <Button onClick={handleCreate} variant="outline" className="mt-3">
                  <Plus className="h-4 w-4 mr-1" />
                  Add First Client
                </Button>
              </div>
            ) : (
              <div className={cn(
                'grid gap-3',
                openFolderId ? 'grid-cols-1' : 'grid-cols-3'
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
                        'absolute -top-3 left-4 px-3 py-1 rounded-t-lg text-xs font-medium z-10 transition-colors',
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
                        <div className="p-4 pt-5">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-slate-900 truncate">
                                {q.clientName || 'Unnamed Client'}
                              </h3>
                              <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                                <Phone className="h-3 w-3" />
                                <span>{q.clientMobile || 'No phone'}</span>
                              </div>
                              {!openFolderId && q.clientLocation && (
                                <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400">
                                  <MapPin className="h-3 w-3" />
                                  <span className="truncate">{q.clientLocation}</span>
                                </div>
                              )}
                            </div>
                            <span className={cn(
                              'flex-shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium',
                              statusConfig.bg, statusConfig.color
                            )}>
                              <StatusIcon className="h-3 w-3" />
                              {statusConfig.label}
                            </span>
                          </div>

                          {/* Amount Bar */}
                          <div className="mt-3">
                            <div className="flex items-center justify-between text-sm mb-1">
                              <span className="font-bold text-slate-800">
                                {formatCurrency(q.finalTotal)}
                              </span>
                              {q.pendingAmount > 0 ? (
                                <span className="text-amber-600 font-medium text-xs">
                                  {formatCurrency(q.pendingAmount)} pending
                                </span>
                              ) : (
                                <span className="text-emerald-600 font-medium text-xs flex items-center gap-1">
                                  <Check className="h-3 w-3" />
                                  Fully Paid
                                </span>
                              )}
                            </div>
                            {/* Progress bar */}
                            <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
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

                          {/* Quick Stats (when collapsed) */}
                          {!openFolderId && (
                            <div className="flex items-center gap-3 mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500">
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {q.date}
                              </div>
                              <div className="flex items-center gap-1">
                                <Receipt className="h-3 w-3" />
                                {q.payments.length} payments
                              </div>
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

          {/* Open Folder Content - Right Side */}
          {openFolderId && openFolder && (
            <div className="flex-1 bg-white rounded-xl border-2 border-indigo-200 shadow-lg overflow-hidden">
              {/* Folder Content Header */}
              <div className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-bold">{openFolder.clientName || 'Unnamed Client'}</h2>
                      {isQuickQuote(openFolder) && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-400 text-amber-900 text-[10px] font-bold">
                          Quick Quote
                        </span>
                      )}
                    </div>
                    <p className="text-indigo-100 text-sm">{openFolder.quotationNumber}</p>
                  </div>
                  <button
                    onClick={closeFolder}
                    className="h-8 w-8 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 mt-4 bg-white/10 p-1 rounded-lg">
                  {FOLDER_TABS.map((tab) => {
                    const TabIcon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={cn(
                          'flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all',
                          isActive
                            ? 'bg-white text-indigo-600 shadow-sm'
                            : 'text-white/80 hover:bg-white/10'
                        )}
                      >
                        <TabIcon className="h-4 w-4" />
                        {tab.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tab Content */}
              <div className="p-4 max-h-[calc(100vh-300px)] overflow-y-auto">
                {/* Payment Tab */}
                {activeTab === 'payment' && (
                  <div className="space-y-4">
                    {/* Amount Summary Cards */}
                    <div className="grid grid-cols-4 gap-3">
                      <div className="bg-slate-50 rounded-lg p-3 text-center">
                        <p className="text-[10px] text-slate-500">Subtotal</p>
                        <p className="text-sm font-bold text-slate-800">{formatCurrency(openFolder.subtotal)}</p>
                      </div>
                      <div className="bg-indigo-50 rounded-lg p-3 text-center">
                        <p className="text-[10px] text-slate-500">Final Total</p>
                        <p className="text-sm font-bold text-indigo-600">{formatCurrency(openFolder.finalTotal)}</p>
                      </div>
                      <div className="bg-emerald-50 rounded-lg p-3 text-center">
                        <p className="text-[10px] text-slate-500">Received</p>
                        <p className="text-sm font-bold text-emerald-600">{formatCurrency(openFolder.totalPaid)}</p>
                      </div>
                      <div className={cn('rounded-lg p-3 text-center', openFolder.pendingAmount > 0 ? 'bg-amber-50' : 'bg-emerald-50')}>
                        <p className="text-[10px] text-slate-500">Pending</p>
                        <p className={cn('text-sm font-bold', openFolder.pendingAmount > 0 ? 'text-amber-600' : 'text-emerald-600')}>
                          {formatCurrency(Math.max(0, openFolder.pendingAmount))}
                        </p>
                      </div>
                    </div>

                    {/* Discount info */}
                    {(openFolder.discountPercent > 0 || openFolder.discountFlat > 0) && (
                      <div className="flex items-center gap-2 text-xs text-orange-600 bg-orange-50 p-2 rounded-lg">
                        <Percent className="h-3.5 w-3.5" />
                        Discount Applied: {openFolder.discountPercent > 0 && `${openFolder.discountPercent}%`}
                        {openFolder.discountPercent > 0 && openFolder.discountFlat > 0 && ' + '}
                        {openFolder.discountFlat > 0 && formatCurrency(openFolder.discountFlat)}
                      </div>
                    )}

                    {/* Payment Section Component */}
                    <PaymentSection
                      quotation={openFolder}
                      onAddPayment={handleAddPayment}
                      onRemovePayment={handleRemovePayment}
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

                {/* Client Info Tab */}
                {activeTab === 'info' && (
                  <div className="space-y-4">
                    {/* Client Details Card */}
                    <div className="bg-slate-50 rounded-xl p-4 space-y-4">
                      <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                        <User className="h-4 w-4 text-indigo-500" />
                        Client Details
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-slate-500">Name</p>
                          <p className="font-medium text-slate-800">{openFolder.clientName || '-'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Phone</p>
                          <div className="flex items-center gap-2">
                            <Phone className="h-3.5 w-3.5 text-slate-400" />
                            <p className="font-medium text-slate-800">{openFolder.clientMobile || '-'}</p>
                          </div>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Location</p>
                          <div className="flex items-center gap-2">
                            <MapPin className="h-3.5 w-3.5 text-slate-400" />
                            <p className="font-medium text-slate-800">{openFolder.clientLocation || '-'}</p>
                          </div>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Email</p>
                          <p className="font-medium text-slate-800">{openFolder.clientEmail || '-'}</p>
                        </div>
                      </div>
                    </div>

                    {/* Quotation Details Card */}
                    <div className="bg-slate-50 rounded-xl p-4 space-y-4">
                      <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                        <FileText className="h-4 w-4 text-indigo-500" />
                        Quotation Details
                      </h3>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <p className="text-xs text-slate-500">Quotation Number</p>
                          <p className="font-mono font-medium text-slate-800">{openFolder.quotationNumber}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Date</p>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-3.5 w-3.5 text-slate-400" />
                            <p className="font-medium text-slate-800">{openFolder.date}</p>
                          </div>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Valid Till</p>
                          <div className="flex items-center gap-2">
                            <Clock className="h-3.5 w-3.5 text-slate-400" />
                            <p className="font-medium text-slate-800">{openFolder.validityDate}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Notes */}
                    {openFolder.notes && (
                      <div className="bg-slate-50 rounded-xl p-4">
                        <h3 className="font-semibold text-slate-800 mb-2">Notes</h3>
                        <p className="text-sm text-slate-600">{openFolder.notes}</p>
                      </div>
                    )}

                    {/* Version History */}
                    <div className="bg-indigo-50/50 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <button
                          onClick={() => setShowVersions(!showVersions)}
                          className="text-sm font-medium text-indigo-700 flex items-center gap-2 hover:text-indigo-800 transition-colors"
                        >
                          <GitBranch className="h-4 w-4" />
                          Version History ({openFolder.versions?.length || 0})
                          {showVersions ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </button>
                        {!isQuickQuote(openFolder) && (
                          <Button
                            onClick={handleSaveVersion}
                            size="sm"
                            className="h-8 bg-indigo-500 hover:bg-indigo-600"
                          >
                            <Save className="h-3.5 w-3.5 mr-1" />
                            Save Version
                          </Button>
                        )}
                      </div>
                      {showVersions && (
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {(openFolder.versions?.length || 0) > 0 ? (
                            [...(openFolder.versions || [])].reverse().map((v) => (
                              <div key={v.id} className="bg-white rounded-lg p-3 border border-indigo-100">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 text-xs font-bold">v{v.version}</span>
                                    <span className="text-xs text-slate-500">{v.date}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-indigo-600 text-sm">{formatCurrency(v.finalTotal)}</span>
                                    <button
                                      onClick={() => handleDeleteVersion(v.id)}
                                      className="h-6 w-6 text-slate-400 hover:text-red-500 rounded flex items-center justify-center"
                                    >
                                      <X className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </div>
                                {v.note && <p className="text-xs text-slate-500 italic mt-1">"{v.note}"</p>}
                              </div>
                            ))
                          ) : (
                            <p className="text-sm text-slate-400 text-center py-4">No versions saved</p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Status Actions */}
                    <div className="bg-slate-50 rounded-xl p-4">
                      <h3 className="font-semibold text-slate-800 mb-3">Status & Actions</h3>
                      <div className="flex flex-wrap gap-2">
                        {!isQuickQuote(openFolder) && (
                          <Button
                            onClick={handleEdit}
                            variant="outline"
                            size="sm"
                          >
                            <Edit3 className="h-3.5 w-3.5 mr-1" />
                            Edit
                          </Button>
                        )}
                        {openFolder.status !== 'SENT' && (
                          <Button
                            onClick={() => handleStatusChange('SENT')}
                            variant="outline"
                            size="sm"
                          >
                            <Send className="h-3.5 w-3.5 mr-1" />
                            Mark Sent
                          </Button>
                        )}
                        {openFolder.status !== 'APPROVED' && (
                          <Button
                            onClick={() => handleStatusChange('APPROVED')}
                            size="sm"
                            className="bg-emerald-500 hover:bg-emerald-600"
                          >
                            <Check className="h-3.5 w-3.5 mr-1" />
                            Approve
                          </Button>
                        )}
                        {openFolder.status !== 'REJECTED' && (
                          <Button
                            onClick={() => handleStatusChange('REJECTED')}
                            variant="outline"
                            size="sm"
                            className="text-red-600 border-red-200 hover:bg-red-50"
                          >
                            <XCircle className="h-3.5 w-3.5 mr-1" />
                            Reject
                          </Button>
                        )}
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
