"use client";

import { Check, Copy, RotateCcw } from "lucide-react";
import { useState } from "react";

interface Props {
  won: boolean;
  title: string;
  children?: React.ReactNode;
  shareText: string;
  onAgain: () => void;
  againLabel: string;
}

export default function ResultCard({ won, title, children, shareText, onAgain, againLabel }: Props) {
  const [copied, setCopied] = useState(false);

  const share = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("העתיקו את התוצאה:", shareText);
    }
  };

  return (
    <section className={`result-card ${won ? "is-won" : "is-lost"}`} aria-live="polite">
      <h2>{title}</h2>
      {children}
      <pre className="share-preview" dir="rtl">
        {shareText}
      </pre>
      <div className="result-actions">
        <button type="button" className="button primary" onClick={share}>
          {copied ? <Check size={18} aria-hidden /> : <Copy size={18} aria-hidden />}
          {copied ? "הועתק — הדביקו בקבוצה" : "העתקת התוצאה לצוות"}
        </button>
        <button type="button" className="button" onClick={onAgain}>
          <RotateCcw size={18} aria-hidden />
          {againLabel}
        </button>
      </div>
    </section>
  );
}
