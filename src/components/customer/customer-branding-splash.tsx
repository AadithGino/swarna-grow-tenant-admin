"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useCustomerTenant } from "@/src/components/customer/customer-tenant-context";
import { useGetPublicCustomerUploadDownloadQuery } from "@/src/store/api/customer-api";
import {
  buildCustomerSplashBackground,
  CustomerSplashFiligree,
  CustomerSplashLogo,
} from "@/src/components/customer/customer-splash-shared";

const SPLASH_MIN_MS = 2500;

function uploadIdFromPath(value?: string | null): string | null {
  if (!value) return null;
  const match = value.match(/\/uploads\/([^/?#]+)/);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
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
  const splashBase = tenant?.splashBackgroundColor?.trim() || null;
  const displayName = tenant?.appDisplayName ?? tenant?.displayName ?? "Gold savings";
  const tagline = tenant?.splashTagline?.trim() || "Crafted savings. Trusted jewellery.";
  const splashEnabled = tenant?.splashEnabled !== false;

  const splashBackground = buildCustomerSplashBackground(primary, accent, splashBase);

  const logoUploadId = uploadIdFromPath(tenant?.logoUrl);
  const logoQuery = useGetPublicCustomerUploadDownloadQuery(logoUploadId as string, {
    skip: !logoUploadId,
  });
  const logoSrc = logoQuery.data?.downloadUrl ?? null;
  const logoSettled = !logoUploadId || logoQuery.isSuccess || logoQuery.isError;
  const brandingReady = !loading && Boolean(tenant);
  const readyToDismiss = brandingReady && logoSettled;

  useEffect(() => {
    if (notFound) {
      onDone();
      return;
    }
    if (!brandingReady) return;
    if (!splashEnabled) {
      onDone();
      return;
    }
    if (!readyToDismiss) return;

    const hideTimer = window.setTimeout(() => {
      setFading(true);
      window.setTimeout(onDone, 450);
    }, SPLASH_MIN_MS);

    return () => window.clearTimeout(hideTimer);
  }, [brandingReady, readyToDismiss, notFound, splashEnabled, tenant?.tenantCode, onDone]);

  if (!splashEnabled || notFound) return null;

  if (!brandingReady) {
    return (
      <div
        className="fixed inset-0 z-[90] bg-[#0a0a0a]"
        role="status"
        aria-live="polite"
        aria-label="Loading jeweller branding"
      />
    );
  }

  return (
    <div
      className="fixed inset-0 z-[90] overflow-hidden transition-opacity duration-500 ease-out"
      style={{
        opacity: fading ? 0 : 1,
        background: splashBackground,
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

      <CustomerSplashFiligree accent={accent} className="pointer-events-none absolute left-5 top-5 h-[4.25rem] w-[4.25rem] opacity-75 sm:left-8 sm:top-8 sm:h-20 sm:w-20" />
      <CustomerSplashFiligree accent={accent} className="pointer-events-none absolute right-5 top-5 h-[4.25rem] w-[4.25rem] rotate-90 opacity-75 sm:right-8 sm:top-8 sm:h-20 sm:w-20" />
      <CustomerSplashFiligree accent={accent} className="pointer-events-none absolute bottom-5 left-5 h-[4.25rem] w-[4.25rem] -rotate-90 opacity-75 sm:bottom-8 sm:left-8 sm:h-20 sm:w-20" />
      <CustomerSplashFiligree accent={accent} className="pointer-events-none absolute bottom-5 right-5 h-[4.25rem] w-[4.25rem] rotate-180 opacity-75 sm:bottom-8 sm:right-8 sm:h-20 sm:w-20" />

      <div className="customer-splash-rise relative z-10 flex h-full flex-col items-center justify-center px-8 text-center">
        <div className="mb-7 flex items-center gap-3" style={{ color: accent }}>
          <span className="h-px w-11 bg-current opacity-70" />
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
            <path d="M9 1.4 14.6 7.15 9 16.6 3.4 7.15 9 1.4Z" fill="currentColor" />
          </svg>
          <span className="h-px w-11 bg-current opacity-70" />
        </div>

        <CustomerSplashLogo
          logoSrc={logoSrc}
          accent={accent}
          primary={primary}
          fallbackLetter={displayName.slice(0, 1).toUpperCase()}
          loading={loading}
        />

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
