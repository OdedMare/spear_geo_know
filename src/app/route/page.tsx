import type { Metadata } from "next";
import GamePage from "@/components/GamePage";
import { GAMES } from "@/lib/games";

export const metadata: Metadata = { title: `${GAMES.route.title} — גלובוס`, description: GAMES.route.tagline };

export default function RoutePage() {
  return <GamePage game="route" />;
}
