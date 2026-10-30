/** Shapes for counter trades (staff-assisted Digi Gold buy/sell and store orders) and summaries. */

export type CounterPaymentMode = "CASH" | "UPI" | "CARD";
export type DmMetal = "GOLD" | "SILVER";

export type DmRateRow = {
  metal: DmMetal;
  finenessPpm: number;
  buyRatePerGramPaise: number | null;
  sellRatePerGramPaise: number | null;
  effectiveAt: string | null;
};

export type CustomerDigitalMetalsSummary = {
  moduleActive: boolean;
  hasActivity: boolean;
  holdings: {
    metal: DmMetal;
    finenessPpm: number;
    heldUg: string;
    reservedUg: string;
    availableUg: string;
    sellRatePerGramPaise: number | null;
    valuePaise: number;
  }[];
  totals: { valuePaise: number; goldUg: string; silverUg: string };
  bought: { count: number; paidPaise: number; quantityUg: string; counterCount: number };
  sold: { count: number; settlementPaise: number; quantityUg: string };
  pendingSells: number;
  openPayables: { count: number; outstandingPaise: number; cashDueCount: number };
  rates: DmRateRow[];
  lastActivityAt: string | null;
};

export type DigitalMetalsDashboardSummary = {
  moduleActive: boolean;
  paused: boolean;
  period: { from?: string; to?: string; timezone: string };
  asOf: string;
  rates: DmRateRow[];
  holdings: { metal: DmMetal; finenessPpm: number; heldUg: string; customers: number; valuePaise: number }[];
  totals: { valuePaise: number; customersHolding: number };
  buys: {
    count: number;
    amountPaise: number;
    quantityUg: string;
    customers: number;
    counterCount: number;
    counterAmountPaise: number;
    /** Weight per metal (GOLD / SILVER) — never add gold and silver grams together. */
    byMetal?: Record<string, { quantityUg: string; count: number }>;
  };
  sells: {
    count: number;
    amountPaise: number;
    quantityUg: string;
    byMetal?: Record<string, { quantityUg: string; count: number }>;
  };
  netInflowPaise: number;
  newInvestors: number;
  queues: { sellsToApprove: number; openPayables: number; outstandingPaise: number; cashPayoutsDue: number };
  trend: { date: string; buyPaise: number; sellPaise: number }[];
};

export type CustomerEcommerceSummary = {
  customerId: string;
  orderCount: number;
  grossCollectedPaise: number;
  netCollectedPaise: number;
  refundOutflowPaise: number;
  openOrders: number;
  itemsBought: number;
  counterOrders: { count: number; amountPaise: number };
  lastOrder: { id: string; orderNumber: string; status: string; totalPaise: number; createdAt: string | null } | null;
};

export type DmCounterQuote = {
  quoteId: string;
  expiresAt: string;
  metal: DmMetal;
  finenessPpm: number;
  quantityUg: string | number;
  metalQuantityUg?: string;
  metalSubtotalPaise?: number;
  feePaise?: number;
  taxPaise?: number;
  taxLines?: { code?: string; ratePercent?: number; amountPaise?: number }[];
  totalPayablePaise?: number;
  settlementPaise?: number;
  budgetRemainderPaise?: number;
  rateSnapshot?: { buyRatePerGramPaise?: number; sellRatePerGramPaise?: number };
  termsVersion?: string;
};

export type CounterOrderOptions = {
  customerId: string;
  pickup: { enabled: boolean; branches: { id: string; name: string; code?: string }[] };
  delivery: { enabled: boolean; deliveryChargePaise: number | null };
  defaultPickupBranchId: string | null;
  addresses: {
    id: string;
    label: string;
    recipientName: string;
    line1: string;
    line2: string;
    city: string;
    state: string;
    pincode: string;
    isDefault: boolean;
  }[];
  checkoutTaxReady: boolean;
  blockers: { code?: string; message?: string }[];
  paymentModes: CounterPaymentMode[];
};

export type CounterOrderQuote = {
  id: string;
  status: string;
  lines: { productId: string; name: string; sku?: string; quantity: number; unitPricePaise: number; lineTotalPaise: number }[];
  fulfilmentMode: "BRANCH_PICKUP" | "DELIVERY";
  pickupBranchId: string | null;
  subtotalPaise: number;
  taxPaise: number;
  fulfilmentChargePaise: number;
  totalPaise: number;
  expiresAt: string;
};
