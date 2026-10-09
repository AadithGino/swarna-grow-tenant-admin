"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader, Surface } from "@/src/components/common/page-parts";
import { PageSkeleton, QueryError } from "@/src/components/common/query-state";
import { StatusBadge } from "@/src/components/common/status-badge";
import { useCursorPagination } from "@/src/hooks/use-cursor-pagination";
import { CursorPagination } from "@/src/components/common/cursor-pagination";
import { emptyPageMeta } from "@/src/lib/cursor-pagination";
import { useGetEcommerceProductsQuery } from "@/src/store/api/admin-api";
import { PricingPreviewPanel } from "@/src/features/ecommerce/ecommerce-shared";
import { useEcommerceCatalogWrite } from "@/src/features/ecommerce/ecommerce-admin-shared";
import { EcommerceProductDialog } from "@/src/features/ecommerce/ecommerce-product-dialog";

export function EcommerceCatalogPage() {
  const pager = useCursorPagination(10, "ecommerce-products");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const query = useGetEcommerceProductsQuery({
    includePricing: true,
    status: statusFilter === "ALL" ? undefined : statusFilter,
    ...pager.queryParams,
  });
  const { entitled, disabledMessage } = useEcommerceCatalogWrite();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);

  if (query.isLoading) return <PageSkeleton cards={3} />;
  if (query.isError) return <QueryError error={query.error} onRetry={query.refetch} />;
  const items = query.data?.items ?? [];
  const page = {
    ...emptyPageMeta(),
    ...(query.data?.meta as Partial<typeof emptyPageMeta> | undefined),
    limit: pager.limit,
  };

  return (
    <>
      <PageHeader
        eyebrow="Online store"
        title="Catalog"
        description="Draft and published products. Displayed prices use the backend estimate only."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All statuses</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="PUBLISHED">Published</SelectItem>
                <SelectItem value="ARCHIVED">Archived</SelectItem>
              </SelectContent>
            </Select>
            <Link
              href="/ecommerce/tax"
              className="text-sm font-semibold text-[#730321] underline"
            >
              Tax settings
            </Link>
            <Button
              type="button"
              disabled={!entitled}
              onClick={() => {
                setEditing(null);
                setDialogOpen(true);
              }}
            >
              New product
            </Button>
          </div>
        }
      />
      {!entitled ? (
        <p className="mb-4 text-sm text-amber-800">{disabledMessage}</p>
      ) : null}
      <div className="grid gap-4">
        {items.length === 0 ? (
          <Surface title="No products yet">
            <p className="p-6 text-sm text-muted-foreground">Create a product to get started.</p>
          </Surface>
        ) : null}
          {items.map((p) => (
            <Surface key={p.id} title={p.name}>
              <div className="grid gap-4 p-6 md:grid-cols-2">
                <div className="space-y-2 text-sm">
                  <StatusBadge
                    status={
                      p.status === "PUBLISHED"
                        ? "ACTIVE"
                        : p.status === "ARCHIVED"
                          ? "INACTIVE"
                          : "PENDING"
                    }
                  />
                  <p>Slug: {p.slug}</p>
                  <p>SKU: {p.sku || "—"}</p>
                  <p>Price mode: {p.priceMode}</p>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={!entitled}
                    onClick={() => {
                      setEditing(p);
                      setDialogOpen(true);
                    }}
                  >
                    Edit
                  </Button>
                </div>
                <PricingPreviewPanel pricing={p.pricing} />
              </div>
            </Surface>
          ))}
      </div>
      <CursorPagination
        page={page}
        pageIndex={pager.pageIndex}
        rowCount={items.length}
        onNext={() => pager.goNext(page.nextCursor)}
        onPrevious={pager.goPrevious}
        canPrevious={pager.canPrevious}
      />
      <EcommerceProductDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        product={editing}
        onSaved={() => query.refetch()}
      />
    </>
  );
}
