"use client";

import { Lightbulb } from "lucide-react";
import { useMemo } from "react";
import { pick, rng } from "@/lib/daily";
import { bearingDeg, centerDistanceKm, compassArrow, compassName, proximityPercent } from "@/lib/geo";
import { GAMES } from "@/lib/games";
import { silhouette } from "@/lib/silhouette";
import { formatKm, useGameState } from "@/lib/useGameState";
import { flagUrl } from "@/lib/world";
import type { GameProps } from "../GamePage";
import CountryInput from "../CountryInput";
import Globe, { focusOn } from "../Globe";
import ResultCard from "../ResultCard";

const MAX_GUESSES = 6;
const HINT_AFTER = 3;

interface State {
  guesses: string[];
  done: boolean;
  won: boolean;
}

export default function ShapeGame({ world, seed, daily, day, tag, onFinish, onAgain }: GameProps) {
  const target = useMemo(() => {
    const pool = world.countries.filter((c) => c.sovereign && c.shape && c.area >= 20000);
    return pick(rng(seed), pool);
  }, [world, seed]);
  const outline = useMemo(() => silhouette(target.shape!), [target]);
  const answerFocus = useMemo(() => focusOn(target), [target]);

  const [state, setState] = useGameState<State>("shape", day, daily, { guesses: [], done: false, won: false });

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
    if (done) onFinish(won);
  };

  const used = useMemo(() => new Set(state.guesses), [state.guesses]);
  const wrong = state.guesses.filter((g) => g !== target.id).length;

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
    f[target.id] = "var(--found)";
    return f;
  }, [state.guesses, target]);

  return (
    <div className="game-layout">
      <div className="game-stage">
        {state.done ? (
          <Globe world={world} fills={fills} focus={answerFocus} label={`גלובוס: ${target.he} מסומנת`} />
        ) : (
          <figure className="silhouette">
            <svg viewBox={outline.viewBox} role="img" aria-label="קווי המתאר של המדינה הסודית">
              <path d={outline.d} fillRule="evenodd" />
            </svg>
          </figure>
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
            <div className="answer-line">
              {target.flag && <img src={flagUrl(target)} alt="" className="flag-sm" />}
              <span>
                {target.he} · {target.continent}
              </span>
              <svg viewBox={outline.viewBox} className="silhouette-mini" aria-hidden>
                <path d={outline.d} fillRule="evenodd" />
              </svg>
            </div>
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
