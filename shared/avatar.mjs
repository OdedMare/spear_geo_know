// Avatar options, shared by the server (validation) and the browser (editor
// and drawing). Plain JavaScript with no imports: serve.mjs loads it as is.
//
// Version 2: a person rather than a smiley — a man's or a woman's build,
// face shape, eyes with an iris colour, brows, nose, lips, facial hair,
// seventeen hair styles, twelve tops in ten colours and three patterns,
// glasses, earrings, headwear, and a background that can be a flag.
// Version 1 avatars are migrated on read, so nobody loses theirs.

/** @typedef {{ id: string, he: string }} Option */

export const AVATAR_VERSION = 2;

/** @type {Option[]} */
export const BODIES = [
  { id: "m", he: "גבר" },
  { id: "f", he: "אישה" },
];

export const SKINS = ["#ffe3cc", "#f6cfae", "#eab890", "#d69c6e", "#bf8050", "#9c6339", "#7a4a2a", "#5a3420"];

/** @type {Option[]} */
export const FACES = [
  { id: "oval", he: "אליפטי" },
  { id: "round", he: "עגול" },
  { id: "square", he: "מרובע" },
  { id: "heart", he: "לב" },
];

/** @type {Option[]} */
export const EYES = [
  { id: "natural", he: "טבעיות" },
  { id: "wide", he: "פקוחות" },
  { id: "smile", he: "מחייכות" },
  { id: "wink", he: "קריצה" },
  { id: "sleepy", he: "עייפות" },
  { id: "almond", he: "שקדיות" },
];

export const EYE_COLORS = ["#5b3a1e", "#8a5a2b", "#6f7f3a", "#3f7a52", "#3d6fa8", "#7b8794"];
export const EYE_COLOR_NAMES = ["חום כהה", "חום", "דבש", "ירוק", "כחול", "אפור"];

/** @type {Option[]} */
export const BROWS = [
  { id: "natural", he: "טבעיות" },
  { id: "thick", he: "עבות" },
  { id: "arched", he: "מקושתות" },
  { id: "raised", he: "מורמות" },
  { id: "focused", he: "מרוכזות" },
];

/** @type {Option[]} */
export const NOSES = [
  { id: "small", he: "קטן" },
  { id: "button", he: "כפתור" },
  { id: "long", he: "ארוך" },
];

/** @type {Option[]} */
export const MOUTHS = [
  { id: "smile", he: "חיוך" },
  { id: "grin", he: "צחוק" },
  { id: "neutral", he: "רגוע" },
  { id: "smirk", he: "חיוך עקום" },
  { id: "open", he: "מופתע" },
  { id: "tongue", he: "לשון" },
  { id: "laugh", he: "צוחק" },
];

/** @type {Option[]} */
export const LIPS = [
  { id: "natural", he: "טבעי" },
  { id: "pink", he: "ורוד" },
  { id: "red", he: "אדום" },
  { id: "berry", he: "פטל" },
  { id: "nude", he: "ניוד" },
];
export const LIP_COLORS = [null, "#e07a8f", "#c8102e", "#8e2a5a", "#c98e7a"];

/** `long`: hair that falls below a hat. `f`/`m`: what a random avatar of that build may get. */
export const HAIR_STYLES = [
  { id: "short", he: "קצר", long: false, for: "m" },
  { id: "sidepart", he: "שביל בצד", long: false, for: "m" },
  { id: "quiff", he: "בלורית", long: false, for: "m" },
  { id: "buzz", he: "קצוץ", long: false, for: "m" },
  { id: "curlyShort", he: "תלתלים קצרים", long: false, for: "mf" },
  { id: "afro", he: "אפרו", long: false, for: "mf" },
  { id: "bald", he: "קרחת", long: false, for: "m" },
  { id: "manbun", he: "קוקו למעלה", long: false, for: "m" },
  { id: "mohawk", he: "מוהוק", long: false, for: "m" },
  { id: "pixie", he: "פיקסי", long: false, for: "f" },
  { id: "bob", he: "קארה", long: true, for: "f" },
  { id: "long", he: "ארוך חלק", long: true, for: "f" },
  { id: "wavy", he: "ארוך גלי", long: true, for: "f" },
  { id: "ponytail", he: "קוקו", long: true, for: "f" },
  { id: "bun", he: "פקעת", long: false, for: "f" },
  { id: "braids", he: "צמות", long: true, for: "f" },
  { id: "curlyLong", he: "תלתלים ארוכים", long: true, for: "f" },
];

export const HAIR_COLORS = ["#1f1512", "#3b2519", "#5c3a24", "#8a5a33", "#b4783f", "#dcb56a", "#ece0c8", "#9a9a9a", "#a83a1f", "#4a63d6"];
export const HAIR_COLOR_NAMES = ["שחור", "חום כהה", "חום", "ערמוני", "נחושת", "בלונד", "פלטינה", "כסוף", "ג׳ינג׳י", "כחול"];

/** @type {Option[]} */
export const FACIAL_HAIR = [
  { id: "none", he: "ללא" },
  { id: "stubble", he: "זיפים" },
  { id: "mustache", he: "שפם" },
  { id: "goatee", he: "זקנקן" },
  { id: "short", he: "זקן קצר" },
  { id: "full", he: "זקן מלא" },
];

/** @type {Option[]} */
export const TOPS = [
  { id: "tshirt", he: "טי־שירט" },
  { id: "vneck", he: "צווארון וי" },
  { id: "polo", he: "פולו" },
  { id: "shirt", he: "חולצה מכופתרת" },
  { id: "tie", he: "חולצה ועניבה" },
  { id: "blazer", he: "בלייזר" },
  { id: "sweater", he: "סוודר" },
  { id: "hoodie", he: "קפוצ׳ון" },
  { id: "tank", he: "גופייה" },
  { id: "dress", he: "שמלה" },
  { id: "turtleneck", he: "גולף" },
  { id: "uniform", he: "מדים" },
];

export const TOP_COLORS = ["#2e5bd7", "#0b7a70", "#c2266f", "#7a3fe0", "#e07b00", "#d6372b", "#f2c230", "#3a3a3c", "#f4f4f6", "#6b8e23"];
export const TOP_COLOR_NAMES = ["כחול", "טורקיז", "ורוד", "סגול", "כתום", "אדום", "צהוב", "שחור", "לבן", "זית"];

/** @type {Option[]} */
export const PATTERNS = [
  { id: "plain", he: "חלק" },
  { id: "stripes", he: "פסים" },
  { id: "dots", he: "נקודות" },
];

/** @type {Option[]} */
export const GLASSES = [
  { id: "none", he: "ללא" },
  { id: "round", he: "עגולים" },
  { id: "square", he: "מלבניים" },
  { id: "sun", he: "שמש" },
  { id: "aviator", he: "טייסים" },
];

/** @type {Option[]} */
export const EARRINGS = [
  { id: "none", he: "ללא" },
  { id: "studs", he: "צמודים" },
  { id: "hoops", he: "חישוקים" },
];

/** @type {Option[]} */
export const HEADWEAR = [
  { id: "none", he: "ללא" },
  { id: "headband", he: "סרט" },
  { id: "headphones", he: "אוזניות" },
  { id: "kippa", he: "כיפה" },
  { id: "headscarf", he: "מטפחת" },
];

export const BACKGROUNDS = ["#cfe5ff", "#ffe3cf", "#dff5d3", "#eadcff", "#fff0b3", "#ffd9e3", "#d3f2ef", "#e5e5ea", "#2b3a55", "#1f4d3a"];

/** @type {Option[]} */
export const BG_STYLES = [
  { id: "solid", he: "צבע" },
  { id: "gradient", he: "מעבר צבע" },
  { id: "flag", he: "הדגל האהוב" },
];

/** A frame is earned: the rarity of the best merch the player owns. */
/** @type {Option[]} */
export const FRAMES = [
  { id: "none", he: "ללא" },
  { id: "rare", he: "נדירה" },
  { id: "epic", he: "אפית" },
  { id: "legendary", he: "אגדית" },
];

/**
 * @typedef {{
 *   v: number, body: number, skin: number, face: number, eyes: number, eyeColor: number,
 *   brows: number, nose: number, mouth: number, lips: number, hair: number, hairColor: number,
 *   facial: number, freckles: number, top: number, topColor: number, pattern: number,
 *   glasses: number, earrings: number, headwear: number, bg: number, bgStyle: number,
 *   frame: number, country: string | null
 * }} AvatarConfig
 */

/** How many options each numeric part has. */
export const RANGES = {
  body: BODIES.length,
  skin: SKINS.length,
  face: FACES.length,
  eyes: EYES.length,
  eyeColor: EYE_COLORS.length,
  brows: BROWS.length,
  nose: NOSES.length,
  mouth: MOUTHS.length,
  lips: LIPS.length,
  hair: HAIR_STYLES.length,
  hairColor: HAIR_COLORS.length,
  facial: FACIAL_HAIR.length,
  freckles: 2,
  top: TOPS.length,
  topColor: TOP_COLORS.length,
  pattern: PATTERNS.length,
  glasses: GLASSES.length,
  earrings: EARRINGS.length,
  headwear: HEADWEAR.length,
  bg: BACKGROUNDS.length,
  bgStyle: BG_STYLES.length,
  frame: FRAMES.length,
};

/** @type {AvatarConfig} */
export const DEFAULT_AVATAR = {
  v: AVATAR_VERSION,
  body: 0,
  skin: 2,
  face: 0,
  eyes: 0,
  eyeColor: 1,
  brows: 0,
  nose: 0,
  mouth: 0,
  lips: 0,
  hair: 0,
  hairColor: 1,
  facial: 0,
  freckles: 0,
  top: 0,
  topColor: 0,
  pattern: 0,
  glasses: 0,
  earrings: 0,
  headwear: 0,
  bg: 0,
  bgStyle: 0,
  frame: 0,
  country: null,
};

// Version 1 → 2: the same person, as close as the new parts allow.
const V1_HAIR = { 0: 0, 1: 1, 2: 11, 3: 4, 4: 14, 5: 8, 6: 3, 7: 6 }; // short side long curly bun mohawk buzz bald
const V1_EYES = { 0: 0, 1: 2, 2: 3, 3: 1, 4: 4 };
const V1_MOUTH = { 0: 0, 1: 1, 2: 2, 3: 4, 4: 5 };

/** @param {Record<string, unknown>} src */
function migrateV1(src) {
  const n = (k) => (Number.isInteger(Number(src[k])) ? Number(src[k]) : 0);
  const acc = n("accessory"); // none glasses sunglasses headphones beard freckles
  return {
    v: AVATAR_VERSION,
    skin: Math.min(n("skin") + (n("skin") > 0 ? 1 : 0), SKINS.length - 1),
    hair: V1_HAIR[n("hair")] ?? 0,
    hairColor: Math.min(n("hairColor"), HAIR_COLORS.length - 1),
    eyes: V1_EYES[n("eyes")] ?? 0,
    mouth: V1_MOUTH[n("mouth")] ?? 0,
    glasses: acc === 1 ? 1 : acc === 2 ? 3 : 0,
    headwear: acc === 3 ? 2 : 0,
    facial: acc === 4 ? 5 : 0,
    freckles: acc === 5 ? 1 : 0,
    topColor: [0, 1, 2, 3, 4, 7, 8][n("shirt")] ?? 0,
    bg: n("bg"),
    country: src.country,
  };
}

/**
 * Whatever arrives (a request body, old storage), an avatar that can be drawn.
 * @param {unknown} input
 * @returns {AvatarConfig}
 */
export function sanitizeAvatar(input) {
  let src = input && typeof input === "object" ? /** @type {Record<string, unknown>} */ (input) : {};
  if (src.v !== AVATAR_VERSION && ("accessory" in src || "shirt" in src)) src = migrateV1(src);
  /** @type {Record<string, unknown>} */
  const out = { ...DEFAULT_AVATAR };
  for (const [key, size] of Object.entries(RANGES)) {
    const n = Number(src[key]);
    if (Number.isInteger(n) && n >= 0 && n < size) out[key] = n;
  }
  // ISO alpha-2, as the flag files are named.
  out.country = typeof src.country === "string" && /^[A-Z]{2}$/.test(src.country) ? src.country : null;
  out.v = AVATAR_VERSION;
  return /** @type {AvatarConfig} */ (out);
}

/**
 * A frame no better than the best merch owned (0 none … 3 legendary).
 * @param {AvatarConfig} avatar
 * @param {number} bestRarity -1 with no items, else 0 common … 3 legendary
 */
export function clampFrame(avatar, bestRarity) {
  return { ...avatar, frame: Math.min(avatar.frame, Math.max(0, bestRarity)) };
}

const pickIn = (random, n) => Math.floor(random() * n);

/**
 * A random person of the given build (or a random build).
 * @param {() => number} [random]
 * @param {number} [body] 0 man, 1 woman
 * @returns {AvatarConfig}
 */
export function randomAvatar(random = Math.random, body) {
  const b = body ?? pickIn(random, 2);
  const id = BODIES[b].id;
  const hairs = HAIR_STYLES.map((h, i) => [h, i]).filter(([h]) => /** @type {{for: string}} */ (h).for.includes(id));
  const tops = TOPS.map((_, i) => i).filter((i) => (id === "m" ? TOPS[i].id !== "dress" : true));
  return {
    v: AVATAR_VERSION,
    body: b,
    skin: pickIn(random, SKINS.length),
    face: pickIn(random, FACES.length),
    eyes: pickIn(random, EYES.length),
    eyeColor: pickIn(random, EYE_COLORS.length),
    brows: pickIn(random, BROWS.length),
    nose: pickIn(random, NOSES.length),
    mouth: [0, 1, 2, 3, 6][pickIn(random, 5)],
    lips: id === "f" ? pickIn(random, LIPS.length) : 0,
    hair: /** @type {number} */ (hairs[pickIn(random, hairs.length)][1]),
    hairColor: pickIn(random, 8),
    facial: id === "m" && random() < 0.45 ? 1 + pickIn(random, FACIAL_HAIR.length - 1) : 0,
    freckles: random() < 0.2 ? 1 : 0,
    top: tops[pickIn(random, tops.length)],
    topColor: pickIn(random, TOP_COLORS.length),
    pattern: random() < 0.25 ? 1 + pickIn(random, 2) : 0,
    glasses: random() < 0.3 ? 1 + pickIn(random, GLASSES.length - 1) : 0,
    earrings: id === "f" && random() < 0.6 ? 1 + pickIn(random, 2) : 0,
    headwear: random() < 0.12 ? 1 + pickIn(random, 3) : 0,
    bg: pickIn(random, BACKGROUNDS.length),
    bgStyle: random() < 0.5 ? 1 : 0,
    frame: 0,
    country: null,
  };
}

/**
 * A nickname as shown to the team: 2–20 characters, no markup or control characters.
 * Returns "" when what is left is too short.
 * @param {unknown} input
 */
export function sanitizeNickname(input) {
  const s = String(input ?? "")
    .replace(/[\u0000-\u001f\u007f<>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 20);
  return [...s].length >= 2 ? s : "";
}
