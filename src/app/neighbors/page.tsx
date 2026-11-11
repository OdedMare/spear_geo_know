import type { Metadata } from "next";
import GamePage from "@/components/GamePage";
import { GAMES } from "@/lib/games";

export const metadata: Metadata = { title: `${GAMES.neighbors.title} — גלובוס`, description: GAMES.neighbors.tagline };

export default function NeighborsPage() {
  return <GamePage game="neighbors" />;
}
