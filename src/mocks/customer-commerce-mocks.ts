/**
 * Mock-only customer portal data for the online store and Digital Gold & Silver.
 * Shares the admin demo catalogue so both sides of the demo show the same pieces.
 * Never imported outside `NEXT_PUBLIC_USE_MOCKS=true` code paths.
 */
import {
  DEMO_DM_RATES,
  demoCategories,
  demoDmCapability,
  demoOrderDetail,
  demoRedemptionCatalogue,
  demoShop,
} from "./commerce-demo-mocks";
import { demoUploadUrl } from "./commerce-demo-images";

type Body = Record<string, unknown> | undefined;
type Params = Record<string, unknown>;

export type CustomerMockResult =
  | { data: unknown }
  | { error: { status: number; data: { success: false; error: { code: string; message: string; details?: unknown } } } };

const minutes = (n: number) => new Date(Date.now() + n * 60_000).toISOString();
const ago = (days: number, hours = 0) => new Date(Date.now() - days * 86_400_000 - hours * 3_600_000).toISOString();
const ug = (grams: number) => String(Math.round(grams * 1_000_000));

function fail(status: number, code: string, message: string, details?: unknown): CustomerMockResult {
  return { error: { status, data: { success: false, error: { code, message, details } } } };
}

/* ───────────────────────── Shop catalogue ───────────────────────── */

type ShopProduct = ReturnType<typeof demoShop.products>[number] & { availability: Record<string, unknown> };

function availabilityOf(p: { stockPolicy?: string; availableQuantity?: number | null }) {
  if (p.stockPolicy !== "QUANTITY_TRACKED") {
    return { stockPolicy: "MADE_TO_ORDER", availableQuantity: null, purchasable: true, label: "Made to order" };
  }
  const q = Number(p.availableQuantity ?? 0);
  return {
    stockPolicy: "QUANTITY_TRACKED",
    availableQuantity: q,
    purchasable: q > 0,
    label: q > 0 ? `${q} in stock` : "Out of stock",
  };
}

function shopProducts(): ShopProduct[] {
  return demoShop.products().map((p) => ({ ...p, availability: availabilityOf(p) }));
}

function findProduct(key: string) {
  return shopProducts().find((p) => p.id === key || p.slug === key);
}

function unitPricing(p: ShopProduct) {
  const pricing = p.pricing as {
    displayTotal?: { amountPaise: number };
    preTaxSubtotal?: { amountPaise: number };
    tax?: { total?: { amountPaise: number } };
  };
  const total = pricing?.displayTotal?.amountPaise ?? 0;
  const preTax = pricing?.preTaxSubtotal?.amountPaise ?? total;
  const tax = pricing?.tax?.total?.amountPaise ?? total - preTax;
  return { total, preTax, tax };
}

function listProducts(params: Params) {
  let rows = shopProducts();
  const categoryId = params.categoryId ? String(params.categoryId) : "";
  if (categoryId) rows = rows.filter((p) => p.categoryId === categoryId);
  if (params.featured === true || params.featured === "true") rows = rows.filter((p) => p.featured);
  const q = String(params.q ?? "").trim().toLowerCase();
  if (q.length >= 2) rows = rows.filter((p) => p.name.toLowerCase().includes(q));
  rows =
    params.sort === "name"
      ? [...rows].sort((a, b) => a.name.localeCompare(b.name))
      : [...rows].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  const limit = Math.max(1, Number(params.limit ?? 12));
  const start = Number(params.cursor ?? 0) || 0;
  const items = rows.slice(start, start + limit);
  const hasMore = start + limit < rows.length;
  return { items, meta: { hasMore, nextCursor: hasMore ? String(start + limit) : null, limit } };
}

/* ───────────────────────── Cart, addresses, quotes ───────────────────────── */

const cart = {
  id: "ecart_demo",
  lines: [
    { productId: "eprd_solitaire_ring", quantity: 1 },
    { productId: "eprd_coin_10g", quantity: 1 },
  ] as { productId: string; quantity: number }[],
  version: 3,
};

function cartView() {
  return {
    id: cart.id,
    checkoutUsable: false,
    version: cart.version,
    lines: cart.lines.map((line) => {
      const p = findProduct(line.productId);
      return {
        productId: line.productId,
        quantity: line.quantity,
        product: p ? { id: p.id, name: p.name, slug: p.slug, status: p.status } : null,
        availability: p ? p.availability : null,
      };
    }),
  };
}

function putCart(body: Body): CustomerMockResult {
  const expected = body?.expectedVersion;
  if (expected != null && Number(expected) !== cart.version) {
    return fail(409, "VERSION_CONFLICT", "Cart changed elsewhere.");
  }
  const incoming = Array.isArray(body?.lines) ? (body!.lines as { productId: string; quantity: number }[]) : [];
  const next: { productId: string; quantity: number }[] = [];
  for (const line of incoming) {
    const p = findProduct(String(line.productId));
    if (!p) return fail(422, "VALIDATION_ERROR", `Product ${line.productId} is not available.`);
    const quantity = Math.max(1, Math.min(99, Number(line.quantity) || 1));
    const avail = p.availability as { stockPolicy: string; availableQuantity: number | null };
    if (avail.stockPolicy === "QUANTITY_TRACKED" && quantity > Number(avail.availableQuantity ?? 0)) {
      return fail(409, "INSUFFICIENT_STOCK", `Only ${avail.availableQuantity ?? 0} units available for ${p.name}.`, {
        productId: p.id,
        availableQuantity: avail.availableQuantity ?? 0,
        requested: quantity,
      });
    }
    next.push({ productId: p.id, quantity });
  }
  cart.lines = next;
  cart.version += 1;
  return { data: cartView() };
}

const branches = [
  { id: "br_kochi", name: "Kochi Main · MG Road", code: "KOC" },
  { id: "br_tvm", name: "Thiruvananthapuram · Kowdiar", code: "TVM" },
];

const fulfilmentOptions = {
  pickup: { enabled: true, branches },
  delivery: {
    enabled: true,
    serviceablePincodes: ["682036", "682016", "695003", "680001", "673001"],
    supportedDestinationStates: ["Kerala"],
    deliveryChargePaise: 15_000,
    codEnabled: true,
    codPincodes: ["682036", "695003"],
  },
  checkoutReadiness: { ready: true, blockers: [] },
};

const addresses: Record<string, unknown>[] = [
  {
    id: "eadr_home",
    label: "Home",
    recipientName: "Anjali Nair",
    mobile: "+91 98470 •2345",
    line1: "12/440, Panampilly Nagar",
    line2: "Near Avenue Centre",
    city: "Kochi",
    state: "Kerala",
    pincode: "682036",
    isDefault: true,
    version: 1,
  },
];

type Quote = Record<string, unknown> & { id: string };
const quotes = new Map<string, Quote>();
let quoteSeq = 210;

function createQuote(body: Body): CustomerMockResult {
  if (!cart.lines.length) return fail(422, "CART_EMPTY", "Your cart is empty.");
  const mode = String(body?.fulfilmentMode ?? "BRANCH_PICKUP");
  const lines = cart.lines.map((line) => {
    const p = findProduct(line.productId)!;
    const price = unitPricing(p);
    return {
      productId: p.id,
      name: p.name,
      sku: p.sku,
      quantity: line.quantity,
      imageUploadId: p.imageUploadIds?.[0],
      unitPricePaise: price.preTax,
      lineTotalPaise: price.preTax * line.quantity,
      taxPaise: price.tax * line.quantity,
    };
  });
  const subtotal = lines.reduce((s, l) => s + l.lineTotalPaise, 0);
  const tax = lines.reduce((s, l) => s + l.taxPaise, 0);
  const fulfilmentCharge = mode === "DELIVERY" ? fulfilmentOptions.delivery.deliveryChargePaise : 0;
  quoteSeq += 1;
  const id = `equo_${quoteSeq}`;
  const branch = branches.find((b) => b.id === body?.pickupBranchId);
  const address = addresses.find((a) => a.id === body?.addressId);
  const quote: Quote = {
    id,
    status: "ACTIVE",
    expiresAt: minutes(15),
    fulfilmentMode: mode,
    pickupBranchId: branch?.id ?? null,
    pickupBranchName: branch?.name ?? null,
    addressId: address?.id ?? null,
    addressSnapshot: address ?? null,
    paymentMethod: body?.paymentMethod === "COD" ? "COD" : "ONLINE",
    lines,
    subtotalPaise: subtotal,
    taxPaise: tax,
    fulfilmentChargePaise: fulfilmentCharge,
    totalPaise: subtotal + tax + fulfilmentCharge,
    checkoutTaxReady: true,
    paymentAllowed: true,
    orderPlacementAllowed: true,
  };
  quotes.set(id, quote);
  return { data: quote };
}

/* ───────────────────────── Orders ───────────────────────── */

type CustomerOrder = Record<string, unknown> & { id: string; status: string };

function customerFacing(order: Record<string, unknown>): CustomerOrder {
  const status = String(order.status);
  const delivery = order.fulfilmentMode === "DELIVERY";
  const shippedOrDone = status === "SHIPPED" || status === "DELIVERED";
  return {
    ...(order as CustomerOrder),
    fulfilmentMode: delivery ? "DELIVERY" : "BRANCH_PICKUP",
    paymentAllowed: status === "PENDING_PAYMENT",
    deliveryTracking:
      delivery && shippedOrDone
        ? {
            carrierName: "BlueDart",
            trackingNumber: `BD${String(order.orderNumber ?? "").replace("SG-", "")}8841IN`,
            trackingUrl: "https://www.bluedart.com/tracking",
          }
        : null,
    cancellation: {
      request: null,
      capabilities: {
        directCancelAllowed: status === "PENDING_PAYMENT" || status === "COD_PENDING_ACCEPTANCE",
        cancellationRequestAllowed: status === "PAID" || status === "PROCESSING",
        contactStoreForReturn: status === "SHIPPED",
      },
    },
  };
}

const orders: CustomerOrder[] = [
  { id: "eord_1047", status: "PAID", days: 0, hours: 3 },
  { id: "eord_1043", status: "READY_FOR_PICKUP", days: 2, hours: 0 },
  { id: "eord_1041", status: "SHIPPED", days: 4, hours: 0 },
  { id: "eord_1040", status: "DELIVERED", days: 6, hours: 0 },
  { id: "eord_1038", status: "CANCELLED", days: 9, hours: 0 },
].map(({ id, status, days, hours }) =>
  customerFacing({
    ...demoOrderDetail(id),
    addressSnapshot: demoOrderDetail(id).addressSnapshot
      ? { ...addresses[0], recipientName: "Anjali Nair" }
      : null,
    status,
    createdAt: ago(days, hours),
    customerId: "cus_10482",
  }),
);

let orderSeq = 1049;

function createOrder(body: Body): CustomerMockResult {
  const quote = quotes.get(String(body?.quoteId ?? ""));
  if (!quote) return fail(404, "NOT_FOUND", "Quote not found.");
  if (quote.status !== "ACTIVE") return fail(409, "QUOTE_NOT_ACTIVE", "This price preview is no longer active.");
  const cod = quote.paymentMethod === "COD";
  orderSeq += 1;
  const order = customerFacing({
    id: `eord_${orderSeq}`,
    orderNumber: `SG-${orderSeq}`,
    status: cod ? "COD_PENDING_ACCEPTANCE" : "PENDING_PAYMENT",
    statusLabel: cod ? "Waiting for the store to confirm" : "Waiting for payment",
    paymentMethod: quote.paymentMethod,
    paymentCompleted: false,
    fulfilmentMode: quote.fulfilmentMode === "DELIVERY" ? "DELIVERY" : "PICKUP",
    pickupBranchId: quote.pickupBranchId,
    pickupBranchName: quote.pickupBranchName,
    addressSnapshot: quote.addressSnapshot,
    lines: quote.lines,
    subtotalPaise: quote.subtotalPaise,
    taxPaise: quote.taxPaise,
    fulfilmentChargePaise: quote.fulfilmentChargePaise,
    totalPaise: quote.totalPaise,
    expiresAt: minutes(cod ? 240 : 30),
    createdAt: new Date().toISOString(),
    invoiceAvailable: false,
    quoteId: quote.id,
  });
  quote.status = "CONSUMED";
  orders.unshift(order);
  cart.lines = [];
  cart.version += 1;
  return { data: order };
}

const paymentAttempts = new Map<string, { id: string; orderId: string }>();

/* ───────────────────────── Digital Gold & Silver ───────────────────────── */

const wallets = [
  { id: "dmw_gold", metal: "GOLD" as const, finenessPpm: 999_000, held: 4.5821, reserved: 0.5 },
  { id: "dmw_silver", metal: "SILVER" as const, finenessPpm: 999_000, held: 152.4, reserved: 0 },
];

function portfolio() {
  return {
    items: wallets.map((w) => {
      const available = w.held - w.reserved;
      const rate = DEMO_DM_RATES[w.metal].sell;
      return {
        id: w.id,
        metal: w.metal,
        finenessPpm: w.finenessPpm,
        heldUg: ug(w.held),
        reservedUg: ug(w.reserved),
        availableUg: ug(available),
        pendingBuyUg: "0",
        branchId: "br_kochi",
        valuationStatus: "OK",
        estimatedSaleValue: {
          amountPaise: Math.round(rate * w.held),
          currency: "INR",
          ratePerGramPaise: rate,
          feeAssumption: "BEFORE_FEES",
        },
      };
    }),
    pendingBuyUg: "0",
  };
}

const bank = {
  id: "dmbd_sbi",
  accountHolderName: "Anjali Nair",
  accountLast4: "4821",
  ifsc: "SBIN0070263",
  bankName: "State Bank of India",
  status: "ACTIVE",
  verifiedAt: ago(30),
};

const buyOrders = [
  { id: "dmbo_c41", status: "CREDITED", metal: "GOLD", grams: 1.2754, days: 0, hours: 3 },
  { id: "dmbo_c38", status: "CREDITED", metal: "SILVER", grams: 50, days: 5 },
  { id: "dmbo_c35", status: "PAYMENT_FAILED", metal: "GOLD", grams: 0.25, days: 9 },
  { id: "dmbo_c31", status: "CREDITED", metal: "GOLD", grams: 2.0, days: 18 },
  { id: "dmbo_c27", status: "CREDITED", metal: "SILVER", grams: 102.4, days: 31 },
  { id: "dmbo_c22", status: "CREDITED", metal: "GOLD", grams: 1.8067, days: 46 },
].map((o) => {
  const rate = DEMO_DM_RATES[o.metal as "GOLD" | "SILVER"].buy;
  return {
    id: o.id,
    status: o.status,
    metal: o.metal,
    finenessPpm: 999_000,
    quantityUg: ug(o.grams),
    totalPayablePaise: Math.round(rate * o.grams * 1.03),
    buyRatePerGramPaise: rate,
    createdAt: ago(o.days, o.hours ?? 0),
    creditedAt: o.status === "CREDITED" ? ago(o.days, (o.hours ?? 0) - 0.05) : null,
  };
});

const sellOrders = [
  { id: "dmso_c12", status: "PENDING_APPROVAL", metal: "GOLD", grams: 0.5, days: 0, hours: 5 },
  { id: "dmso_c09", status: "SETTLED", metal: "GOLD", grams: 0.5, days: 22 },
].map((o) => {
  const rate = DEMO_DM_RATES[o.metal as "GOLD" | "SILVER"].sell;
  return {
    id: o.id,
    status: o.status,
    metal: o.metal,
    finenessPpm: 999_000,
    quantityUg: ug(o.grams),
    settlementPaise: Math.round(rate * o.grams),
    createdAt: ago(o.days, o.hours ?? 0),
    approvalExpiresAt: o.status === "PENDING_APPROVAL" ? minutes(180) : null,
    sellSummary: {
      orderId: o.id,
      metal: o.metal,
      finenessPpm: 999_000,
      quantityUg: ug(o.grams),
      settlementPaise: Math.round(rate * o.grams),
      sellRatePerGramPaise: rate,
      confirmedAt: ago(o.days, o.hours ?? 0),
      executedAt: o.status === "SETTLED" ? ago(o.days - 0.2) : null,
      bankDestination: bank,
    },
  };
});

function catalogueItem(item: (typeof demoRedemptionCatalogue)[number]) {
  const minting = item.mintingRule.type === "FLAT_INR" ? item.mintingRule.amountPaise ?? 0 : 60_000;
  return {
    id: item.id,
    sku: item.sku,
    label: item.label,
    metal: item.metal,
    finenessPpm: item.finenessPpm,
    unitQuantityUg: item.unitQuantityUg,
    mintingChargePaise: minting,
    packagingPaise: item.packagingPaise,
    deliveryFlatPaise: item.deliveryFlatPaise,
    chargeTotalPaise: minting + item.packagingPaise,
    pickupEnabled: item.pickupEnabled,
    deliveryEnabled: item.deliveryEnabled,
    leadTimeDays: item.leadTimeDays,
    imageUploadId: item.imageUploadId,
    active: item.active,
  };
}

const redemptionOrders = [
  { id: "dmro_c07", status: "DISPATCHED", itemId: "dmrci_g1", days: 3, mode: "DELIVERY" },
  { id: "dmro_c03", status: "COMPLETED", itemId: "dmrci_s10", days: 27, mode: "PICKUP" },
].map((o) => {
  const item = catalogueItem(demoRedemptionCatalogue.find((c) => c.id === o.itemId)!);
  return {
    id: o.id,
    status: o.status,
    metal: item.metal,
    finenessPpm: item.finenessPpm,
    quantityUg: item.unitQuantityUg,
    itemLabel: item.label,
    chargeTotalPaise: item.chargeTotalPaise + (o.mode === "DELIVERY" ? item.deliveryFlatPaise : 0),
    fulfilmentMode: o.mode,
    trackingReference: o.status === "DISPATCHED" ? "DTDC7Z44102" : null,
    createdAt: ago(o.days),
  };
});

function passbook() {
  const rows: Record<string, unknown>[] = [];
  let seq = 40;
  for (const s of sellOrders.filter((o) => o.status === "PENDING_APPROVAL")) {
    rows.push({
      id: `dmj_${seq--}`,
      entryType: "RESERVE",
      quantityUgDelta: "0",
      reservedUgDelta: s.quantityUg,
      referenceType: "SELL_ORDER",
      referenceId: s.id,
      sellOrderId: s.id,
      createdAt: s.createdAt,
      sellSummary: s.sellSummary,
    });
  }
  for (const b of buyOrders.filter((o) => o.status === "CREDITED").slice(0, 2)) {
    rows.push({
      id: `dmj_${seq--}`,
      entryType: "CREDIT",
      quantityUgDelta: b.quantityUg,
      reservedUgDelta: "0",
      referenceType: "PURCHASE",
      referenceId: b.id,
      createdAt: b.creditedAt,
      purchaseSummary: {
        orderId: b.id,
        metal: b.metal,
        finenessPpm: 999_000,
        quantityUg: b.quantityUg,
        totalPayablePaise: b.totalPayablePaise,
        buyRatePerGramPaise: b.buyRatePerGramPaise,
        bookedAt: b.createdAt,
        creditedAt: b.creditedAt,
        payment: { amountPaise: b.totalPayablePaise, provider: "PHONEPE", merchantOrderId: `dmpay_${b.id}`, paidAt: b.creditedAt },
      },
    });
  }
  const r = redemptionOrders[0];
  rows.push({
    id: `dmj_${seq--}`,
    entryType: "RESERVE",
    quantityUgDelta: "0",
    reservedUgDelta: r.quantityUg,
    referenceType: "REDEMPTION_ORDER",
    referenceId: r.id,
    redemptionOrderId: r.id,
    createdAt: r.createdAt,
    redemptionSummary: {
      orderId: r.id,
      status: r.status,
      metal: r.metal,
      finenessPpm: r.finenessPpm,
      quantityUg: r.quantityUg,
      fulfilmentMode: r.fulfilmentMode,
      chargeTotalPaise: r.chargeTotalPaise,
      createdAt: r.createdAt,
    },
  });
  for (const b of buyOrders.filter((o) => o.status === "CREDITED").slice(2)) {
    rows.push({
      id: `dmj_${seq--}`,
      entryType: "CREDIT",
      quantityUgDelta: b.quantityUg,
      reservedUgDelta: "0",
      referenceType: "PURCHASE",
      referenceId: b.id,
      createdAt: b.creditedAt,
      purchaseSummary: {
        orderId: b.id,
        metal: b.metal,
        finenessPpm: 999_000,
        quantityUg: b.quantityUg,
        totalPayablePaise: b.totalPayablePaise,
        buyRatePerGramPaise: b.buyRatePerGramPaise,
        bookedAt: b.createdAt,
        creditedAt: b.creditedAt,
      },
    });
  }
  return { items: rows, meta: { nextCursor: null, hasMore: false, limit: 15 } };
}

function buyQuote(body: Body) {
  const metal = body?.metal === "SILVER" ? "SILVER" : "GOLD";
  const rate = DEMO_DM_RATES[metal].buy;
  const budget = Math.max(10_000, Number(body?.budgetPaise ?? 600_000));
  const taxRate = 0.03;
  const metalSubtotal = Math.floor(budget / (1 + taxRate));
  const grams = Math.floor((metalSubtotal / rate) * 10_000) / 10_000;
  const exactSubtotal = Math.round(grams * rate);
  const tax = Math.round(exactSubtotal * taxRate);
  return {
    quoteId: `dmq_${metal.toLowerCase()}_${Date.now()}`,
    expiresAt: minutes(5),
    metal,
    finenessPpm: 999_000,
    metalQuantityUg: ug(grams),
    metalSubtotalPaise: exactSubtotal,
    feePaise: 0,
    taxPaise: tax,
    taxLines: [{ code: "GST", label: "GST", ratePercent: 3, amountPaise: tax }],
    totalPayablePaise: exactSubtotal + tax,
    budgetRemainderPaise: budget - (exactSubtotal + tax),
    termsVersion: "2026-10-01",
    termsContentHash: "a".repeat(64),
    rateSnapshot: { buyRatePerGramPaise: rate, rateVersionId: `dmr_${metal}_${DEMO_DM_RATES[metal].sequence}` },
  };
}

function sellQuote(body: Body) {
  const metal = body?.metal === "SILVER" ? "SILVER" : "GOLD";
  const rate = DEMO_DM_RATES[metal].sell;
  const quantityUg = Number(body?.quantityUg ?? 1_000_000);
  const gross = Math.round((rate * quantityUg) / 1_000_000);
  const fee = Math.round(gross * 0.005);
  return {
    quoteId: `dmq_sell_${metal.toLowerCase()}_${Date.now()}`,
    expiresAt: minutes(5),
    metal,
    finenessPpm: 999_000,
    quantityUg: String(quantityUg),
    metalSubtotalPaise: gross,
    feePaise: fee,
    feeLines: [{ code: "SELL_SPREAD", label: "Processing fee (0.5%)", amountPaise: fee }],
    settlementPaise: gross - fee,
    termsVersion: "2026-10-01",
    termsContentHash: "b".repeat(64),
    rateSnapshot: { sellRatePerGramPaise: rate, rateVersionId: `dmr_${metal}_${DEMO_DM_RATES[metal].sequence}` },
  };
}

/* ───────────────────────── Router ───────────────────────── */

const DEMO_MODULES_KEY = "swarnagrow.demo.modules";

/**
 * Mock-only module preset so the customer app can be previewed as a jeweller with
 * schemes only, schemes + online store, or schemes + store + digital gold.
 * Set with `?modules=schemes|schemes-shop|all` (remembered for the tab session).
 */
function demoModulePresetRaw(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return new URLSearchParams(window.location.search).get("modules") ?? sessionStorage.getItem(DEMO_MODULES_KEY);
  } catch {
    return null;
  }
}

export function demoModulePreset(): "all" | "schemes" | "schemes-shop" {
  if (typeof window === "undefined") return "all";
  try {
    const fromUrl = new URLSearchParams(window.location.search).get("modules");
    if (fromUrl) sessionStorage.setItem(DEMO_MODULES_KEY, fromUrl);
    const v = fromUrl ?? sessionStorage.getItem(DEMO_MODULES_KEY);
    return v === "schemes" || v === "schemes-shop" ? v : "all";
  } catch {
    return "all";
  }
}

export function customerCommerceMock({
  url,
  method,
  body,
  params,
}: {
  url: string;
  method: string;
  body?: Body;
  params?: Params;
}): CustomerMockResult | undefined {
  const p = params ?? {};

  /* uploads (catalogue art) */
  const upload = url.match(/^\/app\/uploads\/([^/]+)$/);
  if (upload && method === "GET") {
    const downloadUrl = demoUploadUrl(upload[1]);
    if (!downloadUrl) return undefined;
    return { data: { uploadId: upload[1], status: "UPLOADED", fileName: "art.svg", contentType: "image/svg+xml", downloadUrl } };
  }

  /* online store */
  const preset = demoModulePreset();
  const shopOn = preset !== "schemes";
  const metalsOn = preset === "all";
  if (url === "/app/shop/availability") {
    if (!shopOn) return { data: { available: false, hasOrderHistory: false, orderHistoryAvailable: false, ecommerce: { active: false } } };
    return { data: { available: true, hasOrderHistory: true, orderHistoryAvailable: true, ecommerce: { active: true } } };
  }
  if ((url === "/app/shop/banners" || url === "/app/home/banners") && !shopOn) {
    return { data: { items: [], meta: { nextVisibilityChangeAt: null, serverTime: new Date().toISOString() } } };
  }
  if (url === "/app/shop/banners" || url === "/app/home/banners") {
    const placement = url === "/app/home/banners" ? "HOME" : "SHOP";
    const items = demoShop.banners
      .filter((b) => b.placement === "BOTH" || b.placement === placement)
      .map((b) => ({
        id: b.id,
        title: b.title,
        subtitle: b.subtitle,
        imageUploadId: b.imageUploadId,
        imageUrl: `/uploads/${b.imageUploadId}`,
        destination:
          b.destinationType === "CATEGORY" && b.targetCategoryId
            ? { type: "CATEGORY", categoryId: b.targetCategoryId }
            : b.destinationType === "PRODUCT" && b.targetProductId
              ? { type: "PRODUCT", productId: b.targetProductId, slug: findProduct(b.targetProductId)?.slug ?? "" }
              : { type: "SHOP" },
        placement: b.placement,
        displayOrder: b.displayOrder,
        startsAt: b.startsAt,
        endsAt: b.endsAt,
      }));
    return { data: { items, meta: { nextVisibilityChangeAt: null, serverTime: new Date().toISOString() } } };
  }
  if (url === "/app/shop/categories") {
    return { data: { items: demoCategories.filter((c) => c.active) } };
  }
  if (url === "/app/shop/store-policies") {
    return {
      data: {
        published: true,
        policies: {
          version: 2,
          publishedAt: ago(20),
          shippingPolicyText: "Insured delivery across Kerala within 3–5 working days. Pickup is free from any listed branch.",
          returnsPolicyText: "Unworn pieces with tags and the original invoice can be returned within 7 days of delivery.",
          cancellationPolicyText: "Orders can be cancelled before they are packed. Paid orders are refunded to the original payment method.",
          refundContactPolicyText: "For refunds, call the branch you ordered from or raise a support ticket.",
          returnEligibilityDays: 7,
        },
      },
    };
  }
  if (url === "/app/shop/products" && method === "GET") return { data: listProducts(p) };
  const productMatch = url.match(/^\/app\/shop\/products\/([^/]+)$/);
  if (productMatch && method === "GET") {
    const product = findProduct(decodeURIComponent(productMatch[1]));
    return product ? { data: product } : fail(404, "NOT_FOUND", "Product not found.");
  }
  if (url === "/app/shop/cart" && method === "GET") return { data: cartView() };
  if (url === "/app/shop/cart" && method === "PUT") return putCart(body);
  if (url === "/app/shop/fulfilment-options") return { data: fulfilmentOptions };
  if (url === "/app/shop/addresses" && method === "GET") return { data: { items: addresses } };
  if (url === "/app/shop/addresses" && method === "POST") {
    const row: Record<string, unknown> = { id: `eadr_${Date.now()}`, label: "Address", version: 1, ...(body ?? {}) };
    if (row.isDefault) addresses.forEach((a) => (a.isDefault = false));
    addresses.push(row);
    return { data: row };
  }
  if (url === "/app/shop/quotes" && method === "POST") return createQuote(body);
  const quoteCancel = url.match(/^\/app\/shop\/quotes\/([^/]+)\/cancel$/);
  if (quoteCancel && method === "POST") {
    const q = quotes.get(quoteCancel[1]);
    if (!q) return fail(404, "NOT_FOUND", "Quote not found.");
    q.status = "CANCELLED";
    return { data: q };
  }
  const quoteGet = url.match(/^\/app\/shop\/quotes\/([^/]+)$/);
  if (quoteGet && method === "GET") {
    const q = quotes.get(quoteGet[1]);
    if (!q) return fail(404, "NOT_FOUND", "This price preview has expired.");
    if (q.status === "ACTIVE" && Date.parse(String(q.expiresAt)) < Date.now()) q.status = "EXPIRED";
    return { data: q };
  }
  if (url === "/app/shop/orders" && method === "POST") return createOrder(body);
  if (url === "/app/shop/orders" && method === "GET") return { data: { items: orders } };
  const intentPoll = url.match(/^\/app\/shop\/orders\/([^/]+)\/payment-intents\/([^/]+)$/);
  if (intentPoll && method === "GET") {
    const order = orders.find((o) => o.id === intentPoll[1]);
    if (order && order.status === "PENDING_PAYMENT") {
      Object.assign(order, customerFacing({ ...order, status: "PAID", paymentCompleted: true, paidAt: new Date().toISOString(), invoiceAvailable: true }));
    }
    return { data: { paymentIntent: { id: intentPoll[2], status: "COMPLETED", orderId: intentPoll[1] } } };
  }
  const intentCreate = url.match(/^\/app\/shop\/orders\/([^/]+)\/payment-intents$/);
  if (intentCreate && method === "POST") {
    const id = `epay_${Date.now()}`;
    paymentAttempts.set(id, { id, orderId: intentCreate[1] });
    return { data: { paymentIntent: { id, status: "INITIATED", token: `mock-token-${id}`, idempotencyKey: id } } };
  }
  const orderCancel = url.match(/^\/app\/shop\/orders\/([^/]+)\/cancel$/);
  if (orderCancel && method === "POST") {
    const order = orders.find((o) => o.id === orderCancel[1]);
    if (!order) return fail(404, "NOT_FOUND", "Order not found.");
    Object.assign(order, customerFacing({ ...order, status: "CANCELLED", stockReleaseReason: "CUSTOMER_CANCELLED" }));
    return { data: order };
  }
  const orderReturn = url.match(/^\/app\/shop\/orders\/([^/]+)\/return$/);
  if (orderReturn && method === "GET") return { data: { request: null } };
  const orderGet = url.match(/^\/app\/shop\/orders\/([^/]+)$/);
  if (orderGet && method === "GET") {
    const order = orders.find((o) => o.id === orderGet[1]);
    return order ? { data: order } : fail(404, "NOT_FOUND", "Order not found.");
  }

  /* Digital Gold & Silver */
  if (url === "/app/digital-metals/capability") {
    if (!metalsOn) return { data: { ...demoDmCapability, enabled: false, active: false, canViewHoldings: false, canViewHistory: false, canPlaceNewBuy: false, canPlaceNewSell: false } };
    return { data: demoDmCapability };
  }
  if (url === "/app/digital-metals/portfolio") {
    // Mock-only: `?modules=all-new` previews a customer who hasn't bought any digital metal yet.
    if (demoModulePresetRaw() === "all-new") return { data: { ...portfolio(), items: [] } };
    return { data: portfolio() };
  }
  if (url === "/app/digital-metals/passbook") return { data: passbook() };
  if (url === "/app/digital-metals/statements/metal") return { data: { activity: passbook().items } };
  if (url === "/app/digital-metals/orders/open-summary") {
    return { data: { openBuyCount: 0, openSellCount: 1, openRedemptionCount: 1, totalOpen: 2 } };
  }
  if (url === "/app/digital-metals/buy-orders" && method === "GET") {
    return { data: { items: buyOrders, meta: { nextCursor: null, hasMore: false, limit: 20 } } };
  }
  if (url === "/app/digital-metals/sell-orders" && method === "GET") {
    return { data: { items: sellOrders, meta: { nextCursor: null, hasMore: false, limit: 20 } } };
  }
  if (url === "/app/digital-metals/redemption/orders" && method === "GET") {
    return { data: { items: redemptionOrders, meta: { nextCursor: null, hasMore: false, limit: 20 } } };
  }
  if (url === "/app/digital-metals/redemption/catalogue" && method === "GET") {
    return { data: { items: demoRedemptionCatalogue.filter((c) => c.active).map(catalogueItem) } };
  }
  if (url === "/app/digital-metals/bank-destinations" && method === "GET") return { data: { items: [bank] } };
  if (url === "/app/digital-metals/quotes/buy" && method === "POST") return { data: buyQuote(body) };
  if (url === "/app/digital-metals/quotes/sell" && method === "POST") return { data: sellQuote(body) };

  return undefined;
}
