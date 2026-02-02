/**
 * Furniture Thumbnail Component
 * SVG-based visual preview for library modules.
 */

import { cn } from "@/lib/utils";

interface FurnitureThumbnailProps {
  unitType: string;
  className?: string;
  showDimensions?: boolean;
  widthMm?: number;
  heightMm?: number;
  depthMm?: number;
}

// Color schemes for different furniture types
const TYPE_COLORS: Record<string, { primary: string; secondary: string; accent: string }> = {
  wardrobe: { primary: "#3b82f6", secondary: "#93c5fd", accent: "#1d4ed8" },
  wardrobe_carcass: { primary: "#2563eb", secondary: "#93c5fd", accent: "#1e40af" },
  kitchen: { primary: "#f59e0b", secondary: "#fcd34d", accent: "#d97706" },
  tv_unit: { primary: "#10b981", secondary: "#6ee7b7", accent: "#059669" },
  dresser: { primary: "#ec4899", secondary: "#f9a8d4", accent: "#db2777" },
  study_table: { primary: "#8b5cf6", secondary: "#c4b5fd", accent: "#7c3aed" },
  shoe_rack: { primary: "#06b6d4", secondary: "#67e8f9", accent: "#0891b2" },
  book_shelf: { primary: "#22c55e", secondary: "#86efac", accent: "#16a34a" },
  crockery_unit: { primary: "#eab308", secondary: "#fde047", accent: "#ca8a04" },
  pooja_unit: { primary: "#f97316", secondary: "#fdba74", accent: "#ea580c" },
  vanity: { primary: "#f43f5e", secondary: "#fda4af", accent: "#e11d48" },
  bar_unit: { primary: "#a855f7", secondary: "#d8b4fe", accent: "#9333ea" },
  display_unit: { primary: "#14b8a6", secondary: "#5eead4", accent: "#0d9488" },
  other: { primary: "#64748b", secondary: "#cbd5e1", accent: "#475569" },
};

export default function FurnitureThumbnail({
  unitType,
  className,
  showDimensions = false,
  widthMm = 0,
  heightMm = 0,
  depthMm = 0,
}: FurnitureThumbnailProps) {
  const colors = TYPE_COLORS[unitType] || TYPE_COLORS.other;

  // Format dimensions for display
  const formatDim = (mm: number) => {
    if (mm === 0) return "—";
    return mm >= 1000 ? `${(mm / 1000).toFixed(1)}m` : `${mm}mm`;
  };

  return (
    <div className={cn("relative", className)}>
      <svg
        viewBox="0 0 100 80"
        className="w-full h-full"
        style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.1))" }}
      >
        {/* Background */}
        <rect x="0" y="0" width="100" height="80" fill="#f8fafc" rx="4" />

        {/* Render furniture based on type */}
        {renderFurniture(unitType, colors)}

        {/* Grid pattern overlay */}
        <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
          <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#e2e8f0" strokeWidth="0.5" />
        </pattern>
        <rect x="0" y="0" width="100" height="80" fill="url(#grid)" opacity="0.3" />
      </svg>

      {/* Dimensions overlay */}
      {showDimensions && (widthMm > 0 || heightMm > 0) && (
        <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-slate-900/70 text-[8px] text-white font-medium">
          {formatDim(widthMm)} × {formatDim(heightMm)}
        </div>
      )}
    </div>
  );
}

function renderFurniture(
  unitType: string,
  colors: { primary: string; secondary: string; accent: string }
) {
  switch (unitType) {
    case "wardrobe":
    case "wardrobe_carcass":
      return (
        <g>
          {/* Main body */}
          <rect x="15" y="10" width="70" height="60" fill={colors.secondary} rx="2" />
          {/* Doors */}
          <rect x="17" y="12" width="22" height="56" fill={colors.primary} rx="1" />
          <rect x="41" y="12" width="22" height="56" fill={colors.primary} rx="1" />
          <rect x="65" y="12" width="18" height="56" fill={colors.primary} rx="1" />
          {/* Handles */}
          <rect x="36" y="35" width="2" height="10" fill={colors.accent} rx="0.5" />
          <rect x="60" y="35" width="2" height="10" fill={colors.accent} rx="0.5" />
          <rect x="78" y="35" width="2" height="10" fill={colors.accent} rx="0.5" />
          {/* Loft line */}
          <line x1="15" y1="22" x2="85" y2="22" stroke={colors.accent} strokeWidth="1" />
        </g>
      );

    case "kitchen":
      return (
        <g>
          {/* Wall cabinets */}
          <rect x="15" y="8" width="70" height="20" fill={colors.secondary} rx="1" />
          <rect x="17" y="10" width="16" height="16" fill={colors.primary} rx="1" />
          <rect x="35" y="10" width="16" height="16" fill={colors.primary} rx="1" />
          <rect x="53" y="10" width="16" height="16" fill={colors.primary} rx="1" />
          <rect x="71" y="10" width="12" height="16" fill={colors.primary} rx="1" />
          {/* Counter */}
          <rect x="15" y="32" width="70" height="4" fill={colors.accent} rx="0.5" />
          {/* Base cabinets */}
          <rect x="15" y="36" width="70" height="32" fill={colors.secondary} rx="1" />
          <rect x="17" y="38" width="16" height="28" fill={colors.primary} rx="1" />
          <rect x="35" y="38" width="16" height="28" fill={colors.primary} rx="1" />
          <rect x="53" y="38" width="16" height="28" fill={colors.primary} rx="1" />
          <rect x="71" y="38" width="12" height="28" fill={colors.primary} rx="1" />
          {/* Handles */}
          <circle cx="25" cy="18" r="1.5" fill={colors.accent} />
          <circle cx="43" cy="18" r="1.5" fill={colors.accent} />
          <circle cx="61" cy="18" r="1.5" fill={colors.accent} />
          <circle cx="25" cy="52" r="1.5" fill={colors.accent} />
          <circle cx="43" cy="52" r="1.5" fill={colors.accent} />
        </g>
      );

    case "tv_unit":
      return (
        <g>
          {/* Main body */}
          <rect x="10" y="35" width="80" height="30" fill={colors.secondary} rx="2" />
          {/* Compartments */}
          <rect x="12" y="37" width="20" height="26" fill={colors.primary} rx="1" />
          <rect x="34" y="37" width="32" height="26" fill="#1e293b" rx="1" />
          <rect x="68" y="37" width="20" height="26" fill={colors.primary} rx="1" />
          {/* TV screen area */}
          <rect x="36" y="39" width="28" height="22" fill="#0f172a" rx="1" />
          {/* Floating shelf */}
          <rect x="20" y="18" width="60" height="4" fill={colors.accent} rx="1" />
          {/* Handles */}
          <rect x="20" y="48" width="4" height="2" fill={colors.accent} rx="0.5" />
          <rect x="76" y="48" width="4" height="2" fill={colors.accent} rx="0.5" />
        </g>
      );

    case "dresser":
      return (
        <g>
          {/* Main body */}
          <rect x="25" y="30" width="50" height="40" fill={colors.secondary} rx="2" />
          {/* Drawers */}
          <rect x="27" y="32" width="46" height="10" fill={colors.primary} rx="1" />
          <rect x="27" y="44" width="46" height="10" fill={colors.primary} rx="1" />
          <rect x="27" y="56" width="46" height="12" fill={colors.primary} rx="1" />
          {/* Mirror */}
          <rect x="30" y="8" width="40" height="20" fill="#bfdbfe" rx="2" />
          <rect x="32" y="10" width="36" height="16" fill="#dbeafe" rx="1" />
          {/* Handles */}
          <rect x="47" y="35" width="6" height="2" fill={colors.accent} rx="0.5" />
          <rect x="47" y="47" width="6" height="2" fill={colors.accent} rx="0.5" />
          <rect x="47" y="60" width="6" height="2" fill={colors.accent} rx="0.5" />
        </g>
      );

    case "study_table":
      return (
        <g>
          {/* Desktop */}
          <rect x="10" y="35" width="80" height="5" fill={colors.accent} rx="1" />
          {/* Legs/support */}
          <rect x="12" y="40" width="4" height="28" fill={colors.primary} rx="0.5" />
          <rect x="84" y="40" width="4" height="28" fill={colors.primary} rx="0.5" />
          {/* Drawer unit */}
          <rect x="60" y="40" width="24" height="25" fill={colors.secondary} rx="1" />
          <rect x="62" y="42" width="20" height="7" fill={colors.primary} rx="1" />
          <rect x="62" y="51" width="20" height="7" fill={colors.primary} rx="1" />
          <rect x="62" y="60" width="20" height="3" fill={colors.primary} rx="1" />
          {/* Shelf above */}
          <rect x="15" y="15" width="70" height="4" fill={colors.secondary} rx="1" />
          <rect x="15" y="22" width="70" height="4" fill={colors.secondary} rx="1" />
          {/* Handles */}
          <rect x="70" y="44" width="4" height="1.5" fill={colors.accent} rx="0.5" />
          <rect x="70" y="53" width="4" height="1.5" fill={colors.accent} rx="0.5" />
        </g>
      );

    case "shoe_rack":
      return (
        <g>
          {/* Main body */}
          <rect x="25" y="10" width="50" height="60" fill={colors.secondary} rx="2" />
          {/* Tilted shelves */}
          <line x1="27" y1="20" x2="73" y2="24" stroke={colors.primary} strokeWidth="3" />
          <line x1="27" y1="32" x2="73" y2="36" stroke={colors.primary} strokeWidth="3" />
          <line x1="27" y1="44" x2="73" y2="48" stroke={colors.primary} strokeWidth="3" />
          <line x1="27" y1="56" x2="73" y2="60" stroke={colors.primary} strokeWidth="3" />
          {/* Door frame */}
          <rect x="27" y="12" width="46" height="56" fill="none" stroke={colors.accent} strokeWidth="1" rx="1" />
          {/* Handle */}
          <rect x="68" y="36" width="2" height="8" fill={colors.accent} rx="0.5" />
        </g>
      );

    case "book_shelf":
      return (
        <g>
          {/* Main frame */}
          <rect x="20" y="8" width="60" height="64" fill={colors.secondary} rx="2" />
          {/* Shelves */}
          <rect x="22" y="10" width="56" height="3" fill={colors.primary} />
          <rect x="22" y="22" width="56" height="3" fill={colors.primary} />
          <rect x="22" y="34" width="56" height="3" fill={colors.primary} />
          <rect x="22" y="46" width="56" height="3" fill={colors.primary} />
          <rect x="22" y="58" width="56" height="3" fill={colors.primary} />
          <rect x="22" y="69" width="56" height="3" fill={colors.primary} />
          {/* Books representation */}
          <rect x="24" y="13" width="4" height="9" fill={colors.accent} />
          <rect x="29" y="14" width="3" height="8" fill="#ef4444" />
          <rect x="33" y="13" width="5" height="9" fill="#3b82f6" />
          <rect x="24" y="25" width="6" height="9" fill="#f59e0b" />
          <rect x="31" y="26" width="4" height="8" fill={colors.accent} />
          {/* Vertical divider */}
          <rect x="49" y="10" width="2" height="62" fill={colors.accent} />
        </g>
      );

    case "crockery_unit":
      return (
        <g>
          {/* Main body */}
          <rect x="20" y="8" width="60" height="64" fill={colors.secondary} rx="2" />
          {/* Glass section top */}
          <rect x="22" y="10" width="56" height="28" fill="#dbeafe" rx="1" />
          <rect x="24" y="12" width="25" height="24" fill="none" stroke={colors.primary} strokeWidth="1" />
          <rect x="51" y="12" width="25" height="24" fill="none" stroke={colors.primary} strokeWidth="1" />
          {/* Shelves in glass */}
          <line x1="24" y1="24" x2="49" y2="24" stroke={colors.primary} strokeWidth="1" />
          <line x1="51" y1="24" x2="76" y2="24" stroke={colors.primary} strokeWidth="1" />
          {/* Drawers */}
          <rect x="22" y="40" width="56" height="10" fill={colors.primary} rx="1" />
          <rect x="22" y="52" width="56" height="18" fill={colors.primary} rx="1" />
          {/* Handles */}
          <rect x="47" y="43" width="6" height="2" fill={colors.accent} rx="0.5" />
          <rect x="47" y="59" width="6" height="2" fill={colors.accent} rx="0.5" />
        </g>
      );

    case "pooja_unit":
      return (
        <g>
          {/* Main body */}
          <rect x="25" y="15" width="50" height="55" fill={colors.secondary} rx="2" />
          {/* Arch top */}
          <path d="M 30 15 Q 50 5 70 15" fill="none" stroke={colors.accent} strokeWidth="2" />
          {/* Inner shrine */}
          <rect x="30" y="20" width="40" height="35" fill={colors.primary} rx="1" />
          {/* Deity platform */}
          <rect x="35" y="40" width="30" height="4" fill={colors.accent} rx="0.5" />
          {/* Decorative arch */}
          <path d="M 33 25 Q 50 18 67 25" fill="none" stroke={colors.accent} strokeWidth="1" />
          {/* Base drawer */}
          <rect x="27" y="57" width="46" height="11" fill={colors.primary} rx="1" />
          <rect x="47" y="61" width="6" height="2" fill={colors.accent} rx="0.5" />
          {/* Bell symbol */}
          <circle cx="50" cy="30" r="3" fill={colors.accent} />
        </g>
      );

    case "vanity":
      return (
        <g>
          {/* Mirror */}
          <rect x="30" y="5" width="40" height="30" fill="#bfdbfe" rx="8" />
          <rect x="33" y="8" width="34" height="24" fill="#dbeafe" rx="6" />
          {/* Counter */}
          <rect x="20" y="38" width="60" height="5" fill={colors.accent} rx="1" />
          {/* Basin */}
          <ellipse cx="50" cy="40" rx="12" ry="4" fill="#f1f5f9" />
          {/* Cabinet */}
          <rect x="20" y="43" width="60" height="25" fill={colors.secondary} rx="2" />
          <rect x="22" y="45" width="28" height="21" fill={colors.primary} rx="1" />
          <rect x="52" y="45" width="26" height="21" fill={colors.primary} rx="1" />
          {/* Handles */}
          <rect x="33" y="54" width="4" height="2" fill={colors.accent} rx="0.5" />
          <rect x="63" y="54" width="4" height="2" fill={colors.accent} rx="0.5" />
        </g>
      );

    case "bar_unit":
      return (
        <g>
          {/* Main body */}
          <rect x="15" y="20" width="70" height="50" fill={colors.secondary} rx="2" />
          {/* Counter top */}
          <rect x="13" y="18" width="74" height="5" fill={colors.accent} rx="1" />
          {/* Glass rack */}
          <rect x="17" y="24" width="30" height="15" fill={colors.primary} rx="1" />
          <line x1="22" y1="32" x2="42" y2="32" stroke={colors.accent} strokeWidth="1" />
          {/* Wine bottles area */}
          <rect x="49" y="24" width="34" height="15" fill={colors.primary} rx="1" />
          <circle cx="56" cy="32" r="3" fill={colors.accent} />
          <circle cx="65" cy="32" r="3" fill={colors.accent} />
          <circle cx="74" cy="32" r="3" fill={colors.accent} />
          {/* Cabinets */}
          <rect x="17" y="42" width="20" height="26" fill={colors.primary} rx="1" />
          <rect x="39" y="42" width="20" height="26" fill={colors.primary} rx="1" />
          <rect x="61" y="42" width="22" height="26" fill={colors.primary} rx="1" />
          {/* Handles */}
          <rect x="25" y="53" width="4" height="2" fill={colors.accent} rx="0.5" />
          <rect x="47" y="53" width="4" height="2" fill={colors.accent} rx="0.5" />
        </g>
      );

    case "display_unit":
      return (
        <g>
          {/* Main frame */}
          <rect x="15" y="8" width="70" height="64" fill={colors.secondary} rx="2" />
          {/* Open display top */}
          <rect x="17" y="10" width="66" height="25" fill="#f1f5f9" rx="1" />
          <rect x="17" y="22" width="66" height="2" fill={colors.primary} />
          {/* Display items */}
          <rect x="22" y="12" width="8" height="10" fill={colors.accent} rx="1" />
          <rect x="35" y="14" width="6" height="8" fill={colors.primary} rx="1" />
          <circle cx="55" cy="18" r="5" fill={colors.accent} />
          <rect x="65" y="13" width="10" height="9" fill={colors.primary} rx="1" />
          {/* Glass doors */}
          <rect x="17" y="37" width="32" height="33" fill="#dbeafe" rx="1" />
          <rect x="51" y="37" width="32" height="33" fill="#dbeafe" rx="1" />
          {/* Shelf in glass */}
          <line x1="17" y1="53" x2="49" y2="53" stroke={colors.primary} strokeWidth="1" />
          <line x1="51" y1="53" x2="83" y2="53" stroke={colors.primary} strokeWidth="1" />
          {/* Handles */}
          <rect x="43" y="50" width="2" height="8" fill={colors.accent} rx="0.5" />
          <rect x="55" y="50" width="2" height="8" fill={colors.accent} rx="0.5" />
        </g>
      );

    default:
      return (
        <g>
          {/* Generic furniture */}
          <rect x="20" y="15" width="60" height="50" fill={colors.secondary} rx="3" />
          <rect x="25" y="20" width="50" height="40" fill={colors.primary} rx="2" />
          <rect x="30" y="25" width="40" height="30" fill={colors.accent} rx="1" opacity="0.3" />
          <circle cx="50" cy="40" r="8" fill={colors.accent} opacity="0.5" />
        </g>
      );
  }
}
