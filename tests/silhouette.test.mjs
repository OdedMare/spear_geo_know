import assert from "node:assert/strict";
import { test } from "node:test";
import { load, byId } from "./load.mjs";

const { silhouette } = await load("silhouette.ts");

test("a silhouette fits its box", () => {
  for (const id of ["ISR", "CHL", "RUS", "FJI", "USA", "FRA"]) {
    const { d } = silhouette(byId.get(id).shape);
    const nums = d.match(/-?\d+\.\d+/g).map(Number);
    assert.ok(nums.every((n) => n >= -0.01 && n <= 100.01), id);
  }
});

test("far-flung territories are left out", () => {
  const usa = silhouette(byId.get("USA").shape).d.split("Z").length;
  const all = byId.get("USA").shape.reduce((n, p) => n + p.length, 0);
  assert.ok(usa - 1 < all, "Alaska and Hawaii should be dropped");
});
