"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

export type LandingLogo = { name: string; dataUrl: string };

type LandingState = {
  demoOpen: boolean;
  openDemo: () => void;
  closeDemo: () => void;
  /** Shop name typed in the hero or the demo form — both stay in sync. */
  brand: string;
  setBrand: (value: string) => void;
  logo: LandingLogo | null;
  setLogo: (logo: LandingLogo | null) => void;
};

const LandingContext = createContext<LandingState | null>(null);

export function LandingProvider({ children }: { children: ReactNode }) {
  const [demoOpen, setDemoOpen] = useState(false);
  const [brand, setBrand] = useState("");
  const [logo, setLogo] = useState<LandingLogo | null>(null);
  const openDemo = useCallback(() => setDemoOpen(true), []);
  const closeDemo = useCallback(() => setDemoOpen(false), []);
  const value = useMemo(
    () => ({ demoOpen, openDemo, closeDemo, brand, setBrand, logo, setLogo }),
    [demoOpen, openDemo, closeDemo, brand, logo],
  );
  return <LandingContext.Provider value={value}>{children}</LandingContext.Provider>;
}

export function useLanding(): LandingState {
  const ctx = useContext(LandingContext);
  if (!ctx) throw new Error("useLanding must be used inside <LandingProvider>");
  return ctx;
}

/** Shared click handler for every "Get Free Demo" button and link. */
export function useOpenDemo() {
  const { openDemo } = useLanding();
  return useCallback(
    (e?: { preventDefault: () => void }) => {
      e?.preventDefault();
      openDemo();
    },
    [openDemo],
  );
}
