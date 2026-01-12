/*
  PATCH 36: This file isolates the *entire cabinet form* from home.tsx.
  All props mirror the exact state + handlers passed from home.tsx.
  Props are guaranteed to be arrays at the boundary (home.tsx).
*/

import {
  Card, CardHeader, CardContent, CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectTrigger, SelectContent, SelectItem, SelectValue
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import ShutterConfigPanel from "@/components/shutters/ShutterConfigPanel";
import PanelMaterialSelector from "@/components/panel/PanelMaterialSelector";
import CabinetDimensionPanel from "@/components/cabinet-form/CabinetDimensionPanel";
// PATCH 26: Import isolated selector components
import { PlywoodTypeSelector } from "@/components/selectors";
// PATCH 36: Import typed props
import type { CabinetFormProps } from "@/types/cabinetForm";

// Re-export types for backwards compatibility
export type { CabinetFormProps } from "@/types/cabinetForm";

export default function CabinetForm({
  form,
  cabinetConfigMode,
  setCabinetConfigMode,
  updateShutters,
  panelsLinked,
  setPanelsLinked,
  laminateCodes,
  plywoodTypes,
  handleAddCabinet,
  shutterHeightInputRef,
  cabinetSectionRef,
}: CabinetFormProps) {

  // PATCH 36: Normalize laminate codes once at the top
  // Props are guaranteed to be arrays at boundary (home.tsx)
  const normalizedLaminateCodes = laminateCodes.map((c) =>
    typeof c === "string" ? c : c.code
  );

  return (
    <Card
      ref={cabinetSectionRef}
      className="bg-white border-gray-300 shadow-sm p-4 mt-6"
      data-cabinet-form
    >
      <CardHeader>
        <CardTitle className="text-gray-900 flex items-center gap-2">
          <i className="fas fa-cubes text-indigo-500"></i>
          Cabinet Configuration
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">

        {/* BASIC / ADVANCED MODE SWITCH */}
        <div className="flex items-center justify-between border-b pb-3">
          <Label className="text-sm font-semibold">
            Configuration Mode
          </Label>
          <Select
            value={cabinetConfigMode}
            onValueChange={setCabinetConfigMode}
          >
            <SelectTrigger className="w-40 h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="advanced">Advanced</SelectItem>
              <SelectItem value="basic">Basic (Shutter Only)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* DIMENSIONS - PATCH 21: Add form validation error display */}
        <CabinetDimensionPanel
          height={form.watch("height")}
          width={form.watch("width")}
          depth={form.watch("depth")}
          widthReduction={form.watch("widthReduction")}
          onChange={(field, value) => form.setValue(field, value)}
          errors={{
            height: form.formState.errors.height?.message as string | undefined,
            width: form.formState.errors.width?.message as string | undefined,
            depth: form.formState.errors.depth?.message as string | undefined,
            widthReduction: form.formState.errors.widthReduction?.message as string | undefined,
          }}
        />

        {/* PLYWOOD - PATCH 26 + 36: Use isolated selector with guaranteed array */}
        <div className="border-b pb-4">
          <PlywoodTypeSelector
            value={form.watch("plywoodType") || ""}
            options={plywoodTypes}
            onChange={(v) => form.setValue("plywoodType", v)}
          />
        </div>

        {/* LAMINATES */}
        <div className="space-y-4 border-b pb-4">
          <Label className="font-semibold flex justify-between">
            Laminate Codes
            <span className="text-xs text-gray-500">(Front + Inner)</span>
          </Label>

          {["topPanel", "bottomPanel", "leftPanel", "rightPanel", "backPanel"]
            .map((panel) => (
              <PanelMaterialSelector
                key={panel}
                label={`${panel.replace("Panel", " Panel")}`}
                laminateCode={form.watch(`${panel}LaminateCode`) || ""}
                innerLaminateCode={form.watch(`${panel}InnerLaminateCode`) || ""}
                grainDirection={form.watch(`${panel}GrainDirection`) || false}
                gaddi={form.watch(`${panel}Gaddi`) || false}

                laminateCodes={normalizedLaminateCodes}

                onChange={(field, value) =>
                  form.setValue(
                    `${panel}${
                      field === "laminateCode"
                        ? "LaminateCode"
                        : field === "innerLaminateCode"
                        ? "InnerLaminateCode"
                        : field === "grainDirection"
                        ? "GrainDirection"
                        : "Gaddi"
                    }`,
                    value
                  )
                }

                showGrain
                showGaddi
              />
            ))}

          {/* LINK PANELS SWITCH */}
          <div className="flex items-center gap-2 pt-1">
            <Switch checked={panelsLinked} onCheckedChange={setPanelsLinked} />
            <Label>Link All Panels To Top Laminate</Label>
          </div>
        </div>

        {/* SHUTTER CONFIG */}
        <ShutterConfigPanel
          shuttersEnabled={form.watch("shuttersEnabled")}
          onChange={(field, value) => form.setValue(field, value)}
          onToggle={updateShutters}
          shutterHeightInputRef={shutterHeightInputRef}
          showType={false}
          registerShutterCount={form.register("shutterCount")}
          registerWidthReduction={form.register("shutterWidthReduction")}
          registerHeightReduction={form.register("shutterHeightReduction")}
        />

        {/* ADD CABINET BUTTON */}
        <Button
          className="bg-green-600 hover:bg-green-700 text-white font-semibold w-full h-10"
          onClick={handleAddCabinet}
        >
          Add Cabinet
        </Button>

      </CardContent>
    </Card>
  );
}
