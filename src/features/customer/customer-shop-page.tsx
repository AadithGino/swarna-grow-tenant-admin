"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { ArrowRight, ChevronLeft, Gem, Package, ShieldCheck, ShoppingBag, Store, Truck } from "lucide-react";
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
import { PageSkeleton, QueryError } from "@/src/components/common/query-state";
import { ShopPriceLabel } from "@/src/features/ecommerce/ecommerce-admin-shared";
import { EcommerceCatalogImage } from "@/src/features/ecommerce/ecommerce-catalog-image";
import { useCustomerTenant } from "@/src/components/customer/customer-tenant-context";
import { customerPath } from "@/src/lib/customer-tenant";
import { customerShopOrdersPath } from "@/src/lib/customer-shop-paths";
import { customerBrandStyle } from "@/src/lib/customer-brand-styles";
import { customerBannerHref } from "@/src/lib/customer-banner-routing";
import { CustomerShopPoliciesLinks } from "@/src/features/customer/customer-shop-policies";
import {
  CustomerShopCatalogToolbar,
  CustomerShopCategoryRail,
  CustomerShopEmptyState,
  CustomerShopProductCard,
} from "@/src/features/customer/customer-shop-catalog-ui";
import { shouldShowShopPromoRail, type CustomerPromoBanner } from "@/src/features/customer/customer-promo-banners";
import { customerBannerQueryOptions, useCustomerBannerScheduleRefetch } from "@/src/lib/customer-banner-refresh";
import {
  CustomerPriceBreakdown,
  formatGramsFromMg,
  productOfferLabel,
  productPricePaise,
  productStock,
  SHOP_HAIRLINE,
  SHOP_INK,
  SHOP_MUTED,
  ShopPanel,
  StockDot,
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

/** Today's per-gram rate the catalogue is priced at, read from a product's own pricing block. */
function catalogueRate(items: Record<string, unknown>[]) {
  for (const purity of ["22K", "24K", "18K"]) {
    const hit = items.find((p) => {
      const g = (p.pricing as { gold?: { purity?: string; ratePerGram?: { amountDisplay?: string } } } | undefined)?.gold;
      return g?.purity === purity && g.ratePerGram?.amountDisplay;
    });
    if (hit) {
      const g = (hit.pricing as { gold: { purity: string; ratePerGram: { amountDisplay: string } } }).gold;
      return { purity, display: g.ratePerGram.amountDisplay };
    }
  }
  return null;
}

function ShopOffersStrip({ tenantSlug, items }: { tenantSlug: string; items: CustomerPromoBanner[] }) {
  const visible = items.filter((b) => b.title && b.imageUploadId);
  if (!visible.length) return null;
  return (
    <section aria-label="Offers" className="mt-8">
      <div
        className={cn(
          "-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:-mx-6 sm:px-6 lg:mx-0 lg:grid lg:overflow-visible lg:px-0 [&::-webkit-scrollbar]:hidden",
          visible.length === 1 ? "lg:grid-cols-1" : "lg:grid-cols-2",
        )}
      >
        {visible.map((banner) => {
          const href = customerBannerHref(tenantSlug, banner.destination ?? { type: "NONE" }, { shopAvailable: true });
          const card = (
            <div className={cn("relative aspect-[14/5] w-[min(86vw,520px)] shrink-0 snap-start overflow-hidden rounded-[1.25rem] bg-[#efe6e1] lg:w-auto", visible.length === 1 && "lg:aspect-[4/1]")}>
              <EcommerceCatalogImage uploadId={banner.imageUploadId} viewUrl={banner.imageUrl ?? undefined} channel="customer" alt="" fill className="object-cover" />
              <span className="sr-only">{[banner.title, banner.subtitle].filter(Boolean).join(". ")}</span>
            </div>
          );
          return href ? (
            <Link key={banner.id} href={href} className="block shrink-0 rounded-[1.25rem] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--customer-primary,#730321)] lg:shrink" aria-label={banner.title}>
              {card}
            </Link>
          ) : (
            <article key={banner.id} aria-label={banner.title}>
              {card}
            </article>
          );
        })}
      </div>
    </section>
  );
}

function ShopHero({
  tenantName,
  rate,
  featured,
  tenantSlug,
  hasOrders,
}: {
  tenantName?: string | null;
  rate: { purity: string; display: string } | null;
  featured?: Record<string, unknown>;
  tenantSlug: string;
  hasOrders: boolean;
}) {
  return (
    <section
      className="relative overflow-hidden rounded-[1.75rem] text-white"
      style={{ background: "linear-gradient(125deg, var(--customer-primary, #730321) 0%, color-mix(in srgb, var(--customer-primary, #730321) 72%, black) 100%)" }}
    >
      <div
        className="pointer-events-none absolute -right-24 -top-24 size-[26rem] rounded-full opacity-40"
        style={{ background: "radial-gradient(circle, rgba(var(--customer-accent-rgb, 201, 162, 39), 0.55), transparent 65%)" }}
        aria-hidden
      />
      <div className="relative grid gap-6 p-6 sm:p-9 lg:grid-cols-[1.25fr_.75fr] lg:items-center lg:gap-10 lg:p-11">
        <div>
          <p className="text-sm font-medium" style={customerBrandStyle.heroBadgeText}>
            {tenantName ? `${tenantName} online store` : "Online store"}
          </p>
          <h1 className="mt-3 max-w-xl font-serif text-[2rem] leading-[1.12] sm:text-[2.6rem]">
            Fine jewellery, priced at today&apos;s gold rate
          </h1>
          <p className="mt-4 max-w-lg text-sm leading-6 sm:text-[15px]" style={customerBrandStyle.heroBodyText}>
            Every price shows the gold value, making charge and GST before you pay. Collect from the branch or have it delivered.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-2.5">
            {rate ? (
              <span className="inline-flex items-center gap-2 rounded-full bg-white/12 px-3.5 py-2 text-sm ring-1 ring-white/20">
                <Gem className="size-4" style={customerBrandStyle.heroIconAccent} aria-hidden />
                {rate.purity} today <strong className="font-semibold">{rate.display}/g</strong>
              </span>
            ) : null}
            {hasOrders ? (
              <Link
                href={customerShopOrdersPath(tenantSlug)}
                className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium text-white/90 underline-offset-4 hover:underline"
              >
                <Package className="size-4" aria-hidden />
                Track my orders
              </Link>
            ) : null}
          </div>
        </div>
        {featured ? (
          <Link
            href={customerPath(tenantSlug, "shop", encodeURIComponent(String(featured.slug)))}
            className="group flex items-center gap-4 rounded-[1.4rem] bg-white/95 p-3 text-[#221a1d] shadow-[0_18px_40px_rgba(0,0,0,0.25)] transition hover:bg-white lg:ml-auto lg:w-full lg:max-w-[18rem] lg:flex-col lg:items-stretch lg:p-3.5"
          >
            <span className="relative block aspect-square w-24 shrink-0 overflow-hidden rounded-2xl customer-primary-tint-surface lg:aspect-[5/4] lg:w-full">
              <EcommerceCatalogImage
                uploadId={(featured.imageUploadIds as string[] | undefined)?.[0]}
                channel="customer"
                alt=""
                fill
                className="object-cover transition duration-500 group-hover:scale-[1.03]"
              />
            </span>
            <span className="min-w-0 flex-1">
              <span className="text-xs font-medium text-[#8a7d80]">Featured piece</span>
              <span className="mt-0.5 line-clamp-2 block font-serif text-lg leading-snug">{String(featured.name)}</span>
              <span className="mt-1 flex items-center justify-between gap-2">
                <ShopPriceLabel pricing={featured.pricing as Parameters<typeof ShopPriceLabel>[0]["pricing"]} className="text-base font-semibold text-[var(--customer-primary,#730321)]" />
                <ArrowRight className="size-4 text-[var(--customer-primary,#730321)] transition group-hover:translate-x-0.5" aria-hidden />
              </span>
            </span>
          </Link>
        ) : null}
      </div>
    </section>
  );
}

function ShopAssurances() {
  const items = [
    { icon: ShieldCheck, title: "See the full price", detail: "Gold, making and GST itemised on every piece." },
    { icon: Store, title: "Collect from the branch", detail: "Choose pickup at checkout where available." },
    { icon: Truck, title: "Or have it delivered", detail: "Delivery and cash on delivery depend on your pincode." },
  ];
  return (
    <ul className={cn("mt-12 grid gap-px overflow-hidden rounded-[1.25rem] border bg-[#ecdfd8] sm:grid-cols-3", SHOP_HAIRLINE)}>
      {items.map((it) => (
        <li key={it.title} className="flex gap-3 bg-white p-5">
          <it.icon className="mt-0.5 size-5 shrink-0 customer-gold-copy" aria-hidden />
          <div>
            <p className={cn("text-sm font-semibold", SHOP_INK)}>{it.title}</p>
            <p className={cn("mt-0.5 text-xs leading-5", SHOP_MUTED)}>{it.detail}</p>
          </div>
        </li>
      ))}
    </ul>
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
  const availability = useGetShopAvailabilityQuery();
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

  const rate = useMemo(
    () => catalogueRate([...(featuredQuery.data?.items ?? []), ...(products.data?.items ?? [])]),
    [featuredQuery.data?.items, products.data?.items],
  );

  function clearAllFilters() {
    setSearchInput("");
    setCategoryId(undefined);
  }

  async function addProductToCart(product: Record<string, unknown>) {
    const pid = String(product.id);
    setAddingProductId(pid);
    try {
      await add(pid, `${String(product.name)} added to your cart`);
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
  const showOffers = shouldShowShopPromoRail(shopBannerItems, hasActiveFilters);
  const featuredItems = featuredQuery.data?.items ?? [];
  const featured = featuredItems.find((p) => productStock(p).tone !== "out" && productPricePaise(p) != null) ?? featuredItems[0];
  const hasOrders = availability.data?.hasOrderHistory === true;

  return (
    <div className="pb-6">
      {!hasActiveFilters ? (
        <ShopHero tenantName={tenant?.appDisplayName ?? tenant?.displayName} rate={rate} featured={featured} tenantSlug={slug} hasOrders={hasOrders} />
      ) : null}

      <div className={cn(hasActiveFilters ? "mt-1" : "mt-8")}>
        <CustomerShopCategoryRail categories={categoryRows} categoryId={categoryId} onCategoryChange={setCategoryId} />
      </div>

      {showOffers ? <ShopOffersStrip tenantSlug={slug} items={shopBannerItems} /> : null}

      <div className="mt-6">
        <CustomerShopCatalogToolbar
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

      <div className="mt-6">
        {products.isLoading && !mergedItems.length ? (
          <PageSkeleton cards={3} />
        ) : products.isError ? (
          <QueryError error={products.error} onRetry={products.refetch} />
        ) : !mergedItems.length ? (
          <CustomerShopEmptyState searchQ={searchQ} hasFilters={hasActiveFilters} onReset={clearAllFilters} />
        ) : (
          <>
            <div id="collection" className={cn("grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-5 lg:grid-cols-3 xl:grid-cols-4", products.isFetching && "opacity-70 transition-opacity")}>
              {mergedItems.map((p) => (
                <CustomerShopProductCard
                  key={String(p.id)}
                  product={p}
                  tenantSlug={slug}
                  adding={addingProductId === String(p.id)}
                  onAddToCart={() => void addProductToCart(p)}
                />
              ))}
            </div>
            {cursorForMore ? (
              <div className="mt-10 flex justify-center">
                <Button type="button" variant="outline" className="h-11 rounded-full px-7" disabled={fetchMoreState.isFetching} onClick={loadMore}>
                  {fetchMoreState.isFetching ? "Loading…" : "Show more pieces"}
                </Button>
              </div>
            ) : null}
          </>
        )}
      </div>

      <ShopAssurances />
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <CustomerShopPoliciesLinks />
        <p className={cn("max-w-md text-xs leading-5 sm:text-right", SHOP_MUTED)}>
          Prices follow the jeweller&apos;s published rate and may change until you confirm your price preview at checkout.
        </p>
      </div>
    </div>
  );
}

function ProductGallery({ product }: { product: Record<string, unknown> }) {
  const [selected, setSelected] = useState(0);
  const images = (product.imageUploadIds as string[] | undefined) ?? [];
  const urls = (product.imageUrls as { viewUrl?: string }[] | undefined) ?? [];
  const index = Math.min(selected, Math.max(0, images.length - 1));
  const offer = productOfferLabel(product);
  return (
    <section aria-label="Product images" className="lg:flex lg:gap-4">
      {images.length > 1 ? (
        <div className="order-2 mt-3 flex gap-3 overflow-x-auto pb-1 lg:order-1 lg:mt-0 lg:w-20 lg:flex-col lg:overflow-visible" role="group" aria-label="Choose image">
          {images.map((id, i) => (
            <button
              type="button"
              key={id}
              onClick={() => setSelected(i)}
              aria-label={`View image ${i + 1}`}
              aria-pressed={index === i}
              className={cn(
                "relative size-20 shrink-0 overflow-hidden rounded-2xl border-2 customer-primary-tint-surface transition",
                index === i ? "border-[var(--customer-primary,#730321)]" : "border-transparent opacity-80 hover:opacity-100",
              )}
            >
              <EcommerceCatalogImage uploadId={id} viewUrl={urls[i]?.viewUrl} channel="customer" alt="" fill className="object-cover" />
            </button>
          ))}
        </div>
      ) : null}
      <div className="relative order-1 aspect-square flex-1 overflow-hidden rounded-[1.75rem] customer-primary-tint-surface lg:order-2">
        <EcommerceCatalogImage uploadId={images[index]} viewUrl={urls[index]?.viewUrl} channel="customer" alt={String(product.name)} fill className="object-cover" />
        <span className="absolute left-4 top-4 flex flex-wrap gap-2">
          {offer ? <span className="rounded-full bg-[var(--customer-primary,#730321)] px-3 py-1.5 text-xs font-semibold text-white">{offer}</span> : null}
          {product.featured === true ? <span className="rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-[#3a2f33]">Featured</span> : null}
        </span>
      </div>
    </section>
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
    <section className="mt-14">
      <div className="mb-5 flex items-end justify-between gap-3">
        <h2 className={cn("font-serif text-2xl", SHOP_INK)}>More from {String(product.categoryName ?? "this collection")}</h2>
        <Link href={`${customerPath(tenantSlug, "shop")}?categoryId=${encodeURIComponent(categoryId ?? "")}`} className="shrink-0 text-sm font-semibold text-[var(--customer-primary,#730321)] underline-offset-4 hover:underline">
          See all
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-5 lg:grid-cols-4">
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
  const priceReady = (p.pricing as { computable?: boolean } | undefined)?.computable === true;
  const canBuy = priceReady && stock.tone !== "out";
  const weight = formatGramsFromMg(p.goldWeightMg as number | undefined);
  const inCart = ((cart.data?.lines as CartLine[] | undefined) ?? []).find((l) => l.productId === p.id)?.quantity ?? 0;
  const shopHref = customerPath(tenantSlug, "shop");
  const cartHref = customerPath(tenantSlug, "shop", "cart");
  const facts = [
    p.purity ? { label: "Purity", value: String(p.purity) } : null,
    weight ? { label: "Gold weight", value: weight } : null,
    p.categoryName ? { label: "Collection", value: String(p.categoryName) } : null,
    p.sku ? { label: "Item code", value: String(p.sku) } : null,
  ].filter((f): f is { label: string; value: string } => Boolean(f));

  async function onAdd(goToCart: boolean) {
    try {
      await add(String(p!.id), goToCart ? "Added — taking you to your cart" : `${String(p!.name)} added to your cart`);
      if (goToCart) router.push(cartHref);
    } catch (err) {
      toastApiError(err);
    }
  }

  return (
    <div className="pb-10">
      <nav aria-label="Breadcrumb" className={cn("mb-6 flex items-center gap-1.5 text-sm", SHOP_MUTED)}>
        <Link href={shopHref} className="inline-flex items-center gap-1 font-medium text-[var(--customer-primary,#730321)] underline-offset-4 hover:underline">
          <ChevronLeft className="size-4" aria-hidden />
          Store
        </Link>
        {p.categoryName && p.categoryId ? (
          <>
            <span aria-hidden>/</span>
            <Link href={`${shopHref}?categoryId=${encodeURIComponent(String(p.categoryId))}`} className="underline-offset-4 hover:underline">
              {String(p.categoryName)}
            </Link>
          </>
        ) : null}
      </nav>

      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,.9fr)] lg:gap-12">
        <ProductGallery product={p} />

        <section className="lg:sticky lg:top-28">
          <h1 className={cn("font-serif text-[2rem] leading-tight sm:text-[2.4rem]", SHOP_INK)}>{String(p.name)}</h1>
          <div className="mt-4 flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <ShopPriceLabel pricing={p.pricing as Parameters<typeof ShopPriceLabel>[0]["pricing"]} className="text-3xl font-semibold tabular-nums text-[var(--customer-primary,#730321)]" />
            {priceReady ? <span className={cn("text-xs", SHOP_MUTED)}>Estimated, incl. GST</span> : null}
          </div>
          <div className="mt-2">
            <StockDot stock={stock} className="text-sm" />
          </div>

          {facts.length ? (
            <dl className={cn("mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border bg-[#ecdfd8]", SHOP_HAIRLINE)}>
              {facts.map((f) => (
                <div key={f.label} className="bg-white px-4 py-3">
                  <dt className={cn("text-xs", SHOP_MUTED)}>{f.label}</dt>
                  <dd className={cn("mt-0.5 truncate text-sm font-semibold", SHOP_INK)}>{f.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}

          <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
            <Button type="button" className="h-12 flex-1 rounded-full text-[15px] text-white" style={customerBrandStyle.primaryBg} disabled={!canBuy || adding || cart.isLoading} onClick={() => void onAdd(false)}>
              <ShoppingBag className="mr-2 size-4" />
              {adding ? "Adding…" : inCart ? `Add another (${inCart} in cart)` : "Add to cart"}
            </Button>
            <Button type="button" variant="outline" style={{ borderColor: "var(--customer-primary, #730321)" }} className="h-12 flex-1 rounded-full text-[15px] text-[var(--customer-primary,#730321)] hover:bg-[rgba(var(--customer-primary-rgb,115,3,33),0.05)]" disabled={!canBuy || adding || cart.isLoading} onClick={() => void onAdd(true)}>
              Buy now
            </Button>
          </div>
          {count > 0 ? (
            <Link href={cartHref} className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--customer-primary,#730321)] underline-offset-4 hover:underline">
              View cart ({count}) <ArrowRight className="size-4" />
            </Link>
          ) : null}
          {!priceReady ? (
            <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">The price is being refreshed. You can add this piece once it shows a price.</p>
          ) : null}

          {p.description ? (
            <div className={cn("mt-8 border-t pt-6", SHOP_HAIRLINE)}>
              <h2 className={cn("text-sm font-semibold", SHOP_INK)}>About this piece</h2>
              <p className={cn("mt-2 whitespace-pre-wrap text-sm leading-7", SHOP_MUTED)}>{String(p.description)}</p>
            </div>
          ) : null}

          <ShopPanel title="How this price is built" description="Today's rate, making and tax. Your final amount is confirmed in the price preview." className="mt-6">
            <CustomerPriceBreakdown pricing={p.pricing as Parameters<typeof CustomerPriceBreakdown>[0]["pricing"]} />
          </ShopPanel>
          <CustomerShopPoliciesLinks className="mt-5" />
        </section>
      </div>

      <RelatedProducts product={p} tenantSlug={tenantSlug ?? ""} />
    </div>
  );
}
