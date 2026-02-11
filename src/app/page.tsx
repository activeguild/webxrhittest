"use client";

import dynamic from "next/dynamic";

const ARScene = dynamic(
  () => import("@/components/ARScene").then((mod) => mod.ARScene),
  { ssr: false }
);

export default function Home() {
  return <ARScene />;
}
