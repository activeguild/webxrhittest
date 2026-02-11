"use client";

import { forwardRef } from "react";
import { useGLTF } from "@react-three/drei";
import { Quaternion as ThreeQuaternion, Vector3, Group } from "three";

interface PlacedModelProps {
  position: Vector3;
  quaternion: ThreeQuaternion;
  scale: number;
  rotationY: number;
}

export const PlacedModel = forwardRef<Group, PlacedModelProps>(
  function PlacedModel({ position, quaternion, scale, rotationY }, ref) {
    const { scene } = useGLTF("/models/duck.glb");
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

useGLTF.preload("/models/duck.glb");
