"use client";

// The player on this browser: nickname, avatar, what they wear and the merch
// they own. Kept in localStorage and, where the team server runs, on the
// server too (it holds the truth for items; the browser holds a token).

import { useSyncExternalStore } from "react";
import { sanitizeAvatar, type AvatarConfig } from "@shared/avatar.mjs";
import type { Item, SLOTS } from "@shared/merch.mjs";
import { teamServer } from "./scores";

export type Slot = keyof typeof SLOTS;
export type Equipped = Partial<Record<Slot, string>>;

export interface Player {
  /** Server id; null for a player made where there is no team server. */
  id: string | null;
  /** Proves who this browser is to the server; also the code to sign in elsewhere. */
  token: string | null;
  nickname: string;
  avatar: AvatarConfig;
  equipped: Equipped;
  items: Item[];
}

/** What other players see: equipped items arrive as whole items. */
export interface PublicPlayer {
  id: string;
  nickname: string;
  avatar: AvatarConfig;
  equipped: Partial<Record<Slot, Item>>;
  items: number;
}

const KEY = "geo.player";
const EVENT = "geo:player";

let cachedRaw: string | null | undefined;
let cached: Player | null = null;

function snapshot(): Player | null {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    raw = null;
  }
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    try {
      const p = raw ? (JSON.parse(raw) as Player) : null;
      cached = p ? { ...p, avatar: sanitizeAvatar(p.avatar), equipped: p.equipped ?? {}, items: p.items ?? [] } : null;
    } catch {
      cached = null;
    }
  }
  return cached;
}

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** The player, or null before sign-up; undefined during the server render. */
export function usePlayer(): Player | null | undefined {
  return useSyncExternalStore(subscribe, snapshot, () => undefined);
}

export function getPlayer(): Player | null {
  return typeof window === "undefined" ? null : snapshot();
}

function store(p: Player | null) {
  try {
    if (p) localStorage.setItem(KEY, JSON.stringify(p));
    else localStorage.removeItem(KEY);
  } catch {
    /* storage blocked: the player lives until the tab closes */
  }
  window.dispatchEvent(new Event(EVENT));
}

/** The nickname typed before players existed, to pre-fill sign-up. */
export function legacyName(): string {
  try {
    return localStorage.getItem("geo.name") ?? "";
  } catch {
    return "";
  }
}

async function api<T>(method: string, url: string, body?: unknown, token?: string | null): Promise<{ status: number; data: T | null }> {
  const res = await fetch(url, {
    method,
    headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let data: T | null = null;
  try {
    data = (await res.json()) as T;
  } catch {
    data = null;
  }
  return { status: res.status, data };
}

type MeResponse = { player: PublicPlayer; items: Item[] };

function fromServer(token: string, me: MeResponse): Player {
  const equipped: Equipped = {};
  for (const [slot, item] of Object.entries(me.player.equipped)) if (item) equipped[slot as Slot] = item.id;
  return { id: me.player.id, token, nickname: me.player.nickname, avatar: sanitizeAvatar(me.player.avatar), equipped, items: me.items };
}

export type SignUpResult = "ok" | "taken" | "invalid" | "error";

/** Signs up on the team server if there is one, otherwise on this browser only. */
export async function signUp(nickname: string, avatar: AvatarConfig): Promise<SignUpResult> {
  if (!(await teamServer())) {
    store({ id: null, token: null, nickname, avatar, equipped: {}, items: [] });
    return "ok";
  }
  try {
    const r = await api<{ player: PublicPlayer; token: string }>("POST", "/api/players", { nickname, avatar });
    if (r.status === 409) return "taken";
    if (r.status === 400) return "invalid";
    if (r.status !== 201 || !r.data) return "error";
    store(fromServer(r.data.token, { player: r.data.player, items: [] }));
    return "ok";
  } catch {
    return "error";
  }
}

/** Continues on this browser as a player made elsewhere, by their code. */
export async function signInWithCode(code: string): Promise<boolean> {
  try {
    const r = await api<MeResponse>("GET", "/api/me", undefined, code.trim());
    if (r.status !== 200 || !r.data) return false;
    store(fromServer(code.trim(), r.data));
    return true;
  } catch {
    return false;
  }
}

/** Fetches the player's latest items and profile from the server. */
export async function refreshPlayer(): Promise<void> {
  const p = getPlayer();
  if (!p?.token) return;
  try {
    const r = await api<MeResponse>("GET", "/api/me", undefined, p.token);
    if (r.status === 200 && r.data) store(fromServer(p.token, r.data));
  } catch {
    /* offline for a moment: keep what we have */
  }
}

export type UpdateResult = "ok" | "taken" | "invalid" | "error";

/** Changes nickname, avatar or what is worn; saved locally and on the server. */
export async function updatePlayer(patch: Partial<Pick<Player, "nickname" | "avatar" | "equipped">>): Promise<UpdateResult> {
  const p = getPlayer();
  if (!p) return "error";
  if (!p.token) {
    store({ ...p, ...patch });
    return "ok";
  }
  try {
    const r = await api<MeResponse>("PUT", "/api/me", patch, p.token);
    if (r.status === 409) return "taken";
    if (r.status === 400) return "invalid";
    if (r.status !== 200 || !r.data) return "error";
    store(fromServer(p.token, r.data));
    return "ok";
  } catch {
    return "error";
  }
}

export async function markItemsSeen(): Promise<void> {
  const p = getPlayer();
  if (!p) return;
  store({ ...p, items: p.items.map((i) => ({ ...i, seen: true })) });
  if (p.token) await api("POST", "/api/me/seen", {}, p.token).catch(() => null);
}

/** A player made without a server joins it once it is there. */
export async function joinServerIfNeeded(): Promise<void> {
  const p = getPlayer();
  if (!p || p.token || !(await teamServer())) return;
  const r = await api<{ player: PublicPlayer; token: string }>("POST", "/api/players", { nickname: p.nickname, avatar: p.avatar }).catch(() => null);
  if (r?.status === 201 && r.data) store(fromServer(r.data.token, { player: r.data.player, items: [] }));
}

export function signOut() {
  store(null);
}

/** The items a player wears, as whole items. */
export function wornItems(p: Pick<Player, "equipped" | "items">): Partial<Record<Slot, Item>> {
  const out: Partial<Record<Slot, Item>> = {};
  for (const [slot, id] of Object.entries(p.equipped)) {
    const item = p.items.find((i) => i.id === id);
    if (item) out[slot as Slot] = item;
  }
  return out;
}
