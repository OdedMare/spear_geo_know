# גלובוס — משחקי גיאוגרפיה לצוות

Four daily geography games for the team. Everyone who opens a game on the same
day (Israel time) gets the same puzzle, so results can be compared: each game
ends with a "copy result" button that produces a short emoji summary to paste
into the team chat.

| Game | Route | What you do |
|---|---|---|
| **חם וקר** | `/hot-cold` | Find the secret country on a 3D globe. Every guess is painted by its border distance from the answer, pale (far) to dark red (close). Unlimited guesses. |
| **מסלול** | `/route` | Get a start and an end country; name the countries along the shortest land route between them. Green = on a shortest route, orange = a small detour, red = off course. A hint shades the next country on the globe without naming it. |
| **דגלים** | `/flags` | Ten rounds, four options each. Odd rounds show a flag (pick the country), even rounds show a country (pick its flag). Wrong options come from the same continent. |
| **צללית** | `/shape` | Identify a country by its outline in six guesses. Each guess gives distance, a direction arrow and a proximity %. After three misses the continent is revealed. |

Each game also has a **תרגול** (practice) mode with a fresh random puzzle.
Progress and stats (played, success rate, streak) are kept per browser in
`localStorage`; there is no server and no sign-in.

## Stack

The same as PakashAgent's frontend: Next.js 16 (App Router), React 18,
TypeScript, `lucide-react`, plain CSS with PakashAgent's `tokens.css`
(Apple-style neutrals, system fonts, light/dark), Hebrew right-to-left,
ESLint via `eslint-config-next`, tests on `node --test`.

No mapping library: the globe is an orthographic projection drawn on a
`<canvas>` (`src/lib/projection.ts`), with rings clipped at the horizon and
rejoined along it by winding direction. Drag to rotate, pinch or scroll to
zoom, tap a coloured country to see its name.

## Running

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # geometry, projection, daily seeding, name search
npm run lint
npm run build && npm start
```

Docker: `docker build -t geo-games . && docker run -p 3000:3000 geo-games`.

## Data

`public/data/world.json` and `public/flags/` are generated and committed. To
rebuild them, put the three sources in one directory and run the script:

```
<src>/countries.json      # github.com/mledoze/countries (ODbL)
<src>/world-atlas/        # npm package world-atlas (Natural Earth 1:50m, ISC)
<src>/flag-icons/         # npm package flag-icons (MIT)
```

```bash
npm run data -- <src>
```

Hebrew names come from the ICU data built into Node (`Intl.DisplayNames`),
with a few overrides and extra spellings (ארה״ב, אנגליה, הולנד…) in
`scripts/build-data.mjs`. Land borders come from mledoze/countries, so the
route game follows its view of borders (Spain–Morocco counts, via Ceuta and
Melilla).

## Layout

```
scripts/build-data.mjs    data pipeline (shapes, borders, names, flags)
src/app/                  pages: home + one per game
src/components/Globe.tsx  canvas globe
src/components/games/     the four games
src/components/GamePage   shared shell: daily/practice switch, rules, stats
src/lib/                  pure logic (geo, projection, daily, names, silhouette, heat)
tests/                    node --test, loading src/lib/*.ts through the TS compiler
```
