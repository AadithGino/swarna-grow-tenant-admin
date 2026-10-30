"use client";

import Link from "next/link";
import { useState } from "react";
import { Loader2, Package, Plus, Search, ShoppingBag, SlidersHorizontal, X } from "lucide-react";
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
import { customerBrandStyle } from "@/src/lib/customer-brand-styles";
import {
  productMeta,
  productOfferLabel,
  productStock,
  SHOP_HAIRLINE,
  SHOP_INK,
  SHOP_MUTED,
  StockDot,
} from "@/src/features/customer/customer-shop-ui";

export type ShopCategoryOption = { id: string; name: string; imageUploadId?: string | null; imageUrl?: string | null };

const sortLabels: Record<"newest" | "name", string> = {
  newest: "Newest first",
  name: "Name, A to Z",
};

function SearchField({
  id,
  value,
  onChange,
  className,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#9a8d90]" aria-hidden />
      <Input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 rounded-full border-[#e3d6ce] bg-white pl-10 pr-10 text-sm shadow-none"
        placeholder="Search rings, coins, jhumkas…"
        autoComplete="off"
        aria-label="Search the collection"
      />
      {value ? (
        <button
          type="button"
          className="absolute right-1.5 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full text-[#82777a] hover:bg-[#f4ece8]"
          aria-label="Clear search"
          onClick={() => onChange("")}
        >
          <X className="size-4" />
        </button>
      ) : null}
    </div>
  );
}

function SortSelect({ sort, onSortChange, id }: { sort: "newest" | "name"; onSortChange: (s: "newest" | "name") => void; id?: string }) {
  return (
    <Select value={sort} onValueChange={(v) => onSortChange(v === "name" ? "name" : "newest")}>
      <SelectTrigger
        id={id}
        className="h-11 min-h-11 w-full rounded-full border-[#e3d6ce] bg-white px-4 text-sm font-medium text-[#3a2f33] shadow-none sm:w-44"
        aria-label="Sort products"
      >
        <SelectValue>{sortLabels[sort]}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="newest">{sortLabels.newest}</SelectItem>
        <SelectItem value="name">{sortLabels.name}</SelectItem>
      </SelectContent>
    </Select>
  );
}

/** Round "display tray" tiles: All + each active category. */
export function CustomerShopCategoryRail({
  categories,
  categoryId,
  onCategoryChange,
}: {
  categories: ShopCategoryOption[];
  categoryId?: string;
  onCategoryChange: (id: string | undefined) => void;
}) {
  if (!categories.length) return null;
  const tiles: (ShopCategoryOption & { all?: boolean })[] = [{ id: "__all", name: "Everything", all: true }, ...categories];
  return (
    <nav aria-label="Collections" className="-mx-4 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0 [&::-webkit-scrollbar]:hidden">
      <ul className="flex gap-4 sm:gap-6">
        {tiles.map((c) => {
          const active = c.all ? !categoryId : categoryId === c.id;
          return (
            <li key={c.id} className="shrink-0">
              <button
                type="button"
                onClick={() => onCategoryChange(c.all ? undefined : c.id)}
                aria-pressed={active}
                className="group flex w-[4.6rem] flex-col items-center gap-2 text-center focus-visible:outline-none sm:w-[5.4rem]"
              >
                <span
                  className={cn(
                    "relative grid size-[4.25rem] place-items-center overflow-hidden rounded-full border-2 bg-white transition sm:size-20",
                    active ? "border-[var(--customer-primary,#730321)]" : "border-transparent group-hover:border-[#e2cfc6]",
                    "group-focus-visible:ring-2 group-focus-visible:ring-[var(--customer-primary,#730321)] group-focus-visible:ring-offset-2",
                  )}
                >
                  <span className="absolute inset-[3px] overflow-hidden rounded-full customer-primary-tint-surface">
                    {c.all ? (
                      <span className="grid h-full w-full place-items-center">
                        <ShoppingBag className="size-6 text-[var(--customer-primary,#730321)]" strokeWidth={1.6} aria-hidden />
                      </span>
                    ) : c.imageUploadId || c.imageUrl ? (
                      <EcommerceCatalogImage uploadId={c.imageUploadId} viewUrl={c.imageUrl} channel="customer" alt="" fill className="object-cover" />
                    ) : (
                      <span className="grid h-full w-full place-items-center font-serif text-xl text-[var(--customer-primary,#730321)]">
                        {c.name.slice(0, 1)}
                      </span>
                    )}
                  </span>
                </span>
                <span className={cn("line-clamp-1 text-xs", active ? "font-semibold text-[var(--customer-primary,#730321)]" : "font-medium text-[#5d5154]")}>
                  {c.name}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
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
  cartCount = 0,
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
  cartCount?: number;
}) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const activeCategory = categories.find((c) => c.id === categoryId);
  const heading = searchQ ? `Results for “${searchQ}”` : activeCategory ? activeCategory.name : "The full collection";
  const count = loadingResults ? "Updating…" : `${resultCount ?? 0} ${resultCount === 1 ? "piece" : "pieces"}`;

  return (
    <div className="sticky top-[68px] z-20 -mx-4 border-b border-[#efe5df] bg-[#fbf8f5]/95 px-4 py-3 backdrop-blur-md sm:top-[76px] sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <h2 className={cn("truncate font-serif text-xl leading-tight sm:text-2xl", SHOP_INK)}>{heading}</h2>
          <p className={cn("mt-0.5 flex flex-wrap items-center gap-x-2 text-xs", SHOP_MUTED)}>
            <span aria-live="polite">{count}</span>
            {hasActiveFilters ? (
              <button
                type="button"
                className="font-semibold text-[var(--customer-primary,#730321)] underline-offset-2 hover:underline"
                onClick={onClearFilters}
              >
                Clear filters
              </button>
            ) : null}
          </p>
        </div>
        <SearchField id="shop-search-desktop" value={searchInput} onChange={onSearchInputChange} className="hidden w-72 md:block lg:w-80" />
        <div className="hidden md:block">
          <SortSelect sort={sort} onSortChange={onSortChange} />
        </div>
        <button
          type="button"
          onClick={() => setFiltersOpen(true)}
          aria-expanded={filtersOpen}
          aria-controls="shop-filters-sheet"
          className="relative inline-flex h-11 items-center gap-2 rounded-full border border-[#e3d6ce] bg-white px-4 text-sm font-medium text-[#3a2f33] md:hidden"
        >
          <SlidersHorizontal className="size-4 opacity-70" aria-hidden />
          Search & sort
          {hasActiveFilters ? (
            <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-[var(--customer-primary,#730321)]" aria-label="Filters applied" />
          ) : null}
        </button>
        <Link
          href={customerPath(tenantSlug, "shop", "cart")}
          className="relative grid size-11 shrink-0 place-items-center rounded-full text-white shadow-sm"
          style={customerBrandStyle.primaryBg}
          aria-label={cartCount ? `Cart, ${cartCount} items` : "Cart"}
        >
          <ShoppingBag className="size-[1.15rem]" />
          {cartCount ? (
            <span className="absolute -right-1 -top-1 grid min-w-5 place-items-center rounded-full bg-[var(--customer-accent,#c9a227)] px-1 text-[10px] font-bold leading-5 text-[#2a1f12] ring-2 ring-[#fbf8f5]">
              {cartCount > 99 ? "99+" : cartCount}
            </span>
          ) : null}
        </Link>
      </div>

      <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
        <SheetContent id="shop-filters-sheet" side="bottom" className="max-h-[min(88vh,640px)] overflow-y-auto rounded-t-3xl px-5 pb-8 pt-6">
          <SheetHeader className="text-left">
            <SheetTitle className="font-serif text-xl">Search & sort</SheetTitle>
            <SheetDescription>Find a piece by name or narrow to one collection.</SheetDescription>
          </SheetHeader>
          <div className="mt-5 space-y-5">
            <div>
              <label htmlFor="shop-search" className={cn("mb-2 block text-xs font-semibold", SHOP_MUTED)}>
                Search
              </label>
              <SearchField id="shop-search" value={searchInput} onChange={onSearchInputChange} />
              <p className="mt-1.5 text-xs text-muted-foreground">Type at least 2 letters.</p>
            </div>
            <div>
              <label htmlFor="shop-category" className={cn("mb-2 block text-xs font-semibold", SHOP_MUTED)}>
                Collection
              </label>
              <Select value={categoryId ?? "__all"} onValueChange={(v) => onCategoryChange(v === "__all" ? undefined : v)}>
                <SelectTrigger id="shop-category" className="h-11 w-full rounded-full">
                  <SelectValue placeholder="Everything" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all">Everything</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label htmlFor="shop-sort-sheet" className={cn("mb-2 block text-xs font-semibold", SHOP_MUTED)}>
                Sort
              </label>
              <SortSelect id="shop-sort-sheet" sort={sort} onSortChange={onSortChange} />
            </div>
            <div className="flex flex-col gap-2 border-t pt-4">
              {hasActiveFilters ? (
                <Button type="button" variant="outline" className="h-11 rounded-full" onClick={onClearFilters}>
                  Clear filters
                </Button>
              ) : null}
              {showOrdersLink ? (
                <Button type="button" variant="ghost" className="h-11 rounded-full" asChild>
                  <Link href={customerShopOrdersPath(tenantSlug)} onClick={() => setFiltersOpen(false)}>
                    My orders
                  </Link>
                </Button>
              ) : null}
              <Button type="button" className="h-11 rounded-full text-white" style={customerBrandStyle.primaryBg} onClick={() => setFiltersOpen(false)}>
                Show {resultCount ?? 0} {resultCount === 1 ? "piece" : "pieces"}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
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
  const stock = productStock(product);
  const pricing = product.pricing as { computable?: boolean } | undefined;
  const canAdd = pricing?.computable !== false && stock.tone !== "out";
  const images = (product.imageUploadIds as string[] | undefined) ?? [];
  const imageUrls = (product.imageUrls as { viewUrl?: string }[] | undefined) ?? [];
  const offer = productOfferLabel(product);
  const meta = productMeta(product);
  const name = String(product.name);

  return (
    <article className="group relative flex min-w-0 flex-col">
      <Link
        href={href}
        className="relative block aspect-[4/5] overflow-hidden rounded-[1.25rem] customer-primary-tint-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--customer-primary,#730321)]"
        aria-label={name}
      >
        <EcommerceCatalogImage
          uploadId={images[0]}
          viewUrl={imageUrls[0]?.viewUrl}
          channel="customer"
          alt={name}
          fill
          className="object-cover transition duration-500 group-hover:scale-[1.03]"
        />
        {images[1] ? (
          <span className="absolute inset-0 opacity-0 transition duration-500 group-hover:opacity-100 motion-reduce:hidden" aria-hidden>
            <EcommerceCatalogImage uploadId={images[1]} viewUrl={imageUrls[1]?.viewUrl} channel="customer" alt="" fill className="object-cover" />
          </span>
        ) : null}
        <span className="absolute left-3 top-3 flex flex-col items-start gap-1.5">
          {offer ? (
            <span className="rounded-full bg-[var(--customer-primary,#730321)] px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm">
              {offer}
            </span>
          ) : null}
          {product.featured === true ? (
            <span className="rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-[#3a2f33] shadow-sm backdrop-blur">
              Featured
            </span>
          ) : null}
        </span>
        {stock.tone === "out" ? (
          <span className="absolute inset-0 grid place-items-center bg-white/45 backdrop-blur-[1px]">
            <span className="rounded-full bg-[#221a1d]/85 px-3 py-1 text-xs font-semibold text-white">Sold out</span>
          </span>
        ) : null}
      </Link>

      <button
        type="button"
        disabled={!canAdd || adding}
        aria-label={`Add ${name} to cart`}
        title={canAdd ? "Add to cart" : stock.tone === "out" ? "Sold out" : "Price unavailable"}
        className={cn(
          "absolute right-3 top-3 grid size-10 place-items-center rounded-full bg-white text-[var(--customer-primary,#730321)] shadow-[0_6px_18px_rgba(40,20,25,0.14)] transition",
          "hover:scale-105 disabled:pointer-events-none disabled:opacity-0",
          "sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100",
        )}
        onClick={(e) => {
          e.preventDefault();
          onAddToCart();
        }}
      >
        {adding ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-[1.15rem]" strokeWidth={2.2} />}
      </button>

      <Link href={href} className="mt-3 block min-w-0 px-0.5">
        <h3 className={cn("line-clamp-2 font-serif text-[15px] leading-snug sm:text-base", SHOP_INK)}>{name}</h3>
        {meta ? <p className={cn("mt-1 text-xs", SHOP_MUTED)}>{meta}</p> : null}
        <div className="mt-1.5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <ShopPriceLabel
            pricing={product.pricing as Parameters<typeof ShopPriceLabel>[0]["pricing"]}
            className="text-[15px] font-semibold tabular-nums text-[var(--customer-primary,#730321)] sm:text-base"
          />
          {stock.tone !== "out" ? <StockDot stock={stock} /> : null}
        </div>
      </Link>
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
    <div className={cn("rounded-[1.5rem] border bg-white px-6 py-14 text-center", SHOP_HAIRLINE)}>
      <span className="mx-auto grid size-14 place-items-center rounded-full customer-accent-tint-surface">
        <Package className="size-6 customer-gold-copy" aria-hidden />
      </span>
      <h3 className={cn("mt-4 font-serif text-2xl", SHOP_INK)}>{searchQ ? "Nothing matches that search" : "This collection is empty for now"}</h3>
      <p className={cn("mx-auto mt-2 max-w-sm text-sm leading-6", SHOP_MUTED)}>
        {searchQ ? "Try a shorter word, or browse everything in the store." : "New pieces are added often. Browse everything in the meantime."}
      </p>
      {hasFilters ? (
        <Button type="button" variant="outline" className="mt-6 rounded-full px-6" onClick={onReset}>
          Browse everything
        </Button>
      ) : null}
    </div>
  );
}

