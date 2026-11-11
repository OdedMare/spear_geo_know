import type { Metadata } from "next";
import GamePage from "@/components/GamePage";
import { GAMES } from "@/lib/games";

export const metadata: Metadata = { title: `${GAMES.population.title} — גלובוס`, description: GAMES.population.tagline };

export default function PopulationPage() {
  return <GamePage game="population" />;
}
