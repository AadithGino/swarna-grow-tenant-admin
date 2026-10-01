"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/** True only after the first client paint — avoids SSR/client HTML mismatches. */
export function useClientMounted() {
  return useSyncExternalStore(subscribe, () => true, () => false);
}
