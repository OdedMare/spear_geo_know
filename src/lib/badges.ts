// Achievements, kept per browser. Self-contained (tests load it): the caller
// passes everything a badge looks at.

export interface BadgeContext {
  game: string;
  daily: boolean;
  won: boolean;
  points: number;
  tags: string[];
  /** The best current daily streak across games. */
  bestStreak: number;
  /** Games whose daily puzzle is done today. */
  doneToday: string[];
  /** Games played at least once, in any mode. */
  playedEver: string[];
  allGames: string[];
}

export interface Badge {
  id: string;
  emoji: string;
  title: string;
  hint: string;
  earned: (c: BadgeContext) => boolean;
}

const tag = (game: string | string[], t: string) => (c: BadgeContext) =>
  (Array.isArray(game) ? game : [game]).includes(c.game) && c.tags.includes(t);

export const BADGES: Badge[] = [
  { id: "first", emoji: "🌱", title: "צעד ראשון", hint: "סיימו משחק כלשהו", earned: () => true },
  { id: "win", emoji: "🏆", title: "ניצחון ראשון", hint: "נצחו במשחק כלשהו", earned: (c) => c.won },
  { id: "streak3", emoji: "🔥", title: "שלושה ברצף", hint: "רצף יומי של 3 ימים במשחק אחד", earned: (c) => c.bestStreak >= 3 },
  { id: "streak7", emoji: "☄️", title: "שבוע של אש", hint: "רצף יומי של 7 ימים במשחק אחד", earned: (c) => c.bestStreak >= 7 },
  { id: "hotcold", emoji: "🎯", title: "חוש כיוון", hint: "חם וקר בחמישה ניחושים או פחות", earned: tag("hotcold", "quick") },
  { id: "route", emoji: "🧭", title: "נווט מושלם", hint: "מסלול באורך המינימום, בלי רמזים", earned: tag("route", "perfect") },
  { id: "pin", emoji: "📍", title: "צלף", hint: "קליעה בתוך המדינה בהצבע על המפה", earned: tag("pin", "bullseye") },
  { id: "neighbors", emoji: "🏘️", title: "שכן טוב", hint: "כל השכנים, בלי לפספס אף אחד", earned: tag("neighbors", "all") },
  { id: "chain", emoji: "🔗", title: "חוליה חזקה", hint: "החוליה החסרה בלי טעות אחת", earned: tag("chain", "flawless") },
  { id: "shape", emoji: "👁️", title: "עין חדה", hint: "צללית בניחוש הראשון", earned: tag("shape", "first-try") },
  { id: "flags", emoji: "🚩", title: "מומחה דגלים", hint: "10 מתוך 10 בדגלים", earned: (c) => c.game === "flags" && c.points === 100 },
  { id: "flagrush", emoji: "⚡", title: "ברק", hint: "20 דגלים בריצת דגלים", earned: tag("flagrush", "20") },
  { id: "capitals", emoji: "🏛️", title: "יודע בירות", hint: "10 מתוך 10 בבירות", earned: (c) => c.game === "capitals" && c.points === 100 },
  { id: "measure", emoji: "📏", title: "חוש מידה", hint: "רצף של 10 בגדול או קטן או במי יותר מאוכלסת", earned: tag(["bigger", "population"], "10") },
  { id: "continent", emoji: "🗺️", title: "מכיר את היבשות", hint: "25 ביבשת בדקה", earned: tag("continent", "25") },
  {
    id: "explorer",
    emoji: "🧳",
    title: "מגלה עולמות",
    hint: "שחקו בכל המשחקים לפחות פעם אחת",
    earned: (c) => c.allGames.every((g) => c.playedEver.includes(g)),
  },
  {
    id: "allday",
    emoji: "🌍",
    title: "יום מושלם",
    hint: "כל האתגרים היומיים באותו יום",
    earned: (c) => c.daily && c.allGames.every((g) => c.doneToday.includes(g)),
  },
];

/** Badges this finish earns that are not already held. */
export function newBadges(c: BadgeContext, held: Record<string, string>): Badge[] {
  return BADGES.filter((b) => !held[b.id] && b.earned(c));
}
