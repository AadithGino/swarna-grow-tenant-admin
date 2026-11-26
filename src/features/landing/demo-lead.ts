import { env } from "@/src/config/env";
import { newIdempotencyKey } from "@/src/lib/idempotency";
import { CUSTOMER_RANGES, SETUP_FEE } from "./landing-config";
import type { LandingLogo } from "./landing-context";

export type DemoLead = {
  submittedAt: string;
  source: string;
  name: string;
  showroom: string;
  brandName: string;
  location: string;
  logoFileName: string;
  logoDataUrl: string;
  phone: string;
  customers: string;
  planTag: string;
  planPrice: string;
  setupFee: string;
  dataFormat: string;
  whatsappOptIn: boolean;
  notes: string;
  pageUrl: string;
};

export function validPhone(digits: string): boolean {
  return /^[6-9]\d{9}$/.test(digits);
}

/** Accepts pasted numbers like "+91 98765 43210" or "098765 43210" and keeps the 10 digits. */
export function cleanPhoneDigits(raw: string): string {
  let digits = String(raw || "").replace(/\D/g, "");
  if (digits.length > 10) {
    if (digits.startsWith("91") && digits.length >= 12) digits = digits.slice(2);
    else if (digits.startsWith("0") && digits.length === 11) digits = digits.slice(1);
    else digits = digits.slice(-10);
  }
  return digits.slice(0, 10);
}

/** Same field names the static site sent, so the Google Sheet script keeps working. */
export function buildDemoLead(input: {
  brand: string;
  phoneDigits: string;
  location: string;
  customers: string;
  logo: LandingLogo | null;
}): DemoLead {
  const plan = CUSTOMER_RANGES.find((r) => r.value === input.customers);
  const brand = input.brand.trim();
  return {
    submittedAt: new Date().toISOString(),
    source: "landing-page-free-demo",
    name: "",
    showroom: brand,
    brandName: brand,
    location: input.location.trim(),
    logoFileName: input.logo?.name ?? "",
    logoDataUrl: input.logo?.dataUrl ?? "",
    phone: `+91${input.phoneDigits}`,
    customers: input.customers,
    planTag: plan?.tag ?? "",
    planPrice: plan?.price ?? "",
    setupFee: plan ? SETUP_FEE : "",
    dataFormat: "",
    whatsappOptIn: true,
    notes: "",
    pageUrl: window.location.href,
  };
}

/** Pixel Lead event. Call only after the lead was saved, so failed submits are not counted. */
export function trackLandingLeadPixel(): void {
  if (typeof window === "undefined" || typeof window.fbq !== "function") return;
  window.fbq("track", "Lead", { content_name: "landing-free-demo" });
}

/** Persists the lead in Mongo for the platform console (`/platform/demos/requests`). */
export async function sendDemoLead(lead: DemoLead): Promise<void> {
  const res = await fetch(`${env.apiBaseUrl}/public/landing-demo-requests`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-Idempotency-Key": newIdempotencyKey(),
    },
    body: JSON.stringify(lead),
  });
  if (!res.ok) {
    let message = "Submit failed";
    try {
      const body = (await res.json()) as { message?: string; error?: { message?: string } };
      message = body.message ?? body.error?.message ?? message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }
}
