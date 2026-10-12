"use client";

import type { EcommerceAdminReportKey } from "@/src/types/admin-report";

const DEFINITIONS: Record<EcommerceAdminReportKey, { title: string; lines: string[] }> = {
  ECOMMERCE_SALES: {
    title: "Sales & collections",
    lines: [
      "Online collected: online orders with paidAt in the selected period (confirmed gateway payment).",
      "COD collected: cash recorded in the period (codCollection.collectedAt), not merely placed or accepted.",
      "Refund outflow: provider succeeded refunds plus manual refund records in the period.",
      "Net collections: gross collected minus refund outflow. Scheme collections are excluded.",
    ],
  },
  ECOMMERCE_ORDERS_FULFILMENT: {
    title: "Orders & fulfilment",
    lines: [
      "Counts orders placed (createdAt) in the period by current status.",
      "Pipeline snapshot KPIs on the dashboard use live counts, not this period filter.",
    ],
  },
  ECOMMERCE_PRODUCTS: {
    title: "Products",
    lines: [
      "Units and collected line totals from checkout snapshots on orders collected in the period.",
      "Not placed-order value for unpaid or uncollected COD.",
    ],
  },
};

export function EcommerceReportDefinitions({ reportKey }: { reportKey: EcommerceAdminReportKey }) {
  const block = DEFINITIONS[reportKey];
  return (
    <div className="rounded-xl border border-[#e4d7d2] bg-[#faf7f5] px-4 py-3 text-sm text-[#5c4a50]">
      <p className="font-semibold text-[#28161a]">{block.title} — definitions</p>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        {block.lines.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </div>
  );
}
