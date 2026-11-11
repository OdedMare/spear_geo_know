"use client";

import { Shuffle } from "lucide-react";
import {
  ACCESSORIES,
  BACKGROUNDS,
  EYES,
  HAIR_COLORS,
  HAIR_STYLES,
  MOUTHS,
  randomAvatar,
  SHIRTS,
  SKINS,
  type AvatarConfig,
} from "@shared/avatar.mjs";
import { useWorld } from "@/lib/world";
import Avatar from "./Avatar";
import type { Item } from "@shared/merch.mjs";
import type { Slot } from "@/lib/player";

type NumberKey = Exclude<keyof AvatarConfig, "country">;

const COLOUR_ROWS: { key: NumberKey; label: string; colours: string[] }[] = [
  { key: "skin", label: "גוון עור", colours: SKINS },
  { key: "hairColor", label: "צבע שיער", colours: HAIR_COLORS },
  { key: "shirt", label: "חולצה", colours: SHIRTS },
  { key: "bg", label: "רקע", colours: BACKGROUNDS },
];

const STYLE_ROWS: { key: NumberKey; label: string; options: { he: string }[] }[] = [
  { key: "hair", label: "תספורת", options: HAIR_STYLES },
  { key: "eyes", label: "עיניים", options: EYES },
  { key: "mouth", label: "פה", options: MOUTHS },
  { key: "accessory", label: "אביזר", options: ACCESSORIES },
];

/** Every part of the avatar, with a live preview. */
export default function AvatarEditor({
  value,
  onChange,
  equipped,
}: {
  value: AvatarConfig;
  onChange: (a: AvatarConfig) => void;
  equipped?: Partial<Record<Slot, Item>>;
}) {
  const { world } = useWorld();
  const set = (patch: Partial<AvatarConfig>) => onChange({ ...value, ...patch });
  const countries = world ? world.countries.filter((c) => c.sovereign && c.flag) : [];

  return (
    <div className="avatar-editor">
      <div className="avatar-editor-preview">
        <Avatar avatar={value} equipped={equipped} size={176} title="האווטאר שלי" />
        <button type="button" className="button small" onClick={() => onChange({ ...randomAvatar(), country: value.country })}>
          <Shuffle size={16} aria-hidden />
          הפתיעו אותי
        </button>
      </div>

      <div className="avatar-editor-controls">
        {STYLE_ROWS.map((row) => (
          <fieldset key={row.key} className="part-row">
            <legend>{row.label}</legend>
            <div className="chip-row">
              {row.options.map((o, i) => (
                <button key={o.he} type="button" className="chip" aria-pressed={value[row.key] === i} onClick={() => set({ [row.key]: i })}>
                  {o.he}
                </button>
              ))}
            </div>
          </fieldset>
        ))}
        {COLOUR_ROWS.map((row) => (
          <fieldset key={row.key} className="part-row">
            <legend>{row.label}</legend>
            <div className="chip-row">
              {row.colours.map((c, i) => (
                <button
                  key={c}
                  type="button"
                  className="swatch-button"
                  style={{ background: c }}
                  aria-pressed={value[row.key] === i}
                  aria-label={`${row.label} ${i + 1}`}
                  onClick={() => set({ [row.key]: i })}
                />
              ))}
            </div>
          </fieldset>
        ))}
        <label className="part-row">
          <span className="field-label">המדינה האהובה עליי (דגל על החולצה)</span>
          <select value={value.country ?? ""} onChange={(e) => set({ country: e.target.value || null })}>
            <option value="">ללא</option>
            {countries.map((c) => (
              <option key={c.id} value={c.iso2.toUpperCase()}>
                {c.he}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
