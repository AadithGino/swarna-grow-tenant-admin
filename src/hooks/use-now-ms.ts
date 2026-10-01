"use client";

import { useSyncExternalStore } from "react";

function subscribeNow(onStoreChange: () => void) {
  const id = window.setInterval(onStoreChange, 60_000);
  return () => window.clearInterval(id);
}

function getNowMs() {
  return Date.now();
}

/** Client clock for relative deadlines (SSR snapshot is 0). */
export function useNowMs() {
  return useSyncExternalStore(subscribeNow, getNowMs, () => 0);
}
