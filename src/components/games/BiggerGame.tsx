"use client";

import { ArrowLeft } from "lucide-react";
import { useMemo, useState } from "react";
import { rng, shuffle } from "@/lib/daily";
import { GAMES } from "@/lib/games";
import { pool } from "@/lib/pools";
import { midpoint } from "@/lib/projection";
import { useGameState } from "@/lib/useGameState";
import { flagUrl, type Country } from "@/lib/world";
import type { GameProps } from "../GamePage";
import Globe, { type Focus } from "../Globe";
import ResultCard from "../ResultCard";

type Metric = "area" | "pop";

interface State {
  /** Per round: whether the player picked the bigger one. */
  answers: boolean[];
  done: boolean;
  won: boolean;
}

const number = new Intl.NumberFormat("he-IL");
const compact = new Intl.NumberFormat("he-IL", { notation: "compact", maximumFractionDigits: 1 });
const PASS = 5;

export default function BiggerGame({ world, seed, daily, day, tag, options, onFinish, onAgain, metric }: GameProps & { metric: Metric }) {
  const game = metric === "area" ? "bigger" : "population";
  const meta = GAMES[game];
  const value = (c: Country) => (metric === "area" ? c.area : c.pop);
  const format = (c: Country) => (metric === "area" ? `${number.format(c.area)} קמ״ר` : `${compact.format(c.pop)} תושבים`);

  // Pairs from a shuffled pool; no near-ties, which would be a coin toss.
  const pairs = useMemo(() => {
    const list = shuffle(rng(seed), pool(world.countries, options, (c) => Boolean(c.shape) && value(c) > 0, 20));
    const out: [Country, Country][] = [];
    for (let i = 0; i + 1 < list.length; i += 2) {
      const [a, b] = [list[i], list[i + 1]];
      const ratio = Math.max(value(a), value(b)) / Math.max(1, Math.min(value(a), value(b)));
      if (ratio > 1.08) out.push([a, b]);
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [world, seed, metric]);

  const [state, setState] = useGameState<State>(game, day, daily, { answers: [], done: false, won: false });
  const [reviewing, setReviewing] = useState(false);
  const streak = state.answers.filter(Boolean).length;
  const at = reviewing ? state.answers.length - 1 : Math.min(state.answers.length, pairs.length - 1);
  const [a, b] = pairs[at];
  const bigger = value(a) >= value(b) ? a : b;
  const finished = state.done && !reviewing;

  const focus = useMemo<Focus | null>(() => {
    if (!a.center || !b.center) return null;
    const m = midpoint(a.center, b.center);
    return { lon: m.lon, lat: m.lat, zoom: Math.max(1, Math.min(3.5, 90 / (m.angle + 20))) };
  }, [a, b]);

  const choose = (c: Country) => {
    if (reviewing || state.done) return;
    const right = c.id === bigger.id;
    const answers = [...state.answers, right];
    const run = answers.filter(Boolean).length;
    const done = !right || answers.length >= pairs.length;
    setState({ answers, done, won: done && run >= PASS });
    setReviewing(true);
    if (done)
      onFinish({ won: run >= PASS, points: Math.min(100, run * 10), summary: `רצף ${run}`, tags: run >= 10 ? ["10"] : [] });
  };

  const fills = useMemo(() => ({ [a.id]: "var(--route-start)", [b.id]: "var(--route-end)" }), [a, b]);
  const shareText = [`${meta.emoji} ${meta.title} ${tag}: רצף ${streak}`, "🟩".repeat(streak) + (state.done && state.answers.includes(false) ? "🟥" : "")].join("\n");
  const picked = reviewing ? (state.answers[at] ? bigger : bigger.id === a.id ? b : a) : null;

  const card = (c: Country, side: "start" | "end") => (
    <button
      key={c.id}
      type="button"
      className={`versus-card is-${side}${reviewing ? (c.id === bigger.id ? " is-right" : " is-dim") : ""}${picked?.id === c.id ? " is-picked" : ""}`}
      onClick={() => choose(c)}
      disabled={reviewing || state.done}
    >
      {c.flag && <img src={flagUrl(c)} alt="" />}
      <strong>{c.he}</strong>
      <span className="versus-value">{reviewing || finished ? format(c) : "?"}</span>
    </button>
  );

  return (
    <div className="game-layout">
      <div className="game-stage">
        <Globe world={world} fills={fills} outlined={[a.id, b.id]} focus={focus} label={`גלובוס: ${a.he} מול ${b.he}`} />
      </div>
      <div className="game-panel">
        {finished ? (
          <ResultCard
            won={state.won}
            title={`רצף של ${streak}${streak >= 10 ? " — מדהים!" : ""}`}
            shareText={shareText}
            onAgain={onAgain}
            againLabel="רצף חדש"
          >
            <div className="versus">
              {card(a, "start")}
              {card(b, "end")}
            </div>
          </ResultCard>
        ) : (
          <>
            <p className="muted">
              רצף: <strong>{streak}</strong> · {metric === "area" ? "איזו מדינה גדולה יותר בשטח?" : "באיזו מדינה גרים יותר אנשים?"}
            </p>
            <div className="versus">
              {card(a, "start")}
              <span className="versus-or" aria-hidden>
                או
              </span>
              {card(b, "end")}
            </div>
            {reviewing && (
              <div className="flags-feedback" role="status">
                <span className={state.answers[at] ? "good" : "bad"}>
                  {state.answers[at] ? "נכון!" : `לא — ${bigger.he} ${metric === "area" ? "גדולה יותר" : "מאוכלסת יותר"}`}
                </span>
                <button type="button" className="button primary" autoFocus onClick={() => setReviewing(false)}>
                  {state.done ? "לתוצאה" : "הבא"}
                  <ArrowLeft size={18} aria-hidden />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
