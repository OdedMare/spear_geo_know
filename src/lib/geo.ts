// Pure geography math. Self-contained (no imports) so tests can load it directly.
// Coordinates are [lon, lat] in degrees; shapes are rings of flat integers in
// hundredths of a degree, as written by scripts/build-data.mjs.

export type LonLat = [number, number];
export type Shape = number[][][]; // polygons -> rings -> flat [lon*100, lat*100, ...]

export interface Located {
  id: string;
  center: LonLat | null;
  borders: string[];
  shape: Shape | null;
}

const EARTH_RADIUS_KM = 6371;
const RAD = Math.PI / 180;

export function haversineKm(a: LonLat, b: LonLat): number {
  const dLat = (b[1] - a[1]) * RAD;
  const dLon = (b[0] - a[0]) * RAD;
  const s =
    Math.sin(dLat / 2) ** 2 + Math.cos(a[1] * RAD) * Math.cos(b[1] * RAD) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(s)));
}

/** Initial compass bearing from a to b, 0 = north, clockwise, in degrees [0, 360). */
export function bearingDeg(a: LonLat, b: LonLat): number {
  const φ1 = a[1] * RAD;
  const φ2 = b[1] * RAD;
  const Δλ = (b[0] - a[0]) * RAD;
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return (Math.atan2(y, x) / RAD + 360) % 360;
}

const ARROWS = ["⬆️", "↗️", "➡️", "↘️", "⬇️", "↙️", "⬅️", "↖️"];
export function compassArrow(bearing: number): string {
  return ARROWS[Math.round(bearing / 45) % 8];
}

const COMPASS_HE = ["צפון", "צפון־מזרח", "מזרח", "דרום־מזרח", "דרום", "דרום־מערב", "מערב", "צפון־מערב"];
export function compassName(bearing: number): string {
  return COMPASS_HE[Math.round(bearing / 45) % 8];
}

/** 100% on the spot, 0% on the far side of the planet. */
export function proximityPercent(km: number): number {
  return Math.max(0, Math.round(100 * (1 - km / 20000)));
}

/** Every vertex of a shape, thinned to at most `max` points. */
export function samplePoints(shape: Shape, max = 700): LonLat[] {
  let total = 0;
  for (const poly of shape) for (const ring of poly) total += ring.length / 2;
  const stride = Math.max(1, Math.ceil(total / max));
  const out: LonLat[] = [];
  let k = 0;
  for (const poly of shape) {
    // Outer rings only: holes never hold the nearest border point.
    const ring = poly[0];
    for (let i = 0; i < ring.length; i += 2, k++) {
      if (k % stride === 0) out.push([ring[i] / 100, ring[i + 1] / 100]);
    }
  }
  return out;
}

const sampleCache = new Map<string, LonLat[]>();
function samplesOf(c: Located): LonLat[] {
  let s = sampleCache.get(c.id);
  if (!s) {
    s = c.shape ? samplePoints(c.shape) : c.center ? [c.center] : [];
    sampleCache.set(c.id, s);
  }
  return s;
}

/** Shortest distance between two countries' borders, in km. Neighbours are 0. */
export function borderDistanceKm(a: Located, b: Located): number {
  if (a.id === b.id || a.borders.includes(b.id)) return 0;
  const pa = samplesOf(a);
  const pb = samplesOf(b);
  let best = Infinity;
  for (const p of pa) {
    for (const q of pb) {
      // Cheap reject before the trigonometry: one degree of latitude is ~111 km.
      if (Math.abs(p[1] - q[1]) * 111 > best) continue;
      const d = haversineKm(p, q);
      if (d < best) best = d;
    }
  }
  return best === Infinity ? 0 : Math.round(best);
}

export function centerDistanceKm(a: Located, b: Located): number {
  if (!a.center || !b.center) return 0;
  return Math.round(haversineKm(a.center, b.center));
}

/**
 * A ring's longitudes made continuous along its own path, so a ring that
 * crosses the antimeridian (Russia's far east, Fiji) reads as one shape
 * rather than a band across the whole map.
 */
const unwrappedCache = new WeakMap<number[], Float64Array>();
function unwrapped(ring: number[]): Float64Array {
  let xs = unwrappedCache.get(ring);
  if (!xs) {
    const n = ring.length / 2;
    xs = new Float64Array(n);
    xs[0] = ring[0];
    for (let i = 1; i < n; i++) {
      let d = ring[2 * i] - ring[2 * i - 2];
      if (d > 18000) d -= 36000;
      else if (d < -18000) d += 36000;
      xs[i] = xs[i - 1] + d;
    }
    unwrappedCache.set(ring, xs);
  }
  return xs;
}

function rayCast(x: number, y: number, xs: Float64Array, ring: number[]): boolean {
  let inside = false;
  const n = xs.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const yi = ring[2 * i + 1];
    const yj = ring[2 * j + 1];
    if (yi > y !== yj > y && x < ((xs[j] - xs[i]) * (y - yi)) / (yj - yi) + xs[i]) inside = !inside;
  }
  return inside;
}

/** Point-in-polygon on a flat ring (hundredths of a degree), antimeridian-safe. */
export function inRing(lon: number, lat: number, ring: number[]): boolean {
  const xs = unwrapped(ring);
  const y = lat * 100;
  // The unwrapped ring may sit a turn east or west of the point.
  return [0, 36000, -36000].some((shift) => rayCast(lon * 100 + shift, y, xs, ring));
}

export function inShape(lon: number, lat: number, shape: Shape): boolean {
  for (const poly of shape) {
    if (!inRing(lon, lat, poly[0])) continue;
    let hole = false;
    for (let h = 1; h < poly.length; h++) if (inRing(lon, lat, poly[h])) hole = true;
    if (!hole) return true;
  }
  return false;
}

// ---- Land-border graph (route game) ----

export function bfsDistances(start: string, neighbours: (id: string) => string[]): Map<string, number> {
  const dist = new Map<string, number>([[start, 0]]);
  const queue = [start];
  for (let i = 0; i < queue.length; i++) {
    const cur = queue[i];
    for (const n of neighbours(cur)) {
      if (!dist.has(n)) {
        dist.set(n, dist.get(cur)! + 1);
        queue.push(n);
      }
    }
  }
  return dist;
}

/** One shortest path start → end, or null if they are not connected by land. */
export function shortestPath(start: string, end: string, neighbours: (id: string) => string[]): string[] | null {
  const prev = new Map<string, string | null>([[start, null]]);
  const queue = [start];
  for (let i = 0; i < queue.length; i++) {
    const cur = queue[i];
    if (cur === end) break;
    for (const n of neighbours(cur)) {
      if (!prev.has(n)) {
        prev.set(n, cur);
        queue.push(n);
      }
    }
  }
  if (!prev.has(end)) return null;
  const path: string[] = [];
  for (let c: string | null = end; c; c = prev.get(c) ?? null) path.unshift(c);
  return path;
}

/** Whether start and end are joined using only the allowed countries in between. */
export function connectsThrough(
  start: string,
  end: string,
  allowed: Set<string>,
  neighbours: (id: string) => string[],
): boolean {
  const ok = (id: string) => id === end || allowed.has(id);
  return shortestPath(start, end, (id) => neighbours(id).filter(ok)) !== null;
}
