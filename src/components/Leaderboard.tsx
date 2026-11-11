"use client";

import { Crown, Gift, RefreshCw, Trophy } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { DEFAULT_AVATAR } from "@shared/avatar.mjs";
import { itemName, RARITIES, REASONS } from "@shared/merch.mjs";
import { useHydrated } from "@/hooks/useHydrated";
import { addDays, dayKey, weekStart } from "@/lib/daily";
import { GAME_LIST, GAMES } from "@/lib/games";
import { usePlayer, type PublicPlayer } from "@/lib/player";
import { fetchDrops, fetchPlayers, fetchScores, useTeamServer, type Drop, type ScoreEntry } from "@/lib/scores";
import Avatar from "./Avatar";

const MEDALS = ["🥇", "🥈", "🥉"];

interface Total {
  key: string;
  player?: string;
  name: string;
  points: number;
  games: number;
}

/** Sums points per player; ties broken by fewer games (more points per game). */
export function totals(entries: ScoreEntry[]): Total[] {
  const by = new Map<string, Total>();
  for (const e of entries) {
    const key = e.player ?? `name:${e.name.toLowerCase()}`;
    const t = by.get(key) ?? { key, player: e.player, name: e.name, points: 0, games: 0 };
    t.points += e.points;
    t.games += 1;
    by.set(key, t);
  }
  return [...by.values()].sort((a, b) => b.points - a.points || a.games - b.games || a.name.localeCompare(b.name, "he"));
}

interface Data {
  scores: ScoreEntry[];
  players: Map<string, PublicPlayer>;
  drops: Drop[];
}

export default function Leaderboard() {
  const hydrated = useHydrated();
  const server = useTeamServer();
  const me = usePlayer();
  const day = hydrated ? dayKey() : null;
  const from = day ? weekStart(day) : null;
  const [tab, setTab] = useState<"today" | "week">("today");
  const [data, setData] = useState<Data | null>(null);
  const [failed, setFailed] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    if (!server || !from) return;
    let live = true;
    Promise.all([fetchScores(from, addDays(from, 6)), fetchPlayers(), fetchDrops(12)]).then(
      ([scores, players, drops]) => {
        if (!live) return;
        setData({ scores, players: new Map(players.map((p) => [p.id, p])), drops });
        setFailed(false);
      },
      () => live && setFailed(true),
    );
    return () => {
      live = false;
    };
  }, [server, from, reload]);

  const today = useMemo(() => (data && day ? data.scores.filter((e) => e.day === day) : []), [data, day]);
  const week = useMemo(() => totals(data?.scores ?? []), [data]);
  const todayTotals = useMemo(() => totals(today), [today]);
  const isMe = (t: { player?: string }) => Boolean(me?.id && t.player === me.id);
  const face = (playerId: string | undefined, size: number, ring?: string) => {
    const p = playerId ? data?.players.get(playerId) : undefined;
    return <Avatar avatar={p?.avatar ?? DEFAULT_AVATAR} equipped={p?.equipped} size={size} ring={ring} />;
  };

  return (
    <main id="main-content" className="game-page leaderboard">
      <header className="game-head">
        <div className="game-title">
          <span className="game-icon" style={{ background: "var(--gold-soft)", color: "var(--gold)" }}>
            <Trophy size={22} aria-hidden />
          </span>
          <div>
            <h1>טבלת הצוות</h1>
            <p className="muted">כל אתגר יומי שווה עד 100 נקודות. אלוף/ת היום מקבל/ת פריט, אלוף/ת השבוע (ראשון עד שבת) — פריט אגדי ופרס אמיתי.</p>
          </div>
        </div>
        <div className="panel-row">
          <div className="segmented" role="radiogroup" aria-label="תקופה">
            <button type="button" role="radio" aria-checked={tab === "today"} onClick={() => setTab("today")}>
              היום
            </button>
            <button type="button" role="radio" aria-checked={tab === "week"} onClick={() => setTab("week")}>
              השבוע
            </button>
          </div>
          <button type="button" className="icon-button" onClick={() => setReload((n) => n + 1)} aria-label="רענון">
            <RefreshCw size={18} aria-hidden />
          </button>
        </div>
      </header>

      {server === false && (
        <p className="error-box">
          טבלת הצוות פועלת כשהאתר רץ דרך <code>npm start</code> (השרת שבתוך הפרויקט שומר את השחקנים והתוצאות). בשרת סטטי רגיל או ב־
          <code>npm run dev</code> אין טבלה — המשחקים עצמם עובדים כרגיל.
        </p>
      )}
      {failed && <p className="error-box">לא הצלחנו לטעון את הטבלה. נסו לרענן.</p>}
      {server && !data && !failed && <div className="loading">טוען…</div>}

      {data && (
        <div className="leader-layout">
          <div>
            {(() => {
              const rows = tab === "week" ? week : todayTotals;
              const podium = rows.slice(0, 3);
              return (
                <>
                  {podium.length > 0 && (
                    <section className="podium" aria-label={tab === "week" ? "המובילים השבוע" : "המובילים היום"}>
                      {[1, 0, 2].map((i) =>
                        podium[i] ? (
                          <div key={podium[i].key} className={`podium-spot place-${i + 1}${isMe(podium[i]) ? " is-me" : ""}`}>
                            {i === 0 && <Crown size={26} aria-hidden className="podium-crown" />}
                            {face(podium[i].player, i === 0 ? 104 : 80, i === 0 ? RARITIES.legendary.colour : undefined)}
                            <strong>{podium[i].name}</strong>
                            <span>{podium[i].points} נק׳</span>
                            <span className="podium-block">{MEDALS[i]}</span>
                          </div>
                        ) : null,
                      )}
                    </section>
                  )}
                  {tab === "week" && week[0] && (
                    <p className="champion-note">
                      <Crown size={16} aria-hidden /> אם המצב לא ישתנה עד שבת, <strong>{week[0].name}</strong> יקבל/תקבל כתר או גביע אגדי — ופרס אמיתי.
                    </p>
                  )}
                  <h2 className="table-title">{tab === "week" ? "השבוע" : "סיכום היום"}</h2>
                  <RankTable
                    rows={rows.map((t) => ({
                      key: t.key,
                      face: face(t.player, 30),
                      name: t.name,
                      points: t.points,
                      detail: tab === "week" ? `${t.games} אתגרים` : `${t.games} מתוך ${GAME_LIST.length}`,
                      me: isMe(t),
                    }))}
                    empty={tab === "week" ? "עוד אין תוצאות השבוע." : "עוד אף אחד לא שיחק היום. היו הראשונים!"}
                  />
                </>
              );
            })()}

            {tab === "today" && (
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
                      <RankTable
                        rows={rows.map((r) => ({
                          key: `${r.player ?? r.name}-${r.game}`,
                          face: face(r.player, 24),
                          name: r.name,
                          points: r.points,
                          detail: r.summary,
                          me: isMe(r),
                        }))}
                        empty="—"
                        compact
                      />
                    </section>
                  );
                })}
              </div>
            )}
          </div>

          <aside className="drops-feed" aria-labelledby="drops-title">
            <h2 id="drops-title">
              <Gift size={18} aria-hidden /> פרסים אחרונים
            </h2>
            {data.drops.length === 0 ? (
              <p className="muted small">עוד לא חולקו פרסים. תוצאה של 75 ומעלה מזכה לפעמים בפריט.</p>
            ) : (
              <ul>
                {data.drops.map((d) => (
                  <li key={d.id}>
                    {face(d.owner, 32)}
                    <span>
                      <strong>{d.ownerName}</strong> קיבל/ה <span style={{ color: RARITIES[d.rarity].colour, fontWeight: 650 }}>{itemName(d)}</span>
                      <span className="muted small">
                        {" "}
                        · {REASONS[d.reason]} · {RARITIES[d.rarity].he}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </aside>
        </div>
      )}
    </main>
  );
}

function RankTable({
  rows,
  empty,
  compact,
}: {
  rows: { key: string; face: React.ReactNode; name: string; points: number; detail: string; me: boolean }[];
  empty: string;
  compact?: boolean;
}) {
  if (!rows.length) return <p className="muted small">{empty}</p>;
  return (
    <ol className={compact ? "rank-table compact" : "rank-table"}>
      {rows.map((r, i) => (
        <li key={r.key} className={r.me ? "is-me" : undefined}>
          <span className="rank">{MEDALS[i] ?? i + 1}</span>
          <span className="rank-name">
            {r.face}
            {r.name}
          </span>
          <span className="rank-detail muted">{r.detail}</span>
          <strong className="rank-points">{r.points}</strong>
        </li>
      ))}
    </ol>
  );
}
