/**
 * MasterSettingsCard Component
 * 
 * Extracted from home.tsx to reduce file size and improve maintainability.
 * Controls default materials, sheet size, and wood grain preferences.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { PlywoodSelectorPanel, LaminateSelectorPanel } from "@/components/selectors";
import { useToast } from "@/hooks/use-toast";
import { toastError } from "@/lib/toastUtils";
import { apiRequest } from "@/lib/queryClient";

export interface MasterSettingsCardProps {
    visible: boolean;
    onToggleVisible: () => void;

    // Material settings
    masterPlywoodBrand: string;
    setMasterPlywoodBrand: (v: string) => void;
    masterLaminateCode: string;
    setMasterLaminateCode: (v: string) => void;

    // Optimization settings
    optimizePlywoodUsage: boolean;
    setOptimizePlywoodUsage: (v: boolean) => void;

    // Sheet size settings
    sheetWidth: number;
    setSheetWidth: (v: number) => void;
    sheetHeight: number;
    setSheetHeight: (v: number) => void;
    kerf: number;
    setKerf: (v: number) => void;

    // Wood grain settings
    woodGrainsPreferences: Record<string, boolean>;
    setWoodGrainsPreferences: (updater: Record<string, boolean> | ((prev: Record<string, boolean>) => Record<string, boolean>)) => void;
    uniqueLaminateCodes: string[];
    globalLaminateMemory: Array<{ laminateCode: string }>;

    // Persistence
    saveMasterSettings: (data: any) => void;
}

export function MasterSettingsCard({
    visible,
    onToggleVisible,
    masterPlywoodBrand,
    setMasterPlywoodBrand,
    masterLaminateCode,
    setMasterLaminateCode,
    optimizePlywoodUsage,
    setOptimizePlywoodUsage,
    sheetWidth,
    setSheetWidth,
    sheetHeight,
    setSheetHeight,
    kerf,
    setKerf,
    woodGrainsPreferences,
    setWoodGrainsPreferences,
    uniqueLaminateCodes,
    globalLaminateMemory,
    saveMasterSettings,
}: MasterSettingsCardProps) {
    const { toast } = useToast();

    return (
        <Card className="bg-white/70 backdrop-blur-sm border-slate-200/60 shadow-xl shadow-slate-200/50 rounded-2xl overflow-hidden">
            <CardHeader className="px-5 sm:px-6 py-4 bg-gradient-to-r from-slate-50 to-transparent border-b border-slate-100">
                <CardTitle className="flex items-center justify-between text-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center">
                            <i className="fas fa-sliders-h text-white text-xs"></i>
                        </div>
                        <span className="text-base font-semibold">Master Settings</span>
                    </div>
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={onToggleVisible}
                        className="h-8 w-8 p-0 rounded-full hover:bg-slate-100"
                        data-testid="button-toggle-master-settings"
                    >
                        <i className={`fas ${visible ? 'fa-chevron-up' : 'fa-chevron-down'} text-slate-500 text-xs`}></i>
                    </Button>
                </CardTitle>
            </CardHeader>
            {visible && (
                <CardContent className="px-5 sm:px-6 py-5">
                    <div className="space-y-5">
                        {/* Info Banner */}
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-4">
                            <p className="text-sm text-blue-700 flex items-start gap-2">
                                <i className="fas fa-lightbulb text-blue-500 mt-0.5"></i>
                                <span>Set default materials for <strong>new</strong> cabinets. <span className="text-blue-500">Existing items won't change.</span></span>
                            </p>
                        </div>

                        {/* Row 1: Plywood Brand */}
                        <PlywoodSelectorPanel
                            value={masterPlywoodBrand}
                            onChange={setMasterPlywoodBrand}
                            onSave={(val) => saveMasterSettings({ masterPlywoodBrand: val })}
                        />

                        {/* Row 2: Laminate with Wood Grains toggle */}
                        <LaminateSelectorPanel
                            value={masterLaminateCode}
                            onChange={setMasterLaminateCode}
                            onSave={(val) => saveMasterSettings({ masterLaminateCode: val })}
                            showWoodGrainToggle={true}
                            woodGrainsPreferences={woodGrainsPreferences}
                            onWoodGrainChange={(code, enabled) => {
                                setWoodGrainsPreferences((prev) => ({ ...prev, [code]: enabled }));
                            }}
                            helpText="* Selected items are added to your Quick-Fill library."
                        />

                        {/* Optimize Plywood Usage Section */}
                        <div className="mt-6 pt-4 border-t border-gray-200">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                    <Label className="text-sm font-medium text-gray-700 mb-1 block flex items-center">
                                        <i className="fas fa-leaf text-green-500 mr-2"></i>
                                        Save Material Mode
                                    </Label>
                                    <p className="text-xs text-gray-500 leading-relaxed">
                                        Groups different cabinets together on the same sheet if they match Plywood & Laminate.
                                        <br /><span className="text-xs opacity-75">Turn OFF to cut each cabinet separately.</span>
                                    </p>
                                </div>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant={optimizePlywoodUsage ? "default" : "outline"}
                                    onClick={() => {
                                        const newValue = !optimizePlywoodUsage;
                                        setOptimizePlywoodUsage(newValue);
                                        saveMasterSettings({ optimizePlywoodUsage: newValue as any });
                                    }}
                                    className={`h-9 px-4 text-sm whitespace-nowrap transition-all ${optimizePlywoodUsage
                                        ? 'bg-green-600 hover:bg-green-700 text-white border-transparent shadow-sm'
                                        : 'text-gray-500 border-gray-300 hover:bg-gray-50'
                                        }`}
                                    data-testid="button-optimize-plywood"
                                >
                                    {optimizePlywoodUsage ? (
                                        <><i className="fas fa-check mr-2"></i>Active</>
                                    ) : (
                                        <><i className="fas fa-power-off mr-2"></i>Off</>
                                    )}
                                </Button>
                            </div>
                        </div>

                        {/* Sheet Size Section */}
                        <div className="mt-6 pt-4 border-t border-gray-200">
                            <Label className="text-sm font-medium text-gray-700 mb-3 block">
                                <i className="fas fa-ruler-combined mr-2 text-blue-500"></i>
                                Sheet Size Settings
                            </Label>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {/* Sheet Width */}
                                <div className="space-y-2">
                                    <Label className="text-xs text-slate-600">Sheet Width (mm)</Label>
                                    <Input
                                        type="number"
                                        value={sheetWidth}
                                        onChange={(e) => setSheetWidth(parseInt(e.target.value) || 1210)}
                                        placeholder="Width"
                                        className="text-sm"
                                        min="500"
                                        max="5000"
                                        data-testid="input-sheet-width"
                                    />
                                </div>

                                {/* Sheet Height */}
                                <div className="space-y-2">
                                    <Label className="text-xs text-slate-600">Sheet Height (mm)</Label>
                                    <Input
                                        type="number"
                                        value={sheetHeight}
                                        onChange={(e) => setSheetHeight(parseInt(e.target.value) || 2420)}
                                        placeholder="Height"
                                        className="text-sm"
                                        min="500"
                                        max="5000"
                                        data-testid="input-sheet-height"
                                    />
                                </div>

                                {/* Kerf */}
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <Label className="text-xs text-slate-600">Kerf (mm)</Label>
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <i className="fas fa-info-circle text-slate-400 text-[10px] cursor-help"></i>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p>Blade thickness (usually 3-4mm). <br />Material lost during cutting.</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    </div>
                                    <Input
                                        type="number"
                                        value={kerf}
                                        onChange={(e) => {
                                            const value = parseInt(e.target.value);
                                            if (value >= 0 && value <= 10) {
                                                setKerf(value);
                                            }
                                        }}
                                        placeholder="Kerf"
                                        className="text-sm"
                                        min="0"
                                        max="10"
                                        data-testid="input-kerf"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Wood Grain Settings Section */}
                        <div className="mt-6 pt-4 border-t border-gray-200">
                            <Label className="text-sm font-medium text-gray-700 mb-3 block">
                                <i className="fas fa-seedling mr-2 text-green-500"></i>
                                Wood Grain Settings
                            </Label>
                            <div className="space-y-4">
                                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                                    <p className="text-xs text-green-800">
                                        <i className="fas fa-info-circle mr-1"></i>
                                        Toggle wood grain for each laminate code. When enabled, panels use dimensional mapping for optimization.
                                    </p>
                                </div>

                                {/* Laminate codes list with toggles */}
                                <div className="space-y-2 max-h-96 overflow-y-auto">
                                    {globalLaminateMemory.length === 0 ? (
                                        <div className="text-center py-8 text-gray-500">
                                            <i className="fas fa-inbox text-4xl mb-2"></i>
                                            <p className="text-sm">No laminate codes saved yet</p>
                                            <p className="text-xs mt-1">Add laminate codes in Master Settings or Cabinet Configuration</p>
                                        </div>
                                    ) : (
                                        uniqueLaminateCodes.map((code) => {
                                            const isEnabled = woodGrainsPreferences[code] === true;
                                            return (
                                                <div
                                                    key={code}
                                                    className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <i className={`fas fa-layer-group ${isEnabled ? 'text-green-500' : 'text-gray-400'}`}></i>
                                                        <div>
                                                            <div className={`font-medium text-sm ${isEnabled ? "text-amber-700 font-bold" : ""}`}>{code}</div>
                                                            <div className="text-xs text-gray-500">
                                                                {isEnabled ? '✓ Wood grain enabled' : '✗ Wood grain disabled'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={async () => {
                                                            const newValue = !isEnabled;
                                                            try {
                                                                await apiRequest('POST', '/api/wood-grains-preference', { laminateCode: code, woodGrainsEnabled: newValue });
                                                                setWoodGrainsPreferences((prev) => ({ ...prev, [code]: newValue }));
                                                                toast({
                                                                    title: newValue ? "Wood Grain Enabled" : "Wood Grain Disabled",
                                                                    description: `${code} ${newValue ? 'now uses' : 'no longer uses'} wood grain memory`,
                                                                });
                                                            } catch (error) {
                                                                console.error('Error toggling wood grains:', error);
                                                                toastError(error);
                                                            }
                                                        }}
                                                        className={`h-8 px-3 text-xs ${isEnabled ? 'bg-green-100 border-green-400 text-green-700 hover:bg-green-200' : 'hover:bg-gray-100'}`}
                                                        data-testid={`toggle-wood-grain-${code}`}
                                                    >
                                                        {isEnabled ? 'ON' : 'OFF'}
                                                    </Button>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            )}
        </Card>
    );
}
