/**
 * ProductionMaterialBar Component
 * --------------------------------
 * Stats display and material selection for Production page.
 */

import React from "react";
import { PlywoodCombobox } from "@/components/master-settings/PlywoodCombobox";
import { LaminateCombobox } from "@/components/master-settings/LaminateCombobox";
import type { ProductionMaterials } from "../../../services/storageService";

interface ProductionMaterialBarProps {
  stats: {
    totalPanels: number;
    shutterCount: number;
    loftCount: number;
  };
  materials: ProductionMaterials;
  onPlywoodChange: (value: string) => void;
  onFrontLaminateChange: (value: string) => void;
  onInnerLaminateChange: (value: string) => void;
}

const ProductionMaterialBar: React.FC<ProductionMaterialBarProps> = ({
  stats,
  materials,
  onPlywoodChange,
  onFrontLaminateChange,
  onInnerLaminateChange,
}) => {
  return (
    <div className="flex flex-wrap items-center gap-4 text-sm">
      {/* Panel counts */}
      <div className="bg-white rounded-lg px-4 py-2 border border-gray-300">
        <span className="text-gray-600">Total:</span>{" "}
        <span className="font-bold text-black">{stats.totalPanels}</span> panels
      </div>
      <div className="bg-white rounded-lg px-4 py-2 border border-gray-300">
        <span className="text-gray-600">Shutters:</span>{" "}
        <span className="font-bold text-black">{stats.shutterCount}</span>
      </div>
      {stats.loftCount > 0 && (
        <div className="bg-white rounded-lg px-4 py-2 border border-gray-300">
          <span className="text-gray-600">Loft:</span>{" "}
          <span className="font-bold text-black">{stats.loftCount}</span>
        </div>
      )}

      {/* Divider */}
      <div className="h-8 w-px bg-gray-300" />

      {/* Material Selection */}
      <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-1.5 border border-gray-300">
        <span className="text-gray-500 text-xs">Ply:</span>
        <PlywoodCombobox
          value={materials.plywood}
          onChange={onPlywoodChange}
          placeholder="Brand"
          className="h-7 w-32 text-xs"
        />
        <span className="text-gray-300">|</span>
        <span className="text-gray-500 text-xs">Front:</span>
        <LaminateCombobox
          value={materials.frontLaminate}
          onChange={onFrontLaminateChange}
          placeholder="Laminate"
          className="h-7 w-28 text-xs"
        />
        <span className="text-gray-300">|</span>
        <span className="text-gray-500 text-xs">Inner:</span>
        <LaminateCombobox
          value={materials.innerLaminate}
          onChange={onInnerLaminateChange}
          placeholder="Laminate"
          className="h-7 w-28 text-xs"
        />
      </div>
    </div>
  );
};

export default React.memo(ProductionMaterialBar);
