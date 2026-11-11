// Points (0–100) for each game, in one place so the team table is fair.
// Self-contained (tests load it).

/** Route: the contest is the fewest countries. Every guess counts, wrong ones too. */
export function routeScore(minimum: number, used: number, hints: number, won: boolean) {
  if (!won) return { points: 0, stars: 0, perfect: false };
  const perfect = used === minimum && hints === 0;
  const stars = perfect ? 3 : used <= minimum + 1 && hints === 0 ? 2 : 1;
  const points = Math.max(5, Math.min(100, Math.round((100 * minimum) / Math.max(used, minimum)) - 10 * hints));
  return { points, stars, perfect };
}

export const starsText = (n: number) => "⭐".repeat(n) + "☆".repeat(3 - n);

/** Hot/cold: unlimited guesses, fewer is better. */
export function hotColdScore(guesses: number, won: boolean) {
  return won ? Math.max(10, 100 - (guesses - 1) * 6) : 0;
}

/** Shape: six guesses. */
export function shapeScore(guesses: number, won: boolean) {
  return won ? [100, 80, 60, 45, 30, 20][guesses - 1] ?? 10 : 0;
}

/** Pin: 100 inside the country, nothing from 2,500 km out. */
export function pinScore(km: number) {
  return Math.max(0, Math.round(100 * (1 - km / 2500)));
}

/** Chain: 20 a round, 5 off for each wrong try, nothing for a missed round. */
export function chainRoundScore(wrong: number, solved: boolean) {
  return solved ? Math.max(5, 20 - 5 * wrong) : 0;
}
