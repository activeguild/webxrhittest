"use client";

import { useRef } from "react";
import { RingGeometry, MeshBasicMaterial, DoubleSide } from "three";

export function Reticle() {
  const ringRef = useRef(null);

  return (
    <mesh ref={ringRef} rotation-x={-Math.PI / 2}>
      <ringGeometry args={[0.04, 0.06, 32]} />
      <meshBasicMaterial color="white" opacity={0.8} transparent side={DoubleSide} />
    </mesh>
  );
}
