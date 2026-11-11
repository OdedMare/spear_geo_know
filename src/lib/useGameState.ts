"use client";

import { useEffect, useState } from "react";
import { loadDaily, saveDaily, type GameId } from "./storage";

/** Game state that survives a refresh for the daily puzzle; practice rounds start clean. */
export function useGameState<T extends object>(game: GameId, day: string, daily: boolean, initial: T) {
  const [state, setState] = useState<T>(() => (daily ? { ...initial, ...(loadDaily<T>(game, day) ?? {}) } : initial));
  useEffect(() => {
    if (daily) saveDaily(game, day, state);
  }, [game, day, daily, state]);
  return [state, setState] as const;
}

export const formatKm = (km: number) => `${new Intl.NumberFormat("he-IL").format(km)} ק״מ`;
