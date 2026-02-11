"use client";

import { Canvas } from "@react-three/fiber";
import { createXRStore, XR } from "@react-three/xr";
import { HitTest } from "./HitTest";

const store = createXRStore({
  hitTest: true,
});

export function ARScene() {
  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <button
        onClick={() => store.enterAR()}
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
      <Canvas
        style={{ width: "100%", height: "100%" }}
      >
        <XR store={store}>
          <ambientLight intensity={0.5} />
          <directionalLight position={[5, 5, 5]} intensity={1} />
          <HitTest />
        </XR>
      </Canvas>
    </div>
  );
}
