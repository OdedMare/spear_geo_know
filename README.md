# גלובוס — משחקי גיאוגרפיה לצוות

Twelve daily geography games for the team, around a 3D globe. Everyone who
opens a game on the same day (Israel time) gets the same puzzle, every daily
game is worth up to 100 points, and a team table shows who leads today and
who is champion of the week.

### On the globe
| Game | Route | What you do |
|---|---|---|
| **חם וקר** | `/hot-cold` | Find the secret country. Each guess is painted by border distance from the answer, pale (far) to dark red (close). Fewer guesses, more points. |
| **מסלול** | `/route` | Name the countries on the shortest land route between two countries. **The contest is the fewest countries**: a route of exactly the minimum with no hints is ⭐⭐⭐ and 100 points; every extra country and every hint costs points. Guessed neighbours join up on the globe as the route grows. |
| **הצבע על המפה** | `/pin` | Five countries; tap where each one is on the globe. Inside it is 100, then points fall with distance from its border. |
| **השכנים** | `/neighbors` | Name every country that borders the one marked. Three mistakes end it. |
| **החוליה החסרה** | `/chain` | A chain of bordering countries with one missing; name any country that borders both sides of the gap. |
| **צללית** | `/shape` | Identify a country from its outline in six guesses: distance, direction and proximity after each; the continent after three misses, the neighbours drawn around it after four. |

### Flags and capitals
| Game | Route | What you do |
|---|---|---|
| **דגלים** | `/flags` | Ten rounds: flag → country and country → flag. The globe turns to each answer. |
| **ריצת דגלים** | `/flag-rush` | As many flags as you can in 60 seconds; a mistake costs 5 seconds. |
| **בירות** | `/capitals` | Ten rounds: country → capital and capital → country (Hebrew names). |

### Knowledge and speed
| Game | Route | What you do |
|---|---|---|
| **גדול או קטן** | `/bigger` | Which of two countries is bigger by area? A streak until the first mistake. |
| **מי יותר מאוכלסת** | `/population` | The same, by population (Natural Earth, 2019 estimates). |
| **יבשת בדקה** | `/continent` | A country → its continent, as many as you can in 60 seconds. |

### For the team
- **Team table** (`/leaderboard`): each daily result is sent under the player's name. Today per game and in total, and the week (Sunday to Saturday) with its champion. One result per person, game and day; the first counts.
- **Challenge a friend**: every result card copies a link to the exact same puzzle (also for practice rounds, with their settings).
- **Practice mode** with difficulty (easy keeps the best-known countries, hard has them all) and a continent filter.
- **Badges** (17), kept per browser and shown on the home page.
- At the end of a game, a card about the country: continent, capital, area, population, land neighbours.

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
npm run build      # static site in out/
npm start          # site + team table on http://localhost:3000 (node serve.mjs, no dependencies)
```

The team table is the only part with a server: `serve.mjs` answers
`/api/scores` and keeps results in `data/scores.json` (set `GEO_DATA_DIR` to
put it elsewhere, e.g. a mounted volume). Served any other way (nginx, IIS,
`npm run dev`), the games work and the table says it is not available.

Docker: `docker build -t geo-games . && docker run -p 3000:3000 -v geo-scores:/app/data geo-games` (the volume keeps the team table).

## Closed networks (no internet)

The app makes no request outside its own site. Everything it shows is in the
repository and served by the app itself:

- `public/data/world.json` — every country: Hebrew and English names, outline, land borders, continent, capital (Hebrew), area, population
- `public/flags/*.svg` — 249 flags
- `public/fonts/*.woff2` — Inter and Noto Sans Hebrew (OFL-1.1)

On a closed network you only need npm (an internal registry mirror is enough)
to install and build. After `npm run build`, `out/` is a plain static site:
serve it with `npm start`, or point nginx / IIS / `python3 -m http.server
--directory out` at it. It cannot be opened from `file://` by double-clicking
`index.html`, because browsers block loading the country data that way.

Only `npm run data` (rebuilding the data) needs the upstream sources below.

## Data

`public/data/world.json` and `public/flags/` are generated and committed. To
rebuild them, put the three sources in one directory and run the script:

```
<src>/countries.json      # github.com/mledoze/countries (ODbL)
<src>/world-atlas/        # npm package world-atlas (Natural Earth 1:50m, ISC)
<src>/flag-icons/         # npm package flag-icons (MIT)
<src>/ne50.geojson        # Natural Earth ne_50m_admin_0_countries (public domain), for population
```

Hebrew capital names are in `scripts/capitals-he.json` (Palestine is left out
of the capitals game on purpose: its capital is disputed).

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
src/components/Globe.tsx  canvas globe: lighting, atmosphere, lines, markers, tap-to-pick
src/components/games/     the twelve games (FlagsGame also serves capitals, TimedQuiz the two timed games)
src/components/GamePage   shared shell: daily/practice/challenge, options, rules, stats, badges
src/components/Leaderboard, TeamPanel   the team table
src/lib/                  pure logic (geo, projection, daily, names, pools, scoring, badges, silhouette, heat)
serve.mjs                 static server + /api/scores, no dependencies
tests/                    node --test, loading src/lib/*.ts through the TS compiler
```
