/**
 * Dimension Shape Renderer
 *
 * Renders manually placed dimension shapes (horizontal/vertical).
 * UNIFIED styling - same color and font for everything.
 */

import React from "react";
import type { DimensionShape } from "../../types";
import { getTextStyle } from "../utils";

// =============================================================================
// TYPES
// =============================================================================

interface Props {
  dimension: DimensionShape;
  fontSize: number;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function DimensionShapeRenderer({ dimension: d, fontSize }: Props): React.ReactElement | null {
  const mx = (d.x1 + d.x2) / 2;
  const my = (d.y1 + d.y2) / 2;
  const len = Math.round(Math.hypot(d.x2 - d.x1, d.y2 - d.y1));
  const labelText = d.label || `${len}`;
  const textStyle = getTextStyle(fontSize);

  if (d.dimType === "horizontal") {
    return (
      <g key={d.id}>
        <text
          x={mx}
          y={d.y1 - 10}
          textAnchor="middle"
          {...textStyle}
        >
          {labelText}
        </text>
      </g>
    );
  }

  if (d.dimType === "vertical") {
    return (
      <g key={d.id}>
        <text
          x={d.x1 - 10}
          y={my}
          textAnchor="end"
          {...textStyle}
          transform={`rotate(-90, ${d.x1 - 10}, ${my})`}
        >
          {labelText}
        </text>
      </g>
    );
  }

  return null;
}

// =============================================================================
// LEGACY EXPORT (for backwards compatibility)
// =============================================================================

/** @deprecated Use DimensionShapeRenderer component */
export function renderDimension(d: DimensionShape, fontSize: number): React.ReactElement | null {
  return DimensionShapeRenderer({ dimension: d, fontSize });
}
