// The site and the team table, with no dependencies, for networks without internet.
//   node serve.mjs [dir=out] [port=3000]
// Scores are kept in a JSON file: $GEO_DATA_DIR/scores.json (default ./data).
// Any static server can serve the site alone (nginx, IIS, python -m http.server);
// only the team table needs this one.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, process.argv[2] ?? "out");
const port = Number(process.argv[3] ?? process.env.PORT ?? 3000);
const dataDir = path.resolve(process.env.GEO_DATA_DIR ?? path.join(here, "data"));
const scoresFile = path.join(dataDir, "scores.json");

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

// ---- Scores ----

function loadScores() {
  try {
    return JSON.parse(fs.readFileSync(scoresFile, "utf8"));
  } catch {
    return [];
  }
}

let scores = loadScores();

function saveScores() {
  fs.mkdirSync(dataDir, { recursive: true });
  const tmp = `${scoresFile}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(scores));
  fs.renameSync(tmp, scoresFile); // atomic: a crash never leaves half a file
}

/** Validates a submitted score; returns the clean entry or an error message. */
export function cleanEntry(body) {
  if (!body || typeof body !== "object") return "bad body";
  const game = String(body.game ?? "");
  const day = String(body.day ?? "");
  const name = String(body.name ?? "").trim().replace(/\s+/g, " ").slice(0, 24);
  const points = Number(body.points);
  const summary = String(body.summary ?? "").slice(0, 120);
  if (!GAMES.has(game)) return "unknown game";
  if (!DAY.test(day)) return "bad day";
  if (!name) return "name required";
  if (!Number.isFinite(points) || points < 0 || points > 100) return "points out of range";
  return { game, day, name, points: Math.round(points), summary, at: new Date().toISOString() };
}

function readBody(req, limit = 4096) {
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

function json(res, status, value) {
  res.writeHead(status, { "content-type": TYPES[".json"], "cache-control": "no-store" });
  res.end(JSON.stringify(value));
}

async function api(req, res, url) {
  if (url.pathname === "/api/health") return json(res, 200, { ok: true });
  if (url.pathname !== "/api/scores") return json(res, 404, { error: "not found" });

  if (req.method === "GET") {
    const from = url.searchParams.get("from") ?? "";
    const to = url.searchParams.get("to") ?? from;
    if (!DAY.test(from) || !DAY.test(to)) return json(res, 400, { error: "from/to must be YYYY-MM-DD" });
    return json(res, 200, scores.filter((s) => s.day >= from && s.day <= to));
  }

  if (req.method === "POST") {
    let entry;
    try {
      entry = cleanEntry(JSON.parse(await readBody(req)));
    } catch {
      return json(res, 400, { error: "bad json" });
    }
    if (typeof entry === "string") return json(res, 400, { error: entry });
    // One result per person per game per day: the first one counts.
    const key = (s) => `${s.game}|${s.day}|${s.name.toLowerCase()}`;
    if (scores.some((s) => key(s) === key(entry))) return json(res, 409, { error: "already submitted" });
    scores.push(entry);
    saveScores();
    return json(res, 201, entry);
  }

  res.writeHead(405, { allow: "GET, POST" }).end();
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
    .listen(port, () => console.log(`גלובוס: http://localhost:${port}  (site: ${root}, scores: ${scoresFile})`));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) start();
