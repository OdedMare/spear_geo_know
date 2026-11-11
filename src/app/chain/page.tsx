import type { Metadata } from "next";
import GamePage from "@/components/GamePage";
import { GAMES } from "@/lib/games";

export const metadata: Metadata = { title: `${GAMES.chain.title} — גלובוס`, description: GAMES.chain.tagline };

export default function ChainPage() {
  return <GamePage game="chain" />;
}
