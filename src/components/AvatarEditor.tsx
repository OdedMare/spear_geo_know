"use client";

import { Lock, Shuffle, Undo2 } from "lucide-react";
import { useState } from "react";
import {
  BACKGROUNDS,
  BG_STYLES,
  BODIES,
  BROWS,
  EARRINGS,
  EYE_COLOR_NAMES,
  EYE_COLORS,
  EYES,
  FACES,
  FACIAL_HAIR,
  FRAMES,
  GLASSES,
  HAIR_COLOR_NAMES,
  HAIR_COLORS,
  HAIR_STYLES,
  HEADWEAR,
  LIP_COLORS,
  LIPS,
  MOUTHS,
  NOSES,
  PATTERNS,
  randomAvatar,
  SKINS,
  TOP_COLOR_NAMES,
  TOP_COLORS,
  TOPS,
  type AvatarConfig,
} from "@shared/avatar.mjs";
import { RARITIES, type Item } from "@shared/merch.mjs";
import type { Slot } from "@/lib/player";
import { useWorld } from "@/lib/world";
import Avatar from "./Avatar";

type Key = Exclude<keyof AvatarConfig, "country" | "v">;
type TabId = "body" | "face" | "hair" | "clothes" | "extras" | "background";

const TABS: { id: TabId; label: string; keys: Key[] }[] = [
  { id: "body", label: "גוף", keys: ["skin", "face", "nose", "freckles"] },
  { id: "face", label: "פנים", keys: ["eyes", "eyeColor", "brows", "mouth", "lips"] },
  { id: "hair", label: "שיער", keys: ["hair", "hairColor", "facial"] },
  { id: "clothes", label: "בגדים", keys: ["top", "topColor", "pattern"] },
  { id: "extras", label: "אביזרים", keys: ["glasses", "earrings", "headwear"] },
  { id: "background", label: "רקע", keys: ["bg", "bgStyle"] },
];

const FRAME_RARITY = [null, "rare", "epic", "legendary"] as const;

interface Props {
  value: AvatarConfig;
  onChange: (a: AvatarConfig) => void;
  equipped?: Partial<Record<Slot, Item>>;
  /** The best rarity the player owns (-1 none … 3 legendary): unlocks frames. */
  bestRarity?: number;
}

/** Every part of the avatar, a tab at a time, each option shown on the player's own avatar. */
export default function AvatarEditor({ value, onChange, equipped, bestRarity = -1 }: Props) {
  const { world } = useWorld();
  const [tab, setTab] = useState<TabId>("body");
  const [history, setHistory] = useState<AvatarConfig[]>([]);
  const countries = world ? world.countries.filter((c) => c.sovereign && c.flag) : [];

  const change = (next: AvatarConfig) => {
    setHistory((h) => [...h.slice(-30), value]);
    onChange(next);
  };
  const set = (patch: Partial<AvatarConfig>) => change({ ...value, ...patch });
  const undo = () => {
    const prev = history[history.length - 1];
    if (!prev) return;
    setHistory((h) => h.slice(0, -1));
    onChange(prev);
  };

  /** Switching build keeps the person, but swaps what does not fit it. */
  const setBody = (body: number) => {
    if (body === value.body) return;
    const hairFor = HAIR_STYLES[value.hair].for;
    const id = BODIES[body].id;
    set({
      body,
      hair: hairFor.includes(id) ? value.hair : id === "f" ? 11 : 0,
      facial: id === "f" ? 0 : value.facial,
      lips: id === "m" ? 0 : value.lips,
      top: id === "m" && TOPS[value.top].id === "dress" ? 0 : value.top,
    });
  };

  const shuffleTab = () => {
    const r = randomAvatar(Math.random, value.body);
    const keys = TABS.find((t) => t.id === tab)!.keys;
    change({ ...value, ...Object.fromEntries(keys.map((k) => [k, r[k]])) });
  };

  /** A row of options, each drawn on this avatar. */
  const thumbs = (key: Key, options: { he: string }[], crop = false, filter?: (i: number) => boolean) => (
    <div className="thumb-row" role="radiogroup">
      {options.map((o, i) =>
        filter && !filter(i) ? null : (
          <button key={o.he} type="button" role="radio" className="thumb" aria-checked={value[key] === i} onClick={() => set({ [key]: i })} title={o.he}>
            <Avatar avatar={{ ...value, [key]: i }} equipped={key === "top" || key === "hair" || key === "headwear" ? undefined : equipped} size={60} crop={crop} />
            <span>{o.he}</span>
          </button>
        ),
      )}
    </div>
  );
  const swatches = (key: Key, colours: (string | null)[], names?: string[]) => (
    <div className="chip-row" role="radiogroup">
      {colours.map((c, i) => (
        <button
          key={`${c}-${i}`}
          type="button"
          role="radio"
          className="swatch-button"
          style={{ background: c ?? "linear-gradient(135deg, #f4c7b5, #c98e7a)" }}
          aria-checked={value[key] === i}
          aria-label={names?.[i] ?? `${i + 1}`}
          title={names?.[i]}
          onClick={() => set({ [key]: i })}
        />
      ))}
    </div>
  );
  const chips = (key: Key, options: { he: string }[], locked?: (i: number) => boolean) => (
    <div className="chip-row" role="radiogroup">
      {options.map((o, i) => (
        <button
          key={o.he}
          type="button"
          role="radio"
          className="chip"
          aria-checked={value[key] === i}
          disabled={locked?.(i)}
          onClick={() => set({ [key]: i })}
        >
          {locked?.(i) && <Lock size={12} aria-hidden />} {o.he}
        </button>
      ))}
    </div>
  );
  const row = (label: string, content: React.ReactNode) => (
    <div className="part-row">
      <span className="part-label">{label}</span>
      {content}
    </div>
  );

  return (
    <div className="avatar-editor">
      <div className="avatar-editor-preview">
        <Avatar avatar={value} equipped={equipped} size={184} animate title="האווטאר שלי" />
        <div className="segmented small" role="radiogroup" aria-label="מבנה גוף">
          {BODIES.map((b, i) => (
            <button key={b.id} type="button" role="radio" aria-checked={value.body === i} onClick={() => setBody(i)}>
              {b.he}
            </button>
          ))}
        </div>
        <div className="panel-row">
          <button type="button" className="button small" onClick={() => change({ ...randomAvatar(Math.random, value.body), country: value.country, frame: value.frame })}>
            <Shuffle size={16} aria-hidden />
            הפתיעו אותי
          </button>
          <button type="button" className="button small ghost" onClick={undo} disabled={!history.length} aria-label="ביטול השינוי האחרון">
            <Undo2 size={16} aria-hidden />
            ביטול
          </button>
        </div>
      </div>

      <div className="avatar-editor-controls">
        <div className="editor-tabs" role="tablist" aria-label="חלקי האווטאר">
          {TABS.map((t) => (
            <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
          <button type="button" className="editor-tab-shuffle" onClick={shuffleTab} aria-label="הגרלה בלשונית הזאת" title="הגרלה בלשונית הזאת">
            <Shuffle size={15} aria-hidden />
          </button>
        </div>

        <div className="editor-panel" role="tabpanel">
          {tab === "body" && (
            <>
              {row("גוון עור", swatches("skin", SKINS))}
              {row("צורת פנים", thumbs("face", FACES, true))}
              {row("אף", thumbs("nose", NOSES, true))}
              {row("נמשים", chips("freckles", [{ he: "בלי" }, { he: "עם נמשים" }]))}
            </>
          )}
          {tab === "face" && (
            <>
              {row("עיניים", thumbs("eyes", EYES, true))}
              {row("צבע עיניים", swatches("eyeColor", EYE_COLORS, EYE_COLOR_NAMES))}
              {row("גבות", thumbs("brows", BROWS, true))}
              {row("פה", thumbs("mouth", MOUTHS, true))}
              {row("שפתיים", swatches("lips", LIP_COLORS, LIPS.map((l) => l.he)))}
            </>
          )}
          {tab === "hair" && (
            <>
              {row("תספורת", thumbs("hair", HAIR_STYLES))}
              {row("צבע שיער", swatches("hairColor", HAIR_COLORS, HAIR_COLOR_NAMES))}
              {BODIES[value.body].id === "m" && row("זקן ושפם", thumbs("facial", FACIAL_HAIR, true))}
            </>
          )}
          {tab === "clothes" && (
            <>
              {row("חולצה / שמלה", thumbs("top", TOPS))}
              {row("צבע", swatches("topColor", TOP_COLORS, TOP_COLOR_NAMES))}
              {row("דוגמה", chips("pattern", PATTERNS))}
              {equipped?.body && <p className="muted small">כרגע לבוש/ה מרצ׳נדייס על הגוף — הוא מוצג במקום החולצה. אפשר להסיר אותו בארון.</p>}
            </>
          )}
          {tab === "extras" && (
            <>
              {row("משקפיים", thumbs("glasses", GLASSES, true))}
              {row("עגילים", chips("earrings", EARRINGS))}
              {row("כיסוי ראש", thumbs("headwear", HEADWEAR))}
            </>
          )}
          {tab === "background" && (
            <>
              {row("סוג רקע", chips("bgStyle", BG_STYLES))}
              {row("צבע רקע", swatches("bg", BACKGROUNDS))}
              <label className="part-row">
                <span className="part-label">המדינה האהובה עליי (דגל על החולצה או ברקע)</span>
                <select value={value.country ?? ""} onChange={(e) => set({ country: e.target.value || null })}>
                  <option value="">ללא</option>
                  {countries.map((c) => (
                    <option key={c.id} value={c.iso2.toUpperCase()}>
                      {c.he}
                    </option>
                  ))}
                </select>
              </label>
              {row(
                "מסגרת (נפתחת עם מרצ׳נדייס באותה דרגה)",
                chips("frame", FRAMES, (i) => {
                  const r = FRAME_RARITY[i];
                  return r !== null && RARITIES[r].order > bestRarity;
                }),
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
