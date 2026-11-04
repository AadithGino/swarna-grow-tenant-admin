/**
 * Demo data for the online store and Digital Gold & Silver screens (mock mode only).
 * `commerceDemoMock` is consulted by the admin mock server before its own switch;
 * returning `undefined` falls through to the older handlers.
 */
import { demoUploadUrl } from "./commerce-demo-images";

const inr = (paise: number, digits = 0) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(paise / 100);

const money = (paise: number) => ({ amountPaise: paise, amountDisplay: inr(paise) });

const NOW = new Date("2026-10-25T10:30:00+05:30").getTime();
const daysAgo = (d: number, h = 0) => new Date(NOW - d * 86_400_000 - h * 3_600_000).toISOString();
const inDays = (d: number, h = 0) => new Date(NOW + d * 86_400_000 + h * 3_600_000).toISOString();

/* ───────────────────────── Online store ───────────────────────── */

export const DEMO_GOLD_RATES_PAISE: Record<string, number> = {
  "24K": 778_500,
  "22K": 713_600,
  "18K": 583_900,
};

export const demoCategories = [
  { id: "ecat_rings", name: "Rings", slug: "rings", description: "Solitaires, bands and everyday rings", imageUploadId: "demo_ring_1", active: true, displayOrder: 1, version: 3, productCount: 4 },
  { id: "ecat_necklaces", name: "Necklaces", slug: "necklaces", description: "Temple, antique and light-weight necklaces", imageUploadId: "demo_necklace_0", active: true, displayOrder: 2, version: 2, productCount: 3 },
  { id: "ecat_bangles", name: "Bangles", slug: "bangles", description: "Kerala kada, plain and stone bangles", imageUploadId: "demo_bangle_4", active: true, displayOrder: 3, version: 1, productCount: 2 },
  { id: "ecat_earrings", name: "Earrings", slug: "earrings", description: "Jhumkas, studs and drops", imageUploadId: "demo_earrings_2", active: true, displayOrder: 4, version: 1, productCount: 2 },
  { id: "ecat_coins", name: "Coins & bars", slug: "coins", description: "24K 999.9 hallmarked coins", imageUploadId: "demo_coin_0", active: true, displayOrder: 5, version: 4, productCount: 2 },
  { id: "ecat_kids", name: "Kids", slug: "kids", description: "Light chains and baby bangles", imageUploadId: "demo_chain_5", active: false, displayOrder: 6, version: 1, productCount: 0 },
];

type DemoProductSeed = {
  id: string;
  name: string;
  sku: string;
  categoryId: string;
  art: string;
  tone: number;
  status: "PUBLISHED" | "DRAFT" | "ARCHIVED";
  featured?: boolean;
  priceMode: "GOLD_RATE_BASED" | "FIXED";
  purity?: "22K" | "18K" | "24K";
  weightMg?: number;
  makingPercentBps?: number;
  stonesPaise?: number;
  fixedPaise?: number;
  offerPercentBps?: number;
  stock?: { policy: "QUANTITY_TRACKED" | "MADE_TO_ORDER"; onHand?: number; reserved?: number };
  description: string;
  createdDaysAgo: number;
};

const productSeeds: DemoProductSeed[] = [
  { id: "eprd_lakshmi_necklace", name: "Lakshmi temple necklace", sku: "NK-TMP-2241", categoryId: "ecat_necklaces", art: "necklace", tone: 0, status: "PUBLISHED", featured: true, priceMode: "GOLD_RATE_BASED", purity: "22K", weightMg: 32_450, makingPercentBps: 1200, stonesPaise: 450_000, stock: { policy: "MADE_TO_ORDER" }, description: "Hand-finished temple work with Lakshmi motif and ruby drops.", createdDaysAgo: 40 },
  { id: "eprd_solitaire_ring", name: "Mayil solitaire ring", sku: "RG-SOL-1180", categoryId: "ecat_rings", art: "ring", tone: 1, status: "PUBLISHED", featured: true, priceMode: "GOLD_RATE_BASED", purity: "18K", weightMg: 3_820, makingPercentBps: 1500, stonesPaise: 2_850_000, stock: { policy: "QUANTITY_TRACKED", onHand: 6, reserved: 1 }, description: "0.30 ct lab-grown solitaire in a peacock-inspired setting.", createdDaysAgo: 22 },
  { id: "eprd_kerala_kada", name: "Kerala kada bangle pair", sku: "BG-KDA-0902", categoryId: "ecat_bangles", art: "bangle", tone: 4, status: "PUBLISHED", priceMode: "GOLD_RATE_BASED", purity: "22K", weightMg: 24_100, makingPercentBps: 800, stock: { policy: "QUANTITY_TRACKED", onHand: 3, reserved: 0 }, description: "Traditional broad kada with matte and polish finish.", createdDaysAgo: 35 },
  { id: "eprd_emerald_jhumka", name: "Emerald drop jhumkas", sku: "ER-JHM-0417", categoryId: "ecat_earrings", art: "earrings", tone: 2, status: "PUBLISHED", featured: true, priceMode: "GOLD_RATE_BASED", purity: "22K", weightMg: 8_760, makingPercentBps: 1400, stonesPaise: 320_000, offerPercentBps: 2500, stock: { policy: "QUANTITY_TRACKED", onHand: 2, reserved: 2 }, description: "Lightweight jhumkas with emerald-green drops.", createdDaysAgo: 18 },
  { id: "eprd_coin_10g", name: "24K gold coin · 10 g", sku: "CN-24K-10G", categoryId: "ecat_coins", art: "coin", tone: 4, status: "PUBLISHED", priceMode: "GOLD_RATE_BASED", purity: "24K", weightMg: 10_000, makingPercentBps: 350, stock: { policy: "QUANTITY_TRACKED", onHand: 24, reserved: 3 }, description: "BIS hallmarked 999.9 coin in tamper-proof pack.", createdDaysAgo: 60 },
  { id: "eprd_coin_2g", name: "24K gold coin · 2 g", sku: "CN-24K-02G", categoryId: "ecat_coins", art: "coin", tone: 0, status: "PUBLISHED", priceMode: "GOLD_RATE_BASED", purity: "24K", weightMg: 2_000, makingPercentBps: 500, stock: { policy: "QUANTITY_TRACKED", onHand: 0, reserved: 0 }, description: "Gift-ready 2 g coin with Lakshmi imprint.", createdDaysAgo: 60 },
  { id: "eprd_heart_pendant", name: "Ruby heart pendant", sku: "PD-HRT-0330", categoryId: "ecat_necklaces", art: "pendant", tone: 1, status: "PUBLISHED", priceMode: "FIXED", fixedPaise: 2_449_900, stock: { policy: "QUANTITY_TRACKED", onHand: 8, reserved: 0 }, description: "18K pendant with a heart-cut ruby. Chain sold separately.", createdDaysAgo: 12 },
  { id: "eprd_daily_band", name: "Everyday twist band", sku: "RG-BND-0118", categoryId: "ecat_rings", art: "ring", tone: 5, status: "PUBLISHED", priceMode: "GOLD_RATE_BASED", purity: "22K", weightMg: 2_940, makingPercentBps: 1000, stock: { policy: "MADE_TO_ORDER" }, description: "Comfort-fit twisted band for daily wear.", createdDaysAgo: 9 },
  { id: "eprd_box_chain", name: "Box chain · 20 in", sku: "CH-BOX-2020", categoryId: "ecat_necklaces", art: "chain", tone: 3, status: "DRAFT", priceMode: "GOLD_RATE_BASED", purity: "22K", weightMg: 7_800, makingPercentBps: 900, stock: { policy: "QUANTITY_TRACKED", onHand: 5, reserved: 0 }, description: "Sturdy box-link chain, lobster clasp.", createdDaysAgo: 3 },
  { id: "eprd_navaratna_ring", name: "Navaratna cocktail ring", sku: "RG-NAV-0721", categoryId: "ecat_rings", art: "ring", tone: 3, status: "DRAFT", priceMode: "GOLD_RATE_BASED", purity: "22K", weightMg: 6_250, makingPercentBps: 1600, stonesPaise: 680_000, stock: { policy: "MADE_TO_ORDER" }, description: "Nine-stone ring set in traditional style.", createdDaysAgo: 2 },
  { id: "eprd_baby_bangle", name: "Baby bangles (pair)", sku: "BG-BBY-0050", categoryId: "ecat_bangles", art: "bangle", tone: 2, status: "ARCHIVED", priceMode: "GOLD_RATE_BASED", purity: "22K", weightMg: 6_000, makingPercentBps: 900, stock: { policy: "MADE_TO_ORDER" }, description: "Lightweight bangles for little wrists.", createdDaysAgo: 120 },
  { id: "eprd_stud_earrings", name: "Diamond-cut studs", sku: "ER-STD-0144", categoryId: "ecat_earrings", art: "earrings", tone: 5, status: "PUBLISHED", priceMode: "FIXED", fixedPaise: 1_189_000, stock: { policy: "QUANTITY_TRACKED", onHand: 1, reserved: 0 }, description: "Everyday studs with a diamond-cut finish.", createdDaysAgo: 27 },
];

function demoPricing(seed: DemoProductSeed) {
  const taxRate = 300; // 3% GST
  if (seed.priceMode === "FIXED") {
    const total = seed.fixedPaise ?? 0;
    const preTax = Math.round(total / 1.03);
    return {
      computable: true,
      priceMode: "FIXED",
      blockers: [],
      displayTotal: money(total),
      preTaxSubtotal: money(preTax),
      tax: { total: money(total - preTax), lines: [{ label: "GST", rateBps: taxRate, tax: money(total - preTax) }] },
      contract: { fixedPriceAllInclusive: true, fixedPriceNote: "Fixed price includes GST." },
    };
  }
  const rate = DEMO_GOLD_RATES_PAISE[seed.purity ?? "22K"];
  const gold = Math.round((rate * (seed.weightMg ?? 0)) / 1000);
  const makingBefore = Math.round((gold * (seed.makingPercentBps ?? 0)) / 10_000);
  const offer = seed.offerPercentBps ? Math.round((makingBefore * seed.offerPercentBps) / 10_000) : 0;
  const making = makingBefore - offer;
  const stones = seed.stonesPaise ?? 0;
  const preTax = gold + making + stones;
  const tax = Math.round((preTax * taxRate) / 10_000);
  return {
    computable: true,
    priceMode: "GOLD_RATE_BASED",
    blockers: [],
    gold: {
      weightMg: seed.weightMg,
      purity: seed.purity,
      ratePerGram: money(rate),
      effectiveAt: daysAgo(0, 2),
      goldValue: money(gold),
    },
    making: { beforeOffer: money(makingBefore), offerDiscount: money(offer), afterOffer: money(making) },
    stones: money(stones),
    otherCharges: money(0),
    preTaxSubtotal: money(preTax),
    tax: { total: money(tax), settingsVersion: 3, lines: [{ label: "GST", rateBps: taxRate, tax: money(tax) }] },
    displayTotal: money(preTax + tax),
    contract: {
      offerPolicyNote: offer ? "Making-charge offer applied till 31 Oct." : undefined,
      taxEstimateDisclaimer: "Tax is an estimate; the invoice shows the final amount.",
    },
  };
}

export function demoProduct(seed: DemoProductSeed, includePricing = true) {
  return {
    id: seed.id,
    name: seed.name,
    slug: seed.id.replace("eprd_", "").replace(/_/g, "-"),
    sku: seed.sku,
    description: seed.description,
    categoryId: seed.categoryId,
    categoryName: demoCategories.find((c) => c.id === seed.categoryId)?.name,
    status: seed.status,
    featured: seed.featured === true,
    priceMode: seed.priceMode,
    purity: seed.purity ?? null,
    goldWeightMg: seed.weightMg ?? null,
    makingChargeMode: seed.priceMode === "GOLD_RATE_BASED" ? "PERCENT_OF_GOLD" : undefined,
    makingCharge: seed.makingPercentBps ? { percentBps: seed.makingPercentBps } : undefined,
    stones: seed.stonesPaise ? [{ name: "Stones", chargePaise: seed.stonesPaise }] : [],
    offer: seed.offerPercentBps ? { type: "PERCENT_OFF", percentBps: seed.offerPercentBps, endsAt: inDays(6) } : null,
    fixedPricing: seed.fixedPaise ? { basePricePaise: seed.fixedPaise } : undefined,
    taxClassification: "JEWELLERY_GOLD",
    imageUploadIds: [`demo_${seed.art}_${seed.tone}`, `demo_${seed.art}_${(seed.tone + 2) % 6}`],
    stockPolicy: seed.stock?.policy ?? "MADE_TO_ORDER",
    availableQuantity:
      seed.stock?.policy === "QUANTITY_TRACKED" ? Math.max(0, (seed.stock.onHand ?? 0) - (seed.stock.reserved ?? 0)) : null,
    version: 3,
    createdAt: daysAgo(seed.createdDaysAgo),
    updatedAt: daysAgo(Math.min(seed.createdDaysAgo, 1)),
    ...(includePricing ? { pricing: demoPricing(seed) } : {}),
  };
}

export const demoProducts = productSeeds.map((s) => demoProduct(s));

export function demoInventoryRows() {
  return productSeeds
    .filter((s) => s.status !== "ARCHIVED")
    .map((s) => ({
      productId: s.id,
      productName: s.name,
      sku: s.sku,
      status: s.status,
      imageUploadId: `demo_${s.art}_${s.tone}`,
      stockPolicy: s.stock?.policy ?? "MADE_TO_ORDER",
      quantityOnHand: s.stock?.policy === "QUANTITY_TRACKED" ? s.stock.onHand ?? 0 : null,
      reservedQuantity: s.stock?.policy === "QUANTITY_TRACKED" ? s.stock.reserved ?? 0 : null,
      availableQuantity:
        s.stock?.policy === "QUANTITY_TRACKED" ? Math.max(0, (s.stock.onHand ?? 0) - (s.stock.reserved ?? 0)) : null,
      version: 2,
      updatedAt: daysAgo(1),
    }));
}

export const demoBanners = [
  { id: "ebnr_festive", name: "Diwali festive edit", title: "Festive gold edit", subtitle: "Making charges from 6% till 31 Oct", placement: "BOTH", destinationType: "CATEGORY", targetCategoryId: "ecat_necklaces", targetProductId: null, imageUploadId: "demo_banner-festive", status: "PUBLISHED", active: true, startsAt: daysAgo(6), endsAt: inDays(6), displayOrder: 1, version: 4 },
  { id: "ebnr_coins", name: "Dhanteras coins", title: "Gold coins & bars", subtitle: "24K 999.9 · BIS hallmarked", placement: "HOME", destinationType: "PRODUCT", targetCategoryId: null, targetProductId: "eprd_coin_10g", imageUploadId: "demo_banner-coins", status: "PUBLISHED", active: true, startsAt: daysAgo(3), endsAt: inDays(4), displayOrder: 2, version: 2 },
  { id: "ebnr_bridal", name: "Bridal season", title: "Bridal collection", subtitle: "Temple & antique sets", placement: "SHOP", destinationType: "CATEGORY", targetCategoryId: "ecat_necklaces", targetProductId: null, imageUploadId: "demo_banner-bridal", status: "DRAFT", active: false, startsAt: inDays(10), endsAt: inDays(60), displayOrder: 3, version: 1 },
];

const demoCustomers = [
  { customerId: "cus_10482", name: "Anjali Nair", maskedMobile: "+91 ••••• •2345", customerNumber: "CUS-10482" },
  { customerId: "cus_10483", name: "Ramesh S", maskedMobile: "+91 ••••• •3456", customerNumber: "CUS-10483" },
  { customerId: "cus_10484", name: "Priya Pillai", maskedMobile: "+91 ••••• •4567", customerNumber: "CUS-10484" },
  { customerId: "cus_10485", name: "Muhammed G", maskedMobile: "+91 ••••• •5678", customerNumber: "CUS-10485" },
  { customerId: "cus_10486", name: "Sreedevi B", maskedMobile: "+91 ••••• •6789", customerNumber: "CUS-10486" },
  { customerId: "cus_10487", name: "Fathima Rahman", maskedMobile: "+91 ••••• •7801", customerNumber: "CUS-10487" },
  { customerId: "cus_10488", name: "Joseph Mathew", maskedMobile: "+91 ••••• •8812", customerNumber: "CUS-10488" },
  { customerId: "cus_10489", name: "Lakshmi Menon", maskedMobile: "+91 ••••• •9023", customerNumber: "CUS-10489" },
];

type OrderSeed = {
  n: number;
  status: string;
  pay: "ONLINE" | "COD";
  cust: number;
  items: [string, number][];
  days: number;
  hours?: number;
  mode: "DELIVERY" | "PICKUP";
  exception?: string;
  codStatus?: string;
};

const orderSeeds: OrderSeed[] = [
  { n: 1048, status: "COD_PENDING_ACCEPTANCE", pay: "COD", cust: 5, items: [["eprd_heart_pendant", 1]], days: 0, hours: 1, mode: "DELIVERY" },
  { n: 1047, status: "PAID", pay: "ONLINE", cust: 0, items: [["eprd_emerald_jhumka", 1], ["eprd_coin_2g", 1]], days: 0, hours: 3, mode: "DELIVERY" },
  { n: 1046, status: "PENDING_PAYMENT", pay: "ONLINE", cust: 6, items: [["eprd_daily_band", 1]], days: 0, hours: 5, mode: "PICKUP" },
  { n: 1045, status: "PROCESSING", pay: "ONLINE", cust: 7, items: [["eprd_lakshmi_necklace", 1]], days: 1, mode: "PICKUP" },
  { n: 1044, status: "PAID", pay: "ONLINE", cust: 2, items: [["eprd_coin_10g", 2]], days: 1, hours: 4, mode: "DELIVERY", exception: "AMOUNT_MISMATCH" },
  { n: 1043, status: "READY_FOR_PICKUP", pay: "ONLINE", cust: 1, items: [["eprd_kerala_kada", 1]], days: 2, mode: "PICKUP" },
  { n: 1042, status: "SHIPPED", pay: "COD", cust: 3, items: [["eprd_stud_earrings", 1]], days: 3, mode: "DELIVERY", codStatus: "PENDING" },
  { n: 1041, status: "SHIPPED", pay: "ONLINE", cust: 4, items: [["eprd_solitaire_ring", 1]], days: 4, mode: "DELIVERY" },
  { n: 1040, status: "DELIVERED", pay: "ONLINE", cust: 0, items: [["eprd_coin_10g", 1]], days: 6, mode: "DELIVERY" },
  { n: 1039, status: "DELIVERED", pay: "COD", cust: 5, items: [["eprd_heart_pendant", 1], ["eprd_daily_band", 1]], days: 8, mode: "DELIVERY", codStatus: "CONFIRMED" },
  { n: 1038, status: "CANCELLED", pay: "ONLINE", cust: 6, items: [["eprd_navaratna_ring", 1]], days: 9, mode: "PICKUP" },
  { n: 1037, status: "DELIVERED", pay: "ONLINE", cust: 7, items: [["eprd_emerald_jhumka", 1]], days: 11, mode: "PICKUP" },
  { n: 1036, status: "DELIVERED", pay: "ONLINE", cust: 2, items: [["eprd_kerala_kada", 1]], days: 14, mode: "DELIVERY" },
  { n: 1035, status: "PAYMENT_EXPIRED", pay: "ONLINE", cust: 3, items: [["eprd_coin_2g", 3]], days: 15, mode: "DELIVERY" },
  { n: 1034, status: "DELIVERED", pay: "ONLINE", cust: 1, items: [["eprd_lakshmi_necklace", 1]], days: 19, mode: "PICKUP" },
  { n: 1033, status: "DELIVERED", pay: "COD", cust: 4, items: [["eprd_stud_earrings", 2]], days: 22, mode: "DELIVERY", codStatus: "CONFIRMED" },
];

const STATUS_LABELS: Record<string, string> = {
  COD_PENDING_ACCEPTANCE: "Accept or decline this COD order",
  PENDING_PAYMENT: "Waiting for the customer to pay",
  PAID: "Paid — ready to process",
  PROCESSING: "Being prepared",
  READY_FOR_PICKUP: "Ready at the branch",
  SHIPPED: "With the courier",
  DELIVERED: "Handed over",
  CANCELLED: "Cancelled before dispatch",
  PAYMENT_EXPIRED: "Payment window closed",
};

function productPrice(id: string) {
  const p = demoProducts.find((x) => x.id === id);
  return (p?.pricing as { displayTotal?: { amountPaise: number } } | undefined)?.displayTotal?.amountPaise ?? 0;
}

export function demoOrder(seed: OrderSeed) {
  const lines = seed.items.map(([pid, qty]) => {
    const p = demoProducts.find((x) => x.id === pid);
    const unit = productPrice(pid);
    return {
      productId: pid,
      name: p?.name ?? "Item",
      sku: p?.sku,
      quantity: qty,
      unitPricePaise: unit,
      lineTotalPaise: unit * qty,
      imageUploadId: p?.imageUploadIds?.[0],
      purity: p?.purity,
      goldWeightMg: p?.goldWeightMg,
    };
  });
  const subtotal = lines.reduce((s, l) => s + l.lineTotalPaise, 0);
  const shipping = seed.mode === "DELIVERY" ? 15_000 : 0;
  const tax = Math.round(subtotal - subtotal / 1.03);
  const total = subtotal + shipping;
  const paid = ["PAID", "PROCESSING", "READY_FOR_PICKUP", "SHIPPED", "DELIVERED"].includes(seed.status) && seed.pay === "ONLINE";
  const cust = demoCustomers[seed.cust];
  return {
    id: `eord_${seed.n}`,
    orderNumber: `SG-${seed.n}`,
    status: seed.status,
    statusLabel: STATUS_LABELS[seed.status],
    paymentMethod: seed.pay,
    paymentCompleted: paid,
    paidAt: paid ? daysAgo(seed.days, (seed.hours ?? 0) - 0.2) : null,
    paymentExceptionStatus: seed.exception ?? null,
    fulfilmentMode: seed.mode,
    courierCodCollectionStatus: seed.codStatus ?? null,
    courierCodRemittanceStatus: seed.codStatus === "CONFIRMED" ? "OWED" : null,
    lines,
    subtotalPaise: subtotal,
    taxPaise: tax,
    fulfilmentChargePaise: shipping,
    totalPaise: total,
    createdAt: daysAgo(seed.days, seed.hours ?? 0),
    customerId: cust.customerId,
    customerDisplay: cust,
    version: 2,
  };
}

export const demoOrders = orderSeeds.map(demoOrder);

export function demoOrderDetail(orderId: string) {
  const base = demoOrders.find((o) => o.id === orderId) ?? demoOrders[1];
  const cust = base.customerDisplay;
  return {
    ...base,
    quoteId: `equo_${base.id}`,
    addressSnapshot:
      base.fulfilmentMode === "DELIVERY"
        ? {
            recipientName: cust.name,
            line1: "TC 24/1180, Kowdiar Gardens",
            line2: "Near Kowdiar Palace",
            city: "Thiruvananthapuram",
            state: "Kerala",
            pincode: "695003",
            mobile: cust.maskedMobile,
          }
        : null,
    pickupBranchId: base.fulfilmentMode === "PICKUP" ? "br_kochi" : null,
    pickupBranchName: base.fulfilmentMode === "PICKUP" ? "Kochi Main" : null,
    invoiceAvailable: ["PAID", "PROCESSING", "READY_FOR_PICKUP", "SHIPPED", "DELIVERED"].includes(base.status),
    deliveryTracking:
      base.status === "SHIPPED" || base.status === "DELIVERED"
        ? { carrier: "BlueDart", trackingReference: `BD${base.orderNumber.replace("SG-", "")}8841IN`, dispatchedAt: daysAgo(2) }
        : null,
    financialSnapshot: {},
    returnSummary: { activeRequest: null, recent: [] },
    courierCod:
      base.paymentMethod === "COD"
        ? {
            providerId: "MANUAL",
            trackingReference: base.status === "SHIPPED" ? "BD10428841IN" : null,
            expectedAmountPaise: base.totalPaise,
            collectionStatus: base.courierCodCollectionStatus ?? "PENDING",
            courierIntegrationLive: false,
          }
        : null,
    fulfilmentHandover:
      base.status === "DELIVERED"
        ? { method: base.fulfilmentMode === "PICKUP" ? "BRANCH_PICKUP" : "COURIER", recipientName: cust.name, recordedAt: daysAgo(1) }
        : null,
  };
}

function filterOrders(params: Record<string, unknown>) {
  let rows = [...demoOrders];
  const q = String(params.q ?? "").trim().toLowerCase();
  if (q) {
    rows = rows.filter((o) =>
      [o.orderNumber, o.id, o.customerDisplay?.name, o.customerDisplay?.customerNumber, o.customerId]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }
  if (params.status) rows = rows.filter((o) => o.status === params.status);
  if (params.paymentMethod) rows = rows.filter((o) => o.paymentMethod === params.paymentMethod);
  if (params.needsAction === "true")
    rows = rows.filter((o) => ["COD_PENDING_ACCEPTANCE", "PENDING_PAYMENT"].includes(o.status) || o.paymentExceptionStatus);
  if (params.codPendingAcceptance === "true") rows = rows.filter((o) => o.status === "COD_PENDING_ACCEPTANCE");
  if (params.paymentException === "true") rows = rows.filter((o) => o.paymentExceptionStatus);
  if (params.returnPending === "true") rows = rows.filter(() => false);
  if (params.createdFrom) rows = rows.filter((o) => String(o.createdAt).slice(0, 10) >= String(params.createdFrom));
  if (params.createdTo) rows = rows.filter((o) => String(o.createdAt).slice(0, 10) <= String(params.createdTo));
  return rows;
}

export function demoWorkspaceSummary() {
  const collectedOrders = demoOrders.filter((o) => o.paymentCompleted || o.courierCodCollectionStatus === "CONFIRMED");
  const online = demoOrders.filter((o) => o.paymentCompleted).reduce((s, o) => s + o.totalPaise, 0);
  const cod = demoOrders.filter((o) => o.courierCodCollectionStatus === "CONFIRMED").reduce((s, o) => s + o.totalPaise, 0);
  const gross = online + cod;
  const refunds = 0;
  return {
    period: { from: "2026-10-01", to: "2026-10-25", timezone: "Asia/Kolkata" },
    generatedAt: new Date(NOW).toISOString(),
    placement: {
      ordersPlaced: demoOrders.length,
      onlinePaidOrdersPlacedInPeriod: demoOrders.filter((o) => o.paymentCompleted).length,
      codPendingAcceptancePlacedInPeriod: demoOrders.filter((o) => o.status === "COD_PENDING_ACCEPTANCE").length,
    },
    pipeline: {
      awaitingFulfilment: demoOrders.filter((o) => ["PAID", "PROCESSING"].includes(o.status)).length,
      readyForPickup: demoOrders.filter((o) => o.status === "READY_FOR_PICKUP").length,
      shipped: demoOrders.filter((o) => o.status === "SHIPPED").length,
      delivered: demoOrders.filter((o) => o.status === "DELIVERED").length,
      openCancellationRequests: 0,
      openReturnRequests: 1,
      paymentExceptionsOpen: demoOrders.filter((o) => o.paymentExceptionStatus).length,
    },
    collections: {
      onlineCollected: money(online),
      codCollected: money(cod),
      codCourierCollectionConfirmed: money(cod),
      codBankRemittanceReconciled: money(Math.round(cod * 0.6)),
      grossCollected: money(gross),
      refundOutflow: money(refunds),
      netCollected: money(gross - refunds),
      collectedOrderCount: collectedOrders.length,
      averageCollectedOrderValue: money(Math.round(gross / Math.max(1, collectedOrders.length))),
    },
  };
}

/** Daily net collections for the last 14 days (store overview chart). */
export function demoStoreTrend() {
  return Array.from({ length: 14 }).map((_, i) => {
    const d = 13 - i;
    const day = new Date(NOW - d * 86_400_000);
    const orders = demoOrders.filter((o) => Math.floor((NOW - new Date(o.createdAt).getTime()) / 86_400_000) === d);
    return {
      date: day.toISOString().slice(0, 10),
      orders: orders.length,
      netPaise: orders.filter((o) => o.paymentCompleted || o.courierCodCollectionStatus === "CONFIRMED").reduce((s, o) => s + o.totalPaise, 0),
    };
  });
}

const goldRateHistory = Array.from({ length: 12 }).map((_, i) => {
  const drift = Math.round(Math.sin(i / 2) * 4_200 - i * 600);
  return {
    id: `egr_${i}`,
    purity: "22K",
    ratePerGramPaise: DEMO_GOLD_RATES_PAISE["22K"] + drift,
    ratePerGram: inr(DEMO_GOLD_RATES_PAISE["22K"] + drift),
    effectiveAt: daysAgo(i, 1),
    createdAt: daysAgo(i, 1),
    createdByName: i % 3 === 0 ? "Arun Raj" : "Meera K",
    source: "MANUAL",
  };
});

/* ───────────────────────── Digital Gold & Silver ───────────────────────── */

export const DEMO_DM_RATES = {
  GOLD: { buy: 784_050, sell: 761_000, sequence: 412 },
  SILVER: { buy: 9_820, sell: 9_340, sequence: 188 },
};

/** Admin mock customers are `cus_01…`; the commerce demo uses `cus_10482…`. Map either to a demo customer id. */
export function demoCommerceCustomerId(id: unknown): string {
  const raw = String(id ?? "");
  if (demoCustomers.some((c) => c.customerId === raw)) return raw;
  const n = Number(raw.match(/cus_0*(\d+)$/)?.[1] ?? NaN);
  if (Number.isFinite(n) && n > 0) return demoCustomers[(n - 1) % demoCustomers.length].customerId;
  return demoCustomers[0].customerId;
}

const dmCustomers = demoCustomers.map((c) => ({
  id: c.customerId,
  name: c.name,
  mobile: c.maskedMobile.replace(/•/g, "X"),
  customerNumber: c.customerNumber,
  email: null,
}));

const banks = [
  { accountHolderName: "Anjali Nair", accountLast4: "4821", ifsc: "SBIN0070263", bankName: "State Bank of India", status: "ACTIVE" },
  { accountHolderName: "Ramesh S", accountLast4: "1190", ifsc: "FDRL0001033", bankName: "Federal Bank", status: "ACTIVE" },
  { accountHolderName: "Priya Pillai", accountLast4: "7720", ifsc: "HDFC0001234", bankName: "HDFC Bank", status: "PENDING_VERIFICATION" },
  { accountHolderName: "Muhammed G", accountLast4: "3302", ifsc: "SIBL0000101", bankName: "South Indian Bank", status: "ACTIVE" },
  { accountHolderName: "Sreedevi B", accountLast4: "6614", ifsc: "CNRB0004510", bankName: "Canara Bank", status: "ACTIVE" },
  { accountHolderName: "Fathima Rahman", accountLast4: "9045", ifsc: "ICIC0000876", bankName: "ICICI Bank", status: "PENDING_VERIFICATION" },
  { accountHolderName: "Joseph Mathew", accountLast4: "2268", ifsc: "UTIB0000442", bankName: "Axis Bank", status: "ACTIVE" },
  { accountHolderName: "Lakshmi Menon", accountLast4: "5531", ifsc: "KKBK0000981", bankName: "Kotak Mahindra Bank", status: "ACTIVE" },
];

const ug = (grams: number) => String(Math.round(grams * 1_000_000));

type BuySeed = [string, number, "GOLD" | "SILVER", number, number, number?, string?];
// status, customer, metal, grams, daysAgo, hours, exception
const buySeeds: BuySeed[] = [
  ["PAYMENT_PENDING", 6, "GOLD", 0.6377, 0, 1],
  ["CREDITED", 0, "GOLD", 1.2754, 0, 3],
  ["CREDITED", 2, "SILVER", 50, 0, 6],
  ["CREDITED", 7, "GOLD", 5.1, 1],
  ["PAYMENT_FAILED", 3, "GOLD", 0.255, 1, 5],
  ["CREDITED", 1, "GOLD", 2.55, 2],
  ["REFUND_REVIEW", 4, "GOLD", 0.7734, 3, 0, "LATE_SUCCESS"],
  ["CREDITED", 5, "SILVER", 120, 4],
  ["CREDITED", 0, "GOLD", 0.3826, 6],
  ["CREDITED", 6, "GOLD", 10, 8],
  ["CREDITED", 2, "GOLD", 1, 11],
  ["PAYMENT_FAILED", 7, "SILVER", 25, 12],
  ["CREDITED", 3, "GOLD", 3.19, 16],
  ["CREDITED", 1, "SILVER", 200, 20],
];

export const demoBuyOrders = buySeeds.map(([status, c, metal, grams, d, h = 0, exception], i) => {
  const rate = DEMO_DM_RATES[metal].buy;
  const total = Math.round(rate * grams * 1.03);
  return {
    id: `dmbo_${(9_120 - i).toString(36)}${i}`,
    status,
    metal,
    finenessPpm: 999_000,
    quantityUg: ug(grams),
    totalPayablePaise: total,
    buyRatePerGramPaise: rate,
    invoiceStatus: status === "CREDITED" ? "READY" : "PENDING",
    paymentExceptionStatus: exception ?? null,
    customerId: dmCustomers[c].id,
    customer: dmCustomers[c],
    createdAt: daysAgo(d, h),
    creditedAt: status === "CREDITED" ? daysAgo(d, h - 0.1) : null,
    paymentAttempts:
      status === "PAYMENT_PENDING"
        ? []
        : [
            {
              id: `dmpay_${i}a`,
              status: status === "PAYMENT_FAILED" ? "FAILED" : "COMPLETED",
              provider: "PHONEPE",
              amountPaise: total,
              createdAt: daysAgo(d, h),
            },
          ],
  };
});

type SellSeed = [string, number, "GOLD" | "SILVER", number, number, number?];
const sellSeeds: SellSeed[] = [
  ["PENDING_APPROVAL", 1, "GOLD", 2, 0, 2],
  ["PENDING_APPROVAL", 4, "GOLD", 0.5, 0, 5],
  ["PENDING_APPROVAL", 7, "SILVER", 100, 1],
  ["PAYABLE_OPEN", 0, "GOLD", 1.5, 2],
  ["PAYABLE_OPEN", 3, "GOLD", 4, 3],
  ["SETTLED", 2, "GOLD", 1, 6],
  ["SETTLED", 5, "SILVER", 60, 9],
  ["CANCELLED", 6, "GOLD", 0.25, 12],
  ["EXPIRED", 0, "GOLD", 0.8, 14],
];

export const demoSellOrders = sellSeeds.map(([status, c, metal, grams, d, h = 0], i) => {
  const rate = DEMO_DM_RATES[metal].sell;
  const settlement = Math.round(rate * grams);
  const created = daysAgo(d, h);
  return {
    id: `dmso_${(5_400 - i).toString(36)}${i}`,
    status,
    metal,
    finenessPpm: 999_000,
    quantityUg: ug(grams),
    settlementPaise: settlement,
    createdAt: created,
    confirmedAt: daysAgo(d, h - 0.05),
    approvalExpiresAt: status === "PENDING_APPROVAL" ? inDays(0, 6 - i) : null,
    executedAt: ["PAYABLE_OPEN", "SETTLED"].includes(status) ? daysAgo(d, h - 1) : null,
    customer: dmCustomers[c],
    bankDestination: banks[c],
    version: 2,
    sellSummary: { sellRatePerGramPaise: rate },
    payable: ["PAYABLE_OPEN", "SETTLED"].includes(status)
      ? { status: status === "SETTLED" ? "SETTLED" : "OPEN", outstandingPaise: status === "SETTLED" ? 0 : settlement }
      : undefined,
  };
});

export const demoPayables = demoSellOrders
  .filter((s) => s.status === "PAYABLE_OPEN")
  .map((s, i) => ({
    id: `dmpaybl_${i + 1}`,
    sellOrderId: s.id,
    outstandingPaise: s.settlementPaise,
    status: "OPEN",
    customer: s.customer,
    createdAt: s.executedAt,
  }));

const payoutStatuses = ["PENDING_APPROVAL", "APPROVED", "SUBMITTED", "SETTLED", "FAILED"];
export const demoPayouts = payoutStatuses.map((status, i) => {
  const sell = demoSellOrders[(i + 3) % demoSellOrders.length];
  return {
    id: `dmpos_${700 + i}`,
    status,
    amountPaise: sell.settlementPaise,
    sellOrderId: sell.id,
    customer: sell.customer,
    destinationSnapshot: sell.bankDestination,
    bankReference: ["SUBMITTED", "SETTLED", "FAILED"].includes(status) ? `UTR26${298_110 + i}` : null,
    createdAt: daysAgo(i + 1),
    updatedAt: daysAgo(i),
  };
});

export function demoPayoutDetail(payoutId: string) {
  const p = demoPayouts.find((x) => x.id === payoutId) ?? demoPayouts[1];
  const actionsByStatus: Record<string, string[]> = {
    PENDING_APPROVAL: ["APPROVE"],
    APPROVED: ["SUBMIT"],
    SUBMITTED: ["RECORD_SETTLEMENT", "RECORD_FAILURE", "MARK_UNKNOWN"],
    SETTLED: [],
    FAILED: [],
  };
  const flow = ["PENDING_APPROVAL", "APPROVED", "SUBMITTED", "SETTLED"];
  const reached = p.status === "FAILED" ? 3 : flow.indexOf(p.status) + 1;
  const history = flow.slice(0, reached).map((status, i) => ({
    status,
    at: daysAgo(4 - i, 2),
    note: ["Created from executed sale", "Approved by Arun Raj", "Bank transfer initiated", "Customer credit confirmed"][i],
  }));
  if (p.status === "FAILED") history.push({ status: "FAILED", at: daysAgo(0, 3), note: "Beneficiary account frozen — bank returned funds" });
  return {
    payout: { ...p, permittedActions: actionsByStatus[p.status] ?? [], statusHistory: history },
    payable: { id: "dmpaybl_1", outstandingPaise: p.status === "SETTLED" ? 0 : p.amountPaise, status: p.status === "SETTLED" ? "SETTLED" : "OPEN" },
  };
}

export const demoBankQueue = banks.map((b, i) => ({
  id: `dmbd_${300 + i}`,
  ...b,
  status: i === 2 || i === 5 ? "PENDING_VERIFICATION" : i === 6 ? "DISABLED" : "ACTIVE",
  customer: dmCustomers[i],
  createdAt: daysAgo(i * 2 + 1),
  verifiedAt: i === 2 || i === 5 ? null : daysAgo(i * 2),
}));

export const demoRedemptionCatalogue = [
  { id: "dmrci_g05", sku: "DG-COIN-0.5", label: "0.5 g gold coin", metal: "GOLD", finenessPpm: 999_000, unitQuantityUg: ug(0.5), active: true, leadTimeDays: 2, deliveryFlatPaise: 15_000, packagingPaise: 5_000, pickupEnabled: true, deliveryEnabled: true, mintingRule: { type: "FLAT_INR", amountPaise: 35_000 }, taxLines: [{ code: "GST", label: "GST on minting", base: "MINTING", ratePercent: 3, active: true }], imageUploadId: "demo_coin_4" },
  { id: "dmrci_g1", sku: "DG-COIN-1", label: "1 g gold coin", metal: "GOLD", finenessPpm: 999_000, unitQuantityUg: ug(1), active: true, leadTimeDays: 2, deliveryFlatPaise: 15_000, packagingPaise: 5_000, pickupEnabled: true, deliveryEnabled: true, mintingRule: { type: "FLAT_INR", amountPaise: 45_000 }, taxLines: [], imageUploadId: "demo_coin_0" },
  { id: "dmrci_g5", sku: "DG-COIN-5", label: "5 g gold coin", metal: "GOLD", finenessPpm: 999_000, unitQuantityUg: ug(5), active: true, leadTimeDays: 3, deliveryFlatPaise: 25_000, packagingPaise: 10_000, pickupEnabled: true, deliveryEnabled: true, mintingRule: { type: "PERCENT", percent: 2 }, taxLines: [], imageUploadId: "demo_coin_1" },
  { id: "dmrci_g10bar", sku: "DG-BAR-10", label: "10 g gold bar", metal: "GOLD", finenessPpm: 999_000, unitQuantityUg: ug(10), active: true, leadTimeDays: 5, deliveryFlatPaise: 0, packagingPaise: 15_000, pickupEnabled: true, deliveryEnabled: false, mintingRule: { type: "PERCENT", percent: 1.5 }, taxLines: [], imageUploadId: "demo_bar_4" },
  { id: "dmrci_s10", sku: "DS-COIN-10", label: "10 g silver coin", metal: "SILVER", finenessPpm: 999_000, unitQuantityUg: ug(10), active: true, leadTimeDays: 2, deliveryFlatPaise: 10_000, packagingPaise: 3_000, pickupEnabled: true, deliveryEnabled: true, mintingRule: { type: "FLAT_INR", amountPaise: 12_000 }, taxLines: [], imageUploadId: "demo_silver-coin_5" },
  { id: "dmrci_s50", sku: "DS-COIN-50", label: "50 g silver coin", metal: "SILVER", finenessPpm: 999_000, unitQuantityUg: ug(50), active: false, leadTimeDays: 4, deliveryFlatPaise: 10_000, packagingPaise: 5_000, pickupEnabled: true, deliveryEnabled: false, mintingRule: { type: "NONE" }, taxLines: [], imageUploadId: "demo_silver-coin_3" },
];

type RedSeed = [string, number, string, number, "PICKUP" | "DELIVERY", string[]];
const redSeeds: RedSeed[] = [
  ["CHARGE_PAID", 0, "dmrci_g1", 0, "DELIVERY", ["ACCEPT_FULFILMENT", "CANCEL_PRE_DISPATCH"]],
  ["FULFILMENT_ACCEPTED", 7, "dmrci_g5", 1, "PICKUP", ["RECORD_PACKING", "RECORD_DELAY", "CANCEL_PRE_DISPATCH"]],
  ["PACKING", 2, "dmrci_s10", 2, "DELIVERY", ["DISPATCH", "RECORD_DELAY"]],
  ["PICKUP_READY", 1, "dmrci_g10bar", 3, "PICKUP", ["ISSUE_PICKUP_CODE", "COMPLETE_PICKUP"]],
  ["DISPATCHED", 5, "dmrci_g05", 4, "DELIVERY", ["COMPLETE_DELIVERY", "OPEN_INVESTIGATION"]],
  ["COMPLETED", 3, "dmrci_g1", 9, "PICKUP", []],
  ["CHECKOUT_PENDING", 6, "dmrci_g05", 0, "DELIVERY", []],
];

export const demoRedemptionOrders = redSeeds.map(([status, c, itemId, d, mode, actions], i) => {
  const item = demoRedemptionCatalogue.find((x) => x.id === itemId)!;
  const charge = (item.mintingRule.type === "FLAT_INR" ? item.mintingRule.amountPaise ?? 0 : 60_000) + item.packagingPaise + (mode === "DELIVERY" ? item.deliveryFlatPaise : 0);
  return {
    id: `dmro_${880 + i}`,
    status,
    metal: item.metal,
    finenessPpm: item.finenessPpm,
    quantityUg: item.unitQuantityUg,
    itemLabel: item.label,
    chargeTotalPaise: charge,
    fulfilmentMode: mode,
    pickupBranchLabel: mode === "PICKUP" ? "Kochi Main · MG Road" : null,
    pickupBranchId: mode === "PICKUP" ? "br_kochi" : null,
    deliveryAddressSnapshot:
      mode === "DELIVERY"
        ? { recipientName: dmCustomers[c].name, line1: "12/440, Panampilly Nagar", city: "Kochi", state: "Kerala", pincode: "682036" }
        : null,
    trackingReference: status === "DISPATCHED" ? "DTDC7Z44102" : null,
    trackingSource: status === "DISPATCHED" ? "MANUAL" : null,
    createdAt: daysAgo(d, 3),
    chargePaidAt: status === "CHECKOUT_PENDING" ? null : daysAgo(d, 2),
    updatedAt: daysAgo(Math.max(0, d - 1)),
    customer: dmCustomers[c],
    permittedActions: actions,
    version: 3,
  };
});

export const demoProcurementEntries = [
  { id: "dmpe_501", entryType: "OPENING_POSITION", status: "APPROVED", metal: "GOLD", finenessPpm: 999_000, quantityUg: ug(250), effectiveDate: "2026-09-30", supplierRef: "MMTC-PAMP", billRef: "OB-2026-09", createdByUserId: "Arun Raj", approvedByUserId: "Meera K", approvedAt: daysAgo(25), reasonNote: "Opening vault position" },
  { id: "dmpe_502", entryType: "COMMITMENT", status: "APPROVED", metal: "GOLD", finenessPpm: 999_000, quantityUg: ug(100), remainingCommitmentUg: ug(40), effectiveDate: "2026-10-14", supplierRef: "Augmont", billRef: "PO-11823", createdByUserId: "Arun Raj", approvedByUserId: "Meera K", approvedAt: daysAgo(11) },
  { id: "dmpe_503", entryType: "RECEIPT", status: "APPROVED", metal: "GOLD", finenessPpm: 999_000, quantityUg: ug(60), effectiveDate: "2026-10-18", supplierRef: "Augmont", billRef: "INV-55102", commitmentEntryId: "dmpe_502", createdByUserId: "Meera K", approvedByUserId: "Arun Raj", approvedAt: daysAgo(7) },
  { id: "dmpe_504", entryType: "COMMITMENT", status: "PENDING_APPROVAL", metal: "SILVER", finenessPpm: 999_000, quantityUg: ug(5_000), remainingCommitmentUg: ug(5_000), effectiveDate: "2026-10-24", supplierRef: "MMTC-PAMP", billRef: "PO-11902", createdByUserId: "Meera K", reasonNote: "Festive silver demand" },
  { id: "dmpe_505", entryType: "DISPOSAL", status: "PENDING_APPROVAL", metal: "GOLD", finenessPpm: 999_000, quantityUg: ug(4.5), effectiveDate: "2026-10-25", createdByUserId: "Arun Raj", reasonNote: "Redemption coins minted" },
];

function dmRateHistory(metal: "GOLD" | "SILVER") {
  const base = DEMO_DM_RATES[metal];
  return Array.from({ length: 21 }).map((_, i) => {
    const wave = Math.sin(i / 2.6) * (metal === "GOLD" ? 9_000 : 160) + i * (metal === "GOLD" ? -700 : -14);
    return {
      id: `dmrv_${metal}_${i}`,
      metal,
      finenessPpm: 999_000,
      sequence: base.sequence - i,
      customerBuyRatePerGramPaise: Math.round(base.buy + wave),
      customerSellRatePerGramPaise: Math.round(base.sell + wave),
      effectiveAt: daysAgo(i, 0.5),
      publishedByName: i % 2 ? "Meera K" : "Arun Raj",
    };
  });
}

const holdingsUg = {
  GOLD: demoBuyOrders.filter((o) => o.status === "CREDITED" && o.metal === "GOLD").reduce((s, o) => s + Number(o.quantityUg), 0) + 248_600_000,
  SILVER: demoBuyOrders.filter((o) => o.status === "CREDITED" && o.metal === "SILVER").reduce((s, o) => s + Number(o.quantityUg), 0) + 3_140_000_000,
};

export const demoDmCapability = {
  planEntitled: true,
  tenantEnabled: true,
  enabled: true,
  active: true,
  paused: false,
  hasLegacyActivity: false,
  canViewHoldings: true,
  canViewHistory: true,
  canAccessSettlement: true,
  canAccessFulfilment: true,
  canPlaceNewBuy: true,
  canPlaceNewSell: true,
  canPlaceRedemption: true,
  blockers: [],
  termsVersion: "2026-10-01",
  taxProfileApproved: true,
  assets: [
    { metal: "GOLD", finenessPpm: 999_000, quoteReady: true, rateTiming: "FRESH", issues: [] },
    { metal: "SILVER", finenessPpm: 999_000, quoteReady: true, rateTiming: "FRESH", issues: [] },
  ],
  pause: { tenantPaused: false, tenantPauseReason: "", platformPaused: false, platformPauseReason: "" },
  implementationPhase: 9,
  workspaceLive: true,
};

function demoEcommerceReport(reportKey: string) {
  const days = Array.from({ length: 30 }).map((_, i) => {
    const d = new Date(NOW - (29 - i) * 86_400_000);
    return d.toISOString().slice(0, 10);
  });
  const wave = (i: number, base: number, amp: number) => Math.max(0, Math.round(base + Math.sin(i / 3.1) * amp + (i % 7 === 5 ? amp * 0.9 : 0) + i * base * 0.012));
  const scope = { level: "TENANT", label: "All showrooms", branch: null };
  const period = { from: days[0], to: days[29], label: "Last 30 days" };
  if (reportKey === "ECOMMERCE_SALES") {
    const online = days.map((x, i) => ({ x, y: wave(i, 2_600_000, 1_900_000) }));
    const cod = days.map((x, i) => ({ x, y: wave(i + 4, 650_000, 600_000) }));
    const total = online.reduce((s, p) => s + p.y, 0) + cod.reduce((s, p) => s + p.y, 0);
    return contract({
      reportKey,
      title: "Ecommerce sales & collections",
      scope,
      period,
      generatedAt: new Date(NOW).toISOString(),
      summary: [
        { key: "NET_COLLECTED", label: "Net collected", value: money(total), valueType: "currency", change: { percent: 18.4, direction: "UP", isGood: true } },
      ],
      charts: {
        collectionsTrend: {
          chartType: "line",
          title: "Collections & refunds",
          series: [
            { key: "ONLINE", name: "Online collected", data: online.map((p) => ({ ...p, yDisplay: inr(p.y) })) },
            { key: "COD", name: "COD collected", data: cod.map((p) => ({ ...p, yDisplay: inr(p.y) })) },
          ],
        },
      },
      columns: [],
      rows: [],
    });
  }
  if (reportKey === "ECOMMERCE_ORDERS_FULFILMENT") {
    const statusRows = [
      ["COD_PENDING_ACCEPTANCE", "COD to accept", 1],
      ["PENDING_PAYMENT", "Pending payment", 1],
      ["PAID", "Paid", 2],
      ["PROCESSING", "Processing", 1],
      ["READY_FOR_PICKUP", "Ready for pickup", 1],
      ["SHIPPED", "Shipped", 2],
      ["DELIVERED", "Delivered", 6],
      ["CANCELLED", "Cancelled", 1],
    ] as const;
    return contract({
      reportKey,
      title: "Ecommerce orders & fulfilment",
      scope,
      period,
      generatedAt: new Date(NOW).toISOString(),
      summary: [{ key: "ORDERS_PLACED", label: "Orders placed", value: 16, valueType: "count" }],
      charts: {
        placedTrend: {
          chartType: "line",
          title: "Orders placed",
          series: [{ key: "PLACED", name: "Orders placed", data: days.map((x, i) => ({ x, y: wave(i, 2, 2) })) }],
        },
      },
      columns: [
        { key: "label", label: "Status", type: "text" },
        { key: "count", label: "Orders placed", type: "count" },
      ],
      rows: statusRows.map(([status, label, count]) => ({ key: status, status, label, count })),
    });
  }
  if (reportKey === "ECOMMERCE_PRODUCTS") {
    const rows = demoProducts
      .filter((p) => p.status === "PUBLISHED")
      .slice(0, 6)
      .map((p, i) => {
        const unit = (p.pricing as { displayTotal?: { amountPaise: number } }).displayTotal?.amountPaise ?? 0;
        const units = [9, 6, 5, 4, 3, 2][i];
        return { key: p.id, productId: p.id, name: p.name, sku: p.sku, imageUploadId: p.imageUploadIds[0], unitsOrdered: units, collectedSales: money(unit * units) };
      })
      .sort((a, b) => b.collectedSales.amountPaise - a.collectedSales.amountPaise);
    return contract({
      reportKey,
      title: "Ecommerce product performance",
      scope,
      period,
      generatedAt: new Date(NOW).toISOString(),
      summary: [],
      charts: {},
      columns: [
        { key: "name", label: "Product", type: "text" },
        { key: "unitsOrdered", label: "Units", type: "count" },
        { key: "collectedSales", label: "Collected line sales", type: "currency" },
      ],
      rows,
    });
  }
  return undefined;
}

/* ───────────────────────── Dispatcher ───────────────────────── */

const contract = (payload: unknown, meta?: unknown) => ({ __contract: true, payload, ...(meta ? { meta } : {}) });

function page<T>(rows: T[], params: Record<string, unknown>, limitDefault = 25) {
  const limit = Number(params.limit ?? limitDefault) || limitDefault;
  const start = params.cursor ? Number(String(params.cursor).replace("c", "")) || 0 : 0;
  const slice = rows.slice(start, start + limit);
  const hasMore = start + limit < rows.length;
  return { items: slice, meta: { hasMore, nextCursor: hasMore ? `c${start + limit}` : null, limit, totalCount: rows.length } };
}

export function commerceDemoMock(
  mockKey: string,
  params: Record<string, unknown>,
  body: Record<string, unknown>,
  url?: string,
): unknown | undefined {
  const q = String(params.q ?? "").trim().toLowerCase();
  switch (mockKey) {
    /* Online store */
    case "ecommerceProducts": {
      let rows = demoProducts;
      if (params.status) rows = rows.filter((p) => p.status === params.status);
      if (params.categoryId) rows = rows.filter((p) => p.categoryId === params.categoryId);
      if (q) rows = rows.filter((p) => `${p.name} ${p.sku}`.toLowerCase().includes(q));
      return contract(page(rows, params, 50));
    }
    case "ecommerceProduct":
      return contract(demoProducts.find((p) => p.id === params.productId) ?? demoProducts[0]);
    case "ecommerceCategories":
      return contract({ items: params.activeOnly ? demoCategories.filter((c) => c.active) : demoCategories, meta: { hasMore: false } });
    case "ecommerceCategory":
      return contract(demoCategories.find((c) => c.id === params.categoryId) ?? demoCategories[0]);
    case "ecommerceBanners": {
      let rows = demoBanners;
      if (params.status) rows = rows.filter((b) => b.status === params.status);
      if (params.placement) rows = rows.filter((b) => b.placement === params.placement);
      return contract({ items: rows, meta: { hasMore: false } });
    }
    case "ecommerceGoldRatesCurrent":
      return contract({
        rates: Object.entries(DEMO_GOLD_RATES_PAISE).map(([purity, paise]) => ({
          purity,
          ratePerGramPaise: paise,
          ratePerGram: { amountPaise: paise, amountDisplay: inr(paise) },
          effectiveAt: daysAgo(0, 2),
        })),
        asOf: daysAgo(0, 2),
      });
    case "ecommerceGoldRatesHistory":
      return contract({ items: goldRateHistory, meta: { hasMore: false } });
    case "ecommerceInventory": {
      let rows = demoInventoryRows();
      if (q) rows = rows.filter((r) => `${r.productName} ${r.sku}`.toLowerCase().includes(q));
      return contract({ items: rows });
    }
    case "ecommerceOrders": {
      const rows = filterOrders(params);
      const p = page(rows, params, 25);
      return contract(p.items, p.meta);
    }
    case "ecommerceOrder":
      return contract(demoOrderDetail(String(params.orderId ?? "")));
    case "ecommerceWorkspaceSummary":
      return contract(demoWorkspaceSummary());
    case "getEcommerceUploadDownload":
    case "getUploadDownload": {
      const url = demoUploadUrl(String(params.uploadId ?? ""));
      if (!url) return undefined;
      return contract({ uploadId: params.uploadId, status: "UPLOADED", fileName: "image.svg", contentType: "image/svg+xml", downloadUrl: url });
    }

    case "ecommerceReports":
      return demoEcommerceReport(String(params.reportKey ?? decodeURIComponent(url?.split("/reports/")[1]?.split(/[/?]/)[0] ?? "")));

    /* Digital Gold & Silver */
    case "digitalMetalsCapability":
      return contract(demoDmCapability);
    case "digitalMetalsWorkspace":
      return contract({ phase: 9, workspaceLive: true, title: "Digital Gold & Silver", capability: demoDmCapability });
    case "digitalMetalsRatesCurrent": {
      const metal = (String(params.metal ?? "GOLD").toUpperCase() === "SILVER" ? "SILVER" : "GOLD") as "GOLD" | "SILVER";
      const r = DEMO_DM_RATES[metal];
      return contract({
        rate: {
          rateVersionId: `dmrv_${metal}_0`,
          metal,
          finenessPpm: 999_000,
          sequence: r.sequence,
          customerBuyRatePerGramPaise: r.buy,
          customerSellRatePerGramPaise: r.sell,
          effectiveAt: daysAgo(0, 0.5),
        },
        stale: false,
        settingsVersion: 4,
      });
    }
    case "digitalMetalsRatesHistory": {
      const metal = (String(params.metal ?? "GOLD").toUpperCase() === "SILVER" ? "SILVER" : "GOLD") as "GOLD" | "SILVER";
      return contract({ items: dmRateHistory(metal) });
    }
    case "digitalMetalsBuyOrders": {
      let rows = demoBuyOrders;
      if (params.customerId) rows = rows.filter((r) => r.customerId === demoCommerceCustomerId(params.customerId));
      if (params.status) rows = rows.filter((r) => r.status === params.status);
      if (q) rows = rows.filter((r) => `${r.id} ${r.customer.name} ${r.customer.customerNumber}`.toLowerCase().includes(q));
      return contract(page(rows, params, 20));
    }
    case "digitalMetalsBuyOrderDetail":
      return contract(demoBuyOrders.find((r) => r.id === params.orderId) ?? demoBuyOrders[1]);
    case "digitalMetalsSellOrders": {
      let rows = demoSellOrders;
      if (params.customerId) rows = rows.filter((r) => r.customer.id === demoCommerceCustomerId(params.customerId));
      if (params.status) rows = rows.filter((r) => r.status === params.status);
      if (q) rows = rows.filter((r) => `${r.id} ${r.customer.name} ${r.customer.customerNumber}`.toLowerCase().includes(q));
      return contract(page(rows, params, 20));
    }
    case "digitalMetalsSellOrderDetail":
      return contract(demoSellOrders.find((r) => r.id === params.orderId) ?? demoSellOrders[0]);
    case "digitalMetalsPayables":
      return contract(page(demoPayables, params));
    case "digitalMetalsPayouts":
      return contract(page(params.status ? demoPayouts.filter((p) => p.status === params.status) : demoPayouts, params));
    case "digitalMetalsPayoutDetail":
      return contract(demoPayoutDetail(String(params.payoutId ?? "")));
    case "digitalMetalsBankVerificationQueue":
      return contract(page(params.status ? demoBankQueue.filter((b) => b.status === params.status) : demoBankQueue, params));
    case "digitalMetalsRedemptionCatalogue":
      return contract({ items: demoRedemptionCatalogue });
    case "digitalMetalsRedemptionOrders": {
      let rows = demoRedemptionOrders;
      if (params.customerId) rows = rows.filter((r) => r.customer.id === demoCommerceCustomerId(params.customerId));
      if (params.status) rows = rows.filter((r) => r.status === params.status);
      return contract(page(rows, params));
    }
    case "digitalMetalsRedemptionOrderDetail":
      return contract(demoRedemptionOrders.find((r) => r.id === params.orderId) ?? demoRedemptionOrders[0]);
    case "digitalMetalsRedemptionFulfilmentQueue":
      return contract(page(demoRedemptionOrders.filter((r) => r.permittedActions.length > 0), params));
    case "digitalMetalsHedgeLive":
      return contract({
        reportType: "LIVE",
        businessDate: "2026-10-25",
        recomputationRequired: false,
        lines: [
          { metal: "GOLD", finenessPpm: 999_000, coverageIncomplete: false, closingObligationUg: String(holdingsUg.GOLD), closingHedgePositionUg: String(holdingsUg.GOLD - 7_400_000), uncoveredUg: "7400000", walletReconcileDeltaUg: null },
          { metal: "SILVER", finenessPpm: 999_000, coverageIncomplete: false, closingObligationUg: String(holdingsUg.SILVER), closingHedgePositionUg: String(holdingsUg.SILVER + 120_000_000), uncoveredUg: "0", walletReconcileDeltaUg: null },
        ],
      });
    case "digitalMetalsHedgeDailyIndex": {
      const items = ["2026-10-25", "2026-10-24", "2026-10-23"].map((businessDate, i) => ({
        businessDate,
        metals: {
          GOLD: {
            openingMetalOwedUg: String(holdingsUg.GOLD - i * 100_000),
            closingMetalOwedUg: String(holdingsUg.GOLD - i * 80_000),
            dayNetChangeUg: String(20_000),
            creditedBuyUg: String(50_000),
            executedSellUg: String(30_000),
            physicalHandoverUg: "0",
            ledgerMatchesBook: true,
          },
          SILVER: {
            openingMetalOwedUg: String(holdingsUg.SILVER),
            closingMetalOwedUg: String(holdingsUg.SILVER + 10_000),
            dayNetChangeUg: "10000",
            creditedBuyUg: "10000",
            executedSellUg: "0",
            physicalHandoverUg: "0",
            ledgerMatchesBook: true,
          },
        },
      }));
      return contract({
        reportType: "DAILY_HEDGE_INDEX",
        endDate: "2026-10-25",
        days: items.length,
        currentBalances: {
          businessDate: "2026-10-25",
          goldClosingUg: String(holdingsUg.GOLD),
          silverClosingUg: String(holdingsUg.SILVER),
        },
        items,
      });
    }
    case "digitalMetalsHedgeInvalidated":
      return contract({ items: [] });
    case "digitalMetalsProcurementEntries": {
      let rows = demoProcurementEntries;
      if (params.entryType) rows = rows.filter((r) => r.entryType === params.entryType);
      if (params.status) rows = rows.filter((r) => r.status === params.status);
      return contract({ items: rows, nextCursor: null });
    }
    case "digitalMetalsProcurementEntryDetail":
      return contract(demoProcurementEntries.find((r) => r.id === params.entryId) ?? null);
    case "digitalMetalsPaymentExceptions":
      return contract({
        items: [
          {
            refund: { id: "dmref_31", status: "ASSIGNED", exceptionType: "LATE_SUCCESS", amountPaise: demoBuyOrders[6].totalPayablePaise },
            order: { ...demoBuyOrders[6] },
          },
          {
            refund: { id: "dmref_32", status: "OPEN", exceptionType: "DUPLICATE_PAYMENT", amountPaise: demoBuyOrders[4].totalPayablePaise },
            order: { ...demoBuyOrders[4], paymentExceptionStatus: "DUPLICATE_PAYMENT" },
          },
        ],
      });
    default:
      void body;
      return undefined;
  }
}

/** Shared with the customer mock so the shop shows the same catalogue. */
export const demoShop = {
  categories: demoCategories.filter((c) => c.active),
  products: () => demoProducts.filter((p) => p.status === "PUBLISHED"),
  banners: demoBanners.filter((b) => b.status === "PUBLISHED"),
  orders: demoOrders.filter((o) => o.customerId === "cus_10482"),
  orderDetail: demoOrderDetail,
  holdingsUg,
};
