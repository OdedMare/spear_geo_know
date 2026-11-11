import assert from "node:assert/strict";
import { test, after } from "node:test";
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const site = fs.mkdtempSync(path.join(os.tmpdir(), "geo-site-"));
const data = fs.mkdtempSync(path.join(os.tmpdir(), "geo-data-"));
fs.writeFileSync(path.join(site, "index.html"), "<!doctype html><title>t</title>");
fs.mkdirSync(path.join(site, "data"));
fs.copyFileSync(path.join(root, "public/data/world.json"), path.join(site, "data/world.json"));

const running = [];
after(() => running.forEach((s) => s.kill()));

/** Starts serve.mjs on a fresh port with the given "today", on the same data. */
async function server(day, extra = {}) {
  const port = 4100 + Math.floor(Math.random() * 3000);
  const child = spawn(process.execPath, [path.join(root, "serve.mjs"), site, String(port)], {
    env: { ...process.env, GEO_DATA_DIR: data, GEO_TODAY: day, GEO_ADMIN_KEY: "", ...extra },
    stdio: "ignore",
  });
  running.push(child);
  const base = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 60; i++) {
    try {
      await fetch(`${base}/api/health`);
      break;
    } catch {
      await new Promise((r) => setTimeout(r, 100));
    }
  }
  const call = async (method, url, body, token, headers = {}) => {
    const res = await fetch(base + url, {
      method,
      headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}), ...headers },
      body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
    });
    const text = await res.text();
    return { status: res.status, body: text ? JSON.parse(text) : null, text };
  };
  return { base, call, stop: () => child.kill() };
}

const WED = "2026-11-11";
let s = await server(WED);
let dana, yoav;

test("players sign up with a unique nickname and get a token", async () => {
  const a = await s.call("POST", "/api/players", { nickname: "  דנה  ", avatar: { skin: 3, hair: 99, country: "IL" } });
  assert.equal(a.status, 201);
  assert.equal(a.body.player.nickname, "דנה");
  assert.equal(a.body.player.avatar.skin, 3);
  assert.equal(a.body.player.avatar.hair, 0, "an out-of-range part falls back");
  assert.equal(a.body.player.avatar.country, "IL");
  assert.ok(a.body.token.length > 20);
  dana = a.body;
  assert.equal((await s.call("POST", "/api/players", { nickname: "דנה" })).status, 409);
  assert.equal((await s.call("POST", "/api/players", { nickname: "א" })).status, 400);
  assert.equal((await s.call("POST", "/api/players", { nickname: "<b>" })).status, 400);
  yoav = (await s.call("POST", "/api/players", { nickname: "יואב" })).body;
});

test("no token, no secret: tokens never leave the server", async () => {
  const list = await s.call("GET", "/api/players");
  assert.equal(list.body.length, 2);
  assert.ok(!list.text.includes("token"));
  assert.equal((await s.call("GET", "/api/me")).status, 401);
  assert.equal((await s.call("GET", "/api/me", undefined, "nope")).status, 401);
  const me = await s.call("GET", "/api/me", undefined, dana.token);
  assert.equal(me.body.player.id, dana.player.id);
  assert.ok(!me.text.includes("tokenHash"));
});

test("a score needs a player, is one per game and day, and only for today", async () => {
  const score = { game: "route", day: WED, points: 100, summary: "⭐⭐⭐", country: "FRA" };
  assert.equal((await s.call("POST", "/api/scores", score)).status, 401);
  const ok = await s.call("POST", "/api/scores", score, dana.token);
  assert.equal(ok.status, 201);
  assert.equal(ok.body.entry.name, "דנה");
  assert.ok(Array.isArray(ok.body.drops));
  for (const d of ok.body.drops) assert.equal(d.country, "FRA", "a drop comes from the puzzle's country");
  assert.equal((await s.call("POST", "/api/scores", score, dana.token)).status, 409);
  assert.equal((await s.call("POST", "/api/scores", { ...score, day: "2026-11-01" }, dana.token)).status, 400);
  assert.equal((await s.call("POST", "/api/scores", { ...score, points: 101 }, dana.token)).status, 400);
  assert.equal((await s.call("POST", "/api/scores", { ...score, game: "x" }, dana.token)).status, 400);
  assert.equal((await s.call("POST", "/api/scores", "{bad", dana.token)).status, 400);
  assert.equal((await s.call("POST", "/api/scores", { ...score, game: "flags", points: 40 }, yoav.token)).status, 201);
});

test("renaming shows the new name on old scores", async () => {
  assert.equal((await s.call("PUT", "/api/me", { nickname: "יואב" }, dana.token)).status, 409);
  const r = await s.call("PUT", "/api/me", { nickname: "דנה ג" }, dana.token);
  assert.equal(r.status, 200);
  const day = await s.call("GET", `/api/scores?from=${WED}&to=${WED}`);
  assert.ok(day.body.some((e) => e.name === "דנה ג" && e.game === "route"));
});

test("the day's champion gets merch the next day, once", async () => {
  s.stop();
  s = await server("2026-11-12");
  const items = (await s.call("GET", "/api/me", undefined, dana.token)).body.items;
  const daily = items.filter((i) => i.reason === "daily");
  assert.equal(daily.length, 1);
  assert.equal(daily[0].day, WED);
  assert.ok(["rare", "epic"].includes(daily[0].rarity));
  const yoavItems = (await s.call("GET", "/api/me", undefined, yoav.token)).body.items;
  assert.equal(yoavItems.filter((i) => i.reason === "daily").length, 0);
  // A restart does not award it again.
  s.stop();
  s = await server("2026-11-12");
  const again = (await s.call("GET", "/api/me", undefined, dana.token)).body.items;
  assert.equal(again.filter((i) => i.reason === "daily").length, 1);
});

test("the week's champion gets a legendary item, marked as a real prize", async () => {
  s.stop();
  s = await server("2026-11-15"); // Sunday: the week of 8–14 November is over
  const items = (await s.call("GET", "/api/me", undefined, dana.token)).body.items;
  const weekly = items.filter((i) => i.reason === "weekly");
  assert.equal(weekly.length, 1);
  assert.equal(weekly[0].rarity, "legendary");
  assert.equal(weekly[0].physical, true);
  assert.equal(weekly[0].delivered, false);
});

test("a player wears only their own items, each in its slot", async () => {
  const items = (await s.call("GET", "/api/me", undefined, dana.token)).body.items;
  const crownOrTrophy = items.find((i) => i.reason === "weekly");
  const slot = crownOrTrophy.kind === "crown" ? "head" : "hand";
  const wrongSlot = slot === "head" ? "hand" : "head";
  const r = await s.call("PUT", "/api/me", { equipped: { [slot]: crownOrTrophy.id, [wrongSlot]: crownOrTrophy.id, body: "not-mine" } }, dana.token);
  assert.deepEqual(Object.keys(r.body.player.equipped), [slot]);
  const theirs = await s.call("PUT", "/api/me", { equipped: { [slot]: crownOrTrophy.id } }, yoav.token);
  assert.deepEqual(theirs.body.player.equipped, {});
  const list = await s.call("GET", "/api/players");
  assert.equal(list.body.find((p) => p.id === dana.player.id).equipped[slot].kind, crownOrTrophy.kind);
  // Seeing the reveal marks items seen.
  await s.call("POST", "/api/me/seen", {}, dana.token);
  assert.ok((await s.call("GET", "/api/me", undefined, dana.token)).body.items.every((i) => i.seen));
});

test("recent drops are public, with the winner's name", async () => {
  const drops = await s.call("GET", "/api/drops");
  assert.ok(drops.body.length >= 2);
  assert.ok(drops.body.every((d) => d.ownerName && d.kind && d.iso2));
});

test("admin is off without a key, and guarded with one", async () => {
  assert.equal((await s.call("GET", "/api/admin/prizes")).status, 503);
  s.stop();
  s = await server("2026-11-15", { GEO_ADMIN_KEY: "secret-key" });
  assert.equal((await s.call("GET", "/api/admin/prizes", undefined, null, { "x-admin-key": "wrong-key!" })).status, 403);
  const key = { "x-admin-key": "secret-key" };
  const prizes = await s.call("GET", "/api/admin/prizes", undefined, null, key);
  assert.equal(prizes.status, 200);
  const prize = prizes.body.items.find((i) => i.physical);
  assert.ok(prize);
  const done = await s.call("POST", `/api/admin/prizes/${prize.id}/delivered`, {}, null, key);
  assert.equal(done.body.delivered, true);
  const gift = await s.call("POST", "/api/admin/grant", { player: yoav.player.id, kind: "scarf", country: "JPN" }, null, key);
  assert.equal(gift.status, 201);
  assert.equal(gift.body.countryHe, "יפן");
  assert.equal(gift.body.reason, "gift");
  assert.equal((await s.call("POST", "/api/admin/grant", { player: yoav.player.id, kind: "rocket" }, null, key)).status, 400);
});

test("static files are served and paths cannot escape the site", async () => {
  assert.equal((await fetch(`${s.base}/`)).status, 200);
  assert.notEqual((await fetch(`${s.base}/..%2f..%2fetc%2fpasswd`)).status, 200);
});
