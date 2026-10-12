/** Mirrors backend `normalizePincodes` + `deriveDeliveryConfigured`. */
const PINCODE_RE = /^\d{6}$/;

export function parseServiceablePincodes(text: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of text.split(/[\s,]+/)) {
    const pin = raw.trim();
    if (!PINCODE_RE.test(pin) || seen.has(pin)) continue;
    seen.add(pin);
    out.push(pin);
  }
  return out;
}

export function isDeliveryConfigured(
  pincodesText: string,
  deliveryChargePaise: number | null,
): boolean {
  const pincodes = parseServiceablePincodes(pincodesText);
  return (
    pincodes.length > 0
    && deliveryChargePaise != null
    && Number.isInteger(deliveryChargePaise)
    && deliveryChargePaise >= 0
  );
}

export function deliveryConfigIssues(
  pincodesText: string,
  deliveryChargeRupees: string,
  deliveryChargePaise: number | null,
): string[] {
  const issues: string[] = [];
  const pincodes = parseServiceablePincodes(pincodesText);
  const rawPins = pincodesText
    .split(/[\s,]+/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (rawPins.length && pincodes.length === 0) {
    issues.push("Add at least one valid 6-digit serviceable pincode.");
  } else if (!pincodes.length) {
    issues.push("Enter at least one serviceable pincode (6 digits).");
  }
  const chargeTrimmed = deliveryChargeRupees.trim();
  if (!chargeTrimmed) {
    issues.push("Enter delivery charge in ₹ (use 0 for free delivery).");
  } else if (deliveryChargePaise == null) {
    issues.push("Delivery charge must be a valid amount (0 or more).");
  }
  return issues;
}
