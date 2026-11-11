import assert from "node:assert/strict";
import { test } from "node:test";
import { load, world, byId } from "./load.mjs";

const geo = await load("geo.ts");
const neighbours = (id) => byId.get(id)?.borders ?? [];

test("haversine: Tel Aviv to London is about 3,580 km", () => {
  const km = geo.haversineKm([34.78, 32.08], [-0.13, 51.51]);
  assert.ok(Math.abs(km - 3580) < 40, String(km));
});

test("bearing: due north, east, south and west", () => {
  assert.equal(Math.round(geo.bearingDeg([0, 0], [0, 10])), 0);
  assert.equal(Math.round(geo.bearingDeg([0, 0], [10, 0])), 90);
  assert.equal(Math.round(geo.bearingDeg([0, 10], [0, 0])), 180);
  assert.equal(Math.round(geo.bearingDeg([10, 0], [0, 0])), 270);
  assert.equal(geo.compassArrow(44), "↗️");
});

test("border distance: neighbours are 0, near countries are close, far ones far", () => {
  assert.equal(geo.borderDistanceKm(byId.get("ISR"), byId.get("JOR")), 0);
  const cyprus = geo.borderDistanceKm(byId.get("ISR"), byId.get("CYP"));
  assert.ok(cyprus > 150 && cyprus < 350, `Israel–Cyprus ${cyprus}`);
  const nz = geo.borderDistanceKm(byId.get("ISR"), byId.get("NZL"));
  assert.ok(nz > 13000, `Israel–New Zealand ${nz}`);
});

test("point in shape: Tel Aviv is in Israel, Paris in France, not in Spain", () => {
  assert.ok(geo.inShape(34.78, 32.08, byId.get("ISR").shape));
  assert.ok(geo.inShape(2.35, 48.86, byId.get("FRA").shape));
  assert.ok(!geo.inShape(2.35, 48.86, byId.get("ESP").shape));
});

test("land borders are symmetric", () => {
  for (const c of world) for (const b of c.borders) assert.ok(byId.get(b).borders.includes(c.id), `${c.id}-${b}`);
});

test("shortest route: France to Poland goes through Germany", () => {
  assert.deepEqual(geo.shortestPath("FRA", "POL", neighbours), ["FRA", "DEU", "POL"]);
  assert.equal(geo.shortestPath("ISR", "AUS", neighbours), null);
  assert.equal(geo.bfsDistances("ESP", neighbours).get("POL"), 3);
});

test("a route is complete only when the guesses connect it", () => {
  assert.ok(!geo.connectsThrough("ESP", "POL", new Set(["FRA"]), neighbours));
  assert.ok(geo.connectsThrough("ESP", "POL", new Set(["FRA", "DEU"]), neighbours));
  assert.ok(geo.connectsThrough("ESP", "POL", new Set(["FRA", "CHE", "AUT", "CZE"]), neighbours));
});

test("point in shape across the antimeridian: Chukotka is Russia", () => {
  assert.ok(geo.inShape(179.5, 66, byId.get("RUS").shape) || geo.inShape(-179.5, 66, byId.get("RUS").shape));
  assert.ok(geo.inShape(-175, 66.5, byId.get("RUS").shape));
  assert.ok(geo.inShape(100, 60, byId.get("RUS").shape));
  assert.ok(!geo.inShape(-150, 66, byId.get("RUS").shape)); // Alaska
});

test("missing links: what borders both ends", () => {
  assert.deepEqual(geo.linksBetween("FRA", "POL", neighbours), ["DEU"]);
  assert.ok(geo.linksBetween("ESP", "ITA", neighbours).includes("FRA"));
  assert.deepEqual(geo.linksBetween("ESP", "ITA", neighbours, ["FRA"]), []);
});

test("a random chain is a real chain, and a seed repeats it", async () => {
  const daily = await load("daily.ts");
  const starts = ["DEU", "BRA", "KEN", "KAZ"];
  const a = geo.randomChain(starts, 5, neighbours, daily.rng("x"));
  const b = geo.randomChain(starts, 5, neighbours, daily.rng("x"));
  assert.deepEqual(a, b);
  assert.equal(new Set(a).size, 5);
  for (let i = 1; i < a.length; i++) assert.ok(neighbours(a[i - 1]).includes(a[i]), `${a[i - 1]}-${a[i]}`);
});
