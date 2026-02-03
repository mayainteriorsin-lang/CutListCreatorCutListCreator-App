import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { toastError } from "@/lib/errors/toastError";
import { apiRequest, API_BASE } from "@/lib/queryClient";
import { debouncedFetch } from "@/lib/api/debouncedFetch";
import { safeFetchZod } from "@/lib/api/fetchZod";
import { WoodGrainsPrefsSchema } from "@/lib/api/schemas";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { PlywoodSelectorPanel, LaminateSelectorPanel } from "@/components/selectors";
import { LaminateLibrary } from "@/components/master-settings/LaminateLibrary";
import { useMasterSettingsStore, useGodownStore } from "@/features/material";
import {
  loadSheetSettings,
  saveSheetSettings,
  loadLaminateMemory,
  fetchCatalogues as fetchCataloguesApi,
  type Catalogue,
} from "@/features/settings";
import {
  Ruler,
  Scissors,
  Layers,
  Loader2,
  Sparkles,
  Search,
  Check,
  X,
  ChevronRight,
  Settings2,
  Palette,
  Grid3X3,
  FileText,
} from "lucide-react";

// Tab configuration
const TABS = [
  { id: "materials", label: "Materials", icon: Layers, color: "blue" },
  { id: "sheets", label: "Sheet Size", icon: Grid3X3, color: "violet" },
  { id: "woodgrain", label: "Wood Grain", icon: Sparkles, color: "amber" },
] as const;

type TabId = typeof TABS[number]["id"];

export default function SettingsPage() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabId>("materials");
  const [searchQuery, setSearchQuery] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Catalogue state
  const [catalogues, setCatalogues] = useState<Catalogue[]>([]);
  const [, setIsUploadingCatalogue] = useState(false);
  const [, setIsLoadingCatalogues] = useState(false);
  const [viewingCatalogue, setViewingCatalogue] = useState<string | null>(null);

  // Master Settings from store
  const masterSettings = useMasterSettingsStore((s) => s.data);
  const isLoadingMasterSettings = useMasterSettingsStore((s) => s.loading);
  const fetchMasterSettings = useMasterSettingsStore((s) => s.fetch);
  const saveMasterSettings = useMasterSettingsStore((s) => s.save);

  // Godown from store
  const plywoodOptions = useGodownStore((s) => s.plywoodOptions);
  const _isLoadingMaterials = useGodownStore((s) => s.loading);
  const fetchMaterials = useGodownStore((s) => s.fetch);

  // Local state for materials
  const [masterPlywoodBrand, setMasterPlywoodBrand] = useState("");
  const [masterLaminateCode, setMasterLaminateCode] = useState("");
  const [masterInnerLaminateCode, setMasterInnerLaminateCode] = useState("");
  const [woodGrainsPreferences, setWoodGrainsPreferences] = useState<Record<string, boolean>>({});

  // Sheet settings - load from localStorage
  const initialSheetSettings = useMemo(() => loadSheetSettings(), []);
  const [sheetWidth, setSheetWidth] = useState(initialSheetSettings.sheetWidth);
  const [sheetHeight, setSheetHeight] = useState(initialSheetSettings.sheetHeight);
  const [kerf, setKerf] = useState(initialSheetSettings.kerf);

  // Fetch data on mount - run all in parallel for faster loading
  useEffect(() => {
    Promise.all([
      fetchMasterSettings(),
      fetchMaterials(),
      fetchCatalogues(),
    ]);
  }, []);

  // Fetch catalogues - PHASE 3: Uses feature service
  async function fetchCatalogues() {
    setIsLoadingCatalogues(true);
    try {
      const data = await fetchCataloguesApi();
      setCatalogues(data);
    } catch (error) {
      console.error("Error fetching catalogues:", error);
    } finally {
      setIsLoadingCatalogues(false);
    }
  }

  // Handle PDF upload
  async function handleCatalogueUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      toast({
        title: "Invalid File",
        description: "Please upload a PDF file only",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Maximum file size is 50MB",
        variant: "destructive",
      });
      return;
    }

    setIsUploadingCatalogue(true);
    try {
      const base64 = await fileToBase64(file);
      await apiRequest("POST", "/api/laminate-catalogue", {
        filename: file.name,
        mimeType: file.type,
        base64,
      });

      toast({
        title: "Catalogue Uploaded",
        description: `${file.name} uploaded successfully`,
      });

      fetchCatalogues();
    } catch (error) {
      console.error("Error uploading catalogue:", error);
      toastError(error);
    } finally {
      setIsUploadingCatalogue(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  // Convert file to base64
  function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(",")[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // Delete catalogue
  async function handleDeleteCatalogue(filename: string) {
    if (!confirm("Delete this catalogue?")) return;

    try {
      await apiRequest("DELETE", `/api/laminate-catalogue/${filename}`);
      toast({
        title: "Catalogue Deleted",
        description: "Catalogue removed successfully",
      });
      fetchCatalogues();
      if (viewingCatalogue === filename) {
        setViewingCatalogue(null);
      }
    } catch (error) {
      console.error("Error deleting catalogue:", error);
      toastError(error);
    }
  }

  // Format file size
  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  // Fetch wood grains preferences - runs with initial load
  useEffect(() => {
    debouncedFetch("wood-grains-preferences", () =>
      safeFetchZod(
        `${API_BASE}/api/wood-grains-preferences`,
        WoodGrainsPrefsSchema,
        []
      )
    ).then((json) => {
      if (Array.isArray(json)) {
        const prefMap: Record<string, boolean> = {};
        json.forEach((item: any) => {
          if (item && typeof item.laminateCode === "string") {
            prefMap[item.laminateCode] = item.woodGrainsEnabled === true;
          }
        });
        setWoodGrainsPreferences(prefMap);
      }
    });
  }, []);

  // Initialize from master settings
  useEffect(() => {
    if (masterSettings?.masterLaminateCode && !masterLaminateCode) {
      setMasterLaminateCode(masterSettings.masterLaminateCode);
    }
    const inner = (masterSettings as any)?.masterInnerLaminateCode ?? (masterSettings as any)?.innerLaminateCode;
    if (inner && !masterInnerLaminateCode) {
      setMasterInnerLaminateCode(inner);
    }
  }, [masterSettings]);

  useEffect(() => {
    if (masterPlywoodBrand) return;
    const masterBrand = (masterSettings as any)?.masterPlywoodBrand;
    if (masterBrand) {
      setMasterPlywoodBrand(masterBrand);
      return;
    }
    if (!isLoadingMasterSettings && plywoodOptions.length > 0) {
      setMasterPlywoodBrand(plywoodOptions[0].brand);
    }
  }, [masterPlywoodBrand, masterSettings, plywoodOptions, isLoadingMasterSettings]);

  // Auto-save sheet settings when they change
  useEffect(() => {
    saveSheetSettings({ sheetWidth, sheetHeight, kerf });
  }, [sheetWidth, sheetHeight, kerf]);

  // Get laminate codes from storage - PHASE 3: Uses feature service
  const [globalLaminateMemory, setGlobalLaminateMemory] = useState<string[]>([]);

  // Load laminate memory on mount and when window focuses
  useEffect(() => {
    const reloadMemory = () => setGlobalLaminateMemory(loadLaminateMemory());
    reloadMemory();
    window.addEventListener("focus", reloadMemory);
    return () => window.removeEventListener("focus", reloadMemory);
  }, []);

  const uniqueLaminateCodes = useMemo(() => {
    const set = new Set<string>(globalLaminateMemory);
    return Array.from(set).sort();
  }, [globalLaminateMemory]);

  // Filter laminate codes by search
  const filteredLaminateCodes = useMemo(() => {
    if (!searchQuery.trim()) return uniqueLaminateCodes;
    const query = searchQuery.toLowerCase();
    return uniqueLaminateCodes.filter((code) => code.toLowerCase().includes(query));
  }, [uniqueLaminateCodes, searchQuery]);

  // Loading state - no longer blocks UI, content shows progressively
  const isLoading = false; // Removed blocking - each section loads independently

  // Stats for header
  const enabledGrainCount = Object.values(woodGrainsPreferences).filter(Boolean).length;

  return (
    <AppLayout
      title="Settings"
      subtitle="Configure your workspace preferences"
      headerActions={
        <Button
          onClick={() => navigate("/cabinets")}
          className="bg-gradient-to-r from-slate-800 to-slate-900 hover:from-slate-900 hover:to-black text-white shadow-lg"
        >
          <i className="fas fa-cube mr-2"></i>
          Go to Cabinets
        </Button>
      }
    >
      <div className="max-w-5xl mx-auto">
        {/* Stats Header */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-2xl border border-slate-200/60 p-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                <Palette className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{masterLaminateCode || "-"}</p>
                <p className="text-xs text-slate-500">Outer Laminate</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200/60 p-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
                <Grid3X3 className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{sheetWidth}x{sheetHeight}</p>
                <p className="text-xs text-slate-500">Sheet Size (mm)</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200/60 p-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{enabledGrainCount}</p>
                <p className="text-xs text-slate-500">Wood Grain Enabled</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200/60 p-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{catalogues.length}</p>
                <p className="text-xs text-slate-500">Catalogues</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-xl overflow-hidden">
          {/* Tabs Header */}
          <div className="flex border-b border-slate-100 bg-slate-50/50">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              const colorClasses = {
                blue: isActive ? "text-blue-600 border-blue-600 bg-blue-50" : "text-slate-500 hover:text-blue-600 hover:bg-blue-50/50",
                violet: isActive ? "text-violet-600 border-violet-600 bg-violet-50" : "text-slate-500 hover:text-violet-600 hover:bg-violet-50/50",
                amber: isActive ? "text-amber-600 border-amber-600 bg-amber-50" : "text-slate-500 hover:text-amber-600 hover:bg-amber-50/50",
              };
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-all ${
                    isActive ? `${colorClasses[tab.color]} border-current` : `${colorClasses[tab.color]} border-transparent`
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                  {tab.id === "woodgrain" && enabledGrainCount > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-amber-100 text-amber-700">
                      {enabledGrainCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-16">
              <div className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                </div>
                <p className="text-sm text-slate-500">Loading settings...</p>
              </div>
            </div>
          )}

          {/* Tab Content */}
          {!isLoading && (
            <div className="p-6">
              {/* Materials Tab */}
              {activeTab === "materials" && (
                <div className="space-y-8 animate-in fade-in duration-300">
                  {/* Info Banner */}
                  <div className="flex items-start gap-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <Settings2 className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-blue-900">Default Material Settings</h4>
                      <p className="text-sm text-blue-700 mt-1">
                        These materials will be auto-selected for new cabinets. Existing cabinets won't be affected.
                      </p>
                    </div>
                  </div>

                  {/* Material Selection - Single Horizontal Row */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Plywood Brand */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center">
                          <i className="fas fa-layer-group text-slate-600 text-xs"></i>
                        </div>
                        <Label className="text-sm font-semibold text-slate-800">Plywood</Label>
                      </div>
                      <PlywoodSelectorPanel
                        value={masterPlywoodBrand}
                        onChange={setMasterPlywoodBrand}
                        onSave={(val) => saveMasterSettings({ masterPlywoodBrand: val })}
                      />
                    </div>

                    {/* Outer Laminate */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-md bg-blue-100 flex items-center justify-center">
                          <i className="fas fa-paint-roller text-blue-600 text-xs"></i>
                        </div>
                        <Label className="text-sm font-semibold text-slate-800">Front Laminate</Label>
                      </div>
                      <LaminateSelectorPanel
                        value={masterLaminateCode}
                        onChange={setMasterLaminateCode}
                        onSave={(val) => saveMasterSettings({ masterLaminateCode: val })}
                        showWoodGrainToggle={true}
                        woodGrainsPreferences={woodGrainsPreferences}
                        onWoodGrainChange={(code, enabled) => {
                          setWoodGrainsPreferences((prev) => ({ ...prev, [code]: enabled }));
                        }}
                      />
                    </div>

                    {/* Inner Laminate */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center">
                          <i className="fas fa-box-open text-slate-600 text-xs"></i>
                        </div>
                        <Label className="text-sm font-semibold text-slate-800">Inner Laminate</Label>
                      </div>
                      <LaminateSelectorPanel
                        value={masterInnerLaminateCode}
                        onChange={setMasterInnerLaminateCode}
                        onSave={(val) => saveMasterSettings({ masterInnerLaminateCode: val })}
                        showWoodGrainToggle={false}
                      />
                    </div>
                  </div>

                    {/* Laminate Library Section */}
                    <div className="mt-6 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-200">
                      <LaminateLibrary
                        woodGrainsPreferences={woodGrainsPreferences}
                        onWoodGrainChange={(code, enabled) => {
                          setWoodGrainsPreferences((prev) => ({ ...prev, [code]: enabled }));
                        }}
                      />
                    </div>
                </div>
              )}

              {/* Sheet Size Tab */}
              {activeTab === "sheets" && (
                <div className="space-y-8 animate-in fade-in duration-300">
                  {/* Info Banner */}
                  <div className="flex items-start gap-4 p-4 bg-gradient-to-r from-violet-50 to-purple-50 rounded-xl border border-violet-100">
                    <div className="w-10 h-10 rounded-lg bg-violet-100 flex items-center justify-center flex-shrink-0">
                      <Ruler className="w-5 h-5 text-violet-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-violet-900">Sheet Size Configuration</h4>
                      <p className="text-sm text-violet-700 mt-1">
                        Used for cut optimization and material calculation. Changes auto-save instantly.
                      </p>
                    </div>
                  </div>

                  {/* Sheet Size Inputs */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Width */}
                    <div className="bg-slate-50/50 rounded-xl p-5 border border-slate-100 hover:border-violet-200 transition-colors">
                      <div className="flex items-center justify-between mb-4">
                        <Label className="text-sm font-semibold text-slate-700">Sheet Width</Label>
                        <span className="text-xs text-slate-400 bg-white px-2 py-1 rounded-md">mm</span>
                      </div>
                      <Input
                        type="number"
                        value={sheetWidth}
                        onChange={(e) => setSheetWidth(parseInt(e.target.value) || 1210)}
                        className="h-12 text-lg font-semibold bg-white border-slate-200 focus:border-violet-400 focus:ring-violet-400"
                        min="500"
                        max="5000"
                      />
                      <div className="flex items-center justify-between mt-3">
                        <p className="text-xs text-slate-400">Standard: 1210mm</p>
                        {sheetWidth === 1210 && (
                          <span className="text-xs text-emerald-600 flex items-center gap-1">
                            <Check className="w-3 h-3" /> Standard
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Height */}
                    <div className="bg-slate-50/50 rounded-xl p-5 border border-slate-100 hover:border-violet-200 transition-colors">
                      <div className="flex items-center justify-between mb-4">
                        <Label className="text-sm font-semibold text-slate-700">Sheet Height</Label>
                        <span className="text-xs text-slate-400 bg-white px-2 py-1 rounded-md">mm</span>
                      </div>
                      <Input
                        type="number"
                        value={sheetHeight}
                        onChange={(e) => setSheetHeight(parseInt(e.target.value) || 2420)}
                        className="h-12 text-lg font-semibold bg-white border-slate-200 focus:border-violet-400 focus:ring-violet-400"
                        min="500"
                        max="5000"
                      />
                      <div className="flex items-center justify-between mt-3">
                        <p className="text-xs text-slate-400">Standard: 2420mm</p>
                        {sheetHeight === 2420 && (
                          <span className="text-xs text-emerald-600 flex items-center gap-1">
                            <Check className="w-3 h-3" /> Standard
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Kerf */}
                    <div className="bg-slate-50/50 rounded-xl p-5 border border-slate-100 hover:border-violet-200 transition-colors">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <Label className="text-sm font-semibold text-slate-700">Blade Kerf</Label>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Scissors className="w-4 h-4 text-slate-400 cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Material lost during cutting (blade thickness)</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                        <span className="text-xs text-slate-400 bg-white px-2 py-1 rounded-md">mm</span>
                      </div>
                      <Input
                        type="number"
                        value={kerf}
                        onChange={(e) => {
                          const val = parseInt(e.target.value);
                          if (val >= 0 && val <= 10) setKerf(val);
                        }}
                        className="h-12 text-lg font-semibold bg-white border-slate-200 focus:border-violet-400 focus:ring-violet-400"
                        min="0"
                        max="10"
                      />
                      <div className="flex items-center justify-between mt-3">
                        <p className="text-xs text-slate-400">Typical: 3-5mm</p>
                        {kerf >= 3 && kerf <= 5 && (
                          <span className="text-xs text-emerald-600 flex items-center gap-1">
                            <Check className="w-3 h-3" /> Optimal
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Visual Preview */}
                  <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-6 border border-slate-200">
                    <h4 className="text-sm font-semibold text-slate-700 mb-4">Sheet Preview</h4>
                    <div className="flex items-center justify-center">
                      <div
                        className="bg-gradient-to-br from-amber-100 to-amber-200 border-2 border-amber-300 rounded-lg relative flex items-center justify-center"
                        style={{
                          width: Math.min(200, sheetWidth / 10),
                          height: Math.min(300, sheetHeight / 10),
                        }}
                      >
                        <div className="text-center">
                          <p className="text-xs font-bold text-amber-800">{sheetWidth} x {sheetHeight}</p>
                          <p className="text-xs text-amber-600">mm</p>
                        </div>
                        {/* Kerf indicator */}
                        <div className="absolute -right-8 top-1/2 -translate-y-1/2 flex items-center gap-1">
                          <div className="w-4 h-0.5 bg-red-400"></div>
                          <span className="text-xs text-red-500 font-medium">{kerf}mm</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Reset Button */}
                  <div className="flex justify-end">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSheetWidth(1210);
                        setSheetHeight(2420);
                        setKerf(5);
                        toast({
                          title: "Reset Complete",
                          description: "Sheet settings restored to standard values",
                        });
                      }}
                      className="text-slate-600"
                    >
                      <i className="fas fa-undo mr-2 text-xs"></i>
                      Reset to Defaults
                    </Button>
                  </div>
                </div>
              )}

              {/* Wood Grain Tab */}
              {activeTab === "woodgrain" && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  {/* Info Banner */}
                  <div className="flex items-start gap-4 p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-100">
                    <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                      <Sparkles className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-amber-900">Wood Grain Direction</h4>
                      <p className="text-sm text-amber-700 mt-1">
                        Enable grain direction for laminates with visible wood patterns. This affects cut optimization.
                      </p>
                    </div>
                  </div>

                  {/* Search */}
                  {uniqueLaminateCodes.length > 0 && (
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        type="text"
                        placeholder="Search laminate codes..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 h-11 bg-slate-50 border-slate-200 focus:bg-white"
                      />
                      {searchQuery && (
                        <button
                          onClick={() => setSearchQuery("")}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  )}

                  {/* Stats */}
                  {uniqueLaminateCodes.length > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500">
                        {filteredLaminateCodes.length} laminate{filteredLaminateCodes.length !== 1 ? "s" : ""} found
                      </span>
                      <span className="text-amber-600 font-medium">
                        {enabledGrainCount} with grain enabled
                      </span>
                    </div>
                  )}

                  {/* Laminate List */}
                  <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                    {filteredLaminateCodes.length === 0 ? (
                      <div className="text-center py-16">
                        <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                          <i className="fas fa-inbox text-2xl text-slate-300"></i>
                        </div>
                        {searchQuery ? (
                          <>
                            <p className="text-sm font-medium text-slate-600">No matches found</p>
                            <p className="text-xs text-slate-400 mt-1">Try a different search term</p>
                          </>
                        ) : (
                          <>
                            <p className="text-sm font-medium text-slate-600">No laminate codes yet</p>
                            <p className="text-xs text-slate-400 mt-1">Add cabinets to see laminate codes here</p>
                            <Button
                              variant="outline"
                              size="sm"
                              className="mt-4"
                              onClick={() => navigate("/cabinets")}
                            >
                              <i className="fas fa-plus mr-2"></i>
                              Add Cabinets
                            </Button>
                          </>
                        )}
                      </div>
                    ) : (
                      filteredLaminateCodes.map((code) => {
                        const isEnabled = woodGrainsPreferences[code] === true;
                        return (
                          <button
                            key={code}
                            onClick={async () => {
                              const newValue = !isEnabled;
                              try {
                                await apiRequest("POST", "/api/wood-grains-preference", {
                                  laminateCode: code,
                                  woodGrainsEnabled: newValue,
                                });
                                setWoodGrainsPreferences((prev) => ({
                                  ...prev,
                                  [code]: newValue,
                                }));
                                toast({
                                  title: newValue ? "Grain Enabled" : "Grain Disabled",
                                  description: `${code} ${newValue ? "now uses" : "no longer uses"} grain direction`,
                                });
                              } catch (error) {
                                console.error("Error toggling wood grains:", error);
                                toastError(error);
                              }
                            }}
                            className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${
                              isEnabled
                                ? "bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200 hover:border-amber-300"
                                : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                                  isEnabled ? "bg-amber-100" : "bg-slate-100"
                                }`}
                              >
                                {isEnabled ? (
                                  <Sparkles className="w-5 h-5 text-amber-600" />
                                ) : (
                                  <Layers className="w-5 h-5 text-slate-400" />
                                )}
                              </div>
                              <div className="text-left">
                                <p className={`font-semibold ${isEnabled ? "text-amber-800" : "text-slate-700"}`}>
                                  {code}
                                </p>
                                <p className="text-xs text-slate-500">
                                  {isEnabled ? "Grain direction matters" : "Any cutting direction"}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                                  isEnabled
                                    ? "bg-amber-200 text-amber-800"
                                    : "bg-slate-100 text-slate-500"
                                }`}
                              >
                                {isEnabled ? "ON" : "OFF"}
                              </span>
                              <ChevronRight className="w-4 h-4 text-slate-300" />
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
