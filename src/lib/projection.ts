// Orthographic globe projection with clipping at the horizon. Self-contained.
// A view is the [lon, lat] at the centre of the disc. Projected coordinates are
// unit-disc coordinates: x to the right, y up, both in [-1, 1].

export type View = { lon: number; lat: number };

const RAD = Math.PI / 180;

/** Unit vectors for a flat ring in hundredths of a degree. */
export function ringToVectors(ring: number[]): Float64Array {
  const n = ring.length / 2;
  const v = new Float64Array(n * 3);
  for (let i = 0; i < n; i++) {
    const lon = (ring[2 * i] / 100) * RAD;
    const lat = (ring[2 * i + 1] / 100) * RAD;
    const c = Math.cos(lat);
    v[3 * i] = c * Math.cos(lon);
    v[3 * i + 1] = c * Math.sin(lon);
    v[3 * i + 2] = Math.sin(lat);
  }
  return v;
}

export interface Rotation {
  cl: number;
  sl: number;
  cp: number;
  sp: number;
}

export function rotationOf(view: View): Rotation {
  return {
    cl: Math.cos(view.lon * RAD),
    sl: Math.sin(view.lon * RAD),
    cp: Math.cos(view.lat * RAD),
    sp: Math.sin(view.lat * RAD),
  };
}

/** Projects one unit vector. Returns [x, y, depth]; depth < 0 is behind the globe. */
export function rotate(r: Rotation, x0: number, y0: number, z0: number): [number, number, number] {
  const e = x0 * r.cl + y0 * r.sl;
  return [y0 * r.cl - x0 * r.sl, r.cp * z0 - r.sp * e, r.sp * z0 + r.cp * e];
}

export function projectLonLat(view: View, lon: number, lat: number): [number, number, number] {
  const c = Math.cos(lat * RAD);
  return rotate(rotationOf(view), c * Math.cos(lon * RAD), c * Math.sin(lon * RAD), Math.sin(lat * RAD));
}

/** Inverse: a point on the unit disc back to [lon, lat], or null off the globe. */
export function unproject(view: View, x: number, y: number): [number, number] | null {
  const rr = x * x + y * y;
  if (rr > 1) return null;
  const z = Math.sqrt(1 - rr);
  const r = rotationOf(view);
  // Transpose of the rotation in `rotate`.
  const e = r.cp * z - r.sp * y; // component along the view meridian's equator direction
  const z0 = r.sp * z + r.cp * y;
  const x0 = e * r.cl - x * r.sl;
  const y0 = e * r.sl + x * r.cl;
  return [Math.atan2(y0, x0) / RAD, Math.asin(Math.max(-1, Math.min(1, z0))) / RAD];
}

const ARC_STEP = 6 * RAD;
const TAU = Math.PI * 2;
const norm = (a: number) => ((a % TAU) + TAU) % TAU;

/**
 * Twice the signed area of a flat ring in lon/lat: positive when counter-clockwise.
 * Longitudes are unwrapped first, since a ring may cross the antimeridian
 * (180 → −180 is one small step on the globe, not a jump across the map).
 */
function winding(ring: number[]): number {
  const n = ring.length / 2;
  const xs = new Float64Array(n);
  xs[0] = ring[0];
  for (let i = 1; i < n; i++) {
    let d = ring[2 * i] - ring[2 * i - 2];
    if (d > 18000) d -= 36000;
    else if (d < -18000) d += 36000;
    xs[i] = xs[i - 1] + d;
  }
  let a = 0;
  for (let i = 0, j = n - 1; i < n; j = i++) a += xs[j] * ring[2 * i + 1] - xs[i] * ring[2 * j + 1];
  return a;
}

const windingCache = new WeakMap<number[], boolean>();
function isCounterClockwise(ring: number[]): boolean {
  let ccw = windingCache.get(ring);
  if (ccw === undefined) {
    ccw = winding(ring) > 0;
    windingCache.set(ring, ccw);
  }
  return ccw;
}

/**
 * Projects a ring and clips it to the visible hemisphere. `vectors` are the
 * ring's unit vectors (ringToVectors) and `ring` the flat ring they came from.
 * Returns one or more closed paths in flat unit-disc coordinates, or null if
 * the ring is entirely hidden.
 *
 * Where the ring passes behind the globe, the visible runs are joined along
 * the horizon. Each run's exit joins the next entry round the circle, turning
 * the way that keeps the ring's interior on the same side it is on along the
 * ring itself: clockwise for a counter-clockwise ring, and the reverse. (The
 * projection keeps orientation: east is right and north is up, as in lon/lat.)
 */
export function projectRing(vectors: Float64Array, r: Rotation, ring: number[]): number[][] | null {
  const n = vectors.length / 3;
  const xs = new Float64Array(n);
  const ys = new Float64Array(n);
  const zs = new Float64Array(n);
  let hidden = 0;
  for (let i = 0; i < n; i++) {
    const [x, y, z] = rotate(r, vectors[3 * i], vectors[3 * i + 1], vectors[3 * i + 2]);
    xs[i] = x;
    ys[i] = y;
    zs[i] = z;
    if (z < 0) hidden++;
  }
  if (hidden === n) return null;
  if (hidden === 0) {
    const out = new Array<number>(n * 2);
    for (let i = 0; i < n; i++) {
      out[2 * i] = xs[i];
      out[2 * i + 1] = ys[i];
    }
    return [out];
  }

  const horizonAngle = (i: number, j: number) => {
    const t = zs[i] / (zs[i] - zs[j]);
    return Math.atan2(ys[i] + t * (ys[j] - ys[i]), xs[i] + t * (xs[j] - xs[i]));
  };

  // Start walking just after the ring goes behind the globe, so every run is whole.
  let start = 0;
  for (let i = 0; i < n; i++) {
    if (zs[i] >= 0 && zs[(i + 1) % n] < 0) {
      start = (i + 1) % n;
      break;
    }
  }

  type Run = { pts: number[]; aIn: number; aOut: number; used: boolean };
  const runs: Run[] = [];
  let cur: Run | null = null;
  for (let k = 0; k < n; k++) {
    const i = (start + k) % n;
    const j = (i + 1) % n;
    const vi = zs[i] >= 0;
    const vj = zs[j] >= 0;
    if (!vi && vj) {
      const a = horizonAngle(i, j);
      cur = { pts: [Math.cos(a), Math.sin(a)], aIn: a, aOut: a, used: false };
    }
    if (vj && cur) cur.pts.push(xs[j], ys[j]);
    if (vj && !(zs[(j + 1) % n] >= 0) && cur) {
      const a = horizonAngle(j, (j + 1) % n);
      cur.pts.push(Math.cos(a), Math.sin(a));
      cur.aOut = a;
      runs.push(cur);
      cur = null;
    }
  }
  if (!runs.length) return null;

  const clockwise = !isCounterClockwise(ring);
  const sweep = (from: number, to: number) => (clockwise ? norm(from - to) : norm(to - from));

  const paths: number[][] = [];
  for (const first of runs) {
    if (first.used) continue;
    const path: number[] = [];
    let run = first;
    for (;;) {
      run.used = true;
      path.push(...run.pts);
      // The entry reached first going round from this exit.
      let next = runs[0];
      let best = Infinity;
      for (const cand of runs) {
        if (cand.used && cand !== first) continue;
        const d = sweep(run.aOut, cand.aIn);
        if (d < best) {
          best = d;
          next = cand;
        }
      }
      const steps = Math.ceil(best / ARC_STEP);
      for (let s = 1; s < steps; s++) {
        const a = run.aOut + ((clockwise ? -best : best) * s) / steps;
        path.push(Math.cos(a), Math.sin(a));
      }
      if (next === first) break;
      run = next;
    }
    if (path.length >= 6) paths.push(path);
  }
  return paths.length ? paths : null;
}

/** Great-circle midpoint of two [lon, lat] points, and the angle between them in degrees. */
export function midpoint(a: [number, number], b: [number, number]): { lon: number; lat: number; angle: number } {
  const v = (p: [number, number]) => {
    const c = Math.cos(p[1] * RAD);
    return [c * Math.cos(p[0] * RAD), c * Math.sin(p[0] * RAD), Math.sin(p[1] * RAD)];
  };
  const va = v(a);
  const vb = v(b);
  const m = [va[0] + vb[0], va[1] + vb[1], va[2] + vb[2]];
  const len = Math.hypot(m[0], m[1], m[2]) || 1;
  const dot = Math.max(-1, Math.min(1, va[0] * vb[0] + va[1] * vb[1] + va[2] * vb[2]));
  return {
    lon: Math.atan2(m[1], m[0]) / RAD,
    lat: Math.asin(m[2] / len) / RAD,
    angle: Math.acos(dot) / RAD,
  };
}
