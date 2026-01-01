import React from "react";
import "./RightPanel.css";

type StatusBarProps = {
  width: number;
  height: number;
  dividers: number;
  tool: string;
  snap: boolean;
};

export default function StatusBar({ width, height, dividers, tool, snap }: StatusBarProps) {
  return (
    <div className="status-bar">
      <span>
        Width: {width} cm | Height: {height} cm | Dividers: {dividers}
      </span>

      <span>
        Tool: {tool} | Snap: {snap ? "ON" : "OFF"}
      </span>
    </div>
  );
}
