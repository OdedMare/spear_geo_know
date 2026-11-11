// Builds public/data/world.json and public/flags/ from three upstream sources:
//   world-atlas (countries-50m.json, ISC)     — country shapes, Natural Earth 1:50m
//   mledoze/countries (countries.json, ODbL)  — ISO codes, land borders, region, area
//   flag-icons (flags/4x3/*.svg, MIT)         — flags
// Hebrew names come from the ICU data built into Node (Intl.DisplayNames), with a
// few overrides below. Run once when the data should change:
//   node scripts/build-data.mjs <dir with countries.json, world-atlas/, flag-icons/>
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = process.argv[2];
if (!src) {
  console.error("usage: node scripts/build-data.mjs <source dir>");
  process.exit(1);
}

const topo = JSON.parse(fs.readFileSync(path.join(src, "world-atlas/countries-50m.json"), "utf8"));
const meta = JSON.parse(fs.readFileSync(path.join(src, "countries.json"), "utf8"));
const flagDir = path.join(src, "flag-icons/flags/4x3");

// ---- TopoJSON decoding (quantized, delta-encoded arcs) ----
const { scale, translate } = topo.transform;
const arcs = topo.arcs.map((arc) => {
  let x = 0;
  let y = 0;
  return arc.map(([dx, dy]) => {
    x += dx;
    y += dy;
    return [x * scale[0] + translate[0], y * scale[1] + translate[1]];
  });
});
const arcPoints = (i) => (i >= 0 ? arcs[i] : arcs[~i].slice().reverse());
const ring = (indices) => {
  const out = [];
  for (const i of indices) {
    const pts = arcPoints(i);
    out.push(...(out.length ? pts.slice(1) : pts));
  }
  return out;
};
const polygonsOf = (g) => {
  if (g.type === "Polygon") return [g.arcs.map(ring)];
  if (g.type === "MultiPolygon") return g.arcs.map((p) => p.map(ring));
  return [];
};

// ---- Simplification (Douglas–Peucker in degrees) ----
const TOLERANCE = 0.03;
function simplify(pts) {
  if (pts.length <= 4) return pts;
  const keep = new Uint8Array(pts.length);
  keep[0] = keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    const [ax, ay] = pts[a];
    const [bx, by] = pts[b];
    const dx = bx - ax;
    const dy = by - ay;
    const len = Math.hypot(dx, dy) || 1e-12;
    let best = -1;
    let bestD = TOLERANCE;
    for (let i = a + 1; i < b; i++) {
      const d = Math.abs(dy * (pts[i][0] - ax) - dx * (pts[i][1] - ay)) / len;
      if (d > bestD) {
        bestD = d;
        best = i;
      }
    }
    if (best >= 0) {
      keep[best] = 1;
      stack.push([a, best], [best, b]);
    }
  }
  return pts.filter((_, i) => keep[i]);
}

// Rings become flat integer arrays in hundredths of a degree: [lon0, lat0, lon1, lat1, ...].
function encodeRing(pts) {
  const s = simplify(pts);
  const out = [];
  let px = NaN;
  let py = NaN;
  for (const [x, y] of s) {
    const qx = Math.round(x * 100);
    const qy = Math.round(y * 100);
    if (qx === px && qy === py) continue;
    out.push(qx, qy);
    px = qx;
    py = qy;
  }
  return out.length >= 6 ? out : null;
}

// ---- Join shapes to country metadata ----
const byNumeric = new Map(meta.filter((c) => c.ccn3).map((c) => [c.ccn3, c]));
const byCca3 = new Map(meta.map((c) => [c.cca3, c]));
// Features without an ISO numeric code: folded into the country they belong to, or dropped.
const NAME_TO_CCA3 = { Kosovo: "UNK", Somaliland: "SOM", "N. Cyprus": "CYP" };

const shapes = new Map(); // cca3 -> polygons
for (const g of topo.objects.countries.geometries) {
  const c = g.id ? byNumeric.get(g.id) : byCca3.get(NAME_TO_CCA3[g.properties.name]);
  if (!c) {
    console.warn("skipping shape:", g.properties.name);
    continue;
  }
  const list = shapes.get(c.cca3) ?? [];
  for (const poly of polygonsOf(g)) {
    const rings = poly.map(encodeRing).filter(Boolean);
    if (rings.length) list.push(rings);
  }
  if (!list.length) {
    // Very small islands vanish under simplification; keep them unsimplified.
    for (const poly of polygonsOf(g)) {
      const outer = poly[0].flatMap(([x, y]) => [Math.round(x * 100), Math.round(y * 100)]);
      if (outer.length >= 6) list.push([outer]);
    }
  }
  shapes.set(c.cca3, list);
}

const he = new Intl.DisplayNames(["he"], { type: "region" });
const HEBREW_OVERRIDES = {
  CD: "קונגו (קינשאסה)",
  CG: "קונגו (ברזוויל)",
  MM: "מיאנמר",
  PS: "פלסטין",
  US: "ארצות הברית",
  GB: "בריטניה",
  VA: "הוותיקן",
  CZ: "צ׳כיה",
  CI: "חוף השנהב",
};
// Extra Hebrew spellings people type.
const HEBREW_ALIASES = {
  US: ["ארה״ב", "ארהב", "אמריקה"],
  GB: ["אנגליה", "הממלכה המאוחדת"],
  CD: ["קונגו", "זאיר"],
  CG: ["קונגו"],
  NL: ["הולנד"],
  CZ: ["צכיה", "צ'כיה"],
  KR: ["קוריאה"],
  AE: ["האמירויות", "איחוד האמירויות"],
  SZ: ["סווזילנד"],
  MK: ["מקדוניה"],
  MM: ["בורמה"],
  CI: ["קוט דיבואר"],
  TL: ["מזרח טימור"],
  CV: ["קייפ ורדה"],
  BA: ["בוסניה"],
};

const REGION_HE = {
  Africa: "אפריקה",
  Americas: "אמריקה",
  Asia: "אסיה",
  Europe: "אירופה",
  Oceania: "אוקיאניה",
  Antarctic: "אנטארקטיקה",
};
const continentOf = (c) => {
  if (c.region !== "Americas") return REGION_HE[c.region] ?? c.region;
  return c.subregion === "South America" ? "דרום אמריקה" : "צפון אמריקה";
};

// Countries that are "real" answers: UN members plus a few widely recognised others.
const EXTRA_SOVEREIGN = new Set(["VAT", "PSE", "UNK", "TWN"]);

const countries = [];
for (const c of meta) {
  const poly = shapes.get(c.cca3);
  const iso2 = c.cca2;
  const hasFlag = fs.existsSync(path.join(flagDir, `${iso2.toLowerCase()}.svg`));
  if (!poly && !hasFlag) continue;
  if (c.cca3 === "ATA") continue; // Antarctica
  countries.push({
    id: c.cca3,
    iso2,
    he: HEBREW_OVERRIDES[iso2] ?? he.of(iso2),
    en: c.name.common,
    alt: [...(HEBREW_ALIASES[iso2] ?? []), c.name.official, ...(c.altSpellings ?? []).filter((s) => s.length > 3)],
    continent: continentOf(c),
    sovereign: Boolean(c.unMember || EXTRA_SOVEREIGN.has(c.cca3)),
    area: Math.round(c.area ?? 0),
    center: c.latlng?.length === 2 ? [Number(c.latlng[1].toFixed(2)), Number(c.latlng[0].toFixed(2))] : null,
    borders: [],
    _borders: c.borders ?? [],
    flag: hasFlag,
    shape: poly ?? null,
  });
}

const known = new Set(countries.map((c) => c.id));
for (const c of countries) {
  c.borders = c._borders.filter((b) => known.has(b));
  delete c._borders;
}
// Borders must be symmetric for the path game.
const byId = new Map(countries.map((c) => [c.id, c]));
for (const c of countries) {
  for (const b of c.borders) {
    const other = byId.get(b);
    if (!other.borders.includes(c.id)) other.borders.push(c.id);
  }
}
countries.sort((a, b) => a.he.localeCompare(b.he, "he"));

fs.mkdirSync(path.join(root, "public/data"), { recursive: true });
fs.writeFileSync(path.join(root, "public/data/world.json"), JSON.stringify({ countries }));

const flagsOut = path.join(root, "public/flags");
fs.mkdirSync(flagsOut, { recursive: true });
let flagCount = 0;
for (const c of countries) {
  if (!c.flag) continue;
  fs.copyFileSync(path.join(flagDir, `${c.iso2.toLowerCase()}.svg`), path.join(flagsOut, `${c.iso2.toLowerCase()}.svg`));
  flagCount++;
}

const size = fs.statSync(path.join(root, "public/data/world.json")).size;
console.log(`${countries.length} countries (${countries.filter((c) => c.shape).length} with shapes), ${flagCount} flags, world.json ${(size / 1024).toFixed(0)} KB`);
