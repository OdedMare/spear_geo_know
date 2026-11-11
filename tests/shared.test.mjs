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
