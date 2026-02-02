/**
 * Loading States Components
 *
 * Provides consistent loading UI across the Visual Quotation module.
 * Includes various loading indicators for different contexts.
 */

import React from "react";

/**
 * Simple spinner component
 */
interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  color?: "primary" | "white" | "slate";
  className?: string;
}

export function Spinner({
  size = "md",
  color = "primary",
  className = "",
}: SpinnerProps): JSX.Element {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8",
  };

  const colorClasses = {
    primary: "border-emerald-500",
    white: "border-white",
    slate: "border-slate-400",
  };

  return (
    <div
      className={`
        animate-spin rounded-full
        border-2 border-t-transparent
        ${sizeClasses[size]}
        ${colorClasses[color]}
        ${className}
      `}
      role="status"
      aria-label="Loading"
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
}

/**
 * Full-page loading overlay
 */
interface LoadingOverlayProps {
  message?: string;
  isVisible: boolean;
}

export function LoadingOverlay({
  message = "Loading...",
  isVisible,
}: LoadingOverlayProps): JSX.Element | null {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 shadow-xl flex flex-col items-center">
        <Spinner size="lg" />
        <p className="mt-4 text-slate-600">{message}</p>
      </div>
    </div>
  );
}

/**
 * Inline loading state for buttons
 */
interface ButtonLoadingProps {
  isLoading: boolean;
  children: React.ReactNode;
  loadingText?: string;
}

export function ButtonLoading({
  isLoading,
  children,
  loadingText = "Loading...",
}: ButtonLoadingProps): JSX.Element {
  if (isLoading) {
    return (
      <span className="flex items-center gap-2">
        <Spinner size="sm" color="white" />
        <span>{loadingText}</span>
      </span>
    );
  }

  return <>{children}</>;
}

/**
 * Skeleton loader for content
 */
interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  className?: string;
  rounded?: "none" | "sm" | "md" | "lg" | "full";
}

export function Skeleton({
  width = "100%",
  height = "1rem",
  className = "",
  rounded = "md",
}: SkeletonProps): JSX.Element {
  const roundedClasses = {
    none: "",
    sm: "rounded-sm",
    md: "rounded",
    lg: "rounded-lg",
    full: "rounded-full",
  };

  return (
    <div
      className={`animate-pulse bg-slate-200 ${roundedClasses[rounded]} ${className}`}
      style={{
        width: typeof width === "number" ? `${width}px` : width,
        height: typeof height === "number" ? `${height}px` : height,
      }}
    />
  );
}

/**
 * Canvas loading placeholder
 */
export function CanvasLoadingPlaceholder(): JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center h-full bg-slate-50 border border-slate-200 rounded">
      <Spinner size="lg" color="slate" />
      <p className="mt-4 text-slate-500">Loading canvas...</p>
    </div>
  );
}

/**
 * Room list skeleton
 */
export function RoomListSkeleton(): JSX.Element {
  return (
    <div className="space-y-2 p-2">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-2 p-2">
          <Skeleton width={24} height={24} rounded="full" />
          <Skeleton width="70%" height={16} />
        </div>
      ))}
    </div>
  );
}

/**
 * Pricing summary skeleton
 */
export function PricingSummarySkeleton(): JSX.Element {
  return (
    <div className="space-y-3 p-4">
      <div className="flex justify-between">
        <Skeleton width={80} height={14} />
        <Skeleton width={60} height={14} />
      </div>
      <div className="flex justify-between">
        <Skeleton width={60} height={14} />
        <Skeleton width={80} height={14} />
      </div>
      <div className="border-t pt-2 flex justify-between">
        <Skeleton width={100} height={18} />
        <Skeleton width={100} height={18} />
      </div>
    </div>
  );
}

/**
 * Export progress indicator
 */
interface ExportProgressProps {
  progress: number;
  message?: string;
}

export function ExportProgress({
  progress,
  message = "Exporting...",
}: ExportProgressProps): JSX.Element {
  return (
    <div className="flex flex-col items-center gap-3 p-4">
      <div className="w-48 h-2 bg-slate-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-emerald-500 transition-all duration-300"
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>
      <p className="text-sm text-slate-600">{message}</p>
    </div>
  );
}

/**
 * Generic content loading wrapper
 */
interface LoadingWrapperProps {
  isLoading: boolean;
  loadingComponent?: React.ReactNode;
  children: React.ReactNode;
}

export function LoadingWrapper({
  isLoading,
  loadingComponent,
  children,
}: LoadingWrapperProps): JSX.Element {
  if (isLoading) {
    return (
      <>
        {loadingComponent || (
          <div className="flex items-center justify-center p-4">
            <Spinner />
          </div>
        )}
      </>
    );
  }

  return <>{children}</>;
}

export default {
  Spinner,
  LoadingOverlay,
  ButtonLoading,
  Skeleton,
  CanvasLoadingPlaceholder,
  RoomListSkeleton,
  PricingSummarySkeleton,
  ExportProgress,
  LoadingWrapper,
};
