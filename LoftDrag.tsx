import React, { useRef, useEffect } from "react";
import { create } from "zustand";

const useLoftStore = create((set) => ({
  loft: {
    x: 100,
    y: 20,
    width: 300,
    height: 120,
    dragEdge: null,
    isDragging: false,
    locked: false,
  },
  startDrag: (edge) =>
    set((state) => ({
      loft: { ...state.loft, dragEdge: edge, isDragging: true },
    })),
  stopDrag: () =>
    set((state) => ({
      loft: { ...state.loft, dragEdge: null, isDragging: false },
    })),
  updateDrag: (mouseX, mouseY, walls, wardrobeTop, dividerLines) =>
    set((state) => {
      const loft = { ...state.loft };
      if (!loft.isDragging || loft.locked) return state;

      const SNAP = 10;
      const oldRight = loft.x + loft.width;
      const oldBottom = loft.y + loft.height;

      // LEFT edge
      if (loft.dragEdge === "left") {
        loft.x = mouseX;
        loft.width = oldRight - mouseX;
      }
      // RIGHT edge
      if (loft.dragEdge === "right") {
        loft.width = mouseX - loft.x;
      }
      // TOP edge
      if (loft.dragEdge === "top") {
        loft.y = mouseY;
        loft.height = oldBottom - mouseY;
      }
      // BOTTOM edge
      if (loft.dragEdge === "bottom") {
        loft.height = mouseY - loft.y;
      }
      // MOVE loft
      if (loft.dragEdge === "move") {
        loft.x = mouseX - loft.width / 2;
        loft.y = mouseY - loft.height / 2;
      }

      // Prevent negative sizes
      loft.width = Math.max(20, loft.width);
      loft.height = Math.max(20, loft.height);

      // Snap to walls
      if (Math.abs(loft.x - walls.left) < SNAP) loft.x = walls.left;
      if (Math.abs(loft.x + loft.width - walls.right) < SNAP)
        loft.width = walls.right - loft.x;

      // Snap to wardrobe top
      if (Math.abs(loft.y - wardrobeTop) < SNAP) loft.y = wardrobeTop;

      // Snap bottom to divider lines
      dividerLines.forEach((line) => {
        if (Math.abs(loft.y + loft.height - line) < SNAP)
          loft.height = line - loft.y;
      });

      return { loft };
    }),
  lockLoft: () =>
    set((state) => ({
      loft: { ...state.loft, locked: true },
    })),
}));

export default function LoftDrag() {
  const { loft, startDrag, stopDrag, updateDrag, lockLoft } = useLoftStore();

  const boardRef = useRef(null);

  const walls = { left: 20, right: 800 };
  const wardrobeTop = 200;
  const dividerLines = [350, 500];

  function getEdge(e, loft) {
    const t = 10;
    const mx = e.clientX;
    const my = e.clientY;

    const left = Math.abs(mx - loft.x) < t;
    const right = Math.abs(mx - (loft.x + loft.width)) < t;
    const top = Math.abs(my - loft.y) < t;
    const bottom = Math.abs(my - (loft.y + loft.height)) < t;

    if (left) return "left";
    if (right) return "right";
    if (top) return "top";
    if (bottom) return "bottom";

    const inside =
      mx > loft.x &&
      mx < loft.x + loft.width &&
      my > loft.y &&
      my < loft.y + loft.height;

    if (inside) return "move";
    return null;
  }

  function onMouseDown(e) {
    if (loft.locked) return;
    const edge = getEdge(e, loft);
    if (edge) startDrag(edge);
  }

  function onMouseMove(e) {
    if (!loft.isDragging) return;
    updateDrag(e.clientX, e.clientY, walls, wardrobeTop, dividerLines);
  }

  function onMouseUp() {
    stopDrag();
  }

  useEffect(() => {
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  });

  const cursor = (() => {
    if (loft.locked) return "default";
    switch (loft.dragEdge) {
      case "left":
      case "right":
        return "ew-resize";
      case "top":
      case "bottom":
        return "ns-resize";
      case "move":
        return "move";
      default:
        return "default";
    }
  })();

  return (
    <div
      ref={boardRef}
      style={{
        position: "relative",
        width: 900,
        height: 600,
        border: "2px solid #ccc",
        margin: "20px auto",
      }}
      onMouseDown={onMouseDown}
    >
      <div
        style={{
          position: "absolute",
          left: loft.x,
          top: loft.y,
          width: loft.width,
          height: loft.height,
          border: loft.locked ? "2px solid gray" : "2px solid black",
          background: loft.locked ? "#eee" : "rgba(0,0,0,0.03)",
          cursor: cursor,
          userSelect: "none",
        }}
      >
        <div
          style={{
            fontSize: 12,
            padding: 4,
            color: "#333",
            background: "rgba(255,255,255,0.7)",
          }}
        >
          {Math.round(loft.width)} × {Math.round(loft.height)}
        </div>
      </div>

      {!loft.locked && (
        <button
          onClick={lockLoft}
          style={{
            position: "absolute",
            bottom: 20,
            left: 20,
            padding: "8px 16px",
            background: "#000",
            color: "#fff",
            border: "none",
            cursor: "pointer",
          }}
        >
          Approve Loft
        </button>
      )}
    </div>
  );
}
