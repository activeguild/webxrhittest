"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { Group, DoubleSide } from "three";

export function LoadingIndicator() {
  const ref = useRef<Group>(null);

  useFrame((_, delta) => {
    if (ref.current) {
      ref.current.rotation.y += delta * 3;
    }
  });

  return (
    <group ref={ref}>
      <mesh>
        <torusGeometry args={[0.05, 0.01, 8, 16, Math.PI * 1.5]} />
        <meshBasicMaterial color="white" side={DoubleSide} />
      </mesh>
    </group>
  );
}
