/**
 * ToolButton - Reusable button component for toolbar tools
 */

import React from "react";
import { cn } from "@/lib/utils";

interface ToolButtonProps {
  isActive?: boolean;
  onClick: () => void;
  title: string;
  disabled?: boolean;
  children: React.ReactNode;
  variant?: "default" | "danger" | "success" | "warning";
}

const variantStyles = {
  default: {
    active: "bg-blue-600 text-white",
    inactive: "text-slate-400 hover:text-white hover:bg-slate-700",
  },
  danger: {
    active: "bg-red-600 text-white",
    inactive: "text-slate-400 hover:text-red-400 hover:bg-slate-700",
  },
  success: {
    active: "bg-green-600 text-white",
    inactive: "text-slate-400 hover:text-green-400 hover:bg-slate-700",
  },
  warning: {
    active: "bg-amber-600 text-white",
    inactive: "text-slate-400 hover:text-amber-400 hover:bg-slate-700",
  },
};

export default function ToolButton({
  isActive = false,
  onClick,
  title,
  disabled = false,
  children,
  variant = "default",
}: ToolButtonProps) {
  const styles = variantStyles[variant];

  return (
    <button
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={cn(
        "p-1.5 rounded transition-all",
        disabled ? "text-slate-500 cursor-not-allowed" : (isActive ? styles.active : styles.inactive)
      )}
    >
      {children}
    </button>
  );
}
