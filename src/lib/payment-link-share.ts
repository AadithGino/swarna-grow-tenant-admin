import { toast } from "sonner";

export function paymentLinkHref(url: string): string {
  if (url.startsWith("http")) return url;
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}${url.startsWith("/") ? url : `/${url}`}`;
}

/** Share or copy a payment link URL (no WhatsApp auto-send). */
export async function shareOrCopyPaymentLink(link: {
  url: string;
  expiresAt?: string;
}): Promise<void> {
  const href = paymentLinkHref(link.url);
  const suffix = link.expiresAt ? ` · expires ${link.expiresAt}` : "";
  try {
    if (typeof navigator !== "undefined" && navigator.share) {
      await navigator.share({ title: "SwarnaGrow payment link", url: href });
      toast.success(`Payment link ready${suffix}`);
      return;
    }
    await navigator.clipboard.writeText(href);
    toast.success(`Payment link copied${suffix}`, {
      description: "Share with the customer to pay online.",
    });
  } catch (err) {
    if ((err as { name?: string })?.name === "AbortError") return;
    toast.success("Payment link created", { description: href });
  }
}
