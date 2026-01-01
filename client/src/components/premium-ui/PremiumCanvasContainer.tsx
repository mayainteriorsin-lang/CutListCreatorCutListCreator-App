import React from "react";
import { Stage, Layer } from "react-konva";
import "./RightPanel.css";

type PremiumCanvasContainerProps = {
  imageUrl?: string;
  width: number;
  height: number;
  children?: React.ReactNode;
};

export default function PremiumCanvasContainer({
  imageUrl,
  width,
  height,
  children
}: PremiumCanvasContainerProps) {
  return (
    <div className="canvas-wrapper">
      {imageUrl && (
        <img src={imageUrl} alt="room" className="background-photo" />
      )}

      <Stage width={width} height={height} className="konva-stage">
        <Layer>{children}</Layer>
      </Stage>
    </div>
  );
}
