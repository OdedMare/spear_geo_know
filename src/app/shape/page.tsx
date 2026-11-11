import type { Metadata } from "next";
import GamePage from "@/components/GamePage";
import { GAMES } from "@/lib/games";

export const metadata: Metadata = { title: `${GAMES.shape.title} — גלובוס`, description: GAMES.shape.tagline };

export default function ShapePage() {
  return <GamePage game="shape" />;
}
