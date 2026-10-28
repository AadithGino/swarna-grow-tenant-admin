import type { AssistantBundle } from "@/src/types/assistant";

/**
 * Demo answers for mock mode (NEXT_PUBLIC_USE_MOCKS) — fictional shop data shaped exactly
 * like the agent engine's bundles, so the Sidekick UI can be previewed without the API.
 */

const money = (rupees: number) => ({ cell: "currency", value: rupees * 100, display: `₹${rupees.toLocaleString("en-IN")}` });
const when = (iso: string, display: string) => ({ cell: "datetime", value: iso, display });

function days(n: number) {
  const out: string[] = [];
  const base = new Date("2026-10-24T12:00:00+05:30");
  for (let i = n - 1; i >= 0; i -= 1) {
    const d = new Date(base);
    d.setDate(d.getDate() - i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

const base = (q: string): Pick<AssistantBundle, "engine" | "asOf" | "conversationId" | "messageId"> => ({
  engine: "agent",
  asOf: new Date().toISOString(),
  conversationId: "acv_mock",
  messageId: `amg_mock_${q.length}_${Date.now()}`,
});

export function mockAgentAnswer(message: string): AssistantBundle {
  const q = message.toLowerCase();

  if (/compare|vs|cash and upi|cash vs/.test(q)) {
    const ds = days(14);
    const cash = [4200, 0, 8000, 18000, 1500, 9000, 0, 4550, 2000, 6100, 3000, 0, 2000, 10000];
    const upi = [0, 1200, 0, 3500, 0, 2400, 900, 0, 1800, 0, 700, 1500, 0, 2600];
    return {
      ...base(q),
      summaryText: "Cash vs UPI · last 14 days",
      narrative:
        "Cash still carries most of your collection: **₹68,350** in cash against **₹14,600** by UPI over the last 14 days. Your biggest day was 13 Oct with ₹18,000 in cash.",
      statCards: [],
      chart: null,
      table: null,
      blocks: [
        {
          type: "stats",
          cards: [
            { label: "Cash (net)", value: 6_835_000, valueType: "currency", delta: 12.4, previous: 6_080_000, previousLabel: "previous 14 days" },
            { label: "UPI (net)", value: 1_460_000, valueType: "currency", delta: -8.1, previous: 1_590_000, previousLabel: "previous 14 days" },
            { label: "Payments", value: 47, valueType: "count" },
          ],
        },
        {
          type: "chart",
          chart: {
            type: "line",
            title: "Daily collection by payment mode (net)",
            yAxisType: "currency",
            series: [
              { name: "Cash", data: ds.map((x, i) => ({ x, y: cash[i] * 100 })) },
              { name: "UPI", data: ds.map((x, i) => ({ x, y: upi[i] * 100 })) },
            ],
          },
        },
      ],
      steps: [
        { id: "s1", label: "Comparing cash and UPI day by day", status: "done", detail: "14 Oct – 24 Oct 2026", tool: "collection_trend" },
      ],
      followUps: ["Which staff collected the most cash?", "UPI payments this month", "Show the daily table"],
      appliedFilters: { subject: "Collections", dateRange: "11 Oct – 24 Oct 2026" },
    };
  }

  if (/top|most|highest|best|sabse/.test(q)) {
    const rows = [
      ["Lakshmi Menon", 42000, 7],
      ["Arjun Pillai", 36500, 5],
      ["Fathima Rasheed", 30000, 4],
      ["Suresh Nair", 24000, 6],
      ["Divya Thomas", 18000, 3],
    ] as const;
    return {
      ...base(q),
      summaryText: "Top customers this month",
      narrative:
        "**Lakshmi Menon** is your top payer this month with **₹42,000** across 7 payments. Your top 5 together brought in ₹1,50,500.",
      statCards: [],
      chart: null,
      table: null,
      blocks: [
        {
          type: "chart",
          chart: {
            type: "bar",
            title: "Total amount by customer",
            yAxisType: "currency",
            series: [{ name: "Total amount", data: rows.map(([x, y]) => ({ x, y: y * 100 })) }],
          },
        },
        {
          type: "table",
          title: "Payments · 1 Oct – 24 Oct 2026",
          table: {
            columns: [
              { key: "customer", label: "Customer", type: "text" },
              { key: "sum_amount", label: "Total amount", type: "currency" },
              { key: "count", label: "Count", type: "count" },
            ],
            rows: rows.map(([name, amt, count], i) => ({ id: `r${i}`, customer: name, sum_amount: money(amt), count })),
          },
          rowCount: 5,
          exportable: { entity: "dataQuery", fields: ["customer", "sum_amount", "count"] },
          action: { kind: "dataQuery", spec: { entity: "payments", groupBy: ["customer"] } },
        },
      ],
      steps: [{ id: "s1", label: "Ranking customers by amount paid", status: "done", detail: "5 groups", tool: "query_data" }],
      followUps: ["Who hasn't paid this month?", "Top customers last month", "Compare with last month"],
      appliedFilters: { subject: "Payments", dateRange: "1 Oct – 24 Oct 2026" },
    };
  }

  if (/overdue|due|defaulter|late/.test(q)) {
    const rows = [
      ["Ramesh Kumar", "Gold 360", 3, 9000],
      ["Anitha George", "Swarna 11", 2, 4000],
      ["Biju Varghese", "Gold 360", 2, 6000],
    ] as const;
    return {
      ...base(q),
      summaryText: "Customers with overdue instalments",
      narrative: "3 customers have 2 or more overdue instalments. **Ramesh Kumar** is furthest behind with 3 instalments (₹9,000) due.",
      statCards: [],
      chart: null,
      table: null,
      blocks: [
        {
          type: "table",
          table: {
            columns: [
              { key: "customer.name", label: "Customer", type: "text" },
              { key: "planName", label: "Plan", type: "text" },
              { key: "overdueInstallments", label: "Overdue instalments", type: "count" },
              { key: "overdueAmount", label: "Overdue amount", type: "currency" },
            ],
            rows: rows.map(([name, plan, n, amt], i) => ({
              id: `o${i}`,
              "customer.name": name,
              planName: plan,
              overdueInstallments: n,
              overdueAmount: money(amt),
            })),
          },
          rowCount: 3,
          exportable: { entity: "dataQuery", fields: ["customer.name", "planName", "overdueInstallments", "overdueAmount"] },
          action: { kind: "dataQuery", spec: { entity: "schemes" } },
        },
      ],
      steps: [{ id: "s1", label: "Checking overdue instalments", status: "done", detail: "3 records found", tool: "query_data" }],
      followUps: ["Send them a reminder", "Overdue by branch", "Who is overdue in Gold 360?"],
      appliedFilters: { subject: "Scheme enrolments", dateRange: "All time" },
    };
  }

  if (/upi|last|latest|when/.test(q)) {
    return {
      ...base(q),
      summaryText: "Last UPI payment",
      narrative: "Your last UPI payment was on **30 Sep 2026, 4:12 pm** — ₹100 from Ramesh Kumar for Gold 360. No UPI payments have come in since then.",
      statCards: [],
      chart: null,
      table: null,
      blocks: [
        {
          type: "table",
          title: "Payments",
          table: {
            columns: [
              { key: "paidAt", label: "Paid at", type: "datetime" },
              { key: "receiptNumber", label: "Receipt", type: "text" },
              { key: "customer.name", label: "Customer", type: "text" },
              { key: "amount", label: "Amount", type: "currency" },
              { key: "mode", label: "Mode", type: "text" },
              { key: "scheme.planName", label: "Plan", type: "text" },
              { key: "collectedBy.name", label: "Collected by", type: "text" },
            ],
            rows: [
              {
                id: "p1",
                paidAt: when("2026-09-30T10:42:00.000Z", "30 Sep 2026, 4:12 pm"),
                receiptNumber: "RCP-2026-0912",
                "customer.name": "Ramesh Kumar",
                amount: money(100),
                mode: "UPI",
                "scheme.planName": "Gold 360",
                "collectedBy.name": "Sreeja (Kochi)",
              },
            ],
          },
          rowCount: 1,
        },
      ],
      steps: [{ id: "s1", label: "Finding your latest UPI payment", status: "done", detail: "1 record found", tool: "query_data" }],
      followUps: ["UPI payments this month", "Compare cash and UPI", "Ramesh Kumar's scheme status"],
      appliedFilters: { subject: "Payments", dateRange: "All time", grouping: "mode eq UPI" },
    };
  }

  return {
    ...base(q),
    summaryText: "Sidekick",
    narrative:
      "I can answer anything about your shop's data — collections, payments by mode, overdue customers, enrolments, maturities, staff, Digi Gold and store orders — in English, Hinglish, Hindi or Malayalam. (This is a preview: connect the API to see your live data.)",
    statCards: [],
    chart: null,
    table: null,
    blocks: [],
    steps: [],
    followUps: ["When was my last UPI payment?", "Who are my top 5 customers this month?", "Compare cash and UPI"],
  };
}
