"use client";

import { useSyncExternalStore } from "react";

const noop = () => () => {};

/** False during the server render and hydration, true in the browser after. */
export function useHydrated(): boolean {
  return useSyncExternalStore(noop, () => true, () => false);
}
