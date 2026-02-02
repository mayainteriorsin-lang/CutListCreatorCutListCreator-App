/**
 * Inner Dimensions Renderer
 *
 * Renders ALL inner dimensions for wardrobe carcass.
 * UNIFIED styling - same color and font for everything.
 */

import React from "react";
import type { Shape, RectShape } from "../../types";
import { getTextStyle } from "../utils";
import type { SectionBoundary } from "../types";

// =============================================================================
// TYPES
// =============================================================================

interface Props {
  shapes: Shape[];
  fontSize: number;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function getCarcassPanels(shapes: Shape[]) {
  return {
    top: shapes.find(s => s.id === "MOD-TOP") as RectShape | undefined,
    bottom: shapes.find(s => s.id === "MOD-BOTTOM") as RectShape | undefined,
    left: shapes.find(s => s.id === "MOD-LEFT") as RectShape | undefined,
    right: shapes.find(s => s.id === "MOD-RIGHT") as RectShape | undefined,
  };
}

function getCenterPosts(shapes: Shape[]): RectShape[] {
  return shapes
    .filter(s => s.type === "rect" && s.id.startsWith("MOD-POST-"))
    .map(s => s as RectShape)
    .sort((a, b) => a.x - b.x);
}

function getShelves(shapes: Shape[]): RectShape[] {
  return shapes
    .filter(s => s.type === "rect" && s.id.startsWith("MOD-SHELF-"))
    .map(s => s as RectShape);
}

function buildSections(
  innerLeft: number,
  innerRight: number,
  innerWidth: number,
  centerPosts: RectShape[]
): SectionBoundary[] {
  if (centerPosts.length === 0) {
    return [{ start: innerLeft, end: innerRight, width: innerWidth }];
  }

  const sections: SectionBoundary[] = [];

  // First section
  sections.push({
    start: innerLeft,
    end: centerPosts[0].x,
    width: centerPosts[0].x - innerLeft,
  });

  // Middle sections
  for (let i = 0; i < centerPosts.length - 1; i++) {
    const start = centerPosts[i].x + centerPosts[i].w;
    const end = centerPosts[i + 1].x;
    sections.push({ start, end, width: end - start });
  }

  // Last section
  const lastPost = centerPosts[centerPosts.length - 1];
  sections.push({
    start: lastPost.x + lastPost.w,
    end: innerRight,
    width: innerRight - (lastPost.x + lastPost.w),
  });

  return sections;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function InnerDimensions({ shapes, fontSize }: Props): React.ReactElement | null {
  // Safety check - valid fontSize
  const safeFontSize = fontSize && isFinite(fontSize) && fontSize > 0 ? fontSize : 28;

  const panels = getCarcassPanels(shapes);

  // Safety check - all panels must exist
  if (!panels.top || !panels.bottom || !panels.left || !panels.right) {
    return null;
  }

  const centerPosts = getCenterPosts(shapes);
  const shelves = getShelves(shapes);

  // Calculate inner bounds with safety checks
  const innerLeft = panels.left.x + panels.left.w;
  const innerRight = panels.right.x;
  const innerTop = panels.top.y + panels.top.h;
  const innerBottom = panels.bottom.y;
  const innerHeight = innerBottom - innerTop;
  const innerWidth = innerRight - innerLeft;

  // Safety check for valid dimensions
  if (innerHeight <= 0 || innerWidth <= 0 || !isFinite(innerHeight) || !isFinite(innerWidth)) {
    return null;
  }

  // Outer bounds
  const outerLeft = panels.left.x;
  const outerRight = panels.right.x + panels.right.w;
  const outerTop = panels.top.y;
  const outerBottom = panels.bottom.y + panels.bottom.h;
  const outerHeight = outerBottom - outerTop;

  // Safety check
  if (outerHeight <= 0 || !isFinite(outerHeight)) {
    return null;
  }

  const sections = buildSections(innerLeft, innerRight, innerWidth, centerPosts);
  const textStyle = getTextStyle(safeFontSize);
  const dimOffset = safeFontSize * 1.8;

  // Fixed X position for left-side vertical dimensions (aligned)
  const leftDimX = outerLeft - dimOffset;
  const rightDimX = outerRight + dimOffset;

  // Group shelves by section
  const getShelvesBySection = (sectionIdx: number) => {
    return shelves
      .filter(shelf => {
        const shelfCenter = shelf.x + shelf.w / 2;
        return shelfCenter >= sections[sectionIdx].start && shelfCenter <= sections[sectionIdx].end;
      })
      .sort((a, b) => a.y - b.y);
  };

  return (
    <g id="inner-dimensions">
      {/* ================================================================== */}
      {/* LEFT SIDE - Overall Height */}
      {/* ================================================================== */}
      <text
        x={leftDimX}
        y={outerTop + outerHeight / 2}
        textAnchor="middle"
        {...textStyle}
        transform={`rotate(-90, ${leftDimX}, ${outerTop + outerHeight / 2})`}
      >
        {Math.round(outerHeight)}
      </text>

      {/* ================================================================== */}
      {/* EACH SECTION - Inner width + Inner height + Shelf spacing */}
      {/* ================================================================== */}
      {sections.map((section, sectionIdx) => {
        const sectionCenterX = (section.start + section.end) / 2;
        const sectionShelves = getShelvesBySection(sectionIdx);

        // Calculate vertical gaps between shelves
        const gaps: { y: number; height: number }[] = [];

        // First gap: from inner top to first shelf (or bottom if no shelves)
        if (sectionShelves.length === 0) {
          gaps.push({ y: innerTop, height: innerHeight });
        } else {
          // Gap from top to first shelf
          const firstShelf = sectionShelves[0];
          if (firstShelf.y > innerTop) {
            gaps.push({ y: innerTop, height: firstShelf.y - innerTop });
          }

          // Gaps between shelves
          for (let i = 0; i < sectionShelves.length - 1; i++) {
            const currentShelf = sectionShelves[i];
            const nextShelf = sectionShelves[i + 1];
            const gapStart = currentShelf.y + currentShelf.h;
            const gapHeight = nextShelf.y - gapStart;
            if (gapHeight > 0) {
              gaps.push({ y: gapStart, height: gapHeight });
            }
          }

          // Gap from last shelf to bottom
          const lastShelf = sectionShelves[sectionShelves.length - 1];
          const bottomGapStart = lastShelf.y + lastShelf.h;
          const bottomGapHeight = innerBottom - bottomGapStart;
          if (bottomGapHeight > 0) {
            gaps.push({ y: bottomGapStart, height: bottomGapHeight });
          }
        }

        return (
          <g key={`section-${sectionIdx}`}>
            {/* Section inner width - inside section at bottom */}
            <text
              x={sectionCenterX}
              y={innerBottom - safeFontSize * 0.5}
              textAnchor="middle"
              {...textStyle}
            >
              {Math.round(section.width)}
            </text>

            {/* Vertical gaps - show height of each gap */}
            {gaps.map((gap, gapIdx) => {
              const gapCenterY = gap.y + gap.height / 2;
              const xPos = section.start + safeFontSize * 0.8;
              return (
                <text
                  key={`gap-${sectionIdx}-${gapIdx}`}
                  x={xPos}
                  y={gapCenterY}
                  textAnchor="middle"
                  {...textStyle}
                  transform={`rotate(-90, ${xPos}, ${gapCenterY})`}
                >
                  {Math.round(gap.height)}
                </text>
              );
            })}
          </g>
        );
      })}

      {/* ================================================================== */}
      {/* CENTER POST - Width below wardrobe */}
      {/* ================================================================== */}
      {centerPosts.map((post, idx) => (
        <text
          key={`cp-${idx}`}
          x={post.x + post.w / 2}
          y={outerBottom + safeFontSize * 1.2}
          textAnchor="middle"
          {...textStyle}
        >
          {Math.round(post.w)}
        </text>
      ))}
    </g>
  );
}

// =============================================================================
// LEGACY EXPORT (for backwards compatibility)
// =============================================================================

/** @deprecated Use InnerDimensions component */
export function renderInnerDimensions(options: Props): React.ReactElement | null {
  return InnerDimensions(options);
}
