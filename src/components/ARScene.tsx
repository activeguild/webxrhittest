"use client";

import { useRef, useState } from "react";
import { ARViewer, ARViewerRef } from "./ARViewer";

export function ARScene() {
  const viewerRef = useRef<ARViewerRef>(null);
  const [autoPlace, setAutoPlace] = useState(false);

  const startAR = (auto: boolean) => {
    setAutoPlace(auto);
    viewerRef.current?.activateAR();
  };

  const buttonStyle: React.CSSProperties = {
    padding: "16px 32px",
    fontSize: "18px",
    fontWeight: "bold",
    color: "white",
    border: "none",
    borderRadius: "12px",
    cursor: "pointer",
  };

  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 10,
          display: "flex",
          flexDirection: "column",
          gap: "16px",
          alignItems: "center",
        }}
      >
        <button
          onClick={() => startAR(true)}
          style={{ ...buttonStyle, backgroundColor: "#2563eb" }}
        >
          AR を開始（自動配置）
        </button>
        <button
          onClick={() => startAR(false)}
          style={{ ...buttonStyle, backgroundColor: "#059669" }}
        >
          AR を開始（タップ配置）
        </button>
      </div>
      <ARViewer
        ref={viewerRef}
        modelUrl="/models/heaby.glb"
        autoPlace={autoPlace}
      />
    </div>
  );
}
