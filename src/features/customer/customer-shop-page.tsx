"use client";

import Link from "next/link";
import {
  useGetShopAvailabilityQuery,
  useGetShopProductQuery,
  useGetShopProductsQuery,
} from "@/src/store/api/customer-api";
import { PageHeader, Surface } from "@/src/components/common/page-parts";
import { PageSkeleton, QueryError } from "@/src/components/common/query-state";
import { PricingPreviewPanel } from "@/src/features/ecommerce/ecommerce-shared";
import { ShopPriceLabel } from "@/src/features/ecommerce/ecommerce-admin-shared";

export function CustomerShopPage() {
  const availability = useGetShopAvailabilityQuery();
  const products = useGetShopProductsQuery(undefined, {
    skip: !availability.data?.available,
  });
  if (availability.isLoading) return <PageSkeleton cards={2} />;
  if (availability.isError) {
    return <QueryError error={availability.error} onRetry={availability.refetch} />;
  }
  if (!availability.data?.available) {
    return (
      <Surface title="Shop unavailable">
        <p className="p-6 text-sm text-muted-foreground">
          This jeweller&apos;s online store is not active. Enable ecommerce on your
          plan and turn on the store in Settings when available.
        </p>
      </Surface>
    );
  }
  if (products.isLoading) return <PageSkeleton cards={3} />;
  if (products.isError) {
    return <QueryError error={products.error} onRetry={products.refetch} />;
  }
  const items = products.data?.items ?? [];
  return (
    <>
      <PageHeader
        eyebrow="Shop"
        title="Browse jewellery"
        description="Displayed prices are estimates from the server. Cart and checkout are not available yet."
      />
      <div className="grid gap-4 sm:grid-cols-2">
        {items.map((p) => (
          <Link key={p.id} href={`/shop/${p.slug}`}>
            <Surface title={p.name}>
              <div className="p-4">
                <p className="text-xs uppercase text-muted-foreground">
                  {p.priceMode === "GOLD_RATE_BASED" ? "Gold-rate based" : "Fixed price"}
                </p>
                <div className="mt-2">
                  <ShopPriceLabel pricing={p.pricing} />
                </div>
              </div>
            </Surface>
          </Link>
        ))}
      </div>
    </>
  );
}

export function CustomerShopProductPage({ slug }: { slug: string }) {
  const availability = useGetShopAvailabilityQuery();
  const product = useGetShopProductQuery(slug, {
    skip: !availability.data?.available,
  });
  if (availability.isLoading || product.isLoading) return <PageSkeleton cards={2} />;
  if (!availability.data?.available) {
    return (
      <Surface title="Shop unavailable">
        <p className="p-6 text-sm text-muted-foreground">Store is not active.</p>
      </Surface>
    );
  }
  if (product.isError) {
    return <QueryError error={product.error} onRetry={product.refetch} />;
  }
  const p = product.data;
  if (!p) return null;
  return (
    <>
      <PageHeader
        eyebrow="Shop"
        title={p.name}
        description={p.description || undefined}
      />
      <Surface title="Price estimate">
        <div className="p-6">
          <PricingPreviewPanel pricing={p.pricing} />
          <p className="mt-6 text-xs text-muted-foreground">
            Add to cart and Buy now will arrive in a later release.
          </p>
        </div>
      </Surface>
    </>
  );
}
