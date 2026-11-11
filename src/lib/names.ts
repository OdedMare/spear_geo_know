// Matching what a player types to a country name, in Hebrew or English. Self-contained.

export interface Named {
  id: string;
  he: string;
  en: string;
  alt: string[];
}

const FINALS: Record<string, string> = { ך: "כ", ם: "מ", ן: "נ", ף: "פ", ץ: "צ" };

/** Lower-case, no niqqud, no punctuation, final letters folded, single spaces. */
export function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[֑-ׇ]/g, "") // Hebrew niqqud and cantillation
    .replace(/[̀-ͯ]/g, "") // Latin accents
    .toLowerCase()
    .replace(/[׳״'"`.,()\-־–]/g, " ")
    .replace(/[ךםןףץ]/g, (c) => FINALS[c])
    .replace(/\s+/g, " ")
    .trim();
}

const indexCache = new WeakMap<Named, { he: string; others: string[] }>();
function indexOf(c: Named) {
  let entry = indexCache.get(c);
  if (!entry) {
    entry = { he: normalize(c.he), others: [c.en, ...c.alt].map(normalize) };
    indexCache.set(c, entry);
  }
  return entry;
}

function score(q: string, c: Named): number {
  const { he, others } = indexOf(c);
  if (he === q) return 0;
  if (he.startsWith(q)) return 1;
  if (he.split(" ").some((w) => w.startsWith(q))) return 2;
  if (others.some((o) => o === q)) return 3;
  if (others.some((o) => o.startsWith(q))) return 4;
  if (he.includes(q)) return 5;
  if (q.length >= 3 && others.some((o) => o.includes(q))) return 6;
  return Infinity;
}

export function search<T extends Named>(query: string, items: readonly T[], limit = 8): T[] {
  const q = normalize(query);
  if (!q) return [];
  return items
    .map((c) => [score(q, c), c] as const)
    .filter(([s]) => s < Infinity)
    .sort((a, b) => a[0] - b[0] || a[1].he.localeCompare(b[1].he, "he"))
    .slice(0, limit)
    .map(([, c]) => c);
}

/** The single country a complete answer names, if exactly one does. */
export function exactMatch<T extends Named>(query: string, items: readonly T[]): T | null {
  const q = normalize(query);
  if (!q) return null;
  const hits = items.filter((c) => {
    const { he, others } = indexOf(c);
    return he === q || others.includes(q);
  });
  return hits.length === 1 ? hits[0] : null;
}
