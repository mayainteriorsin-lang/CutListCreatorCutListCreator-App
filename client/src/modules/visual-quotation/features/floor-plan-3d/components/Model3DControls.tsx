import React from "react";
import { Move, RotateCw, Maximize2, Trash2, Copy, Eye, EyeOff, Lock, Unlock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useDesignCanvasStore } from "../../../store/v2/useDesignCanvasStore";
import type { Imported3DModel } from "../state/types";
import { cn } from "@/lib/utils";

interface Model3DControlsProps {
  className?: string;
}

const Model3DControls: React.FC<Model3DControlsProps> = ({ className }) => {
  const { models3D, update3DModel, delete3DModel, duplicate3DModel, select3DModel } = useDesignCanvasStore();
  const selectedModel = models3D.models.find(m => m.id === models3D.selectedModelId);

  if (!selectedModel) {
    return null;
  }

  const handlePositionChange = (axis: "x" | "y" | "z", value: number) => {
    update3DModel(selectedModel.id, {
      position: { ...selectedModel.position, [axis]: value },
    });
  };

  const handleRotationChange = (axis: "x" | "y" | "z", value: number) => {
    // Convert degrees to radians
    const radians = (value * Math.PI) / 180;
    update3DModel(selectedModel.id, {
      rotation: { ...selectedModel.rotation, [axis]: radians },
    });
  };

  const handleScaleChange = (value: number) => {
    // Uniform scaling
    update3DModel(selectedModel.id, {
      scale: { x: value, y: value, z: value },
    });
  };

  const handleToggleVisibility = () => {
    update3DModel(selectedModel.id, { visible: !selectedModel.visible });
  };

  const handleToggleLock = () => {
    update3DModel(selectedModel.id, { locked: !selectedModel.locked });
  };

  const handleDelete = () => {
    if (window.confirm(`Delete "${selectedModel.name}"?`)) {
      delete3DModel(selectedModel.id);
    }
  };

  const handleDuplicate = () => {
    duplicate3DModel(selectedModel.id);
  };

  // Convert radians to degrees for display
  const rotationDegrees = {
    x: Math.round((selectedModel.rotation.x * 180) / Math.PI),
    y: Math.round((selectedModel.rotation.y * 180) / Math.PI),
    z: Math.round((selectedModel.rotation.z * 180) / Math.PI),
  };

  return (
    <div className={cn(
      "bg-slate-800/95 backdrop-blur-sm rounded-lg shadow-xl border border-slate-700/60 p-3 text-white",
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-700/60">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="text-[11px] font-medium text-slate-300 truncate" title={selectedModel.name}>
            {selectedModel.name}
          </span>
          <span className="text-[9px] text-slate-500 capitalize">({selectedModel.category})</span>
        </div>
        <div className="flex items-center gap-0.5">
          <button
            onClick={handleToggleVisibility}
            title={selectedModel.visible ? "Hide" : "Show"}
            className={cn(
              "p-1 rounded transition-all",
              selectedModel.visible
                ? "text-slate-400 hover:text-white hover:bg-slate-700"
                : "text-yellow-400 hover:text-yellow-300 hover:bg-yellow-500/20"
            )}
          >
            {selectedModel.visible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
          </button>
          <button
            onClick={handleToggleLock}
            title={selectedModel.locked ? "Unlock" : "Lock"}
            className={cn(
              "p-1 rounded transition-all",
              selectedModel.locked
                ? "text-orange-400 hover:text-orange-300 hover:bg-orange-500/20"
                : "text-slate-400 hover:text-white hover:bg-slate-700"
            )}
          >
            {selectedModel.locked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
          </button>
          <button
            onClick={handleDuplicate}
            title="Duplicate"
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-700 transition-all"
          >
            <Copy className="h-3 w-3" />
          </button>
          <button
            onClick={handleDelete}
            title="Delete"
            className="p-1 rounded text-rose-400 hover:text-rose-300 hover:bg-rose-500/20 transition-all"
          >
            <Trash2 className="h-3 w-3" />
          </button>
          <button
            onClick={() => select3DModel(null)}
            title="Deselect"
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-700 transition-all ml-1"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Position */}
      <div className="mb-3">
        <div className="flex items-center gap-1.5 mb-1.5">
          <Move className="h-3 w-3 text-blue-400" />
          <span className="text-[10px] font-medium text-slate-300">Position</span>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {(["x", "y", "z"] as const).map((axis) => (
            <div key={axis}>
              <Label className="text-[9px] text-slate-500 uppercase mb-0.5">{axis}</Label>
              <Input
                type="number"
                step="0.1"
                value={selectedModel.position[axis].toFixed(2)}
                onChange={(e) => handlePositionChange(axis, parseFloat(e.target.value) || 0)}
                disabled={selectedModel.locked}
                className="h-6 text-[10px] bg-slate-700/50 border-slate-600/50 text-white px-1.5"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Rotation */}
      <div className="mb-3">
        <div className="flex items-center gap-1.5 mb-1.5">
          <RotateCw className="h-3 w-3 text-green-400" />
          <span className="text-[10px] font-medium text-slate-300">Rotation (degrees)</span>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {(["x", "y", "z"] as const).map((axis) => (
            <div key={axis}>
              <Label className="text-[9px] text-slate-500 uppercase mb-0.5">{axis}</Label>
              <Input
                type="number"
                step="15"
                value={rotationDegrees[axis]}
                onChange={(e) => handleRotationChange(axis, parseFloat(e.target.value) || 0)}
                disabled={selectedModel.locked}
                className="h-6 text-[10px] bg-slate-700/50 border-slate-600/50 text-white px-1.5"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Scale */}
      <div>
        <div className="flex items-center gap-1.5 mb-1.5">
          <Maximize2 className="h-3 w-3 text-purple-400" />
          <span className="text-[10px] font-medium text-slate-300">Scale</span>
          <span className="text-[9px] text-slate-500 ml-auto">
            {selectedModel.scale.x.toFixed(2)}x
          </span>
        </div>
        <Slider
          value={[selectedModel.scale.x]}
          min={0.1}
          max={5}
          step={0.1}
          onValueChange={([value]) => handleScaleChange(value)}
          disabled={selectedModel.locked}
          className="w-full"
        />
        <div className="flex justify-between text-[8px] text-slate-500 mt-0.5">
          <span>0.1x</span>
          <span>5x</span>
        </div>
      </div>
    </div>
  );
};

export default Model3DControls;
