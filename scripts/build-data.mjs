// Builds public/data/world.json and public/flags/ from three upstream sources:
//   world-atlas (countries-50m.json, ISC)     — country shapes, Natural Earth 1:50m
//                (countries-10m.json)          — outlines for countries too small for 1:50m
//   mledoze/countries (countries.json, ODbL)  — ISO codes, land borders, region, area
//   flag-icons (flags/4x3/*.svg, MIT)         — flags
//   Natural Earth admin-0 (ne_50m_admin_0_countries.geojson, public domain) — population
// Hebrew capital names are in scripts/capitals-he.json.
// Hebrew names come from the ICU data built into Node (Intl.DisplayNames), with a
// few overrides below. Run once when the data should change:
//   node scripts/build-data.mjs <dir with countries.json, world-atlas/, flag-icons/, ne50.geojson>
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
const capitalsHe = JSON.parse(fs.readFileSync(path.join(root, "scripts/capitals-he.json"), "utf8"));

// Population estimates (Natural Earth POP_EST, 2019), by ISO alpha-3.
const ne = JSON.parse(fs.readFileSync(path.join(src, "ne50.geojson"), "utf8"));
const population = new Map();
for (const { properties: p } of ne.features) {
  const key = p.ADMIN === "Kosovo" ? "UNK" : [p.ISO_A3, p.ADM0_A3, p.ISO_A3_EH].find((v) => v && v !== "-99");
  if (key && !population.has(key) && p.POP_EST > 0) population.set(key, Math.round(p.POP_EST));
}

// ---- TopoJSON decoding (quantized, delta-encoded arcs) ----
function decoder(t) {
  const { scale, translate } = t.transform;
  const arcs = t.arcs.map((arc) => {
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
  return (g) => {
    if (g.type === "Polygon") return [g.arcs.map(ring)];
    if (g.type === "MultiPolygon") return g.arcs.map((p) => p.map(ring));
    return [];
  };
}
const polygonsOf = decoder(topo);

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
// Features without an ISO numeric code: folded into the country they belong to.
const NAME_TO_CCA3 = { Kosovo: "UNK", Somaliland: "SOM", "N. Cyprus": "CYP" };
// Not a country in this app: its land is still drawn, as plain unnamed land,
// and it is never an answer, a guess, a flag or a border.
const EXCLUDED = new Set(["PSE"]);

function encodePolygons(polys) {
  const list = [];
  for (const poly of polys) {
    const rings = poly.map(encodeRing).filter(Boolean);
    if (rings.length) list.push(rings);
  }
  if (!list.length) {
    // Very small islands vanish under simplification; keep them unsimplified.
    for (const poly of polys) {
      const outer = poly[0].flatMap(([x, y]) => [Math.round(x * 100), Math.round(y * 100)]);
      if (outer.length >= 6) list.push([outer]);
    }
  }
  return list;
}

const shapes = new Map(); // cca3 -> polygons
const land = []; // polygons drawn as land that belong to no country here
const countryOf = (g) => (g.id ? byNumeric.get(g.id) : byCca3.get(NAME_TO_CCA3[g.properties.name]));
for (const g of topo.objects.countries.geometries) {
  const c = countryOf(g);
  const polys = encodePolygons(polygonsOf(g));
  if (!c || EXCLUDED.has(c.cca3)) {
    console.log("plain land:", g.properties.name);
    land.push(...polys);
    continue;
  }
  shapes.set(c.cca3, [...(shapes.get(c.cca3) ?? []), ...polys]);
}

// A country too small for 1:50m (Tuvalu) takes its outline from 1:10m.
const topo10 = JSON.parse(fs.readFileSync(path.join(src, "world-atlas/countries-10m.json"), "utf8"));
const polygonsOf10 = decoder(topo10);
for (const g of topo10.objects.countries.geometries) {
  const c = countryOf(g);
  if (!c || EXCLUDED.has(c.cca3) || shapes.has(c.cca3)) continue;
  if (!(c.unMember || ["VAT", "UNK", "TWN"].includes(c.cca3))) continue;
  console.log("1:10m outline:", c.name.common);
  shapes.set(c.cca3, encodePolygons(polygonsOf10(g)));
}

const he = new Intl.DisplayNames(["he"], { type: "region" });
const HEBREW_OVERRIDES = {
  CD: "קונגו (קינשאסה)",
  CG: "קונגו (ברזוויל)",
  MM: "מיאנמר",
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

// A flag's main colours, in the order the SVG paints them (the field first):
// enough to dress merch in a country's colours. Near-duplicates are merged.
const NAMED = { red: "#ff0000", white: "#ffffff", blue: "#0000ff", green: "#008000", yellow: "#ffff00", black: "#000000", orange: "#ffa500" };
function flagColours(file) {
  const svg = fs.readFileSync(file, "utf8");
  const found = [];
  for (const m of svg.matchAll(/fill(?:="|:)\s*(#[0-9a-fA-F]{3,6}\b|red|white|blue|green|yellow|black|orange)/g)) {
    let c = m[1].toLowerCase();
    c = NAMED[c] ?? c;
    if (c.length === 4) c = "#" + [...c.slice(1)].map((x) => x + x).join("");
    if (c.length !== 7) continue;
    const rgb = [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
    const near = found.some((f) => {
      const o = [1, 3, 5].map((i) => parseInt(f.slice(i, i + 2), 16));
      return Math.hypot(rgb[0] - o[0], rgb[1] - o[1], rgb[2] - o[2]) < 40;
    });
    if (!near) found.push(c);
    if (found.length === 3) break;
  }
  return found.length ? found : ["#888888", "#dddddd"];
}

// Countries that are "real" answers: UN members plus a few widely recognised others.
const EXTRA_SOVEREIGN = new Set(["VAT", "UNK", "TWN"]);

const countries = [];
for (const c of meta) {
  const poly = shapes.get(c.cca3);
  const iso2 = c.cca2;
  const hasFlag = fs.existsSync(path.join(flagDir, `${iso2.toLowerCase()}.svg`));
  if (!poly && !hasFlag) continue;
  if (c.cca3 === "ATA") continue; // Antarctica
  if (EXCLUDED.has(c.cca3)) continue;
  countries.push({
    id: c.cca3,
    iso2,
    he: HEBREW_OVERRIDES[iso2] ?? he.of(iso2),
    en: c.name.common,
    alt: [...(HEBREW_ALIASES[iso2] ?? []), c.name.official, ...(c.altSpellings ?? []).filter((s) => s.length > 3)],
    continent: continentOf(c),
    sovereign: Boolean(c.unMember || EXTRA_SOVEREIGN.has(c.cca3)),
    area: Math.round(c.area ?? 0),
    pop: population.get(c.cca3) ?? 0,
    capital: capitalsHe[c.cca3] ?? null,
    center: c.latlng?.length === 2 ? [Number(c.latlng[1].toFixed(2)), Number(c.latlng[0].toFixed(2))] : null,
    borders: [],
    _borders: c.borders ?? [],
    flag: hasFlag,
    colors: hasFlag ? flagColours(path.join(flagDir, `${iso2.toLowerCase()}.svg`)) : ["#888888", "#dddddd"],
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
fs.writeFileSync(path.join(root, "public/data/world.json"), JSON.stringify({ countries, land }));

const flagsOut = path.join(root, "public/flags");
fs.rmSync(flagsOut, { recursive: true, force: true }); // no flag left behind for a country taken out
fs.mkdirSync(flagsOut, { recursive: true });
let flagCount = 0;
for (const c of countries) {
  if (!c.flag) continue;
  fs.copyFileSync(path.join(flagDir, `${c.iso2.toLowerCase()}.svg`), path.join(flagsOut, `${c.iso2.toLowerCase()}.svg`));
  flagCount++;
}

const size = fs.statSync(path.join(root, "public/data/world.json")).size;
console.log(`${countries.length} countries (${countries.filter((c) => c.shape).length} with shapes), ${flagCount} flags, world.json ${(size / 1024).toFixed(0)} KB`);
