import {
  datetimeLocalValueToUtcIso,
  resolveScheduleFieldForSave,
  utcIsoToDatetimeLocalValue,
} from "@/src/lib/datetime-local";

export type StoneLineInput = { name: string; chargeRupee: string };

export type ProductFormInput = {
  name: string;
  slug: string;
  sku: string;
  description: string;
  categoryId: string;
  priceMode: "FIXED" | "GOLD_RATE_BASED";
  taxClassification: string;
  imageUploadIds: string[];
  featured: boolean;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  baseRupee: string;
  saleRupee: string;
  saleStartsAt: string;
  saleEndsAt: string;
  purity: string;
  weightGrams: string;
  makingChargeMode: "FIXED_PAISE" | "PER_GRAM_PAISE" | "PERCENT_OF_GOLD";
  makingFixedRupee: string;
  makingPerGramRupee: string;
  makingPercentBps: string;
  stones: StoneLineInput[];
  otherChargesRupee: string;
  offerType: "" | "FIXED_PAISE_OFF" | "PERCENT_OFF";
  offerValueRupee: string;
  offerPercentBps: string;
  offerStartsAt: string;
  offerEndsAt: string;
};

export function rupeesToPaise(input: string): number | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

export type ProductFormScheduleOrigins = {
  saleStartsAtIso?: string | null;
  saleEndsAtIso?: string | null;
  offerStartsAtIso?: string | null;
  offerEndsAtIso?: string | null;
  /** Stored sale price when editing; used to send explicit null when cleared. */
  salePricePaiseOrigin?: number | null;
};

export function buildEcommerceProductBody(
  form: ProductFormInput,
  scheduleOrigins: ProductFormScheduleOrigins = {},
): Record<string, unknown> {
  const body: Record<string, unknown> = {
    name: form.name.trim(),
    slug: form.slug.trim() || undefined,
    sku: form.sku.trim() || undefined,
    description: form.description.trim() || undefined,
    categoryId: form.categoryId || null,
    priceMode: form.priceMode,
    taxClassification: form.taxClassification || undefined,
    imageUploadIds: form.imageUploadIds,
    featured: form.featured,
    // Create always lands as DRAFT on the server; omit status on patch unless still draft.
    ...(form.status === "DRAFT" ? { status: "DRAFT" as const } : {}),
  };
  if (form.priceMode === "FIXED") {
    const basePricePaise = rupeesToPaise(form.baseRupee);
    if (basePricePaise == null) {
      throw new Error("Enter a valid fixed base price in rupees.");
    }
    const fixedPricing: Record<string, unknown> = { basePricePaise };
    const salePricePaise = rupeesToPaise(form.saleRupee);
    if (salePricePaise != null) {
      fixedPricing.salePricePaise = salePricePaise;
    } else if (scheduleOrigins.salePricePaiseOrigin != null) {
      fixedPricing.salePricePaise = null;
    }
    const saleStartsResolved = resolveScheduleFieldForSave(
      form.saleStartsAt,
      scheduleOrigins.saleStartsAtIso,
    );
    if (saleStartsResolved !== undefined) fixedPricing.saleStartsAt = saleStartsResolved;
    const saleEndsResolved = resolveScheduleFieldForSave(
      form.saleEndsAt,
      scheduleOrigins.saleEndsAtIso,
    );
    if (saleEndsResolved !== undefined) fixedPricing.saleEndsAt = saleEndsResolved;
    body.fixedPricing = fixedPricing;
    body.offer = null;
  } else {
    const grams = Number(form.weightGrams);
    if (!Number.isFinite(grams) || grams <= 0) {
      throw new Error("Enter gold weight in grams.");
    }
    body.purity = form.purity;
    body.goldWeightMg = Math.round(grams * 1000);
    body.makingChargeMode = form.makingChargeMode;
    const makingCharge: Record<string, number> = {};
    if (form.makingChargeMode === "FIXED_PAISE") {
      makingCharge.fixedPaise = rupeesToPaise(form.makingFixedRupee) ?? 0;
    } else if (form.makingChargeMode === "PER_GRAM_PAISE") {
      const perGram = rupeesToPaise(form.makingPerGramRupee);
      if (perGram == null) throw new Error("Enter making charge per gram.");
      makingCharge.perGramPaise = perGram;
    } else {
      const bps = Number(form.makingPercentBps);
      if (!Number.isFinite(bps) || bps < 0) throw new Error("Enter making percent (bps).");
      makingCharge.percentBps = Math.round(bps);
    }
    body.makingCharge = makingCharge;
    body.stones = form.stones
      .filter((row) => row.chargeRupee.trim())
      .map((row) => {
        const chargePaise = rupeesToPaise(row.chargeRupee);
        if (chargePaise == null) throw new Error("Invalid stone charge.");
        return { name: row.name.trim() || undefined, chargePaise };
      });
    const otherPaise = rupeesToPaise(form.otherChargesRupee);
    if (otherPaise != null) body.otherChargesPaise = otherPaise;
    if (form.offerType) {
      const offer: Record<string, unknown> = { type: form.offerType };
      if (form.offerType === "FIXED_PAISE_OFF") {
        const off = rupeesToPaise(form.offerValueRupee);
        if (off == null) throw new Error("Enter offer amount.");
        offer.valuePaise = off;
      } else {
        const bps = Number(form.offerPercentBps);
        if (!Number.isFinite(bps) || bps < 0) throw new Error("Enter offer percent (bps).");
        offer.percentBps = Math.round(bps);
      }
      const offerStartsResolved = resolveScheduleFieldForSave(
        form.offerStartsAt,
        scheduleOrigins.offerStartsAtIso,
      );
      if (offerStartsResolved !== undefined) offer.startsAt = offerStartsResolved;
      const offerEndsResolved = resolveScheduleFieldForSave(
        form.offerEndsAt,
        scheduleOrigins.offerEndsAtIso,
      );
      if (offerEndsResolved !== undefined) offer.endsAt = offerEndsResolved;
      body.offer = offer;
    } else {
      body.offer = null;
    }
  }
  return body;
}

export function saveActionLabel(status: ProductFormInput["status"]): string {
  if (status === "PUBLISHED") return "Save changes";
  return "Save draft";
}

function paiseToRupeeString(paise?: number | null): string {
  if (paise == null) return "";
  return String(paise / 100);
}

export function productScheduleOriginsFromRow(
  product: Record<string, unknown> | null | undefined,
): ProductFormScheduleOrigins {
  const fixed = (product?.fixedPricing ?? {}) as Record<string, unknown>;
  const offer = (product?.offer ?? null) as Record<string, unknown> | null;
  return {
    saleStartsAtIso: (fixed.saleStartsAt as string) ?? null,
    saleEndsAtIso: (fixed.saleEndsAt as string) ?? null,
    offerStartsAtIso: (offer?.startsAt as string) ?? null,
    offerEndsAtIso: (offer?.endsAt as string) ?? null,
    salePricePaiseOrigin: (fixed.salePricePaise as number) ?? null,
  };
}

export function productRowToFormInput(
  product: Record<string, unknown> | null | undefined,
  defaultTax: string,
): ProductFormInput {
  const fixed = (product?.fixedPricing ?? {}) as Record<string, unknown>;
  const making = (product?.makingCharge ?? {}) as Record<string, unknown>;
  const offer = (product?.offer ?? null) as Record<string, unknown> | null;
  const stones = Array.isArray(product?.stones)
    ? (product.stones as Array<{ name?: string; chargePaise?: number }>).map((row) => ({
        name: row.name ?? "",
        chargeRupee: paiseToRupeeString(row.chargePaise),
      }))
    : [{ name: "", chargeRupee: "" }];
  return {
    name: String(product?.name ?? ""),
    slug: String(product?.slug ?? ""),
    sku: String(product?.sku ?? ""),
    description: String(product?.description ?? ""),
    categoryId: String(product?.categoryId ?? ""),
    priceMode: (product?.priceMode as ProductFormInput["priceMode"]) ?? "FIXED",
    taxClassification: String(product?.taxClassification ?? defaultTax ?? ""),
    imageUploadIds: (product?.imageUploadIds as string[]) ?? [],
    featured: product?.featured === true,
    status: (product?.status as ProductFormInput["status"]) ?? "DRAFT",
    baseRupee: paiseToRupeeString(fixed.basePricePaise as number),
    saleRupee: paiseToRupeeString(fixed.salePricePaise as number),
    saleStartsAt: utcIsoToDatetimeLocalValue(fixed.saleStartsAt as string | undefined),
    saleEndsAt: utcIsoToDatetimeLocalValue(fixed.saleEndsAt as string | undefined),
    purity: String(product?.purity ?? "22K"),
    weightGrams:
      product?.goldWeightMg != null ? String(Number(product.goldWeightMg) / 1000) : "",
    makingChargeMode:
      (product?.makingChargeMode as ProductFormInput["makingChargeMode"]) ?? "FIXED_PAISE",
    makingFixedRupee: paiseToRupeeString(making.fixedPaise as number),
    makingPerGramRupee: paiseToRupeeString(making.perGramPaise as number),
    makingPercentBps:
      making.percentBps != null ? String(making.percentBps) : "",
    stones: stones.length ? stones : [{ name: "", chargeRupee: "" }],
    otherChargesRupee: paiseToRupeeString(product?.otherChargesPaise as number),
    offerType: (offer?.type as ProductFormInput["offerType"]) ?? "",
    offerValueRupee: paiseToRupeeString(offer?.valuePaise as number),
    offerPercentBps: offer?.percentBps != null ? String(offer.percentBps) : "",
    offerStartsAt: utcIsoToDatetimeLocalValue(offer?.startsAt as string | undefined),
    offerEndsAt: utcIsoToDatetimeLocalValue(offer?.endsAt as string | undefined),
  };
}
