"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { EcommerceCatalogImage } from "@/src/features/ecommerce/ecommerce-catalog-image";
import {
  customerBannerHref,
  type CustomerBannerDestination,
} from "@/src/lib/customer-banner-routing";
import {
  CUSTOMER_PROMO_RAIL_FRAME,
  CUSTOMER_PROMO_SECTION_TITLE,
} from "@/src/lib/ecommerce-banner-surfaces";

export type CustomerPromoBanner = {
  id: string;
  title: string;
  subtitle?: string;
  imageUploadId?: string | null;
  imageUrl?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
  destination?: CustomerBannerDestination | null;
};

/** Where the rail sits in the customer app — same visuals everywhere. */
export type CustomerPromoBannerPlacement = "home-feed" | "shop-grid";

function PromoRailCard({
  banner,
  href,
  solo,
}: {
  banner: CustomerPromoBanner;
  href: string | null;
  solo: boolean;
}) {
  const label = [banner.title, banner.subtitle].filter(Boolean).join(". ");
  const frame = (
    <div
      className={cn(
        CUSTOMER_PROMO_RAIL_FRAME,
        solo ? "w-full" : "w-[min(72vw,280px)] shrink-0 snap-start sm:w-[min(42vw,300px)]",
      )}
    >
      {banner.imageUploadId ? (
        <EcommerceCatalogImage
          uploadId={banner.imageUploadId}
          viewUrl={banner.imageUrl ?? undefined}
          channel="customer"
          alt=""
          fill
          className="object-cover"
        />
      ) : (
        <div className="flex h-full flex-col justify-end bg-[#1e2a3a] p-3">
          <p className="line-clamp-1 text-sm font-semibold text-white">{banner.title}</p>
        </div>
      )}
      {banner.imageUploadId ? <span className="sr-only">{label}</span> : null}
    </div>
  );

  if (!href) {
    return (
      <article aria-label={banner.title} className={solo ? "block w-full" : "block"}>
        {frame}
      </article>
    );
  }

  return (
    <Link
      href={href}
      className={cn(
        "block rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--customer-primary,#730321)]",
        solo ? "w-full" : "shrink-0 snap-start",
      )}
      aria-label={label}
    >
      {frame}
    </Link>
  );
}

export function CustomerPromoBanners({
  tenantSlug,
  items,
  className,
  shopAvailable,
  placement = "home-feed",
}: {
  tenantSlug: string | null;
  items: CustomerPromoBanner[];
  className?: string;
  shopAvailable?: boolean;
  placement?: CustomerPromoBannerPlacement;
}) {
  const visible = items.filter((b) => b.title && b.imageUploadId);
  if (!tenantSlug || !visible.length) return null;

  const solo = visible.length === 1;

  return (
    <section className={cn(className)} aria-label="Promotions">
      <h2 className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.2em] text-[#8a8580]">
        {CUSTOMER_PROMO_SECTION_TITLE}
      </h2>
      <div
        className={cn(
          solo
            ? "w-full"
            : cn(
                "flex gap-3 overflow-x-auto pb-0.5",
                "snap-x snap-mandatory scroll-px-4",
                "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
                placement === "shop-grid" && "-mx-0.5 px-0.5",
              ),
        )}
      >
        {visible.map((banner) => (
          <PromoRailCard
            key={banner.id}
            banner={banner}
            solo={solo}
            href={customerBannerHref(tenantSlug, banner.destination ?? { type: "NONE" }, {
              shopAvailable,
            })}
          />
        ))}
      </div>
    </section>
  );
}

/** Insert promos after this many products (two rows on a 2-column grid). */
export const SHOP_PROMO_GRID_INSERT_AFTER = 4;

export function shouldShowShopPromoRail(
  items: CustomerPromoBanner[],
  hasActiveFilters: boolean,
): boolean {
  if (hasActiveFilters) return false;
  return items.some((b) => b.title && b.imageUploadId);
}
