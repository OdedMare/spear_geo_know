"use client";

import { Lightbulb } from "lucide-react";
import { useMemo } from "react";
import { pick, rng } from "@/lib/daily";
import { bearingDeg, centerDistanceKm, compassArrow, compassName, proximityPercent } from "@/lib/geo";
import { GAMES } from "@/lib/games";
import { silhouette } from "@/lib/silhouette";
import { pool } from "@/lib/pools";
import { shapeScore } from "@/lib/scoring";
import { formatKm, useGameState } from "@/lib/useGameState";
import type { GameProps } from "../GamePage";
import CountryInput from "../CountryInput";
import Globe, { focusOn } from "../Globe";
import CountryCard from "../CountryCard";
import ResultCard from "../ResultCard";

const MAX_GUESSES = 6;
const HINT_AFTER = 3;
const NEIGHBOURS_AFTER = 4;

interface State {
  guesses: string[];
  done: boolean;
  won: boolean;
}

export default function ShapeGame({ world, seed, daily, day, tag, options, onFinish, onAgain }: GameProps) {
  // Easy keeps big, recognisable shapes; hard lets in the small ones too.
  const minArea = options.difficulty === "hard" ? 2000 : options.difficulty === "easy" ? 100000 : 20000;
  const target = useMemo(
    () => pick(rng(seed), pool(world.countries, options, (c) => Boolean(c.shape) && c.area >= minArea)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [world, seed],
  );
  const [state, setState] = useGameState<State>("shape", day, daily, { guesses: [], done: false, won: false });
  const wrong = state.guesses.filter((g) => g !== target.id).length;
  const showNeighbours = wrong >= NEIGHBOURS_AFTER && !state.done && target.borders.length > 0;

  const outline = useMemo(
    () =>
      silhouette(
        target.shape!,
        100,
        6,
        showNeighbours ? target.borders.map((id) => world.byId.get(id)?.shape).filter((x): x is NonNullable<typeof x> => Boolean(x)) : [],
      ),
    [target, showNeighbours, world],
  );
  const answerFocus = useMemo(() => focusOn(target), [target]);

  const rows = state.guesses.map((id) => {
    const c = world.byId.get(id)!;
    const hit = id === target.id;
    const km = hit ? 0 : centerDistanceKm(c, target);
    const bearing = hit || !c.center || !target.center ? 0 : bearingDeg(c.center, target.center);
    return { c, hit, km, bearing, pct: hit ? 100 : proximityPercent(km) };
  });

  const guess = (id: string) => {
    if (state.done) return;
    const guesses = [...state.guesses, id];
    const won = id === target.id;
    const done = won || guesses.length >= MAX_GUESSES;
    setState({ guesses, done, won });
    if (done)
      onFinish({
        won,
        points: shapeScore(guesses.length, won),
        summary: won ? `${guesses.length}/${MAX_GUESSES}` : `X/${MAX_GUESSES}`,
        tags: won && guesses.length === 1 ? ["first-try"] : [],
      });
  };

  const used = useMemo(() => new Set(state.guesses), [state.guesses]);

  const squares = (pct: number) => {
    const full = Math.floor(pct / 20);
    return "🟩".repeat(full) + (pct % 20 >= 10 && full < 5 ? "🟨" : "") + "⬜".repeat(5 - full - (pct % 20 >= 10 && full < 5 ? 1 : 0));
  };
  const shareText = [
    `${GAMES.shape.emoji} צללית ${tag}: ${state.won ? state.guesses.length : "X"}/${MAX_GUESSES}`,
    ...rows.map((r) => `${squares(r.pct)}${r.hit ? "🎉" : compassArrow(r.bearing)}`),
  ].join("\n");

  const fills = useMemo<Record<string, string>>(() => {
    const f: Record<string, string> = {};
    for (const id of state.guesses) f[id] = "var(--reveal)";
    if (state.done) f[target.id] = "var(--found)";
    return f;
  }, [state.guesses, state.done, target]);
  const lastGuess = state.guesses.length ? world.byId.get(state.guesses[state.guesses.length - 1]) : undefined;
  const guessFocus = useMemo(() => (lastGuess ? focusOn(lastGuess, 1.4) : null), [lastGuess]);

  return (
    <div className="game-layout">
      <div className="game-stage">
        {state.done ? (
          <Globe world={world} fills={fills} focus={answerFocus} label={`גלובוס: ${target.he} מסומנת`} />
        ) : (
          <div className="shape-stage">
            <figure className="silhouette">
              <svg viewBox={outline.viewBox} role="img" aria-label="קווי המתאר של המדינה הסודית">
                {outline.context && <path className="silhouette-context" d={outline.context} fillRule="evenodd" />}
                <path d={outline.d} fillRule="evenodd" />
              </svg>
              {showNeighbours && <figcaption className="muted small">רמז: השכנות מופיעות סביב הצללית</figcaption>}
            </figure>
            <div className="globe-mini">
              <Globe world={world} fills={fills} focus={guessFocus} spin={!lastGuess} label="גלובוס עם המדינות שניחשתם" />
            </div>
          </div>
        )}
      </div>

      <div className="game-panel">
        {!state.done ? (
          <>
            <CountryInput countries={world.mapped} used={used} onPick={(c) => guess(c.id)} />
            <p className="muted">
              ניחוש {state.guesses.length + 1} מתוך {MAX_GUESSES}
            </p>
            {wrong >= HINT_AFTER && (
              <p className="hint-box">
                <Lightbulb size={16} aria-hidden /> רמז: המדינה נמצאת ב{target.continent}.
              </p>
            )}
          </>
        ) : (
          <ResultCard
            won={state.won}
            title={state.won ? `נכון! ${target.he}` : `התשובה: ${target.he}`}
            shareText={shareText}
            onAgain={onAgain}
            againLabel="צללית חדשה"
          >
            {state.won && (
              <p className="score-line">
                <strong>{shapeScore(state.guesses.length, true)}</strong> נקודות · ניחוש {state.guesses.length}
              </p>
            )}
            <CountryCard country={target} world={world} />
          </ResultCard>
        )}

        <ol className="shape-rows" aria-label="הניחושים">
          {rows.map((r) => (
            <li key={r.c.id} className={r.hit ? "is-hit" : undefined}>
              <span className="guess-name">{r.c.he}</span>
              <span className="shape-km">{r.hit ? "🎯" : formatKm(r.km)}</span>
              <span className="shape-dir" aria-label={r.hit ? "כאן" : `כיוון: ${compassName(r.bearing)}`}>
                {r.hit ? "🎉" : <span className="arrow" style={{ transform: `rotate(${r.bearing}deg)` }}>↑</span>}
              </span>
              <span className="shape-pct">{r.pct}%</span>
            </li>
          ))}
          {Array.from({ length: Math.max(0, MAX_GUESSES - rows.length) }, (_, i) => (
            <li key={`empty-${i}`} className="is-empty" aria-hidden>
              <span className="guess-name">&nbsp;</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
