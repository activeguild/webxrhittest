"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { Canvas } from "@react-three/fiber";
import { createXRStore, XR } from "@react-three/xr";
import { HitTest } from "./HitTest";

// DOM overlay root (must exist before store creation for WebXR domOverlay)
const overlayEl =
  typeof document !== "undefined"
    ? (() => {
        const el = document.createElement("div");
        el.style.cssText =
          "position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:10;";
        return el;
      })()
    : null;

const store = createXRStore({
  hitTest: true,
  domOverlay: overlayEl || true,
});

export function ARScene() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [session, setSession] = useState<XRSession | null>(null);
  const [isTracking, setIsTracking] = useState(false);

  const handleTrackingChange = useCallback((tracking: boolean) => {
    setIsTracking(tracking);
  }, []);

  useEffect(() => {
    if (containerRef.current && overlayEl && !overlayEl.parentElement) {
      containerRef.current.appendChild(overlayEl);
    }
  }, []);

  const handleEnterAR = async () => {
    const sess = await store.enterAR();
    if (sess) {
      setSession(sess);
      sess.addEventListener("end", () => {
        setSession(null);
        setIsTracking(false);
      });
    }
  };

  return (
    <div
      ref={containerRef}
      style={{ width: "100vw", height: "100vh", position: "relative" }}
    >
      {!session && (
        <button
          onClick={handleEnterAR}
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
      )}
      {session &&
        overlayEl &&
        createPortal(
          <>
            <button
              onClick={() => session.end()}
              style={{
                position: "absolute",
                top: "16px",
                right: "16px",
                width: "44px",
                height: "44px",
                fontSize: "20px",
                fontWeight: "bold",
                backgroundColor: "rgba(0, 0, 0, 0.5)",
                color: "white",
                border: "none",
                borderRadius: "50%",
                cursor: "pointer",
                pointerEvents: "auto",
              }}
            >
              ✕
            </button>
            {!isTracking && (
              <div
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "20px",
                }}
              >
                <img
                  src="/mobile.svg"
                  alt=""
                  width={120}
                  height={120}
                  style={{
                    animation: "sway 2.5s ease-in-out infinite",
                    objectFit: "contain",
                  }}
                />
                <p
                  style={{
                    color: "white",
                    fontSize: "16px",
                    textAlign: "center",
                    textShadow: "0 1px 4px rgba(0,0,0,0.7)",
                    margin: 0,
                  }}
                >
                  平面にカメラをかざしてください
                </p>
                <style>
                  {`@keyframes sway {
                    0%, 100% { transform: translateX(-20px); }
                    50% { transform: translateX(20px); }
                  }`}
                </style>
              </div>
            )}
          </>,
          overlayEl
        )}
      <Canvas style={{ width: "100%", height: "100%" }}>
        <XR store={store}>
          <ambientLight intensity={0.5} />
          <directionalLight position={[5, 5, 5]} intensity={1} />
          <HitTest onTrackingChange={handleTrackingChange} />
        </XR>
      </Canvas>
    </div>
  );
}
