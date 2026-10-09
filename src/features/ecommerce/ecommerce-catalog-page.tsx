"use client";

import Link from "next/link";
import { useGetEcommerceProductsQuery } from "@/src/store/api/admin-api";
import { PageHeader, Surface } from "@/src/components/common/page-parts";
import { PageSkeleton, QueryError } from "@/src/components/common/query-state";
import { StatusBadge } from "@/src/components/common/status-badge";
import { PricingPreviewPanel } from "@/src/features/ecommerce/ecommerce-shared";

export function EcommerceCatalogPage() {
  const query = useGetEcommerceProductsQuery({ includePricing: true });
  if (query.isLoading) return <PageSkeleton cards={3} />;
  if (query.isError) return <QueryError error={query.error} onRetry={query.refetch} />;
  const items = query.data?.items ?? [];
  return (
    <>
      <PageHeader
        eyebrow="Online store"
        title="Catalog"
        description="Draft and published products. Pricing preview comes from the backend — not calculated in the browser. Fixed prices are all-inclusive; gold-rate products use offers on making charge only (V1)."
        actions={
          <Link
            href="/ecommerce/tax"
            className="text-sm font-semibold text-[#730321] underline"
          >
            Tax settings
          </Link>
        }
      />
      <div className="grid gap-4">
        {items.length === 0 ? (
          <Surface title="No products yet">
            <p className="p-6 text-sm text-muted-foreground">
              Create products via the API or seed data. Cart and checkout are not
              available in this phase.
            </p>
          </Surface>
        ) : (
          items.map((p) => (
            <Surface key={p.id} title={p.name}>
              <div className="grid gap-4 p-6 md:grid-cols-2">
                <div className="space-y-2 text-sm">
                  <StatusBadge status={p.status === "PUBLISHED" ? "ACTIVE" : "PENDING"} />
                  <p>Slug: {p.slug}</p>
                  <p>SKU: {p.sku || "—"}</p>
                  <p>Price mode: {p.priceMode}</p>
                </div>
                <PricingPreviewPanel pricing={p.pricing} />
              </div>
            </Surface>
          ))
        )}
      </div>
    </>
  );
}
