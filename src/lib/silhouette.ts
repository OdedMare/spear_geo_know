// A country's outline as an SVG path, fitted to a square. Self-contained.
// Far-flung territories (Alaska and Hawaii for the USA, French Guiana for
// France) are left out, so the silhouette is the shape people picture.

type Shape = number[][][];

const RAD = Math.PI / 180;

export interface Silhouette {
  d: string;
  viewBox: string;
}

export function silhouette(shape: Shape, size = 100, pad = 6): Silhouette {
  // Work in a local equirectangular frame around the largest polygon.
  const polys = shape.map((poly) => poly.map(toPoints));
  const outerArea = (p: [number, number][][]) => Math.abs(signedArea(p[0]));
  const main = polys.reduce((a, b) => (outerArea(b) > outerArea(a) ? b : a));
  const [lon0, lat0] = centroid(main[0]);
  const k = Math.cos(lat0 * RAD);
  const local = (p: [number, number]): [number, number] => [wrap(p[0] - lon0) * k, -(p[1] - lat0)];

  const mainLocal = main[0].map(local);
  const mainRadius = Math.max(...mainLocal.map(([x, y]) => Math.hypot(x, y)));
  const reach = Math.max(12, mainRadius * 1.6); // degrees

  const kept = polys
    .map((poly) => poly.map((ring) => ring.map(local)))
    .filter((poly) => {
      const [cx, cy] = centroid(poly[0]);
      return Math.hypot(cx, cy) <= reach;
    });

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const poly of kept)
    for (const [x, y] of poly[0]) {
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
  const scale = (size - 2 * pad) / Math.max(maxX - minX, maxY - minY, 1e-6);
  const offX = pad + ((size - 2 * pad) - (maxX - minX) * scale) / 2;
  const offY = pad + ((size - 2 * pad) - (maxY - minY) * scale) / 2;

  const parts: string[] = [];
  for (const poly of kept)
    for (const ring of poly) {
      parts.push(
        ring
          .map(([x, y], i) => `${i ? "L" : "M"}${((x - minX) * scale + offX).toFixed(2)} ${((y - minY) * scale + offY).toFixed(2)}`)
          .join("") + "Z",
      );
    }
  return { d: parts.join(""), viewBox: `0 0 ${size} ${size}` };
}

function toPoints(ring: number[]): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i < ring.length; i += 2) out.push([ring[i] / 100, ring[i + 1] / 100]);
  return out;
}

function wrap(lon: number) {
  return ((((lon + 180) % 360) + 360) % 360) - 180;
}

function signedArea(ring: [number, number][]) {
  // Unwrapped longitudes: a ring crossing the antimeridian is not a map-wide band.
  const xs = [ring[0][0]];
  for (let i = 1; i < ring.length; i++) xs.push(xs[i - 1] + wrap(ring[i][0] - ring[i - 1][0]));
  let a = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) a += xs[j] * ring[i][1] - xs[i] * ring[j][1];
  return a / 2;
}

/** Vertex mean; good enough to place a polygon, and safe across the antimeridian. */
function centroid(ring: [number, number][]): [number, number] {
  let x = ring[0][0];
  let sx = 0;
  let sy = 0;
  for (let i = 0; i < ring.length; i++) {
    if (i) x += wrap(ring[i][0] - ring[i - 1][0]);
    sx += x;
    sy += ring[i][1];
  }
  return [wrap(sx / ring.length), sy / ring.length];
}
