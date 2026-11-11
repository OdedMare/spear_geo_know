// Which countries a puzzle may be drawn from. Self-contained (tests load it).
// Difficulty is by population rank: the most populous countries are the ones
// people know, so "easy" keeps the top third and "hard" keeps every country.

export type Difficulty = "easy" | "normal" | "hard";

export interface Options {
  difficulty: Difficulty;
  /** One continent only, or null for the whole world. */
  continent: string | null;
}

export const DAILY_OPTIONS: Options = { difficulty: "normal", continent: null };

export const CONTINENTS = ["אירופה", "אסיה", "אפריקה", "צפון אמריקה", "דרום אמריקה", "אוקיאניה"];

export const DIFFICULTY_LABEL: Record<Difficulty, string> = { easy: "קל", normal: "רגיל", hard: "קשה" };

interface Poolable {
  id: string;
  sovereign: boolean;
  continent: string;
  pop: number;
}

const SHARE: Record<Difficulty, number> = { easy: 0.35, normal: 0.75, hard: 1 };

/**
 * Sovereign countries matching `keep`, narrowed by continent and difficulty.
 * Never fewer than `min` (difficulty relaxes first), and always in id order,
 * so a seed picks the same country on every machine.
 */
export function pool<T extends Poolable>(all: readonly T[], opts: Options, keep: (c: T) => boolean = () => true, min = 8): T[] {
  const base = all.filter((c) => c.sovereign && keep(c));
  const scoped = opts.continent ? base.filter((c) => c.continent === opts.continent) : base;
  const from = scoped.length >= min ? scoped : base;
  const byPop = [...from].sort((a, b) => b.pop - a.pop || (a.id < b.id ? -1 : 1));
  const n = Math.min(byPop.length, Math.max(min, Math.ceil(byPop.length * SHARE[opts.difficulty])));
  return byPop.slice(0, n).sort((a, b) => (a.id < b.id ? -1 : 1));
}

/** Options to and from a challenge link's query string. */
export function optionsToQuery(o: Options): string {
  const q = new URLSearchParams();
  if (o.difficulty !== "normal") q.set("d", o.difficulty);
  if (o.continent) q.set("c", o.continent);
  return q.toString();
}

export function optionsFromQuery(q: URLSearchParams): Options {
  const d = q.get("d");
  const c = q.get("c");
  return {
    difficulty: d === "easy" || d === "hard" ? d : "normal",
    continent: c && CONTINENTS.includes(c) ? c : null,
  };
}
