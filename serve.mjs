// A static file server with no dependencies, for networks without internet.
//   node serve.mjs [dir=out] [port=3000]
// Any other static server works too: nginx, IIS, or `python3 -m http.server`.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, process.argv[2] ?? "out");
const port = Number(process.argv[3] ?? process.env.PORT ?? 3000);

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

if (!fs.existsSync(path.join(root, "index.html"))) {
  console.error(`No site in ${root}. Build it first (npm run build) or pass the folder: node serve.mjs <dir>`);
  process.exit(1);
}

http
  .createServer((req, res) => {
    let rel;
    try {
      rel = decodeURIComponent(new URL(req.url, "http://x").pathname);
    } catch {
      res.writeHead(400).end();
      return;
    }
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
  })
  .listen(port, () => console.log(`גלובוס: http://localhost:${port}  (serving ${root})`));
