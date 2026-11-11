"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { flagUrl, type Country, type World } from "@/lib/world";
import Globe, { focusOn, type Focus, type GlobeLine } from "../Globe";

/**
 * Seconds left until `deadline` (ms since epoch), ticking while it is set.
 * `onExpire` runs once from the timer callback when it reaches zero. The
 * deadline is stored with the game, so a refresh does not restart the clock.
 */
export function useCountdown(deadline: number | null, onExpire: () => void) {
  const [now, setNow] = useState(() => Date.now());
  const expire = useRef(onExpire);
  useEffect(() => {
    expire.current = onExpire;
  });
  useEffect(() => {
    if (deadline === null) return;
    let fired = false;
    const id = setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (!fired && t >= deadline) {
        fired = true;
        expire.current();
      }
    }, 200);
    return () => clearInterval(id);
  }, [deadline]);
  return deadline === null ? null : Math.max(0, Math.ceil((deadline - now) / 1000));
}

/** The globe beside a quiz: turns to the country just answered, coloured right or wrong. */
export function AnswerGlobe({
  world,
  country,
  right,
  others = [],
  label,
}: {
  world: World;
  country: Country | null;
  right: boolean | null;
  /** More countries to colour, e.g. the wrong pick. */
  others?: { country: Country; colour: string }[];
  label: string;
}) {
  const fills = useMemo(() => {
    const f: Record<string, string> = {};
    for (const o of others) f[o.country.id] = o.colour;
    if (country) f[country.id] = right === false ? "var(--route-far)" : "var(--found)";
    return f;
  }, [country, right, others]);
  const focus = useMemo<Focus | null>(() => (country ? focusOn(country) : null), [country]);
  return <Globe world={world} fills={fills} focus={focus} spin={!country} label={label} outlined={country ? [country.id] : []} />;
}

/** Lines joining country centres in order, for a chain or a route. */
export function chainLines(countries: Country[], colour = "var(--globe-line)", dashed = false): GlobeLine[] {
  const out: GlobeLine[] = [];
  for (let i = 1; i < countries.length; i++) {
    const a = countries[i - 1].center;
    const b = countries[i].center;
    if (a && b) out.push({ from: a, to: b, colour, dashed });
  }
  return out;
}

export type ChoiceState = "idle" | "right" | "wrong" | "dim";

/** Four answers, as names or as flags. */
export function Choices({
  options,
  kind,
  state,
  onChoose,
  disabled,
  label = (c) => c.he,
}: {
  options: Country[];
  kind: "name" | "flag";
  state: (c: Country) => ChoiceState;
  onChoose: (c: Country) => void;
  disabled: boolean;
  label?: (c: Country) => string;
}) {
  const LETTERS = ["א", "ב", "ג", "ד"];
  return (
    <div className={kind === "flag" ? "options-grid flags" : "options-grid"}>
      {options.map((c, i) => {
        const s = state(c);
        return (
          <button
            key={c.id}
            type="button"
            className={s === "idle" ? "option" : `option is-${s}`}
            onClick={() => onChoose(c)}
            disabled={disabled}
            aria-label={kind === "flag" ? (s === "idle" ? `דגל ${LETTERS[i]}` : `הדגל של ${c.he}`) : undefined}
          >
            {kind === "flag" ? (
              <>
                <img src={flagUrl(c)} alt="" />
                {s !== "idle" && <span className="option-caption">{c.he}</span>}
              </>
            ) : (
              label(c)
            )}
          </button>
        );
      })}
    </div>
  );
}

/** Three wrong options, from the same continent first. */
export function distractors(random: () => number, answer: Country, from: Country[], count = 3): Country[] {
  const pickFrom = (list: Country[]) => {
    const copy = list.slice();
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };
  const near = pickFrom(from.filter((c) => c.id !== answer.id && c.continent === answer.continent));
  const far = pickFrom(from.filter((c) => c.id !== answer.id && c.continent !== answer.continent));
  return [...near, ...far].slice(0, count);
}

export function Timer({ left, total }: { left: number; total: number }) {
  return (
    <div className={left <= 10 ? "timer is-low" : "timer"} role="timer" aria-live="off" aria-label={`נותרו ${left} שניות`}>
      <span className="timer-bar" style={{ width: `${(100 * left) / total}%` }} />
      <span className="timer-text">{left}</span>
    </div>
  );
}
