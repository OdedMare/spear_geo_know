import type { Metadata } from "next";
import GamePage from "@/components/GamePage";
import { GAMES } from "@/lib/games";

export const metadata: Metadata = { title: `${GAMES.bigger.title} — גלובוס`, description: GAMES.bigger.tagline };

export default function BiggerPage() {
  return <GamePage game="bigger" />;
}
