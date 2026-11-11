// Deterministic daily puzzles: everyone on the team who opens a game on the
// same Israeli calendar day gets the same puzzle. Self-contained.

export const TIME_ZONE = "Asia/Jerusalem";

/** "YYYY-MM-DD" for the given instant, in Israel time. */
export function dayKey(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

const EPOCH = Date.UTC(2026, 0, 1);
/** Puzzle number shown to players: #1 was 1 January 2026. */
export function dayNumber(key: string): number {
  const [y, m, d] = key.split("-").map(Number);
  return Math.round((Date.UTC(y, m - 1, d) - EPOCH) / 86400000) + 1;
}

export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** mulberry32: small, fast, good enough for picking puzzles. */
export function rng(seed: number | string): () => number {
  let a = typeof seed === "string" ? hashString(seed) : seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pick<T>(random: () => number, items: readonly T[]): T {
  return items[Math.floor(random() * items.length)];
}

export function shuffle<T>(random: () => number, items: readonly T[]): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** A fresh seed for practice rounds. */
export function practiceSeed(): string {
  return `practice:${Date.now()}:${Math.random()}`;
}

/** The day `n` days after `key` (negative for before). */
export function addDays(key: string, n: number): string {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

/** The Sunday that starts the week holding `key` (the Israeli week). */
export function weekStart(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  return addDays(key, -new Date(Date.UTC(y, m - 1, d)).getUTCDay());
}
