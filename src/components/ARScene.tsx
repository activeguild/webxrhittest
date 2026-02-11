"use client";

import { useRef } from "react";
import { ARViewer, ARViewerRef } from "./ARViewer";

export function ARScene() {
  const viewerRef = useRef<ARViewerRef>(null);

  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <button
        onClick={() => viewerRef.current?.activateAR()}
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 10,
          padding: "16px 32px",
          fontSize: "18px",
          fontWeight: "bold",
          backgroundColor: "#2563eb",
          color: "white",
          border: "none",
          borderRadius: "12px",
          cursor: "pointer",
        }}
      >
        AR を開始
      </button>
      <ARViewer ref={viewerRef} modelUrl="/models/duck.glb" />
    </div>
  );
}
