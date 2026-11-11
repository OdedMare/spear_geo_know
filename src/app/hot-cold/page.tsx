import type { Metadata } from "next";
import GamePage from "@/components/GamePage";
import { GAMES } from "@/lib/games";

export const metadata: Metadata = { title: `${GAMES.hotcold.title} — גלובוס`, description: GAMES.hotcold.tagline };

export default function HotColdPage() {
  return <GamePage game="hotcold" />;
}
