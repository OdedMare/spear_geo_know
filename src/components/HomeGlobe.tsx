"use client";

import { useMemo } from "react";
import { useWorld } from "@/lib/world";
import Globe from "./Globe";

/** The home page's globe: spins on its own, names any country tapped. */
export default function HomeGlobe() {
  const { world } = useWorld();
  const fills = useMemo(() => ({}), []);
  return (
    <div className="home-globe">
      {world ? (
        <Globe world={world} fills={fills} spin nameable={() => true} label="גלובוס מסתובב. הקישו על מדינה כדי לראות את שמה." />
      ) : (
        <div className="home-globe-placeholder" aria-hidden />
      )}
    </div>
  );
}
