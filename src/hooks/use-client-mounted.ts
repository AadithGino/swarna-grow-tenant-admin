"use client";

import { useEffect, useState } from "react";

/** True only after the first client paint — avoids SSR/client HTML mismatches. */
export function useClientMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}
