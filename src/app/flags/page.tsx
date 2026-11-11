import type { Metadata } from "next";
import GamePage from "@/components/GamePage";
import { GAMES } from "@/lib/games";

export const metadata: Metadata = { title: `${GAMES.flags.title} — גלובוס`, description: GAMES.flags.tagline };

export default function FlagsPage() {
  return <GamePage game="flags" />;
}
