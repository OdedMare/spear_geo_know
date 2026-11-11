"use client";

import { ArrowLeft, CheckCircle2, Circle, XCircle } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { useHydrated } from "@/hooks/useHydrated";
import { dayKey, dayNumber } from "@/lib/daily";
import { GAME_LIST } from "@/lib/games";
import { dailyStatus, loadStats, type DailyStatus, type GameId, type Stats } from "@/lib/storage";

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

  return (
    <>
      {day && <p className="home-day">האתגר היומי #{dayNumber(day)}</p>}
      <ul className="game-cards">
        {GAME_LIST.map((g) => {
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
    </>
  );
}
