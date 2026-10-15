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
import { PageHeader, StatCard, Surface } from "@/src/components/common/page-parts";
import {
  EcommerceCatalogNav,
  EcommerceRelatedLink,
  EcommerceSettingsHint,
} from "@/src/features/ecommerce/ecommerce-settings-ui";
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
import { EcommercePromotionComposerDialog } from "@/src/features/ecommerce/ecommerce-promotion-composer-dialog";
export function EcommerceCatalogPage() {
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const pager = useCursorPagination(10, `ecommerce-products:${statusFilter}`);
  const query = useGetEcommerceProductsQuery({
    includePricing: true,
    status: statusFilter === "ALL" ? undefined : statusFilter,
    ...pager.queryParams,
  });
  const { entitled, disabledMessage } = useEcommerceCatalogWrite();
  const operations = useGetSettingsOperationsQuery();
  const storeActive = operations.data?.ecommerce?.active === true;
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);
  const [notifyTarget, setNotifyTarget] = useState<{
    kind: "product";
    productId: string;
    label: string;
  } | null>(null);

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
      <EcommerceCatalogNav />
      <Surface
        title="Storefront visibility"
        description="Controlled in Settings → Subscription when your plan includes ecommerce."
        className="mb-6"
        action={
          <Link
            href="/settings/subscription"
            className="text-sm font-semibold text-[#730321] underline-offset-2 hover:underline"
          >
            Store settings
            <ArrowRight className="ml-1 inline size-4" />
          </Link>
        }
      >
        <div className="flex flex-wrap items-center gap-3 p-5">
          <StatusBadge status={storeActive ? "ACTIVE" : "INACTIVE"} label={storeActive ? "Live for customers" : "Not live"} />
          <p className="text-sm text-muted-foreground">
            {storeActive
              ? "Published products in active categories are visible. Checkout still needs tax and fulfilment setup."
              : "Turn on the online store in Settings, then publish products and categories."}
          </p>
        </div>
      </Surface>
      <EcommerceSettingsHint icon={ShoppingBag} title="This page">
        Add products, preview live pricing, and publish when ready. Finish{" "}
        <EcommerceRelatedLink href="/ecommerce/gold-rates" label="gold rates" />,{" "}
        <EcommerceRelatedLink href="/ecommerce/tax" label="tax" />, and{" "}
        <EcommerceRelatedLink href="/ecommerce/fulfilment" label="fulfilment" /> before taking payments.
      </EcommerceSettingsHint>
      <div className="mb-6 mt-6 grid gap-4 sm:grid-cols-3">
        <StatCard icon={Package} label="On this page" value={items.length} detail="Products loaded" tone="cream" />
        <StatCard
          icon={Sparkles}
          label="Published"
          value={items.filter((item) => item.status === "PUBLISHED").length}
          tone="green"
        />
        <StatCard
          icon={ImageIcon}
          label="Drafts"
          value={items.filter((item) => item.status === "DRAFT").length}
          tone="gold"
        />
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
                  <div className="flex flex-wrap items-center justify-between gap-3"><div><span className="text-[.65rem] font-semibold uppercase tracking-wider text-muted-foreground">Estimated total</span><div className="text-[#730321]"><ShopPriceLabel pricing={p.pricing} /></div></div><div className="flex flex-wrap gap-2">{p.status === "PUBLISHED" ? (<Button type="button" size="sm" variant="secondary" disabled={!entitled} onClick={() => setNotifyTarget({ kind: "product", productId: String(p.id), label: String(p.name) })}>Notify</Button>) : null}<Button type="button" size="sm" variant="outline" disabled={!entitled} onClick={() => { setEditing(p); setDialogOpen(true); }}>Edit product</Button></div></div>
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
      <EcommercePromotionComposerDialog
        target={notifyTarget}
        open={Boolean(notifyTarget)}
        onOpenChange={(open) => {
          if (!open) setNotifyTarget(null);
        }}
        onSent={() => query.refetch()}
      />
    </>
  );
}
