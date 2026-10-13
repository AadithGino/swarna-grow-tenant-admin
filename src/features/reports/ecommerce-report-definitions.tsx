"use client";

import type { EcommerceAdminReportKey } from "@/src/types/admin-report";

const DEFINITIONS: Record<EcommerceAdminReportKey, { title: string; lines: string[] }> = {
  ECOMMERCE_SALES: {
    title: "Sales & collections",
    lines: [
      "Online collected: online orders with paidAt in the selected period (confirmed gateway payment).",
      "COD courier collection confirmed: courierCod.collectionConfirmedAt (courier POD; not bank receipt).",
      "COD bank remittance reconciled: net bank credit (courierCod.bankCreditedAt) in the period.",
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
    <details className="group rounded-xl border border-[#e4d7d2] bg-[#faf7f5] px-4 py-3 text-sm text-[#5c4a50]">
      <summary className="cursor-pointer font-semibold text-[#28161a] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#730321]">
        How {block.title.toLowerCase()} is calculated
      </summary>
      <ul className="mt-3 list-disc space-y-1.5 border-t border-[#eaded9] pt-3 pl-5 leading-6">
        {block.lines.map((line) => <li key={line}>{line}</li>)}
      </ul>
    </details>
  );
}
