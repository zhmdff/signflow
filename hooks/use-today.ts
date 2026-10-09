"use client";

import { useSyncExternalStore } from "react";

let cached: string | null = null;

function localToday(): string {
  if (!cached) {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    cached = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  }
  return cached;
}

const subscribe = () => () => {};

/**
 * Today's date as YYYY-MM-DD in the viewer's time zone. Null while prerendering,
 * so the clock is never read on the server.
 */
export function useToday(): string | null {
  return useSyncExternalStore(subscribe, localToday, () => null);
}
