"use client";

import { useRef, useState, useEffect, useCallback, Suspense } from "react";
import {
  Group,
  Matrix4,
  Vector3,
  Quaternion,
  Raycaster,
  Plane as ThreePlane,
  Vector2,
} from "three";
import { useThree } from "@react-three/fiber";
import { useXRHitTest, useXR } from "@react-three/xr";
import { Reticle } from "./Reticle";
import { PlacedModel } from "./PlacedModel";
import { LoadingIndicator } from "./LoadingIndicator";

const matrixHelper = new Matrix4();
const positionHelper = new Vector3();
const quaternionHelper = new Quaternion();
const scaleHelper = new Vector3();

// Drag raycasting helpers
const raycaster = new Raycaster();
const touchNDC = new Vector2();
const groundNormal = new Vector3(0, 1, 0);
const groundPlane = new ThreePlane(groundNormal, 0);
const intersectionPoint = new Vector3();

const DEFAULT_SCALE = 0.3;
const MIN_SCALE = 0.05;
const MAX_SCALE = 2;
const TAP_THRESHOLD_MS = 200;
const TAP_DISTANCE_PX = 10;

function getDistance(touches: TouchList) {
  const dx = touches[0].clientX - touches[1].clientX;
  const dy = touches[0].clientY - touches[1].clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

function getAngle(touches: TouchList) {
  const dx = touches[1].clientX - touches[0].clientX;
  const dy = touches[1].clientY - touches[0].clientY;
  return Math.atan2(dy, dx);
}

interface HitTestProps {
  modelUrl?: string;
  autoPlace?: boolean;
  onTrackingChange?: (tracking: boolean) => void;
}

export function HitTest({ modelUrl = "/models/duck.glb", autoPlace = false, onTrackingChange }: HitTestProps) {
  const { camera } = useThree();
  const wasTrackingRef = useRef(false);
  const reticleRef = useRef<Group>(null);
  const modelRef = useRef<Group>(null);
  const currentPositionRef = useRef(new Vector3());
  const currentQuaternionRef = useRef(new Quaternion());
  const [placed, setPlaced] = useState<{
    position: Vector3;
    quaternion: Quaternion;
  } | null>(null);
  const isHittingRef = useRef(false);
  const autoPlacedRef = useRef(false);
  const placedRef = useRef(false);

  const [scale, setScale] = useState(DEFAULT_SCALE);
  const scaleRef = useRef(DEFAULT_SCALE);
  const [rotationY, setRotationY] = useState(0);
  const rotationYRef = useRef(0);

  const gestureRef = useRef<{
    initialDistance: number;
    initialScale: number;
    initialAngle: number;
    initialRotationY: number;
    mode: "undecided" | "scale" | "rotate";
  } | null>(null);

  const dragRef = useRef<{
    active: boolean;
    startTime: number;
    startX: number;
    startY: number;
    modelY: number;
  } | null>(null);
  const skipSelectCountRef = useRef(0);

  // Sync placed state to ref for use in hit test callback
  useEffect(() => {
    placedRef.current = placed !== null;
  }, [placed]);

  // Hit test for reticle only
  useXRHitTest(
    (results, getWorldMatrix) => {
      if (results.length > 0 && reticleRef.current) {
        getWorldMatrix(matrixHelper, results[0]);
        matrixHelper.decompose(positionHelper, quaternionHelper, scaleHelper);

        reticleRef.current.position.copy(positionHelper);
        reticleRef.current.quaternion.copy(quaternionHelper);
        // Hide reticle when model is already placed
        reticleRef.current.visible = !placedRef.current;

        currentPositionRef.current.copy(positionHelper);
        currentQuaternionRef.current.copy(quaternionHelper);
        isHittingRef.current = true;

        if (!wasTrackingRef.current) {
          wasTrackingRef.current = true;
          onTrackingChange?.(true);

          if (autoPlace && !autoPlacedRef.current) {
            autoPlacedRef.current = true;
            setPlaced({
              position: positionHelper.clone(),
              quaternion: quaternionHelper.clone(),
            });
          }
        }
      } else if (reticleRef.current) {
        reticleRef.current.visible = false;
        isHittingRef.current = false;

        if (wasTrackingRef.current) {
          wasTrackingRef.current = false;
          onTrackingChange?.(false);
        }
      }
    },
    "viewer",
    "plane"
  );

  // Tap to place (XR select = quick tap)
  const handleSelect = useCallback(() => {
    if (!isHittingRef.current) return;
    // Skip select events caused by drag or pinch/rotate release
    if (skipSelectCountRef.current > 0) {
      skipSelectCountRef.current--;
      return;
    }
    setPlaced({
      position: currentPositionRef.current.clone(),
      quaternion: currentQuaternionRef.current.clone(),
    });
  }, []);

  const session = useXR((state) => state.session);

  // Reset on session end
  useEffect(() => {
    if (!session) {
      setPlaced(null);
      setScale(DEFAULT_SCALE);
      scaleRef.current = DEFAULT_SCALE;
      setRotationY(0);
      rotationYRef.current = 0;
      wasTrackingRef.current = false;
      autoPlacedRef.current = false;
    }
  }, [session]);

  useEffect(() => {
    if (!session) return;
    session.addEventListener("select", handleSelect);
    return () => session.removeEventListener("select", handleSelect);
  }, [session, handleSelect]);

  // Touch gestures: one-finger drag + two-finger pinch/rotate
  useEffect(() => {
    if (!session) return;

    const raycastToGround = (touchX: number, touchY: number, modelY: number) => {
      touchNDC.set(
        (touchX / window.innerWidth) * 2 - 1,
        -(touchY / window.innerHeight) * 2 + 1
      );
      raycaster.setFromCamera(touchNDC, camera);
      groundPlane.set(groundNormal, -modelY);
      return raycaster.ray.intersectPlane(groundPlane, intersectionPoint);
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1 && placed && modelRef.current) {
        dragRef.current = {
          active: false,
          startTime: performance.now(),
          startX: e.touches[0].clientX,
          startY: e.touches[0].clientY,
          modelY: modelRef.current.position.y,
        };
      }
      if (e.touches.length === 2) {
        // Cancel drag, start pinch/rotate
        dragRef.current = null;
        gestureRef.current = {
          initialDistance: getDistance(e.touches),
          initialScale: scaleRef.current,
          initialAngle: getAngle(e.touches),
          initialRotationY: rotationYRef.current,
          mode: "undecided",
        };
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      // One-finger drag
      if (e.touches.length === 1 && dragRef.current && modelRef.current) {
        const dx = e.touches[0].clientX - dragRef.current.startX;
        const dy = e.touches[0].clientY - dragRef.current.startY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (!dragRef.current.active && dist > TAP_DISTANCE_PX) {
          dragRef.current.active = true;
        }

        if (dragRef.current.active) {
          const hit = raycastToGround(
            e.touches[0].clientX,
            e.touches[0].clientY,
            dragRef.current.modelY
          );
          if (hit) {
            modelRef.current.position.x = intersectionPoint.x;
            modelRef.current.position.z = intersectionPoint.z;
          }
        }
      }

      // Two-finger: scale OR rotate (locked after threshold)
      if (e.touches.length === 2 && gestureRef.current) {
        const currentDistance = getDistance(e.touches);
        const currentAngle = getAngle(e.touches);
        const distanceDelta = Math.abs(currentDistance - gestureRef.current.initialDistance);
        const angleDelta = Math.abs(currentAngle - gestureRef.current.initialAngle);

        // Decide mode once movement exceeds threshold
        if (gestureRef.current.mode === "undecided") {
          const DISTANCE_THRESHOLD = 10; // px
          const ANGLE_THRESHOLD = 0.1; // radians (~5.7deg)
          if (distanceDelta > DISTANCE_THRESHOLD || angleDelta > ANGLE_THRESHOLD) {
            gestureRef.current.mode = distanceDelta > angleDelta * 100 ? "scale" : "rotate";
          }
        }

        if (gestureRef.current.mode === "scale") {
          const ratio = currentDistance / gestureRef.current.initialDistance;
          const newScale = Math.min(
            MAX_SCALE,
            Math.max(MIN_SCALE, gestureRef.current.initialScale * ratio)
          );
          scaleRef.current = newScale;
          setScale(newScale);
        }

        if (gestureRef.current.mode === "rotate") {
          const deltaAngle = currentAngle - gestureRef.current.initialAngle;
          const newRotation = gestureRef.current.initialRotationY - deltaAngle;
          rotationYRef.current = newRotation;
          setRotationY(newRotation);
        }
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      // Commit drag position
      if (dragRef.current?.active && modelRef.current) {
        skipSelectCountRef.current++;
        setPlaced({
          position: modelRef.current.position.clone(),
          quaternion: modelRef.current.quaternion.clone(),
        });
      }
      // Pinch/rotate release: 2 fingers lift = 2 select events to skip
      if (gestureRef.current && e.touches.length === 0) {
        skipSelectCountRef.current += 2;
      }
      // Only reset if no more touches
      if (e.touches.length === 0) {
        dragRef.current = null;
        gestureRef.current = null;
      }
    };

    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchmove", onTouchMove, { passive: true });
    document.addEventListener("touchend", onTouchEnd);

    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
    };
  }, [session, placed, camera]);

  return (
    <>
      <group ref={reticleRef} visible={false}>
        <Reticle />
      </group>
      {placed && (
        <Suspense
          fallback={
            <group position={placed.position} quaternion={placed.quaternion}>
              <LoadingIndicator />
            </group>
          }
        >
          <PlacedModel
            ref={modelRef}
            modelUrl={modelUrl}
            position={placed.position}
            quaternion={placed.quaternion}
            scale={scale}
            rotationY={rotationY}
          />
        </Suspense>
      )}
    </>
  );
}
