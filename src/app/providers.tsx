"use client";

import { Provider } from "react-redux";
import { store } from "@/src/store";
import { WebMcpBridge } from "./webmcp-bridge";
import { AuthProactiveRefresh } from "@/src/components/session/auth-proactive-refresh";
import { AuthTokenSyncBridge } from "@/src/components/session/auth-token-sync-bridge";
import { SessionHydrator } from "@/src/components/session/session-hydrator";
import { StaticHardNav } from "@/src/components/static-hard-nav";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <SessionHydrator />
      <AuthProactiveRefresh />
      <AuthTokenSyncBridge />
      <WebMcpBridge />
      <StaticHardNav />
      {children}
    </Provider>
  );
}
