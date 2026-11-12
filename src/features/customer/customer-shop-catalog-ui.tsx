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
  const tiles: (ShopCategoryOption & { all?: boolean })[] = [{ id: "__all", name: "All", all: true }, ...categories];
  return (
    <nav aria-label="Collections" className="-mx-4 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0 [&::-webkit-scrollbar]:hidden">
      <ul className="flex gap-3 sm:gap-5">
        {tiles.map((c) => {
          const active = c.all ? !categoryId : categoryId === c.id;
          return (
            <li key={c.id} className="shrink-0">
              <button
                type="button"
                onClick={() => onCategoryChange(c.all ? undefined : c.id)}
                aria-pressed={active}
                className="group flex w-[3.75rem] flex-col items-center gap-1.5 text-center focus-visible:outline-none sm:w-[5rem]"
              >
                <span
                  className={cn(
                    "relative grid size-[3.75rem] place-items-center overflow-hidden rounded-[20px] bg-white transition sm:size-20",
                    active ? "border-2 border-[var(--customer-primary,#730321)]" : "border border-[var(--ck-line,#ebe2d7)]",
                    "group-focus-visible:ring-2 group-focus-visible:ring-[var(--customer-primary,#730321)] group-focus-visible:ring-offset-2",
                  )}
                >
                  <span className="absolute inset-0 overflow-hidden bg-[#f6f0e8]">
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
                <span className={cn("line-clamp-1 text-[0.7rem]", active ? "font-bold text-[var(--customer-primary,#730321)]" : "font-medium text-[var(--ck-ink-2,#4f4246)]")}>
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
  cartCount: _cartCount = 0,
  initialOpen = false,
  heading: headingOverride,
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
  /** Opens the search sheet on mount (header search button). */
  initialOpen?: boolean;
  heading?: string;
}) {
  const [filtersOpen, setFiltersOpen] = useState(initialOpen);
  const activeCategory = categories.find((c) => c.id === categoryId);
  const heading = searchQ ? `Results for “${searchQ}”` : activeCategory ? activeCategory.name : headingOverride ?? "All jewellery";
  const count = loadingResults ? "Updating…" : `${resultCount ?? 0} ${resultCount === 1 ? "piece" : "pieces"}`;

  return (
    <div>
      <div className="flex items-end gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-[1.05rem] font-extrabold tracking-[-0.02em] text-[var(--ck-ink,#1d1417)]">{heading}</h2>
          <p className={cn("mt-0.5 flex flex-wrap items-center gap-x-2 text-xs", SHOP_MUTED)}>
            <span aria-live="polite">{count}</span>
            {hasActiveFilters ? (
              <button type="button" className="font-semibold text-[var(--customer-primary,#730321)] underline-offset-2 hover:underline" onClick={onClearFilters}>
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
          className="relative inline-flex h-9 items-center gap-1.5 rounded-full border border-[var(--ck-line,#ebe2d7)] bg-white px-3 text-[0.78rem] font-semibold text-[var(--ck-ink-2,#4f4246)] md:hidden"
        >
          <SlidersHorizontal className="size-3.5 opacity-70" aria-hidden />
          Filter
          {hasActiveFilters ? <span className="absolute right-1 top-1 size-2 rounded-full bg-[var(--customer-primary,#730321)]" aria-label="Filters applied" /> : null}
        </button>
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
  const tag = offer ?? (stock.tone === "low" ? stock.label : product.featured === true ? "Featured" : null);

  return (
    <article className="group flex min-w-0 flex-col overflow-hidden rounded-[18px] border border-[var(--ck-line,#ebe2d7)] bg-white">
      <Link href={href} className="relative block aspect-square overflow-hidden bg-[#f4ecdf]" aria-label={name}>
        <EcommerceCatalogImage uploadId={images[0]} viewUrl={imageUrls[0]?.viewUrl} channel="customer" alt={name} fill className="object-cover transition duration-500 group-hover:scale-[1.03]" />
        {tag ? (
          <span className="absolute left-2 top-2 rounded-full bg-white/95 px-2 py-[3px] text-[0.62rem] font-bold text-[var(--customer-primary,#730321)]">{tag}</span>
        ) : null}
        {stock.tone === "out" ? (
          <span className="absolute inset-0 grid place-items-center bg-white/45">
            <span className="rounded-full bg-[#221a1d]/85 px-3 py-1 text-xs font-semibold text-white">Sold out</span>
          </span>
        ) : null}
      </Link>
      <div className="flex flex-1 flex-col px-2.5 pb-2.5 pt-2">
        <Link href={href} className="min-w-0">
          <h3 className="truncate text-[0.8rem] font-semibold leading-tight text-[var(--ck-ink,#1d1417)]">{name}</h3>
          {meta ? <p className="mt-0.5 truncate text-[0.68rem] text-[var(--ck-muted,#87787c)]">{meta}</p> : null}
        </Link>
        <div className="mt-auto flex items-center justify-between gap-2 pt-1.5">
          <ShopPriceLabel
            pricing={product.pricing as Parameters<typeof ShopPriceLabel>[0]["pricing"]}
            className="truncate text-[0.9rem] font-bold tabular-nums tracking-[-0.02em] text-[var(--ck-ink,#1d1417)]"
          />
          <button
            type="button"
            disabled={!canAdd || adding}
            aria-label={`Add ${name} to bag`}
            title={canAdd ? "Add to bag" : stock.tone === "out" ? "Sold out" : "Price unavailable"}
            className="grid size-[1.65rem] shrink-0 place-items-center rounded-[9px] text-white transition disabled:opacity-30"
            style={{ background: "var(--customer-primary, #730321)" }}
            onClick={(e) => {
              e.preventDefault();
              onAddToCart();
            }}
          >
            {adding ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-4" strokeWidth={2.4} />}
          </button>
        </div>
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

