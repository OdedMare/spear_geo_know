"use client";

import { CalendarDays, Dumbbell, Swords } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { useHydrated } from "@/hooks/useHydrated";
import { newBadges, type Badge } from "@/lib/badges";
import { dayKey, dayNumber, practiceSeed } from "@/lib/daily";
import { GAME_LIST, GAMES } from "@/lib/games";
import { CONTINENTS, DAILY_OPTIONS, DIFFICULTY_LABEL, optionsFromQuery, optionsToQuery, type Difficulty, type Options } from "@/lib/pools";
import {
  dailyStatus,
  loadJSON,
  loadResult,
  loadStats,
  recordDaily,
  saveJSON,
  saveResult,
  type GameId,
  type GameResult,
  type Stats,
} from "@/lib/storage";
import { useWorld, type World } from "@/lib/world";
import { ChallengeContext } from "./ResultCard";
import TeamPanel from "./TeamPanel";
import BiggerGame from "./games/BiggerGame";
import CapitalsGame from "./games/CapitalsGame";
import ChainGame from "./games/ChainGame";
import ContinentGame from "./games/ContinentGame";
import FlagRushGame from "./games/FlagRushGame";
import FlagsGame from "./games/FlagsGame";
import HotColdGame from "./games/HotColdGame";
import NeighborsGame from "./games/NeighborsGame";
import PinGame from "./games/PinGame";
import RouteGame from "./games/RouteGame";
import ShapeGame from "./games/ShapeGame";

export interface GameProps {
  world: World;
  /** Same seed, same puzzle. */
  seed: string;
  /** The daily puzzle (kept across refreshes and counted in stats) or not. */
  daily: boolean;
  day: string;
  /** "#315" for the daily puzzle, "תרגול" or "אתגר" otherwise — used in share text. */
  tag: string;
  options: Options;
  onFinish: (result: GameResult) => void;
  /** Start another round (a practice puzzle). */
  onAgain: () => void;
}

const COMPONENTS: Record<GameId, React.ComponentType<GameProps>> = {
  hotcold: HotColdGame,
  route: RouteGame,
  flags: FlagsGame,
  shape: ShapeGame,
  pin: PinGame,
  neighbors: NeighborsGame,
  bigger: (p) => <BiggerGame {...p} metric="area" />,
  population: (p) => <BiggerGame {...p} metric="pop" />,
  continent: ContinentGame,
  chain: ChainGame,
  flagrush: FlagRushGame,
  capitals: CapitalsGame,
};

type Mode = "daily" | "practice" | "challenge";

export default function GamePage({ game }: { game: GameId }) {
  const meta = GAMES[game];
  const { world, error } = useWorld();
  const hydrated = useHydrated();
  // The day and the link are read in the browser, so the server render never disagrees.
  const day = hydrated ? dayKey() : null;
  const query = useMemo(() => (hydrated ? new URLSearchParams(window.location.search) : null), [hydrated]);
  const challengeSeed = query?.get("seed") ?? null;

  const [chosen, setChosen] = useState<Mode | null>(null);
  const mode: Mode = chosen ?? (challengeSeed ? "challenge" : "daily");
  const [practice, setPractice] = useState(practiceSeed);
  const [practiceOptions, setPracticeOptions] = useState<Options>(DAILY_OPTIONS);
  const [recorded, setRecorded] = useState<Stats | null>(null);
  const [finished, setFinished] = useState<GameResult | null>(null);
  const [earned, setEarned] = useState<Badge[]>([]);

  const stats = useMemo(() => recorded ?? (hydrated ? loadStats(game) : null), [recorded, hydrated, game]);
  const options = mode === "daily" ? DAILY_OPTIONS : mode === "challenge" && query ? optionsFromQuery(query) : practiceOptions;
  const seed = mode === "daily" ? `${game}:${day}` : mode === "challenge" ? challengeSeed! : practice;

  const onFinish = useCallback(
    (result: GameResult) => {
      if (!day) return;
      const daily = mode === "daily";
      if (daily) {
        setRecorded(recordDaily(game, day, result.won));
        saveResult(game, day, result);
        setFinished(result);
      }
      const played = new Set(loadJSON<string[]>("geo.played") ?? []);
      played.add(game);
      saveJSON("geo.played", [...played]);

      const held = loadJSON<Record<string, string>>("geo.badges") ?? {};
      const fresh = newBadges(
        {
          game,
          daily,
          won: result.won,
          points: result.points,
          tags: result.tags ?? [],
          bestStreak: Math.max(...GAME_LIST.map((g) => loadStats(g.id).streak)),
          doneToday: GAME_LIST.filter((g) => g.id === game ? daily : dailyStatus(g.id, day)?.done).map((g) => g.id),
          playedEver: [...played],
          allGames: GAME_LIST.map((g) => g.id),
        },
        held,
      );
      if (fresh.length) {
        for (const b of fresh) held[b.id] = day;
        saveJSON("geo.badges", held);
        setEarned(fresh);
      }
    },
    [mode, day, game],
  );

  const again = useCallback(() => {
    setChosen("practice");
    setPractice(practiceSeed());
    setEarned([]);
  }, []);

  const setOption = (o: Partial<Options>) => {
    setPracticeOptions((cur) => ({ ...cur, ...o }));
    setPractice(practiceSeed());
  };

  const Game = COMPONENTS[game];
  const Icon = meta.icon;
  const challengeUrl =
    hydrated && day
      ? `${window.location.origin}${meta.href}/?seed=${encodeURIComponent(seed)}${optionsToQuery(options) ? `&${optionsToQuery(options)}` : ""}`
      : null;
  // One object per finish, so the team panel sends it once.
  const dailyResult = useMemo(
    () => (mode === "daily" && day ? finished ?? loadResult(game, day) : null),
    [mode, day, finished, game],
  );

  return (
    <main id="main-content" className="game-page" style={{ ["--accent" as string]: meta.color, ["--tint" as string]: meta.tint }}>
      <header className="game-head">
        <div className="game-title">
          <span className="game-icon" style={{ background: meta.tint, color: meta.color }}>
            <Icon size={22} aria-hidden />
          </span>
          <div>
            <h1>{meta.title}</h1>
            <p className="muted">{meta.tagline}</p>
          </div>
        </div>
        <div className="segmented" role="radiogroup" aria-label="סוג משחק">
          <button type="button" role="radio" aria-checked={mode === "daily"} onClick={() => setChosen("daily")}>
            <CalendarDays size={16} aria-hidden />
            האתגר היומי{day ? ` #${dayNumber(day)}` : ""}
          </button>
          <button type="button" role="radio" aria-checked={mode === "practice"} onClick={again}>
            <Dumbbell size={16} aria-hidden />
            תרגול
          </button>
          {challengeSeed && (
            <button type="button" role="radio" aria-checked={mode === "challenge"} onClick={() => setChosen("challenge")}>
              <Swords size={16} aria-hidden />
              אתגר מחבר
            </button>
          )}
        </div>
      </header>

      {mode === "practice" && (
        <div className="options-bar" aria-label="הגדרות תרגול">
          <div className="segmented small" role="radiogroup" aria-label="רמת קושי">
            {(["easy", "normal", "hard"] as Difficulty[]).map((d) => (
              <button key={d} type="button" role="radio" aria-checked={practiceOptions.difficulty === d} onClick={() => setOption({ difficulty: d })}>
                {DIFFICULTY_LABEL[d]}
              </button>
            ))}
          </div>
          {meta.continentFilter && (
            <label className="options-continent">
              <span className="field-label">יבשת</span>
              <select value={practiceOptions.continent ?? ""} onChange={(e) => setOption({ continent: e.target.value || null })}>
                <option value="">כל העולם</option>
                {CONTINENTS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      )}
      {mode === "challenge" && <p className="challenge-note">קיבלתם אתגר: אותו פאזל בדיוק שחבר שלכם שיחק. בהצלחה!</p>}

      <details className="rules">
        <summary>איך משחקים?</summary>
        <ul>
          {meta.rules.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      </details>

      {earned.length > 0 && (
        <div className="badge-toast" role="status">
          {earned.map((b) => (
            <span key={b.id}>
              <span aria-hidden>{b.emoji}</span> תג חדש: <strong>{b.title}</strong>
            </span>
          ))}
        </div>
      )}

      {error && <p className="error-box">{error}</p>}
      {!error && (!world || !day) && <div className="loading" aria-busy="true">טוען את העולם…</div>}
      {world && day && (
        <ChallengeContext.Provider value={challengeUrl}>
          <Game
            key={`${seed}|${options.difficulty}|${options.continent}`}
            world={world}
            seed={seed}
            daily={mode === "daily"}
            day={day}
            tag={mode === "daily" ? `#${dayNumber(day)}` : mode === "challenge" ? "אתגר" : "תרגול"}
            options={options}
            onFinish={onFinish}
            onAgain={again}
          />
        </ChallengeContext.Provider>
      )}

      {day && dailyResult && <TeamPanel game={game} day={day} result={dailyResult} />}

      {stats && stats.played > 0 && (
        <dl className="stats-row" aria-label="הסטטיסטיקה שלי באתגר היומי">
          <div>
            <dt>שוחקו</dt>
            <dd>{stats.played}</dd>
          </div>
          <div>
            <dt>הצלחות</dt>
            <dd>{Math.round((100 * stats.won) / stats.played)}%</dd>
          </div>
          <div>
            <dt>רצף</dt>
            <dd>{stats.streak}</dd>
          </div>
          <div>
            <dt>שיא</dt>
            <dd>{stats.best}</dd>
          </div>
        </dl>
      )}
    </main>
  );
}
