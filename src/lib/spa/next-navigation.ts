/**
 * `next/navigation` for app code (wired in vite.config.ts). Everything is vinext's, except
 * `useRouter`, whose push/replace/refresh stay in the page instead of fetching an RSC
 * payload from the host. See spa-navigate.ts.
 */
import { useMemo } from "react";
import { useRouter as useVinextRouter } from "next/navigation";
import { spaNavigate, spaRefresh } from "./spa-navigate";

export * from "next/navigation";

type Router = ReturnType<typeof useVinextRouter>;

export function useRouter(): Router {
  const router = useVinextRouter();
  return useMemo<Router>(
    () => ({
      ...router,
      push: (href: string, options?: { scroll?: boolean }) => spaNavigate(href, { scroll: options?.scroll }),
      replace: (href: string, options?: { scroll?: boolean }) =>
        spaNavigate(href, { replace: true, scroll: options?.scroll }),
      refresh: () => spaRefresh(),
      // Code is bundled with the page; there is nothing to prefetch from a static host.
      prefetch: () => {},
      back: () => window.history.back(),
      forward: () => window.history.forward(),
    }),
    [router],
  );
}
