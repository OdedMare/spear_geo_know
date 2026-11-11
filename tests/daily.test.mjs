import assert from "node:assert/strict";
import { test } from "node:test";
import { load } from "./load.mjs";

const daily = await load("daily.ts");

test("the day turns at midnight Israel time, not UTC", () => {
  // 22:30 UTC on 10 Nov is 00:30 on 11 Nov in Israel (UTC+2 in winter).
  assert.equal(daily.dayKey(new Date("2026-11-10T22:30:00Z")), "2026-11-11");
  assert.equal(daily.dayKey(new Date("2026-11-10T21:30:00Z")), "2026-11-10");
});

test("puzzle numbers count from 1 January 2026", () => {
  assert.equal(daily.dayNumber("2026-01-01"), 1);
  assert.equal(daily.dayNumber("2026-11-11"), 315);
});

test("the same seed gives the whole team the same puzzle", () => {
  const items = Array.from({ length: 200 }, (_, i) => i);
  assert.equal(daily.pick(daily.rng("route:2026-11-11"), items), daily.pick(daily.rng("route:2026-11-11"), items));
  assert.notDeepEqual(daily.shuffle(daily.rng("a"), items), daily.shuffle(daily.rng("b"), items));
});

test("weeks start on Sunday", () => {
  assert.equal(daily.weekStart("2026-11-11"), "2026-11-08"); // a Wednesday
  assert.equal(daily.weekStart("2026-11-08"), "2026-11-08");
  assert.equal(daily.addDays("2026-11-08", 6), "2026-11-14");
});
