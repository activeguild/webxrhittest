"use client";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  forwardRef,
} from "react";
import { createPortal } from "react-dom";
import { Canvas, useThree } from "@react-three/fiber";
import {
  NoToneMapping,
  EquirectangularReflectionMapping,
} from "three";
import { RGBELoader } from "three/addons/loaders/RGBELoader.js";
import { createXRStore, XR } from "@react-three/xr";
import { HitTest } from "./HitTest";

function SceneSetup({ environmentUrl }: { environmentUrl?: string }) {
  const { gl, scene } = useThree();
  const initRef = useRef(false);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    // eslint-disable-next-line react-hooks/immutability
    gl.toneMapping = NoToneMapping;

    if (environmentUrl) {
      new RGBELoader().load(environmentUrl, (texture) => {
        texture.mapping = EquirectangularReflectionMapping;
        scene.environment = texture;
      });
    }
  }, [gl, scene, environmentUrl]);

  return null;
}

export interface ARViewerRef {
  activateAR: () => Promise<void>;
}

export interface ARViewerProps {
  modelUrl?: string;
  guideImageUrl?: string;
  guideText?: string;
  onSessionStart?: () => void;
  onSessionEnd?: () => void;
}

export const ARViewer = forwardRef<ARViewerRef, ARViewerProps>(
  function ARViewer(
    {
      modelUrl = "/models/duck.glb",
      guideImageUrl = "/mobile.svg",
      guideText = "平面にカメラをかざしてください",
      onSessionStart,
      onSessionEnd,
    },
    ref
  ) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [session, setSession] = useState<XRSession | null>(null);
    const [isTracking, setIsTracking] = useState(false);

    // Create overlay element and XR store once per instance
    const { overlayEl, store } = useMemo(() => {
      const el =
        typeof document !== "undefined"
          ? (() => {
              const div = document.createElement("div");
              div.style.cssText =
                "position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:10;";
              return div;
            })()
          : null;

      const xrStore = createXRStore({
        hitTest: true,
        domOverlay: el || true,
        transientPointer: false,
      });

      return { overlayEl: el, store: xrStore };
    }, []);

    useEffect(() => {
      if (containerRef.current && overlayEl && !overlayEl.parentElement) {
        containerRef.current.appendChild(overlayEl);
      }
    }, [overlayEl]);

    const handleTrackingChange = useCallback((tracking: boolean) => {
      setIsTracking(tracking);
    }, []);

    const activateAR = useCallback(async () => {
      const sess = await store.enterAR();
      if (sess) {
        setSession(sess);
        onSessionStart?.();
        sess.addEventListener("end", () => {
          setSession(null);
          setIsTracking(false);
          onSessionEnd?.();
        });
      }
    }, [store, onSessionStart, onSessionEnd]);

    useImperativeHandle(ref, () => ({ activateAR }), [activateAR]);

    return (
      <div
        ref={containerRef}
        style={{ width: "100%", height: "100%", position: "relative" }}
      >
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
                    src={guideImageUrl}
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
                    {guideText}
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
            <SceneSetup environmentUrl="/environment.hdr" />
            <HitTest
              modelUrl={modelUrl}
              onTrackingChange={handleTrackingChange}
            />
          </XR>
        </Canvas>
      </div>
    );
  }
);
