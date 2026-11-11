"use client";

// The team table. It lives on whatever server hosts the site: serve.mjs
// answers /api/scores and keeps them in a JSON file, so it works on a network
// with no internet. Under `next dev` or a plain static server there is no
// API, and the table says so instead of failing.

import { useEffect, useState } from "react";
import type { GameId, GameResult } from "./storage";

export interface ScoreEntry {
  game: GameId;
  day: string;
  name: string;
  points: number;
  summary: string;
  at?: string;
}

const NAME_KEY = "geo.name";

export function getName(): string {
  try {
    return localStorage.getItem(NAME_KEY) ?? "";
  } catch {
    return "";
  }
}

export function setName(name: string) {
  try {
    localStorage.setItem(NAME_KEY, name.trim().slice(0, 24));
  } catch {
    /* not remembered */
  }
}

let available: Promise<boolean> | null = null;
export function teamServer(): Promise<boolean> {
  available ??= fetch("/api/health", { cache: "no-store" })
    .then((r) => r.ok)
    .catch(() => false);
  return available;
}

/** Whether this site has a team table: null while asking. */
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

export async function submitScore(game: GameId, day: string, name: string, r: GameResult): Promise<"saved" | "exists" | "error"> {
  try {
    const res = await fetch("/api/scores", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ game, day, name, points: r.points, summary: r.summary }),
    });
    if (res.status === 409) return "exists";
    return res.ok ? "saved" : "error";
  } catch {
    return "error";
  }
}

export async function fetchScores(from: string, to: string): Promise<ScoreEntry[]> {
  const res = await fetch(`/api/scores?from=${from}&to=${to}`, { cache: "no-store" });
  if (!res.ok) throw new Error(String(res.status));
  return res.json();
}
