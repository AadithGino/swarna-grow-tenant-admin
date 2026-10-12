"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, ImageIcon, Package, Plus, ShoppingBag, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/src/components/common/page-parts";
import { PageSkeleton, QueryError } from "@/src/components/common/query-state";
import { StatusBadge } from "@/src/components/common/status-badge";
import { useCursorPagination } from "@/src/hooks/use-cursor-pagination";
import { CursorPagination } from "@/src/components/common/cursor-pagination";
import { emptyPageMeta } from "@/src/lib/cursor-pagination";
import { useGetEcommerceProductsQuery, useGetSettingsOperationsQuery } from "@/src/store/api/admin-api";
import { PricingPreviewPanel } from "@/src/features/ecommerce/ecommerce-shared";
import { ShopPriceLabel, useEcommerceCatalogWrite } from "@/src/features/ecommerce/ecommerce-admin-shared";
import { EcommerceProductDialog } from "@/src/features/ecommerce/ecommerce-product-dialog";
import { EcommerceCatalogImage } from "@/src/features/ecommerce/ecommerce-catalog-image";
import { EcommerceSectionNav } from "@/src/features/ecommerce/ecommerce-section-nav";

export function EcommerceCatalogPage() {
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const pager = useCursorPagination(10, `ecommerce-products:${statusFilter}`);
  const query = useGetEcommerceProductsQuery({
    includePricing: true,
    status: statusFilter === "ALL" ? undefined : statusFilter,
    ...pager.queryParams,
  });
  const catalogStatsQuery = useGetEcommerceProductsQuery({
    includePricing: true,
    limit: 100,
  });
  const { entitled, disabledMessage } = useEcommerceCatalogWrite();
  const operations = useGetSettingsOperationsQuery();
  const storeActive = operations.data?.ecommerce?.active === true;
  const catalogStats = catalogStatsQuery.data?.items ?? [];
  const publishedTotal = catalogStats.filter((item) => item.status === "PUBLISHED").length;
  const computableTotal = catalogStats.filter(
    (item) => (item.pricing as { computable?: boolean } | undefined)?.computable === true,
  ).length;
  const storefrontPurchasable = storeActive && publishedTotal > 0 && computableTotal > 0;
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
        title="Product catalog"
        description="Create and manage jewellery that appears in your online store. Prices shown here are live estimates from the server."
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
            <Button
              type="button"
              disabled={!entitled}
              onClick={() => {
                setEditing(null);
                setDialogOpen(true);
              }}
            >
              <Plus className="mr-2 size-4" /> Add product
            </Button>
          </div>
        }
      />
      <EcommerceSectionNav />
      <div className="mb-6 overflow-hidden rounded-[1.7rem] bg-[#401222] px-6 py-7 text-white shadow-[0_16px_40px_rgba(64,18,34,.15)] sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div className="flex items-start gap-4">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-white/10 text-[#f1d4a4]"><ShoppingBag className="size-6" /></span>
            <div>
              <p className="text-xs font-bold uppercase tracking-[.18em] text-[#e9cda0]">Storefront</p>
              <h2 className="mt-1 font-serif text-2xl">
                {!storeActive
                  ? "Your store is not live"
                  : storefrontPurchasable
                    ? "Your store is open"
                    : "Store enabled — catalog not ready"}
              </h2>
              <p className="mt-2 max-w-lg text-sm leading-6 text-[#f2dfe5]">
                {!storeActive
                  ? "Build your catalog here. Customers can browse only after you enable the online store in Settings."
                  : storefrontPurchasable
                    ? `${publishedTotal} published product${publishedTotal === 1 ? "" : "s"} with computable prices are eligible for the customer shop (active categories only).`
                    : `The online store toggle is on, but customers need at least one published product with a computable price (currently ${publishedTotal} published, ${computableTotal} with prices). Finish tax, gold rates, and publish from this catalog.`}
              </p>
            </div>
          </div>
          <Link href="/settings" className="inline-flex items-center gap-2 rounded-xl border border-white/30 px-4 py-2.5 text-sm font-semibold hover:bg-white/10">Store settings <ArrowRight className="size-4" /></Link>
        </div>
      </div>
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        {[
          { label: "Products on this page", value: items.length, icon: Package },
          { label: "Published on this page", value: items.filter((item) => item.status === "PUBLISHED").length, icon: Sparkles },
          { label: "Drafts on this page", value: items.filter((item) => item.status === "DRAFT").length, icon: ImageIcon },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="flex items-center gap-4 rounded-2xl border border-[#ede3dd] bg-white p-4"><span className="grid size-11 place-items-center rounded-xl bg-[#f8f0ed] text-[#84364b]"><Icon className="size-5" /></span><div><p className="text-2xl font-bold text-[#37242a]">{value}</p><p className="text-xs text-muted-foreground">{label}</p></div></div>
        ))}
      </div>
      {!entitled ? (
        <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{disabledMessage}</p>
      ) : null}
      <div className="grid gap-4 xl:grid-cols-2">
        {items.length === 0 ? (
          <div className="col-span-full rounded-[1.5rem] border border-[#ede3dd] bg-white px-6 py-14 text-center"><ShoppingBag className="mx-auto size-9 text-[#ba8f61]" /><h3 className="mt-4 font-serif text-2xl">Your collection starts here</h3><p className="mt-2 text-sm text-muted-foreground">Add a product, set its price and images, then publish it when ready.</p><Button className="mt-5" disabled={!entitled} onClick={() => { setEditing(null); setDialogOpen(true); }}>Add your first product</Button></div>
        ) : null}
          {items.map((p) => (
            <div key={p.id} className="overflow-hidden rounded-[1.5rem] border border-[#eae1db] bg-white shadow-sm">
              <div className="flex flex-col gap-5 p-4 sm:flex-row sm:p-5">
                <div className="relative aspect-[4/4] shrink-0 overflow-hidden rounded-2xl bg-[#f7f1eb] sm:size-36">
                    <EcommerceCatalogImage
                      uploadId={p.imageUploadIds?.[0]}
                      channel="admin"
                      alt={p.name}
                      fill
                    />
                </div>
                <div className="flex min-w-0 flex-1 flex-col justify-between gap-3">
                  <div><div className="flex flex-wrap items-center gap-2"><StatusBadge status={p.status === "PUBLISHED" ? "ACTIVE" : p.status === "ARCHIVED" ? "INACTIVE" : p.status === "DRAFT" ? "DRAFT" : "PENDING"} />{p.featured === true ? <span className="rounded-full bg-[#f9f0df] px-2.5 py-1 text-[.65rem] font-bold text-[#89601e]">Featured</span> : null}</div><h3 className="mt-2 line-clamp-2 text-lg font-semibold text-[#33252a]">{p.name}</h3><p className="mt-1 text-xs text-muted-foreground">{p.sku ? `SKU ${p.sku} · ` : ""}{p.purity ? `${p.purity} gold · ` : ""}{p.priceMode === "FIXED" ? "Fixed price" : "Gold rate based"}</p></div>
                  <div className="flex flex-wrap items-center justify-between gap-3"><div><span className="text-[.65rem] font-semibold uppercase tracking-wider text-muted-foreground">Estimated total</span><div className="text-[#730321]"><ShopPriceLabel pricing={p.pricing} /></div></div><Button type="button" size="sm" variant="outline" disabled={!entitled} onClick={() => { setEditing(p); setDialogOpen(true); }}>Edit product</Button></div>
                </div>
              </div>
              <details className="border-t border-[#f0e9e4] px-5 py-3 text-sm"><summary className="cursor-pointer font-semibold text-[#704753]">Price breakdown</summary><div className="py-4"><PricingPreviewPanel pricing={p.pricing} /></div></details>
            </div>
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
