"use client";

import { Flag } from "lucide-react";
import { useMemo } from "react";
import { pick, rng } from "@/lib/daily";
import { GAMES } from "@/lib/games";
import { pool } from "@/lib/pools";
import { useGameState } from "@/lib/useGameState";
import { flagUrl } from "@/lib/world";
import type { GameProps } from "../GamePage";
import CountryCard from "../CountryCard";
import CountryInput from "../CountryInput";
import Globe, { focusOn } from "../Globe";
import ResultCard from "../ResultCard";

const MAX_WRONG = 3;

interface State {
  found: string[];
  wrong: string[];
  done: boolean;
  won: boolean;
}

export default function NeighborsGame({ world, seed, daily, day, tag, options, onFinish, onAgain }: GameProps) {
  const fewest = options.difficulty === "easy" ? 2 : 3;
  const target = useMemo(
    () => pick(rng(seed), pool(world.countries, options, (c) => Boolean(c.shape) && c.borders.length >= fewest)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [world, seed],
  );
  const neighbours = target.borders;
  const [state, setState] = useGameState<State>("neighbors", day, daily, { found: [], wrong: [], done: false, won: false });
  const focus = useMemo(() => focusOn(target, Math.max(1.3, (focusOn(target)?.zoom ?? 2) * 0.55)), [target]);

  const finish = (found: string[], wrong: string[], gaveUp = false) => {
    const all = found.length === neighbours.length;
    const points = Math.round((100 * found.length) / neighbours.length);
    setState({ found, wrong, done: true, won: all });
    onFinish({
      won: all,
      points,
      summary: `${found.length}/${neighbours.length} שכנות`,
      tags: all && wrong.length === 0 && !gaveUp ? ["all"] : [],
      country: target.id,
    });
  };

  const guess = (id: string) => {
    if (state.done) return;
    if (neighbours.includes(id)) {
      const found = [...state.found, id];
      if (found.length === neighbours.length) finish(found, state.wrong);
      else setState({ ...state, found });
    } else {
      const wrong = [...state.wrong, id];
      if (wrong.length >= MAX_WRONG) finish(state.found, wrong);
      else setState({ ...state, wrong });
    }
  };

  const fills = useMemo(() => {
    const f: Record<string, string> = { [target.id]: "var(--route-start)" };
    for (const id of state.found) f[id] = "var(--found)";
    for (const id of state.wrong) f[id] = "var(--route-far)";
    if (state.done) for (const id of neighbours) if (!state.found.includes(id)) f[id] = "var(--reveal)";
    return f;
  }, [target, state, neighbours]);

  const used = useMemo(() => new Set([target.id, ...state.found, ...state.wrong]), [target, state]);
  const shareText = [
    `${GAMES.neighbors.emoji} השכנים ${tag}: ${target.he} — ${state.found.length}/${neighbours.length}`,
    neighbours.map((id) => (state.found.includes(id) ? "🟩" : "⬜")).join("") + (state.wrong.length ? " " + "❌".repeat(state.wrong.length) : ""),
  ].join("\n");

  return (
    <div className="game-layout">
      <div className="game-stage">
        <Globe world={world} fills={fills} outlined={[target.id]} focus={focus} label={`גלובוס: ${target.he} ושכנותיה`} />
      </div>
      <div className="game-panel">
        <h2 className="pin-question">
          {target.flag && <img src={flagUrl(target)} alt="" className="flag-sm" />}
          מי גובלת ב<strong>{target.he}</strong>?
        </h2>
        <p className="muted">
          נמצאו {state.found.length} מתוך {neighbours.length} · טעויות: {state.wrong.length} מתוך {MAX_WRONG}
        </p>
        <div className="neighbour-slots" aria-label="השכנות">
          {neighbours.map((id, i) => {
            const got = state.found.includes(id) || state.done;
            return (
              <span key={id} className={state.found.includes(id) ? "slot is-found" : state.done ? "slot is-missed" : "slot"}>
                {got ? world.byId.get(id)!.he : `? ${i + 1}`}
              </span>
            );
          })}
        </div>
        {!state.done ? (
          <>
            <CountryInput countries={world.mapped} used={used} onPick={(c) => guess(c.id)} />
            <div className="panel-row">
              <span className="muted small">{state.wrong.length > 0 && `לא שכנות: ${state.wrong.map((id) => world.byId.get(id)!.he).join(", ")}`}</span>
              <button type="button" className="button ghost small" onClick={() => finish(state.found, state.wrong, true)}>
                <Flag size={16} aria-hidden />
                סיום
              </button>
            </div>
          </>
        ) : (
          <ResultCard
            won={state.won}
            title={state.won ? "מצאתם את כל השכנות!" : `מצאתם ${state.found.length} מתוך ${neighbours.length}`}
            shareText={shareText}
            onAgain={onAgain}
            againLabel="מדינה אחרת"
          >
            <CountryCard country={target} world={world} />
          </ResultCard>
        )}
      </div>
    </div>
  );
}
