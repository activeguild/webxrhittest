"use client";

import { useRef, useState, useEffect, useCallback, Suspense } from "react";
import { Group, Matrix4, Vector3, Quaternion } from "three";
import { useXRHitTest, useXR } from "@react-three/xr";
import { Reticle } from "./Reticle";
import { PlacedModel } from "./PlacedModel";
import { LoadingIndicator } from "./LoadingIndicator";

const matrixHelper = new Matrix4();
const positionHelper = new Vector3();
const quaternionHelper = new Quaternion();
const scaleHelper = new Vector3();

const DEFAULT_SCALE = 0.3;
const MIN_SCALE = 0.05;
const MAX_SCALE = 2;

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

export function HitTest() {
  const reticleRef = useRef<Group>(null);
  const modelRef = useRef<Group>(null);
  const currentPositionRef = useRef(new Vector3());
  const currentQuaternionRef = useRef(new Quaternion());
  const [placed, setPlaced] = useState<{
    position: Vector3;
    quaternion: Quaternion;
  } | null>(null);
  const isHittingRef = useRef(false);
  const isDraggingRef = useRef(false);

  const [scale, setScale] = useState(DEFAULT_SCALE);
  const scaleRef = useRef(DEFAULT_SCALE);
  const [rotationY, setRotationY] = useState(0);
  const rotationYRef = useRef(0);
  const gestureRef = useRef<{
    initialDistance: number;
    initialScale: number;
    initialAngle: number;
    initialRotationY: number;
  } | null>(null);

  useXRHitTest(
    (results, getWorldMatrix) => {
      if (results.length > 0 && reticleRef.current) {
        getWorldMatrix(matrixHelper, results[0]);
        matrixHelper.decompose(positionHelper, quaternionHelper, scaleHelper);

        reticleRef.current.position.copy(positionHelper);
        reticleRef.current.quaternion.copy(quaternionHelper);
        reticleRef.current.visible = true;

        currentPositionRef.current.copy(positionHelper);
        currentQuaternionRef.current.copy(quaternionHelper);
        isHittingRef.current = true;

        // Drag: update model position every frame while dragging
        if (isDraggingRef.current && modelRef.current) {
          modelRef.current.position.copy(positionHelper);
          modelRef.current.quaternion.copy(quaternionHelper);
        }
      } else if (reticleRef.current) {
        reticleRef.current.visible = false;
        isHittingRef.current = false;
      }
    },
    "viewer",
    "plane"
  );

  const handleSelectStart = useCallback(() => {
    isDraggingRef.current = true;
  }, []);

  const handleSelectEnd = useCallback(() => {
    if (isDraggingRef.current && isHittingRef.current) {
      // Commit final position
      setPlaced({
        position: currentPositionRef.current.clone(),
        quaternion: currentQuaternionRef.current.clone(),
      });
    }
    isDraggingRef.current = false;
  }, []);

  // First tap when no model exists
  const handleSelect = useCallback(() => {
    if (!isHittingRef.current) return;
    setPlaced({
      position: currentPositionRef.current.clone(),
      quaternion: currentQuaternionRef.current.clone(),
    });
  }, []);

  const session = useXR((state) => state.session);

  useEffect(() => {
    if (!session) return;
    session.addEventListener("selectstart", handleSelectStart);
    session.addEventListener("selectend", handleSelectEnd);
    session.addEventListener("select", handleSelect);
    return () => {
      session.removeEventListener("selectstart", handleSelectStart);
      session.removeEventListener("selectend", handleSelectEnd);
      session.removeEventListener("select", handleSelect);
    };
  }, [session, handleSelectStart, handleSelectEnd, handleSelect]);

  // Two-finger gestures: pinch-to-zoom + twist-to-rotate
  useEffect(() => {
    if (!session) return;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        gestureRef.current = {
          initialDistance: getDistance(e.touches),
          initialScale: scaleRef.current,
          initialAngle: getAngle(e.touches),
          initialRotationY: rotationYRef.current,
        };
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && gestureRef.current) {
        // Scale
        const currentDistance = getDistance(e.touches);
        const ratio = currentDistance / gestureRef.current.initialDistance;
        const newScale = Math.min(
          MAX_SCALE,
          Math.max(MIN_SCALE, gestureRef.current.initialScale * ratio)
        );
        scaleRef.current = newScale;
        setScale(newScale);

        // Rotation
        const currentAngle = getAngle(e.touches);
        const deltaAngle = currentAngle - gestureRef.current.initialAngle;
        const newRotation = gestureRef.current.initialRotationY - deltaAngle;
        rotationYRef.current = newRotation;
        setRotationY(newRotation);
      }
    };

    const onTouchEnd = () => {
      gestureRef.current = null;
    };

    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchmove", onTouchMove, { passive: true });
    document.addEventListener("touchend", onTouchEnd);

    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
    };
  }, [session]);

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
