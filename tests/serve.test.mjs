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
const port = 4100 + Math.floor(Math.random() * 800);
const server = spawn(process.execPath, [path.join(root, "serve.mjs"), site, String(port)], {
  env: { ...process.env, GEO_DATA_DIR: data },
  stdio: "ignore",
});
after(() => server.kill());

const base = `http://127.0.0.1:${port}`;
for (let i = 0; i < 50; i++) {
  try {
    await fetch(`${base}/api/health`);
    break;
  } catch {
    await new Promise((r) => setTimeout(r, 100));
  }
}

const post = (body) =>
  fetch(`${base}/api/scores`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
const entry = { game: "route", day: "2026-11-11", name: "דנה", points: 100, summary: "⭐⭐⭐" };

test("health answers", async () => {
  assert.equal((await fetch(`${base}/api/health`)).status, 200);
});

test("a score is stored once per person, game and day", async () => {
  assert.equal((await post(entry)).status, 201);
  assert.equal((await post({ ...entry, points: 40 })).status, 409);
  assert.equal((await post({ ...entry, name: "  דנה " })).status, 409, "names are trimmed");
  assert.equal((await post({ ...entry, game: "flags" })).status, 201);
  const saved = JSON.parse(fs.readFileSync(path.join(data, "scores.json"), "utf8"));
  assert.equal(saved.length, 2);
});

test("bad scores are refused", async () => {
  assert.equal((await post({ ...entry, game: "nope" })).status, 400);
  assert.equal((await post({ ...entry, points: 101 })).status, 400);
  assert.equal((await post({ ...entry, name: "" })).status, 400);
  assert.equal((await post({ ...entry, day: "11/11/2026" })).status, 400);
  const res = await fetch(`${base}/api/scores`, { method: "POST", body: "{not json" });
  assert.equal(res.status, 400);
});

test("scores are read by date range", async () => {
  await post({ ...entry, day: "2026-11-15", name: "יואב" });
  const week = await (await fetch(`${base}/api/scores?from=2026-11-08&to=2026-11-14`)).json();
  assert.equal(week.length, 2);
  const all = await (await fetch(`${base}/api/scores?from=2026-11-01&to=2026-11-30`)).json();
  assert.equal(all.length, 3);
  assert.equal((await fetch(`${base}/api/scores?from=x`)).status, 400);
});

test("static files are served and paths cannot escape the site", async () => {
  assert.equal((await fetch(`${base}/`)).status, 200);
  const escaped = await fetch(`${base}/..%2f..%2fetc%2fpasswd`);
  assert.notEqual(escaped.status, 200);
});
