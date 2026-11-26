"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Package, Search, ShoppingBag, Store } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useDebouncedValue } from "@/src/hooks/use-debounced-value";
import {
  useGetCustomerProfileQuery,
  useGetShopAvailabilityQuery,
  useListShopBookingsQuery,
  useGetShopBannersQuery,
  useGetShopCategoriesQuery,
  useGetShopProductQuery,
  useGetShopProductsQuery,
  useLazyGetShopProductsQuery,
  useGetShopCartQuery,
  useGetCustomerDigitalMetalsRedemptionOrdersQuery,
  useListShopOrdersQuery,
  usePutShopCartMutation,
} from "@/src/store/api/customer-api";
import { toastApiError } from "@/src/lib/api-error";
import { PageSkeleton, QueryError } from "@/src/components/common/query-state";
import { ShopPriceLabel } from "@/src/features/ecommerce/ecommerce-admin-shared";
import { EcommerceCatalogImage } from "@/src/features/ecommerce/ecommerce-catalog-image";
import { useCustomerTenant } from "@/src/components/customer/customer-tenant-context";
import { CustomerBrand } from "@/src/components/customer/customer-ui";
import { customerPath } from "@/src/lib/customer-tenant";
import { isOpenBooking, type CustomerBooking } from "@/src/lib/customer-shop-booking";
import { mergeShopActivities } from "@/src/lib/customer-shop-activity";
import { customerShopOrdersPath } from "@/src/lib/customer-shop-paths";
import { ShopActivityStrip } from "@/src/features/customer/customer-shop-activity-ui";
import { useCustomerDigitalMetalsVisible } from "@/src/lib/customer-digital-metals-visible";
import { customerBrandStyle } from "@/src/lib/customer-brand-styles";
import { customerBannerHref } from "@/src/lib/customer-banner-routing";
import { BookWithAdvance } from "@/src/features/customer/customer-shop-booking-start";
import { CustomerShopPoliciesLinks } from "@/src/features/customer/customer-shop-policies";
import {
  CustomerShopCatalogToolbar,
  CustomerShopCategoryRail,
  CustomerShopEmptyState,
  CustomerShopProductCard,
} from "@/src/features/customer/customer-shop-catalog-ui";
import { type CustomerPromoBanner } from "@/src/features/customer/customer-promo-banners";
import { customerBannerQueryOptions, useCustomerBannerScheduleRefetch } from "@/src/lib/customer-banner-refresh";
import {
  CustomerPriceBreakdown,
  formatGramsFromMg,
  productOfferLabel,
  productStock,
  SHOP_HAIRLINE,
  SHOP_INK,
  SHOP_MUTED,
} from "@/src/features/customer/customer-shop-ui";

function dedupeAppend(
  head: Record<string, unknown>[],
  tail: Record<string, unknown>[],
  incoming: Record<string, unknown>[],
) {
  const ids = new Set([...head, ...tail].map((row) => String(row.id)));
  return [...tail, ...incoming.filter((row) => !ids.has(String(row.id)))];
}

type CartLine = { productId: string; quantity: number };

/** Adds one unit (or bumps quantity) using the cart's optimistic version. */
function useAddToCart(skip = false) {
  const cart = useGetShopCartQuery(undefined, { skip });
  const [putCart, putState] = usePutShopCartMutation();
  async function add(productId: string, message = "Added to your cart") {
    const existing = (cart.data?.lines as CartLine[] | undefined) ?? [];
    const merged = existing.some((l) => l.productId === productId)
      ? existing.map((l) => (l.productId === productId ? { productId, quantity: Math.min(99, l.quantity + 1) } : { productId: l.productId, quantity: l.quantity }))
      : [...existing.map((l) => ({ productId: l.productId, quantity: l.quantity })), { productId, quantity: 1 }];
    await putCart({ lines: merged, expectedVersion: cart.data?.version as number | undefined }).unwrap();
    toast.success(message);
  }
  const count = ((cart.data?.lines as CartLine[] | undefined) ?? []).reduce((s, l) => s + Number(l.quantity ?? 0), 0);
  return { add, adding: putState.isLoading, cart, count };
}

/** Per-gram rates the catalogue is priced at, read from the products' own pricing blocks. */
function catalogueRates(items: Record<string, unknown>[]) {
  const out: { purity: string; display: string }[] = [];
  for (const purity of ["22K", "24K", "18K"]) {
    const hit = items.find((p) => {
      const g = (p.pricing as { gold?: { purity?: string; ratePerGram?: { amountDisplay?: string } } } | undefined)?.gold;
      return g?.purity === purity && g.ratePerGram?.amountDisplay;
    });
    if (hit) out.push({ purity, display: (hit.pricing as { gold: { ratePerGram: { amountDisplay: string } } }).gold.ratePerGram.amountDisplay });
  }
  return out;
}

/** Shop top bar (plan): brand · "Shop · branch" · search · bag. */
function ShopHeader({ tenantSlug, branchName, cartCount, onSearch }: { tenantSlug: string; branchName?: string | null; cartCount: number; onSearch: () => void }) {
  const btn = "relative grid size-10 shrink-0 place-items-center rounded-full border border-[var(--ck-line,#ebe2d7)] bg-white text-[var(--ck-ink,#1d1417)]";
  return (
    <div className="-mx-4 -mt-5 mb-1 flex items-center gap-2 px-4 pb-3 pt-3 lg:hidden">
      <span className="min-w-0 flex-1">
        <CustomerBrand subtitle={branchName ? `Shop · ${branchName}` : "Shop"} />
      </span>
      <button type="button" aria-label="Search jewellery" className={btn} onClick={onSearch}>
        <Search className="size-[1.1rem]" strokeWidth={1.8} />
      </button>
      <Link href={customerPath(tenantSlug, "shop", "cart")} aria-label={cartCount ? `Bag, ${cartCount} items` : "Bag"} className={btn}>
        <ShoppingBag className="size-[1.1rem]" strokeWidth={1.8} />
        {cartCount ? (
          <span className="absolute -right-1 -top-1 grid h-[1.1rem] min-w-[1.1rem] place-items-center rounded-full px-1 text-[0.625rem] font-bold text-white ring-2 ring-[#f7f3ee]" style={{ background: "var(--customer-primary, #730321)" }}>
            {cartCount > 99 ? "99+" : cartCount}
          </span>
        ) : null}
      </Link>
    </div>
  );
}

function ShopRateStrip({ rates }: { rates: { purity: string; display: string }[] }) {
  if (!rates.length) return null;
  return (
    <div className="flex items-center gap-2.5 rounded-[14px] border border-[var(--ck-line,#ebe2d7)] bg-white px-3 py-2.5 text-xs text-[var(--ck-ink-2,#4f4246)]">
      <span className="size-[7px] shrink-0 rounded-full bg-[var(--ck-ok,#1f6b4c)] shadow-[0_0_0_4px_rgba(31,107,76,.12)]" aria-hidden />
      {rates.map((r, i) => (
        <span key={r.purity} className="whitespace-nowrap">
          {i === 0 ? `${r.purity} today ` : `${r.purity} `}
          <b className="text-[0.8rem] font-semibold tabular-nums text-[var(--ck-ink,#1d1417)]">{r.display}/g</b>
        </span>
      ))}
    </div>
  );
}

/** Banner carousel (plan): photo with text, CTA pill and dots. Falls back to a plain store hero. */
function ShopBannerCarousel({ tenantSlug, items, tenantName }: { tenantSlug: string; items: CustomerPromoBanner[]; tenantName?: string | null }) {
  const visible = items.filter((b) => b.title);
  const [index, setIndex] = useState(0);
  if (!visible.length) {
    return (
      <section className="relative overflow-hidden rounded-[22px] p-[1.1rem] text-white" style={{ background: "color-mix(in srgb, var(--customer-primary, #5e1622) 70%, #12030a)" }}>
        <span className="inline-block rounded-full border border-[rgba(226,200,143,.3)] bg-[rgba(226,200,143,.14)] px-2.5 py-0.5 text-[0.62rem] font-semibold uppercase tracking-[0.06em] text-[var(--customer-accent,#dcc08a)]">
          {tenantName ? `${tenantName} store` : "Online store"}
        </span>
        <h1 className="mt-2.5 max-w-[15rem] text-[1.35rem] font-extrabold leading-[1.12] tracking-[-0.03em]">Fine jewellery at today&apos;s gold rate</h1>
        <p className="mt-1.5 max-w-[17rem] text-xs leading-snug text-white/75">Gold value, making charge and GST are shown on every piece before you pay.</p>
      </section>
    );
  }
  const current = Math.min(index, visible.length - 1);
  return (
    <section aria-label="Offers" className="relative">
      <div
        className="customer-scroll-row flex snap-x snap-mandatory gap-2.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        onScroll={(e) => {
          const el = e.currentTarget;
          const slide = el.firstElementChild as HTMLElement | null;
          const w = slide ? slide.offsetWidth + 10 : el.clientWidth;
          setIndex(Math.round(el.scrollLeft / Math.max(w, 1)));
        }}
      >
        {visible.map((banner) => {
          const href = customerBannerHref(tenantSlug, banner.destination ?? { type: "NONE" }, { shopAvailable: true });
          const card = (
            <div className="relative h-[11rem] w-full overflow-hidden rounded-[22px] bg-[#6a0f19] text-white">
              {banner.imageUploadId ? (
                <EcommerceCatalogImage uploadId={banner.imageUploadId} viewUrl={banner.imageUrl ?? undefined} channel="customer" alt="" fill className="object-cover object-right" />
              ) : null}
              <span className="absolute inset-0 bg-[linear-gradient(90deg,rgba(74,14,22,.96)_0%,rgba(94,22,34,.85)_42%,rgba(94,22,34,0)_72%)]" />
              <span className="relative flex h-full flex-col p-[1.1rem]">
                <span className="max-w-[11rem] text-[1.3rem] font-extrabold leading-[1.12] tracking-[-0.03em]">{banner.title}</span>
                {banner.subtitle ? <span className="mt-1.5 max-w-[12.5rem] text-[0.72rem] leading-snug text-white/75">{banner.subtitle}</span> : null}
                {href ? (
                  <span className="mt-auto inline-flex w-fit rounded-full px-3 py-1.5 text-[0.72rem] font-bold" style={{ background: "var(--customer-accent, #dcc08a)", color: "#2a0a10" }}>
                    Shop now
                  </span>
                ) : null}
              </span>
            </div>
          );
          const slideClass = "block w-full shrink-0 grow-0 basis-full snap-start";
          return href ? (
            <Link key={banner.id} href={href} aria-label={banner.title} className={slideClass}>
              {card}
            </Link>
          ) : (
            <div key={banner.id} className={slideClass}>
              {card}
            </div>
          );
        })}
      </div>
      {visible.length > 1 ? (
        <div className="pointer-events-none absolute bottom-3.5 right-4 flex gap-[5px]">
          {visible.map((b, i) => (
            <i key={b.id} className={cn("block h-1.5 rounded-full", i === current ? "w-[18px] bg-white" : "w-1.5 bg-white/35")} />
          ))}
        </div>
      ) : null}
    </section>
  );
}

function ShopUnavailable({ tenantSlug, hasOrderHistory }: { tenantSlug: string | null; hasOrderHistory?: boolean }) {
  return (
    <div className={cn("mx-auto max-w-lg rounded-[1.75rem] border bg-white px-8 py-14 text-center", SHOP_HAIRLINE)}>
      <span className="mx-auto grid size-14 place-items-center rounded-full customer-accent-tint-surface">
        <ShoppingBag className="size-6 customer-gold-copy" />
      </span>
      <h1 className={cn("mt-5 font-serif text-3xl", SHOP_INK)}>The online store is closed</h1>
      <p className={cn("mt-3 text-sm leading-6", SHOP_MUTED)}>This jeweller hasn&apos;t opened their online catalogue yet. Your schemes and payments are unaffected.</p>
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        {hasOrderHistory ? (
          <Link href={customerShopOrdersPath(tenantSlug)} className="inline-flex rounded-full px-5 py-3 text-sm font-semibold text-white" style={customerBrandStyle.primaryBg}>
            View your orders
          </Link>
        ) : null}
        <Link href={customerPath(tenantSlug)} className="inline-flex rounded-full border border-[#e7d9d2] px-5 py-3 text-sm font-semibold text-[#543a42]">
          Back to home
        </Link>
      </div>
    </div>
  );
}

export function CustomerShopPage() {
  const { tenantSlug, tenant } = useCustomerTenant();
  const searchParams = useSearchParams();
  const initialCategoryId = searchParams.get("categoryId") ?? undefined;
  const openSearchOnLoad = searchParams.get("search") === "1";
  const availability = useGetShopAvailabilityQuery();
  const shopOpen = availability.data?.available === true;
  const { visible: metalsOn } = useCustomerDigitalMetalsVisible();
  const bookingsQuery = useListShopBookingsQuery({ limit: 10 }, { skip: !shopOpen });
  const shopOrdersQuery = useListShopOrdersQuery({ limit: 15 }, { skip: !shopOpen && !availability.data?.hasOrderHistory });
  const dmRedemptionsQuery = useGetCustomerDigitalMetalsRedemptionOrdersQuery({ limit: 10 }, { skip: !metalsOn });
  const [activityNow, setActivityNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setActivityNow(Date.now()), 30_000);
    return () => window.clearInterval(t);
  }, []);
  const { data: profile } = useGetCustomerProfileQuery();
  const shopBanners = useGetShopBannersQuery(undefined, {
    skip: !availability.data?.available,
    ...customerBannerQueryOptions([], null),
    pollingInterval: 60_000,
    refetchOnFocus: true,
    refetchOnReconnect: true,
  });
  const shopBannerItems = (shopBanners.data?.items ?? []) as CustomerPromoBanner[];
  useCustomerBannerScheduleRefetch(shopBannerItems, shopBanners.refetch, shopBanners.data?.meta, {
    enabled: availability.data?.available === true,
  });
  const categories = useGetShopCategoriesQuery(undefined, { skip: !availability.data?.available });
  const [categoryId, setCategoryId] = useState<string | undefined>(initialCategoryId);
  const [searchInput, setSearchInput] = useState("");
  const [sort, setSort] = useState<"newest" | "name">("newest");
  const [searchKey, setSearchKey] = useState(openSearchOnLoad ? 1 : 0);
  const [catalogPagination, setCatalogPagination] = useState<{
    catalogKey: string;
    tailItems: Record<string, unknown>[];
    nextCursor: string | null | undefined;
  }>({ catalogKey: "", tailItems: [], nextCursor: undefined });
  const [addingProductId, setAddingProductId] = useState<string | null>(null);

  const debouncedSearch = useDebouncedValue(searchInput.trim(), 400);
  const searchQ = debouncedSearch.length >= 2 ? debouncedSearch : undefined;
  const catalogKey = `${categoryId ?? ""}|${searchQ ?? ""}|${sort}`;

  const products = useGetShopProductsQuery({ categoryId, limit: 12, q: searchQ, sort }, { skip: !availability.data?.available });
  const featuredQuery = useGetShopProductsQuery({ featured: true, limit: 4 }, { skip: !availability.data?.available });
  const { add, count: cartCount } = useAddToCart(!availability.data?.available);
  const [fetchMore, fetchMoreState] = useLazyGetShopProductsQuery();
  const firstPage = products.data?.items ?? [];
  const tailItems = catalogPagination.catalogKey === catalogKey ? catalogPagination.tailItems : [];
  const mergedItems = [...firstPage, ...tailItems];
  const storedCursor = catalogPagination.catalogKey === catalogKey ? catalogPagination.nextCursor : undefined;
  const cursorForMore =
    storedCursor === undefined ? (products.data?.meta?.nextCursor as string | null | undefined) : storedCursor;

  const rates = useMemo(
    () => catalogueRates([...(featuredQuery.data?.items ?? []), ...(products.data?.items ?? [])]),
    [featuredQuery.data?.items, products.data?.items],
  );

  const activityItems = useMemo(() => {
    const bookingRows = ((bookingsQuery.data?.items ?? []) as unknown as CustomerBooking[]).filter((b) => isOpenBooking(b.status));
    return mergeShopActivities({
      tenantSlug: tenantSlug ?? "",
      bookings: bookingRows,
      orders: (shopOrdersQuery.data?.items ?? []) as Record<string, unknown>[],
      redemptions: metalsOn ? ((dmRedemptionsQuery.data?.items ?? []) as Record<string, unknown>[]) : [],
      now: activityNow,
    });
  }, [bookingsQuery.data?.items, shopOrdersQuery.data?.items, dmRedemptionsQuery.data?.items, metalsOn, tenantSlug, activityNow]);

  function clearAllFilters() {
    setSearchInput("");
    setCategoryId(undefined);
  }

  async function addProductToCart(product: Record<string, unknown>) {
    const pid = String(product.id);
    setAddingProductId(pid);
    try {
      await add(pid, `${String(product.name)} added to your bag`);
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
  if (availability.isError) return <QueryError error={availability.error} onRetry={availability.refetch} />;
  if (!availability.data?.available) {
    return <ShopUnavailable tenantSlug={tenantSlug} hasOrderHistory={availability.data?.hasOrderHistory} />;
  }

  const categoryRows = (categories.data?.items ?? []).map((c) => ({
    id: String(c.id),
    name: String(c.name),
    imageUploadId: (c.imageUploadId as string | null | undefined) ?? null,
    imageUrl: (c.imageUrl as string | null | undefined) ?? null,
  }));
  const hasActiveFilters = Boolean(searchQ || categoryId);
  const slug = tenantSlug ?? "";
  const bestsellers = (featuredQuery.data?.items ?? []).slice(0, 4);
  const hasOrders = availability.data?.hasOrderHistory === true;

  const renderCard = (p: Record<string, unknown>) => (
    <CustomerShopProductCard
      key={String(p.id)}
      product={p}
      tenantSlug={slug}
      adding={addingProductId === String(p.id)}
      onAddToCart={() => void addProductToCart(p)}
    />
  );

  return (
    <div className="mx-auto max-w-lg pb-6 sm:max-w-none">
      <ShopHeader tenantSlug={slug} branchName={profile?.branch?.name} cartCount={cartCount} onSearch={() => setSearchKey((k) => k + 1)} />
      <ShopRateStrip rates={rates} />

      {!hasActiveFilters ? <ShopActivityStrip tenantSlug={slug} items={activityItems} /> : null}

      {!hasActiveFilters ? (
        <div className="mt-3">
          <ShopBannerCarousel tenantSlug={slug} items={shopBannerItems} tenantName={tenant?.appDisplayName ?? tenant?.displayName} />
        </div>
      ) : null}

      <div className="mt-4">
        <CustomerShopCategoryRail categories={categoryRows} categoryId={categoryId} onCategoryChange={setCategoryId} />
      </div>

      {!hasActiveFilters && bestsellers.length ? (
        <section className="mt-5">
          <div className="mb-2.5 flex items-baseline justify-between">
            <h2 className="text-[1.05rem] font-extrabold tracking-[-0.02em] text-[var(--ck-ink,#1d1417)]">Bestsellers</h2>
            <a href="#collection" className="text-xs font-semibold text-[var(--customer-primary,#730321)]">See all</a>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">{bestsellers.map(renderCard)}</div>
        </section>
      ) : null}

      <div className="mt-7" id="collection">
        <CustomerShopCatalogToolbar
          key={searchKey}
          initialOpen={searchKey > 0}
          tenantSlug={slug}
          searchInput={searchInput}
          onSearchInputChange={setSearchInput}
          categoryId={categoryId}
          onCategoryChange={setCategoryId}
          categories={categoryRows}
          sort={sort}
          onSortChange={setSort}
          showOrdersLink={hasOrders}
          resultCount={mergedItems.length}
          loadingResults={products.isFetching}
          hasActiveFilters={hasActiveFilters}
          onClearFilters={clearAllFilters}
          searchQ={searchQ}
          cartCount={cartCount}
        />
      </div>

      <div className="mt-3">
        {products.isLoading && !mergedItems.length ? (
          <PageSkeleton cards={3} />
        ) : products.isError ? (
          <QueryError error={products.error} onRetry={products.refetch} />
        ) : !mergedItems.length ? (
          <CustomerShopEmptyState searchQ={searchQ} hasFilters={hasActiveFilters} onReset={clearAllFilters} />
        ) : (
          <>
            <div className={cn("grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4", products.isFetching && "opacity-70 transition-opacity")}>
              {mergedItems.map(renderCard)}
            </div>
            {cursorForMore ? (
              <div className="mt-6 flex justify-center">
                <Button type="button" variant="outline" className="h-11 rounded-full px-7" disabled={fetchMoreState.isFetching} onClick={loadMore}>
                  {fetchMoreState.isFetching ? "Loading…" : "Show more pieces"}
                </Button>
              </div>
            ) : null}
          </>
        )}
      </div>

      {hasOrders ? (
        <Link href={customerShopOrdersPath(slug)} className="mt-6 flex items-center gap-3 rounded-[1.15rem] border border-[var(--ck-line,#ebe2d7)] bg-white p-3.5">
          <span className="grid size-10 place-items-center rounded-xl bg-[var(--ck-gold-soft,#f6eedf)] text-[#8a6a24]">
            <Package className="size-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[0.9rem] font-semibold text-[var(--ck-ink,#1d1417)]">My orders</span>
            <span className="block text-xs text-[var(--ck-muted,#87787c)]">Track deliveries and pickups</span>
          </span>
          <ChevronRight className="size-4 text-[#ad9fa2]" />
        </Link>
      ) : null}
      <div className="mt-5 flex flex-col gap-3">
        <CustomerShopPoliciesLinks />
        <p className={cn("text-xs leading-5", SHOP_MUTED)}>
          Prices follow the jeweller&apos;s published rate and may change until you confirm your price preview at checkout.
        </p>
      </div>
    </div>
  );
}

function ProductGallery({ product, onBackHref, cartHref, cartCount }: { product: Record<string, unknown>; onBackHref: string; cartHref: string; cartCount: number }) {
  const [selected, setSelected] = useState(0);
  const images = (product.imageUploadIds as string[] | undefined) ?? [];
  const urls = (product.imageUrls as { viewUrl?: string }[] | undefined) ?? [];
  const btn = "relative grid size-11 place-items-center rounded-[14px] border border-[var(--ck-line,#ebe2d7)] bg-white/95 text-[var(--ck-ink,#1d1417)]";
  return (
    <section aria-label="Product images" className="relative -mx-4 -mt-5 bg-[#fcf3e6] lg:mx-0 lg:mt-0 lg:rounded-[1.75rem]">
      <div
        className="flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        onScroll={(e) => setSelected(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
      >
        {(images.length ? images : [undefined]).map((id, i) => (
          <div key={id ?? i} className="relative aspect-[1/0.92] w-full shrink-0 snap-start">
            <EcommerceCatalogImage uploadId={id} viewUrl={urls[i]?.viewUrl} channel="customer" alt={i === 0 ? String(product.name) : ""} fill className="object-cover" />
          </div>
        ))}
      </div>
      <div className="absolute inset-x-4 top-3 flex justify-between lg:hidden">
        <Link href={onBackHref} aria-label="Back to shop" className={btn}>
          <ChevronLeft className="size-5" />
        </Link>
        <Link href={cartHref} aria-label="Bag" className={btn}>
          <ShoppingBag className="size-[1.15rem]" strokeWidth={1.8} />
          {cartCount ? (
            <span className="absolute -right-1 -top-1 grid h-[1.1rem] min-w-[1.1rem] place-items-center rounded-full px-1 text-[0.625rem] font-bold text-white" style={{ background: "var(--customer-primary, #730321)" }}>
              {cartCount}
            </span>
          ) : null}
        </Link>
      </div>
      {images.length > 1 ? (
        <div className="absolute inset-x-0 bottom-9 flex justify-center gap-1.5">
          {images.map((id, i) => (
            <i key={id} className={cn("block h-1.5 rounded-full", i === Math.min(selected, images.length - 1) ? "w-[18px] bg-[var(--customer-primary,#730321)]" : "w-1.5 bg-[#d6c3c0]")} />
          ))}
        </div>
      ) : null}
    </section>
  );
}

type PricingLike = {
  computable?: boolean;
  gold?: { purity?: string; weightMg?: number; ratePerGram?: { amountDisplay?: string }; goldValue?: { amountDisplay?: string } };
  making?: { beforeOffer?: { amountDisplay?: string }; offerDiscount?: { amountDisplay?: string; amountPaise?: number }; afterOffer?: { amountDisplay?: string } };
  stones?: { amountDisplay?: string; amountPaise?: number };
  otherCharges?: { amountDisplay?: string; amountPaise?: number };
  tax?: { total?: { amountDisplay?: string }; lines?: { label?: string; rateBps?: number; tax?: { amountDisplay?: string } }[] };
  displayTotal?: { amountDisplay?: string };
  contract?: { taxEstimateDisclaimer?: string; offerPolicyNote?: string; fixedPriceAllInclusive?: boolean; fixedPriceNote?: string };
};

/** Price breakup table (plan): gold value · making · GST · total. */
function PriceBreakupTable({ pricing }: { pricing?: PricingLike | null }) {
  if (!pricing?.computable) {
    return <CustomerPriceBreakdown pricing={pricing as Parameters<typeof CustomerPriceBreakdown>[0]["pricing"]} />;
  }
  const rows: { label: string; detail?: string; value: string; offer?: boolean }[] = [];
  if (pricing.gold?.goldValue?.amountDisplay) {
    const w = formatGramsFromMg(pricing.gold.weightMg);
    rows.push({
      label: "Gold value",
      detail: [w, pricing.gold.ratePerGram?.amountDisplay].filter(Boolean).join(" × "),
      value: pricing.gold.goldValue.amountDisplay,
    });
  }
  const offerPaise = Number(pricing.making?.offerDiscount?.amountPaise ?? 0);
  if (offerPaise > 0 && pricing.making?.beforeOffer?.amountDisplay) {
    rows.push({ label: "Making charges", value: pricing.making.beforeOffer.amountDisplay });
    rows.push({ label: "Making offer", value: `− ${pricing.making.offerDiscount?.amountDisplay}`, offer: true });
  } else if (pricing.making?.afterOffer?.amountDisplay) {
    rows.push({ label: "Making charges", value: pricing.making.afterOffer.amountDisplay });
  }
  if (Number(pricing.stones?.amountPaise ?? 0) > 0) rows.push({ label: "Stones", value: pricing.stones!.amountDisplay ?? "" });
  if (Number(pricing.otherCharges?.amountPaise ?? 0) > 0) rows.push({ label: "Other charges", value: pricing.otherCharges!.amountDisplay ?? "" });
  for (const t of pricing.tax?.lines ?? []) {
    rows.push({ label: `${t.label ?? "Tax"}${t.rateBps ? ` ${t.rateBps / 100}%` : ""}`, value: t.tax?.amountDisplay ?? "—" });
  }
  if (!(pricing.tax?.lines ?? []).length && pricing.tax?.total?.amountDisplay) rows.push({ label: "Tax", value: pricing.tax.total.amountDisplay });
  return (
    <div>
      <div className="overflow-hidden rounded-2xl border border-[var(--ck-line,#ebe2d7)]">
        {rows.map((r) => (
          <div key={r.label} className="flex items-baseline justify-between gap-3 border-b border-[var(--ck-line-soft,#f1eae1)] bg-white px-3.5 py-2.5 text-[0.85rem]">
            <span className="text-[var(--ck-ink-2,#4f4246)]">
              {r.label}
              {r.detail ? <span className="ml-1.5 text-[0.72rem] text-[var(--ck-muted,#87787c)]">{r.detail}</span> : null}
            </span>
            <span className={cn("tabular-nums", r.offer ? "text-[var(--ck-ok,#1f6b4c)]" : "text-[var(--ck-ink,#1d1417)]")}>{r.value}</span>
          </div>
        ))}
        <div className="flex items-baseline justify-between gap-3 bg-[#fbf7f1] px-3.5 py-2.5 text-[0.88rem] font-bold text-[var(--ck-ink,#1d1417)]">
          <span>Total</span>
          <span className="tabular-nums">{pricing.displayTotal?.amountDisplay ?? "—"}</span>
        </div>
      </div>
      {pricing.contract?.offerPolicyNote ? <p className="mt-2 text-xs text-[var(--ck-ok,#1f6b4c)]">{pricing.contract.offerPolicyNote}</p> : null}
      {pricing.contract?.fixedPriceAllInclusive && pricing.contract.fixedPriceNote ? <p className={cn("mt-2 text-xs", SHOP_MUTED)}>{pricing.contract.fixedPriceNote}</p> : null}
      {pricing.contract?.taxEstimateDisclaimer ? <p className={cn("mt-2 text-xs", SHOP_MUTED)}>{pricing.contract.taxEstimateDisclaimer}</p> : null}
    </div>
  );
}

function RelatedProducts({ product, tenantSlug }: { product: Record<string, unknown>; tenantSlug: string }) {
  const categoryId = product.categoryId ? String(product.categoryId) : undefined;
  const related = useGetShopProductsQuery({ categoryId, limit: 5 }, { skip: !categoryId });
  const { add } = useAddToCart();
  const [adding, setAdding] = useState<string | null>(null);
  const items = (related.data?.items ?? []).filter((p) => p.id !== product.id).slice(0, 4);
  if (!items.length) return null;
  return (
    <section className="mt-8">
      <div className="mb-3 flex items-end justify-between gap-3">
        <h2 className="text-[1.05rem] font-extrabold tracking-[-0.02em] text-[var(--ck-ink,#1d1417)]">More from {String(product.categoryName ?? "this collection")}</h2>
        <Link href={`${customerPath(tenantSlug, "shop")}?categoryId=${encodeURIComponent(categoryId ?? "")}`} className="shrink-0 text-sm font-semibold text-[var(--customer-primary,#730321)] underline-offset-4 hover:underline">
          See all
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
        {items.map((p) => (
          <CustomerShopProductCard
            key={String(p.id)}
            product={p}
            tenantSlug={tenantSlug}
            adding={adding === String(p.id)}
            onAddToCart={() => {
              setAdding(String(p.id));
              add(String(p.id), `${String(p.name)} added to your cart`)
                .catch(toastApiError)
                .finally(() => setAdding(null));
            }}
          />
        ))}
      </div>
    </section>
  );
}

export function CustomerShopProductPage({ slug }: { slug: string }) {
  const router = useRouter();
  const { tenantSlug } = useCustomerTenant();
  const availability = useGetShopAvailabilityQuery();
  const { add, adding, cart, count } = useAddToCart(!availability.data?.available);
  const product = useGetShopProductQuery(slug, { skip: !availability.data?.available });

  if (availability.isLoading || product.isLoading) return <PageSkeleton cards={2} />;
  if (!availability.data?.available) {
    return <ShopUnavailable tenantSlug={tenantSlug} hasOrderHistory={availability.data?.hasOrderHistory} />;
  }
  if (product.isError) return <QueryError error={product.error} onRetry={product.refetch} />;
  const p = product.data;
  if (!p) return null;

  const stock = productStock(p);
  const pricing = p.pricing as PricingLike | undefined;
  const priceReady = pricing?.computable === true;
  const canBuy = priceReady && stock.tone !== "out";
  const weight = formatGramsFromMg(p.goldWeightMg as number | undefined);
  const inCart = ((cart.data?.lines as CartLine[] | undefined) ?? []).find((l) => l.productId === p.id)?.quantity ?? 0;
  const shopHref = customerPath(tenantSlug, "shop");
  const cartHref = customerPath(tenantSlug, "shop", "cart");
  const goldPurity = pricing?.gold?.purity ?? (p.purity ? String(p.purity) : null);
  const stockChip =
    stock.tone === "out"
      ? { label: stock.label, cls: "bg-[var(--ck-bad-soft,#fbebe8)] text-[var(--ck-bad,#a8382d)]" }
      : stock.label
        ? { label: stock.label, cls: stock.tone === "low" ? "bg-[var(--ck-warn-soft,#fbf1dd)] text-[var(--ck-warn,#9a6a12)]" : "bg-[var(--ck-ok-soft,#e6f2ec)] text-[var(--ck-ok,#1f6b4c)]" }
        : null;

  async function onAdd(goToCart: boolean) {
    try {
      await add(String(p!.id), goToCart ? "Added — taking you to your bag" : `${String(p!.name)} added to your bag`);
      if (goToCart) router.push(cartHref);
    } catch (err) {
      toastApiError(err);
    }
  }

  return (
    <div className="mx-auto max-w-lg pb-28 lg:max-w-5xl lg:pb-10">
      <div className="lg:grid lg:grid-cols-2 lg:gap-10">
        <ProductGallery product={p} onBackHref={shopHref} cartHref={cartHref} cartCount={count} />

        <section className="relative -mx-4 -mt-6 rounded-t-[26px] bg-white px-4 pb-4 pt-5 lg:mx-0 lg:mt-0 lg:rounded-[1.75rem] lg:border lg:border-[var(--ck-line,#ebe2d7)] lg:p-6">
          <div className="flex flex-wrap gap-1.5">
            {goldPurity ? <span className="rounded-full bg-[var(--ck-gold-soft,#f6eedf)] px-2.5 py-1 text-[0.72rem] font-semibold text-[#6b4e1c]">{goldPurity}</span> : null}
            {weight ? <span className="rounded-full bg-[var(--ck-gold-soft,#f6eedf)] px-2.5 py-1 text-[0.72rem] font-semibold text-[#6b4e1c]">{weight}</span> : null}
            {stockChip ? <span className={cn("rounded-full px-2.5 py-1 text-[0.72rem] font-semibold", stockChip.cls)}>{stockChip.label}</span> : null}
            {productOfferLabel(p) ? <span className="rounded-full px-2.5 py-1 text-[0.72rem] font-semibold text-white" style={{ background: "var(--customer-primary, #730321)" }}>{productOfferLabel(p)}</span> : null}
          </div>
          <h1 className="mt-2.5 text-[1.55rem] font-extrabold leading-tight tracking-[-0.035em] text-[var(--ck-ink,#1d1417)]">{String(p.name)}</h1>
          <div className="mt-1 flex flex-wrap items-baseline gap-x-2">
            <ShopPriceLabel pricing={p.pricing as Parameters<typeof ShopPriceLabel>[0]["pricing"]} className="text-[1.85rem] font-extrabold tabular-nums tracking-[-0.035em] text-[var(--ck-ink,#1d1417)]" />
            {priceReady && goldPurity && pricing?.gold?.ratePerGram ? <span className={cn("text-xs", SHOP_MUTED)}>at today&apos;s {goldPurity} rate</span> : null}
          </div>

          <div className="mt-3.5">
            <PriceBreakupTable pricing={pricing} />
          </div>

          <div className="mt-3 flex items-center gap-3 rounded-2xl border border-dashed border-[var(--ck-line,#ebe2d7)] p-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--ck-gold-soft,#f6eedf)] text-[#8a6a24]">
              <Store className="size-[1.1rem]" />
            </span>
            <span className="min-w-0">
              <span className="block text-[0.88rem] font-semibold text-[var(--ck-ink,#1d1417)]">Pick up at the branch or get it delivered</span>
              <span className="block text-xs text-[var(--ck-muted,#87787c)]">Choose at checkout · options depend on your pincode</span>
            </span>
          </div>

          {priceReady ? <BookWithAdvance productId={String(p.id)} className="mt-3" /> : null}

          {!priceReady ? (
            <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">The price is being refreshed. You can add this piece once it shows a price.</p>
          ) : null}

          {p.description ? (
            <div className="mt-5">
              <h2 className="text-sm font-semibold text-[var(--ck-ink,#1d1417)]">About this piece</h2>
              <p className={cn("mt-1.5 whitespace-pre-wrap text-sm leading-6", SHOP_MUTED)}>{String(p.description)}</p>
            </div>
          ) : null}
          {p.sku ? <p className={cn("mt-3 text-xs", SHOP_MUTED)}>Item code {String(p.sku)}</p> : null}

          <div className="mt-5 hidden gap-2.5 lg:grid lg:grid-cols-2">
            <Button type="button" variant="outline" className="h-12 rounded-[14px] border-[1.5px] text-[15px] font-bold" style={{ borderColor: "var(--customer-primary, #730321)", color: "var(--customer-primary, #730321)" }} disabled={!canBuy || adding || cart.isLoading} onClick={() => void onAdd(false)}>
              {adding ? "Adding…" : inCart ? `Add another (${inCart})` : "Add to bag"}
            </Button>
            <Button type="button" className="h-12 rounded-[14px] text-[15px] font-bold text-white" style={customerBrandStyle.primaryBg} disabled={!canBuy || adding || cart.isLoading} onClick={() => void onAdd(true)}>
              Buy now
            </Button>
          </div>
          <CustomerShopPoliciesLinks className="mt-5" />
        </section>
      </div>

      <RelatedProducts product={p} tenantSlug={tenantSlug ?? ""} />

      {/* Sticky actions (plan): Add to bag · Buy now. The tab bar is hidden on this page. */}
      <div className="customer-bottom-safe fixed inset-x-0 bottom-0 z-40 grid grid-cols-2 gap-2.5 border-t border-[var(--ck-line,#ebe2d7)] bg-white px-4 pt-3 lg:hidden">
        <Button type="button" variant="outline" className="h-12 rounded-[14px] border-[1.5px] bg-white text-[15px] font-bold" style={{ borderColor: "var(--customer-primary, #730321)", color: "var(--customer-primary, #730321)" }} disabled={!canBuy || adding || cart.isLoading} onClick={() => void onAdd(false)}>
          {adding ? "Adding…" : inCart ? `Add another (${inCart})` : "Add to bag"}
        </Button>
        <Button type="button" className="h-12 rounded-[14px] text-[15px] font-bold text-white" style={customerBrandStyle.primaryBg} disabled={!canBuy || adding || cart.isLoading} onClick={() => void onAdd(true)}>
          Buy now
        </Button>
      </div>
    </div>
  );
}
