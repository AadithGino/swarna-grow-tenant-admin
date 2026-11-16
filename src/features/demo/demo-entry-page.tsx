"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { ShieldAlert } from "lucide-react";
import { customerPath, tenantCodeToSlug } from "@/src/lib/customer-tenant";
import { customerApi } from "@/src/store/api/customer-api";
import { customerSignedIn, customerSignedOut } from "@/src/store/slices/customer-session-slice";
import { customerPortalCapabilitiesFromTenant } from "@/src/lib/customer-portal-capabilities";
import { useAppDispatch } from "@/src/store/hooks";
import {
  useExchangeDemoSessionMutation,
  useGetDemoPublicBrandingQuery,
} from "@/src/store/api/demo-public-api";
import { useGetPublicCustomerUploadDownloadQuery } from "@/src/store/api/customer-api";

const SPLASH_MIN_MS = 2400;

function uploadIdFromLogoUrl(value?: string | null): string | null {
  if (!value) return null;
  const match = value.match(/\/uploads\/([^/?#]+)/);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Static Netlify serves one HTML shell, so Next's search-param context is empty even when the address bar has `?s=`. */
function readDemoSecret(): string {
  if (typeof window === "undefined") return "";
  const params = new URLSearchParams(window.location.search);
  return params.get("s") ?? params.get("secret") ?? "";
}

function subscribeToLocation(onChange: () => void) {
  window.addEventListener("popstate", onChange);
  return () => window.removeEventListener("popstate", onChange);
}

function useDemoLinkSecret(routerSecret: string): { secret: string; ready: boolean } {
  const fromAddressBar = useSyncExternalStore(subscribeToLocation, readDemoSecret, () => "");
  const ready = useSyncExternalStore(subscribeToLocation, () => true, () => false);
  return { secret: fromAddressBar || routerSecret, ready };
}

function FiligreeCorner({ accent, className }: { accent: string; className?: string }) {
  return (
    <svg aria-hidden className={className} viewBox="0 0 80 80" fill="none">
      <path d="M4 30V4h26" stroke={accent} strokeWidth="1.2" />
      <path d="M4 16V8h8" stroke={accent} strokeWidth="1.1" opacity="0.55" />
      <circle cx="8" cy="8" r="1.55" fill={accent} />
    </svg>
  );
}

/**
 * Public Demo Builder share-link entry: /demo/:publicId?s=secret.
 * Jewellery-style branded splash, then customer session handoff.
 */
export function DemoEntryPage({ publicId }: { publicId: string }) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const searchParams = useSearchParams();
  const routerSecret = searchParams.get("s") ?? searchParams.get("secret") ?? "";
  const { secret, ready: secretReady } = useDemoLinkSecret(routerSecret);

  const [exchangeError, setExchangeError] = useState<string | null>(null);
  const [phase, setPhase] = useState<"loading" | "splash" | "handoff" | "error">("loading");
  const attempted = useRef(false);
  const [pollBranding, setPollBranding] = useState(true);

  const brandingQuery = useGetDemoPublicBrandingQuery(publicId, {
    skip: !publicId,
    pollingInterval: pollBranding ? 3000 : 0,
  });
  const [exchangeSession] = useExchangeDemoSessionMutation();

  const branding = brandingQuery.data;
  const canExchange = branding?.status === "READY";
  const waitingOnProvision =
    branding?.status === "PROVISIONING" || branding?.status === "RESETTING";
  const splashEnabled = branding?.splashEnabled !== false;

  useEffect(() => {
    if (canExchange || brandingQuery.isError || phase === "error") setPollBranding(false);
    else if (waitingOnProvision) setPollBranding(true);
  }, [canExchange, waitingOnProvision, brandingQuery.isError, phase]);

  const primaryColor = branding?.primaryColor ?? "#730321";
  const accentColor = branding?.accentColor ?? "#C9A227";
  const displayName = branding?.displayName ?? branding?.appDisplayName ?? "Gold savings demo";
  const tagline = branding?.splashTagline?.trim() || "Crafted savings. Trusted jewellery.";

  const logoUploadId = uploadIdFromLogoUrl(branding?.logoUrl);
  const logoDownload = useGetPublicCustomerUploadDownloadQuery(logoUploadId as string, {
    skip: !logoUploadId,
  });
  const logoSrc =
    logoDownload.data?.downloadUrl
    ?? (branding?.logoUrl && /^https?:\/\//i.test(branding.logoUrl) ? branding.logoUrl : null);

  useEffect(() => {
    if (!publicId || !secret || attempted.current) return;
    if (brandingQuery.isError) {
      setPhase("error");
      return;
    }
    if (!branding) return;
    if (waitingOnProvision || !canExchange) {
      setPhase(waitingOnProvision ? "splash" : "error");
      return;
    }

    attempted.current = true;
    setPhase("splash");
    // A rotated link must not keep calling /app/profile with the previous demo token.
    dispatch(customerSignedOut());
    dispatch(customerApi.util.resetApiState());
    const startedAt = Date.now();

    (async () => {
      try {
        const result = await exchangeSession({ publicId, secret }).unwrap();
        if (splashEnabled) {
          const elapsed = Date.now() - startedAt;
          if (elapsed < SPLASH_MIN_MS) await sleep(SPLASH_MIN_MS - elapsed);
        }
        setPhase("handoff");
        const caps = customerPortalCapabilitiesFromTenant(result.tenant);
        dispatch(
          customerSignedIn({
            customerId: result.customer.id,
            tenantId: result.tenant.id,
            tenantCode: result.tenant.tenantCode ?? "",
            accessToken: result.accessToken,
            refreshToken: result.refreshToken,
            profileComplete: true,
            kycMandatory: caps.kycMandatory,
            customerSelfRegistration: caps.customerSelfRegistration,
            customerSelfEnrol: caps.customerSelfEnrol,
            multiScheme: caps.multiScheme,
            customerLoginMode: caps.customerLoginMode,
            customerAppWriteEnabled: caps.customerAppWriteEnabled,
            customerAppPaymentsEnabled: caps.customerAppPaymentsEnabled,
          }),
        );
        const slug = result.tenant.tenantCode ? tenantCodeToSlug(result.tenant.tenantCode) : null;
        router.replace(customerPath(slug));
      } catch (err) {
        const message =
          (err as { data?: { error?: { message?: string } } })?.data?.error?.message
          ?? "This demo link is not valid or has expired.";
        setExchangeError(message);
        setPhase("error");
      }
    })();
  }, [
    publicId,
    secret,
    branding,
    canExchange,
    waitingOnProvision,
    brandingQuery.isError,
    splashEnabled,
    exchangeSession,
    dispatch,
    router,
  ]);

  const problem =
    exchangeError
    ?? (secretReady && !secret ? "This demo link is missing its access code. Ask for a fresh link." : null)
    ?? (brandingQuery.isError ? "This demo link is not valid or has expired." : null)
    ?? (branding && !canExchange && !waitingOnProvision
      ? "This demo is not currently available. Ask for a fresh link."
      : null);

  const statusHint =
    branding?.status === "PROVISIONING"
      ? "Preparing your jewellery vault…"
      : branding?.status === "RESETTING"
        ? "Refreshing demo jewellery data…"
        : phase === "handoff"
          ? "Opening your demo…"
          : tagline;

  return (
    <div
      className="relative grid min-h-screen place-items-center overflow-hidden px-6"
      style={{
        background: `
          radial-gradient(ellipse 95% 58% at 50% -10%, ${accentColor}4d 0%, transparent 58%),
          radial-gradient(ellipse 75% 42% at 50% 115%, ${accentColor}33 0%, transparent 52%),
          linear-gradient(168deg, ${primaryColor} 0%, #4a0216 46%, #1f0109 100%)
        `,
      }}
    >
      <div
        aria-hidden
        className="customer-splash-shimmer pointer-events-none absolute inset-0 opacity-45"
        style={{
          background: `linear-gradient(108deg, transparent 38%, ${accentColor}26 50%, transparent 62%)`,
        }}
      />

      <FiligreeCorner accent={accentColor} className="pointer-events-none absolute left-5 top-5 h-[4.25rem] w-[4.25rem] opacity-75 sm:left-8 sm:top-8 sm:h-20 sm:w-20" />
      <FiligreeCorner accent={accentColor} className="pointer-events-none absolute right-5 top-5 h-[4.25rem] w-[4.25rem] rotate-90 opacity-75 sm:right-8 sm:top-8 sm:h-20 sm:w-20" />
      <FiligreeCorner accent={accentColor} className="pointer-events-none absolute bottom-5 left-5 h-[4.25rem] w-[4.25rem] -rotate-90 opacity-75 sm:bottom-8 sm:left-8 sm:h-20 sm:w-20" />
      <FiligreeCorner accent={accentColor} className="pointer-events-none absolute bottom-5 right-5 h-[4.25rem] w-[4.25rem] rotate-180 opacity-75 sm:bottom-8 sm:right-8 sm:h-20 sm:w-20" />

      <div className="customer-splash-rise relative z-10 flex w-full max-w-md flex-col items-center text-center">
        <div className="mb-7 flex items-center gap-3" style={{ color: accentColor }}>
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
            boxShadow: `0 30px 64px -30px ${accentColor}aa, 0 0 0 1px ${accentColor}66`,
          }}
        >
          {logoSrc ? (
            <span className="relative block h-[4.4rem] w-[5.7rem] sm:h-[4.85rem] sm:w-24">
              <Image src={logoSrc} alt="" fill sizes="100px" unoptimized className="object-contain" />
            </span>
          ) : (
            <span className="font-serif text-4xl font-semibold tracking-tight" style={{ color: primaryColor }}>
              {displayName.slice(0, 1).toUpperCase()}
            </span>
          )}
        </div>

        <p className="mb-3 text-[0.68rem] font-semibold uppercase tracking-[0.36em]" style={{ color: accentColor }}>
          Jewellery savings
        </p>
        <h1
          className="max-w-[14ch] text-balance font-serif text-[2.65rem] font-semibold leading-[1.06] tracking-[-0.02em] text-white sm:text-5xl"
          style={{ textShadow: "0 12px 42px rgba(0,0,0,0.4)" }}
        >
          {displayName}
        </h1>

        <div className="mb-6 mt-5 flex items-center gap-3" aria-hidden>
          <span className="h-px w-14" style={{ background: `linear-gradient(90deg, transparent, ${accentColor})` }} />
          <span className="size-1.5 rotate-45" style={{ background: accentColor }} />
          <span className="h-px w-14" style={{ background: `linear-gradient(90deg, ${accentColor}, transparent)` }} />
        </div>

        {problem || phase === "error" ? (
          <div className="mt-2 w-full rounded-2xl bg-white/95 px-5 py-6 shadow-sm">
            <ShieldAlert className="mx-auto mb-2 size-8 text-red-500" />
            <p className="text-sm text-[#5c3a40]">
              {problem ?? "This demo link is not valid or has expired."}
            </p>
          </div>
        ) : (
          <>
            <p className="max-w-[22rem] text-pretty text-[0.98rem] leading-relaxed text-white/78">
              {statusHint}
            </p>
            <div className="mt-12 w-40">
              <div className="h-[2px] overflow-hidden rounded-full bg-white/15">
                <div
                  className="customer-splash-progress h-full w-2/5 rounded-full"
                  style={{ background: `linear-gradient(90deg, ${accentColor}, #f6e7b0)` }}
                />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
