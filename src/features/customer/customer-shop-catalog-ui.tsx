"use client";

import Link from "next/link";
import { useState } from "react";
import { Loader2, Package, Search, ShoppingCart, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { ShopPriceLabel } from "@/src/features/ecommerce/ecommerce-admin-shared";
import { EcommerceCatalogImage } from "@/src/features/ecommerce/ecommerce-catalog-image";
import { customerPath } from "@/src/lib/customer-tenant";
import { customerShopOrdersPath } from "@/src/lib/customer-shop-paths";
import { customerBrandClass, customerBrandStyle } from "@/src/lib/customer-brand-styles";

export type ShopCategoryOption = { id: string; name: string };

const sortLabels: Record<"newest" | "name", string> = {
  newest: "Newest",
  name: "Name (A–Z)",
};

function ToolbarPillButton({
  className,
  children,
  ...props
}: React.ComponentProps<"button">) {
  return (
    <button
      type="button"
      className={cn(
        "flex h-11 min-h-11 flex-1 items-center justify-center gap-2 rounded-full border border-[#ddd5cf] bg-white px-4 text-sm font-semibold text-[#2a3544] transition hover:bg-[#faf8f6]",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function CustomerShopCatalogToolbar({
  tenantSlug,
  searchInput,
  onSearchInputChange,
  categoryId,
  onCategoryChange,
  categories,
  sort,
  onSortChange,
  showOrdersLink,
  resultCount,
  loadingResults,
  hasActiveFilters,
  onClearFilters,
  searchQ,
}: {
  tenantSlug: string;
  searchInput: string;
  onSearchInputChange: (value: string) => void;
  categoryId?: string;
  onCategoryChange: (id: string | undefined) => void;
  categories: ShopCategoryOption[];
  sort: "newest" | "name";
  onSortChange: (sort: "newest" | "name") => void;
  showOrdersLink: boolean;
  resultCount?: number;
  loadingResults?: boolean;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  searchQ?: string;
}) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const activeCategory = categories.find((c) => c.id === categoryId);
  const eyebrow = searchQ ? "Search" : "Shop";
  const title = searchQ
    ? "Results"
    : activeCategory
      ? activeCategory.name
      : "All jewellery";

  const filterSummaryParts: string[] = [];
  if (searchQ) filterSummaryParts.push(`“${searchQ}”`);
  if (activeCategory) filterSummaryParts.push(activeCategory.name);

  return (
    <div className="sticky top-0 z-20 -mx-4 mb-3 bg-[#faf8f6]/98 px-4 pb-2 pt-0 backdrop-blur-md sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      <p
        className={cn(
          "text-[11px] font-bold uppercase tracking-[0.22em]",
          customerBrandClass.accentText,
        )}
      >
        {eyebrow}
      </p>
      <h1 className="mt-1 font-serif text-[1.65rem] font-normal uppercase leading-tight tracking-wide text-[#1e2a3a] sm:text-3xl">
        {title}
      </h1>
      <p className="mt-1 text-sm text-[#8a8580]">
        {loadingResults ? "Updating…" : `${resultCount ?? 0} ${resultCount === 1 ? "item" : "items"}`}
      </p>

      <div className="mt-3 flex gap-2.5">
        <ToolbarPillButton
          onClick={() => setFiltersOpen(true)}
          aria-expanded={filtersOpen}
          aria-controls="shop-filters-sheet"
        >
          <SlidersHorizontal className="size-4 shrink-0 opacity-70" aria-hidden />
          Filters
          {hasActiveFilters ? (
            <span
              className="size-2 shrink-0 rounded-full bg-[var(--customer-primary,#730321)]"
              aria-label="Filters applied"
            />
          ) : null}
        </ToolbarPillButton>

        <Select value={sort} onValueChange={(v) => onSortChange(v === "name" ? "name" : "newest")}>
          <SelectTrigger
            className="h-11 min-h-11 flex-1 rounded-full border-[#ddd5cf] bg-white px-4 text-sm font-semibold text-[#2a3544] shadow-none"
            aria-label="Sort products"
          >
            <SelectValue>{sortLabels[sort]}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest</SelectItem>
            <SelectItem value="name">Name (A–Z)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {hasActiveFilters ? (
        <p className="mt-2 line-clamp-2 text-xs text-[#8a8580]">
          {filterSummaryParts.join(" · ")}
          {" · "}
          <button
            type="button"
            className={cn("font-semibold underline-offset-2 hover:underline", customerBrandClass.linkBack)}
            onClick={onClearFilters}
          >
            Clear
          </button>
        </p>
      ) : showOrdersLink ? (
        <p className="mt-2 text-right text-xs">
          <Link
            href={customerShopOrdersPath(tenantSlug)}
            className={cn("font-semibold underline-offset-2 hover:underline", customerBrandClass.linkBack)}
          >
            My orders
          </Link>
        </p>
      ) : null}

      <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
        <SheetContent
          id="shop-filters-sheet"
          side="bottom"
          className="max-h-[min(88vh,640px)] overflow-y-auto rounded-t-3xl px-5 pb-8 pt-6"
        >
          <SheetHeader className="text-left">
            <SheetTitle className="font-serif text-xl uppercase tracking-wide">Filters</SheetTitle>
            <SheetDescription>Search and narrow by collection.</SheetDescription>
          </SheetHeader>

          <div className="mt-5 space-y-5">
            <div>
              <label htmlFor="shop-search" className="mb-2 block text-xs font-bold uppercase tracking-wide text-[#8a8580]">
                Search
              </label>
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#82777a]"
                  aria-hidden
                />
                <Input
                  id="shop-search"
                  value={searchInput}
                  onChange={(e) => onSearchInputChange(e.target.value)}
                  className="h-11 rounded-xl pl-9 pr-9"
                  placeholder="Search by product name…"
                  autoComplete="off"
                />
                {searchInput ? (
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-[#82777a] hover:bg-muted"
                    aria-label="Clear search"
                    onClick={() => onSearchInputChange("")}
                  >
                    <X className="size-4" />
                  </button>
                ) : null}
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">Type at least 2 letters to search.</p>
            </div>

            <div>
              <label htmlFor="shop-category" className="mb-2 block text-xs font-bold uppercase tracking-wide text-[#8a8580]">
                Category
              </label>
              <Select
                value={categoryId ?? "__all"}
                onValueChange={(v) => onCategoryChange(v === "__all" ? undefined : v)}
              >
                <SelectTrigger id="shop-category" className="h-11 w-full rounded-xl">
                  <SelectValue placeholder="All jewellery" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all">All jewellery</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label htmlFor="shop-sort-sheet" className="mb-2 block text-xs font-bold uppercase tracking-wide text-[#8a8580]">
                Sort
              </label>
              <Select value={sort} onValueChange={(v) => onSortChange(v === "name" ? "name" : "newest")}>
                <SelectTrigger id="shop-sort-sheet" className="h-11 w-full rounded-xl">
                  <SelectValue>{sortLabels[sort]}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest</SelectItem>
                  <SelectItem value="name">Name (A–Z)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2 border-t pt-4">
              {hasActiveFilters ? (
                <Button type="button" variant="outline" className="h-11 rounded-xl" onClick={onClearFilters}>
                  Reset all filters
                </Button>
              ) : null}
              {showOrdersLink ? (
                <Button type="button" variant="ghost" className="h-11 rounded-xl" asChild>
                  <Link href={customerShopOrdersPath(tenantSlug)} onClick={() => setFiltersOpen(false)}>
                    My orders
                  </Link>
                </Button>
              ) : null}
              <Button
                type="button"
                className="h-11 rounded-xl text-white"
                style={customerBrandStyle.primaryBg}
                onClick={() => setFiltersOpen(false)}
              >
                Show {resultCount ?? 0} items
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function displaySku(product: Record<string, unknown>) {
  const sku = String(product.sku ?? "").trim();
  if (sku) return sku.toUpperCase();
  const slug = String(product.slug ?? "");
  if (slug) return slug.replace(/-/g, " ").toUpperCase().slice(0, 24);
  return String(product.id ?? "").slice(-8).toUpperCase();
}

function availabilityTone(
  availability: { purchasable?: boolean; stockPolicy?: string } | undefined,
) {
  if (!availability) return "neutral" as const;
  if (availability.purchasable === false) return "out" as const;
  if (availability.stockPolicy === "MADE_TO_ORDER") return "mto" as const;
  return "in" as const;
}

export function CustomerShopProductCard({
  product,
  tenantSlug,
  adding,
  onAddToCart,
}: {
  product: Record<string, unknown>;
  tenantSlug: string;
  adding?: boolean;
  onAddToCart: () => void;
}) {
  const slug = String(product.slug);
  const href = customerPath(tenantSlug, "shop", encodeURIComponent(slug));
  const availability = product.availability as
    | { label?: string; purchasable?: boolean; stockPolicy?: string }
    | undefined;
  const tone = availabilityTone(availability);
  const pricing = product.pricing as { computable?: boolean } | undefined;
  const canAdd = pricing?.computable !== false && availability?.purchasable !== false;
  const sku = displaySku(product);

  return (
    <article className="flex min-w-0 flex-col border border-[#e5e0db] bg-white">
      <Link href={href} className="relative block aspect-[3/4] bg-[#f7f4f1]">
        <EcommerceCatalogImage
          uploadId={(product.imageUploadIds as string[] | undefined)?.[0]}
          viewUrl={(product.imageUrls as { viewUrl?: string }[] | undefined)?.[0]?.viewUrl}
          channel="customer"
          alt={String(product.name)}
          fill
          className="object-cover"
        />
        {product.featured === true ? (
          <span className="absolute left-0 top-3 bg-white/90 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#1e2a3a]">
            Featured
          </span>
        ) : null}
        {tone === "out" ? (
          <span className="absolute inset-x-0 bottom-0 bg-[#1e2a3a]/80 py-1.5 text-center text-[10px] font-semibold uppercase tracking-wide text-white">
            Sold out
          </span>
        ) : null}
      </Link>

      <div className="flex items-end justify-between gap-2 border-t border-[#ece7e2] p-3">
        <Link href={href} className="min-w-0 flex-1">
          <p className="line-clamp-1 text-[11px] font-semibold uppercase tracking-wide text-[#1e2a3a]">
            {sku}
          </p>
          <div className="mt-1">
            <ShopPriceLabel
              pricing={product.pricing as Parameters<typeof ShopPriceLabel>[0]["pricing"]}
              className={cn("text-[15px] font-bold tabular-nums text-[#1e2a3a]", customerBrandClass.price)}
            />
          </div>
          <p className="mt-1 line-clamp-1 text-[11px] text-[#8a8580]">{String(product.name)}</p>
          {availability?.label && tone !== "out" ? (
            <p className="mt-0.5 text-[10px] text-[#9a9590]">{availability.label}</p>
          ) : null}
        </Link>
        <button
          type="button"
          disabled={!canAdd || adding}
          aria-label={`Add ${String(product.name)} to cart`}
          className={cn(
            "grid size-11 shrink-0 place-items-center rounded-md border border-[#e5e0db] bg-[#f3f0ec] text-[#5c6775] transition hover:bg-[#ebe6e0] disabled:opacity-40",
            adding && "opacity-70",
          )}
          onClick={(e) => {
            e.preventDefault();
            onAddToCart();
          }}
        >
          {adding ? (
            <Loader2 className="size-5 animate-spin" />
          ) : (
            <ShoppingCart className="size-5" strokeWidth={1.5} />
          )}
        </button>
      </div>
    </article>
  );
}

export function CustomerShopEmptyState({
  searchQ,
  hasFilters,
  onReset,
}: {
  searchQ?: string;
  hasFilters: boolean;
  onReset: () => void;
}) {
  return (
    <div className="border border-[#e5e0db] bg-white p-10 text-center sm:p-12">
      <Package className={cn("mx-auto size-9", customerBrandClass.accentText)} />
      <h3 className="mt-4 font-serif text-xl uppercase tracking-wide text-[#1e2a3a]">
        {searchQ ? "No matches" : "Nothing here yet"}
      </h3>
      <p className="mt-2 text-sm text-muted-foreground">
        {searchQ ? "Try different filters or clear your search." : "Check back soon or browse all jewellery."}
      </p>
      {hasFilters ? (
        <Button type="button" variant="outline" className="mt-5 rounded-full px-6" onClick={onReset}>
          Reset filters
        </Button>
      ) : null}
    </div>
  );
}
