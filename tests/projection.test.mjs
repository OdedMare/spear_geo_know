import assert from "node:assert/strict";
import { test } from "node:test";
import { load, byId } from "./load.mjs";

const p = await load("projection.ts");

test("the view centre projects to the middle of the disc", () => {
  const [x, y, z] = p.projectLonLat({ lon: 35, lat: 31 }, 35, 31);
  assert.ok(Math.abs(x) < 1e-9 && Math.abs(y) < 1e-9 && Math.abs(z - 1) < 1e-9);
});

test("east is to the right and north is up", () => {
  const view = { lon: 0, lat: 0 };
  assert.ok(p.projectLonLat(view, 20, 0)[0] > 0);
  assert.ok(p.projectLonLat(view, 0, 20)[1] > 0);
  assert.ok(p.projectLonLat(view, 180, 0)[2] < 0);
});

test("unproject inverts project", () => {
  const view = { lon: -40, lat: 25 };
  for (const [lon, lat] of [[-40, 25], [-10, 50], [-70, -5], [10, 10]]) {
    const [x, y] = p.projectLonLat(view, lon, lat);
    const [lon2, lat2] = p.unproject(view, x, y);
    assert.ok(Math.abs(lon2 - lon) < 1e-6 && Math.abs(lat2 - lat) < 1e-6, `${lon},${lat} -> ${lon2},${lat2}`);
  }
  assert.equal(p.unproject(view, 0.9, 0.9), null);
});

test("a ring is hidden behind the globe, whole in front, or clipped to the disc", () => {
  const ring = byId.get("BRA").shape[0][0];
  const v = p.ringToVectors(ring);
  assert.equal(p.projectRing(v, p.rotationOf({ lon: 120, lat: 0 }), ring), null);
  assert.equal(p.projectRing(v, p.rotationOf({ lon: -50, lat: -10 }), ring)[0].length, ring.length);
  const clipped = p.projectRing(v, p.rotationOf({ lon: 30, lat: 0 }), ring);
  assert.ok(clipped);
  for (const part of clipped)
    for (let i = 0; i < part.length; i += 2) assert.ok(Math.hypot(part[i], part[i + 1]) <= 1 + 1e-9);
});

test("no clipped ring covers the whole disc, from any side", async () => {
  const { world } = await import("./load.mjs");
  const area = (pts) => {
    let a = 0;
    const n = pts.length / 2;
    for (let i = 0, j = n - 1; i < n; j = i++) a += pts[2 * j] * pts[2 * i + 1] - pts[2 * i] * pts[2 * j + 1];
    return Math.abs(a / 2);
  };
  for (let lon = -180; lon < 180; lon += 30) {
    for (const lat of [-60, -25, 0, 25, 60]) {
      const r = p.rotationOf({ lon, lat });
      for (const c of world) {
        if (!c.shape) continue;
        for (const poly of c.shape) {
          const out = p.projectRing(p.ringToVectors(poly[0]), r, poly[0]);
          // Russia, the largest, is about 1.1 of the disc's 3.14 at most.
          const total = out ? out.reduce((sum, part) => sum + area(part), 0) : 0;
          assert.ok(total < 1.6, `${c.en} from ${lon},${lat}: ${total.toFixed(2)}`);
        }
      }
    }
  }
});

test("a country straddling the horizon keeps the part in front", () => {
  const ring = byId.get("BRA").shape[0][0];
  const v = p.ringToVectors(ring);
  const area = (pts) => {
    let a = 0;
    const n = pts.length / 2;
    for (let i = 0, j = n - 1; i < n; j = i++) a += pts[2 * j] * pts[2 * i + 1] - pts[2 * i] * pts[2 * j + 1];
    return Math.abs(a / 2);
  };
  const whole = area(p.projectRing(v, p.rotationOf({ lon: -50, lat: -10 }), ring)[0]);
  // Seen from 90° east of its middle, Brazil's west half is behind the horizon.
  const half = p.projectRing(v, p.rotationOf({ lon: 40, lat: -10 }), ring).reduce((s, part) => s + area(part), 0);
  assert.ok(half > 0 && half < whole, `${half} vs ${whole}`);
});
