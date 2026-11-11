"use client";

import { ArrowLeft } from "lucide-react";
import { Fragment, useMemo, useState } from "react";
import { rng } from "@/lib/daily";
import { GAMES } from "@/lib/games";
import { linksBetween, randomChain } from "@/lib/geo";
import { pool } from "@/lib/pools";
import { midpoint } from "@/lib/projection";
import { chainRoundScore } from "@/lib/scoring";
import { useGameState } from "@/lib/useGameState";
import type { Country, World } from "@/lib/world";
import type { GameProps } from "../GamePage";
import CountryInput from "../CountryInput";
import Globe, { type Focus } from "../Globe";
import ResultCard from "../ResultCard";
import { chainLines } from "./shared";
import type { Options } from "@/lib/pools";

const ROUNDS = 5;
const LENGTH = 5;
const TRIES = 3;

interface Round {
  chain: string[];
  /** The hidden position, never an end. */
  gap: number;
}

interface RoundState {
  wrong: string[];
  answer: string | null; // the accepted link, or null while open / when failed
  failed: boolean;
}

interface State {
  rounds: RoundState[];
  done: boolean;
  won: boolean;
}

function buildRounds(world: World, seed: string, options: Options): Round[] {
  const random = rng(seed);
  const starts = pool(world.countries, options, (c) => c.borders.length >= 2).map((c) => c.id);
  const usable = (id: string) => Boolean(world.byId.get(id)?.shape);
  const out: Round[] = [];
  for (let i = 0; i < ROUNDS; i++) {
    const chain = randomChain(starts, LENGTH, world.neighbours, random, usable) ??
      randomChain(pool(world.countries, { ...options, continent: null }, (c) => c.borders.length >= 2).map((c) => c.id), LENGTH, world.neighbours, random, usable)!;
    out.push({ chain, gap: 1 + Math.floor(random() * (LENGTH - 2)) });
  }
  return out;
}

export default function ChainGame({ world, seed, daily, day, tag, options, onFinish, onAgain }: GameProps) {
  const rounds = useMemo(
    () => buildRounds(world, seed, options),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [world, seed],
  );
  const empty: RoundState = { wrong: [], answer: null, failed: false };
  const [state, setState] = useGameState<State>("chain", day, daily, { rounds: [], done: false, won: false });
  const [reviewing, setReviewing] = useState(false);

  const closed = state.rounds.filter((r) => r.answer || r.failed).length;
  const at = reviewing ? closed - 1 : Math.min(closed, ROUNDS - 1);
  const round = rounds[at];
  const rs = state.rounds[at] ?? empty;
  const prev = round.chain[round.gap - 1];
  const next = round.chain[round.gap + 1];
  const valid = useMemo(() => linksBetween(prev, next, world.neighbours, round.chain.filter((_, i) => i !== round.gap)), [prev, next, world, round]);
  const total = state.rounds.reduce((s, r) => s + chainRoundScore(r.wrong.length, Boolean(r.answer)), 0);
  const finished = state.done && !reviewing;

  const guess = (c: Country) => {
    if (reviewing || state.done) return;
    const ok = valid.includes(c.id);
    const updated: RoundState = ok ? { ...rs, answer: c.id } : { ...rs, wrong: [...rs.wrong, c.id], failed: rs.wrong.length + 1 >= TRIES };
    const list = [...state.rounds];
    list[at] = updated;
    const closedNow = updated.answer || updated.failed;
    const done = Boolean(closedNow) && at === ROUNDS - 1;
    const points = list.reduce((s, r) => s + chainRoundScore(r.wrong.length, Boolean(r.answer)), 0);
    setState({ rounds: list, done, won: done && points >= 60 });
    if (closedNow) setReviewing(true);
    if (done)
      onFinish({
        won: points >= 60,
        points,
        summary: `${list.filter((r) => r.answer).length}/${ROUNDS} חוליות`,
        tags: list.every((r) => r.answer && r.wrong.length === 0) ? ["flawless"] : [],
      });
  };

  const shown = round.chain.map((id, i) => (i === round.gap ? (rs.answer ?? (rs.failed ? valid[0] : null)) : id));
  const fills = useMemo(() => {
    const f: Record<string, string> = {};
    round.chain.forEach((id, i) => {
      if (i !== round.gap) f[id] = "var(--route-start)";
    });
    if (rs.answer) f[rs.answer] = "var(--found)";
    else if (rs.failed && valid[0]) f[valid[0]] = "var(--reveal)";
    for (const w of rs.wrong) f[w] = "var(--route-far)";
    return f;
  }, [round, rs, valid]);

  const lines = useMemo(() => {
    const pieces = [];
    // Solid between known neighbours, dashed across the gap until it is filled.
    const before = round.chain.slice(0, round.gap).map((id) => world.byId.get(id)!);
    const after = round.chain.slice(round.gap + 1).map((id) => world.byId.get(id)!);
    pieces.push(...chainLines(before), ...chainLines(after));
    const filler = rs.answer ? world.byId.get(rs.answer) : null;
    const p = world.byId.get(prev)!;
    const n = world.byId.get(next)!;
    pieces.push(...(filler ? chainLines([p, filler, n], "var(--found)") : chainLines([p, n], "var(--globe-line)", true)));
    return pieces;
  }, [round, rs.answer, prev, next, world]);

  const focus = useMemo<Focus | null>(() => {
    const a = world.byId.get(round.chain[0])!.center;
    const b = world.byId.get(round.chain[LENGTH - 1])!.center;
    if (!a || !b) return null;
    const m = midpoint(a, b);
    return { lon: m.lon, lat: m.lat, zoom: Math.max(1.2, Math.min(4.5, 70 / (m.angle + 8))) };
  }, [round, world]);

  const used = useMemo(() => new Set([...round.chain.filter((_, i) => i !== round.gap), ...rs.wrong]), [round, rs]);
  const shareText = [
    `${GAMES.chain.emoji} החוליה החסרה ${tag}: ${total}/100`,
    state.rounds.map((r) => (r.answer ? (r.wrong.length ? "🟨" : "🟩") : "🟥")).join(""),
  ].join("\n");

  return (
    <div className="game-layout">
      <div className="game-stage">
        <Globe world={world} fills={fills} lines={lines} focus={focus} label="גלובוס: שרשרת המדינות" nameable={(c) => c.id in fills} />
      </div>
      <div className="game-panel">
        {finished ? (
          <ResultCard won={state.won} title={`${total} נקודות`} shareText={shareText} onAgain={onAgain} againLabel="שרשראות חדשות">
            <ul className="pin-review">
              {rounds.map((r, i) => {
                const s = state.rounds[i];
                const link = s?.answer ?? linksBetween(r.chain[r.gap - 1], r.chain[r.gap + 1], world.neighbours)[0];
                return (
                  <li key={i}>
                    <span className="guess-name">
                      {r.chain.map((id, j) => (j === r.gap ? `[${world.byId.get(link)?.he}]` : world.byId.get(id)!.he)).join(" · ")}
                    </span>
                    <strong>{chainRoundScore(s?.wrong.length ?? 0, Boolean(s?.answer))}</strong>
                  </li>
                );
              })}
            </ul>
          </ResultCard>
        ) : (
          <>
            <p className="muted">
              סבב {at + 1} מתוך {ROUNDS} · {total} נק׳ · ניסיונות: {TRIES - rs.wrong.length}
            </p>
            <div className="chain-row" aria-label="השרשרת">
              {shown.map((id, i) => (
                <Fragment key={i}>
                  {i > 0 && <span className="chain-link" aria-hidden>—</span>}
                  <span className={i === round.gap ? (rs.answer ? "chain-item is-found" : rs.failed ? "chain-item is-missed" : "chain-item is-gap") : "chain-item"}>
                    {id ? world.byId.get(id)!.he : "?"}
                  </span>
                </Fragment>
              ))}
            </div>
            {!reviewing ? (
              <>
                <p>
                  איזו מדינה גובלת גם ב<strong>{world.byId.get(prev)!.he}</strong> וגם ב<strong>{world.byId.get(next)!.he}</strong>?
                </p>
                <CountryInput countries={world.mapped} used={used} onPick={guess} />
                {rs.wrong.length > 0 && <p className="bad small">לא מתאים: {rs.wrong.map((w) => world.byId.get(w)!.he).join(", ")}</p>}
              </>
            ) : (
              <div className="flags-feedback" role="status">
                <span className={rs.answer ? "good" : "bad"}>
                  {rs.answer
                    ? `נכון! +${chainRoundScore(rs.wrong.length, true)}${valid.length > 1 ? ` (גם ${valid.filter((v) => v !== rs.answer).map((v) => world.byId.get(v)!.he).join(", ")} מתאימות)` : ""}`
                    : `החוליה: ${valid.map((v) => world.byId.get(v)!.he).join(" / ")}`}
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
