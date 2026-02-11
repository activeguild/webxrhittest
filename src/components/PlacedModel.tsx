"use client";

import { forwardRef } from "react";
import { useGLTF } from "@react-three/drei";
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
    const { scene } = useGLTF(modelUrl);
    const clonedScene = scene.clone();

    return (
      <group ref={ref} position={position} quaternion={quaternion}>
        <primitive
          object={clonedScene}
          rotation-y={rotationY}
          scale={scale}
        />
      </group>
    );
  }
);
