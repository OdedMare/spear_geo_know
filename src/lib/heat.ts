// Distance → colour for the hot/cold game. Self-contained.

const STOPS: [number, [number, number, number]][] = [
  [0, [127, 0, 0]],
  [400, [190, 22, 22]],
  [1200, [232, 72, 30]],
  [2500, [245, 133, 50]],
  [4500, [250, 180, 80]],
  [7500, [252, 214, 130]],
  [12000, [254, 238, 190]],
];

export function heatColor(km: number): string {
  if (km <= STOPS[0][0]) return rgb(STOPS[0][1]);
  for (let i = 1; i < STOPS.length; i++) {
    const [d1, c1] = STOPS[i];
    if (km <= d1) {
      const [d0, c0] = STOPS[i - 1];
      const t = (km - d0) / (d1 - d0);
      return rgb([0, 1, 2].map((k) => c0[k] + (c1[k] - c0[k]) * t) as [number, number, number]);
    }
  }
  return rgb(STOPS[STOPS.length - 1][1]);
}

function rgb([r, g, b]: [number, number, number]) {
  return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
}

export function heatEmoji(km: number, found: boolean): string {
  if (found) return "🟩";
  if (km < 1000) return "🟥";
  if (km < 3000) return "🟧";
  if (km < 6000) return "🟨";
  return "⬜";
}

export function heatWord(km: number): string {
  if (km === 0) return "גובלת";
  if (km < 500) return "רותח";
  if (km < 1500) return "חם מאוד";
  if (km < 3000) return "חם";
  if (km < 6000) return "פושר";
  if (km < 9000) return "קר";
  return "קפוא";
}
