import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { world, byId } from "./load.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const data = JSON.parse(fs.readFileSync(path.join(root, "public/data/world.json"), "utf8"));
const sovereign = world.filter((c) => c.sovereign);

test("every country: the UN members plus the Vatican, Kosovo and Taiwan", () => {
  assert.equal(sovereign.length, 196);
  for (const id of ["VAT", "UNK", "TWN", "TUV", "NRU", "SSD", "ISR", "USA", "CHN", "FJI", "MCO", "SMR", "LIE"]) {
    assert.ok(byId.get(id)?.sovereign, id);
  }
});

test("every country has an outline, a flag, a Hebrew name and capital, population and a centre", () => {
  for (const c of sovereign) {
    assert.ok(c.shape?.length, `${c.en}: outline`);
    assert.ok(c.flag && fs.existsSync(path.join(root, "public/flags", `${c.iso2.toLowerCase()}.svg`)), `${c.en}: flag`);
    assert.ok(/[֐-׿]/.test(c.he), `${c.en}: Hebrew name`);
    assert.ok(c.capital && /[֐-׿]/.test(c.capital), `${c.en}: capital`);
    assert.ok(c.pop > 0, `${c.en}: population`);
    assert.ok(c.center, `${c.en}: centre`);
  }
});

test("Palestine is not in the app, anywhere", () => {
  assert.equal(byId.get("PSE"), undefined);
  assert.ok(!world.some((c) => c.iso2 === "PS" || c.borders.includes("PSE")));
  assert.ok(!fs.existsSync(path.join(root, "public/flags/ps.svg")));
  assert.ok(!JSON.stringify(world).includes("פלסטין"));
  // Its land is still drawn, so the map has no hole.
  assert.ok(data.land.length > 0);
});

test("Israel's land borders", () => {
  assert.deepEqual([...byId.get("ISR").borders].sort(), ["EGY", "JOR", "LBN", "SYR"]);
});

test("ids and names are unique", () => {
  assert.equal(new Set(world.map((c) => c.id)).size, world.length);
  assert.equal(new Set(world.map((c) => c.he)).size, world.length);
});
