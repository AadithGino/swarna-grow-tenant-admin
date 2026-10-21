import { env } from "@/src/config/env";
import { customerPath } from "@/src/lib/customer-tenant";
import {
  pollSessionFromInitResponse,
  saveCustomerPaymentSession,
  type CustomerPaymentSession,
} from "@/src/lib/customer-payment-session";

export function extractPaymentLinkToken(pathOrUrl: string): string | null {
  const trimmed = pathOrUrl.trim();
  if (!trimmed) return null;
  const withoutQuery = trimmed.split("?")[0] ?? trimmed;
  const match = withoutQuery.match(/(?:^|\/)pay\/([^/]+)$/);
  return match?.[1] ?? null;
}

type InitiateLink = (linkToken: string) => Promise<{ gatewayUrl?: string; redirectUrl?: string }>;

/** PhonePe hosted checkout URL from an SDK order token (return URL is separate). */
export function phonePeSdkGatewayUrl(token: string | null | undefined): string {
  const trimmed = token?.trim();
  if (!trimmed) return "";
  return `https://mercury.phonepe.com/transact/pg?token=${encodeURIComponent(trimmed)}`;
}

/** SDK token from backend `PROVIDER_MODE=mock` (demo — not real PhonePe). */
export function isPhonePeMockSdkToken(token: string | null | undefined): boolean {
  const trimmed = token?.trim();
  if (!trimmed) return false;
  if (trimmed === "mock") return true;
  return trimmed.startsWith("mock-token-");
}

/** Same-origin absolute URL → app path for client-side router navigation. */
export function sameOriginCustomerPath(url: string): string {
  if (typeof window === "undefined") return url;
  if (url.startsWith(window.location.origin)) {
    const path = url.slice(window.location.origin.length);
    return path.startsWith("/") ? path : `/${path}`;
  }
  return url;
}

function isMockGatewayTarget(url: string, token?: string | null): boolean {
  if (isPhonePeMockSdkToken(token)) return true;
  if (!url) return false;
  if (url.includes("mock=success")) return true;
  if (/token=mock(-token-|$)/i.test(url)) return true;
  if (env.useMocks && /mercury\.phonepe\.com/i.test(url)) return true;
  return false;
}

/** Opens PhonePe or navigates to a customer-scoped return/status route. */
export async function openCustomerPaymentTarget(
  response: Record<string, unknown>,
  options: {
    tenantSlug: string | null;
    statusRedirectUrl: string;
    initiateLink: InitiateLink;
    navigate: (path: string) => void;
    schemeId?: string;
    session?: Omit<CustomerPaymentSession, "startedAt">;
  },
) {
  const session =
    options.session ?? pollSessionFromInitResponse(response, options.schemeId);
  if (session) saveCustomerPaymentSession(session);

  let target = String(
    response.paymentUrl ?? response.redirectUrl ?? response.gatewayUrl ?? "",
  );
  const explicitToken = typeof response.token === "string" ? response.token : null;
  const linkToken = explicitToken ?? extractPaymentLinkToken(target);

  if (linkToken && !target.startsWith("http")) {
    const initiated = await options.initiateLink(linkToken);
    target = String(initiated.gatewayUrl ?? initiated.redirectUrl ?? "");
  }

  if (target.startsWith("http://") || target.startsWith("https://")) {
    if (isMockGatewayTarget(target, explicitToken ?? linkToken)) {
      options.navigate(sameOriginCustomerPath(options.statusRedirectUrl));
      return;
    }
    window.location.assign(target);
    return;
  }

  if (target.startsWith("/customer/")) {
    options.navigate(target);
    return;
  }

  if (target.startsWith("/pay/")) {
    const token = extractPaymentLinkToken(target);
    if (token) {
      options.navigate(customerPath(options.tenantSlug, "pay", token));
      return;
    }
  }

  if (target.startsWith("/")) {
    options.navigate(target);
    return;
  }

  options.navigate(sameOriginCustomerPath(options.statusRedirectUrl));
}
