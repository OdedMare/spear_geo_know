import assert from "node:assert/strict";
import { test } from "node:test";
import { load, world } from "./load.mjs";

const pools = await load("pools.ts");
const scoring = await load("scoring.ts");
const badges = await load("badges.ts");

test("difficulty narrows to the best-known countries", () => {
  const easy = pools.pool(world, { difficulty: "easy", continent: null });
  const normal = pools.pool(world, { difficulty: "normal", continent: null });
  const hard = pools.pool(world, { difficulty: "hard", continent: null });
  assert.ok(easy.length < normal.length && normal.length < hard.length);
  assert.equal(hard.length, world.filter((c) => c.sovereign).length);
  const ids = new Set(easy.map((c) => c.id));
  for (const id of ["CHN", "IND", "USA", "BRA"]) assert.ok(ids.has(id), id);
  assert.ok(!ids.has("TUV"));
});

test("a continent filter keeps only that continent, and falls back when too small", () => {
  const europe = pools.pool(world, { difficulty: "normal", continent: "אירופה" });
  assert.ok(europe.length > 10 && europe.every((c) => c.continent === "אירופה"));
  const tiny = pools.pool(world, { difficulty: "normal", continent: "אוקיאניה" }, (c) => c.borders.length > 0);
  assert.ok(tiny.length >= 8, "Oceania has too few land borders, so the whole world is used");
});

test("pools come back in id order, whatever the input order", () => {
  const a = pools.pool(world, pools.DAILY_OPTIONS).map((c) => c.id);
  const b = pools.pool([...world].reverse(), pools.DAILY_OPTIONS).map((c) => c.id);
  assert.deepEqual(a, b);
});

test("options survive a challenge link", () => {
  const o = { difficulty: "hard", continent: "אפריקה" };
  assert.deepEqual(pools.optionsFromQuery(new URLSearchParams(pools.optionsToQuery(o))), o);
  assert.deepEqual(pools.optionsFromQuery(new URLSearchParams("d=evil&c=Mars")), pools.DAILY_OPTIONS);
});

test("route: the fewest countries wins", () => {
  assert.deepEqual(scoring.routeScore(4, 4, 0, true), { points: 100, stars: 3, perfect: true });
  const one = scoring.routeScore(4, 5, 0, true);
  assert.equal(one.stars, 2);
  assert.equal(one.points, 80);
  const hinted = scoring.routeScore(4, 4, 1, true);
  assert.equal(hinted.perfect, false);
  assert.equal(hinted.points, 90);
  assert.equal(scoring.routeScore(4, 8, 0, false).points, 0);
  assert.ok(scoring.routeScore(2, 6, 3, true).points >= 5);
});

test("other scores stay within 0–100", () => {
  assert.equal(scoring.pinScore(0), 100);
  assert.equal(scoring.pinScore(5000), 0);
  assert.equal(scoring.shapeScore(1, true), 100);
  assert.equal(scoring.shapeScore(6, false), 0);
  assert.equal(scoring.hotColdScore(1, true), 100);
  assert.ok(scoring.hotColdScore(40, true) >= 10);
  assert.equal(scoring.chainRoundScore(0, true) * 5, 100);
});

test("badges are earned once", () => {
  const ctx = {
    game: "route", daily: true, won: true, points: 100, tags: ["perfect"], bestStreak: 1,
    doneToday: ["route"], playedEver: ["route"], allGames: ["route", "flags"],
  };
  const first = badges.newBadges(ctx, {}).map((b) => b.id);
  assert.ok(first.includes("route") && first.includes("first") && first.includes("win"));
  assert.ok(!first.includes("explorer") && !first.includes("allday"));
  const held = Object.fromEntries(first.map((id) => [id, "2026-11-11"]));
  assert.deepEqual(badges.newBadges(ctx, held), []);
});
