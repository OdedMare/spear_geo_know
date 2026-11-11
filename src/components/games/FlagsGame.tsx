"use client";

import { ArrowLeft, Check, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { rng, shuffle } from "@/lib/daily";
import { GAMES } from "@/lib/games";
import { pool, type Options } from "@/lib/pools";
import type { GameId } from "@/lib/storage";
import { useGameState } from "@/lib/useGameState";
import { flagUrl, type Country, type World } from "@/lib/world";
import type { GameProps } from "../GamePage";
import ResultCard from "../ResultCard";
import { AnswerGlobe, Choices, distractors } from "./shared";

const ROUNDS = 10;
const PASS = 7;

/**
 * Flags: show a flag → pick the country, or show a country → pick its flag.
 * Capitals: show a country → pick its capital, or show a capital → pick the country.
 */
type Kind = "flag" | "name" | "capital" | "city";
type Variant = "flags" | "capitals";

interface Round {
  answer: Country;
  options: Country[];
  kind: Kind;
}

function buildRounds(world: World, seed: string, variant: Variant, options: Options): Round[] {
  const random = rng(seed);
  const from = pool(world.countries, options, (c) => (variant === "flags" ? c.flag : Boolean(c.capital)), 12);
  const kinds: Kind[] = variant === "flags" ? ["flag", "name"] : ["capital", "city"];
  return shuffle(random, from)
    .slice(0, ROUNDS)
    .map((answer, i) => ({
      answer,
      options: shuffle(random, [answer, ...distractors(random, answer, from)]),
      kind: kinds[i % 2],
    }));
}

interface State {
  picks: string[];
  done: boolean;
  won: boolean;
}

function Question({ r }: { r: Round }) {
  switch (r.kind) {
    case "flag":
      return (
        <>
          <h2>של איזו מדינה הדגל הזה?</h2>
          <img src={flagUrl(r.answer)} alt="הדגל שצריך לזהות" className="flag-hero" />
        </>
      );
    case "name":
      return (
        <h2>
          איזה מהדגלים של <strong>{r.answer.he}</strong>?
        </h2>
      );
    case "capital":
      return (
        <>
          <h2>
            מה הבירה של <strong>{r.answer.he}</strong>?
          </h2>
          {r.answer.flag && <img src={flagUrl(r.answer)} alt="" className="flag-md" />}
        </>
      );
    case "city":
      return (
        <h2>
          <strong>{r.answer.capital}</strong> היא הבירה של…
        </h2>
      );
  }
}

export function QuizRounds({ world, seed, daily, day, tag, options, onFinish, onAgain, variant }: GameProps & { variant: Variant }) {
  const game: GameId = variant;
  const meta = GAMES[game];
  const rounds = useMemo(
    () => buildRounds(world, seed, variant, options),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [world, seed, variant],
  );
  const [state, setState] = useGameState<State>(game, day, daily, { picks: [], done: false, won: false });
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
    const right = picks.filter((p, i) => p === rounds[i].answer.id).length;
    const won = done && right >= PASS;
    setState({ picks, done, won });
    setReviewing(true);
    if (done) onFinish({ won, points: right * 10, summary: `${right}/${ROUNDS}` });
  };

  const shareText = [
    `${meta.emoji} ${meta.title} ${tag}: ${score}/${ROUNDS}`,
    state.picks.map((p, i) => (p === rounds[i].answer.id ? "🟩" : "🟥")).join(""),
  ].join("\n");

  const at = reviewing ? state.picks.length - 1 : Math.min(state.picks.length, ROUNDS - 1);
  const r = rounds[at];
  const picked = reviewing ? state.picks[at] : null;
  const right = picked === r.answer.id;
  const finished = state.done && !reviewing;

  // The globe shows the answer once given; a capital question may show its country from the start.
  const shown = finished ? null : reviewing || r.kind === "capital" ? r.answer : null;
  const wrongPick = reviewing && !right && picked ? world.byId.get(picked) : undefined;

  const stage = (
    <div className="game-stage">
      <AnswerGlobe
        world={world}
        country={shown}
        right={reviewing ? right : null}
        others={wrongPick ? [{ country: wrongPick, colour: "var(--route-far)" }] : []}
        label="גלובוס: המדינה של הסבב"
      />
    </div>
  );

  if (finished) {
    return (
      <div className="game-layout">
        <div className="game-stage">
          <AnswerGlobe world={world} country={null} right={null} label="גלובוס" />
        </div>
        <div className="game-panel">
          <ResultCard
            won={state.won}
            title={`${score} מתוך ${ROUNDS}${score === ROUNDS ? " — מושלם!" : score >= PASS ? " — כל הכבוד!" : ""}`}
            shareText={shareText}
            onAgain={onAgain}
            againLabel={variant === "flags" ? "עוד עשרה דגלים" : "עוד עשר בירות"}
          >
            <ul className="flag-review">
              {rounds.map((rr, i) => {
                const ok = state.picks[i] === rr.answer.id;
                return (
                  <li key={rr.answer.id} className={ok ? "is-right" : "is-wrong"}>
                    <img src={flagUrl(rr.answer)} alt="" className="flag-sm" />
                    <span>
                      {rr.answer.he}
                      {variant === "capitals" && <span className="muted"> · {rr.answer.capital}</span>}
                    </span>
                    {ok ? <Check size={16} aria-label="נכון" /> : <X size={16} aria-label="טעות" />}
                  </li>
                );
              })}
            </ul>
          </ResultCard>
        </div>
      </div>
    );
  }

  const optionState = (c: Country) => {
    if (!reviewing) return "idle" as const;
    if (c.id === r.answer.id) return "right" as const;
    if (c.id === picked) return "wrong" as const;
    return "dim" as const;
  };

  return (
    <div className="game-layout">
      {stage}
      <div className="game-panel">
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

        <section className="flag-question">
          <Question r={r} />
          <Choices
            options={r.options}
            kind={r.kind === "name" ? "flag" : "name"}
            label={r.kind === "capital" ? (c) => c.capital ?? c.he : (c) => c.he}
            state={optionState}
            onChoose={choose}
            disabled={reviewing}
          />
        </section>

        {reviewing && (
          <div className="flags-feedback" role="status">
            <span className={right ? "good" : "bad"}>
              {right
                ? "נכון!"
                : r.kind === "flag"
                  ? `לא — זה הדגל של ${r.answer.he}`
                  : r.kind === "capital"
                    ? `לא — הבירה היא ${r.answer.capital}`
                    : r.kind === "city"
                      ? `לא — ${r.answer.capital} בירת ${r.answer.he}`
                      : "לא — הדגל הנכון מסומן בירוק"}
            </span>
            <button type="button" className="button primary" ref={nextRef} onClick={() => setReviewing(false)}>
              {state.done ? "לתוצאה" : "הבא"}
              <ArrowLeft size={18} aria-hidden />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function FlagsGame(props: GameProps) {
  return <QuizRounds {...props} variant="flags" />;
}
