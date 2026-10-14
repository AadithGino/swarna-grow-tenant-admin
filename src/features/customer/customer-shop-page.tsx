"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Gem, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useDebouncedValue } from "@/src/hooks/use-debounced-value";
import {
  useGetShopAvailabilityQuery,
  useGetShopBannersQuery,
  useGetShopCategoriesQuery,
  useGetShopProductQuery,
  useGetShopProductsQuery,
  useLazyGetShopProductsQuery,
  useGetShopCartQuery,
  usePutShopCartMutation,
} from "@/src/store/api/customer-api";
import { toastApiError } from "@/src/lib/api-error";
import { Surface } from "@/src/components/common/page-parts";
import { PageSkeleton, QueryError } from "@/src/components/common/query-state";
import { PricingPreviewPanel } from "@/src/features/ecommerce/ecommerce-shared";
import { ShopPriceLabel } from "@/src/features/ecommerce/ecommerce-admin-shared";
import { EcommerceCatalogImage } from "@/src/features/ecommerce/ecommerce-catalog-image";
import { useCustomerTenant } from "@/src/components/customer/customer-tenant-context";
import { customerPath } from "@/src/lib/customer-tenant";
import { customerShopOrdersPath } from "@/src/lib/customer-shop-paths";
import { customerBrandClass, customerBrandStyle } from "@/src/lib/customer-brand-styles";
import { CustomerShopPoliciesLinks } from "@/src/features/customer/customer-shop-policies";
import {
  CustomerShopCatalogToolbar,
  CustomerShopEmptyState,
  CustomerShopProductCard,
} from "@/src/features/customer/customer-shop-catalog-ui";
import {
  CustomerPromoBanners,
  SHOP_PROMO_GRID_INSERT_AFTER,
  shouldShowShopPromoRail,
  type CustomerPromoBanner,
} from "@/src/features/customer/customer-promo-banners";
import {
  customerBannerQueryOptions,
  useCustomerBannerScheduleRefetch,
} from "@/src/lib/customer-banner-refresh";

function dedupeAppend(
  head: Record<string, unknown>[],
  tail: Record<string, unknown>[],
  incoming: Record<string, unknown>[],
) {
  const ids = new Set([...head, ...tail].map((row) => String(row.id)));
  return [...tail, ...incoming.filter((row) => !ids.has(String(row.id)))];
}

export function CustomerShopPage() {
  const { tenantSlug } = useCustomerTenant();
  const searchParams = useSearchParams();
  const initialCategoryId = searchParams.get("categoryId") ?? undefined;
  const availability = useGetShopAvailabilityQuery();
  const shopBanners = useGetShopBannersQuery(undefined, {
    skip: !availability.data?.available,
    ...customerBannerQueryOptions([], null),
    pollingInterval: 60_000,
    refetchOnFocus: true,
    refetchOnReconnect: true,
  });
  const shopBannerItems = (shopBanners.data?.items ?? []) as CustomerPromoBanner[];
  useCustomerBannerScheduleRefetch(
    shopBannerItems,
    shopBanners.refetch,
    shopBanners.data?.meta,
    { enabled: availability.data?.available === true },
  );
  const categories = useGetShopCategoriesQuery(undefined, {
    skip: !availability.data?.available,
  });
  const [categoryId, setCategoryId] = useState<string | undefined>(initialCategoryId);
  const [searchInput, setSearchInput] = useState("");
  const [sort, setSort] = useState<"newest" | "name">("newest");
  const [catalogPagination, setCatalogPagination] = useState<{
    catalogKey: string;
    tailItems: Record<string, unknown>[];
    nextCursor: string | null | undefined;
  }>({ catalogKey: "", tailItems: [], nextCursor: undefined });
  const [addingProductId, setAddingProductId] = useState<string | null>(null);

  const debouncedSearch = useDebouncedValue(searchInput.trim(), 400);
  const searchQ = debouncedSearch.length >= 2 ? debouncedSearch : undefined;
  const catalogKey = `${categoryId ?? ""}|${searchQ ?? ""}|${sort}`;

  const products = useGetShopProductsQuery(
    { categoryId, limit: 12, q: searchQ, sort },
    { skip: !availability.data?.available },
  );
  const cart = useGetShopCartQuery(undefined, { skip: !availability.data?.available });
  const [putCart] = usePutShopCartMutation();
  const [fetchMore, fetchMoreState] = useLazyGetShopProductsQuery();
  const firstPage = products.data?.items ?? [];
  const tailItems =
    catalogPagination.catalogKey === catalogKey ? catalogPagination.tailItems : [];
  const mergedItems = [...firstPage, ...tailItems];
  const storedCursor =
    catalogPagination.catalogKey === catalogKey ? catalogPagination.nextCursor : undefined;
  const cursorForMore =
    storedCursor === undefined
      ? (products.data?.meta?.nextCursor as string | null | undefined)
      : storedCursor;

  function selectCategory(id: string | undefined) {
    setCategoryId(id);
  }

  function clearAllFilters() {
    setSearchInput("");
    setCategoryId(undefined);
  }

  function onSortChange(value: "newest" | "name") {
    setSort(value);
  }

  async function addProductToCart(product: Record<string, unknown>) {
    const pid = String(product.id);
    setAddingProductId(pid);
    try {
      const existing = (cart.data?.lines as { productId: string; quantity: number }[]) ?? [];
      const merged = existing.some((l) => l.productId === pid)
        ? existing.map((l) =>
            l.productId === pid ? { ...l, quantity: Math.min(99, l.quantity + 1) } : l,
          )
        : [...existing, { productId: pid, quantity: 1 }];
      await putCart({
        lines: merged,
        expectedVersion: cart.data?.version as number | undefined,
      }).unwrap();
      toast.success("Added to cart");
    } catch (err) {
      toastApiError(err);
    } finally {
      setAddingProductId(null);
    }
  }

  async function loadMore() {
    const cursor = cursorForMore;
    if (!cursor) return;
    try {
      const data = await fetchMore({ categoryId, limit: 12, cursor, q: searchQ, sort }).unwrap();
      setCatalogPagination((prev) => {
        const baseTail = prev.catalogKey === catalogKey ? prev.tailItems : [];
        return {
          catalogKey,
          tailItems: dedupeAppend(firstPage, baseTail, data.items ?? []),
          nextCursor: (data.meta?.nextCursor as string | null) ?? null,
        };
      });
    } catch (err) {
      toastApiError(err);
    }
  }

  if (availability.isLoading) return <PageSkeleton cards={2} />;
  if (availability.isError) {
    return <QueryError error={availability.error} onRetry={availability.refetch} />;
  }
  if (!availability.data?.available) {
    return (
      <div className="mx-auto max-w-lg rounded-[2rem] border bg-white px-8 py-14 text-center shadow-sm">
        <ShoppingBag className={cn("mx-auto size-10", customerBrandClass.accentText)} />
        <h1 className="mt-5 font-serif text-3xl">The online store is unavailable</h1>
        <p className="mt-3 text-sm text-muted-foreground">This jeweller has not opened their online catalog yet.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {availability.data?.hasOrderHistory ? (
            <Link href={customerShopOrdersPath(tenantSlug)} className="inline-flex rounded-xl px-5 py-3 text-sm font-semibold text-white" style={customerBrandStyle.primaryBg}>View your orders</Link>
          ) : null}
          <Link href={customerPath(tenantSlug)} className="inline-flex rounded-xl border border-[#e7d9d2] px-5 py-3 text-sm font-semibold text-[#543a42]">Go to home</Link>
        </div>
      </div>
    );
  }
  const categoryRows = (categories.data?.items ?? []).map((c) => ({
    id: String(c.id),
    name: String(c.name),
  }));

  const hasActiveFilters = Boolean(searchQ || categoryId);
  const slug = tenantSlug ?? "";
  const showShopPromos = shouldShowShopPromoRail(shopBannerItems, hasActiveFilters);

  const shopPromoBanners = showShopPromos ? (
    <CustomerPromoBanners
      tenantSlug={slug}
      placement="shop-grid"
      shopAvailable
      items={shopBannerItems}
    />
  ) : null;
  const promoRail = shopPromoBanners ? (
    <div key="shop-promo-rail" className="col-span-2 py-1 lg:col-span-3">
      {shopPromoBanners}
    </div>
  ) : null;

  return (
    <>
      <CustomerShopCatalogToolbar
        tenantSlug={slug}
        searchInput={searchInput}
        onSearchInputChange={setSearchInput}
        categoryId={categoryId}
        onCategoryChange={selectCategory}
        categories={categoryRows}
        sort={sort}
        onSortChange={onSortChange}
        showOrdersLink={availability.data?.hasOrderHistory === true}
        resultCount={mergedItems.length}
        loadingResults={products.isFetching}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={clearAllFilters}
        searchQ={searchQ}
      />
      {products.isLoading && !mergedItems.length ? <PageSkeleton cards={3} /> : products.isError ? (
        <QueryError error={products.error} onRetry={products.refetch} />
      ) : !mergedItems.length ? (
        <>
          {shopPromoBanners ? <div className="mb-4">{shopPromoBanners}</div> : null}
          <CustomerShopEmptyState
            searchQ={searchQ}
            hasFilters={hasActiveFilters}
            onReset={clearAllFilters}
          />
        </>
      ) : (
        <>
          <div id="collection" className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-3">
            {mergedItems.flatMap((p, index) => {
              const card = (
                <CustomerShopProductCard
                  key={String(p.id)}
                  product={p}
                  tenantSlug={slug}
                  adding={addingProductId === String(p.id)}
                  onAddToCart={() => void addProductToCart(p)}
                />
              );
              if (
                showShopPromos &&
                index === SHOP_PROMO_GRID_INSERT_AFTER - 1
              ) {
                return [card, promoRail];
              }
              return [card];
            })}
            {showShopPromos && mergedItems.length < SHOP_PROMO_GRID_INSERT_AFTER
              ? promoRail
              : null}
          </div>
          {cursorForMore ? (
            <div className="mt-6 flex justify-center">
              <Button
                type="button"
                variant="outline"
                disabled={fetchMoreState.isFetching}
                onClick={loadMore}
              >
                {fetchMoreState.isFetching ? "Loading…" : "Load more"}
              </Button>
            </div>
          ) : null}
        </>
      )}
      <CustomerShopPoliciesLinks className="mt-8 rounded-2xl border border-[#ede3db] bg-white p-4 sm:p-5" />
      <p className="mt-4 pb-2 text-center text-xs leading-relaxed text-[#85797c]">
        Prices show gold, making and tax where applicable. Pickup or delivery and final payment are
        confirmed in your quote.
      </p>
    </>
  );
}

export function CustomerShopProductPage({ slug }: { slug: string }) {
  const { tenantSlug } = useCustomerTenant();
  const availability = useGetShopAvailabilityQuery();
  const [putCart, putState] = usePutShopCartMutation();
  const [selectedImage, setSelectedImage] = useState(0);
  const cart = useGetShopCartQuery(undefined, { skip: !availability.data?.available });
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
  const images = (p.imageUploadIds as string[] | undefined) ?? [];
  const imageIndex = Math.min(selectedImage, Math.max(0, images.length - 1));
  const availabilityInfo = p.availability as { label?: string; purchasable?: boolean } | undefined;
  const priceReady = (p.pricing as { computable?: boolean } | undefined)?.computable === true;
  const weightMg = Number(p.goldWeightMg ?? 0);
  return (
    <div className="pb-10">
      <Link href={customerPath(tenantSlug, "shop")} className={cn("mb-5 inline-flex items-center gap-2 text-sm font-semibold", customerBrandClass.linkBack)}><ArrowLeft className="size-4" /> Back to collection</Link>
      <div className="grid items-start gap-7 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,.92fr)] lg:gap-11">
        <section aria-label="Product images">
          <div className="relative aspect-[4/4.4] overflow-hidden rounded-[2rem] border border-[#eee4d8] customer-primary-tint-surface">
            <EcommerceCatalogImage uploadId={images[imageIndex]} viewUrl={(p.imageUrls as any)?.[imageIndex]?.viewUrl} channel="customer" alt={String(p.name)} fill />
            {p.featured === true ? <span className={cn("absolute left-5 top-5 rounded-full bg-white/95 px-4 py-2 text-xs font-semibold shadow-sm", customerBrandClass.primaryText)}>Featured piece</span> : null}
          </div>
          {images.length > 1 ? <div className="mt-3 flex gap-3 overflow-x-auto pb-1" role="group" aria-label="Product images">
            {images.map((id, index) => <button type="button" key={id} onClick={() => setSelectedImage(index)} aria-label={`View image ${index + 1}`} aria-pressed={selectedImage === index} className={cn("relative size-20 shrink-0 overflow-hidden rounded-xl border-2 customer-primary-tint-surface", selectedImage === index ? customerBrandClass.borderActive : "border-transparent")}><EcommerceCatalogImage uploadId={id} viewUrl={(p.imageUrls as any)?.[index]?.viewUrl} channel="customer" alt="" fill /></button>)}
          </div> : null}
        </section>
        <section className="space-y-6 lg:pt-4">
          <div><p className={cn("text-xs font-bold uppercase tracking-[.2em]", customerBrandClass.accentText)}>{p.purity ? `${String(p.purity)} gold` : "Jewellery collection"}</p><h1 className="mt-3 font-serif text-3xl leading-tight text-[#2c2024] sm:text-4xl">{String(p.name)}</h1>{p.sku ? <p className="mt-2 text-xs text-[#8f8584]">Item code: {String(p.sku)}</p> : null}</div>
          <div className="rounded-[1.5rem] border border-[#eddfd9] bg-white p-5 shadow-sm sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#8b7774]">Estimated price</p>
            <div className={customerBrandClass.price}><ShopPriceLabel pricing={p.pricing as any} className="text-3xl font-bold" /></div>
            <p className="mt-2 text-xs leading-5 text-[#817477]">Final amount, tax and fulfilment charges are confirmed in your quote.</p>
            {availabilityInfo?.label ? <p className={`mt-4 text-sm font-medium ${availabilityInfo.purchasable === false ? "text-amber-800" : "text-emerald-800"}`}>{availabilityInfo.label}</p> : null}
            <div className="mt-5 flex flex-wrap gap-3">
            <Button
              type="button"
              className="h-12 min-w-40 rounded-xl text-white"
              style={customerBrandStyle.primaryBg}
              disabled={!priceReady || availabilityInfo?.purchasable === false || putState.isLoading || cart.isLoading}
              onClick={async () => {
                try {
                  const existing =
                    (cart.data?.lines as { productId: string; quantity: number }[]) ?? [];
                  const pid = String(p.id);
                  const merged = existing.some((l) => l.productId === pid)
                    ? existing.map((l) =>
                        l.productId === pid
                          ? { ...l, quantity: Math.min(99, l.quantity + 1) }
                          : l,
                      )
                    : [...existing, { productId: pid, quantity: 1 }];
                  await putCart({
                    lines: merged,
                    expectedVersion: cart.data?.version as number | undefined,
                  }).unwrap();
                  toast.success("Added to your cart");
                } catch (err) {
                  toastApiError(err);
                }
              }}
            >
              <ShoppingBag className="mr-2 size-4" />{putState.isLoading ? "Adding…" : "Add to cart"}
            </Button>
            <Link href={customerPath(tenantSlug, "shop", "cart")}>
              <Button type="button" className="h-12 rounded-xl" variant="outline">
                View cart <ArrowRight className="ml-2 size-4" />
              </Button>
            </Link>
          </div>
          {!priceReady ? <p className="mt-3 text-sm text-amber-800">Price is temporarily unavailable. This item can be added when the jeweller updates its pricing.</p> : null}
          </div>
          {p.description ? <div className="rounded-2xl border border-[#efe7e1] bg-white p-5"><h2 className="font-semibold text-[#302428]">About this piece</h2><p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-[#6d6265]">{String(p.description)}</p></div> : null}
          {weightMg > 0 ? <div className="flex items-center gap-3 rounded-2xl customer-accent-tint-surface p-4 text-sm text-[#5b4a42]"><Gem className={cn("size-5 shrink-0", customerBrandClass.accentText)} /><span>Gold weight: <strong>{(weightMg / 1000).toFixed(3)} g</strong>{p.purity ? ` · ${String(p.purity)} purity` : ""}</span></div> : null}
        </section>
      </div>
      <section className="mt-10 rounded-[1.5rem] border border-[#eee4dc] bg-white p-5 sm:p-7"><h2 className="font-serif text-2xl text-[#312327]">How the price is built</h2><p className="mb-5 mt-1 text-sm text-[#817477]">Gold rate, making, stones and tax where applicable.</p><PricingPreviewPanel pricing={p.pricing as any} /></section>
    </div>
  );
}
