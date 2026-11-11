"use client";

import { Flag } from "lucide-react";
import { useMemo, useState } from "react";
import { pick, rng } from "@/lib/daily";
import { borderDistanceKm } from "@/lib/geo";
import { heatColor, heatEmoji, heatWord } from "@/lib/heat";
import { GAMES } from "@/lib/games";
import { pool } from "@/lib/pools";
import { hotColdScore } from "@/lib/scoring";
import { formatKm, useGameState } from "@/lib/useGameState";
import type { GameProps } from "../GamePage";
import CountryInput from "../CountryInput";
import Globe, { focusOn, type Focus } from "../Globe";
import CountryCard from "../CountryCard";
import ResultCard from "../ResultCard";

interface State {
  guesses: string[];
  done: boolean;
  won: boolean;
}

export default function HotColdGame({ world, seed, daily, day, tag, options, onFinish, onAgain }: GameProps) {
  const target = useMemo(
    () => pick(rng(seed), pool(world.countries, options, (c) => Boolean(c.shape) && c.area >= 1500)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [world, seed],
  );

  const [state, setState] = useGameState<State>("hotcold", day, daily, { guesses: [], done: false, won: false });
  const [focus, setFocus] = useState<Focus | null>(null);

  const scored = useMemo(
    () =>
      state.guesses.map((id, order) => {
        const c = world.byId.get(id)!;
        return { c, order, km: id === target.id ? 0 : borderDistanceKm(c, target) };
      }),
    [state.guesses, world, target],
  );

  const fills = useMemo(() => {
    const f: Record<string, string> = {};
    for (const s of scored) f[s.c.id] = s.c.id === target.id ? "var(--found)" : heatColor(s.km);
    if (state.done) f[target.id] = "var(--found)";
    return f;
  }, [scored, state.done, target]);


  const guess = (id: string) => {
    if (state.done) return;
    const won = id === target.id;
    setState((s) => ({ guesses: [...s.guesses, id], done: won, won }));
    const c = world.byId.get(id)!;
    setFocus(focusOn(c));
    if (won) {
      const n = state.guesses.length + 1;
      onFinish({ won, points: hotColdScore(n, true), summary: `${n} ניחושים`, tags: n <= 5 ? ["quick"] : [] });
    }
  };

  const giveUp = () => {
    setState((s) => ({ ...s, done: true, won: false }));
    setFocus(focusOn(target));
    onFinish({ won: false, points: 0, summary: "ויתר/ה" });
  };

  const sorted = [...scored].sort((a, b) => a.km - b.km || a.order - b.order);
  const closest = sorted.find((s) => s.c.id !== target.id);
  const used = useMemo(() => new Set(state.guesses), [state.guesses]);

  const shareText = [
    `${GAMES.hotcold.emoji} חם וקר ${tag} — ${state.won ? `מצאתי ב־${state.guesses.length} ניחושים` : "ויתרתי הפעם"}`,
    scored.map((s) => heatEmoji(s.km, s.c.id === target.id)).join(""),
  ].join("\n");

  return (
    <div className="game-layout">
      <div className="game-stage">
        <Globe
          world={world}
          fills={fills}
          focus={focus}
          spin={state.guesses.length === 0}
          label="גלובוס. המדינות שניחשתם צבועות לפי המרחק מהמדינה הסודית."
        />
        <div className="heat-legend" aria-hidden>
          <span>קר</span>
          <span className="heat-bar" />
          <span>חם</span>
        </div>
      </div>

      <div className="game-panel">
        {!state.done ? (
          <>
            <CountryInput countries={world.mapped} used={used} onPick={(c) => guess(c.id)} />
            <div className="panel-row">
              <span className="muted">
                {state.guesses.length ? `${state.guesses.length} ניחושים` : "התחילו בכל מדינה שעולה לכם בראש"}
              </span>
              {state.guesses.length >= 3 && (
                <button type="button" className="button ghost small" onClick={giveUp}>
                  <Flag size={16} aria-hidden />
                  ויתור
                </button>
              )}
            </div>
            {closest && (
              <p className="closest">
                הכי קרוב עד עכשיו: <strong>{closest.c.he}</strong> · {closest.km === 0 ? "גובלת" : formatKm(closest.km)}
              </p>
            )}
          </>
        ) : (
          <ResultCard
            won={state.won}
            title={state.won ? `מצאתם! ${target.he}` : `התשובה: ${target.he}`}
            shareText={shareText}
            onAgain={onAgain}
            againLabel="סיבוב תרגול"
          >
            {state.won && (
              <p className="score-line">
                <strong>{hotColdScore(state.guesses.length, true)}</strong> נקודות · {state.guesses.length} ניחושים
              </p>
            )}
            <CountryCard country={target} world={world} />
          </ResultCard>
        )}

        <ol className="guess-list" aria-label="הניחושים, מהקרוב לרחוק">
          {sorted.map((s) => (
            <li key={s.c.id} className={s.c.id === state.guesses[state.guesses.length - 1] ? "is-latest" : undefined}>
              <span className="swatch" style={{ background: fills[s.c.id] }} aria-hidden />
              <span className="guess-name">{s.c.he}</span>
              <span className="guess-meta">
                {s.c.id === target.id ? "🎯 זאת היא!" : s.km === 0 ? "גובלת" : `${heatWord(s.km)} · ${formatKm(s.km)}`}
              </span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
