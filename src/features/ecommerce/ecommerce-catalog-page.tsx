"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  BellRing,
  Gem,
  LayoutGrid,
  List,
  Pencil,
  Plus,
  ReceiptText,
  Sparkles,
  Star,
  Store,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PageHeader } from "@/src/components/common/page-parts";
import { EmptyState, QueryError } from "@/src/components/common/query-state";
import { StatusBadge } from "@/src/components/common/status-badge";
import { CursorPagination } from "@/src/components/common/cursor-pagination";
import { AdminTable, ListPanel, type AdminColumn } from "@/src/components/admin-ui/admin-table";
import { FilterBar, FilterSearch, FilterSelect, QuickViews } from "@/src/components/admin-ui/filter-bar";
import { Notice } from "@/src/components/admin-ui/detail-parts";
import { useCursorPagination } from "@/src/hooks/use-cursor-pagination";
import { emptyPageMeta } from "@/src/lib/cursor-pagination";
import {
  useGetEcommerceCategoriesQuery,
  useGetEcommerceProductsQuery,
  useGetSettingsOperationsQuery,
} from "@/src/store/api/admin-api";
import { cn } from "@/lib/utils";
import { PricingPreviewPanel, type EcommercePricingBlock } from "@/src/features/ecommerce/ecommerce-shared";
import { ShopPriceLabel, useEcommerceCatalogWrite } from "@/src/features/ecommerce/ecommerce-admin-shared";
import { EcommerceProductDialog } from "@/src/features/ecommerce/ecommerce-product-dialog";
import { EcommerceCatalogImage } from "@/src/features/ecommerce/ecommerce-catalog-image";
import { EcommercePromotionComposerDialog } from "@/src/features/ecommerce/ecommerce-promotion-composer-dialog";

type Product = Record<string, any>;

const STATUS_VIEWS = [
  { value: "ALL", label: "All products" },
  { value: "PUBLISHED", label: "Published" },
  { value: "DRAFT", label: "Drafts" },
  { value: "ARCHIVED", label: "Archived" },
];

const VIEW_STORAGE_KEY = "swarnagrow.catalogView";

function productStatusBadge(status: unknown) {
  const s = String(status ?? "");
  if (s === "PUBLISHED") return <StatusBadge status="PUBLISHED" label="Live" />;
  if (s === "ARCHIVED") return <StatusBadge status="ARCHIVED" label="Archived" />;
  if (s === "DRAFT") return <StatusBadge status="DRAFT" label="Draft" />;
  return <StatusBadge status={s || "PENDING"} />;
}

function productMeta(p: Product) {
  return [
    p.purity ? `${p.purity}` : null,
    p.goldWeightMg ? `${(Number(p.goldWeightMg) / 1000).toFixed(2)} g` : null,
    p.priceMode === "FIXED" ? "Fixed price" : "Gold-rate priced",
  ]
    .filter(Boolean)
    .join(" · ");
}

function readView(): "grid" | "table" {
  try {
    return window.localStorage.getItem(VIEW_STORAGE_KEY) === "table" ? "table" : "grid";
  } catch {
    return "grid";
  }
}

export function EcommerceCatalogPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [statusFilter, setStatusFilter] = useState<string>(() => {
    const s = searchParams.get("status");
    return s && ["PUBLISHED", "DRAFT", "ARCHIVED"].includes(s) ? s : "ALL";
  });
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [modeFilter, setModeFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"grid" | "table">(() => (typeof window === "undefined" ? "grid" : readView()));
  const pager = useCursorPagination(24, `ecommerce-products:${statusFilter}`);
  const query = useGetEcommerceProductsQuery({
    includePricing: true,
    status: statusFilter === "ALL" ? undefined : statusFilter,
    ...pager.queryParams,
  });
  const categories = useGetEcommerceCategoriesQuery({ limit: 100 });
  const { entitled, disabledMessage } = useEcommerceCatalogWrite();
  const operations = useGetSettingsOperationsQuery();
  const storeActive = operations.data?.ecommerce?.active === true;
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);
  const [breakdown, setBreakdown] = useState<Product | null>(null);
  const [notifyTarget, setNotifyTarget] = useState<{ kind: "product"; productId: string; label: string } | null>(null);

  // "Add product" links from the store overview land here with ?new=1 and open a blank dialog.
  const openedFromLink = searchParams.get("new") === "1" && entitled;
  function onDialogOpenChange(open: boolean) {
    setDialogOpen(open);
    if (!open && openedFromLink) router.replace("/ecommerce/catalog", { scroll: false });
  }

  function changeView(next: "grid" | "table") {
    setView(next);
    try {
      window.localStorage.setItem(VIEW_STORAGE_KEY, next);
    } catch {
      // Per-viewer preference only.
    }
  }

  const categoryItems = (categories.data?.items ?? []) as Record<string, any>[];
  const categoryName = (id: unknown) => categoryItems.find((c) => c.id === id)?.name as string | undefined;
  const items = (query.data?.items ?? []) as Product[];
  const needle = search.trim().toLowerCase();
  const visible = useMemo(
    () =>
      items.filter(
        (p) =>
          (categoryFilter === "ALL" || String(p.categoryId ?? "") === categoryFilter) &&
          (modeFilter === "ALL" || String(p.priceMode ?? "") === modeFilter) &&
          (!needle || `${p.name ?? ""} ${p.sku ?? ""}`.toLowerCase().includes(needle)),
      ),
    [items, categoryFilter, modeFilter, needle],
  );
  const page = {
    ...emptyPageMeta(),
    ...(query.data?.meta as Partial<ReturnType<typeof emptyPageMeta>> | undefined),
    limit: pager.limit,
  };

  function openEdit(p: Product) {
    setEditing(p);
    setDialogOpen(true);
  }

  const columns: AdminColumn<Product>[] = [
    {
      key: "product",
      header: "Product",
      primary: true,
      cell: (p) => (
        <div className="flex min-w-0 items-center gap-3">
          <span className="relative size-12 shrink-0 overflow-hidden rounded-xl bg-[#f7f1eb] ring-1 ring-[#efe5e1]">
            <EcommerceCatalogImage uploadId={p.imageUploadIds?.[0]} channel="admin" alt={p.name} fill />
          </span>
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 truncate font-semibold text-[#28161a]">
              {p.name}
              {p.featured ? <Star className="size-3.5 shrink-0 fill-[#d6b46e] text-[#d6b46e]" aria-label="Featured" /> : null}
            </p>
            <p className="truncate text-xs text-[#857a7d]">{p.sku ? `SKU ${p.sku}` : "No SKU"}</p>
          </div>
        </div>
      ),
      sortValue: (p) => String(p.name ?? ""),
    },
    { key: "category", header: "Category", cell: (p) => <span className="text-[#5c4a4e]">{categoryName(p.categoryId) ?? "—"}</span>, sortValue: (p) => categoryName(p.categoryId) ?? "", hideOnMobile: true },
    { key: "metal", header: "Metal & pricing", cell: (p) => <span className="text-sm text-[#5c4a4e]">{productMeta(p)}</span> },
    { key: "status", header: "Status", cell: (p) => productStatusBadge(p.status), sortValue: (p) => String(p.status ?? "") },
    {
      key: "price",
      header: "Price today",
      align: "right",
      primary: true,
      cell: (p) => <ShopPriceLabel pricing={p.pricing} className="font-bold text-[#28161a]" />,
      sortValue: (p) => Number((p.pricing as { displayTotal?: { amountPaise?: number } } | undefined)?.displayTotal?.amountPaise ?? 0),
    },
  ];

  const activeFilters = [
    ...(categoryFilter !== "ALL" ? [{ key: "cat", label: categoryName(categoryFilter) ?? "Category", onClear: () => setCategoryFilter("ALL") }] : []),
    ...(modeFilter !== "ALL" ? [{ key: "mode", label: modeFilter === "FIXED" ? "Fixed price" : "Gold-rate priced", onClear: () => setModeFilter("ALL") }] : []),
    ...(needle ? [{ key: "q", label: `“${search.trim()}”`, onClear: () => setSearch("") }] : []),
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Online store"
        icon={Gem}
        title="Products"
        description="Jewellery in your online store. Prices are live estimates from today's gold rate, making charges and GST."
        actions={
          <Button
            type="button"
            className="rounded-xl"
            data-tour="products-add"
            disabled={!entitled}
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Plus /> Add product
          </Button>
        }
      />
      {!storeActive ? (
        <Notice
          tone="wine"
          icon={Store}
          title="Your store isn't live yet"
          action={
            <Link href="/settings/subscription" className="text-sm font-semibold text-[#7b0a2b] hover:underline">
              Turn it on
            </Link>
          }
        >
          Turn on the online store in Settings, then publish products and categories. Finish{" "}
          <Link href="/ecommerce/gold-rates" className="font-semibold underline-offset-2 hover:underline">gold rates</Link>,{" "}
          <Link href="/ecommerce/tax" className="font-semibold underline-offset-2 hover:underline">GST</Link> and{" "}
          <Link href="/ecommerce/fulfilment" className="font-semibold underline-offset-2 hover:underline">delivery</Link> before taking payments.
        </Notice>
      ) : null}
      {!entitled ? <Notice tone="amber">{disabledMessage}</Notice> : null}

      <ListPanel
        toolbar={
          <FilterBar
            quickViews={<QuickViews value={statusFilter} onChange={setStatusFilter} options={STATUS_VIEWS} ariaLabel="Product status" />}
            search={<FilterSearch value={search} onChange={setSearch} placeholder="Search name or SKU on this page" />}
            filters={
              <>
                <FilterSelect
                  label="Category"
                  value={categoryFilter}
                  onChange={setCategoryFilter}
                  options={[{ value: "ALL", label: "All" }, ...categoryItems.map((c) => ({ value: String(c.id), label: String(c.name) }))]}
                />
                <FilterSelect
                  label="Pricing"
                  value={modeFilter}
                  onChange={setModeFilter}
                  options={[
                    { value: "ALL", label: "Any" },
                    { value: "GOLD_RATE_BASED", label: "Gold-rate" },
                    { value: "FIXED", label: "Fixed" },
                  ]}
                />
              </>
            }
            actions={
              <div role="radiogroup" aria-label="Layout" className="inline-flex rounded-xl border border-[#e6dad6] bg-white p-1">
                {(
                  [
                    ["grid", LayoutGrid, "Grid"],
                    ["table", List, "Table"],
                  ] as const
                ).map(([key, Icon, label]) => (
                  <button
                    key={key}
                    type="button"
                    role="radio"
                    aria-checked={view === key}
                    aria-label={`${label} view`}
                    onClick={() => changeView(key)}
                    className={cn(
                      "grid size-8 place-items-center rounded-lg transition-colors",
                      view === key ? "bg-[#5e0a20] text-white" : "text-[#7a6d70] hover:text-[#28161a]",
                    )}
                  >
                    <Icon className="size-4" />
                  </button>
                ))}
              </div>
            }
            activeFilters={activeFilters}
            onClearAll={() => {
              setCategoryFilter("ALL");
              setModeFilter("ALL");
              setSearch("");
            }}
            resultLabel={`${visible.length} of ${items.length} on this page`}
          />
        }
      >
        {query.isError ? (
          <QueryError error={query.error} onRetry={query.refetch} />
        ) : query.isLoading ? (
          <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-80 animate-pulse rounded-[1.15rem] bg-[#f5ede9]" />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <EmptyState
            icon={Gem}
            title={items.length ? "No products match" : "Your collection starts here"}
            detail={items.length ? "Try another category or clear the search." : "Add a product, set its price and photos, then publish it when it's ready."}
            action={
              !items.length ? (
                <Button
                  disabled={!entitled}
                  onClick={() => {
                    setEditing(null);
                    setDialogOpen(true);
                  }}
                >
                  Add your first product
                </Button>
              ) : undefined
            }
          />
        ) : view === "table" ? (
          <AdminTable columns={columns} rows={visible} getRowId={(p) => String(p.id)} onRowClick={entitled ? openEdit : undefined} caption="Products" />
        ) : (
          <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visible.map((p) => (
              <article
                key={p.id}
                className="group flex flex-col overflow-hidden rounded-[1.15rem] border border-[#ebe1dc] bg-white transition-shadow hover:shadow-[0_16px_32px_-22px_rgb(67_15_25/45%)]"
              >
                <button
                  type="button"
                  onClick={() => entitled && openEdit(p)}
                  className="relative block aspect-square overflow-hidden bg-[#f7f1eb] text-left"
                  aria-label={`Edit ${p.name}`}
                >
                  <EcommerceCatalogImage
                    uploadId={p.imageUploadIds?.[0]}
                    channel="admin"
                    alt={p.name}
                    fill
                    className="transition-transform duration-500 group-hover:scale-[1.04]"
                  />
                  <span className="absolute left-3 top-3 flex flex-wrap gap-1.5">
                    {productStatusBadge(p.status)}
                    {p.featured === true ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-xs font-bold text-[#89601e] shadow-sm">
                        <Sparkles className="size-3" /> Featured
                      </span>
                    ) : null}
                  </span>
                  {p.offer ? (
                    <span className="absolute bottom-3 left-3 rounded-full bg-[#7b0a2b] px-2 py-0.5 text-xs font-bold text-white">Offer on</span>
                  ) : null}
                </button>
                <div className="flex flex-1 flex-col gap-3 p-4">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-[#9a6f2a]">{categoryName(p.categoryId) ?? "Uncategorised"}</p>
                    <h3 className="mt-0.5 line-clamp-2 font-semibold leading-snug text-[#28161a]">{p.name}</h3>
                    <p className="mt-1 truncate text-xs text-[#857a7d]">
                      {p.sku ? `${p.sku} · ` : ""}
                      {productMeta(p)}
                    </p>
                  </div>
                  <div className="mt-auto flex items-end justify-between gap-2">
                    <div>
                      <p className="text-[0.72rem] text-[#9a8d90]">Price today</p>
                      <ShopPriceLabel pricing={p.pricing} className="text-lg font-extrabold tabular-nums text-[#5e0a20]" />
                    </div>
                    <button
                      type="button"
                      onClick={() => setBreakdown(p)}
                      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-[#7b0a2b] hover:bg-[#fbf1f3]"
                    >
                      <ReceiptText className="size-3.5" /> Breakdown
                    </button>
                  </div>
                  <div className="flex gap-2 border-t border-[#f3eae7] pt-3">
                    <Button type="button" size="sm" variant="outline" className="flex-1 rounded-lg" disabled={!entitled} onClick={() => openEdit(p)}>
                      <Pencil /> Edit
                    </Button>
                    {p.status === "PUBLISHED" ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="flex-1 rounded-lg"
                        disabled={!entitled}
                        onClick={() => setNotifyTarget({ kind: "product", productId: String(p.id), label: String(p.name) })}
                      >
                        <BellRing /> Notify
                      </Button>
                    ) : null}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
        <CursorPagination
          page={page}
          pageIndex={pager.pageIndex}
          rowCount={items.length}
          onNext={() => pager.goNext(page.nextCursor)}
          onPrevious={pager.goPrevious}
          canPrevious={pager.canPrevious}
        />
      </ListPanel>

      <Dialog open={Boolean(breakdown)} onOpenChange={(open) => !open && setBreakdown(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{breakdown?.name ?? "Price breakdown"}</DialogTitle>
            <DialogDescription>How today&apos;s price is made up. The invoice shows the final amount.</DialogDescription>
          </DialogHeader>
          <PricingPreviewPanel pricing={breakdown?.pricing as EcommercePricingBlock | undefined} />
        </DialogContent>
      </Dialog>
      <EcommerceProductDialog
        open={dialogOpen || openedFromLink}
        onOpenChange={onDialogOpenChange}
        product={openedFromLink && !dialogOpen ? null : editing}
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
    </div>
  );
}
