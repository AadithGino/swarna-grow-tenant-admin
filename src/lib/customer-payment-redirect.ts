import { customerPath } from "@/src/lib/customer-tenant";

export function extractPaymentLinkToken(pathOrUrl: string): string | null {
  const trimmed = pathOrUrl.trim();
  if (!trimmed) return null;
  const withoutQuery = trimmed.split("?")[0] ?? trimmed;
  const match = withoutQuery.match(/(?:^|\/)pay\/([^/]+)$/);
  return match?.[1] ?? null;
}

type InitiateLink = (linkToken: string) => Promise<{ gatewayUrl?: string; redirectUrl?: string }>;

/** Opens PhonePe or navigates to a customer-scoped return/status route. */
export async function openCustomerPaymentTarget(
  response: Record<string, unknown>,
  options: {
    tenantSlug: string | null;
    statusRedirectUrl: string;
    initiateLink: InitiateLink;
    navigate: (path: string) => void;
  },
) {
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

  options.navigate(options.statusRedirectUrl);
}
