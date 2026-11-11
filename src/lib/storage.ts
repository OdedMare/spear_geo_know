"use client";

// Per-browser progress: today's game state (so a refresh keeps it) and each
// game's running stats. Every access is guarded: private windows and blocked
// storage simply start fresh.

export type GameId =
  | "hotcold"
  | "route"
  | "flags"
  | "shape"
  | "pin"
  | "neighbors"
  | "bigger"
  | "population"
  | "continent"
  | "chain"
  | "flagrush"
  | "capitals";

/** What a finished game reports: points (0–100) rank the team table. */
export interface GameResult {
  won: boolean;
  points: number;
  /** A few words for the team table, e.g. "7 ניחושים". */
  summary: string;
  /** Achievements this game unlocked, read by lib/badges.ts. */
  tags?: string[];
  /** The puzzle's country (ISO alpha-3), when it has one: merch it drops comes from there. */
  country?: string;
}

export interface Stats {
  played: number;
  won: number;
  streak: number;
  best: number;
  lastDay: string | null;
}

const EMPTY: Stats = { played: 0, won: 0, streak: 0, best: 0, lastDay: null };

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable — progress just isn't kept */
  }
}

export const loadDaily = <T,>(game: GameId, day: string) => read<T>(`geo.${game}.${day}`);
export const saveDaily = (game: GameId, day: string, state: unknown) => write(`geo.${game}.${day}`, state);

export const loadStats = (game: GameId): Stats => read<Stats>(`geo.${game}.stats`) ?? EMPTY;

function previousDay(day: string): string {
  const [y, m, d] = day.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d - 1));
  return t.toISOString().slice(0, 10);
}

/** Records a finished daily game once. Returns the updated stats. */
export function recordDaily(game: GameId, day: string, won: boolean): Stats {
  const s = loadStats(game);
  if (s.lastDay === day) return s;
  const streak = won ? (s.lastDay === previousDay(day) ? s.streak + 1 : 1) : 0;
  const next: Stats = {
    played: s.played + 1,
    won: s.won + (won ? 1 : 0),
    streak,
    best: Math.max(s.best, streak),
    lastDay: day,
  };
  write(`geo.${game}.stats`, next);
  return next;
}

export interface DailyStatus {
  done: boolean;
  won: boolean;
}

export function dailyStatus(game: GameId, day: string): DailyStatus | null {
  const s = read<{ done?: boolean; won?: boolean }>(`geo.${game}.${day}`);
  return s ? { done: Boolean(s.done), won: Boolean(s.won) } : null;
}

export const saveResult = (game: GameId, day: string, result: GameResult) => write(`geo.${game}.${day}.result`, result);
export const loadResult = (game: GameId, day: string) => read<GameResult>(`geo.${game}.${day}.result`);

export const loadJSON = read;
export const saveJSON = write;
