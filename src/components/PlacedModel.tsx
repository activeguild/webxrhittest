"use client";

import { forwardRef, useEffect, useRef, useMemo } from "react";
import { useGLTF, useAnimations } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { Quaternion as ThreeQuaternion, Vector3, Group, Object3D, MathUtils } from "three";
import * as SkeletonUtils from "three/examples/jsm/utils/SkeletonUtils.js";

interface PlacedModelProps {
  modelUrl: string;
  position: Vector3;
  quaternion: ThreeQuaternion;
  scale: number;
  rotationY: number;
}

export const PlacedModel = forwardRef<Group, PlacedModelProps>(
  function PlacedModel({ modelUrl, position, quaternion, scale, rotationY }, ref) {
    const { scene, animations } = useGLTF(modelUrl);
    const clonedScene = useMemo(() => SkeletonUtils.clone(scene as unknown as Object3D), [scene]);
    const clonedAnimations = useMemo(
      () => animations.map((clip) => clip.clone()),
      [animations]
    );
    const animRef = useRef<Group>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { actions } = useAnimations(clonedAnimations, animRef as any);

    const currentScaleRef = useRef(0);
    const introDoneRef = useRef(false);
    const primitiveRef = useRef<Object3D>(null);

    useEffect(() => {
      if (!actions) return;
      Object.values(actions).forEach((action) => {
        action?.reset().play();
      });
    }, [actions]);

    // Initial scale-in animation only; after that scale is set directly
    useFrame((_, delta) => {
      if (!primitiveRef.current) return;
      if (!introDoneRef.current) {
        const speed = 5;
        currentScaleRef.current = MathUtils.lerp(
          currentScaleRef.current,
          scale,
          1 - Math.exp(-speed * delta)
        );
        if (scale - currentScaleRef.current < 0.001) {
          currentScaleRef.current = scale;
          introDoneRef.current = true;
        }
        const s = currentScaleRef.current;
        primitiveRef.current.scale.set(s, s, s);
      }
    });

    // After intro, apply scale changes immediately
    useEffect(() => {
      if (introDoneRef.current && primitiveRef.current) {
        currentScaleRef.current = scale;
        primitiveRef.current.scale.set(scale, scale, scale);
      }
    }, [scale]);

    return (
      <group ref={ref} position={position} quaternion={quaternion}>
        <group ref={animRef}>
          <primitive
            ref={primitiveRef}
            object={clonedScene}
            rotation-y={rotationY}
            scale={0}
          />
        </group>
      </group>
    );
  }
);
