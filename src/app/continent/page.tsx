import type { Metadata } from "next";
import GamePage from "@/components/GamePage";
import { GAMES } from "@/lib/games";

export const metadata: Metadata = { title: `${GAMES.continent.title} — גלובוס`, description: GAMES.continent.tagline };

export default function ContinentPage() {
  return <GamePage game="continent" />;
}
