/**
 * Mock-mode handlers for counter trades (staff buy/sell Digi Gold, store orders paid in store) and the
 * customer / dashboard summaries. Returns `undefined` for keys it does not own.
 */
import {
  DEMO_DM_RATES,
  demoBuyOrders,
  demoCommerceCustomerId,
  demoOrders,
  demoProducts,
  demoSellOrders,
} from "./commerce-demo-mocks";

const contract = (payload: unknown, meta?: unknown) => ({ __contract: true, payload, ...(meta ? { meta } : {}) });
const UG = 1_000_000;
const NOW = () => Date.now();
const iso = (ms: number) => new Date(ms).toISOString();

function customerIdFromUrl(url?: string) {
  return decodeURIComponent(url?.match(/customers\/([^/?]+)/)?.[1] ?? "");
}

const counterQuotes = new Map<string, Record<string, unknown>>();
const paidCash = new Set<string>();
let seq = 0;

function rateRows() {
  return (["GOLD", "SILVER"] as const).map((metal) => ({
    metal,
    finenessPpm: 999_000,
    buyRatePerGramPaise: DEMO_DM_RATES[metal].buy,
    sellRatePerGramPaise: DEMO_DM_RATES[metal].sell,
    effectiveAt: iso(NOW() - 30 * 60_000),
  }));
}

type AnyRow = Record<string, unknown> & { customer?: { id?: string } };

function customerHoldings(customerId: string) {
  const id = demoCommerceCustomerId(customerId);
  const buys = (demoBuyOrders as AnyRow[]).filter((o) => o.customerId === id && o.status === "CREDITED");
  const sells = (demoSellOrders as AnyRow[]).filter(
    (o) => o.customer?.id === id && ["PAYABLE_OPEN", "SETTLED"].includes(String(o.status)),
  );
  const pending = (demoSellOrders as AnyRow[]).filter((o) => o.customer?.id === id && o.status === "PENDING_APPROVAL");
  const held = { GOLD: 0, SILVER: 0 } as Record<"GOLD" | "SILVER", number>;
  const reserved = { GOLD: 0, SILVER: 0 } as Record<"GOLD" | "SILVER", number>;
  for (const b of buys) held[b.metal as "GOLD"] += Number(b.quantityUg);
  for (const s of sells) held[s.metal as "GOLD"] -= Number(s.quantityUg);
  for (const s of pending) reserved[s.metal as "GOLD"] += Number(s.quantityUg);
  // Pending sells are still held (reserved) until approval.
  for (const metal of ["GOLD", "SILVER"] as const) held[metal] = Math.max(held[metal], reserved[metal]);
  return { id, buys, sells, pending, held, reserved };
}

function customerSummary(customerId: string) {
  const { buys, sells, pending, held, reserved } = customerHoldings(customerId);
  const holdings = (["GOLD", "SILVER"] as const)
    .filter((metal) => held[metal] > 0)
    .map((metal) => ({
      metal,
      finenessPpm: 999_000,
      heldUg: String(held[metal]),
      reservedUg: String(reserved[metal]),
      availableUg: String(Math.max(0, held[metal] - reserved[metal])),
      sellRatePerGramPaise: DEMO_DM_RATES[metal].sell,
      valuePaise: Math.floor((held[metal] * DEMO_DM_RATES[metal].sell) / UG),
    }));
  const openPayables = sells.filter((s) => s.status === "PAYABLE_OPEN" && !paidCash.has(String(s.id)));
  const dates = [...buys, ...sells, ...pending].map((o) => String(o.createdAt ?? "")).sort();
  return {
    moduleActive: true,
    hasActivity: holdings.length > 0 || buys.length > 0 || sells.length > 0,
    holdings,
    totals: {
      valuePaise: holdings.reduce((s, h) => s + h.valuePaise, 0),
      goldUg: String(held.GOLD),
      silverUg: String(held.SILVER),
    },
    bought: {
      count: buys.length,
      paidPaise: buys.reduce((s, b) => s + Number(b.totalPayablePaise ?? 0), 0),
      quantityUg: String(buys.reduce((s, b) => s + Number(b.quantityUg ?? 0), 0)),
      counterCount: buys.filter((b) => b.channel === "COUNTER").length,
    },
    sold: {
      count: sells.length,
      settlementPaise: sells.reduce((s, b) => s + Number(b.settlementPaise ?? 0), 0),
      quantityUg: String(sells.reduce((s, b) => s + Number(b.quantityUg ?? 0), 0)),
    },
    pendingSells: pending.length,
    openPayables: {
      count: openPayables.length,
      outstandingPaise: openPayables.reduce((s, p) => s + Number(p.settlementPaise ?? 0), 0),
      cashDueCount: openPayables.filter((p) => p.payoutMethod === "CASH").length,
    },
    rates: rateRows(),
    lastActivityAt: dates.at(-1) ?? null,
  };
}

function dashboardSummary() {
  const credited = (demoBuyOrders as AnyRow[]).filter((o) => o.status === "CREDITED");
  const executed = (demoSellOrders as AnyRow[]).filter((o) => ["PAYABLE_OPEN", "SETTLED"].includes(String(o.status)));
  const held = { GOLD: 0, SILVER: 0 } as Record<"GOLD" | "SILVER", number>;
  const holders = { GOLD: new Set<string>(), SILVER: new Set<string>() };
  for (const b of credited) {
    held[b.metal as "GOLD"] += Number(b.quantityUg);
    holders[b.metal as "GOLD"].add(String(b.customerId));
  }
  for (const s of executed) held[s.metal as "GOLD"] = Math.max(0, held[s.metal as "GOLD"] - Number(s.quantityUg));
  const holdings = (["GOLD", "SILVER"] as const).map((metal) => ({
    metal,
    finenessPpm: 999_000,
    heldUg: String(held[metal]),
    customers: holders[metal].size,
    valuePaise: Math.floor((held[metal] * DEMO_DM_RATES[metal].sell) / UG),
  }));
  const buysAmount = credited.reduce((s, b) => s + Number(b.totalPayablePaise ?? 0), 0);
  const sellsAmount = executed.reduce((s, b) => s + Number(b.settlementPaise ?? 0), 0);
  const trend = Array.from({ length: 14 }, (_, i) => {
    const day = new Date(NOW() - (13 - i) * 86_400_000);
    const ymd = day.toISOString().slice(0, 10);
    const sameDay = (v: unknown) => String(v ?? "").slice(0, 10) === ymd;
    return {
      date: ymd,
      buyPaise: credited.filter((b) => sameDay(b.creditedAt ?? b.createdAt)).reduce((s, b) => s + Number(b.totalPayablePaise ?? 0), 0)
        || Math.round(180_000_00 * (0.6 + 0.4 * Math.sin(i / 2.1 + 1)) * (i % 6 === 5 ? 0.4 : 1)),
      sellPaise: executed.filter((s) => sameDay(s.executedAt)).reduce((t, s) => t + Number(s.settlementPaise ?? 0), 0)
        || Math.round(42_000_00 * (0.5 + 0.5 * Math.cos(i / 1.7))),
    };
  });
  const openPayables = executed.filter((s) => s.status === "PAYABLE_OPEN" && !paidCash.has(String(s.id)));
  return {
    moduleActive: true,
    paused: false,
    period: { timezone: "Asia/Kolkata" },
    asOf: iso(NOW()),
    rates: rateRows(),
    holdings,
    totals: {
      valuePaise: holdings.reduce((s, h) => s + h.valuePaise, 0),
      customersHolding: new Set(credited.map((b) => String(b.customerId))).size,
    },
    buys: {
      count: credited.length,
      amountPaise: buysAmount,
      quantityUg: String(credited.reduce((s, b) => s + Number(b.quantityUg), 0)),
      customers: new Set(credited.map((b) => String(b.customerId))).size,
      counterCount: credited.filter((b) => b.channel === "COUNTER").length + 3,
      counterAmountPaise:
        credited.filter((b) => b.channel === "COUNTER").reduce((s, b) => s + Number(b.totalPayablePaise ?? 0), 0)
        + Math.round(buysAmount * 0.3),
    },
    sells: {
      count: executed.length,
      amountPaise: sellsAmount,
      quantityUg: String(executed.reduce((s, b) => s + Number(b.quantityUg), 0)),
    },
    netInflowPaise: buysAmount - sellsAmount,
    newInvestors: 3,
    queues: {
      sellsToApprove: (demoSellOrders as AnyRow[]).filter((s) => s.status === "PENDING_APPROVAL").length,
      openPayables: openPayables.length,
      outstandingPaise: openPayables.reduce((s, p) => s + Number(p.settlementPaise ?? 0), 0),
      cashPayoutsDue: openPayables.filter((p) => p.payoutMethod === "CASH").length,
    },
    trend,
  };
}

function storeSummary(customerId: string) {
  const id = demoCommerceCustomerId(customerId);
  const orders = (demoOrders as AnyRow[]).filter((o) => o.customerId === id);
  const paid = orders.filter((o) => o.paidAt);
  const open = orders.filter((o) => ["COD_PENDING_ACCEPTANCE", "PAID", "PROCESSING", "READY_FOR_PICKUP", "SHIPPED"].includes(String(o.status)));
  const counter = orders.filter((o) => o.channel === "COUNTER");
  const last = [...orders].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))[0];
  const gross = paid.reduce((s, o) => s + Number(o.totalPaise ?? 0), 0);
  return {
    customerId: id,
    orderCount: orders.length,
    grossCollectedPaise: gross,
    netCollectedPaise: gross,
    refundOutflowPaise: 0,
    openOrders: open.length,
    itemsBought: paid.reduce((s, o) => s + ((o.lines as { quantity: number }[]) ?? []).reduce((t, l) => t + l.quantity, 0), 0),
    counterOrders: { count: counter.length, amountPaise: counter.reduce((s, o) => s + Number(o.totalPaise ?? 0), 0) },
    lastOrder: last
      ? { id: last.id, orderNumber: last.orderNumber, status: last.status, totalPaise: last.totalPaise, createdAt: last.createdAt }
      : null,
  };
}

function productUnitPaise(productId: string) {
  const p = demoProducts.find((x) => x.id === productId) as Record<string, any> | undefined;
  return Number(p?.pricing?.displayTotal?.amountPaise ?? 0);
}

export function counterTradeMock(
  mockKey: string,
  params: Record<string, unknown>,
  body: Record<string, unknown>,
  url?: string,
): unknown | undefined {
  const customerId = customerIdFromUrl(url) || String(params.customerId ?? "");
  switch (mockKey) {
    case "digitalMetalsCustomerSummary":
      return contract(customerSummary(customerId));
    case "digitalMetalsDashboardSummary":
      return contract(dashboardSummary());
    case "customerEcommerceSummary":
      return contract(storeSummary(customerId));
    case "customerEcommerceOrdersMeta":
      return contract({ customerId, hasOrderHistory: storeSummary(customerId).orderCount > 0 });
    case "customerEcommerceOrders": {
      const id = demoCommerceCustomerId(customerId);
      const rows = (demoOrders as AnyRow[])
        .filter((o) => o.customerId === id)
        .map((o) => ({
          id: o.id,
          orderNumber: o.orderNumber,
          createdAt: o.createdAt,
          itemSummary: ((o.lines as { name: string; quantity: number }[]) ?? []).map((l) => `${l.name} × ${l.quantity}`).join(", "),
          totalPaise: o.totalPaise,
          status: o.status,
          attentionLabel: null,
        }));
      return contract(rows, { hasMore: false, nextCursor: null, limit: 25, ecommerceSummary: storeSummary(customerId) });
    }
    case "digitalMetalsCustomerWallets": {
      const s = customerSummary(customerId);
      return contract({
        items: s.holdings.map((h) => ({
          id: `dmw_${h.metal.toLowerCase()}`,
          metal: h.metal,
          finenessPpm: h.finenessPpm,
          heldUg: h.heldUg,
          reservedUg: h.reservedUg,
          availableUg: h.availableUg,
          pendingBuyUg: "0",
        })),
      });
    }
    case "digitalMetalsCustomerPassbook": {
      const { buys, sells } = customerHoldings(customerId);
      const rows = [
        ...buys.map((b) => ({ id: `j_${b.id}`, entryType: "CREDIT", quantityUgDelta: String(b.quantityUg), metal: b.metal, createdAt: b.createdAt })),
        ...sells.map((s) => ({ id: `j_${s.id}`, entryType: "DEBIT", quantityUgDelta: `-${s.quantityUg}`, metal: s.metal, createdAt: s.executedAt ?? s.createdAt })),
      ].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
      return contract({ items: rows, meta: { nextCursor: null, hasMore: false, limit: 25 } });
    }
    case "digitalMetalsCustomerRiskHolds":
      return contract({ items: [] });
    case "digitalMetalsCustomerBankDestinations": {
      const id = demoCommerceCustomerId(customerId);
      const sell = (demoSellOrders as AnyRow[]).find((s) => s.customer?.id === id);
      const bank = (sell?.bankDestination as Record<string, unknown> | undefined) ?? {
        accountHolderName: "Customer",
        accountLast4: "4821",
        ifsc: "SBIN0070263",
        bankName: "State Bank of India",
        status: "ACTIVE",
      };
      return contract({ items: [{ id: `dmbd_${id}`, ...bank, verifiedAt: iso(NOW() - 40 * 86_400_000) }] });
    }

    case "digitalMetalsCounterBuyQuote":
    case "digitalMetalsCounterSellQuote": {
      const side = mockKey === "digitalMetalsCounterBuyQuote" ? "BUY" : "SELL";
      const metal = (body.metal === "SILVER" ? "SILVER" : "GOLD") as "GOLD" | "SILVER";
      const rate = side === "BUY" ? DEMO_DM_RATES[metal].buy : DEMO_DM_RATES[metal].sell;
      let quantityUg = Number(body.quantityUg ?? 0);
      if (side === "BUY" && body.inputMode === "BUDGET_INR") {
        quantityUg = Math.floor((Number(body.budgetPaise ?? 0) / 1.03 / rate) * UG);
      }
      const metalSubtotalPaise = Math.floor((quantityUg * rate) / UG);
      const taxPaise = side === "BUY" ? Math.round(metalSubtotalPaise * 0.03) : 0;
      const quoteId = `dmq_ctr_${++seq}`;
      const quote = {
        quoteId,
        expiresAt: iso(NOW() + 15 * 60_000),
        metal,
        finenessPpm: 999_000,
        quantityUg: String(quantityUg),
        metalQuantityUg: String(quantityUg),
        metalSubtotalPaise,
        feePaise: 0,
        taxPaise,
        taxLines: taxPaise ? [{ code: "GST", ratePercent: 3, amountPaise: taxPaise }] : [],
        ...(side === "BUY"
          ? {
              totalPayablePaise: metalSubtotalPaise + taxPaise,
              budgetRemainderPaise: body.inputMode === "BUDGET_INR" ? Number(body.budgetPaise ?? 0) - metalSubtotalPaise - taxPaise : 0,
              rateSnapshot: { buyRatePerGramPaise: rate },
            }
          : { settlementPaise: metalSubtotalPaise, rateSnapshot: { sellRatePerGramPaise: rate } }),
        termsVersion: "2026-10-01",
        customerId,
      };
      counterQuotes.set(quoteId, quote);
      return contract(quote);
    }
    case "digitalMetalsCounterBuy": {
      const q = counterQuotes.get(String(body.quoteId));
      if (!q) throw { status: 404, data: { code: "NOT_FOUND", message: "Quote not found" } };
      const cid = demoCommerceCustomerId(customerId);
      const customer = (demoBuyOrders as AnyRow[]).find((o) => o.customerId === cid)?.customer ?? { id: cid };
      const order = {
        id: `dmbo_ctr${seq}`,
        status: "CREDITED",
        channel: "COUNTER",
        metal: q.metal,
        finenessPpm: 999_000,
        quantityUg: q.quantityUg,
        totalPayablePaise: q.totalPayablePaise,
        buyRatePerGramPaise: (q.rateSnapshot as { buyRatePerGramPaise: number }).buyRatePerGramPaise,
        invoiceStatus: "PENDING",
        customerId: cid,
        customer,
        createdAt: iso(NOW()),
        creditedAt: iso(NOW()),
        assisted: { paymentMode: body.paymentMode, paymentReference: body.paymentReference ?? "", recordedAt: iso(NOW()) },
        paymentAttempts: [],
      };
      (demoBuyOrders as AnyRow[]).unshift(order);
      return contract({ order, cashCustody: body.paymentMode === "CASH" ? "STAFF" : null });
    }
    case "digitalMetalsCounterSell": {
      const q = counterQuotes.get(String(body.quoteId));
      if (!q) throw { status: 404, data: { code: "NOT_FOUND", message: "Quote not found" } };
      const cid = demoCommerceCustomerId(customerId);
      const customer = (demoSellOrders as AnyRow[]).find((o) => o.customer?.id === cid)?.customer
        ?? (demoBuyOrders as AnyRow[]).find((o) => o.customerId === cid)?.customer
        ?? { id: cid };
      const order = {
        id: `dmso_ctr${seq}`,
        status: "PENDING_APPROVAL",
        payoutMethod: body.payoutMethod,
        assisted: { channel: "COUNTER", recordedAt: iso(NOW()) },
        metal: q.metal,
        finenessPpm: 999_000,
        quantityUg: q.quantityUg,
        settlementPaise: q.settlementPaise,
        createdAt: iso(NOW()),
        confirmedAt: iso(NOW()),
        approvalExpiresAt: iso(NOW() + 30 * 60_000),
        customer,
        version: 1,
        sellSummary: { sellRatePerGramPaise: (q.rateSnapshot as { sellRatePerGramPaise: number }).sellRatePerGramPaise },
      };
      (demoSellOrders as AnyRow[]).unshift(order);
      return contract({ order });
    }
    case "approveDigitalMetalsSellOrder": {
      const orderId = decodeURIComponent(url?.match(/sell-orders\/([^/]+)\/approve/)?.[1] ?? "");
      const idx = (demoSellOrders as AnyRow[]).findIndex((o) => o.id === orderId);
      const current = (demoSellOrders as AnyRow[])[idx];
      if (!current || !String(current.id).startsWith("dmso_ctr")) return undefined;
      const order = {
        ...current,
        status: "PAYABLE_OPEN",
        executedAt: iso(NOW()),
        payable: { status: "OPEN", outstandingPaise: current.settlementPaise },
      };
      (demoSellOrders as AnyRow[])[idx] = order;
      return contract({ ...order, payableOpen: true });
    }
    case "digitalMetalsSellCashPayout": {
      const orderId = decodeURIComponent(url?.match(/sell-orders\/([^/]+)\/cash-payout/)?.[1] ?? "");
      const idx = (demoSellOrders as AnyRow[]).findIndex((o) => o.id === orderId);
      const current = (demoSellOrders as AnyRow[])[idx];
      if (!current) throw { status: 404, data: { code: "NOT_FOUND", message: "Sell order not found" } };
      if (current.status !== "PAYABLE_OPEN") {
        throw { status: 409, data: { code: "SELL_NOT_APPROVED", message: "Approve the sell before paying the customer." } };
      }
      const already = paidCash.has(orderId);
      paidCash.add(orderId);
      const order: AnyRow = { ...current, payable: { status: "SETTLED", outstandingPaise: 0 } };
      (demoSellOrders as AnyRow[])[idx] = order;
      return contract({
        order,
        payable: { id: `dmpaybl_${orderId}`, amountPaise: order.settlementPaise, outstandingPaise: 0, status: "SETTLED", settledAt: iso(NOW()) },
        alreadyPaid: already,
        cashCustody: "STAFF",
      });
    }

    case "customerCounterOrderOptions":
      return contract({
        customerId,
        pickup: {
          enabled: true,
          branches: [
            { id: "br_kochi", name: "Kochi Main", code: "KOC" },
            { id: "br_tvm", name: "Trivandrum", code: "TVM" },
            { id: "br_kzd", name: "Kozhikode", code: "KZD" },
          ],
        },
        delivery: { enabled: true, deliveryChargePaise: 15_000 },
        defaultPickupBranchId: "br_kochi",
        addresses: [
          {
            id: "eaddr_home",
            label: "Home",
            recipientName: "Anjali Nair",
            line1: "TC 24/1180, Kowdiar Gardens",
            line2: "Near Kowdiar Palace",
            city: "Thiruvananthapuram",
            state: "Kerala",
            pincode: "695003",
            isDefault: true,
          },
        ],
        checkoutTaxReady: true,
        blockers: [],
        paymentModes: ["CASH", "UPI", "CARD"],
      });
    case "customerCounterOrderQuote": {
      const lines = ((body.lines as { productId: string; quantity: number }[]) ?? []).map((l) => {
        const p = demoProducts.find((x) => x.id === l.productId) as Record<string, any> | undefined;
        const gross = productUnitPaise(l.productId);
        const unit = Math.round(gross / 1.03);
        return { productId: l.productId, name: p?.name ?? "Item", sku: p?.sku, quantity: l.quantity, unitPricePaise: unit, lineTotalPaise: unit * l.quantity };
      });
      const subtotalPaise = lines.reduce((s, l) => s + l.lineTotalPaise, 0);
      const taxPaise = Math.round(subtotalPaise * 0.03);
      const fulfilmentChargePaise = body.fulfilmentMode === "DELIVERY" ? 15_000 : 0;
      const quote = {
        id: `equote_ctr${++seq}`,
        status: "ACTIVE",
        lines,
        fulfilmentMode: body.fulfilmentMode,
        pickupBranchId: body.pickupBranchId ?? null,
        subtotalPaise,
        taxPaise,
        fulfilmentChargePaise,
        totalPaise: subtotalPaise + taxPaise + fulfilmentChargePaise,
        expiresAt: iso(NOW() + 15 * 60_000),
      };
      counterQuotes.set(quote.id, quote);
      return contract(quote);
    }
    case "customerCounterOrder": {
      const q = counterQuotes.get(String(body.quoteId));
      if (!q) throw { status: 404, data: { code: "NOT_FOUND", message: "Quote not found" } };
      const cid = demoCommerceCustomerId(customerId);
      const n = 1049 + seq;
      const order = {
        id: `eord_${n}`,
        orderNumber: `SG-${n}`,
        status: "PAID",
        statusLabel: "Paid — ready to process",
        channel: "COUNTER",
        paymentMethod: "ONLINE",
        paymentCompleted: true,
        paidAt: iso(NOW()),
        fulfilmentMode: q.fulfilmentMode === "DELIVERY" ? "DELIVERY" : "PICKUP",
        lines: q.lines,
        subtotalPaise: q.subtotalPaise,
        taxPaise: q.taxPaise,
        fulfilmentChargePaise: q.fulfilmentChargePaise,
        totalPaise: q.totalPaise,
        createdAt: iso(NOW()),
        customerId: cid,
        customerDisplay:
          (demoOrders as AnyRow[]).find((o) => o.customerId === cid)?.customerDisplay
          ?? { customerId: cid, name: "Customer", maskedMobile: "", customerNumber: "" },
        assisted: { paymentMode: body.paymentMode, paymentReference: body.paymentReference ?? "", recordedAt: iso(NOW()) },
        version: 1,
      };
      (demoOrders as AnyRow[]).unshift(order);
      return contract({ order, cashCustody: body.paymentMode === "CASH" ? "STAFF" : null });
    }
    default:
      return undefined;
  }
}
