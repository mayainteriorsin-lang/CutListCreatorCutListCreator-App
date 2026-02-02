import React from "react";
import { LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useDesignCanvasStore } from "../../store/v2/useDesignCanvasStore";
import { WallId } from "../../types";

const WALLS: { id: WallId; label: string }[] = [
  { id: "LEFT", label: "Left" },
  { id: "RIGHT", label: "Right" },
  { id: "CENTER", label: "Center" },
  { id: "FULL", label: "Full" },
];

const WallSelector: React.FC = () => {
  const { room, setSelectedWall } = useDesignCanvasStore();

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LayoutGrid className="h-4 w-4 text-slate-500" />
            <span className="text-sm font-semibold text-slate-700">Wall Selection</span>
          </div>
          <Badge variant="secondary" className="text-[10px]">
            {room.selectedWallId}
          </Badge>
        </div>

        {/* Wall Buttons */}
        <div className="grid grid-cols-4 gap-2">
          {WALLS.map((w) => {
            const isActive = w.id === room.selectedWallId;
            return (
              <Button
                key={w.id}
                variant={isActive ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedWall(w.id)}
                className="h-9"
              >
                {w.label}
              </Button>
            );
          })}
        </div>

        <p className="text-[11px] text-slate-400">
          Select wall first. Units will be placed on the selected wall.
        </p>
      </CardContent>
    </Card>
  );
};

export default WallSelector;
