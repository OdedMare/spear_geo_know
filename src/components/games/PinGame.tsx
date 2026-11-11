"use client";

import { ArrowLeft, MapPin } from "lucide-react";
import { useMemo, useState } from "react";
import { rng, shuffle } from "@/lib/daily";
import { GAMES } from "@/lib/games";
import { haversineKm, inShape, samplePoints, type LonLat } from "@/lib/geo";
import { pool } from "@/lib/pools";
import { pinScore } from "@/lib/scoring";
import { formatKm, useGameState } from "@/lib/useGameState";
import { flagUrl, type Country } from "@/lib/world";
import type { GameProps } from "../GamePage";
import Globe, { focusOn, type Focus, type GlobeLine, type GlobeMarker } from "../Globe";
import ResultCard from "../ResultCard";

const ROUNDS = 5;

interface Shot {
  at: LonLat;
  km: number;
  /** The border point nearest the tap, to draw the miss. */
  nearest: LonLat | null;
}

interface State {
  shots: Shot[];
  done: boolean;
  won: boolean;
}

/** How far a tap is from a country: 0 inside, else to the nearest border point. */
function missFor(at: LonLat, c: Country): Shot {
  if (inShape(at[0], at[1], c.shape!)) return { at, km: 0, nearest: null };
  let best = Infinity;
  let nearest: LonLat | null = null;
  for (const p of samplePoints(c.shape!, 1500)) {
    const d = haversineKm(at, p);
    if (d < best) {
      best = d;
      nearest = p;
    }
  }
  return { at, km: Math.round(best), nearest };
}

export default function PinGame({ world, seed, daily, day, tag, options, onFinish, onAgain }: GameProps) {
  // Easy keeps countries big enough to tap on a whole globe.
  const minArea = options.difficulty === "easy" ? 200000 : options.difficulty === "hard" ? 500 : 30000;
  const targets = useMemo(
    () => shuffle(rng(seed), pool(world.countries, options, (c) => Boolean(c.shape) && c.area >= minArea)).slice(0, ROUNDS),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [world, seed],
  );
  const [state, setState] = useGameState<State>("pin", day, daily, { shots: [], done: false, won: false });
  const [reviewing, setReviewing] = useState(false);
  const [focus, setFocus] = useState<Focus | null>(null);

  const at = reviewing ? state.shots.length - 1 : Math.min(state.shots.length, ROUNDS - 1);
  const target = targets[at];
  const total = state.shots.reduce((s, x) => s + pinScore(x.km), 0);
  const finished = state.done && !reviewing;

  const pickAt = (ll: LonLat) => {
    if (reviewing || state.done) return;
    const shot = missFor(ll, target);
    const shots = [...state.shots, shot];
    const done = shots.length === ROUNDS;
    const points = Math.round(shots.reduce((s, x) => s + pinScore(x.km), 0) / ROUNDS);
    setState({ shots, done, won: done && points >= 50 });
    setReviewing(true);
    setFocus(focusOn(target, Math.max(1.2, Math.min(4, (focusOn(target)?.zoom ?? 2) * 0.7))));
    if (done)
      onFinish({
        won: points >= 50,
        points,
        summary: `${points} נק׳ ממוצע`,
        tags: shots.some((s) => s.km === 0) ? ["bullseye"] : [],
      });
  };

  const shot = reviewing ? state.shots[at] : null;
  const fills = useMemo<Record<string, string>>(() => {
    if (finished) return Object.fromEntries(targets.map((t, i) => [t.id, state.shots[i]?.km === 0 ? "var(--found)" : "var(--reveal)"]));
    return shot ? { [target.id]: shot.km === 0 ? "var(--found)" : "var(--reveal)" } : {};
  }, [finished, shot, target, targets, state.shots]);
  const markers = useMemo<GlobeMarker[]>(() => {
    if (finished) return state.shots.map((s) => ({ at: s.at, colour: "var(--pin)" }));
    return shot ? [{ at: shot.at, colour: "var(--pin)" }] : [];
  }, [finished, shot, state.shots]);
  const lines = useMemo<GlobeLine[]>(
    () => (shot?.nearest ? [{ from: shot.at, to: shot.nearest, colour: "var(--pin)", dashed: true }] : []),
    [shot],
  );

  const shareText = [
    `${GAMES.pin.emoji} הצבע על המפה ${tag}: ${Math.round(total / ROUNDS)} נק׳`,
    state.shots.map((s) => (s.km === 0 ? "🎯" : s.km < 500 ? "🟩" : s.km < 1500 ? "🟨" : "🟥")).join(""),
  ].join("\n");

  return (
    <div className="game-layout">
      <div className="game-stage">
        <Globe
          world={world}
          fills={fills}
          markers={markers}
          lines={lines}
          focus={focus}
          onPick={finished || reviewing ? undefined : pickAt}
          label="גלובוס: הקישו במקום שבו נמצאת המדינה"
        />
      </div>
      <div className="game-panel">
        {finished ? (
          <ResultCard
            won={state.won}
            title={`${Math.round(total / ROUNDS)} נקודות בממוצע`}
            shareText={shareText}
            onAgain={onAgain}
            againLabel="עוד חמש מדינות"
          >
            <ul className="pin-review">
              {targets.map((t, i) => (
                <li key={t.id}>
                  {t.flag && <img src={flagUrl(t)} alt="" className="flag-xs" />}
                  <span className="guess-name">{t.he}</span>
                  <span className="guess-meta">{state.shots[i].km === 0 ? "🎯 בפנים" : formatKm(state.shots[i].km)}</span>
                  <strong>{pinScore(state.shots[i].km)}</strong>
                </li>
              ))}
            </ul>
          </ResultCard>
        ) : (
          <>
            <div className="flags-top">
              <div className="progress" aria-hidden>
                {targets.map((t, i) => (
                  <span key={t.id} className={i < state.shots.length ? (state.shots[i].km === 0 ? "dot is-right" : "dot is-wrong") : i === at ? "dot is-current" : "dot"} />
                ))}
              </div>
              <span className="muted">
                סבב {at + 1} מתוך {ROUNDS} · {total} נק׳
              </span>
            </div>
            <h2 className="pin-question">
              <MapPin size={22} aria-hidden /> איפה נמצאת <strong>{target.he}</strong>?
            </h2>
            {!reviewing ? (
              <p className="muted">סובבו את הגלובוס והקישו על המקום. גרירה מסובבת — רק הקשה קצרה נספרת.</p>
            ) : (
              <div className="flags-feedback" role="status">
                <span className={shot!.km === 0 ? "good" : shot!.km < 800 ? "" : "bad"}>
                  {shot!.km === 0 ? "בול! בתוך המדינה — 100 נקודות" : `${formatKm(shot!.km)} מהגבול — ${pinScore(shot!.km)} נקודות`}
                </span>
                <button
                  type="button"
                  className="button primary"
                  autoFocus
                  onClick={() => {
                    setReviewing(false);
                    // Zoom back out for the next country, without pointing at it.
                    if (target.center) setFocus({ lon: target.center[0], lat: target.center[1], zoom: 1 });
                  }}
                >
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
