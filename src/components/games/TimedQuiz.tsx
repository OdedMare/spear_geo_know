"use client";

import { Play } from "lucide-react";
import { useMemo } from "react";
import { rng, shuffle } from "@/lib/daily";
import { GAMES } from "@/lib/games";
import { CONTINENTS, pool } from "@/lib/pools";
import { useGameState } from "@/lib/useGameState";
import { flagUrl, type Country } from "@/lib/world";
import type { GameProps } from "../GamePage";
import ResultCard from "../ResultCard";
import { AnswerGlobe, Choices, Timer, distractors, useCountdown } from "./shared";

const SECONDS = 60;

/** "continent": a country → its continent. "flagrush": a flag → its country. */
type Variant = "continent" | "flagrush";

const CONFIG = {
  continent: { penalty: 3, pass: 25, perPoint: 4, tag: "25" },
  flagrush: { penalty: 5, pass: 20, perPoint: 5, tag: "20" },
} as const;

interface State {
  /** When the clock started; the deadline is derived, so a refresh keeps counting. */
  startedAt: number | null;
  answers: { id: string; right: boolean }[];
  done: boolean;
  won: boolean;
}

export default function TimedQuiz({ world, seed, daily, day, tag, options, onFinish, onAgain, variant }: GameProps & { variant: Variant }) {
  const meta = GAMES[variant];
  const cfg = CONFIG[variant];
  const items = useMemo(
    () => {
      const scoped = variant === "continent" ? { ...options, continent: null } : options;
      return shuffle(rng(seed), pool(world.countries, scoped, (c) => (variant === "flagrush" ? c.flag : Boolean(c.shape)), 30));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [world, seed, variant],
  );
  const optionsFor = useMemo(() => {
    const random = rng(`${seed}:options`);
    return items.map((c) => shuffle(random, [c, ...distractors(random, c, items)]));
  }, [items, seed]);

  const [state, setState] = useGameState<State>(variant, day, daily, { startedAt: null, answers: [], done: false, won: false });
  const wrong = state.answers.filter((a) => !a.right).length;
  const right = state.answers.length - wrong;
  const deadline = state.startedAt && !state.done ? state.startedAt + (SECONDS - wrong * cfg.penalty) * 1000 : null;

  const finish = (answers = state.answers) => {
    const score = answers.filter((a) => a.right).length;
    const won = score >= cfg.pass;
    setState((s) => ({ ...s, answers, done: true, won }));
    onFinish({ won, points: Math.min(100, score * cfg.perPoint), summary: `${score} נכונות`, tags: won ? [cfg.tag] : [] });
  };
  const left = useCountdown(deadline, () => finish());

  const i = state.answers.length % items.length;
  const current = items[i];
  const last = state.answers.length ? world.byId.get(state.answers[state.answers.length - 1].id)! : null;

  const answer = (ok: boolean) => {
    if (state.done || !state.startedAt) return;
    const answers = [...state.answers, { id: current.id, right: ok }];
    // A wrong answer can run the clock out on the spot.
    const w = answers.filter((a) => !a.right).length;
    if (state.startedAt + (SECONDS - w * cfg.penalty) * 1000 <= Date.now()) finish(answers);
    else setState((s) => ({ ...s, answers }));
  };

  const shareText = [
    `${meta.emoji} ${meta.title} ${tag}: ${right} נכונות ב־60 שניות`,
    `✅ ${right} · ❌ ${wrong}`,
  ].join("\n");

  const globe = (
    <div className="game-stage">
      <AnswerGlobe
        world={world}
        country={state.done ? null : last}
        right={state.answers.length ? state.answers[state.answers.length - 1].right : null}
        label="גלובוס: איפה הייתה המדינה הקודמת"
      />
    </div>
  );

  if (!state.startedAt) {
    return (
      <div className="game-layout">
        {globe}
        <div className="game-panel start-panel">
          <h2>{meta.tagline}</h2>
          <p className="muted">
            60 שניות. טעות מורידה {cfg.penalty} שניות. {cfg.pass} ומעלה — הצלחה.
          </p>
          <button type="button" className="button primary big" onClick={() => setState((s) => ({ ...s, startedAt: Date.now() }))}>
            <Play size={20} aria-hidden />
            מתחילים
          </button>
        </div>
      </div>
    );
  }

  if (state.done) {
    return (
      <div className="game-layout">
        {globe}
        <div className="game-panel">
          <ResultCard won={state.won} title={`${right} תשובות נכונות`} shareText={shareText} onAgain={onAgain} againLabel="עוד דקה">
            <p className="score-line">
              <strong>{Math.min(100, right * cfg.perPoint)}</strong> נקודות · {wrong} טעויות
            </p>
          </ResultCard>
        </div>
      </div>
    );
  }

  return (
    <div className="game-layout">
      {globe}
      <div className="game-panel">
        <Timer left={left ?? SECONDS} total={SECONDS} />
        <p className="muted">
          ✅ {right} · ❌ {wrong}
        </p>
        {variant === "continent" ? (
          <section className="flag-question">
            <h2>
              באיזו יבשת נמצאת <strong>{current.he}</strong>?
            </h2>
            <div className="options-grid continents">
              {CONTINENTS.map((name) => (
                <button key={name} type="button" className="option" onClick={() => answer(name === current.continent)}>
                  {name}
                </button>
              ))}
            </div>
          </section>
        ) : (
          <section className="flag-question">
            <img src={flagUrl(current)} alt="הדגל שצריך לזהות" className="flag-hero" />
            <Choices
              options={optionsFor[i]}
              kind="name"
              state={() => "idle"}
              onChoose={(c: Country) => answer(c.id === current.id)}
              disabled={false}
            />
          </section>
        )}
      </div>
    </div>
  );
}
