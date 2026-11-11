import type { Metadata } from "next";
import GamePage from "@/components/GamePage";
import { GAMES } from "@/lib/games";

export const metadata: Metadata = { title: `${GAMES.capitals.title} — גלובוס`, description: GAMES.capitals.tagline };

export default function CapitalsPage() {
  return <GamePage game="capitals" />;
}
