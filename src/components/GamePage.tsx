"use client";

import { CalendarDays, Dumbbell } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { useHydrated } from "@/hooks/useHydrated";
import { dayKey, dayNumber, practiceSeed } from "@/lib/daily";
import { loadStats, recordDaily, type GameId, type Stats } from "@/lib/storage";
import { useWorld, type World } from "@/lib/world";
import { GAMES } from "@/lib/games";
import FlagsGame from "./games/FlagsGame";
import HotColdGame from "./games/HotColdGame";
import RouteGame from "./games/RouteGame";
import ShapeGame from "./games/ShapeGame";

export interface GameProps {
  world: World;
  /** Same seed, same puzzle. */
  seed: string;
  /** The daily puzzle (kept across refreshes and counted in stats) or a practice round. */
  daily: boolean;
  day: string;
  /** "#315" for the daily puzzle, "תרגול" otherwise — used in share text. */
  tag: string;
  onFinish: (won: boolean) => void;
  /** Start another round (a practice puzzle). */
  onAgain: () => void;
}

const COMPONENTS: Record<GameId, React.ComponentType<GameProps>> = {
  hotcold: HotColdGame,
  route: RouteGame,
  flags: FlagsGame,
  shape: ShapeGame,
};

export default function GamePage({ game }: { game: GameId }) {
  const meta = GAMES[game];
  const { world, error } = useWorld();
  const [mode, setMode] = useState<"daily" | "practice">("daily");
  const [practice, setPractice] = useState(practiceSeed);
  // The day is read in the browser, so the server and client never disagree about it.
  const hydrated = useHydrated();
  const day = hydrated ? dayKey() : null;
  const [recorded, setRecorded] = useState<Stats | null>(null);
  const stats = useMemo(() => recorded ?? (hydrated ? loadStats(game) : null), [recorded, hydrated, game]);

  const onFinish = useCallback(
    (won: boolean) => {
      if (mode === "daily" && day) setRecorded(recordDaily(game, day, won));
    },
    [mode, day, game],
  );

  const again = useCallback(() => {
    setMode("practice");
    setPractice(practiceSeed());
  }, []);

  const Game = COMPONENTS[game];
  const seed = mode === "daily" ? `${game}:${day}` : practice;
  const Icon = meta.icon;

  return (
    <main id="main-content" className="game-page">
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
          <button type="button" role="radio" aria-checked={mode === "daily"} onClick={() => setMode("daily")}>
            <CalendarDays size={16} aria-hidden />
            האתגר היומי{day ? ` #${dayNumber(day)}` : ""}
          </button>
          <button type="button" role="radio" aria-checked={mode === "practice"} onClick={again}>
            <Dumbbell size={16} aria-hidden />
            תרגול
          </button>
        </div>
      </header>

      <details className="rules">
        <summary>איך משחקים?</summary>
        <ul>
          {meta.rules.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      </details>

      {error && <p className="error-box">{error}</p>}
      {!error && (!world || !day) && <div className="loading" aria-busy="true">טוען את העולם…</div>}
      {world && day && (
        <Game
          key={seed}
          world={world}
          seed={seed}
          daily={mode === "daily"}
          day={day}
          tag={mode === "daily" ? `#${dayNumber(day)}` : "תרגול"}
          onFinish={onFinish}
          onAgain={again}
        />
      )}

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
