"use client";

/**
 * `next/link` for app code (wired in vite.config.ts). Renders a real <a href> (middle-click,
 * new tab, copy link all work) and navigates in-page on a plain click. See spa-navigate.ts.
 */
import { forwardRef, type AnchorHTMLAttributes, type MouseEvent, type ReactNode } from "react";
import { spaNavigate } from "./spa-navigate";

type UrlLike = {
  pathname?: string | null;
  query?: string | null | Record<string, string | number | boolean | readonly (string | number | boolean)[] | null | undefined>;
  search?: string | null;
  hash?: string | null;
};

export type LinkProps = {
  href: string | UrlLike;
  as?: string | UrlLike;
  replace?: boolean;
  scroll?: boolean;
  prefetch?: boolean | "auto" | null;
  passHref?: boolean;
  shallow?: boolean;
  locale?: string | false;
  legacyBehavior?: boolean;
  unstable_dynamicOnHover?: boolean;
  transitionTypes?: string[];
  onNavigate?: (event: { preventDefault(): void }) => void;
  children?: ReactNode;
} & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href">;

function formatHref(href: string | UrlLike): string {
  if (typeof href === "string") return href;
  let out = href.pathname ?? "";
  if (href.search) {
    out += href.search.startsWith("?") ? href.search : `?${href.search}`;
  } else if (href.query && typeof href.query === "object") {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(href.query)) {
      if (value === null || value === undefined) continue;
      if (Array.isArray(value)) value.forEach((v) => params.append(key, String(v)));
      else params.append(key, String(value));
    }
    const qs = params.toString();
    if (qs) out += `?${qs}`;
  } else if (typeof href.query === "string" && href.query) {
    out += `?${href.query}`;
  }
  if (href.hash) out += href.hash.startsWith("#") ? href.hash : `#${href.hash}`;
  return out || "/";
}

function isPlainLeftClick(event: MouseEvent<HTMLAnchorElement>): boolean {
  return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}

const Link = forwardRef<HTMLAnchorElement, LinkProps>(function Link(
  {
    href,
    as,
    replace,
    scroll,
    onClick,
    onNavigate,
    target,
    // Next-only props that must not reach the DOM.
    prefetch: _prefetch,
    passHref: _passHref,
    shallow: _shallow,
    locale: _locale,
    legacyBehavior: _legacyBehavior,
    unstable_dynamicOnHover: _hover,
    transitionTypes: _transitionTypes,
    children,
    ...rest
  },
  ref,
) {
  const resolved = formatHref(as ?? href);

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);
    if (event.defaultPrevented) return;
    if (!isPlainLeftClick(event)) return;
    if (target && target !== "_self") return;
    if (rest.download !== undefined) return;
    if (onNavigate) {
      let cancelled = false;
      onNavigate({ preventDefault: () => (cancelled = true) });
      if (cancelled) {
        event.preventDefault();
        return;
      }
    }
    if (resolved.startsWith("#")) return; // same-page anchor: let the browser scroll
    event.preventDefault();
    spaNavigate(resolved, { replace, scroll });
  };

  return (
    <a {...rest} ref={ref} href={resolved} target={target} onClick={handleClick}>
      {children}
    </a>
  );
});

export default Link;

/** Static host: there is never a pending RSC fetch behind a link. */
export function useLinkStatus(): { pending: boolean } {
  return { pending: false };
}
