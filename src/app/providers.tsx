"use client";

import { Provider } from "react-redux";
import { store } from "@/src/store";
import { WebMcpBridge } from "./webmcp-bridge";
import { SessionHydrator } from "@/src/components/session/session-hydrator";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <SessionHydrator />
      <WebMcpBridge />
      {children}
    </Provider>
  );
}
