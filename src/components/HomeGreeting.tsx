"use client";

import Link from "next/link";
import { usePlayer, wornItems } from "@/lib/player";
import Avatar from "./Avatar";

/** "Hello, <nickname>" with the avatar, linking to the closet. */
export default function HomeGreeting() {
  const player = usePlayer();
  if (!player) return null;
  const fresh = player.items.filter((i) => !i.seen).length;
  return (
    <Link href="/profile" className="home-greeting">
      <Avatar avatar={player.avatar} equipped={wornItems(player)} size={56} />
      <span>
        <strong>שלום, {player.nickname}!</strong>
        <span className="muted small">
          {player.items.length ? `${player.items.length} פריטים בארון${fresh ? ` · ${fresh} חדשים` : ""}` : "עצבו את האווטאר ואספו מרצ׳נדייס"}
        </span>
      </span>
    </Link>
  );
}
