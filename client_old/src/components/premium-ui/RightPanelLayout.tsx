import React from "react";
import "./RightPanel.css";

type RightPanelLayoutProps = {
  children?: React.ReactNode;
};

export default function RightPanelLayout({ children }: RightPanelLayoutProps) {
  return (
    <div className="right-panel-container">
      {children}
    </div>
  );
}
