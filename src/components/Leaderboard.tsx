"use client";

import { Crown, RefreshCw, Trophy } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useHydrated } from "@/hooks/useHydrated";
import { addDays, dayKey, weekStart } from "@/lib/daily";
import { GAME_LIST, GAMES } from "@/lib/games";
import { fetchScores, getName, setName, useTeamServer, type ScoreEntry } from "@/lib/scores";

const MEDALS = ["🥇", "🥈", "🥉"];

interface Total {
  name: string;
  points: number;
  games: number;
}

/** Sums points per player; ties broken by fewer games (more points per game). */
export function totals(entries: ScoreEntry[]): Total[] {
  const by = new Map<string, Total>();
  for (const e of entries) {
    const key = e.name.toLowerCase();
    const t = by.get(key) ?? { name: e.name, points: 0, games: 0 };
    t.points += e.points;
    t.games += 1;
    by.set(key, t);
  }
  return [...by.values()].sort((a, b) => b.points - a.points || a.games - b.games || a.name.localeCompare(b.name, "he"));
}

export default function Leaderboard() {
  const hydrated = useHydrated();
  const server = useTeamServer();
  const day = hydrated ? dayKey() : null;
  const from = day ? weekStart(day) : null;
  const [tab, setTab] = useState<"today" | "week">("today");
  const [entries, setEntries] = useState<ScoreEntry[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [reload, setReload] = useState(0);
  const [draft, setMe] = useState<string | null>(null);
  const me = draft ?? (hydrated ? getName() : "");

  useEffect(() => {
    if (!server || !from) return;
    let live = true;
    fetchScores(from, addDays(from, 6)).then(
      (e) => live && (setEntries(e), setFailed(false)),
      () => live && setFailed(true),
    );
    return () => {
      live = false;
    };
  }, [server, from, reload]);

  const today = useMemo(() => (entries && day ? entries.filter((e) => e.day === day) : []), [entries, day]);
  const week = useMemo(() => totals(entries ?? []), [entries]);
  const todayTotals = useMemo(() => totals(today), [today]);
  const mine = (name: string) => me && name.toLowerCase() === me.trim().toLowerCase();

  return (
    <main id="main-content" className="game-page leaderboard">
      <header className="game-head">
        <div className="game-title">
          <span className="game-icon" style={{ background: "var(--gold-soft)", color: "var(--gold)" }}>
            <Trophy size={22} aria-hidden />
          </span>
          <div>
            <h1>טבלת הצוות</h1>
            <p className="muted">כל אתגר יומי שווה עד 100 נקודות. השבוע מתחיל ביום ראשון.</p>
          </div>
        </div>
        <div className="segmented" role="radiogroup" aria-label="תקופה">
          <button type="button" role="radio" aria-checked={tab === "today"} onClick={() => setTab("today")}>
            היום
          </button>
          <button type="button" role="radio" aria-checked={tab === "week"} onClick={() => setTab("week")}>
            השבוע
          </button>
        </div>
      </header>

      <form
        className="team-form name-form"
        onSubmit={(e) => {
          e.preventDefault();
          setName(me);
        }}
      >
        <label>
          <span className="field-label">השם שלי בטבלה</span>
          <input value={me} maxLength={24} onChange={(e) => setMe(e.target.value)} onBlur={() => setName(me)} placeholder="השם שיופיע לצוות" />
        </label>
        <button type="button" className="button" onClick={() => setReload((n) => n + 1)}>
          <RefreshCw size={16} aria-hidden />
          רענון
        </button>
      </form>

      {server === false && (
        <p className="error-box">
          טבלת הצוות פועלת כשהאתר רץ דרך <code>npm start</code> (השרת שבתוך הפרויקט שומר את התוצאות). בשרת סטטי רגיל או ב־
          <code>npm run dev</code> אין טבלה — המשחקים עצמם עובדים כרגיל.
        </p>
      )}
      {failed && <p className="error-box">לא הצלחנו לטעון את הטבלה. נסו לרענן.</p>}
      {server && !entries && !failed && <div className="loading">טוען…</div>}

      {entries && tab === "week" && (
        <>
          {week[0] && (
            <section className="champion">
              <Crown size={28} aria-hidden />
              <div>
                <span className="muted small">אלוף/ת השבוע עד עכשיו</span>
                <strong>{week[0].name}</strong>
                <span>
                  {week[0].points} נקודות ב־{week[0].games} אתגרים
                </span>
              </div>
            </section>
          )}
          <RankTable rows={week.map((t) => ({ name: t.name, points: t.points, detail: `${t.games} אתגרים` }))} mine={mine} empty="עוד אין תוצאות השבוע." />
        </>
      )}

      {entries && tab === "today" && (
        <>
          <h2 className="table-title">סיכום היום</h2>
          <RankTable rows={todayTotals.map((t) => ({ name: t.name, points: t.points, detail: `${t.games} מתוך ${GAME_LIST.length}` }))} mine={mine} empty="עוד אף אחד לא שיחק היום. היו הראשונים!" />
          <div className="game-tables">
            {GAME_LIST.map((g) => {
              const rows = today.filter((e) => e.game === g.id).sort((a, b) => b.points - a.points || (a.at ?? "").localeCompare(b.at ?? ""));
              return (
                <section key={g.id} className="game-table">
                  <h3>
                    <Link href={g.href}>
                      {GAMES[g.id].emoji} {g.title}
                    </Link>
                  </h3>
                  <RankTable rows={rows.map((r) => ({ name: r.name, points: r.points, detail: r.summary }))} mine={mine} empty="—" compact />
                </section>
              );
            })}
          </div>
        </>
      )}
    </main>
  );
}

function RankTable({
  rows,
  mine,
  empty,
  compact,
}: {
  rows: { name: string; points: number; detail: string }[];
  mine: (name: string) => boolean | "";
  empty: string;
  compact?: boolean;
}) {
  if (!rows.length) return <p className="muted small">{empty}</p>;
  return (
    <ol className={compact ? "rank-table compact" : "rank-table"}>
      {rows.map((r, i) => (
        <li key={r.name + i} className={mine(r.name) ? "is-me" : undefined}>
          <span className="rank">{MEDALS[i] ?? i + 1}</span>
          <span className="rank-name">{r.name}</span>
          <span className="rank-detail muted">{r.detail}</span>
          <strong className="rank-points">{r.points}</strong>
        </li>
      ))}
    </ol>
  );
}
