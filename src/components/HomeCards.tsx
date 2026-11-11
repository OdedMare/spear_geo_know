"use client";

import { ArrowLeft, CheckCircle2, Circle, Trophy, XCircle } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { useHydrated } from "@/hooks/useHydrated";
import { BADGES } from "@/lib/badges";
import { dayKey, dayNumber } from "@/lib/daily";
import { GAME_LIST, GROUPS } from "@/lib/games";
import { dailyStatus, loadJSON, loadStats, type DailyStatus, type GameId, type Stats } from "@/lib/storage";

type Progress = Record<GameId, { status: DailyStatus | null; stats: Stats }>;

export default function HomeCards() {
  const hydrated = useHydrated();
  const day = hydrated ? dayKey() : null;
  const progress = useMemo<Progress | null>(
    () =>
      day
        ? (Object.fromEntries(GAME_LIST.map((g) => [g.id, { status: dailyStatus(g.id, day), stats: loadStats(g.id) }])) as Progress)
        : null,
    [day],
  );
  const held = useMemo(() => (hydrated ? loadJSON<Record<string, string>>("geo.badges") ?? {} : {}), [hydrated]);
  const doneToday = progress ? GAME_LIST.filter((g) => progress[g.id].status?.done).length : 0;

  return (
    <>
      <div className="home-day">
        {day && <span>האתגר היומי #{dayNumber(day)}</span>}
        {progress && (
          <span className="home-progress">
            {doneToday > 0 && <span className="home-progress-bar" style={{ width: `${(100 * doneToday) / GAME_LIST.length}%` }} />}
            <span className="home-progress-text">
              {doneToday} מתוך {GAME_LIST.length} היום
            </span>
          </span>
        )}
        <Link href="/leaderboard" className="button small">
          <Trophy size={16} aria-hidden />
          טבלת הצוות
        </Link>
      </div>

      {GROUPS.map((group) => (
        <section key={group.id} className="game-group" aria-labelledby={`group-${group.id}`}>
          <h2 id={`group-${group.id}`}>{group.title}</h2>
          <ul className="game-cards">
            {GAME_LIST.filter((g) => g.group === group.id).map((g) => {
              const p = progress?.[g.id];
              const done = p?.status?.done;
              const Icon = g.icon;
              return (
                <li key={g.id}>
                  <Link href={g.href} className="game-card">
                    <span className="game-icon" style={{ background: g.tint, color: g.color }}>
                      <Icon size={26} aria-hidden />
                    </span>
                    <span className="game-card-body">
                      <strong>{g.title}</strong>
                      <span className="muted">{g.tagline}</span>
                      <span className="game-card-status">
                        {!p ? (
                          " "
                        ) : done ? (
                          p.status?.won ? (
                            <>
                              <CheckCircle2 size={16} aria-hidden className="good" /> הושלם היום
                            </>
                          ) : (
                            <>
                              <XCircle size={16} aria-hidden className="bad" /> שוחק היום
                            </>
                          )
                        ) : (
                          <>
                            <Circle size={16} aria-hidden /> מחכה לכם
                          </>
                        )}
                        {p && p.stats.streak > 1 && <span className="streak">🔥 {p.stats.streak} ימים ברצף</span>}
                      </span>
                    </span>
                    <ArrowLeft size={20} aria-hidden className="game-card-arrow" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      <section className="game-group" aria-labelledby="badges-title">
        <h2 id="badges-title">
          התגים שלי <span className="muted small">({Object.keys(held).length} מתוך {BADGES.length})</span>
        </h2>
        <ul className="badge-grid">
          {BADGES.map((b) => (
            <li key={b.id} className={held[b.id] ? "badge is-held" : "badge"} title={b.hint}>
              <span className="badge-emoji" aria-hidden>
                {b.emoji}
              </span>
              <strong>{b.title}</strong>
              <span className="muted small">{held[b.id] ? `הושג ${held[b.id].split("-").reverse().join("/")}` : b.hint}</span>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
