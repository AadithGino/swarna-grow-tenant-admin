"use client";

import {
  useGetEcommerceGoldRatesCurrentQuery,
  useGetEcommerceGoldRatesHistoryQuery,
} from "@/src/store/api/admin-api";
import { PageHeader, Surface } from "@/src/components/common/page-parts";
import { PageSkeleton, QueryError } from "@/src/components/common/query-state";

export function EcommerceGoldRatesPage() {
  const current = useGetEcommerceGoldRatesCurrentQuery();
  const history = useGetEcommerceGoldRatesHistoryQuery({});
  if (current.isLoading || history.isLoading) return <PageSkeleton cards={3} />;
  if (current.isError || history.isError) {
    return (
      <QueryError
        error={current.error ?? history.error}
        onRetry={() => {
          current.refetch();
          history.refetch();
        }}
      />
    );
  }
  return (
    <>
      <PageHeader
        eyebrow="Online store"
        title="Ecommerce gold rates"
        description="18K, 22K, and 24K are managed separately from scheme daily 22K rates."
      />
      <div className="grid gap-4 md:grid-cols-3">
        {(current.data?.rates ?? []).map((row) => (
          <Surface key={row.purity} title={row.purity}>
            <div className="p-6 text-sm">
              <p className="text-2xl font-bold">
                {row.ratePerGram?.amountDisplay ?? "Not set"}
              </p>
              <p className="mt-2 text-muted-foreground">
                {row.effectiveAt
                  ? `Effective ${new Date(row.effectiveAt).toLocaleString("en-IN")}`
                  : "Publish a rate for this purity"}
              </p>
            </div>
          </Surface>
        ))}
      </div>
      <Surface title="Rate history">
        <ul className="divide-y text-sm">
          {(history.data?.items ?? []).slice(0, 20).map((row) => (
            <li key={row.id} className="flex justify-between px-6 py-3">
              <span>
                {row.purity} · {row.ratePerGram?.amountDisplay}
              </span>
              <span className="text-muted-foreground">
                {row.effectiveAt
                  ? new Date(row.effectiveAt).toLocaleString("en-IN")
                  : "—"}
              </span>
            </li>
          ))}
        </ul>
      </Surface>
    </>
  );
}
