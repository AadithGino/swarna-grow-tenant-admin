"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useCustomerTenant } from "@/src/components/customer/customer-tenant-context";
import { useGetPublicCustomerUploadDownloadQuery } from "@/src/store/api/customer-api";

const SPLASH_MIN_MS = 2500;

function uploadIdFromPath(value?: string | null): string | null {
  if (!value) return null;
  const match = value.match(/\/uploads\/([^/?#]+)/);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

function FiligreeCorner({
  accent,
  className,
}: {
  accent: string;
  className?: string;
}) {
  return (
    <svg
      aria-hidden
      className={className}
      viewBox="0 0 80 80"
      fill="none"
    >
      <path d="M4 30V4h26" stroke={accent} strokeWidth="1.2" />
      <path d="M4 16V8h8" stroke={accent} strokeWidth="1.1" opacity="0.55" />
      <circle cx="8" cy="8" r="1.55" fill={accent} />
    </svg>
  );
}

/**
 * Opaque jewellery-app boot splash — deep burgundy field, gold ornament, brand hero.
 * Shell chrome stays unmounted until this finishes.
 */
export function CustomerBrandingSplash({
  onDone,
}: {
  onDone: () => void;
}) {
  const { tenant, loading, notFound } = useCustomerTenant();
  const [fading, setFading] = useState(false);

  const primary = tenant?.primaryColor ?? "#730321";
  const accent = tenant?.accentColor ?? "#C9A227";
  const displayName = tenant?.appDisplayName ?? tenant?.displayName ?? "Gold savings";
  const tagline = tenant?.splashTagline?.trim() || "Crafted savings. Trusted jewellery.";
  const splashEnabled = tenant?.splashEnabled !== false;

  const logoUploadId = uploadIdFromPath(tenant?.logoUrl);
  const logoQuery = useGetPublicCustomerUploadDownloadQuery(logoUploadId as string, {
    skip: !logoUploadId,
  });
  const logoSrc = logoQuery.data?.downloadUrl ?? null;
  const logoSettled = !logoUploadId || logoQuery.isSuccess || logoQuery.isError;

  useEffect(() => {
    if (notFound) {
      onDone();
      return;
    }
    if (loading || !tenant) return;
    if (!splashEnabled) {
      onDone();
      return;
    }
    if (!logoSettled) return;

    const hideTimer = window.setTimeout(() => {
      setFading(true);
      window.setTimeout(onDone, 450);
    }, SPLASH_MIN_MS);

    return () => window.clearTimeout(hideTimer);
  }, [loading, tenant, notFound, splashEnabled, logoSettled, onDone]);

  if (!splashEnabled || notFound) return null;

  return (
    <div
      className="fixed inset-0 z-[90] overflow-hidden transition-opacity duration-500 ease-out"
      style={{
        opacity: fading ? 0 : 1,
        background: `
          radial-gradient(ellipse 95% 58% at 50% -10%, ${accent}4d 0%, transparent 58%),
          radial-gradient(ellipse 75% 42% at 50% 115%, ${accent}33 0%, transparent 52%),
          linear-gradient(168deg, ${primary} 0%, #4a0216 46%, #1f0109 100%)
        `,
      }}
      role="status"
      aria-live="polite"
      aria-label={`${displayName} splash`}
    >
      <div
        aria-hidden
        className="customer-splash-shimmer pointer-events-none absolute inset-0 opacity-45"
        style={{
          background: `linear-gradient(108deg, transparent 38%, ${accent}26 50%, transparent 62%)`,
        }}
      />

      <FiligreeCorner accent={accent} className="pointer-events-none absolute left-5 top-5 h-[4.25rem] w-[4.25rem] opacity-75 sm:left-8 sm:top-8 sm:h-20 sm:w-20" />
      <FiligreeCorner accent={accent} className="pointer-events-none absolute right-5 top-5 h-[4.25rem] w-[4.25rem] rotate-90 opacity-75 sm:right-8 sm:top-8 sm:h-20 sm:w-20" />
      <FiligreeCorner accent={accent} className="pointer-events-none absolute bottom-5 left-5 h-[4.25rem] w-[4.25rem] -rotate-90 opacity-75 sm:bottom-8 sm:left-8 sm:h-20 sm:w-20" />
      <FiligreeCorner accent={accent} className="pointer-events-none absolute bottom-5 right-5 h-[4.25rem] w-[4.25rem] rotate-180 opacity-75 sm:bottom-8 sm:right-8 sm:h-20 sm:w-20" />

      <div className="customer-splash-rise relative z-10 flex h-full flex-col items-center justify-center px-8 text-center">
        <div className="mb-7 flex items-center gap-3" style={{ color: accent }}>
          <span className="h-px w-11 bg-current opacity-70" />
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
            <path d="M9 1.4 14.6 7.15 9 16.6 3.4 7.15 9 1.4Z" fill="currentColor" />
          </svg>
          <span className="h-px w-11 bg-current opacity-70" />
        </div>

        <div
          className="mb-8 grid size-[7.5rem] place-items-center rounded-[2rem] sm:size-[8.25rem]"
          style={{
            background: "linear-gradient(155deg, #fffefb 0%, #fff4d8 100%)",
            boxShadow: `0 30px 64px -30px ${accent}aa, 0 0 0 1px ${accent}66`,
          }}
        >
          {logoSrc ? (
            <span className="relative block h-[4.4rem] w-[5.7rem] sm:h-[4.85rem] sm:w-24">
              <Image src={logoSrc} alt="" fill sizes="100px" unoptimized className="object-contain" />
            </span>
          ) : loading ? (
            <span className="size-10 animate-pulse rounded-full bg-black/10" />
          ) : (
            <span className="font-serif text-4xl font-semibold tracking-tight" style={{ color: primary }}>
              {displayName.slice(0, 1).toUpperCase()}
            </span>
          )}
        </div>

        <p className="mb-3 text-[0.68rem] font-semibold uppercase tracking-[0.36em]" style={{ color: accent }}>
          Jewellery savings
        </p>
        <h1
          className="max-w-[14ch] text-balance font-serif text-[2.65rem] font-semibold leading-[1.06] tracking-[-0.02em] text-white sm:text-5xl"
          style={{ textShadow: "0 12px 42px rgba(0,0,0,0.4)" }}
        >
          {loading ? "…" : displayName}
        </h1>

        <div className="mb-6 mt-5 flex items-center gap-3" aria-hidden>
          <span className="h-px w-14" style={{ background: `linear-gradient(90deg, transparent, ${accent})` }} />
          <span className="size-1.5 rotate-45" style={{ background: accent }} />
          <span className="h-px w-14" style={{ background: `linear-gradient(90deg, ${accent}, transparent)` }} />
        </div>

        <p className="max-w-[22rem] text-pretty text-[0.98rem] leading-relaxed text-white/78">
          {loading ? "Opening your jewellery vault…" : tagline}
        </p>

        <div className="mt-12 w-40">
          <div className="h-[2px] overflow-hidden rounded-full bg-white/15">
            <div
              className="customer-splash-progress h-full w-2/5 rounded-full"
              style={{ background: `linear-gradient(90deg, ${accent}, #f6e7b0)` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
