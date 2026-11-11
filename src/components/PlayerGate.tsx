"use client";

import { Gift, KeyRound, Sparkles, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { randomAvatar, sanitizeNickname, type AvatarConfig } from "@shared/avatar.mjs";
import { itemName, KINDS, RARITIES, REASONS } from "@shared/merch.mjs";
import {
  joinServerIfNeeded,
  legacyName,
  markItemsSeen,
  refreshPlayer,
  signInWithCode,
  signUp,
  updatePlayer,
  usePlayer,
  type Player,
} from "@/lib/player";
import AvatarEditor from "./AvatarEditor";
import { ItemArt } from "./Avatar";

/**
 * Nobody plays without a nickname and an avatar: the first visit is the
 * sign-up. /admin is the one page that does not ask.
 */
export default function PlayerGate({ children }: { children: React.ReactNode }) {
  const player = usePlayer();
  const path = usePathname();
  if (player === null && !path.startsWith("/admin")) return <Onboarding />;
  return (
    <>
      {children}
      {player && <PlayerSync />}
      {player && <MerchReveal player={player} />}
    </>
  );
}

/** Keeps the browser's copy in step with the server: on load and when the tab comes back. */
function PlayerSync() {
  useEffect(() => {
    joinServerIfNeeded().then(refreshPlayer);
    const onFocus = () => void refreshPlayer();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);
  return null;
}

function Onboarding() {
  const [nickname, setNickname] = useState(legacyName);
  const [avatar, setAvatar] = useState<AvatarConfig>(() => randomAvatar());
  const [mode, setMode] = useState<"new" | "code">("new");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clean = sanitizeNickname(nickname);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clean) return setError("כינוי של 2 עד 20 תווים, בבקשה.");
    setBusy(true);
    const r = await signUp(clean, avatar);
    setBusy(false);
    if (r === "taken") setError(`הכינוי "${clean}" כבר תפוס. בחרו כינוי אחר.`);
    else if (r === "invalid") setError("הכינוי לא תקין. נסו כינוי אחר.");
    else if (r === "error") setError("לא הצלחנו להירשם. נסו שוב בעוד רגע.");
  };

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const ok = await signInWithCode(code);
    setBusy(false);
    if (!ok) setError("הקוד לא מוכר. העתיקו אותו שוב מהפרופיל במכשיר השני.");
  };

  return (
    <main id="main-content" className="onboarding">
      <section className="onboarding-card">
        <header>
          <h1>
            <Sparkles size={26} aria-hidden /> ברוכים הבאים לגלובוס
          </h1>
          <p className="muted">
            בחרו כינוי ועצבו אווטאר — כך הצוות יראה אתכם בטבלה. תוצאות טובות מזכות לפעמים במרצ׳נדייס של מדינות: כובעים, צעיפים, סיכות
            דגל, ולאלוף השבוע גם פרס אמיתי.
          </p>
        </header>

        {mode === "new" ? (
          <form onSubmit={create} className="onboarding-form">
            <label className="nickname-field">
              <span className="field-label">הכינוי שלי</span>
              <input value={nickname} onChange={(e) => (setNickname(e.target.value), setError(null))} maxLength={20} placeholder="למשל: נווט הצפון" autoFocus />
            </label>
            <AvatarEditor value={avatar} onChange={setAvatar} />
            {error && (
              <p className="bad" role="alert">
                {error}
              </p>
            )}
            <div className="onboarding-actions">
              <button type="submit" className="button primary big" disabled={busy || !clean}>
                יאללה, מתחילים
              </button>
              <button type="button" className="button ghost" onClick={() => (setMode("code"), setError(null))}>
                <KeyRound size={16} aria-hidden />
                כבר יש לי קוד התחברות
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={signIn} className="onboarding-form">
            <label>
              <span className="field-label">קוד ההתחברות (בפרופיל, במכשיר שבו נרשמתם)</span>
              <input value={code} onChange={(e) => (setCode(e.target.value), setError(null))} dir="ltr" autoFocus spellCheck={false} />
            </label>
            {error && (
              <p className="bad" role="alert">
                {error}
              </p>
            )}
            <div className="onboarding-actions">
              <button type="submit" className="button primary big" disabled={busy || code.trim().length < 10}>
                התחברות
              </button>
              <button type="button" className="button ghost" onClick={() => (setMode("new"), setError(null))}>
                הרשמה חדשה
              </button>
            </div>
          </form>
        )}
      </section>
    </main>
  );
}

/** New merch arrives as a reveal, one item at a time, with "wear it now". */
function MerchReveal({ player }: { player: Player }) {
  const fresh = player.items.filter((i) => !i.seen);
  const [index, setIndex] = useState(0);
  if (!fresh.length) return null;
  const item = fresh[Math.min(index, fresh.length - 1)];
  const rarity = RARITIES[item.rarity];
  const slot = KINDS[item.kind].slot;
  const worn = player.equipped[slot] === item.id;
  const last = index >= fresh.length - 1;

  const close = () => {
    setIndex(0);
    void markItemsSeen();
  };

  return (
    <div className="reveal-backdrop" role="dialog" aria-modal="true" aria-labelledby="reveal-title">
      <div className="reveal-card" style={{ ["--rarity" as string]: rarity.colour }}>
        <button type="button" className="icon-button reveal-close" onClick={close} aria-label="סגירה">
          <X size={18} aria-hidden />
        </button>
        <p className="reveal-kicker">
          <Gift size={18} aria-hidden /> {REASONS[item.reason]}
          {fresh.length > 1 && ` · ${index + 1} מתוך ${fresh.length}`}
        </p>
        <div className="reveal-art">
          <ItemArt item={item} size={180} />
        </div>
        <h2 id="reveal-title">{itemName(item)}</h2>
        <p className="rarity-tag" style={{ color: rarity.colour }}>
          {rarity.he}
        </p>
        {item.physical && <p className="reveal-physical">🎁 זה גם פרס אמיתי — הצוות ימסור לכם אותו.</p>}
        <div className="result-actions">
          <button
            type="button"
            className="button primary"
            disabled={worn}
            onClick={() => void updatePlayer({ equipped: { ...player.equipped, [slot]: item.id } })}
          >
            {worn ? "לבוש ✓" : "ללבוש עכשיו"}
          </button>
          <button type="button" className="button" onClick={() => (last ? close() : setIndex(index + 1))}>
            {last ? "לארון שלי" : "הפריט הבא"}
          </button>
        </div>
      </div>
    </div>
  );
}
