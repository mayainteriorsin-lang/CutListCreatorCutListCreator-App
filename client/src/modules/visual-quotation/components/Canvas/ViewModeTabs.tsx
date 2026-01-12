import React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Box, Rotate3D, ExternalLink } from "lucide-react";
import { useVisualQuotationStore, CanvasViewMode } from "../../store/visualQuotationStore";
import { cn } from "@/lib/utils";

const ViewModeTabs: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { canvasViewMode, setCanvasViewMode } = useVisualQuotationStore();

  const handle2DClick = () => {
    setCanvasViewMode("front");
  };

  const handle3DClick = () => {
    // Navigate to dedicated 3D Room page
    const params = searchParams.toString();
    navigate(`/visual-quotation/3d-room${params ? `?${params}` : ""}`);
  };

  return (
    <div className="flex items-center gap-0.5 p-0.5 bg-slate-700/50 rounded-lg backdrop-blur-sm">
      {/* 2D Button */}
      <button
        onClick={handle2DClick}
        title="2D Front View"
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium rounded-md transition-all duration-200",
          canvasViewMode === "front"
            ? "bg-blue-600 text-white shadow-md shadow-blue-500/30"
            : "text-slate-400 hover:text-white hover:bg-slate-600/50"
        )}
      >
        <Box className="h-3 w-3" />
        2D Canvas
      </button>

      {/* 3D Room Button - navigates to separate page */}
      <button
        onClick={handle3DClick}
        title="Open 3D Room View"
        className="group flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium rounded-md transition-all duration-200 text-slate-400 hover:text-white hover:bg-indigo-600/80"
      >
        <Rotate3D className="h-3 w-3" />
        3D Room
        <ExternalLink className="h-2.5 w-2.5 opacity-50 group-hover:opacity-100 transition-opacity" />
      </button>
    </div>
  );
};

export default ViewModeTabs;
