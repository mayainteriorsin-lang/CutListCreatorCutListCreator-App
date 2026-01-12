/**
 * PATCH 37: Global Loading + Empty States
 *
 * Reusable status blocks for loading and empty states.
 * Ensures users always see meaningful feedback instead of blank screens.
 */

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function LoadingBlock({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex justify-center items-center py-10">
      <Card className="border border-slate-200 shadow-sm">
        <CardContent className="p-6 text-slate-600 text-sm">
          {label}
        </CardContent>
      </Card>
    </div>
  );
}

export function EmptyBlock({
  title = "Nothing here yet",
  description = "No data is available.",
  actionLabel,
  onAction,
}: {
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex justify-center items-center py-10">
      <Card className="max-w-md w-full border border-slate-200 shadow-sm">
        <CardContent className="p-6 space-y-3 text-center">
          <h3 className="font-semibold text-slate-800">{title}</h3>
          <p className="text-sm text-slate-600">{description}</p>
          {actionLabel && onAction && (
            <Button
              onClick={onAction}
              className="mt-2 bg-blue-600 hover:bg-blue-700"
            >
              {actionLabel}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
