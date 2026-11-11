"use client";

import { Trophy } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { refreshPlayer, signOut, usePlayer } from "@/lib/player";
import { submitScore, useTeamServer } from "@/lib/scores";
import { loadJSON, saveJSON, type GameId, type GameResult } from "@/lib/storage";

type Status = "idle" | "sending" | "saved" | "exists" | "unauthorised" | "error";

/** After a daily game: the result goes to the team table under the player, once. */
export default function TeamPanel({ game, day, result }: { game: GameId; day: string; result: GameResult }) {
  const server = useTeamServer();
  const player = usePlayer();
  const token = player?.token ?? null;
  const sentKey = `geo.${game}.${day}.sent`;
  const [status, setStatus] = useState<Status>(() => (loadJSON<boolean>(sentKey) ? "saved" : "idle"));
  const [dropped, setDropped] = useState(0);
  const sending = useRef(false);

  useEffect(() => {
    if (!server || !token || sending.current || loadJSON<boolean>(sentKey)) return;
    sending.current = true;
    submitScore(game, day, token, result).then((r) => {
      setStatus(r.status);
      if (r.status === "saved" || r.status === "exists") saveJSON(sentKey, true);
      if (r.drops.length) {
        setDropped(r.drops.length);
        // The reveal opens from the player's refreshed closet.
        void refreshPlayer();
      }
    });
  }, [server, token, game, day, result, sentKey]);

  if (server === null) return null;
  if (!server) {
    return (
      <p className="team-panel muted small">
        <Trophy size={16} aria-hidden /> טבלת הצוות והמרצ׳נדייס פעילים כשהאתר רץ דרך <code>npm start</code>.
      </p>
    );
  }

  return (
    <section className="team-panel" aria-label="טבלת הצוות" role="status">
      <Trophy size={18} aria-hidden />
      {status === "saved" || status === "exists" ? (
        <span>
          {status === "saved" ? "התוצאה נשלחה לטבלת הצוות." : "התוצאה של היום כבר בטבלה."}
          {dropped > 0 && " וזכיתם בפריט חדש! 🎁"} <Link href="/leaderboard">לטבלה ←</Link>
        </span>
      ) : status === "unauthorised" ? (
        <span>
          השרת לא מכיר את הפרופיל הזה (אולי הנתונים שלו אופסו).{" "}
          <button type="button" className="button small" onClick={signOut}>
            להירשם מחדש
          </button>
        </span>
      ) : status === "error" ? (
        <span className="bad">לא הצלחנו לשלוח את התוצאה. היא תישלח בפעם הבאה שתפתחו את המשחק.</span>
      ) : (
        <span className="muted">שולח לטבלת הצוות…</span>
      )}
    </section>
  );
}
