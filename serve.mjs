// The site, the players and the team table, with no dependencies, for
// networks without internet.
//   node serve.mjs [dir=out] [port=3000]
// Data is kept as JSON files in $GEO_DATA_DIR (default ./data):
//   players.json  nicknames, avatars, what each one wears (tokens are stored hashed)
//   scores.json   one daily result per player, game and day
//   items.json    the country merch each player has won
//   state.json    which days and weeks already have their champions
// GEO_ADMIN_KEY turns on the admin API (prizes to hand over, gifts).
// Any static server can serve the site alone; only players, the team table
// and merch need this one.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { sanitizeAvatar, sanitizeNickname } from "./shared/avatar.mjs";
import { dropChance, KINDS, makeItem, pickKind, rollRarity, sanitizeEquipped } from "./shared/merch.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, process.argv[2] ?? "out");
const port = Number(process.argv[3] ?? process.env.PORT ?? 3000);
const dataDir = path.resolve(process.env.GEO_DATA_DIR ?? path.join(here, "data"));
const adminKey = process.env.GEO_ADMIN_KEY ?? "";

const GAMES = new Set([
  "hotcold", "route", "flags", "shape", "pin", "neighbors",
  "bigger", "population", "continent", "chain", "flagrush", "capitals",
]);
const DAY = /^\d{4}-\d{2}-\d{2}$/;

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
};

// ---- Storage: small JSON files, written atomically ----

function load(name, fallback) {
  try {
    return JSON.parse(fs.readFileSync(path.join(dataDir, name), "utf8"));
  } catch {
    return fallback;
  }
}

function save(name, value) {
  fs.mkdirSync(dataDir, { recursive: true });
  const file = path.join(dataDir, name);
  fs.writeFileSync(`${file}.tmp`, JSON.stringify(value));
  fs.renameSync(`${file}.tmp`, file); // a crash never leaves half a file
}

const db = {
  players: load("players.json", []),
  scores: load("scores.json", []),
  items: load("items.json", []),
  state: load("state.json", { days: [], weeks: [] }),
};

// ---- Days, in Israel time ----

function today() {
  if (process.env.GEO_TODAY && DAY.test(process.env.GEO_TODAY)) return process.env.GEO_TODAY;
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

function addDays(day, n) {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

function weekStart(day) {
  const [y, m, d] = day.split("-").map(Number);
  return addDays(day, -new Date(Date.UTC(y, m - 1, d)).getUTCDay());
}

// ---- Countries, for dressing merch ----

let countries = null;
function world() {
  if (!countries) {
    try {
      const all = JSON.parse(fs.readFileSync(path.join(root, "data/world.json"), "utf8")).countries;
      countries = all.filter((c) => c.sovereign && c.flag).map((c) => ({ id: c.id, iso2: c.iso2, he: c.he, colors: c.colors ?? ["#888888"] }));
    } catch {
      countries = [];
    }
    if (!countries.length) countries = [{ id: "ISR", iso2: "IL", he: "ישראל", colors: ["#ffffff", "#0038b8"] }];
  }
  return countries;
}

const random = () => crypto.randomInt(0, 2 ** 32) / 2 ** 32;
const countryFor = (id) => world().find((c) => c.id === id) ?? world()[Math.floor(random() * world().length)];

function award(owner, reason, { game = null, day = today(), country = null, kind = null } = {}) {
  const item = makeItem({
    id: crypto.randomUUID(),
    owner,
    kind: kind ?? pickKind(random, rollRarity(random, reason)),
    reason,
    country: countryFor(country),
    game,
    day,
  });
  db.items.push(item);
  return item;
}

// ---- Players ----

const hash = (token) => crypto.createHash("sha256").update(token).digest("hex");
const byNickname = (nick) => db.players.find((p) => p.nickname.toLocaleLowerCase("he") === nick.toLocaleLowerCase("he"));
const itemsOf = (id) => db.items.filter((i) => i.owner === id);

/** What everyone may see of a player: never the token. */
function publicPlayer(p) {
  const owned = itemsOf(p.id);
  const equipped = {};
  for (const [slot, id] of Object.entries(p.equipped ?? {})) {
    const item = owned.find((i) => i.id === id);
    if (item) equipped[slot] = item;
  }
  return { id: p.id, nickname: p.nickname, avatar: p.avatar, equipped, items: owned.length, since: p.createdAt };
}

function authed(req) {
  const m = /^Bearer\s+(\S+)$/.exec(req.headers.authorization ?? "");
  if (!m) return null;
  const h = hash(m[1]);
  return db.players.find((p) => p.tokenHash === h) ?? null;
}

// ---- Champions: settled lazily, the first request after a day or week ends ----

function totalsFor(entries) {
  const by = new Map();
  for (const e of entries) {
    if (!e.player) continue;
    const t = by.get(e.player) ?? { player: e.player, points: 0, games: 0, last: "" };
    t.points += e.points;
    t.games += 1;
    if (e.at > t.last) t.last = e.at;
    by.set(e.player, t);
  }
  // Most points; then fewer games (more per game); then whoever got there first.
  return [...by.values()].sort((a, b) => b.points - a.points || a.games - b.games || a.last.localeCompare(b.last));
}

export function settle(now = today()) {
  let changed = false;
  const days = [...new Set(db.scores.map((s) => s.day))].filter((d) => d < now && !db.state.days.includes(d)).sort();
  for (const day of days) {
    const [winner] = totalsFor(db.scores.filter((s) => s.day === day));
    if (winner) award(winner.player, "daily", { day });
    db.state.days.push(day);
    changed = true;
  }
  const thisWeek = weekStart(now);
  const weeks = [...new Set(db.scores.map((s) => weekStart(s.day)))].filter((w) => w < thisWeek && !db.state.weeks.includes(w)).sort();
  for (const week of weeks) {
    const end = addDays(week, 6);
    const [winner] = totalsFor(db.scores.filter((s) => s.day >= week && s.day <= end));
    if (winner) award(winner.player, "weekly", { day: end });
    db.state.weeks.push(week);
    changed = true;
  }
  if (changed) {
    save("items.json", db.items);
    save("state.json", db.state);
  }
}

// ---- HTTP helpers ----

function readBody(req, limit = 8192) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (c) => {
      size += c.length;
      if (size > limit) {
        reject(new Error("too large"));
        req.destroy();
      } else chunks.push(c);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

async function jsonBody(req) {
  try {
    const body = JSON.parse((await readBody(req)) || "{}");
    return body && typeof body === "object" ? body : null;
  } catch {
    return null;
  }
}

function json(res, status, value) {
  res.writeHead(status, { "content-type": TYPES[".json"], "cache-control": "no-store" });
  res.end(JSON.stringify(value));
}

// ---- API ----

async function api(req, res, url) {
  const route = `${req.method} ${url.pathname}`;
  if (route === "GET /api/health") return json(res, 200, { ok: true, players: true, admin: Boolean(adminKey) });

  settle();

  // Players
  if (route === "POST /api/players") {
    const body = await jsonBody(req);
    if (!body) return json(res, 400, { error: "bad json" });
    const nickname = sanitizeNickname(body.nickname);
    if (!nickname) return json(res, 400, { error: "nickname must be 2–20 characters" });
    if (byNickname(nickname)) return json(res, 409, { error: "nickname taken" });
    const token = crypto.randomBytes(24).toString("base64url");
    const player = {
      id: crypto.randomUUID(),
      tokenHash: hash(token),
      nickname,
      avatar: sanitizeAvatar(body.avatar),
      equipped: {},
      createdAt: new Date().toISOString(),
    };
    db.players.push(player);
    save("players.json", db.players);
    return json(res, 201, { player: publicPlayer(player), token });
  }
  if (route === "GET /api/players") return json(res, 200, db.players.map(publicPlayer));

  if (url.pathname.startsWith("/api/me")) {
    const me = authed(req);
    if (!me) return json(res, 401, { error: "unknown player" });
    if (route === "GET /api/me") return json(res, 200, { player: publicPlayer(me), items: itemsOf(me.id) });
    if (route === "PUT /api/me") {
      const body = await jsonBody(req);
      if (!body) return json(res, 400, { error: "bad json" });
      if ("nickname" in body) {
        const nickname = sanitizeNickname(body.nickname);
        if (!nickname) return json(res, 400, { error: "nickname must be 2–20 characters" });
        const other = byNickname(nickname);
        if (other && other.id !== me.id) return json(res, 409, { error: "nickname taken" });
        me.nickname = nickname;
      }
      if ("avatar" in body) me.avatar = sanitizeAvatar(body.avatar);
      if ("equipped" in body) me.equipped = sanitizeEquipped(body.equipped, itemsOf(me.id));
      save("players.json", db.players);
      return json(res, 200, { player: publicPlayer(me), items: itemsOf(me.id) });
    }
    if (route === "POST /api/me/seen") {
      for (const i of itemsOf(me.id)) i.seen = true;
      save("items.json", db.items);
      return json(res, 200, { ok: true });
    }
    return json(res, 404, { error: "not found" });
  }

  // Scores
  if (route === "GET /api/scores") {
    const from = url.searchParams.get("from") ?? "";
    const to = url.searchParams.get("to") ?? from;
    if (!DAY.test(from) || !DAY.test(to)) return json(res, 400, { error: "from/to must be YYYY-MM-DD" });
    const names = new Map(db.players.map((p) => [p.id, p.nickname]));
    return json(
      res,
      200,
      db.scores
        .filter((s) => s.day >= from && s.day <= to)
        .map((s) => ({ ...s, name: (s.player && names.get(s.player)) || s.name })),
    );
  }
  if (route === "POST /api/scores") {
    const me = authed(req);
    if (!me) return json(res, 401, { error: "sign in first" });
    const body = await jsonBody(req);
    if (!body) return json(res, 400, { error: "bad json" });
    const game = String(body.game ?? "");
    const day = String(body.day ?? "");
    const points = Number(body.points);
    if (!GAMES.has(game)) return json(res, 400, { error: "unknown game" });
    // Only today's puzzle (or yesterday's, for a game finished across midnight).
    const now = today();
    if (!DAY.test(day) || (day !== now && day !== addDays(now, -1))) return json(res, 400, { error: "bad day" });
    if (!Number.isFinite(points) || points < 0 || points > 100) return json(res, 400, { error: "points out of range" });
    if (db.scores.some((s) => s.player === me.id && s.game === game && s.day === day)) return json(res, 409, { error: "already submitted" });
    const entry = {
      game,
      day,
      player: me.id,
      name: me.nickname,
      points: Math.round(points),
      summary: String(body.summary ?? "").slice(0, 120),
      at: new Date().toISOString(),
    };
    db.scores.push(entry);
    save("scores.json", db.scores);
    // Sometimes, a good result drops merch — often from the puzzle's own country.
    const drops = [];
    if (random() < dropChance(entry.points)) {
      const country = typeof body.country === "string" ? body.country : null;
      drops.push(award(me.id, "score", { game, day, country }));
      save("items.json", db.items);
    }
    return json(res, 201, { entry, drops });
  }

  // The recent drops, for the team to see who won what.
  if (route === "GET /api/drops") {
    const limit = Math.min(50, Number(url.searchParams.get("limit")) || 20);
    const names = new Map(db.players.map((p) => [p.id, p.nickname]));
    const recent = [...db.items].sort((a, b) => b.at.localeCompare(a.at)).slice(0, limit);
    return json(res, 200, recent.map(({ seen: _seen, ...i }) => ({ ...i, ownerName: names.get(i.owner) ?? "?" })));
  }

  // Admin
  if (url.pathname.startsWith("/api/admin/")) {
    if (!adminKey) return json(res, 503, { error: "admin is off: set GEO_ADMIN_KEY" });
    const given = String(req.headers["x-admin-key"] ?? "");
    const ok = given.length === adminKey.length && crypto.timingSafeEqual(Buffer.from(given), Buffer.from(adminKey));
    if (!ok) return json(res, 403, { error: "wrong key" });
    const names = new Map(db.players.map((p) => [p.id, p.nickname]));
    if (route === "GET /api/admin/prizes") {
      return json(res, 200, {
        items: [...db.items].sort((a, b) => b.at.localeCompare(a.at)).map((i) => ({ ...i, ownerName: names.get(i.owner) ?? "?" })),
        players: db.players.map((p) => ({ id: p.id, nickname: p.nickname })),
      });
    }
    const delivered = /^\/api\/admin\/prizes\/([\w-]+)\/delivered$/.exec(url.pathname);
    if (req.method === "POST" && delivered) {
      const item = db.items.find((i) => i.id === delivered[1]);
      if (!item) return json(res, 404, { error: "no such item" });
      const body = (await jsonBody(req)) ?? {};
      item.delivered = body.delivered !== false;
      save("items.json", db.items);
      return json(res, 200, item);
    }
    if (route === "POST /api/admin/grant") {
      const body = await jsonBody(req);
      const player = body && db.players.find((p) => p.id === body.player);
      if (!player) return json(res, 400, { error: "no such player" });
      if (!(body.kind in KINDS)) return json(res, 400, { error: "no such kind" });
      const item = award(player.id, "gift", { kind: body.kind, country: typeof body.country === "string" ? body.country : null });
      save("items.json", db.items);
      return json(res, 201, item);
    }
  }

  return json(res, 404, { error: "not found" });
}

// ---- Static files ----

function serveFile(req, res, rel) {
  let file = path.join(root, rel);
  if (!file.startsWith(root)) {
    res.writeHead(403).end();
    return;
  }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, "index.html");
  if (!fs.existsSync(file)) {
    const notFound = path.join(root, "404.html");
    res.writeHead(404, { "content-type": TYPES[".html"] });
    fs.createReadStream(fs.existsSync(notFound) ? notFound : path.join(root, "index.html")).pipe(res);
    return;
  }
  const type = TYPES[path.extname(file).toLowerCase()] ?? "application/octet-stream";
  const immutable = rel.startsWith("/_next/static/");
  res.writeHead(200, { "content-type": type, "cache-control": immutable ? "public, max-age=31536000, immutable" : "no-cache" });
  fs.createReadStream(file).pipe(res);
}

export function start() {
  if (!fs.existsSync(path.join(root, "index.html"))) {
    console.error(`No site in ${root}. Build it first (npm run build) or pass the folder: node serve.mjs <dir>`);
    process.exit(1);
  }
  return http
    .createServer(async (req, res) => {
      let url;
      try {
        url = new URL(req.url, "http://x");
        url.pathname = decodeURIComponent(url.pathname);
      } catch {
        res.writeHead(400).end();
        return;
      }
      try {
        if (url.pathname.startsWith("/api/")) await api(req, res, url);
        else serveFile(req, res, url.pathname);
      } catch (e) {
        console.error(e);
        if (!res.headersSent) res.writeHead(500).end();
      }
    })
    .listen(port, () =>
      console.log(`גלובוס: http://localhost:${port}  (site: ${root}, data: ${dataDir}, admin: ${adminKey ? "on" : "off"})`),
    );
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) start();
