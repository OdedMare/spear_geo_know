"use client";

import { Check, Copy, RotateCcw, Swords } from "lucide-react";
import { createContext, useContext, useState } from "react";

/** Set by GamePage: the link that hands a friend this exact puzzle. */
export const ChallengeContext = createContext<string | null>(null);

interface Props {
  won: boolean;
  title: string;
  children?: React.ReactNode;
  shareText: string;
  onAgain: () => void;
  againLabel: string;
}

async function copy(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    window.prompt("העתיקו:", text);
    return false;
  }
}

export default function ResultCard({ won, title, children, shareText, onAgain, againLabel }: Props) {
  const challenge = useContext(ChallengeContext);
  const [copied, setCopied] = useState<"share" | "challenge" | null>(null);

  const flash = (what: "share" | "challenge") => {
    setCopied(what);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <section className={`result-card ${won ? "is-won" : "is-lost"}`} aria-live="polite">
      <h2>{title}</h2>
      {children}
      <pre className="share-preview" dir="rtl">
        {shareText}
      </pre>
      <div className="result-actions">
        <button type="button" className="button primary" onClick={async () => (await copy(shareText)) && flash("share")}>
          {copied === "share" ? <Check size={18} aria-hidden /> : <Copy size={18} aria-hidden />}
          {copied === "share" ? "הועתק — הדביקו בקבוצה" : "העתקת התוצאה לצוות"}
        </button>
        {challenge && (
          <button
            type="button"
            className="button"
            onClick={async () => (await copy(`${shareText}\n\nתצליחו יותר? ${challenge}`)) && flash("challenge")}
          >
            {copied === "challenge" ? <Check size={18} aria-hidden /> : <Swords size={18} aria-hidden />}
            {copied === "challenge" ? "הקישור הועתק" : "אתגר חבר על אותו פאזל"}
          </button>
        )}
        <button type="button" className="button" onClick={onAgain}>
          <RotateCcw size={18} aria-hidden />
          {againLabel}
        </button>
      </div>
    </section>
  );
}
