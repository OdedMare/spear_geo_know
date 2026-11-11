// Avatar options, shared by the server (validation) and the browser (editor
// and drawing). Plain JavaScript with no imports: serve.mjs loads it as is.

/** @typedef {{ he: string, id: string }} Option */

export const SKINS = ["#ffe0c2", "#f5c9a0", "#e0a878", "#c68650", "#a0643a", "#7a4a2a", "#5a3520"];

/** @type {Option[]} */
export const HAIR_STYLES = [
  { id: "short", he: "קצר" },
  { id: "side", he: "בצד" },
  { id: "long", he: "ארוך" },
  { id: "curly", he: "מתולתל" },
  { id: "bun", he: "קוקו" },
  { id: "mohawk", he: "מוהוק" },
  { id: "buzz", he: "קצוץ" },
  { id: "bald", he: "קרחת" },
];

export const HAIR_COLORS = ["#2b1b17", "#55372a", "#8a4b2a", "#c27a3a", "#e3c27a", "#e8e4df", "#b8321c", "#3a5bd9", "#d64fa2"];

/** @type {Option[]} */
export const EYES = [
  { id: "dot", he: "רגילות" },
  { id: "happy", he: "שמחות" },
  { id: "wink", he: "קריצה" },
  { id: "round", he: "פקוחות" },
  { id: "sleepy", he: "ישנוניות" },
];

/** @type {Option[]} */
export const MOUTHS = [
  { id: "smile", he: "חיוך" },
  { id: "grin", he: "צחוק" },
  { id: "flat", he: "רציני" },
  { id: "o", he: "מופתע" },
  { id: "tongue", he: "לשון" },
];

/** @type {Option[]} */
export const ACCESSORIES = [
  { id: "none", he: "ללא" },
  { id: "glasses", he: "משקפיים" },
  { id: "sunglasses", he: "משקפי שמש" },
  { id: "headphones", he: "אוזניות" },
  { id: "beard", he: "זקן" },
  { id: "freckles", he: "נמשים" },
];

export const BACKGROUNDS = ["#cfe5ff", "#ffe3cf", "#dff5d3", "#eadcff", "#fff0b3", "#ffd9e3", "#d3f2ef", "#e5e5ea"];

export const SHIRTS = ["#2e5bd7", "#0b7a70", "#c2266f", "#7a3fe0", "#e07b00", "#3a3a3c", "#e9e9ee"];

/**
 * @typedef {{ skin: number, hair: number, hairColor: number, eyes: number, mouth: number,
 *   accessory: number, bg: number, shirt: number, country: string | null }} AvatarConfig
 */

/** @type {AvatarConfig} */
export const DEFAULT_AVATAR = { skin: 1, hair: 0, hairColor: 1, eyes: 0, mouth: 0, accessory: 0, bg: 0, shirt: 0, country: null };

const RANGES = {
  skin: SKINS.length,
  hair: HAIR_STYLES.length,
  hairColor: HAIR_COLORS.length,
  eyes: EYES.length,
  mouth: MOUTHS.length,
  accessory: ACCESSORIES.length,
  bg: BACKGROUNDS.length,
  shirt: SHIRTS.length,
};

/**
 * Whatever arrives (a request body, old storage), an avatar that can be drawn.
 * @param {unknown} input
 * @returns {AvatarConfig}
 */
export function sanitizeAvatar(input) {
  const src = input && typeof input === "object" ? /** @type {Record<string, unknown>} */ (input) : {};
  /** @type {Record<string, unknown>} */
  const out = { ...DEFAULT_AVATAR };
  for (const [key, size] of Object.entries(RANGES)) {
    const n = Number(src[key]);
    if (Number.isInteger(n) && n >= 0 && n < size) out[key] = n;
  }
  // ISO alpha-2, as the flag files are named.
  out.country = typeof src.country === "string" && /^[A-Z]{2}$/.test(src.country) ? src.country : null;
  return /** @type {AvatarConfig} */ (out);
}

/**
 * @param {() => number} [random]
 * @returns {AvatarConfig}
 */
export function randomAvatar(random = Math.random) {
  /** @type {Record<string, unknown>} */
  const out = { country: null };
  for (const [key, size] of Object.entries(RANGES)) out[key] = Math.floor(random() * size);
  return /** @type {AvatarConfig} */ (out);
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
