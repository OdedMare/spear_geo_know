"use client";

// The team table. It lives on whatever server hosts the site: serve.mjs
// answers /api/scores and keeps them in a JSON file, so it works on a network
// with no internet. Under `next dev` or a plain static server there is no
// API, and the table says so instead of failing.

import { useEffect, useState } from "react";
import type { Item } from "@shared/merch.mjs";
import type { PublicPlayer } from "./player";
import type { GameId, GameResult } from "./storage";

export interface ScoreEntry {
  game: GameId;
  day: string;
  /** The player's id; absent on results sent before players existed. */
  player?: string;
  name: string;
  points: number;
  summary: string;
  at?: string;
}

export type Drop = Item & { ownerName: string };

let available: Promise<boolean> | null = null;
export function teamServer(): Promise<boolean> {
  available ??= fetch("/api/health", { cache: "no-store" })
    .then((r) => r.ok)
    .catch(() => false);
  return available;
}

/** Whether this site has a team server: null while asking. */
export function useTeamServer(): boolean | null {
  const [ok, setOk] = useState<boolean | null>(null);
  useEffect(() => {
    let live = true;
    teamServer().then((v) => live && setOk(v));
    return () => {
      live = false;
    };
  }, []);
  return ok;
}

export type SubmitResult = { status: "saved" | "exists" | "unauthorised" | "error"; drops: Item[] };

export async function submitScore(game: GameId, day: string, token: string, r: GameResult): Promise<SubmitResult> {
  try {
    const res = await fetch("/api/scores", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({ game, day, points: r.points, summary: r.summary, country: r.country }),
    });
    if (res.status === 409) return { status: "exists", drops: [] };
    if (res.status === 401) return { status: "unauthorised", drops: [] };
    if (!res.ok) return { status: "error", drops: [] };
    const body = (await res.json()) as { drops?: Item[] };
    return { status: "saved", drops: body.drops ?? [] };
  } catch {
    return { status: "error", drops: [] };
  }
}

export async function fetchScores(from: string, to: string): Promise<ScoreEntry[]> {
  const res = await fetch(`/api/scores?from=${from}&to=${to}`, { cache: "no-store" });
  if (!res.ok) throw new Error(String(res.status));
  return res.json();
}

export async function fetchPlayers(): Promise<PublicPlayer[]> {
  const res = await fetch("/api/players", { cache: "no-store" });
  if (!res.ok) throw new Error(String(res.status));
  return res.json();
}

export async function fetchDrops(limit = 20): Promise<Drop[]> {
  const res = await fetch(`/api/drops?limit=${limit}`, { cache: "no-store" });
  if (!res.ok) throw new Error(String(res.status));
  return res.json();
}
