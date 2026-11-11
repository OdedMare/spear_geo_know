import assert from "node:assert/strict";
import { test } from "node:test";
import { sanitizeAvatar, sanitizeNickname, randomAvatar, HAIR_STYLES } from "../shared/avatar.mjs";
import { dropChance, KINDS, makeItem, pickKind, rollRarity, sanitizeEquipped, itemName } from "../shared/merch.mjs";

test("nicknames: trimmed, no markup, 2–20 characters", () => {
  assert.equal(sanitizeNickname("  עודד   מ "), "עודד מ");
  assert.equal(sanitizeNickname("<script>"), "script");
  assert.equal(sanitizeNickname("א"), "");
  assert.equal(sanitizeNickname("x".repeat(40)).length, 20);
});

test("an avatar from anything can be drawn", () => {
  const a = sanitizeAvatar({ skin: "2", hair: -1, country: "il", extra: 1 });
  assert.equal(sanitizeAvatar({ country: "IL" }).country, "IL");
  assert.equal(a.skin, 2);
  assert.equal(a.hair, 0);
  assert.equal(a.country, null);
  assert.ok(!("extra" in a));
  const r = randomAvatar(() => 0.999);
  assert.equal(r.hair, HAIR_STYLES.length - 1);
});

test("drops: none for a weak result, more for a strong one", () => {
  assert.equal(dropChance(50), 0);
  assert.ok(dropChance(100) > dropChance(90) && dropChance(90) > dropChance(75));
  assert.equal(rollRarity(() => 0.5, "weekly"), "legendary");
  assert.equal(rollRarity(() => 0.1, "score"), "common");
  assert.equal(KINDS[pickKind(() => 0, "legendary")].rarity, "legendary");
});

test("an item carries its country and is a real prize when legendary", () => {
  const country = { id: "BRA", iso2: "BR", he: "ברזיל", colors: ["#229e45", "#f8e509", "#2b49a3", "#fff"] };
  const crown = makeItem({ id: "1", owner: "p", kind: "crown", reason: "weekly", country, day: "2026-11-14" });
  assert.equal(crown.physical, true);
  assert.equal(crown.iso2, "br");
  assert.equal(crown.colors.length, 3);
  assert.equal(itemName(crown), "כתר ברזיל");
  const pin = makeItem({ id: "2", owner: "p", kind: "pin", reason: "score", country, day: "2026-11-14" });
  assert.equal(pin.physical, false);
  assert.deepEqual(sanitizeEquipped({ badge: "2", head: "2", hand: "9" }, [crown, pin]), { badge: "2" });
});

test("avatars v2: every part in range, and v1 avatars are migrated", async () => {
  const { RANGES, AVATAR_VERSION, clampFrame, HAIR_STYLES, FACIAL_HAIR, GLASSES, HEADWEAR, TOPS } = await import("../shared/avatar.mjs");
  for (let i = 0; i < 200; i++) {
    const a = randomAvatar(Math.random);
    for (const [k, n] of Object.entries(RANGES)) assert.ok(a[k] >= 0 && a[k] < n, `${k}=${a[k]}`);
    if (a.body === 1) assert.equal(a.facial, 0, "a random woman has no beard");
    if (a.body === 0) assert.notEqual(TOPS[a.top].id, "dress");
  }
  // v1: { skin, hair, hairColor, eyes, mouth, accessory, bg, shirt, country }
  const old = sanitizeAvatar({ skin: 3, hair: 2, hairColor: 4, eyes: 1, mouth: 1, accessory: 4, bg: 5, shirt: 5, country: "IL" });
  assert.equal(old.v, AVATAR_VERSION);
  assert.equal(HAIR_STYLES[old.hair].id, "long");
  assert.equal(FACIAL_HAIR[old.facial].id, "full", "the v1 beard accessory becomes a beard");
  assert.equal(old.country, "IL");
  assert.equal(GLASSES[sanitizeAvatar({ accessory: 2 }).glasses].id, "sun");
  assert.equal(HEADWEAR[sanitizeAvatar({ accessory: 3 }).headwear].id, "headphones");
  // A frame is earned.
  assert.equal(clampFrame({ ...old, frame: 3 }, -1).frame, 0);
  assert.equal(clampFrame({ ...old, frame: 3 }, 2).frame, 2);
  assert.equal(clampFrame({ ...old, frame: 1 }, 3).frame, 1);
});
