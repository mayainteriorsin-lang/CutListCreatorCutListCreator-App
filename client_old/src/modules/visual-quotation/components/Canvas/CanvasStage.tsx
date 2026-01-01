import React from "react";
import { Stage, Layer, Rect, Line, Text } from "react-konva";
import { useVisualQuotationStore } from "../../store/visualQuotationStore";

const EDGE_HIT_SIZE = 40;
const MIN_SIZE = 20;

// ====================================================================
// UNIVERSAL EDGE RESIZE ENGINE (WARDROBE + LOFT)
// ====================================================================
const adaptiveResize = (
  box,
  edge,
  pos,
  fitModeLockedTop
) => {
  let { x, y, width, height } = box;

  if (edge === "left") {
    const newLeft = pos.x;
    const right = x + width;
    let newWidth = right - newLeft;
    if (newWidth < MIN_SIZE) newWidth = MIN_SIZE;
    x = right - newWidth;
    width = newWidth;
  }

  if (edge === "right") {
    const newRight = pos.x;
    const left = x;
    let newWidth = newRight - left;
    if (newWidth < MIN_SIZE) newWidth = MIN_SIZE;
    width = newWidth;
  }

  if (edge === "top" && !fitModeLockedTop) {
    const newTop = pos.y;
    const bottom = y + height;
    let newHeight = bottom - newTop;
    if (newHeight < MIN_SIZE) newHeight = MIN_SIZE;
    y = bottom - newHeight;
    height = newHeight;
  }

  if (edge === "bottom") {
    const newBottom = pos.y;
    const top = y;
    let newHeight = newBottom - top;
    if (newHeight < MIN_SIZE) newHeight = MIN_SIZE;
    height = newHeight;
  }

  return { x, y, width, height };
};

// ====================================================================
// REUSABLE DRAG HANDLER
// ====================================================================
const handleEdgeDrag = (target, edge, e) => {
  const stage = e.target.getStage();
  const pos = stage.getPointerPosition();
  if (!pos) return;

  useVisualQuotationStore.setState((s) => {
    const box = target === "wardrobe" ? s.wardrobeBox : s.loftBox;
    if (!box || s.locked) return s;

    const updated = adaptiveResize(
      box,
      edge,
      pos,
      s.edgeResizeOnly // Fit Mode locks TOP
    );

    if (target === "wardrobe") {
      return { wardrobeBox: updated };
    } else {
      return { loftBox: updated };
    }
  });

  e.target.getLayer().batchDraw();
};

// ====================================================================
// MAIN COMPONENT
// ====================================================================
export default function CanvasStage() {
  const {
    wardrobeBox,
    loftBox,
    shutterDividerXs,
    backgroundImage,
    edgeResizeOnly,
    locked
  } = useVisualQuotationStore();

  return (
    <div style={{ width: "100%", height: "100%", background: "#ddd" }}>
      <Stage
        width={window.innerWidth}
        height={window.innerHeight - 40}
        style={{ background: "#f0f0f0" }}
      >
        <Layer>
          {/* BACKGROUND IMG */}
          {backgroundImage && (
            <Rect
              x={0}
              y={0}
              width={backgroundImage.width}
              height={backgroundImage.height}
              fillPatternImage={backgroundImage}
            />
          )}

          {/* ============================================================
              WARDROBE BOX
          ============================================================ */}
          {wardrobeBox && (
            <>
              <Rect
                x={wardrobeBox.x}
                y={wardrobeBox.y}
                width={wardrobeBox.width}
                height={wardrobeBox.height}
                stroke="#0077ff"
                strokeWidth={2}
                draggable={!locked}
                onDragMove={(e) => {
                  const pos = e.target.position();
                  useVisualQuotationStore.setState((s) => ({
                    wardrobeBox: {
                      ...s.wardrobeBox,
                      x: pos.x,
                      y: pos.y,
                    }
                  }));
                }}
              />

              {/* LEFT EDGE */}
              <Rect
                x={wardrobeBox.x - EDGE_HIT_SIZE / 2}
                y={wardrobeBox.y}
                width={EDGE_HIT_SIZE}
                height={wardrobeBox.height}
                fill="transparent"
                draggable
                onDragMove={(e) =>
                  handleEdgeDrag("wardrobe", "left", e)
                }
              />

              {/* RIGHT EDGE */}
              <Rect
                x={
                  wardrobeBox.x +
                  wardrobeBox.width -
                  EDGE_HIT_SIZE / 2
                }
                y={wardrobeBox.y}
                width={EDGE_HIT_SIZE}
                height={wardrobeBox.height}
                fill="transparent"
                draggable
                onDragMove={(e) =>
                  handleEdgeDrag("wardrobe", "right", e)
                }
              />

              {/* TOP EDGE (disabled in Fit Mode) */}
              {!edgeResizeOnly && (
                <Rect
                  x={wardrobeBox.x}
                  y={wardrobeBox.y - EDGE_HIT_SIZE / 2}
                  width={wardrobeBox.width}
                  height={EDGE_HIT_SIZE}
                  fill="transparent"
                  draggable
                  onDragMove={(e) =>
                    handleEdgeDrag("wardrobe", "top", e)
                  }
                />
              )}

              {/* BOTTOM EDGE */}
              <Rect
                x={wardrobeBox.x}
                y={
                  wardrobeBox.y +
                  wardrobeBox.height -
                  EDGE_HIT_SIZE / 2
                }
                width={wardrobeBox.width}
                height={EDGE_HIT_SIZE}
                fill="transparent"
                draggable
                onDragMove={(e) =>
                  handleEdgeDrag("wardrobe", "bottom", e)
                }
              />

              {/* DIVIDERS */}
              {shutterDividerXs.map((xPos, idx) => (
                <Line
                  key={idx}
                  points={[
                    xPos,
                    wardrobeBox.y,
                    xPos,
                    wardrobeBox.y + wardrobeBox.height,
                  ]}
                  stroke="#ff0000"
                  strokeWidth={2}
                  draggable
                  onDragMove={(e) => {
                    const stage = e.target.getStage();
                    const pos = stage.getPointerPosition();
                    if (!pos) return;

                    useVisualQuotationStore.setState((s) => {
                      const newArr = [...s.shutterDividerXs];
                      newArr[idx] = pos.x;
                      return { shutterDividerXs: newArr };
                    });
                  }}
                />
              ))}
            </>
          )}

          {/* ============================================================
              LOFT BOX
          ============================================================ */}
          {loftBox && (
            <>
              <Rect
                x={loftBox.x}
                y={loftBox.y}
                width={loftBox.width}
                height={loftBox.height}
                stroke="#ff9900"
                strokeWidth={2}
                draggable={!locked}
                onDragMove={(e) => {
                  const pos = e.target.position();
                  useVisualQuotationStore.setState((s) => ({
                    loftBox: {
                      ...s.loftBox,
                      x: pos.x,
                      y: pos.y,
                    }
                  }));
                }}
              />

              {/* LOFT LEFT */}
              <Rect
                x={loftBox.x - EDGE_HIT_SIZE / 2}
                y={loftBox.y}
                width={EDGE_HIT_SIZE}
                height={loftBox.height}
                fill="transparent"
                draggable
                onDragMove={(e) => handleEdgeDrag("loft", "left", e)}
              />

              {/* LOFT RIGHT */}
              <Rect
                x={
                  loftBox.x + loftBox.width - EDGE_HIT_SIZE / 2
                }
                y={loftBox.y}
                width={EDGE_HIT_SIZE}
                height={loftBox.height}
                fill="transparent"
                draggable
                onDragMove={(e) => handleEdgeDrag("loft", "right", e)}
              />

              {/* LOFT TOP */}
              <Rect
                x={loftBox.x}
                y={loftBox.y - EDGE_HIT_SIZE / 2}
                width={loftBox.width}
                height={EDGE_HIT_SIZE}
                fill="transparent"
                draggable
                onDragMove={(e) => handleEdgeDrag("loft", "top", e)}
              />

              {/* LOFT BOTTOM */}
              <Rect
                x={loftBox.x}
                y={
                  loftBox.y + loftBox.height - EDGE_HIT_SIZE / 2
                }
                width={loftBox.width}
                height={EDGE_HIT_SIZE}
                fill="transparent"
                draggable
                onDragMove={(e) =>
                  handleEdgeDrag("loft", "bottom", e)
                }
              />
            </>
          )}
        </Layer>
      </Stage>
    </div>
  );
}
