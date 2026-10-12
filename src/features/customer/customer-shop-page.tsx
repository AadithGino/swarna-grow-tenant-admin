"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Gem, ShieldCheck, ShoppingBag, Sparkles, Truck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  useGetShopAvailabilityQuery,
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
  const availability = useGetShopAvailabilityQuery();
  const categories = useGetShopCategoriesQuery(undefined, {
    skip: !availability.data?.available,
  });
  const [categoryId, setCategoryId] = useState<string | undefined>();
  const [searchInput, setSearchInput] = useState("");
  const [searchQ, setSearchQ] = useState<string | undefined>();
  const [sort, setSort] = useState<"newest" | "name">("newest");
  const [tailItems, setTailItems] = useState<Record<string, unknown>[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null | undefined>();

  const products = useGetShopProductsQuery(
    { categoryId, limit: 12, q: searchQ, sort },
    { skip: !availability.data?.available },
  );
  const [fetchMore, fetchMoreState] = useLazyGetShopProductsQuery();

  const firstPage = products.data?.items ?? [];
  const mergedItems = [...firstPage, ...tailItems];
  const cursorForMore = nextCursor === undefined
    ? (products.data?.meta?.nextCursor as string | null | undefined)
    : nextCursor;

  function resetCatalogTail() {
    setTailItems([]);
    setNextCursor(undefined);
  }

  function selectCategory(id: string | undefined) {
    setCategoryId(id);
    resetCatalogTail();
  }

  function applySearch() {
    const trimmed = searchInput.trim();
    setSearchQ(trimmed.length >= 2 ? trimmed : undefined);
    resetCatalogTail();
  }

  function onSortChange(value: string) {
    setSort(value === "name" ? "name" : "newest");
    resetCatalogTail();
  }

  async function loadMore() {
    const cursor = cursorForMore;
    if (!cursor) return;
    try {
      const data = await fetchMore({ categoryId, limit: 12, cursor, q: searchQ, sort }).unwrap();
      setTailItems((prev) => dedupeAppend(firstPage, prev, data.items ?? []));
      setNextCursor((data.meta?.nextCursor as string | null) ?? null);
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
        <Link
          href={customerPath(tenantSlug)}
          className="mt-6 inline-flex rounded-xl px-5 py-3 text-sm font-semibold text-white"
          style={customerBrandStyle.primaryBg}
        >
          Go to home
        </Link>
      </div>
    );
  }
  const categoryRows = categories.data?.items ?? [];

  return (
    <>
      <section
        className="relative mb-8 overflow-hidden rounded-[2rem] px-7 py-10 text-white sm:px-12 sm:py-14"
        style={customerBrandStyle.primaryHero}
      >
        <div className="pointer-events-none absolute -right-20 -top-28 size-80 rounded-full border border-white/15" />
        <div className="pointer-events-none absolute right-3 top-16 size-48 rounded-full border border-white/10" />
        <div className="relative max-w-xl">
          <span
            className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-xs font-semibold"
            style={customerBrandStyle.heroBadgeText}
          >
            <Sparkles className="size-3.5" /> The online collection
          </span>
          <h1 className="mt-5 font-serif text-4xl leading-tight sm:text-5xl">Find something worth keeping.</h1>
          <p className="mt-4 text-sm leading-7 sm:text-base" style={customerBrandStyle.heroBodyText}>
            Browse jewellery from your jeweller. See current server pricing before you request a final quote.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <a
              href="#collection"
              className="inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold"
              style={customerBrandStyle.accentCta}
            >
              Explore collection <ArrowRight className="size-4" />
            </a>
            <Link href={customerPath(tenantSlug, "shop", "cart")} className="inline-flex items-center gap-2 rounded-xl border border-white/40 px-5 py-3 text-sm font-semibold text-white"><ShoppingBag className="size-4" /> Your cart</Link>
            <Link href={customerShopOrdersPath(tenantSlug)} className="inline-flex items-center gap-2 rounded-xl border border-white/25 px-5 py-3 text-sm font-semibold text-white/95">Order history</Link>
          </div>
        </div>
      </section>
      <div className="mb-9 grid gap-3 sm:grid-cols-3">
        {[
          { icon: Gem, title: "Clear pricing", detail: "Gold and making breakdowns" },
          { icon: ShieldCheck, title: "Secure checkout", detail: "Payment is confirmed by the server" },
          { icon: Truck, title: "Flexible fulfilment", detail: "Pickup or delivery when available" },
        ].map(({ icon: Icon, title, detail }) => (
          <div key={title} className="flex items-center gap-3 rounded-2xl border border-[#ece3da] bg-white px-4 py-4">
            <span
              className={cn("grid size-10 shrink-0 place-items-center rounded-xl customer-accent-tint-surface", customerBrandClass.accentText)}
            >
              <Icon className="size-5" />
            </span>
            <span><strong className="block text-sm">{title}</strong><small className="text-xs text-muted-foreground">{detail}</small></span>
          </div>
        ))}
      </div>
      <div id="collection" className="mb-5 scroll-mt-24">
        <p className={cn("text-xs font-bold uppercase tracking-[.2em]", customerBrandClass.accentText)}>The collection</p>
        <h2 className="mt-1 font-serif text-3xl text-[#312027]">{categoryRows.find((row) => String(row.id) === categoryId)?.name?.toString() ?? "Browse jewellery"}</h2>
      </div>
      {categoryRows.length ? (
        <div className="mb-6 flex gap-2 overflow-x-auto pb-2" role="group" aria-label="Product categories">
          <Button
            type="button"
            size="sm"
            variant={categoryId ? "outline" : "default"}
            onClick={() => selectCategory(undefined)}
          >
            All
          </Button>
          {categoryRows.map((c) => (
            <Button
              key={String(c.id)}
              type="button"
              size="sm"
              variant={categoryId === c.id ? "default" : "outline"}
              onClick={() => selectCategory(String(c.id))}
            >
              {String(c.name)}
            </Button>
          ))}
        </div>
      ) : null}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex flex-1 gap-2">
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by product name (2+ letters)"
            onKeyDown={(e) => e.key === "Enter" && applySearch()}
          />
          <Button type="button" variant="secondary" onClick={applySearch}>
            Search
          </Button>
        </div>
        <Select value={sort} onValueChange={onSortChange}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest</SelectItem>
            <SelectItem value="name">Name (A–Z)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {products.isLoading && !mergedItems.length ? <PageSkeleton cards={3} /> : products.isError ? (
        <QueryError error={products.error} onRetry={products.refetch} />
      ) : !mergedItems.length ? (
        <div className="rounded-3xl border bg-white p-12 text-center"><Gem className={cn("mx-auto size-9", customerBrandClass.accentText)} /><h3 className="mt-4 font-serif text-xl">{searchQ ? "No matching products" : "No pieces in this collection yet"}</h3><p className="mt-2 text-sm text-muted-foreground">{searchQ ? "Try another search or clear filters." : "Choose another category or check back soon."}</p></div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
            {mergedItems.map((p) => (
              <Link key={String(p.id)} href={customerPath(tenantSlug, "shop", encodeURIComponent(String(p.slug)))} className="group min-w-0 overflow-hidden rounded-[1.5rem] border border-[#ede3db] bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
                <div className="relative aspect-[4/4.4] customer-primary-tint-surface">
                  <EcommerceCatalogImage uploadId={(p.imageUploadIds as string[] | undefined)?.[0]} viewUrl={(p.imageUrls as any)?.[0]?.viewUrl} channel="customer" alt={String(p.name)} fill className="transition duration-500 group-hover:scale-105" />
                  {p.featured === true ? <span className={cn("absolute left-3 top-3 rounded-full bg-white px-3 py-1 text-[.65rem] font-bold uppercase tracking-wider shadow-sm", customerBrandClass.primaryText)}>Featured</span> : null}
                </div>
                <div className="space-y-2 p-4 sm:p-5">
                  <p className={cn("text-[.65rem] font-bold uppercase tracking-[.16em]", customerBrandClass.accentText)}>{p.purity ? `${String(p.purity)} gold` : "Jewellery"}</p>
                  <h3 className="line-clamp-2 min-h-11 text-sm font-semibold leading-snug text-[#30262a] sm:text-lg">{String(p.name)}</h3>
                  <div className="flex items-center justify-between border-t border-[#f2e9e3] pt-3"><ShopPriceLabel pricing={p.pricing as any} className={cn("text-base font-bold", customerBrandClass.price)} /><ArrowRight className={cn("size-4 shrink-0", customerBrandClass.primaryText)} /></div>
                  {(p.availability as { label?: string } | undefined)?.label ? <p className="text-xs text-[#6b7067]">{(p.availability as { label: string }).label}</p> : null}
                </div>
              </Link>
            ))}
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
      <CustomerShopPoliciesLinks className="mt-10 rounded-2xl border border-[#ede3db] bg-white p-5" />
      <p className="mt-8 text-center text-xs text-[#85797c]">Prices are estimates. Your final amount is confirmed in the quote before payment.</p>
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
              disabled={availabilityInfo?.purchasable === false || putState.isLoading || cart.isLoading}
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
          </div>
          {p.description ? <div className="rounded-2xl border border-[#efe7e1] bg-white p-5"><h2 className="font-semibold text-[#302428]">About this piece</h2><p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-[#6d6265]">{String(p.description)}</p></div> : null}
          {weightMg > 0 ? <div className="flex items-center gap-3 rounded-2xl customer-accent-tint-surface p-4 text-sm text-[#5b4a42]"><Gem className={cn("size-5 shrink-0", customerBrandClass.accentText)} /><span>Gold weight: <strong>{(weightMg / 1000).toFixed(3)} g</strong>{p.purity ? ` · ${String(p.purity)} purity` : ""}</span></div> : null}
        </section>
      </div>
      <section className="mt-10 rounded-[1.5rem] border border-[#eee4dc] bg-white p-5 sm:p-7"><h2 className="font-serif text-2xl text-[#312327]">How the price is built</h2><p className="mb-5 mt-1 text-sm text-[#817477]">Gold rate, making, stones and tax where applicable.</p><PricingPreviewPanel pricing={p.pricing as any} /></section>
    </div>
  );
}
