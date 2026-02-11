"use client";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  forwardRef,
  Component,
  type ReactNode,
  type ErrorInfo,
} from "react";
import { createPortal } from "react-dom";
import { Canvas, useThree } from "@react-three/fiber";
import {
  NoToneMapping,
  EquirectangularReflectionMapping,
} from "three";
import { RGBELoader } from "three/addons/loaders/RGBELoader.js";
import { useProgress, useGLTF } from "@react-three/drei";
import { createXRStore, XR } from "@react-three/xr";
import { HitTest } from "./HitTest";

interface ErrorBoundaryProps {
  onError?: (error: Error) => void;
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class ARErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  componentDidCatch(error: Error, _info: ErrorInfo) {
    this.props.onError?.(error);
  }

  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

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
  autoPlace?: boolean;
  onSessionStart?: () => void;
  onSessionEnd?: () => void;
  onError?: (error: Error) => void;
}

export const ARViewer = forwardRef<ARViewerRef, ARViewerProps>(
  function ARViewer(
    {
      modelUrl = "/models/duck.glb",
      guideImageUrl = "/mobile.svg",
      guideText = "平面にカメラをかざして左右に動かしてください",
      autoPlace = false,
      onSessionStart,
      onSessionEnd,
      onError,
    },
    ref
  ) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [session, setSession] = useState<XRSession | null>(null);
    const [isTracking, setIsTracking] = useState(false);
    const { active: loading, progress } = useProgress();

    // Preload model on mount
    useEffect(() => {
      useGLTF.preload(modelUrl);
    }, [modelUrl]);

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
        controller: false,
        hand: false,
        gaze: false,
        screenInput: false,
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
      try {
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
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setSession(null);
        setIsTracking(false);
        onError?.(error);
      }
    }, [store, onSessionStart, onSessionEnd, onError]);

    const handleRenderError = useCallback(
      (error: Error) => {
        session?.end();
        setSession(null);
        setIsTracking(false);
        onError?.(error);
      },
      [session, onError]
    );

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
              {!isTracking && !loading && (
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
              {loading && (
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    backgroundColor: "rgba(200, 200, 200, 0.6)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "12px",
                  }}
                >
                  <p
                    style={{
                      color: "#333",
                      fontSize: "14px",
                      margin: 0,
                      fontWeight: "bold",
                    }}
                  >
                    ARを読み込んでいます。 {Math.round(progress)}%
                  </p>
                  <div
                    style={{
                      width: "60%",
                      maxWidth: "240px",
                      height: "6px",
                      backgroundColor: "rgba(0, 0, 0, 0.2)",
                      borderRadius: "3px",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${progress}%`,
                        height: "100%",
                        backgroundColor: "#2563eb",
                        borderRadius: "3px",
                        transition: "width 0.2s ease",
                      }}
                    />
                  </div>
                </div>
              )}
            </>,
            overlayEl
          )}
        <ARErrorBoundary onError={handleRenderError}>
          <Canvas style={{ width: "100%", height: "100%" }}>
            <XR store={store}>
              <SceneSetup environmentUrl="/environment.hdr" />
              <HitTest
                modelUrl={modelUrl}
                autoPlace={autoPlace}
                onTrackingChange={handleTrackingChange}
              />
            </XR>
          </Canvas>
        </ARErrorBoundary>
      </div>
    );
  }
);
