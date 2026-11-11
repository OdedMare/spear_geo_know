"use client";

import { Send, Trophy } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { getName, setName, submitScore, useTeamServer } from "@/lib/scores";
import { loadJSON, saveJSON, type GameId, type GameResult } from "@/lib/storage";

type Status = "idle" | "sending" | "saved" | "exists" | "error";

/** After a daily game: send the result to the team table, under the player's name. */
export default function TeamPanel({ game, day, result }: { game: GameId; day: string; result: GameResult }) {
  const server = useTeamServer();
  const sentKey = `geo.${game}.${day}.sent`;
  const [name, setDraft] = useState(getName);
  const [status, setStatus] = useState<Status>(() => (loadJSON<boolean>(sentKey) ? "saved" : "idle"));
  const sending = useRef(false);

  const send = (who: string) => {
    sending.current = true;
    setStatus("sending");
    submitScore(game, day, who, result).then((s) => {
      setStatus(s);
      if (s === "saved" || s === "exists") saveJSON(sentKey, true);
    });
  };

  // A player who already has a name is sent automatically, once.
  useEffect(() => {
    const who = getName();
    if (!server || !who || sending.current || loadJSON<boolean>(sentKey)) return;
    sending.current = true;
    submitScore(game, day, who, result).then((s) => {
      setStatus(s);
      if (s === "saved" || s === "exists") saveJSON(sentKey, true);
    });
  }, [server, game, day, result, sentKey]);

  if (server === null) return null;
  if (!server) {
    return (
      <p className="team-panel muted small">
        <Trophy size={16} aria-hidden /> טבלת הצוות פעילה כשהאתר רץ דרך <code>npm start</code>.
      </p>
    );
  }

  return (
    <section className="team-panel" aria-label="טבלת הצוות">
      <Trophy size={18} aria-hidden />
      {status === "saved" || status === "exists" ? (
        <span>
          {status === "saved" ? "התוצאה נשלחה לטבלת הצוות." : "התוצאה של היום כבר בטבלה."}{" "}
          <Link href="/leaderboard">לטבלה ←</Link>
        </span>
      ) : (
        <form
          className="team-form"
          onSubmit={(e) => {
            e.preventDefault();
            const who = name.trim();
            if (!who) return;
            setName(who);
            send(who);
          }}
        >
          <label>
            <span className="field-label">השם שלכם בטבלת הצוות</span>
            <input value={name} maxLength={24} onChange={(e) => setDraft(e.target.value)} placeholder="למשל: עודד" />
          </label>
          <button type="submit" className="button primary" disabled={!name.trim() || status === "sending"}>
            <Send size={16} aria-hidden />
            שליחה
          </button>
          {status === "error" && <span className="bad small">לא הצלחנו לשלוח. נסו שוב.</span>}
        </form>
      )}
    </section>
  );
}
