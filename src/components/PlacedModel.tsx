"use client";

import { forwardRef, useEffect, useRef } from "react";
import { useGLTF, useAnimations } from "@react-three/drei";
import { Quaternion as ThreeQuaternion, Vector3, Group } from "three";

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
    const clonedScene = scene.clone();
    const animRef = useRef<Group>(null);
    const { actions } = useAnimations(animations, animRef);

    useEffect(() => {
      if (!actions) return;
      Object.values(actions).forEach((action) => {
        action?.reset().play();
      });
    }, [actions]);

    return (
      <group ref={ref} position={position} quaternion={quaternion}>
        <group ref={animRef}>
          <primitive
            object={clonedScene}
            rotation-y={rotationY}
            scale={scale}
          />
        </group>
      </group>
    );
  }
);
