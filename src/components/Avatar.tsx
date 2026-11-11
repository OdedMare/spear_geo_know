"use client";

import { useId } from "react";
import {
  ACCESSORIES,
  BACKGROUNDS,
  EYES,
  HAIR_COLORS,
  HAIR_STYLES,
  MOUTHS,
  SHIRTS,
  SKINS,
  type AvatarConfig,
} from "@shared/avatar.mjs";
import { RARITIES, type Item } from "@shared/merch.mjs";
import type { Slot } from "@/lib/player";

const INK = "#1d1d1f";
const GOLD = "#f2c230";
const GOLD_DARK = "#c99700";

interface Props {
  avatar: AvatarConfig;
  /** Items worn, by slot. */
  equipped?: Partial<Record<Slot, Item>>;
  size?: number;
  /** A ring in a rarity colour, e.g. for the week's champion. */
  ring?: string;
  /** Draw only the body and the items (a mannequin for the closet). */
  faceless?: boolean;
  title?: string;
}

const flagHref = (iso2: string) => `/flags/${iso2.toLowerCase()}.svg`;
const pick = (colors: string[], i: number) => colors[i % colors.length] ?? "#888888";

export default function Avatar({ avatar, equipped = {}, size = 64, ring, faceless, title }: Props) {
  const uid = useId().replace(/:/g, "");
  const id = (name: string) => `${uid}-${name}`;
  const skin = faceless ? "#d1d1d6" : SKINS[avatar.skin];
  const hairColor = HAIR_COLORS[avatar.hairColor];
  const hair = HAIR_STYLES[avatar.hair].id;
  const eyes = EYES[avatar.eyes].id;
  const mouth = MOUTHS[avatar.mouth].id;
  const accessory = ACCESSORIES[avatar.accessory].id;
  const shirt = SHIRTS[avatar.shirt];
  const { head, neck, body, badge, hand } = equipped;
  // A hat covers the top of the hair; long hair still shows below it.
  const hatOn = Boolean(head);

  const stripes = (item: Item, dir: "v" | "h") => {
    const cols = item.colors.length ? item.colors : ["#888888"];
    const n = cols.length;
    return (
      <linearGradient id={id(`stripes-${item.id}-${dir}`)} x1="0" y1="0" x2={dir === "v" ? "1" : "0"} y2={dir === "v" ? "0" : "1"}>
        {cols.flatMap((c, i) => [
          <stop key={`${i}a`} offset={`${(100 * i) / n}%`} stopColor={c} />,
          <stop key={`${i}b`} offset={`${(100 * (i + 1)) / n}%`} stopColor={c} />,
        ])}
      </linearGradient>
    );
  };

  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      className="avatar"
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <defs>
        <clipPath id={id("circle")}>
          <circle cx="60" cy="60" r="60" />
        </clipPath>
        <clipPath id={id("pin")}>
          <circle cx="78" cy="104" r="7" />
        </clipPath>
        <clipPath id={id("chest")}>
          <rect x="70" y="98" width="15" height="11" rx="2" />
        </clipPath>
        {body && stripes(body, body.kind === "shirt" ? "v" : "h")}
        {neck && stripes(neck, "h")}
      </defs>

      <g clipPath={`url(#${id("circle")})`}>
        <circle cx="60" cy="60" r="60" fill={faceless ? "#f2f2f7" : BACKGROUNDS[avatar.bg]} />

        {/* Hair behind the head */}
        {!faceless && hair === "long" && <path d="M32 50 C28 82 34 98 44 102 L76 102 C86 98 92 82 88 50 Z" fill={hairColor} />}
        {!faceless && hair === "bun" && !hatOn && <circle cx="60" cy="22" r="11" fill={hairColor} />}
        {!faceless && hair === "curly" && <path d="M30 56 C24 40 34 20 60 18 C86 20 96 40 90 56 C92 70 84 74 80 66 L40 66 C36 74 28 70 30 56 Z" fill={hairColor} />}

        {/* Body: a hoodie's hood sits behind the neck */}
        {body?.kind === "hoodie" && <path d="M36 92 C34 70 86 70 84 92 Z" fill={pick(body.colors, 1)} />}
        <path
          d="M14 124 C16 98 34 88 60 88 C86 88 104 98 106 124 Z"
          fill={body ? (body.kind === "shirt" ? `url(#${id(`stripes-${body.id}-v`)})` : pick(body.colors, 0)) : faceless ? "#c7c7cc" : shirt}
        />
        {body?.kind === "hoodie" && (
          <>
            <path d="M52 92 L52 106 M68 92 L68 106" stroke={pick(body.colors, 1)} strokeWidth="2" strokeLinecap="round" />
            <rect x="44" y="108" width="32" height="14" rx="4" fill={pick(body.colors, 2)} opacity="0.85" />
          </>
        )}
        {body?.kind === "shirt" && <path d="M48 88 Q60 98 72 88" fill="none" stroke="rgba(0,0,0,0.25)" strokeWidth="2" />}

        {/* Neck and head */}
        <rect x="51" y="72" width="18" height="20" rx="7" fill={skin} />
        <rect x="51" y="72" width="18" height="20" rx="7" fill="rgba(0,0,0,0.08)" />
        <circle cx="35" cy="57" r="6" fill={skin} />
        <circle cx="85" cy="57" r="6" fill={skin} />
        <ellipse cx="60" cy="54" rx="25" ry="28" fill={skin} />

        {!faceless && (
          <>
            {/* Hair in front */}
            {(hair === "short" || hair === "long" || hair === "bun") && !hatOn && (
              <path d="M35 52 C33 30 46 22 60 22 C74 22 87 30 85 52 C80 40 70 34 60 34 C50 34 40 40 35 52 Z" fill={hairColor} />
            )}
            {hair === "side" && !hatOn && <path d="M35 54 C32 30 48 21 63 22 C78 23 88 33 85 50 C76 41 60 42 46 33 C42 40 38 47 35 54 Z" fill={hairColor} />}
            {hair === "curly" && !hatOn && (
              <g fill={hairColor}>
                {[38, 46, 54, 62, 70, 78].map((x, i) => (
                  <circle key={x} cx={x + 2} cy={i % 2 ? 30 : 34} r="8" />
                ))}
              </g>
            )}
            {hair === "mohawk" && !hatOn && <rect x="54" y="10" width="12" height="28" rx="6" fill={hairColor} />}
            {hair === "buzz" && !hatOn && (
              <path d="M36 48 C35 31 47 25 60 25 C73 25 85 31 84 48 C79 39 70 35 60 35 C50 35 41 39 36 48 Z" fill={hairColor} opacity="0.6" />
            )}

            {/* Face */}
            <circle cx="46" cy="65" r="4" fill="#ff6b81" opacity="0.18" />
            <circle cx="74" cy="65" r="4" fill="#ff6b81" opacity="0.18" />
            {eyes === "dot" && (
              <g fill={INK}>
                <circle cx="51" cy="56" r="3" />
                <circle cx="69" cy="56" r="3" />
              </g>
            )}
            {eyes === "happy" && (
              <g fill="none" stroke={INK} strokeWidth="2.5" strokeLinecap="round">
                <path d="M47 57 Q51 52 55 57" />
                <path d="M65 57 Q69 52 73 57" />
              </g>
            )}
            {eyes === "wink" && (
              <g>
                <circle cx="51" cy="56" r="3" fill={INK} />
                <path d="M65 57 Q69 53 73 57" fill="none" stroke={INK} strokeWidth="2.5" strokeLinecap="round" />
              </g>
            )}
            {eyes === "round" && (
              <g>
                <circle cx="51" cy="56" r="5" fill="#fff" />
                <circle cx="69" cy="56" r="5" fill="#fff" />
                <circle cx="52" cy="57" r="2.6" fill={INK} />
                <circle cx="70" cy="57" r="2.6" fill={INK} />
              </g>
            )}
            {eyes === "sleepy" && (
              <g stroke={INK} strokeWidth="2.5" strokeLinecap="round">
                <path d="M47 57 L55 57" />
                <path d="M65 57 L73 57" />
              </g>
            )}
            {mouth === "smile" && <path d="M52 67 Q60 74 68 67" fill="none" stroke={INK} strokeWidth="2.5" strokeLinecap="round" />}
            {mouth === "grin" && (
              <g>
                <path d="M50 66 Q60 79 70 66 Z" fill={INK} />
                <path d="M52 67 L68 67 L67 69 L53 69 Z" fill="#fff" />
              </g>
            )}
            {mouth === "flat" && <path d="M53 69 L67 69" stroke={INK} strokeWidth="2.5" strokeLinecap="round" />}
            {mouth === "o" && <ellipse cx="60" cy="69" rx="4" ry="5" fill={INK} />}
            {mouth === "tongue" && (
              <g>
                <path d="M51 66 Q60 74 69 66" fill="none" stroke={INK} strokeWidth="2.5" strokeLinecap="round" />
                <ellipse cx="62" cy="71.5" rx="4" ry="3.5" fill="#ff6b81" />
              </g>
            )}

            {/* Accessories */}
            {accessory === "glasses" && (
              <g fill="none" stroke={INK} strokeWidth="2">
                <circle cx="51" cy="56" r="7" />
                <circle cx="69" cy="56" r="7" />
                <path d="M58 56 L62 56" />
              </g>
            )}
            {accessory === "sunglasses" && (
              <g fill={INK}>
                <rect x="42" y="51" width="16" height="10" rx="4" />
                <rect x="62" y="51" width="16" height="10" rx="4" />
                <rect x="57" y="54" width="6" height="2" />
              </g>
            )}
            {accessory === "beard" && (
              <path d="M36 58 C38 86 50 86 60 86 C70 86 82 86 84 58 C80 72 72 77 60 77 C48 77 40 72 36 58 Z" fill={hairColor} />
            )}
            {accessory === "freckles" && (
              <g fill="#a0643a" opacity="0.6">
                {[
                  [44, 62],
                  [48, 64],
                  [45, 66],
                  [72, 62],
                  [76, 64],
                  [73, 66],
                ].map(([x, y]) => (
                  <circle key={`${x}-${y}`} cx={x} cy={y} r="1" />
                ))}
              </g>
            )}
          </>
        )}

        {/* Head items */}
        {head?.kind === "cap" && (
          <g>
            <path d="M34 46 C34 24 47 18 60 18 C73 18 86 24 86 46 Z" fill={pick(head.colors, 0)} />
            <rect x="34" y="40" width="52" height="6" fill={pick(head.colors, 1)} />
            <path d="M58 43 C72 40 92 42 100 49 C91 52 72 50 58 48 Z" fill={pick(head.colors, 1)} />
            <image href={flagHref(head.iso2)} x="53" y="25" width="14" height="10" preserveAspectRatio="xMidYMid slice" />
          </g>
        )}
        {head?.kind === "beanie" && (
          <g>
            <path d="M33 48 C33 22 46 14 60 14 C74 14 87 22 87 48 Z" fill={pick(head.colors, 0)} />
            <rect x="32" y="40" width="56" height="10" rx="4" fill={pick(head.colors, 1)} />
            <circle cx="60" cy="13" r="6" fill={pick(head.colors, 2)} stroke="rgba(0,0,0,0.15)" />
          </g>
        )}
        {head?.kind === "crown" && (
          <g>
            <path d="M36 42 L39 16 L50 30 L60 10 L70 30 L81 16 L84 42 Z" fill={GOLD} stroke={GOLD_DARK} strokeWidth="1.5" />
            <rect x="36" y="36" width="48" height="8" rx="2" fill={GOLD_DARK} />
            {[0, 1, 2].map((i) => (
              <circle key={i} cx={46 + i * 14} cy="40" r="2.6" fill={pick(head.colors, i)} stroke="#fff" strokeWidth="0.8" />
            ))}
          </g>
        )}

        {/* Neck: a supporters' scarf in the flag's colours */}
        {neck?.kind === "scarf" && (
          <g>
            <path d="M42 84 C52 93 68 93 78 84 L80 93 C68 101 52 101 40 93 Z" fill={`url(#${id(`stripes-${neck.id}-h`)})`} />
            <rect x="64" y="92" width="10" height="26" rx="2" fill={`url(#${id(`stripes-${neck.id}-h`)})`} transform="rotate(-8 69 92)" />
          </g>
        )}

        {/* Badge on the chest: the merch pin, or the favourite country's flag */}
        {badge ? (
          <g>
            <circle cx="78" cy="104" r="8.5" fill={GOLD} />
            <image href={flagHref(badge.iso2)} x="70" y="96" width="16" height="16" preserveAspectRatio="xMidYMid slice" clipPath={`url(#${id("pin")})`} />
          </g>
        ) : (
          !faceless &&
          avatar.country && (
            <image href={flagHref(avatar.country)} x="70" y="98" width="15" height="11" preserveAspectRatio="xMidYMid slice" clipPath={`url(#${id("chest")})`} />
          )
        )}

        {/* In hand */}
        {hand?.kind === "mug" && (
          <g>
            <path d="M38 100 C46 100 46 112 38 112" fill="none" stroke="#e5e5ea" strokeWidth="3" />
            <rect x="20" y="96" width="19" height="22" rx="3" fill="#fafafa" stroke="#d1d1d6" />
            <image href={flagHref(hand.iso2)} x="21" y="101" width="17" height="11" preserveAspectRatio="xMidYMid slice" />
          </g>
        )}
        {hand?.kind === "flag" && (
          <g>
            <path d="M24 68 L24 124" stroke="#8e8e93" strokeWidth="2.5" />
            <image href={flagHref(hand.iso2)} x="25" y="68" width="26" height="18" preserveAspectRatio="none" transform="skewY(4)" />
          </g>
        )}
        {hand?.kind === "globe" && (
          <g>
            <path d="M20 118 L38 118 M29 112 L29 118" stroke="#8e8e93" strokeWidth="2.5" />
            <circle cx="29" cy="100" r="11" fill={pick(hand.colors, 0)} stroke={pick(hand.colors, 1)} strokeWidth="1.5" />
            <ellipse cx="29" cy="100" rx="5" ry="11" fill="none" stroke={pick(hand.colors, 1)} strokeWidth="1.2" />
            <path d="M18 100 L40 100" stroke={pick(hand.colors, 1)} strokeWidth="1.2" />
          </g>
        )}
        {hand?.kind === "trophy" && (
          <g>
            <path d="M18 88 L40 88 L38 100 C36 106 22 106 20 100 Z" fill={GOLD} stroke={GOLD_DARK} />
            <path d="M18 91 C11 91 12 100 20 100 M40 91 C47 91 46 100 38 100" fill="none" stroke={GOLD_DARK} strokeWidth="2" />
            <rect x="26" y="104" width="6" height="8" fill={GOLD_DARK} />
            <rect x="20" y="112" width="18" height="6" rx="1.5" fill={GOLD_DARK} />
            <image href={flagHref(hand.iso2)} x="23" y="91" width="12" height="8" preserveAspectRatio="xMidYMid slice" />
          </g>
        )}
      </g>
      {ring && <circle cx="60" cy="60" r="57.5" fill="none" stroke={ring} strokeWidth="5" />}
    </svg>
  );
}

/** One item on a mannequin, for the closet and the reveal. */
export function ItemArt({ item, size = 96 }: { item: Item; size?: number }) {
  const slot = ({ pin: "badge", shirt: "body", mug: "hand", cap: "head", scarf: "neck", flag: "hand", beanie: "head", hoodie: "body", globe: "hand", crown: "head", trophy: "hand" } as const)[item.kind];
  return (
    <Avatar
      avatar={{ skin: 0, hair: 7, hairColor: 0, eyes: 0, mouth: 0, accessory: 0, bg: 0, shirt: 0, country: null }}
      equipped={{ [slot]: item }}
      size={size}
      faceless
      ring={RARITIES[item.rarity].colour}
      title={item.kind}
    />
  );
}
