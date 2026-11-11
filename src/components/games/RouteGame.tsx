"use client";

import { ArrowLeft, Flag, Lightbulb } from "lucide-react";
import { useMemo, useState } from "react";
import { pick, rng } from "@/lib/daily";
import { bfsDistances, connectsThrough, shortestPath } from "@/lib/geo";
import { GAMES } from "@/lib/games";
import { midpoint } from "@/lib/projection";
import { pool } from "@/lib/pools";
import { routeScore, starsText } from "@/lib/scoring";
import { useGameState } from "@/lib/useGameState";
import { flagUrl, type Country, type World } from "@/lib/world";
import type { GameProps } from "../GamePage";
import CountryInput from "../CountryInput";
import Globe, { type Focus, type GlobeLine } from "../Globe";
import ResultCard from "../ResultCard";
import type { Options } from "@/lib/pools";

interface State {
  guesses: string[];
  hints: string[];
  done: boolean;
  won: boolean;
}

const EXTRA_GUESSES = 4;
const MIN_STEPS = 3; // at least two countries in between
const MAX_STEPS = 6;

const onLand = (c: Country) => Boolean(c.shape) && c.area >= 1000 && c.borders.length > 0;

function choosePair(world: World, seed: string, options: Options) {
  const random = rng(seed);
  // A continent too small for a route (Oceania) falls back to the whole world.
  for (const eligible of [pool(world.countries, options, onLand), pool(world.countries, { ...options, continent: null }, onLand)]) {
    for (let attempt = 0; attempt < 300; attempt++) {
      const start = pick(random, eligible);
      const dist = bfsDistances(start.id, world.neighbours);
      const ends = eligible.filter((c) => {
        const d = dist.get(c.id);
        return d !== undefined && d >= MIN_STEPS && d <= MAX_STEPS;
      });
      if (ends.length) return { start, end: pick(random, ends) };
    }
  }
  throw new Error("no route found");
}

type Verdict = "good" | "close" | "far";

export default function RouteGame({ world, seed, daily, day, tag, options, onFinish, onAgain }: GameProps) {
  const route = useMemo(() => {
    const { start, end } = choosePair(world, seed, options);
    const fromStart = bfsDistances(start.id, world.neighbours);
    const fromEnd = bfsDistances(end.id, world.neighbours);
    const steps = fromStart.get(end.id)!;
    const m = midpoint(start.center!, end.center!);
    return { start, end, fromStart, fromEnd, steps, focus: { lon: m.lon, lat: m.lat, zoom: Math.max(1, Math.min(5, 90 / (m.angle + 12))) } };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [world, seed]);
  const { start, end, fromStart, fromEnd, steps } = route;
  const minimum = steps - 1;
  const allowed = minimum + EXTRA_GUESSES;

  const [state, setState] = useGameState<State>("route", day, daily, { guesses: [], hints: [], done: false, won: false });
  const [focus] = useState<Focus>(route.focus);

  const verdict = (id: string): Verdict => {
    const a = fromStart.get(id);
    const b = fromEnd.get(id);
    if (a === undefined || b === undefined) return "far";
    if (a + b === steps) return "good";
    if (a + b === steps + 1) return "close";
    return "far";
  };

  const solution = useMemo(() => shortestPath(start.id, end.id, world.neighbours) ?? [], [start, end, world]);

  const guess = (c: Country) => {
    if (state.done || c.id === start.id || c.id === end.id) return;
    const guesses = [...state.guesses, c.id];
    const won = connectsThrough(start.id, end.id, new Set(guesses), world.neighbours);
    const done = won || guesses.length >= allowed;
    setState((s) => ({ ...s, guesses, done, won }));
    if (done) {
      const score = routeScore(minimum, guesses.length, state.hints.length, won);
      onFinish({
        won,
        points: score.points,
        summary: won ? `${starsText(score.stars)} ${guesses.length} מדינות (מינימום ${minimum})` : "לא הגיע/ה",
        tags: score.perfect ? ["perfect"] : [],
      });
    }
  };

  const hint = () => {
    // The next missing country along a shortest route that uses what is already guessed.
    const have = new Set([...state.guesses, ...state.hints]);
    const path = shortestPath(start.id, end.id, (id) =>
      world.neighbours(id).filter((n) => {
        const a = fromStart.get(n);
        const b = fromEnd.get(n);
        return a !== undefined && b !== undefined && a + b === steps;
      }),
    );
    const next = (path ?? solution).find((id) => id !== start.id && id !== end.id && !have.has(id));
    if (next) setState((s) => ({ ...s, hints: [...s.hints, next] }));
  };

  const giveUp = () => {
    setState((s) => ({ ...s, done: true, won: false }));
    onFinish({ won: false, points: 0, summary: "ויתר/ה" });
  };

  const score = routeScore(minimum, state.guesses.length, state.hints.length, state.won);

  // The route on the globe: every pair of known countries that share a border
  // is joined, so the player sees the network grow towards the end.
  const lines = useMemo<GlobeLine[]>(() => {
    const known = [start, end, ...state.guesses.map((id) => world.byId.get(id)!)];
    const winning = state.won
      ? new Set(shortestPath(start.id, end.id, (id) => world.neighbours(id).filter((n) => n === end.id || state.guesses.includes(n))) ?? [])
      : new Set<string>();
    const shown = state.done && !state.won ? solution.map((id) => world.byId.get(id)!) : known;
    const out: GlobeLine[] = [];
    for (let i = 0; i < shown.length; i++)
      for (let j = i + 1; j < shown.length; j++) {
        const a = shown[i];
        const b = shown[j];
        if (!a.center || !b.center || !a.borders.includes(b.id)) continue;
        const onPath = winning.has(a.id) && winning.has(b.id);
        out.push({ from: a.center, to: b.center, colour: onPath ? "var(--found)" : "var(--globe-line)", dashed: !onPath && !state.done });
      }
    return out;
  }, [start, end, state.guesses, state.won, state.done, solution, world]);

  const fills = useMemo(() => {
    const f: Record<string, string> = {};
    for (const id of state.hints) f[id] = "var(--hint)";
    if (state.done && !state.won) for (const id of solution) f[id] = "var(--reveal)";
    for (const id of state.guesses) f[id] = `var(--route-${verdict(id)})`;
    f[start.id] = "var(--route-start)";
    f[end.id] = "var(--route-end)";
    return f;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, solution, start, end]);

  const used = useMemo(() => new Set([...state.guesses, start.id, end.id]), [state.guesses, start, end]);
  const nameable = useMemo(() => {
    const known = new Set([...state.guesses, start.id, end.id, ...(state.done ? solution : [])]);
    return (c: Country) => known.has(c.id);
  }, [state.guesses, state.done, start, end, solution]);

  const emoji = { good: "🟩", close: "🟧", far: "🟥" } as const;
  const shareText = [
    `${GAMES.route.emoji} מסלול ${tag}: ${start.he} ← ${end.he}`,
    state.won
      ? `${starsText(score.stars)} ${state.guesses.length} מדינות (מינימום ${minimum})${state.hints.length ? ` · 💡×${state.hints.length}` : ""} · ${score.points} נק׳`
      : "לא הגעתי הפעם",
    state.guesses.map((id) => emoji[verdict(id)]).join(""),
  ].join("\n");

  const label = (c: Country) => (
    <span className="route-end-chip">
      {c.flag && <img src={flagUrl(c)} alt="" className="flag-xs" />}
      {c.he}
    </span>
  );

  return (
    <div className="game-layout">
      <div className="game-stage">
        <Globe
          world={world}
          fills={fills}
          outlined={[start.id, end.id]}
          lines={lines}
          focus={focus}
          nameable={nameable}
          label={`גלובוס: מסלול מ${start.he} אל ${end.he}`}
        />
      </div>

      <div className="game-panel">
        <div className="route-head">
          {label(start)}
          <ArrowLeft size={20} aria-label="אל" />
          {label(end)}
        </div>
        <p className="muted">
          במסלול הקצר ביותר יש {minimum} {minimum === 1 ? "מדינה" : "מדינות"} בדרך. ניחושים: {state.guesses.length} מתוך {allowed}.
        </p>
        <p className="route-target">
          🎯 היעד ל־⭐⭐⭐: <strong>{minimum}</strong> {minimum === 1 ? "מדינה" : "מדינות"} בדיוק, בלי רמזים
        </p>

        {!state.done ? (
          <>
            <CountryInput countries={world.mapped} used={used} onPick={guess} />
            <div className="panel-row">
              <button type="button" className="button ghost small" onClick={hint}>
                <Lightbulb size={16} aria-hidden />
                רמז
              </button>
              <button type="button" className="button ghost small" onClick={giveUp}>
                <Flag size={16} aria-hidden />
                ויתור
              </button>
            </div>
          </>
        ) : (
          <ResultCard
            won={state.won}
            title={state.won ? (score.perfect ? "מסלול מושלם! ⭐⭐⭐" : `הגעתם ליעד! ${starsText(score.stars)}`) : "הפעם לא הגעתם"}
            shareText={shareText}
            onAgain={onAgain}
            againLabel="מסלול חדש"
          >
            {state.won && (
              <p className="score-line">
                <strong>{score.points}</strong> נקודות · {state.guesses.length} מדינות, המינימום {minimum}
                {state.hints.length > 0 && ` · ${state.hints.length} רמזים (−${10 * state.hints.length})`}
              </p>
            )}
            <p>
              מסלול קצר: {solution.map((id) => world.byId.get(id)!.he).join(" ← ")}
            </p>
          </ResultCard>
        )}

        <ol className="guess-list" aria-label="הניחושים">
          {state.guesses.map((id) => {
            const v = verdict(id);
            return (
              <li key={id}>
                <span className="swatch" style={{ background: `var(--route-${v})` }} aria-hidden />
                <span className="guess-name">{world.byId.get(id)!.he}</span>
                <span className="guess-meta">{v === "good" ? "על המסלול" : v === "close" ? "עיקוף קטן" : "רחוק מהמסלול"}</span>
              </li>
            );
          })}
        </ol>
        {state.hints.length > 0 && !state.done && (
          <p className="muted small">💡 המדינה המסומנת בצבע הרמז היא הבאה במסלול — מה שמה?</p>
        )}
      </div>
    </div>
  );
}
