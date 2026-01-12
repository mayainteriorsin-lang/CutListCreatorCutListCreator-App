import React from "react";

/**
 * RenderGuard - PATCH 17
 *
 * Prevents rendering children until data is ready.
 * Use this to wrap expensive components that depend on async data.
 */
export default function RenderGuard({
  ready,
  children,
}: {
  ready: boolean;
  children: React.ReactNode;
}) {
  if (!ready) {
    return (
      <div className="text-sm text-gray-500 p-4">
        Loading…
      </div>
    );
  }
  return <>{children}</>;
}
