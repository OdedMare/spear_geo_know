// Country merch: what can drop, how rare it is, and where the avatar wears it.
// Plain JavaScript with no imports: the server decides every drop with it,
// the browser draws and names the items with it.

export const RARITIES = {
  common: { he: "רגיל", colour: "#8e8e93", order: 0 },
  rare: { he: "נדיר", colour: "#2e5bd7", order: 1 },
  epic: { he: "אפי", colour: "#7a3fe0", order: 2 },
  legendary: { he: "אגדי", colour: "#c99700", order: 3 },
};

/** Where on the avatar an item goes; one item per slot. */
export const SLOTS = {
  head: "ראש",
  neck: "צוואר",
  body: "גוף",
  badge: "סיכה",
  hand: "ביד",
};

/**
 * @typedef {"pin"|"shirt"|"mug"|"cap"|"scarf"|"flag"|"beanie"|"hoodie"|"globe"|"crown"|"trophy"} Kind
 * @typedef {keyof typeof RARITIES} Rarity
 */

/** @type {Record<Kind, { he: string, slot: keyof typeof SLOTS, rarity: Rarity }>} */
export const KINDS = {
  pin: { he: "סיכת דגל", slot: "badge", rarity: "common" },
  shirt: { he: "חולצת אוהדים", slot: "body", rarity: "common" },
  mug: { he: "ספל", slot: "hand", rarity: "common" },
  cap: { he: "כובע מצחייה", slot: "head", rarity: "rare" },
  scarf: { he: "צעיף אוהדים", slot: "neck", rarity: "rare" },
  flag: { he: "דגל מתנופף", slot: "hand", rarity: "rare" },
  beanie: { he: "כובע גרב", slot: "head", rarity: "rare" },
  hoodie: { he: "קפוצ׳ון", slot: "body", rarity: "epic" },
  globe: { he: "גלובוס שולחני", slot: "hand", rarity: "epic" },
  crown: { he: "כתר", slot: "head", rarity: "legendary" },
  trophy: { he: "גביע", slot: "hand", rarity: "legendary" },
};

/** Why an item dropped, in the words the app shows. */
export const REASONS = {
  score: "תוצאה גבוהה",
  daily: "אלוף/ת היום",
  weekly: "אלוף/ת השבוע",
  gift: "מתנה מהצוות",
};

/**
 * @typedef {{
 *   id: string, owner: string, kind: Kind, rarity: Rarity,
 *   country: string, iso2: string, countryHe: string, colors: string[],
 *   reason: keyof typeof REASONS, game: string | null, day: string, at: string,
 *   physical: boolean, delivered: boolean, seen: boolean
 * }} Item
 */

/**
 * The chance that a daily result drops an item: "sometimes", and more often
 * the better the result.
 * @param {number} points
 */
export function dropChance(points) {
  if (points >= 100) return 0.35;
  if (points >= 90) return 0.25;
  if (points >= 75) return 0.15;
  return 0;
}

/**
 * @param {() => number} random
 * @param {keyof typeof REASONS} reason
 * @returns {Rarity}
 */
export function rollRarity(random, reason) {
  const r = random();
  if (reason === "weekly") return "legendary";
  if (reason === "daily") return r < 0.6 ? "rare" : "epic";
  if (reason === "gift") return "rare";
  return r < 0.7 ? "common" : r < 0.97 ? "rare" : "epic";
}

/**
 * @param {() => number} random
 * @param {Rarity} rarity
 * @returns {Kind}
 */
export function pickKind(random, rarity) {
  const kinds = /** @type {Kind[]} */ (Object.keys(KINDS)).filter((k) => KINDS[k].rarity === rarity);
  return kinds[Math.floor(random() * kinds.length)];
}

/**
 * @param {{ id: string, owner: string, kind: Kind, reason: keyof typeof REASONS,
 *   country: { id: string, iso2: string, he: string, colors: string[] },
 *   game?: string | null, day: string, at?: string }} spec
 * @returns {Item}
 */
export function makeItem(spec) {
  const rarity = KINDS[spec.kind].rarity;
  return {
    id: spec.id,
    owner: spec.owner,
    kind: spec.kind,
    rarity,
    country: spec.country.id,
    iso2: spec.country.iso2.toLowerCase(),
    countryHe: spec.country.he,
    colors: spec.country.colors.slice(0, 3),
    reason: spec.reason,
    game: spec.game ?? null,
    day: spec.day,
    at: spec.at ?? new Date().toISOString(),
    // A legendary item is the weekly champion's: the team hands over a real one.
    physical: rarity === "legendary",
    delivered: false,
    seen: false,
  };
}

/** @param {Pick<Item, "kind" | "countryHe">} item */
export function itemName(item) {
  return `${KINDS[item.kind].he} ${item.countryHe}`;
}

/**
 * Keeps an equipped map honest: only known slots, only items the player owns,
 * each in the slot its kind belongs to.
 * @param {unknown} input
 * @param {Item[]} owned
 * @returns {Partial<Record<keyof typeof SLOTS, string>>}
 */
export function sanitizeEquipped(input, owned) {
  const src = input && typeof input === "object" ? /** @type {Record<string, unknown>} */ (input) : {};
  /** @type {Partial<Record<keyof typeof SLOTS, string>>} */
  const out = {};
  for (const slot of /** @type {(keyof typeof SLOTS)[]} */ (Object.keys(SLOTS))) {
    const id = src[slot];
    const item = typeof id === "string" ? owned.find((i) => i.id === id) : undefined;
    if (item && KINDS[item.kind].slot === slot) out[slot] = item.id;
  }
  return out;
}
