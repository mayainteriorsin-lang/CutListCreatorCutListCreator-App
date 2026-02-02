/**
 * Module Config Panel UI
 * Right-side floating panel for configuring a furniture module in Design Studio.
 * Supports section-by-section wardrobe configuration.
 *
 * Moved from: components/ui/ModuleConfigPanel.tsx
 */

import { useMemo } from "react";
import type { ModuleConfig, WardrobeSection, WardrobeSectionType } from "../engine/shapeGenerator";
import { DEFAULT_WARDROBE_SECTIONS } from "../engine/shapeGenerator";
import { UNIT_TYPE_LABELS } from "@/modules/visual-quotation/constants";
import { validateModuleConfig } from "../engine/validation";
import BackPanelPreview from "./BackPanelPreview";
import CuttingListPreview from "./CuttingListPreview";
import SkirtingInput from "./SkirtingInput";
import {
  sectionStyle,
  labelStyle,
  inputStyle,
  numberInputStyle,
  rowStyle,
  CARCASS_OPTIONS,
  SHUTTER_OPTIONS,
  SECTION_TYPE_LABELS,
  TYPE_COLORS,
} from "./configPanelStyles";

export interface ModulePricingResult {
  moduleName: string;
  carcassSqft: number;
  shutterSqft: number;
  loftSqft: number;
  totalSqft: number;
  carcassRate: number;
  shutterRate: number;
  carcassPrice: number;
  shutterPrice: number;
  loftPrice: number;
  subtotal: number;
  gst: number;
  total: number;
}

export interface ModuleConfigPanelUIProps {
  config: ModuleConfig;
  onChange: (config: ModuleConfig) => void;
  onUpdateDrawing: () => void;
  onSaveToLibrary: () => void;
  onGenerateCutlist: () => void;
  onClose: () => void;
  pricing?: ModulePricingResult;
}

export default function ModuleConfigPanelUI({
  config,
  onChange,
  onUpdateDrawing,
  onSaveToLibrary,
  onGenerateCutlist,
  onClose,
  pricing,
}: ModuleConfigPanelUIProps) {
  const typeColor = TYPE_COLORS[config.unitType] || "#6b7280";
  const typeLabel = UNIT_TYPE_LABELS[config.unitType] || config.unitType;

  // Validate config and memoize result
  const validation = useMemo(() => validateModuleConfig(config), [config]);
  const hasErrors = validation.errors.length > 0;
  const hasWarnings = validation.warnings.length > 0;

  const update = (partial: Partial<ModuleConfig>) => {
    onChange({ ...config, ...partial });
  };

  // Section helpers (wardrobe)
  const updateSection = (idx: number, patch: Partial<WardrobeSection>) => {
    const sections = [...(config.sections || [])];
    sections[idx] = { ...sections[idx], ...patch };
    onChange({ ...config, sections, sectionCount: sections.length });
  };

  const removeSection = (idx: number) => {
    const sections = (config.sections || []).filter((_, i) => i !== idx);
    onChange({ ...config, sections, sectionCount: Math.max(1, sections.length) });
  };

  const addSection = () => {
    const sections = [...(config.sections || []), { type: "shelves" as WardrobeSectionType, widthMm: 0, shelfCount: 3 }];
    onChange({ ...config, sections, sectionCount: sections.length });
  };

  const applyPresetSections = () => {
    onChange({ ...config, sections: [...DEFAULT_WARDROBE_SECTIONS], sectionCount: DEFAULT_WARDROBE_SECTIONS.length });
  };

  return (
    <div
      style={{
        position: "absolute",
        right: 0,
        top: 0,
        bottom: 0,
        width: 280,
        background: "#fff",
        borderLeft: "1px solid #e2e8f0",
        boxShadow: "-4px 0 12px rgba(0,0,0,0.08)",
        display: "flex",
        flexDirection: "column",
        zIndex: 100,
        overflowY: "scroll",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "12px",
          borderBottom: "1px solid #e2e8f0",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "#f8fafc",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              display: "inline-block",
              padding: "3px 10px",
              borderRadius: 12,
              fontSize: 11,
              fontWeight: 600,
              color: "#fff",
              background: typeColor,
            }}
          >
            {typeLabel}
          </span>
          <span style={{ fontSize: 12, fontWeight: 600, color: "#334155" }}>Config</span>
        </div>
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: 16,
            color: "#94a3b8",
            padding: "2px 6px",
          }}
        >
          x
        </button>
      </div>

      {/* Name */}
      <div style={sectionStyle}>
        <label style={labelStyle}>Module Name</label>
        <input
          type="text"
          value={config.name}
          onChange={(e) => update({ name: e.target.value })}
          style={inputStyle}
          placeholder="e.g., Master Bedroom Wardrobe"
        />
      </div>

      {/* Loft Option - wardrobe_carcass only, above dimensions */}
      {config.unitType === "wardrobe_carcass" && (
        <div style={sectionStyle}>
          <div style={{ ...rowStyle, marginBottom: 0 }}>
            <label style={{ ...labelStyle, marginBottom: 0, display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={config.loftEnabled}
                onChange={(e) => update({ loftEnabled: e.target.checked })}
                style={{ accentColor: "#0d9488", cursor: "pointer" }}
              />
              Loft
            </label>
            {config.loftEnabled && (
              <input
                type="number"
                min={200}
                max={600}
                value={config.loftHeightMm}
                onChange={(e) => update({ loftHeightMm: Math.max(200, Math.min(600, parseInt(e.target.value) || 400)) })}
                style={numberInputStyle}
                title="Loft height (mm)"
              />
            )}
          </div>
        </div>
      )}

      {/* Dimensions */}
      <div style={sectionStyle}>
        <div style={{ fontSize: 11, fontWeight: 600, color: "#334155", marginBottom: 8 }}>
          Dimensions (mm)
        </div>
        <div style={rowStyle}>
          <label style={{ ...labelStyle, marginBottom: 0 }}>Width</label>
          <input
            type="number"
            min={200}
            max={6000}
            value={config.widthMm}
            onChange={(e) => update({ widthMm: Math.max(200, parseInt(e.target.value) || 200) })}
            style={numberInputStyle}
          />
        </div>
        <div style={rowStyle}>
          <label style={{ ...labelStyle, marginBottom: 0 }}>Height</label>
          <input
            type="number"
            min={200}
            max={3500}
            value={config.heightMm}
            onChange={(e) => update({ heightMm: Math.max(200, parseInt(e.target.value) || 200) })}
            style={numberInputStyle}
          />
        </div>
        <div style={rowStyle}>
          <label style={{ ...labelStyle, marginBottom: 0 }}>Depth</label>
          <input
            type="number"
            min={100}
            max={1000}
            value={config.depthMm}
            onChange={(e) => update({ depthMm: Math.max(100, parseInt(e.target.value) || 100) })}
            style={numberInputStyle}
          />
        </div>
      </div>

      {/* Structure */}
      <div style={sectionStyle}>
        <div style={{ fontSize: 11, fontWeight: 600, color: "#334155", marginBottom: 8 }}>
          Structure
        </div>
        {config.unitType !== "wardrobe_carcass" && (
          <div style={rowStyle}>
            <label style={{ ...labelStyle, marginBottom: 0 }}>Shutters</label>
            <input
              type="number"
              min={0}
              max={10}
              value={config.shutterCount}
              onChange={(e) => update({ shutterCount: Math.max(0, Math.min(10, parseInt(e.target.value) || 0)) })}
              style={numberInputStyle}
            />
          </div>
        )}
        {config.unitType === "wardrobe_carcass" && (
          <>
            <div style={rowStyle}>
              <label style={{ ...labelStyle, marginBottom: 0 }}>Center Posts</label>
              <input
                type="number"
                min={0}
                max={10}
                value={config.centerPostCount ?? 0}
                onChange={(e) => update({ centerPostCount: Math.max(0, Math.min(10, parseInt(e.target.value) || 0)) })}
                style={numberInputStyle}
              />
            </div>
            <div style={rowStyle}>
              <label style={{ ...labelStyle, marginBottom: 0 }}>Carcass (mm)</label>
              <input
                type="number"
                min={12}
                max={25}
                value={config.carcassThicknessMm ?? 18}
                onChange={(e) => update({ carcassThicknessMm: Math.max(12, Math.min(25, parseInt(e.target.value) || 18)) })}
                style={numberInputStyle}
              />
            </div>
            <div style={rowStyle}>
              <label style={{ ...labelStyle, marginBottom: 0 }}>Back Panel (mm)</label>
              <input
                type="number"
                min={4}
                max={18}
                value={config.backPanelThicknessMm ?? 10}
                onChange={(e) => update({ backPanelThicknessMm: Math.max(4, Math.min(18, parseInt(e.target.value) || 10)) })}
                style={numberInputStyle}
              />
            </div>
            <div style={rowStyle}>
              <label style={{ ...labelStyle, marginBottom: 0 }}>Post Deduct</label>
              <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                <span style={{ fontSize: 9, color: "#64748b", fontWeight: 600 }}>B</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={config.backPanelDeduction ?? 20}
                  onChange={(e) => update({ backPanelDeduction: Math.max(0, parseInt(e.target.value) || 0) })}
                  style={{ ...numberInputStyle, width: 50 }}
                  title="Back deduction"
                />
                <span style={{ fontSize: 9, color: "#64748b", fontWeight: 600 }}>F</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={config.backPanelFrontDeduction ?? 0}
                  onChange={(e) => update({ backPanelFrontDeduction: Math.max(0, parseInt(e.target.value) || 0) })}
                  style={{ ...numberInputStyle, width: 50 }}
                  title="Front deduction"
                />
              </div>
            </div>
            <div style={rowStyle}>
              <label style={{ ...labelStyle, marginBottom: 0 }}>Shelf Deduct</label>
              <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                <span style={{ fontSize: 9, color: "#64748b", fontWeight: 600 }}>B</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={config.shelfBackDeduction ?? 20}
                  onChange={(e) => update({ shelfBackDeduction: Math.max(0, parseInt(e.target.value) || 0) })}
                  style={{ ...numberInputStyle, width: 50 }}
                  title="Back deduction"
                />
                <span style={{ fontSize: 9, color: "#64748b", fontWeight: 600 }}>F</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={config.shelfFrontDeduction ?? 10}
                  onChange={(e) => update({ shelfFrontDeduction: Math.max(0, parseInt(e.target.value) || 0) })}
                  style={{ ...numberInputStyle, width: 50 }}
                  title="Front deduction"
                />
              </div>
            </div>
            {/* Skirting Option - below shelf deduct */}
            <SkirtingInput
              enabled={config.skirtingEnabled ?? false}
              height={config.skirtingHeightMm ?? 115}
              onEnabledChange={(enabled) => update({ skirtingEnabled: enabled })}
              onHeightChange={(height) => update({ skirtingHeightMm: height })}
              rowStyle={rowStyle}
              labelStyle={labelStyle}
              numberInputStyle={numberInputStyle}
            />
            {/* Back Panel Size Preview */}
            <BackPanelPreview
              widthMm={config.widthMm}
              heightMm={config.heightMm}
              carcassThicknessMm={config.carcassThicknessMm ?? 18}
              backPanelThicknessMm={config.backPanelThicknessMm ?? 10}
              centerPostCount={config.centerPostCount ?? 0}
              backPanelDeduction={config.backPanelDeduction ?? 20}
              panelsEnabled={config.panelsEnabled ?? { top: true, bottom: true, left: true, right: true, back: true }}
            />
          </>
        )}

        {/* Cutting List Preview - shown for all unit types */}
        <CuttingListPreview config={config} />
        {config.unitType !== "wardrobe" && config.unitType !== "wardrobe_carcass" && (
          <div style={rowStyle}>
            <label style={{ ...labelStyle, marginBottom: 0 }}>Sections</label>
            <input
              type="number"
              min={1}
              max={6}
              value={config.sectionCount}
              onChange={(e) => update({ sectionCount: Math.max(1, Math.min(6, parseInt(e.target.value) || 1)) })}
              style={numberInputStyle}
            />
          </div>
        )}
        {/* Loft for non-wardrobe_carcass types */}
        {config.unitType !== "wardrobe_carcass" && (
          <div style={{ ...rowStyle, marginBottom: 0 }}>
            <label style={{ ...labelStyle, marginBottom: 0, display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={config.loftEnabled}
                onChange={(e) => update({ loftEnabled: e.target.checked })}
                style={{ accentColor: "#0d9488", cursor: "pointer" }}
              />
              Loft
            </label>
            {config.loftEnabled && (
              <input
                type="number"
                min={200}
                max={600}
                value={config.loftHeightMm}
                onChange={(e) => update({ loftHeightMm: Math.max(200, Math.min(600, parseInt(e.target.value) || 400)) })}
                style={numberInputStyle}
                title="Loft height (mm)"
              />
            )}
          </div>
        )}
      </div>

      {/* Interior Sections - Wardrobe Only */}
      {config.unitType === "wardrobe" && (
        <div style={sectionStyle}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#334155", marginBottom: 8 }}>
            Interior Sections
          </div>

          {(config.sections || []).map((section, idx) => (
            <div key={idx} style={{
              padding: "6px 8px", marginBottom: 4, background: "#f8fafc",
              borderRadius: 4, border: "1px solid #e2e8f0",
            }}>
              <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 4 }}>
                <span style={{ fontSize: 10, color: "#94a3b8", width: 16, textAlign: "center" }}>
                  {idx + 1}
                </span>
                <select
                  value={section.type}
                  onChange={(e) => updateSection(idx, { type: e.target.value as WardrobeSectionType })}
                  style={{ ...inputStyle, flex: 1, fontSize: 11 }}
                >
                  {Object.entries(SECTION_TYPE_LABELS).map(([val, lab]) => (
                    <option key={val} value={val}>{lab}</option>
                  ))}
                </select>
                <button onClick={() => removeSection(idx)} style={{
                  background: "none", border: "none", cursor: "pointer",
                  color: "#ef4444", fontSize: 14, padding: "0 4px",
                }}>x</button>
              </div>

              {/* Type-specific controls */}
              {(section.type === "shelves" || section.type === "short_hang") && (
                <div style={{ ...rowStyle, paddingLeft: 22, marginBottom: 0 }}>
                  <label style={{ ...labelStyle, marginBottom: 0, fontSize: 10 }}>Shelves</label>
                  <input type="number" min={1} max={8}
                    value={section.shelfCount ?? 3}
                    onChange={(e) => updateSection(idx, { shelfCount: Math.max(1, Math.min(8, parseInt(e.target.value) || 3)) })}
                    style={{ ...numberInputStyle, width: 45, fontSize: 11 }} />
                </div>
              )}
              {section.type === "drawers" && (
                <div style={{ ...rowStyle, paddingLeft: 22, marginBottom: 0 }}>
                  <label style={{ ...labelStyle, marginBottom: 0, fontSize: 10 }}>Drawers</label>
                  <input type="number" min={1} max={6}
                    value={section.drawerCount ?? 3}
                    onChange={(e) => updateSection(idx, { drawerCount: Math.max(1, Math.min(6, parseInt(e.target.value) || 3)) })}
                    style={{ ...numberInputStyle, width: 45, fontSize: 11 }} />
                </div>
              )}
            </div>
          ))}

          {/* Add section button */}
          <button onClick={addSection} style={{
            width: "100%", padding: "6px", background: "#f0f9ff",
            border: "1px dashed #93c5fd", borderRadius: 4, fontSize: 11,
            color: "#3b82f6", cursor: "pointer", fontWeight: 500, marginTop: 4,
          }}>
            + Add Section
          </button>

          {/* Apply preset */}
          <button onClick={applyPresetSections} style={{
            width: "100%", padding: "5px", background: "none",
            border: "none", fontSize: 10, color: "#6366f1",
            cursor: "pointer", marginTop: 4, textDecoration: "underline",
          }}>
            Apply 5-Section Preset
          </button>
        </div>
      )}

      {/* Materials */}
      <div style={sectionStyle}>
        <div style={{ fontSize: 11, fontWeight: 600, color: "#334155", marginBottom: 8 }}>
          Materials
        </div>
        <div style={{ marginBottom: 8 }}>
          <label style={labelStyle}>Carcass</label>
          <select
            value={config.carcassMaterial}
            onChange={(e) => update({ carcassMaterial: e.target.value })}
            style={inputStyle}
          >
            {CARCASS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Shutter</label>
          <select
            value={config.shutterMaterial}
            onChange={(e) => update({ shutterMaterial: e.target.value })}
            style={inputStyle}
          >
            {SHUTTER_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Rate Card Pricing */}
      {pricing && (
        <div style={sectionStyle}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#334155", marginBottom: 8 }}>
            Rate Card
          </div>
          <div style={{ fontSize: 11, color: "#64748b" }}>
            <div style={rowStyle}>
              <span>Carcass</span>
              <span>{pricing.carcassSqft} sqft @ {pricing.carcassRate}/sqft</span>
            </div>
            <div style={rowStyle}>
              <span>Shutter</span>
              <span>{pricing.shutterSqft} sqft @ {pricing.shutterRate}/sqft</span>
            </div>
            {pricing.loftSqft > 0 && (
              <div style={rowStyle}>
                <span>Loft</span>
                <span>{pricing.loftSqft} sqft</span>
              </div>
            )}
            <div style={{
              ...rowStyle, fontWeight: 600, color: "#334155",
              borderTop: "1px solid #e2e8f0", paddingTop: 6, marginTop: 2, marginBottom: 0,
            }}>
              <span>Total (incl 18% GST)</span>
              <span>Rs.{pricing.total.toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Validation Messages */}
      {(hasErrors || hasWarnings) && (
        <div style={{ ...sectionStyle, padding: "8px 12px" }}>
          {hasErrors && (
            <div style={{
              background: "#fef2f2",
              border: "1px solid #fca5a5",
              borderRadius: 6,
              padding: "8px 10px",
              marginBottom: hasWarnings ? 6 : 0,
            }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: "#991b1b", marginBottom: 4 }}>
                ⚠️ Errors
              </div>
              {validation.errors.map((err, i) => (
                <div key={i} style={{ fontSize: 10, color: "#dc2626", marginBottom: 2 }}>
                  • {err.message}
                </div>
              ))}
            </div>
          )}
          {hasWarnings && (
            <div style={{
              background: "#fffbeb",
              border: "1px solid #fcd34d",
              borderRadius: 6,
              padding: "8px 10px",
            }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: "#92400e", marginBottom: 4 }}>
                ⚡ Warnings
              </div>
              {validation.warnings.map((warn, i) => (
                <div key={i} style={{ fontSize: 10, color: "#b45309", marginBottom: 2 }}>
                  • {warn.message}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div
        style={{
          padding: "12px",
          borderTop: "1px solid #e2e8f0",
          display: "flex",
          flexDirection: "column",
          gap: 8,
          background: "#f8fafc",
          flexShrink: 0,
        }}
      >
        <button
          onClick={onUpdateDrawing}
          style={{
            width: "100%",
            padding: "8px",
            background: "linear-gradient(135deg, #0d9488, #14b8a6)",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Update Drawing
        </button>
        <button
          onClick={onGenerateCutlist}
          style={{
            width: "100%",
            padding: "8px",
            background: "linear-gradient(135deg, #3b82f6, #6366f1)",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Generate Cutlist
        </button>
        <button
          onClick={onSaveToLibrary}
          disabled={hasErrors}
          title={hasErrors ? "Fix validation errors before saving" : undefined}
          style={{
            width: "100%",
            padding: "8px",
            background: hasErrors
              ? "#d1d5db"
              : "linear-gradient(135deg, #16a34a, #22c55e)",
            color: hasErrors ? "#6b7280" : "#fff",
            border: "none",
            borderRadius: 6,
            fontSize: 12,
            fontWeight: 600,
            cursor: hasErrors ? "not-allowed" : "pointer",
            opacity: hasErrors ? 0.7 : 1,
          }}
        >
          Save to Library
        </button>
      </div>
    </div>
  );
}
