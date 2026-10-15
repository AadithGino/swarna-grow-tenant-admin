import { money } from "@/src/lib/format";

export function schemeGoldRateNotificationPreview(params: {
  ratePerGram: number;
  effectiveDateYmd: string;
  scheduled?: boolean;
}) {
  const rateDisplay = money(params.ratePerGram);
  const dateLabel = new Date(`${params.effectiveDateYmd}T12:00:00`).toLocaleDateString(
    "en-IN",
    { day: "numeric", month: "short", year: "numeric" },
  );
  return {
    purpose: "Scheme gold rate (22K)",
    title: "22K scheme gold rate updated",
    body: `Scheme gold rate: ${rateDisplay}/g for 22K gold, effective ${dateLabel}. View your scheme.`,
    scheduleNote: params.scheduled
      ? `Scheduled to send when the rate becomes effective (${dateLabel}, business date).`
      : "Will send after the rate is saved.",
  };
}

export function ecommerceGoldRateNotificationPreview(params: {
  purity: string;
  ratePerGramRupee: number;
  effectiveAtLocal: string;
  timezoneLabel: string;
  scheduled?: boolean;
}) {
  const rateDisplay = money(params.ratePerGramRupee);
  const effectiveLabel = params.effectiveAtLocal
    ? new Date(params.effectiveAtLocal).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "—";
  return {
    purpose: `Shop gold rate (${params.purity})`,
    title: `${params.purity} shop gold rate updated`,
    body: `Shop gold rate: ${rateDisplay}/g for ${params.purity} gold. Making charges and applicable taxes are calculated separately.`,
    scheduleNote: params.scheduled
      ? `Scheduled to send no earlier than ${effectiveLabel} (${params.timezoneLabel}).`
      : `Will send after publish (${params.timezoneLabel}).`,
  };
}

export function describeRateNotificationResult(promo: Record<string, unknown> | undefined) {
  if (!promo) return null;
  if (promo.skipped === true && promo.reason) {
    return { type: "skipped" as const, message: String(promo.reason) };
  }
  if (promo.enqueued === true || promo.queued === true) {
    return { type: "queued" as const };
  }
  if (promo.intentPersisted === true && promo.enqueueError) {
    return { type: "pending" as const };
  }
  if (promo.scheduled === true) {
    return { type: "scheduled" as const };
  }
  if (promo.intentPersisted === true) {
    return { type: "intent" as const };
  }
  return null;
}
