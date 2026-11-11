import assert from "node:assert/strict";
import { test } from "node:test";
import { load, world } from "./load.mjs";

const names = await load("names.ts");
const first = (q) => names.search(q, world, 3)[0]?.id;

test("Hebrew prefixes, final letters and geresh", () => {
  assert.equal(first("ישר"), "ISR");
  assert.equal(first("צרפת"), "FRA");
  assert.equal(first("צרפ"), "FRA");
  assert.equal(first("צ'כיה"), "CZE");
  assert.equal(first("ארה״ב"), "USA");
  assert.equal(first("ארהב"), "USA");
});

test("English and alternative names", () => {
  assert.equal(first("germany"), "DEU");
  assert.equal(first("holland"), "NLD");
  assert.equal(first("אנגליה"), "GBR");
});

test("an exact answer names one country", () => {
  assert.equal(names.exactMatch("יפן", world)?.id, "JPN");
  assert.equal(names.exactMatch("קונגו", world), null); // two Congos
});
