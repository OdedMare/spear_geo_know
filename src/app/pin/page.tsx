import type { Metadata } from "next";
import GamePage from "@/components/GamePage";
import { GAMES } from "@/lib/games";

export const metadata: Metadata = { title: `${GAMES.pin.title} — גלובוס`, description: GAMES.pin.tagline };

export default function PinPage() {
  return <GamePage game="pin" />;
}
