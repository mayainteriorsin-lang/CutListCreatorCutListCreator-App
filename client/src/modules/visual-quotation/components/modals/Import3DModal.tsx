import React, { useState, useRef } from "react";
import { Upload, Link, Package, X, Loader2, Check, Trash2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDesignCanvasStore } from "../../store/v2/useDesignCanvasStore";
import type { Model3DCategory, Model3DPreset, Imported3DModel } from "../../types";
import { cn } from "@/lib/utils";

interface Import3DModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CATEGORY_LABELS: Record<Model3DCategory, string> = {
  kitchen: "Kitchen",
  appliance: "Appliances",
  furniture: "Furniture",
  decor: "Decor",
  custom: "Custom",
};

const Import3DModal: React.FC<Import3DModalProps> = ({ open, onOpenChange }) => {
  const { models3D, add3DModel } = useDesignCanvasStore();
  const [activeTab, setActiveTab] = useState<"upload" | "url" | "presets">("upload");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // URL import state
  const [modelUrl, setModelUrl] = useState("");
  const [modelName, setModelName] = useState("");

  // File upload state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Preset filter
  const [presetFilter, setPresetFilter] = useState<Model3DCategory | "all">("all");
  const [presetSearch, setPresetSearch] = useState("");

  const resetState = () => {
    setError(null);
    setSuccess(null);
    setModelUrl("");
    setModelName("");
    setSelectedFile(null);
  };

  const handleClose = () => {
    resetState();
    onOpenChange(false);
  };

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = [".glb", ".gltf"];
    const ext = file.name.toLowerCase().substring(file.name.lastIndexOf("."));
    if (!validTypes.includes(ext)) {
      setError("Please select a .glb or .gltf file");
      return;
    }

    // Validate file size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      setError("File size must be less than 50MB");
      return;
    }

    setSelectedFile(file);
    setModelName(file.name.replace(/\.(glb|gltf)$/i, ""));
    setError(null);
  };

  // Handle file upload
  const handleFileUpload = async () => {
    if (!selectedFile) {
      setError("Please select a file first");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Read file as data URL for local storage
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;

        const newModel: Omit<Imported3DModel, "id"> = {
          name: modelName || selectedFile.name.replace(/\.(glb|gltf)$/i, ""),
          sourceType: "file",
          sourceUrl: dataUrl,
          position: { x: 0, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          scale: { x: 1, y: 1, z: 1 },
          category: "custom",
          visible: true,
          locked: false,
          fileName: selectedFile.name,
        };

        add3DModel(newModel);
        setSuccess(`Model "${modelName || selectedFile.name}" imported successfully!`);

        // Close modal after short delay
        setTimeout(() => {
          handleClose();
        }, 1500);
      };

      reader.onerror = () => {
        setError("Failed to read file");
        setIsLoading(false);
      };

      reader.readAsDataURL(selectedFile);
    } catch (err) {
      setError("Failed to import model");
      setIsLoading(false);
    }
  };

  // Handle URL import
  const handleUrlImport = async () => {
    if (!modelUrl.trim()) {
      setError("Please enter a URL");
      return;
    }

    // Validate URL
    try {
      new URL(modelUrl);
    } catch {
      setError("Please enter a valid URL");
      return;
    }

    // Check for valid extension
    const url = modelUrl.toLowerCase();
    if (!url.includes(".glb") && !url.includes(".gltf")) {
      setError("URL must point to a .glb or .gltf file");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Test if URL is accessible
      const response = await fetch(modelUrl, { method: "HEAD" });
      if (!response.ok) {
        throw new Error("URL not accessible");
      }

      const name = modelName || modelUrl.split("/").pop()?.replace(/\.(glb|gltf)$/i, "") || "Imported Model";

      const newModel: Omit<Imported3DModel, "id"> = {
        name,
        sourceType: "url",
        sourceUrl: modelUrl,
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 },
        category: "custom",
        visible: true,
        locked: false,
      };

      add3DModel(newModel);
      setSuccess(`Model "${name}" imported successfully!`);
      setIsLoading(false);

      // Close modal after short delay
      setTimeout(() => {
        handleClose();
      }, 1500);
    } catch (err) {
      setError("Failed to access URL. Make sure the URL is publicly accessible and allows CORS.");
      setIsLoading(false);
    }
  };

  // Handle preset selection
  const handlePresetSelect = (preset: Model3DPreset) => {
    setIsLoading(true);

    const newModel: Omit<Imported3DModel, "id"> = {
      name: preset.name,
      sourceType: "preset",
      sourceUrl: preset.modelUrl,
      presetId: preset.id,
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: preset.defaultScale, y: preset.defaultScale, z: preset.defaultScale },
      category: preset.category,
      visible: true,
      locked: false,
    };

    add3DModel(newModel);
    setSuccess(`"${preset.name}" added to scene!`);
    setIsLoading(false);

    // Close modal after short delay
    setTimeout(() => {
      handleClose();
    }, 1000);
  };

  // Filter presets
  const filteredPresets = models3D.presets.filter((preset) => {
    const matchesCategory = presetFilter === "all" || preset.category === presetFilter;
    const matchesSearch = preset.name.toLowerCase().includes(presetSearch.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Import 3D Model
          </DialogTitle>
        </DialogHeader>

        {/* Success/Error Messages */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
            <X className="h-4 w-4 flex-shrink-0" />
            {error}
          </div>
        )}
        {success && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm flex items-center gap-2">
            <Check className="h-4 w-4 flex-shrink-0" />
            {success}
          </div>
        )}

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="upload" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Upload File
            </TabsTrigger>
            <TabsTrigger value="url" className="flex items-center gap-2">
              <Link className="h-4 w-4" />
              From URL
            </TabsTrigger>
            <TabsTrigger value="presets" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Presets
            </TabsTrigger>
          </TabsList>

          {/* Upload Tab */}
          <TabsContent value="upload" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Select 3D Model File</Label>
              <div
                className={cn(
                  "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all",
                  selectedFile
                    ? "border-green-500 bg-green-50"
                    : "border-slate-300 hover:border-blue-500 hover:bg-slate-50"
                )}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".glb,.gltf"
                  className="hidden"
                  onChange={handleFileSelect}
                />
                {selectedFile ? (
                  <div className="space-y-2">
                    <Check className="h-10 w-10 mx-auto text-green-500" />
                    <p className="font-medium text-green-700">{selectedFile.name}</p>
                    <p className="text-sm text-slate-500">
                      {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedFile(null);
                        setModelName("");
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Remove
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="h-10 w-10 mx-auto text-slate-400" />
                    <p className="font-medium text-slate-700">Click to upload or drag & drop</p>
                    <p className="text-sm text-slate-500">GLB or GLTF files (max 50MB)</p>
                  </div>
                )}
              </div>
            </div>

            {selectedFile && (
              <div className="space-y-2">
                <Label htmlFor="modelName">Model Name</Label>
                <Input
                  id="modelName"
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value)}
                  placeholder="Enter a name for the model"
                />
              </div>
            )}

            <Button
              onClick={handleFileUpload}
              disabled={!selectedFile || isLoading}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Import Model
                </>
              )}
            </Button>
          </TabsContent>

          {/* URL Tab */}
          <TabsContent value="url" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="modelUrl">Model URL</Label>
              <Input
                id="modelUrl"
                value={modelUrl}
                onChange={(e) => setModelUrl(e.target.value)}
                placeholder="https://example.com/model.glb"
              />
              <p className="text-xs text-slate-500">
                Paste a direct link to a .glb or .gltf file. Works with Sketchfab download links, GitHub raw URLs, etc.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="urlModelName">Model Name (optional)</Label>
              <Input
                id="urlModelName"
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
                placeholder="My Model"
              />
            </div>

            <Button
              onClick={handleUrlImport}
              disabled={!modelUrl.trim() || isLoading}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Link className="h-4 w-4 mr-2" />
                  Import from URL
                </>
              )}
            </Button>
          </TabsContent>

          {/* Presets Tab */}
          <TabsContent value="presets" className="space-y-4 pt-4">
            {/* Filter and Search */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  value={presetSearch}
                  onChange={(e) => setPresetSearch(e.target.value)}
                  placeholder="Search presets..."
                  className="pl-9"
                />
              </div>
              <select
                title="Filter by category"
                aria-label="Filter presets by category"
                value={presetFilter}
                onChange={(e) => setPresetFilter(e.target.value as Model3DCategory | "all")}
                className="px-3 py-2 border border-slate-200 rounded-md text-sm"
              >
                <option value="all">All Categories</option>
                {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {/* Preset Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[400px] overflow-y-auto">
              {filteredPresets.length === 0 ? (
                <div className="col-span-full text-center py-8 text-slate-500">
                  No presets found. Try adjusting your search or filter.
                </div>
              ) : (
                filteredPresets.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => handlePresetSelect(preset)}
                    disabled={isLoading}
                    className="p-3 border border-slate-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-left group"
                  >
                    <div className="aspect-square bg-slate-100 rounded-md mb-2 flex items-center justify-center overflow-hidden">
                      {preset.thumbnailUrl ? (
                        <img
                          src={preset.thumbnailUrl}
                          alt={preset.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                      ) : (
                        <Package className="h-8 w-8 text-slate-400" />
                      )}
                    </div>
                    <h4 className="font-medium text-sm text-slate-800 truncate group-hover:text-blue-600">
                      {preset.name}
                    </h4>
                    <p className="text-xs text-slate-500 capitalize">{preset.category}</p>
                  </button>
                ))
              )}
            </div>

            <p className="text-xs text-slate-500 text-center">
              Click on a preset to add it to your 3D scene. You can then position and scale it as needed.
            </p>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default Import3DModal;
