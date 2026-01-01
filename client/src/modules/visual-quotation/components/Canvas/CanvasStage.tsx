import { Stage, Layer, Rect, Line } from "react-konva";
import type { KonvaEventObject } from "konva/lib/Node";
import { useVisualQuotationStore } from "../../store/visualQuotationStore";

const EDGE_HIT_SIZE = 40;
const MIN_SIZE = 20;

type ResizeEdge = "left" | "right" | "top" | "bottom";
type ResizeTarget = "wardrobe" | "loft";
type BoxLike = { x: number; y: number; width: number; height: number };
type PointerPosition = { x: number; y: number };

// ====================================================================
// UNIVERSAL EDGE RESIZE ENGINE (WARDROBE + LOFT)
// ====================================================================
const adaptiveResize = <T extends BoxLike>(
  box: T,
  edge: ResizeEdge,
  pos: PointerPosition,
  fitModeLockedTop: boolean
): T => {
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

  return { ...box, x, y, width, height };
};

// ====================================================================
// REUSABLE DRAG HANDLER
// ====================================================================
const handleEdgeDrag = (
  target: ResizeTarget,
  edge: ResizeEdge,
  e: KonvaEventObject<DragEvent>
) => {
  const stage = e.target.getStage();
  const pos = stage?.getPointerPosition();
  if (!pos) return;

  useVisualQuotationStore.setState((s) => {
    if (target === "wardrobe") {
      const box = s.wardrobeBox;
      if (!box || s.locked) return s;

      const updated = adaptiveResize(
        box,
        edge,
        pos,
        s.edgeResizeOnly // Fit Mode locks TOP
      );

      return { wardrobeBox: updated };
    }

    const box = s.loftBox;
    if (!box || s.locked) return s;

    const updated = adaptiveResize(
      box,
      edge,
      pos,
      s.edgeResizeOnly // Fit Mode locks TOP
    );

    return { loftBox: updated };
  });

  const layer = e.target.getLayer();
  if (layer) {
    layer.batchDraw();
  }
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
                  useVisualQuotationStore.setState((s) => {
                    if (!s.wardrobeBox) return s;
                    return {
                      wardrobeBox: {
                        ...s.wardrobeBox,
                        x: pos.x,
                        y: pos.y,
                      },
                    };
                  });
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
                    const pos = stage?.getPointerPosition();
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
                  useVisualQuotationStore.setState((s) => {
                    if (!s.loftBox) return s;
                    return {
                      loftBox: {
                        ...s.loftBox,
                        x: pos.x,
                        y: pos.y,
                      },
                    };
                  });
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
