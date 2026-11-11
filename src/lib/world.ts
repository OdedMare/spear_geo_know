"use client";

import { useEffect, useState } from "react";
import type { LonLat, Shape } from "./geo";

export interface Country {
  id: string; // ISO 3166-1 alpha-3
  iso2: string;
  he: string;
  en: string;
  alt: string[];
  continent: string;
  sovereign: boolean;
  area: number; // km²
  pop: number; // population estimate (Natural Earth, 2019)
  capital: string | null; // Hebrew
  center: LonLat | null;
  borders: string[];
  flag: boolean;
  shape: Shape | null;
}

export interface World {
  countries: Country[];
  byId: Map<string, Country>;
  /** Countries that can be drawn and measured: every guess in a map game. */
  mapped: Country[];
  neighbours: (id: string) => string[];
  /** Land that belongs to no country in the app: drawn plain, never named. */
  land: Shape;
}

let pending: Promise<World> | null = null;

export function loadWorld(): Promise<World> {
  pending ??= fetch("/data/world.json")
    .then((r) => {
      if (!r.ok) throw new Error(`world.json: ${r.status}`);
      return r.json() as Promise<{ countries: Country[]; land?: Shape }>;
    })
    .then(({ countries, land = [] }) => {
      const byId = new Map(countries.map((c) => [c.id, c]));
      return {
        countries,
        byId,
        mapped: countries.filter((c) => c.shape),
        neighbours: (id: string) => byId.get(id)?.borders ?? [],
        land,
      };
    })
    .catch((e) => {
      pending = null;
      throw e;
    });
  return pending;
}

export function useWorld(): { world: World | null; error: string | null } {
  const [world, setWorld] = useState<World | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    loadWorld().then(
      (w) => live && setWorld(w),
      () => live && setError("לא הצלחנו לטעון את מפת העולם. נסו לרענן את הדף."),
    );
    return () => {
      live = false;
    };
  }, []);
  return { world, error };
}

export const flagUrl = (c: Country) => `/flags/${c.iso2.toLowerCase()}.svg`;
