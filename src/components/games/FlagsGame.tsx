"use client";

import { ArrowLeft, Check, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { rng, shuffle } from "@/lib/daily";
import { GAMES } from "@/lib/games";
import { useGameState } from "@/lib/useGameState";
import { flagUrl, type Country, type World } from "@/lib/world";
import type { GameProps } from "../GamePage";
import ResultCard from "../ResultCard";

const ROUNDS = 10;
const PASS = 7;
const LETTERS = ["א", "ב", "ג", "ד"];

interface Round {
  answer: Country;
  options: Country[];
  /** "flag": show a flag, choose the name. "name": show a name, choose the flag. */
  kind: "flag" | "name";
}

function buildRounds(world: World, seed: string): Round[] {
  const random = rng(seed);
  const pool = world.countries.filter((c) => c.sovereign && c.flag);
  return shuffle(random, pool)
    .slice(0, ROUNDS)
    .map((answer, i) => {
      // Wrong options come from the same continent first: that is where flags look alike.
      const near = shuffle(random, pool.filter((c) => c.id !== answer.id && c.continent === answer.continent));
      const far = shuffle(random, pool.filter((c) => c.id !== answer.id && c.continent !== answer.continent));
      const wrong = [...near, ...far].slice(0, 3);
      return { answer, options: shuffle(random, [answer, ...wrong]), kind: i % 2 === 0 ? "flag" : "name" };
    });
}

interface State {
  picks: string[];
  done: boolean;
  won: boolean;
}

export default function FlagsGame({ world, seed, daily, day, tag, onFinish, onAgain }: GameProps) {
  const rounds = useMemo(() => buildRounds(world, seed), [world, seed]);
  const [state, setState] = useGameState<State>("flags", day, daily, { picks: [], done: false, won: false });
  // True while the answer just given is on screen, before "next".
  const [reviewing, setReviewing] = useState(false);
  const nextRef = useRef<HTMLButtonElement>(null);

  const score = state.picks.filter((p, i) => p === rounds[i].answer.id).length;

  useEffect(() => {
    if (reviewing) nextRef.current?.focus();
  }, [reviewing]);

  const choose = (c: Country) => {
    if (reviewing || state.done) return;
    const picks = [...state.picks, c.id];
    const done = picks.length === ROUNDS;
    const won = done && picks.filter((p, i) => p === rounds[i].answer.id).length >= PASS;
    setState({ picks, done, won });
    setReviewing(true);
    if (done) onFinish(won);
  };

  const shareText = [
    `${GAMES.flags.emoji} דגלים ${tag}: ${score}/${ROUNDS}`,
    state.picks.map((p, i) => (p === rounds[i].answer.id ? "🟩" : "🟥")).join(""),
  ].join("\n");

  if (state.done && !reviewing) {
    return (
      <div className="game-single">
        <ResultCard
          won={state.won}
          title={`${score} מתוך ${ROUNDS}${score === ROUNDS ? " — מושלם!" : score >= PASS ? " — כל הכבוד!" : ""}`}
          shareText={shareText}
          onAgain={onAgain}
          againLabel="עוד עשרה דגלים"
        >
          <ul className="flag-review">
            {rounds.map((r, i) => {
              const right = state.picks[i] === r.answer.id;
              return (
                <li key={r.answer.id} className={right ? "is-right" : "is-wrong"}>
                  <img src={flagUrl(r.answer)} alt="" className="flag-sm" />
                  <span>{r.answer.he}</span>
                  {right ? <Check size={16} aria-label="נכון" /> : <X size={16} aria-label="טעות" />}
                </li>
              );
            })}
          </ul>
        </ResultCard>
      </div>
    );
  }

  const at = reviewing ? state.picks.length - 1 : state.picks.length;
  const r = rounds[at];
  const picked = reviewing ? state.picks[at] : null;
  const right = picked === r.answer.id;

  const optionClass = (c: Country) => {
    if (!reviewing) return "option";
    if (c.id === r.answer.id) return "option is-right";
    if (c.id === picked) return "option is-wrong";
    return "option is-dim";
  };

  return (
    <div className="game-single">
      <div className="flags-top">
        <div className="progress" role="progressbar" aria-label="התקדמות" aria-valuemin={1} aria-valuemax={ROUNDS} aria-valuenow={at + 1}>
          {rounds.map((rr, i) => (
            <span
              key={rr.answer.id}
              className={
                i < state.picks.length
                  ? state.picks[i] === rr.answer.id
                    ? "dot is-right"
                    : "dot is-wrong"
                  : i === at
                    ? "dot is-current"
                    : "dot"
              }
            />
          ))}
        </div>
        <span className="muted">
          סבב {at + 1} מתוך {ROUNDS} · {score} נכונות
        </span>
      </div>

      {r.kind === "flag" ? (
        <section className="flag-question">
          <h2>של איזו מדינה הדגל הזה?</h2>
          <img src={flagUrl(r.answer)} alt="הדגל שצריך לזהות" className="flag-hero" />
          <div className="options-grid">
            {r.options.map((c) => (
              <button key={c.id} type="button" className={optionClass(c)} onClick={() => choose(c)} disabled={reviewing}>
                {c.he}
              </button>
            ))}
          </div>
        </section>
      ) : (
        <section className="flag-question">
          <h2>
            איזה מהדגלים של <strong>{r.answer.he}</strong>?
          </h2>
          <div className="options-grid flags">
            {r.options.map((c, i) => (
              <button
                key={c.id}
                type="button"
                className={optionClass(c)}
                onClick={() => choose(c)}
                disabled={reviewing}
                aria-label={reviewing ? `הדגל של ${c.he}` : `דגל ${LETTERS[i]}`}
              >
                <img src={flagUrl(c)} alt="" />
                {reviewing && <span className="option-caption">{c.he}</span>}
              </button>
            ))}
          </div>
        </section>
      )}

      {reviewing && (
        <div className="flags-feedback" role="status">
          <span className={right ? "good" : "bad"}>
            {right ? "נכון!" : r.kind === "flag" ? `לא — זה הדגל של ${r.answer.he}` : "לא — הדגל הנכון מסומן בירוק"}
          </span>
          <button type="button" className="button primary" ref={nextRef} onClick={() => setReviewing(false)}>
            {state.done ? "לתוצאה" : "הבא"}
            <ArrowLeft size={18} aria-hidden />
          </button>
        </div>
      )}
    </div>
  );
}
