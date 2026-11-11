"use client";

import { Check, Copy, KeyRound, LogOut, Palette, Save } from "lucide-react";
import { useState } from "react";
import { sanitizeNickname, type AvatarConfig } from "@shared/avatar.mjs";
import { itemName, KINDS, RARITIES, REASONS, SLOTS, type Item } from "@shared/merch.mjs";
import { signOut, updatePlayer, usePlayer, wornItems, type Slot } from "@/lib/player";
import { useTeamServer } from "@/lib/scores";
import Avatar, { ItemArt } from "./Avatar";
import AvatarEditor from "./AvatarEditor";

const byValue = (a: Item, b: Item) => RARITIES[b.rarity].order - RARITIES[a.rarity].order || b.at.localeCompare(a.at);

export default function Profile() {
  const player = usePlayer();
  const server = useTeamServer();
  const [draftName, setDraftName] = useState<string | null>(null);
  const [draftAvatar, setDraftAvatar] = useState<AvatarConfig | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [filter, setFilter] = useState<Slot | "all">("all");

  if (!player) return null;
  const worn = wornItems(player);
  const nickname = draftName ?? player.nickname;
  const avatar = draftAvatar ?? player.avatar;
  const dirty = (draftName !== null && draftName !== player.nickname) || draftAvatar !== null;
  const items = [...player.items].sort(byValue).filter((i) => filter === "all" || KINDS[i.kind].slot === filter);

  const save = async () => {
    const clean = sanitizeNickname(nickname);
    if (!clean) return setMessage("כינוי של 2 עד 20 תווים, בבקשה.");
    const r = await updatePlayer({ nickname: clean, avatar });
    if (r === "ok") {
      setDraftName(null);
      setDraftAvatar(null);
      setMessage("נשמר ✓");
    } else setMessage(r === "taken" ? `הכינוי "${clean}" תפוס.` : "לא הצלחנו לשמור. נסו שוב.");
  };

  const toggle = (item: Item) => {
    const slot = KINDS[item.kind].slot;
    const equipped = { ...player.equipped };
    if (equipped[slot] === item.id) delete equipped[slot];
    else equipped[slot] = item.id;
    void updatePlayer({ equipped });
  };

  return (
    <main id="main-content" className="game-page profile">
      <section className="profile-head">
        <Avatar avatar={avatar} equipped={worn} size={140} animate title={`האווטאר של ${player.nickname}`} />
        <div className="profile-name">
          <label>
            <span className="field-label">הכינוי שלי</span>
            <input value={nickname} maxLength={20} onChange={(e) => (setDraftName(e.target.value), setMessage(null))} />
          </label>
          <p className="muted small">
            {player.items.length} פריטים בארון · לבוש: {Object.keys(worn).length ? Object.values(worn).map((i) => itemName(i!)).join(", ") : "בלי מרצ׳נדייס עדיין"}
          </p>
          <div className="panel-row">
            <button type="button" className="button primary" disabled={!dirty} onClick={save}>
              <Save size={16} aria-hidden />
              שמירה
            </button>
            {message && <span role="status">{message}</span>}
          </div>
        </div>
      </section>

      <details className="rules" open={draftAvatar !== null}>
        <summary>
          <Palette size={16} aria-hidden /> עיצוב האווטאר
        </summary>
        <AvatarEditor
          value={avatar}
          onChange={(a) => (setDraftAvatar(a), setMessage(null))}
          equipped={worn}
          bestRarity={Math.max(-1, ...player.items.map((i) => RARITIES[i.rarity].order))}
        />
      </details>

      <section className="game-group" aria-labelledby="closet-title">
        <h2 id="closet-title">הארון שלי</h2>
        {server === false && <p className="muted">מרצ׳נדייס מתקבל כשהאתר רץ עם שרת הצוות (npm start).</p>}
        {player.items.length === 0 ? (
          <p className="muted">
            עוד אין פריטים. תוצאה של 75 ומעלה באתגר היומי מזכה לפעמים בפריט, אלוף/ת היום מקבל/ת פריט נדיר, ואלוף/ת השבוע פריט אגדי ופרס
            אמיתי.
          </p>
        ) : (
          <>
            <div className="segmented small" role="radiogroup" aria-label="סינון לפי מקום">
              <button type="button" role="radio" aria-checked={filter === "all"} onClick={() => setFilter("all")}>
                הכל
              </button>
              {(Object.keys(SLOTS) as Slot[]).map((s) => (
                <button key={s} type="button" role="radio" aria-checked={filter === s} onClick={() => setFilter(s)}>
                  {SLOTS[s]}
                </button>
              ))}
            </div>
            <ul className="closet">
              {items.map((item) => {
                const on = player.equipped[KINDS[item.kind].slot] === item.id;
                const rarity = RARITIES[item.rarity];
                return (
                  <li key={item.id} className={on ? "closet-item is-worn" : "closet-item"} style={{ ["--rarity" as string]: rarity.colour }}>
                    <ItemArt item={item} size={88} />
                    <strong>{itemName(item)}</strong>
                    <span className="rarity-tag" style={{ color: rarity.colour }}>
                      {rarity.he}
                    </span>
                    <span className="muted small">
                      {REASONS[item.reason]} · {item.day.split("-").reverse().join("/")}
                    </span>
                    {item.physical && <span className="small">{item.delivered ? "🎁 פרס אמיתי — נמסר ✓" : "🎁 פרס אמיתי — ממתין למסירה"}</span>}
                    <button type="button" className={on ? "button small" : "button small primary"} onClick={() => toggle(item)}>
                      {on ? (
                        <>
                          <Check size={14} aria-hidden /> לבוש — להסיר
                        </>
                      ) : (
                        `ללבוש (${SLOTS[KINDS[item.kind].slot]})`
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </section>

      <section className="game-group" aria-labelledby="account-title">
        <h2 id="account-title">חשבון</h2>
        {player.token ? (
          <details className="rules">
            <summary>
              <KeyRound size={16} aria-hidden /> קוד התחברות ממכשיר אחר
            </summary>
            <p className="muted small">הקוד הוא המפתח לפרופיל שלכם. אל תשתפו אותו — מי שמחזיק בו יכול לשחק בשמכם.</p>
            <div className="code-row">
              <code dir="ltr">{player.token}</code>
              <button
                type="button"
                className="button small"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(player.token!);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  } catch {
                    window.prompt("העתיקו:", player.token!);
                  }
                }}
              >
                {copied ? <Check size={14} aria-hidden /> : <Copy size={14} aria-hidden />}
                {copied ? "הועתק" : "העתקה"}
              </button>
            </div>
          </details>
        ) : (
          <p className="muted small">הפרופיל שמור בדפדפן הזה בלבד. כשהאתר ירוץ עם שרת הצוות הוא יצטרף אליו אוטומטית.</p>
        )}
        <button
          type="button"
          className="button ghost small"
          onClick={() => {
            if (window.confirm(player.token ? "להתנתק? בלי קוד ההתחברות לא תוכלו לחזור לפרופיל הזה." : "להתנתק ולמחוק את הפרופיל מהדפדפן?")) signOut();
          }}
        >
          <LogOut size={16} aria-hidden />
          התנתקות מהדפדפן הזה
        </button>
      </section>
    </main>
  );
}
