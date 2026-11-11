# geo-games

Daily geography games for a team, in Hebrew, right-to-left. See README.md.

- Same stack and look as PakashAgent's frontend: Next.js App Router, React 18,
  TypeScript, lucide-react, plain CSS. `src/styles/tokens.css` is PakashAgent's
  file unchanged; game styles live in `src/styles/games.css`. Do not add a
  mapping or UI library: the globe is our own canvas renderer.
- Modules in `src/lib/` that tests load (geo, projection, daily, names,
  silhouette) must stay self-contained — no imports — because tests
  transpile each file alone and import it from a data: URL.
- Daily puzzles are seeded by `${game}:${dayKey()}` (Israel time). Changing
  how a game picks from its pool changes everyone's puzzle for that day.
- Shapes cross the antimeridian (Russia, Fiji): anything planar over lon/lat
  (winding, point-in-polygon, area) must unwrap longitudes along the ring.
- No setState inside effects (the lint rule is on); read browser-only values
  through `useHydrated` / `useSyncExternalStore`, as PakashAgent does.
