import type { Metadata } from "next";
import GamePage from "@/components/GamePage";
import { GAMES } from "@/lib/games";

export const metadata: Metadata = { title: `${GAMES.flagrush.title} — גלובוס`, description: GAMES.flagrush.tagline };

export default function FlagRushPage() {
  return <GamePage game="flagrush" />;
}
