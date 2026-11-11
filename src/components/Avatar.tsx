"use client";

import { useId } from "react";
import {
  BACKGROUNDS,
  BG_STYLES,
  BODIES,
  BROWS,
  EARRINGS,
  EYE_COLORS,
  EYES,
  FACES,
  FACIAL_HAIR,
  FRAMES,
  GLASSES,
  HAIR_COLORS,
  HAIR_STYLES,
  HEADWEAR,
  LIP_COLORS,
  MOUTHS,
  NOSES,
  PATTERNS,
  SKINS,
  TOP_COLORS,
  TOPS,
  type AvatarConfig,
} from "@shared/avatar.mjs";
import { RARITIES, type Item } from "@shared/merch.mjs";
import type { Slot } from "@/lib/player";

const INK = "#2a1f1a";
const GOLD = "#f2c230";
const GOLD_DARK = "#c99700";

/** A colour lightened (amount > 0) or darkened (amount < 0), for shading. */
function shade(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) =>
    Math.round(amount < 0 ? c * (1 + amount) : c + (255 - c) * amount),
  );
  return `#${ch.map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

const flagHref = (iso2: string) => `/flags/${iso2.toLowerCase()}.svg`;
const pick = (colors: string[], i: number) => colors[i % colors.length] ?? "#888888";
/** Draws the right half as a mirror of the left. */
const MIRROR = "translate(120 0) scale(-1 1)";

// ---- Geometry (viewBox 0 0 120 120; the head is centred on 60,50) ----

const FACE_PATHS: Record<string, string> = {
  oval: "M60 22 C74 22 83 33 83 48 C83 64 74 78 60 78 C46 78 37 64 37 48 C37 33 46 22 60 22 Z",
  round: "M60 23 C76 23 84 34 84 50 C84 66 74 77 60 77 C46 77 36 66 36 50 C36 34 44 23 60 23 Z",
  square: "M60 22 C75 22 83 31 83 46 L82 61 C80 71 70 78 60 78 C50 78 40 71 38 61 L37 46 C37 31 45 22 60 22 Z",
  heart: "M60 22 C76 22 84 32 84 46 C84 60 72 74 60 79 C48 74 36 60 36 46 C36 32 44 22 60 22 Z",
};

const TORSO = {
  m: "M6 124 C8 101 28 90 49 88 L71 88 C92 90 112 101 114 124 Z",
  f: "M14 124 C16 103 32 93 52 90 L68 90 C88 93 104 103 106 124 Z",
};

const HAIR_BACK: Record<string, string> = {
  afro: "M60 8 C84 8 94 24 92 42 C94 58 84 66 78 62 L42 62 C36 66 26 58 28 42 C26 24 36 8 60 8 Z",
  bob: "M34 46 C32 26 46 16 60 16 C74 16 88 26 86 46 L87 74 C80 79 74 77 72 74 L48 74 C46 77 40 79 33 74 Z",
  long: "M33 44 C30 24 46 14 60 14 C74 14 90 24 87 44 L90 102 C82 106 72 104 70 98 L50 98 C48 104 38 106 30 102 Z",
  wavy: "M32 44 C28 24 46 13 60 13 C74 13 92 24 88 44 C92 60 86 70 91 82 C94 92 86 102 78 100 L42 100 C34 102 26 92 29 82 C34 70 28 60 32 44 Z",
  ponytail: "M79 30 C97 34 99 60 92 80 C90 86 85 86 85 80 C88 62 86 44 77 38 Z",
  curlyLong: "M30 46 C24 24 42 10 60 10 C78 10 96 24 90 46 C96 58 92 70 96 80 C98 94 86 102 76 98 L44 98 C34 102 22 94 24 80 C28 70 24 58 30 46 Z",
  headscarf: "M31 50 C29 24 45 11 60 11 C75 11 91 24 89 50 C91 72 87 92 80 100 L40 100 C33 92 29 72 31 50 Z",
};

const HAIR_FRONT: Record<string, string> = {
  short: "M37 46 C35 28 46 18 60 18 C75 18 86 27 83 46 C80 37 74 31 66 30 C58 34 46 33 37 46 Z",
  sidepart: "M37 48 C34 27 48 17 62 18 C76 19 86 29 83 46 C77 36 68 32 52 33 C46 34 40 40 37 48 Z",
  quiff: "M37 46 C35 30 44 16 58 12 C70 9 85 17 84 32 C84 38 83 42 83 46 C78 34 70 30 60 31 C50 31 42 37 37 46 Z",
  buzz: "M38 44 C37 29 47 21 60 21 C73 21 83 29 82 44 C78 35 70 31 60 31 C50 31 42 35 38 44 Z",
  manbun: "M38 44 C37 28 47 20 60 20 C73 20 83 28 82 44 C78 34 70 30 60 30 C50 30 42 34 38 44 Z",
  pixie: "M37 50 C34 28 48 17 62 18 C77 19 87 30 83 52 C80 44 78 37 70 33 C62 38 50 36 44 40 C41 43 39 47 37 50 Z",
  bob: "M37 46 C36 30 46 20 60 20 C74 20 84 30 83 46 C76 36 70 32 60 33 C50 32 42 38 37 46 Z",
  long: "M37 48 C36 28 48 19 60 19 C72 19 84 28 83 48 C78 36 66 30 58 30 C50 34 42 40 37 48 Z",
  wavy: "M37 48 C36 28 48 19 60 19 C72 19 84 28 83 48 C78 36 66 30 58 30 C50 34 42 40 37 48 Z",
  ponytail: "M37 46 C35 28 47 18 60 18 C73 18 85 28 83 46 C78 34 70 29 60 29 C50 29 42 35 37 46 Z",
  bun: "M37 46 C35 28 47 18 60 18 C73 18 85 28 83 46 C78 34 70 29 60 29 C50 29 42 35 37 46 Z",
  braids: "M37 48 C35 28 47 18 60 18 C73 18 85 28 83 48 C80 38 70 30 60 27 C50 30 40 38 37 48 Z",
  curlyLong: "M36 48 C34 26 46 16 60 16 C74 16 86 26 84 48 C80 36 72 30 60 30 C48 30 40 36 36 48 Z",
};

interface Props {
  avatar: AvatarConfig;
  /** Items worn, by slot. */
  equipped?: Partial<Record<Slot, Item>>;
  size?: number;
  /** A ring in any colour, e.g. for the week's champion; overrides the earned frame. */
  ring?: string;
  /** Draw only the body and the items (a mannequin for the closet). */
  faceless?: boolean;
  /** Blink now and then (large previews). */
  animate?: boolean;
  /** Frame the face only, for picking eyes, brows, nose or mouth. */
  crop?: boolean;
  title?: string;
}

export default function Avatar({ avatar, equipped = {}, size = 64, ring, faceless, animate, crop, title }: Props) {
  const uid = useId().replace(/:/g, "");
  const id = (name: string) => `${uid}-${name}`;
  const a = avatar;
  const body = BODIES[a.body].id as "m" | "f";
  const skin = faceless ? "#d1d1d6" : SKINS[a.skin];
  const skinShadow = shade(skin, -0.14);
  const skinLine = shade(skin, -0.32);
  const hairColor = HAIR_COLORS[a.hairColor];
  const hairDark = shade(hairColor, -0.25);
  const hair = HAIR_STYLES[a.hair];
  const headwear = HEADWEAR[a.headwear].id;
  const top = TOPS[a.top].id;
  const topColor = top === "uniform" ? "#5b6b3a" : TOP_COLORS[a.topColor];
  const pattern = PATTERNS[a.pattern].id;
  const { head, neck, body: bodyItem, badge, hand } = equipped;
  const hatOn = Boolean(head) || headwear === "headscarf";
  const facePath = FACE_PATHS[FACES[a.face].id];
  const faceTransform = body === "f" ? "translate(60 50) scale(0.95 1) translate(-60 -50)" : undefined;
  const torso = TORSO[body];
  const frame = FRAMES[a.frame].id;
  const frameColour = ring ?? (frame !== "none" ? RARITIES[frame as keyof typeof RARITIES].colour : undefined);

  // Merch on the body replaces the top: a supporters' shirt in the flag's stripes, or a hoodie.
  const wearing = bodyItem ? (bodyItem.kind === "hoodie" ? "hoodie" : "tshirt") : top;
  const wearColour = bodyItem ? (bodyItem.kind === "shirt" ? `url(#${id("merch-stripes")})` : pick(bodyItem.colors, 0)) : topColor;
  const wearDark = bodyItem ? shade(pick(bodyItem.colors, bodyItem.kind === "hoodie" ? 1 : 0), -0.2) : shade(topColor, -0.22);

  const bg = BACKGROUNDS[a.bg];
  const bgStyle = BG_STYLES[a.bgStyle].id;
  const bgFill = faceless ? "#f2f2f7" : bgStyle === "gradient" || (bgStyle === "flag" && !a.country) ? `url(#${id("bg")})` : bg;

  const stripes = (item: Item) => {
    const cols = item.colors.length ? item.colors : ["#888888"];
    return (
      <linearGradient id={id("merch-stripes")} x1="0" y1="0" x2="1" y2="0">
        {cols.flatMap((c, i) => [
          <stop key={`${i}a`} offset={`${(100 * i) / cols.length}%`} stopColor={c} />,
          <stop key={`${i}b`} offset={`${(100 * (i + 1)) / cols.length}%`} stopColor={c} />,
        ])}
      </linearGradient>
    );
  };

  /** The outline of the top, for its colour and its pattern. */
  const topShape =
    wearing === "tank"
      ? "M38 124 L40 97 C45 93 49 91 52 89 Q60 99 68 89 C71 91 75 93 80 97 L82 124 Z"
      : wearing === "dress"
        ? "M28 124 C30 104 38 96 43 93 L48 90 Q60 104 72 90 L77 93 C82 96 90 104 92 124 Z"
        : torso;

  return (
    <svg
      viewBox={crop ? "34 32 52 52" : "0 0 120 120"}
      width={size}
      height={size}
      className={animate ? "avatar is-animated" : crop ? "avatar is-crop" : "avatar"}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <defs>
        <clipPath id={id("circle")}>
          <circle cx="60" cy="60" r="60" />
        </clipPath>
        <clipPath id={id("pin")}>
          <circle cx="79" cy="106" r="7" />
        </clipPath>
        <clipPath id={id("chest")}>
          <rect x="72" y="100" width="14" height="10" rx="2" />
        </clipPath>
        <clipPath id={id("top")}>
          <path d={topShape} />
        </clipPath>
        <radialGradient id={id("bg")} cx="0.3" cy="0.25" r="0.9">
          <stop offset="0" stopColor={shade(bg, 0.55)} />
          <stop offset="1" stopColor={bg} />
        </radialGradient>
        <radialGradient id={id("skin")} cx="0.38" cy="0.32" r="0.75">
          <stop offset="0" stopColor={shade(skin, 0.12)} />
          <stop offset="0.75" stopColor={skin} />
          <stop offset="1" stopColor={skinShadow} />
        </radialGradient>
        <pattern id={id("stripes")} width="6" height="6" patternUnits="userSpaceOnUse">
          <rect width="6" height="3" fill="rgba(255,255,255,0.32)" />
        </pattern>
        <pattern id={id("dots")} width="7" height="7" patternUnits="userSpaceOnUse">
          <circle cx="3.5" cy="3.5" r="1.3" fill="rgba(255,255,255,0.45)" />
        </pattern>
        {bodyItem?.kind === "shirt" && stripes(bodyItem)}
        {neck && (
          <linearGradient id={id("scarf")} x1="0" y1="0" x2="0" y2="1">
            {(neck.colors.length ? neck.colors : ["#888"]).flatMap((c, i, all) => [
              <stop key={`${i}a`} offset={`${(100 * i) / all.length}%`} stopColor={c} />,
              <stop key={`${i}b`} offset={`${(100 * (i + 1)) / all.length}%`} stopColor={c} />,
            ])}
          </linearGradient>
        )}
      </defs>

      <g clipPath={`url(#${id("circle")})`}>
        {/* Background */}
        <circle cx="60" cy="60" r="60" fill={bgFill} />
        {!faceless && bgStyle === "flag" && a.country && (
          <>
            <image href={flagHref(a.country)} x="-20" y="0" width="160" height="120" preserveAspectRatio="xMidYMid slice" />
            <circle cx="60" cy="60" r="60" fill="rgba(255,255,255,0.28)" />
          </>
        )}

        {/* Hair behind the head (and a headscarf) */}
        {!faceless && headwear === "headscarf" && !head && <path d={HAIR_BACK.headscarf} fill={shade(topColor, -0.1)} />}
        {!faceless && headwear !== "headscarf" && HAIR_BACK[hair.id] && (!hatOn || hair.long) && <path d={HAIR_BACK[hair.id]} fill={hairDark} />}
        {!faceless && headwear !== "headscarf" && hair.id === "braids" && (
          <g fill={hairDark}>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <g key={i}>
                <ellipse cx={37 - i * 0.6} cy={58 + i * 8} rx="4.5" ry="5" />
                <ellipse cx={83 + i * 0.6} cy={58 + i * 8} rx="4.5" ry="5" />
              </g>
            ))}
          </g>
        )}
        {!faceless && headwear !== "headscarf" && !hatOn && hair.id === "bun" && <circle cx="60" cy="13" r="9" fill={hairColor} />}
        {!faceless && headwear !== "headscarf" && !hatOn && hair.id === "manbun" && <circle cx="60" cy="15" r="7" fill={hairColor} />}

        {/* Hood of a hoodie sits behind the neck */}
        {wearing === "hoodie" && <path d="M36 96 C32 76 88 76 84 96 Z" fill={wearDark} />}

        {/* Neck and shoulders */}
        {(wearing === "tank" || wearing === "dress") && <path d={torso} fill={skin} />}
        <path d={body === "m" ? "M50 68 L70 68 L71 92 L49 92 Z" : "M52.5 68 L67.5 68 L68.5 93 L51.5 93 Z"} fill={skin} />
        <path d={body === "m" ? "M50 74 Q60 84 70 74 L70 80 Q60 88 50 80 Z" : "M52.5 74 Q60 82 67.5 74 L67.5 79 Q60 86 52.5 79 Z"} fill={skinShadow} opacity="0.8" />

        {/* The top */}
        <path d={topShape} fill={faceless ? "#c7c7cc" : wearColour} />
        {!faceless && !bodyItem && pattern !== "plain" && <rect x="0" y="80" width="120" height="44" fill={`url(#${id(pattern)})`} clipPath={`url(#${id("top")})`} />}
        {!faceless && (
          <TopDetails style={wearing} body={body} colour={bodyItem ? pick(bodyItem.colors, 0) : topColor} dark={wearDark} skin={skin} strings={bodyItem ? pick(bodyItem.colors, 2) : "#f4f4f6"} />
        )}

        {/* Head */}
        <g transform={faceTransform}>
          <ellipse cx="36" cy="52" rx="4.6" ry="6.6" fill={skin} />
          <ellipse cx="84" cy="52" rx="4.6" ry="6.6" fill={skin} />
          <path d="M35 49 Q37 52 35.5 55" fill="none" stroke={skinLine} strokeWidth="1" opacity="0.6" />
          <path d="M85 49 Q83 52 84.5 55" fill="none" stroke={skinLine} strokeWidth="1" opacity="0.6" />
          <path d={facePath} fill={faceless ? skin : `url(#${id("skin")})`} stroke={skinLine} strokeWidth="0.6" strokeOpacity="0.45" />
        </g>

        {!faceless && (
          <>
            {/* Earrings */}
            {EARRINGS[a.earrings].id === "studs" && (
              <g fill={GOLD} stroke={GOLD_DARK} strokeWidth="0.5">
                <circle cx="35.5" cy="58" r="1.7" />
                <circle cx="84.5" cy="58" r="1.7" />
              </g>
            )}
            {EARRINGS[a.earrings].id === "hoops" && (
              <g fill="none" stroke={GOLD} strokeWidth="1.4">
                <circle cx="35.5" cy="61" r="3.2" />
                <circle cx="84.5" cy="61" r="3.2" />
              </g>
            )}

            {/* Face */}
            <Face a={a} body={body} skin={skin} skinLine={skinLine} hairColor={hairColor} />

            {/* Facial hair */}
            <FacialHair kind={FACIAL_HAIR[a.facial].id} colour={hairColor} />

            {/* Hair in front */}
            {headwear !== "headscarf" && !hatOn && HAIR_FRONT[hair.id] && (
              <path d={HAIR_FRONT[hair.id]} fill={hairColor} opacity={hair.id === "buzz" ? 0.62 : 1} />
            )}
            {headwear !== "headscarf" && !hatOn && hair.id === "sidepart" && <path d="M52 19 Q50 26 51 33" stroke={hairDark} strokeWidth="1" fill="none" />}
            {headwear !== "headscarf" && !hatOn && hair.id === "curlyShort" && <Curls colour={hairColor} y={26} />}
            {headwear !== "headscarf" && !hatOn && hair.id === "afro" && <Curls colour={hairColor} y={20} big />}
            {headwear !== "headscarf" && !hatOn && hair.id === "curlyLong" && <Curls colour={hairColor} y={24} />}
            {headwear !== "headscarf" && !hatOn && hair.id === "mohawk" && (
              <>
                <path d={HAIR_FRONT.buzz} fill={hairColor} opacity="0.3" />
                <path d="M54 32 C53 18 56 7 60 4 C64 7 67 18 66 32 Z" fill={hairColor} />
              </>
            )}
            {headwear !== "headscarf" && !hatOn && hair.id === "ponytail" && <rect x="76" y="31" width="6" height="5" rx="2" fill="#e5484d" transform="rotate(25 79 33)" />}
            {!hatOn && hair.id === "bald" && <ellipse cx="52" cy="28" rx="7" ry="3" fill="#fff" opacity="0.22" />}

            {/* Headwear (merch on the head replaces it) */}
            {!head && headwear === "headscarf" && (
              <path d="M36 46 C37 25 49 16 60 16 C71 16 83 25 84 46 C77 35 70 31 60 31 C50 31 43 35 36 46 Z" fill={topColor} />
            )}
            {!head && headwear === "headband" && !hatOn && (
              <path d="M37 40 C42 27 78 27 83 40 L82.5 44 C76 32 44 32 37.5 44 Z" fill={shade(topColor, 0.1)} />
            )}
            {!head && headwear === "kippa" && (
              <g>
                <ellipse cx="60" cy="21" rx="10.5" ry="4.2" fill={topColor} />
                <ellipse cx="60" cy="21" rx="7" ry="2.6" fill="none" stroke="#fff" strokeWidth="0.8" opacity="0.8" />
              </g>
            )}
            {!head && headwear === "headphones" && (
              <g>
                <path d="M35 50 C35 13 85 13 85 50" fill="none" stroke="#3a3a3c" strokeWidth="4.5" />
                <rect x="29" y="44" width="9" height="15" rx="3.5" fill="#2c2c2e" />
                <rect x="82" y="44" width="9" height="15" rx="3.5" fill="#2c2c2e" />
              </g>
            )}

            {/* Glasses */}
            <Glasses kind={GLASSES[a.glasses].id} />
          </>
        )}

        {/* Head merch */}
        {head?.kind === "cap" && (
          <g>
            <path d="M36 42 C36 19 48 12 60 12 C72 12 84 19 84 42 Z" fill={pick(head.colors, 0)} />
            <path d="M60 12 L60 42" stroke="rgba(0,0,0,0.12)" />
            <rect x="36" y="37" width="48" height="6" fill={pick(head.colors, 1)} />
            <path d="M57 40 C71 37 92 39 101 46 C92 49 71 47 57 45 Z" fill={pick(head.colors, 1)} />
            <image href={flagHref(head.iso2)} x="53" y="19" width="14" height="10" preserveAspectRatio="xMidYMid slice" />
          </g>
        )}
        {head?.kind === "beanie" && (
          <g>
            <path d="M35 44 C35 17 47 9 60 9 C73 9 85 17 85 44 Z" fill={pick(head.colors, 0)} />
            <rect x="34" y="36" width="52" height="10" rx="4" fill={pick(head.colors, 1)} />
            <circle cx="60" cy="8" r="6" fill={pick(head.colors, 2)} stroke="rgba(0,0,0,0.15)" />
          </g>
        )}
        {head?.kind === "crown" && (
          <g>
            <path d="M38 34 L41 10 L51 23 L60 5 L69 23 L79 10 L82 34 Z" fill={GOLD} stroke={GOLD_DARK} strokeWidth="1.5" />
            <rect x="38" y="29" width="44" height="8" rx="2" fill={GOLD_DARK} />
            {[0, 1, 2].map((i) => (
              <circle key={i} cx={47 + i * 13} cy="33" r="2.6" fill={pick(head.colors, i)} stroke="#fff" strokeWidth="0.8" />
            ))}
          </g>
        )}

        {/* Neck: a supporters' scarf */}
        {neck?.kind === "scarf" && (
          <g>
            <path d="M43 82 C52 92 68 92 77 82 L79 92 C68 101 52 101 41 92 Z" fill={`url(#${id("scarf")})`} />
            <rect x="65" y="92" width="10" height="26" rx="2" fill={`url(#${id("scarf")})`} transform="rotate(-8 70 92)" />
          </g>
        )}

        {/* Badge: the merch pin, or the favourite country's flag */}
        {badge ? (
          <g>
            <circle cx="79" cy="106" r="8.5" fill={GOLD} />
            <image href={flagHref(badge.iso2)} x="71" y="98" width="16" height="16" preserveAspectRatio="xMidYMid slice" clipPath={`url(#${id("pin")})`} />
          </g>
        ) : (
          !faceless &&
          a.country &&
          bgStyle !== "flag" && (
            <image href={flagHref(a.country)} x="72" y="100" width="14" height="10" preserveAspectRatio="xMidYMid slice" clipPath={`url(#${id("chest")})`} />
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
            <path d="M24 66 L24 124" stroke="#8e8e93" strokeWidth="2.5" />
            <image href={flagHref(hand.iso2)} x="25" y="66" width="26" height="18" preserveAspectRatio="none" transform="skewY(4)" />
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
      {frameColour && !crop && <circle cx="60" cy="60" r="57.5" fill="none" stroke={frameColour} strokeWidth="5" />}
    </svg>
  );
}

function TopDetails({ style, body, colour, dark, skin, strings }: { style: string; body: "m" | "f"; colour: string; dark: string; skin: string; strings: string }) {
  const sleeves = (
    <g stroke={dark} strokeWidth="1" opacity="0.6" fill="none">
      <path d={body === "m" ? "M24 98 Q28 110 26 124" : "M30 101 Q33 112 31 124"} />
      <path d={body === "m" ? "M96 98 Q92 110 94 124" : "M90 101 Q87 112 89 124"} />
    </g>
  );
  switch (style) {
    case "tshirt":
      return (
        <g>
          {sleeves}
          <path d="M49 89 Q60 99 71 89" fill="none" stroke={dark} strokeWidth="2.2" />
        </g>
      );
    case "vneck":
      return (
        <g>
          {sleeves}
          <path d="M50 88 L60 103 L70 88 Z" fill={skin} />
          <path d="M50 88 L60 103 L70 88" fill="none" stroke={dark} strokeWidth="2" />
        </g>
      );
    case "polo":
      return (
        <g>
          {sleeves}
          <path d="M49 88 L56 98 L60 90 L64 98 L71 88 L66 87 L60 92 L54 87 Z" fill={shade(colour, 0.25)} stroke={dark} strokeWidth="0.8" />
          <path d="M60 92 L60 106" stroke={dark} strokeWidth="1" />
          <circle cx="60" cy="98" r="0.9" fill={dark} />
          <circle cx="60" cy="103" r="0.9" fill={dark} />
        </g>
      );
    case "shirt":
      return (
        <g>
          <path d="M50 87 L56 99 L60 91 L64 99 L70 87 L66 86 L60 92 L54 86 Z" fill={shade(colour, 0.35)} stroke={dark} strokeWidth="0.8" />
          <path d="M60 91 L60 124" stroke={dark} strokeWidth="1" />
          {[100, 108, 116].map((y) => (
            <circle key={y} cx="61.8" cy={y} r="0.9" fill={dark} />
          ))}
        </g>
      );
    case "tie":
      return (
        <g>
          <path d={body === "m" ? TORSO.m : TORSO.f} fill="#f4f4f6" />
          <path d="M50 87 L56 98 L60 91 L64 98 L70 87 L66 86 L60 92 L54 86 Z" fill="#ffffff" stroke="#c7c7cc" strokeWidth="0.8" />
          <path d="M57 92 L63 92 L62 96 L65 116 L60 122 L55 116 L58 96 Z" fill={colour} stroke={dark} strokeWidth="0.6" />
          <path d="M57 92 L63 92 L62 96 L58 96 Z" fill={dark} />
        </g>
      );
    case "blazer":
      return (
        <g>
          <path d="M48 88 L60 114 L72 88 Z" fill="#f4f4f6" />
          <path d="M53 88 L60 96 L67 88" fill="none" stroke="#c7c7cc" strokeWidth="1" />
          <path d="M47 88 L52 103 L60 116 L50 98 L44 90 Z" fill={dark} />
          <path d="M73 88 L68 103 L60 116 L70 98 L76 90 Z" fill={dark} />
          <circle cx="60" cy="118" r="1.2" fill={dark} />
          {sleeves}
        </g>
      );
    case "sweater":
      return (
        <g>
          <path d="M48 88 Q60 101 72 88" fill="none" stroke={dark} strokeWidth="4" />
          <path d="M48 88 Q60 101 72 88" fill="none" stroke={shade(colour, 0.2)} strokeWidth="1" strokeDasharray="1 1.5" />
          {sleeves}
        </g>
      );
    case "hoodie":
      return (
        <g>
          <path d="M53 90 L53 106 M67 90 L67 106" stroke={strings} strokeWidth="1.8" strokeLinecap="round" />
          <path d="M44 110 L76 110 L72 124 L48 124 Z" fill={dark} opacity="0.55" />
          {sleeves}
        </g>
      );
    case "tank":
      return <path d="M49 90 Q60 100 71 90" fill="none" stroke={dark} strokeWidth="1.6" />;
    case "dress":
      return (
        <g>
          <path d="M48 90 Q60 104 72 90" fill="none" stroke={dark} strokeWidth="1.6" />
          <path d="M40 112 Q60 116 80 112" fill="none" stroke={dark} strokeWidth="1" opacity="0.5" />
        </g>
      );
    case "turtleneck":
      return (
        <g>
          <rect x={body === "m" ? 48.5 : 51} y="76" width={body === "m" ? 23 : 18} height="16" rx="6" fill={colour} />
          {[0, 1, 2, 3, 4].map((i) => (
            <path key={i} d={`M${(body === "m" ? 51 : 53) + i * (body === "m" ? 4.5 : 3.5)} 78 L${(body === "m" ? 51 : 53) + i * (body === "m" ? 4.5 : 3.5)} 90`} stroke={dark} strokeWidth="0.8" opacity="0.6" />
          ))}
          {sleeves}
        </g>
      );
    case "uniform":
      return (
        <g>
          <path d="M49 87 L56 99 L60 91 L64 99 L71 87 L66 86 L60 92 L54 86 Z" fill={shade(colour, 0.15)} stroke={dark} strokeWidth="0.8" />
          <path d="M60 91 L60 124" stroke={dark} strokeWidth="1" />
          <rect x="44" y="102" width="11" height="9" rx="1" fill="none" stroke={dark} strokeWidth="1" />
          <rect x="65" y="102" width="11" height="9" rx="1" fill="none" stroke={dark} strokeWidth="1" />
          <path d="M44 102 L55 102 L55 105 L44 105 Z M65 102 L76 102 L76 105 L65 105 Z" fill={dark} opacity="0.5" />
          <path d={body === "m" ? "M26 95 L44 90" : "M32 97 L47 92"} stroke={dark} strokeWidth="3" strokeLinecap="round" />
          <path d={body === "m" ? "M94 95 L76 90" : "M88 97 L73 92"} stroke={dark} strokeWidth="3" strokeLinecap="round" />
        </g>
      );
    default:
      return null;
  }
}

function Face({ a, body, skin, skinLine, hairColor }: { a: AvatarConfig; body: "m" | "f"; skin: string; skinLine: string; hairColor: string }) {
  const eyes = EYES[a.eyes].id;
  const iris = EYE_COLORS[a.eyeColor];
  const brows = BROWS[a.brows].id;
  const nose = NOSES[a.nose].id;
  const mouth = MOUTHS[a.mouth].id;
  const lip = LIP_COLORS[a.lips];
  const lipLine = lip ?? shade(skin, -0.42);
  const brow = shade(hairColor, hairColor === "#ece0c8" || hairColor === "#dcb56a" ? -0.35 : -0.05);

  const openEye = (wide: boolean, almond: boolean) => (
    <g>
      {almond ? (
        <path d="M46.5 51 Q51 46.8 55.5 51 Q51 54.2 46.5 51 Z" fill="#fff" />
      ) : (
        <ellipse cx="51" cy="51" rx="4.4" ry={wide ? 3.8 : 3.1} fill="#fff" />
      )}
      <circle cx="51.3" cy="51.2" r={wide ? 2.7 : 2.4} fill={iris} />
      <circle cx="51.3" cy="51.2" r="1.15" fill="#120c08" />
      <circle cx="52.2" cy="50.2" r="0.7" fill="#fff" />
      <path d={wide ? "M46.3 50 Q51 45.6 55.7 50" : "M46.4 50.4 Q51 46.8 55.6 50.4"} fill="none" stroke={INK} strokeWidth="1.3" strokeLinecap="round" />
      {body === "f" && <path d="M46.6 50 L45 48.6 M48 48.3 L47 46.7 M50 47.6 L49.6 45.9" stroke={INK} strokeWidth="0.9" strokeLinecap="round" />}
    </g>
  );
  const closedEye = <path d="M46.5 52 Q51 47.5 55.5 52" fill="none" stroke={INK} strokeWidth="1.7" strokeLinecap="round" />;
  const sleepyEye = (
    <g>
      <ellipse cx="51" cy="51.5" rx="4.4" ry="2.6" fill="#fff" />
      <circle cx="51.3" cy="52" r="2.2" fill={iris} />
      <circle cx="51.3" cy="52" r="1" fill="#120c08" />
      <path d="M46 50.6 L56 50.6 L56 48 L46 48 Z" fill={skin} />
      <path d="M46.4 50.6 Q51 49.4 55.6 50.6" fill="none" stroke={INK} strokeWidth="1.4" strokeLinecap="round" />
    </g>
  );
  const eye = (side: "l" | "r") => {
    if (eyes === "smile") return closedEye;
    if (eyes === "wink" && side === "r") return closedEye;
    if (eyes === "sleepy") return sleepyEye;
    return openEye(eyes === "wide", eyes === "almond");
  };

  const browPath: Record<string, string> = {
    natural: "M46 44.5 Q51 42 56 44",
    thick: "M45.5 44.8 Q51 41.6 56.5 43.8",
    arched: "M46 45 Q49.5 40.5 56 43.6",
    raised: "M46 42.5 Q51 39.5 56 41.8",
    focused: "M46 43 L56 45.3",
  };
  const browWidth = brows === "thick" ? 3.1 : brows === "arched" ? 1.4 : body === "f" ? 1.6 : 2.1;

  return (
    <g>
      {/* Brows */}
      <path d={browPath[brows]} fill="none" stroke={brow} strokeWidth={browWidth} strokeLinecap="round" />
      <path d={browPath[brows]} fill="none" stroke={brow} strokeWidth={browWidth} strokeLinecap="round" transform={MIRROR} />
      {/* Eyes, blinking together */}
      <g className="avatar-eyes">
        {eye("l")}
        <g transform={MIRROR}>{eye("r")}</g>
      </g>
      {/* Cheeks */}
      <ellipse cx="45" cy="61" rx="4.5" ry="2.8" fill="#ff6b81" opacity={body === "f" ? 0.2 : 0.12} />
      <ellipse cx="75" cy="61" rx="4.5" ry="2.8" fill="#ff6b81" opacity={body === "f" ? 0.2 : 0.12} />
      {a.freckles === 1 && (
        <g fill={shade(skin, -0.35)} opacity="0.65">
          {[
            [43, 58],
            [46.5, 59.5],
            [44.5, 61.5],
            [48, 57.5],
          ].flatMap(([x, y]) => [<circle key={`l${x}`} cx={x} cy={y} r="0.75" />, <circle key={`r${x}`} cx={120 - x} cy={y} r="0.75" />])}
        </g>
      )}
      {/* Nose */}
      {nose === "small" && <path d="M60.5 54 Q58.4 60 60 62 Q62 62.6 63.2 61.2" fill="none" stroke={skinLine} strokeWidth="1.2" strokeLinecap="round" />}
      {nose === "button" && (
        <g>
          <ellipse cx="60" cy="60" rx="3.4" ry="2.6" fill={shade(skin, -0.08)} />
          <circle cx="58.6" cy="61" r="0.7" fill={skinLine} />
          <circle cx="61.4" cy="61" r="0.7" fill={skinLine} />
        </g>
      )}
      {nose === "long" && <path d="M60.5 49 L58.2 60.5 Q60 63 63.4 61.2" fill="none" stroke={skinLine} strokeWidth="1.2" strokeLinecap="round" />}
      {/* Mouth */}
      {mouth === "smile" && (lip ? (
        <g>
          <path d="M53 67 Q60 73.5 67 67 Q60 70 53 67 Z" fill={lip} />
          <path d="M53.5 67 Q56.5 65.6 60 66.8 Q63.5 65.6 66.5 67 Q60 68.4 53.5 67 Z" fill={shade(lip, -0.15)} />
        </g>
      ) : (
        <path d="M53 67 Q60 73 67 67" fill="none" stroke={lipLine} strokeWidth="1.8" strokeLinecap="round" />
      ))}
      {mouth === "grin" && (
        <g>
          <path d="M52 66 Q60 75.5 68 66 Z" fill="#5a1f1f" stroke={lipLine} strokeWidth={lip ? 1.6 : 0.8} />
          <path d="M53.5 66.6 L66.5 66.6 L65.6 68.6 L54.4 68.6 Z" fill="#fff" />
        </g>
      )}
      {mouth === "neutral" && (lip ? (
        <g>
          <path d="M54 68.5 Q60 66.6 66 68.5 Q60 71.6 54 68.5 Z" fill={lip} />
        </g>
      ) : (
        <path d="M54 68.5 Q60 69.6 66 68.5" fill="none" stroke={lipLine} strokeWidth="1.7" strokeLinecap="round" />
      ))}
      {mouth === "smirk" && <path d="M54 68.5 Q61 71.5 67 66" fill="none" stroke={lipLine} strokeWidth={lip ? 2.6 : 1.8} strokeLinecap="round" />}
      {mouth === "open" && <ellipse cx="60" cy="69" rx="3.2" ry="3.8" fill="#5a1f1f" stroke={lipLine} strokeWidth={lip ? 1.6 : 0.6} />}
      {mouth === "tongue" && (
        <g>
          <path d="M52.5 66.5 Q60 74 67.5 66.5 Z" fill="#5a1f1f" stroke={lipLine} strokeWidth={lip ? 1.4 : 0.6} />
          <ellipse cx="61.5" cy="70.6" rx="3.6" ry="3" fill="#ff7a8a" />
        </g>
      )}
      {mouth === "laugh" && (
        <g>
          <path d="M51 65 Q60 79 69 65 Z" fill="#5a1f1f" stroke={lipLine} strokeWidth={lip ? 1.6 : 0.8} />
          <path d="M52.6 65.6 L67.4 65.6 L66.4 67.8 L53.6 67.8 Z" fill="#fff" />
          <ellipse cx="60" cy="72.6" rx="4.6" ry="2.6" fill="#ff7a8a" />
        </g>
      )}
    </g>
  );
}

function FacialHair({ kind, colour }: { kind: string; colour: string }) {
  const mustache = "M52 64.6 C55 62.2 58 62.6 60 64 C62 62.6 65 62.2 68 64.6 C65 66.6 62 66 60 65.2 C58 66 55 66.6 52 64.6 Z";
  switch (kind) {
    case "stubble":
      return (
        <g fill={colour} opacity="0.22">
          <path d="M39 58 C41 74 51 79.5 60 79.5 C69 79.5 79 74 81 58 C77 70 69 74.5 60 74.5 C51 74.5 43 70 39 58 Z" />
          <path d={mustache} />
        </g>
      );
    case "mustache":
      return <path d={mustache} fill={colour} />;
    case "goatee":
      return (
        <g fill={colour}>
          <path d={mustache} />
          <path d="M55 72.5 C56 79 64 79 65 72.5 C62 74.5 58 74.5 55 72.5 Z" />
        </g>
      );
    case "short":
      return (
        <g fill={colour}>
          <path d="M39 56 C40 74 50 80 60 80 C70 80 80 74 81 56 C78 66 72 72 66 72.5 C64 69.5 56 69.5 54 72.5 C48 72 42 66 39 56 Z" opacity="0.92" />
          <path d={mustache} />
        </g>
      );
    case "full":
      return (
        <g fill={colour}>
          <path d="M37 52 C37 79 48 87 60 87 C72 87 83 79 83 52 C80 66 72 73.5 66 73.5 C64 70 56 70 54 73.5 C48 73.5 40 66 37 52 Z" />
          <path d={mustache} />
        </g>
      );
    default:
      return null;
  }
}

function Curls({ colour, y, big }: { colour: string; y: number; big?: boolean }) {
  const r = big ? 7.5 : 6;
  const xs = big ? [38, 45, 52, 60, 68, 75, 82] : [40, 47, 54, 61, 68, 75, 81];
  return (
    <g fill={colour}>
      {xs.map((x, i) => (
        <circle key={x} cx={x} cy={y + (i === 0 || i === xs.length - 1 ? 10 : i === 1 || i === xs.length - 2 ? 3 : 0)} r={r} />
      ))}
    </g>
  );
}

function Glasses({ kind }: { kind: string }) {
  switch (kind) {
    case "round":
      return (
        <g fill="rgba(255,255,255,0.12)" stroke={INK} strokeWidth="1.5">
          <circle cx="51" cy="51" r="6.5" />
          <circle cx="69" cy="51" r="6.5" />
          <path d="M57.5 50.5 Q60 49 62.5 50.5 M44.5 50 L38 48.5 M75.5 50 L82 48.5" fill="none" />
        </g>
      );
    case "square":
      return (
        <g fill="rgba(255,255,255,0.12)" stroke={INK} strokeWidth="1.6">
          <rect x="43.5" y="46" width="15" height="10.5" rx="2" />
          <rect x="61.5" y="46" width="15" height="10.5" rx="2" />
          <path d="M58.5 50 L61.5 50 M43.5 49 L38 48 M76.5 49 L82 48" fill="none" />
        </g>
      );
    case "sun":
      return (
        <g>
          <rect x="43" y="46" width="16" height="10.5" rx="4" fill="#1d1d1f" />
          <rect x="61" y="46" width="16" height="10.5" rx="4" fill="#1d1d1f" />
          <path d="M59 49.5 L61 49.5 M43 49 L38 48 M77 49 L82 48" stroke="#1d1d1f" strokeWidth="1.6" />
          <path d="M45 48 L49 48" stroke="#fff" strokeWidth="1" opacity="0.5" />
          <path d="M63 48 L67 48" stroke="#fff" strokeWidth="1" opacity="0.5" />
        </g>
      );
    case "aviator":
      return (
        <g stroke={GOLD_DARK} strokeWidth="1.1">
          <path d="M43.5 46.5 L58.5 46.5 C59 53 56 58 51 58 C46 58 43 53 43.5 46.5 Z" fill="rgba(60,50,40,0.75)" />
          <path d="M61.5 46.5 L76.5 46.5 C77 53 74 58 69 58 C64 58 61 53 61.5 46.5 Z" fill="rgba(60,50,40,0.75)" />
          <path d="M58.5 47 L61.5 47 M43.5 47.5 L38 47 M76.5 47.5 L82 47" fill="none" />
        </g>
      );
    default:
      return null;
  }
}

const MANNEQUIN: AvatarConfig = {
  v: 2, body: 0, skin: 0, face: 0, eyes: 0, eyeColor: 0, brows: 0, nose: 0, mouth: 0, lips: 0,
  hair: 6, hairColor: 0, facial: 0, freckles: 0, top: 0, topColor: 0, pattern: 0, glasses: 0,
  earrings: 0, headwear: 0, bg: 0, bgStyle: 0, frame: 0, country: null,
};

/** One item on a mannequin, for the closet and the reveal. */
export function ItemArt({ item, size = 96 }: { item: Item; size?: number }) {
  const slot = ({ pin: "badge", shirt: "body", mug: "hand", cap: "head", scarf: "neck", flag: "hand", beanie: "head", hoodie: "body", globe: "hand", crown: "head", trophy: "hand" } as const)[item.kind];
  return <Avatar avatar={MANNEQUIN} equipped={{ [slot]: item }} size={size} faceless ring={RARITIES[item.rarity].colour} title={item.kind} />;
}
