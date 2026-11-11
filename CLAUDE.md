# geo-games

Daily geography games for a team, in Hebrew, right-to-left. See README.md.

- Same stack and look as PakashAgent's frontend: Next.js App Router, React 18,
  TypeScript, lucide-react, plain CSS. `src/styles/tokens.css` is PakashAgent's
  file unchanged; game styles live in `src/styles/games.css`. Do not add a
  mapping or UI library: the globe is our own canvas renderer.
- Modules in `src/lib/` that tests load (geo, projection, daily, names,
  pools, scoring, badges, silhouette) must stay self-contained — no imports — because tests
  transpile each file alone and import it from a data: URL.
- Daily puzzles are seeded by `${game}:${dayKey()}` (Israel time). Changing
  how a game picks from its pool changes everyone's puzzle for that day.
- Shapes cross the antimeridian (Russia, Fiji): anything planar over lon/lat
  (winding, point-in-polygon, area) must unwrap longitudes along the ring.
- No setState inside effects (the lint rule is on); read browser-only values
  through `useHydrated` / `useSyncExternalStore`, as PakashAgent does.
- The app must run on a network with no internet: never load anything from
  outside the site at runtime (no CDN, no Google Fonts, no remote flags or
  map tiles). Data, flags and fonts live in `public/`. `next.config.ts` is a
  static export (`out/`), served by `serve.mjs` or any static server.
- Every game reports a `GameResult` (points 0–100, a short summary, tags for
  badges) through `onFinish`. Points are what the team table ranks, so keep
  them comparable across games; their formulas live in `lib/scoring.ts`.
- Puzzles draw from `lib/pools.ts` (difficulty by population rank, optional
  continent). The daily always uses `DAILY_OPTIONS`.
- The team table is `serve.mjs` (`/api/scores`, JSON file in `data/`). It is
  optional: without it every game still works.
