"use client";

import { useGetEcommerceCategoriesQuery } from "@/src/store/api/admin-api";
import { PageHeader, Surface } from "@/src/components/common/page-parts";
import { PageSkeleton, QueryError } from "@/src/components/common/query-state";
import { StatusBadge } from "@/src/components/common/status-badge";

export function EcommerceCategoriesPage() {
  const query = useGetEcommerceCategoriesQuery(undefined);
  if (query.isLoading) return <PageSkeleton cards={2} />;
  if (query.isError) return <QueryError error={query.error} onRetry={query.refetch} />;
  const items = query.data?.items ?? [];
  return (
    <>
      <PageHeader
        eyebrow="Online store"
        title="Categories"
        description="Tenant-scoped category tree for the storefront."
      />
      <Surface title="All categories">
        <ul className="divide-y">
          {items.map((c) => (
            <li key={c.id} className="flex items-center justify-between px-6 py-4 text-sm">
              <div>
                <p className="font-semibold">{c.name}</p>
                <p className="text-muted-foreground">{c.slug}</p>
              </div>
              <StatusBadge status={c.active ? "ACTIVE" : "INACTIVE"} />
            </li>
          ))}
          {items.length === 0 ? (
            <li className="px-6 py-8 text-muted-foreground">No categories yet.</li>
          ) : null}
        </ul>
      </Surface>
    </>
  );
}
