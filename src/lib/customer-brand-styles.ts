import type { CSSProperties } from "react";

/** Tailwind classes that read tenant colours from `CustomerTenantProvider` CSS variables. */
export const customerBrandClass = {
  primaryText: "text-[var(--customer-primary,#730321)]",
  primaryHoverText: "hover:text-[var(--customer-primary,#730321)]",
  accentText: "customer-gold-copy",
  price: "text-[var(--customer-primary,#730321)]",
  borderActive: "border-[var(--customer-primary,#730321)]",
  iconOnPrimarySoft:
    "text-[var(--customer-primary,#730321)]",
  linkBack:
    "text-[var(--customer-primary,#730321)] opacity-80 hover:opacity-100",
} as const;

export const customerBrandStyle = {
  primaryBg: { background: "var(--customer-primary, #730321)" } satisfies CSSProperties,
  primaryHero: {
    background: "var(--customer-primary, #730321)",
    boxShadow: "0 20px 55px rgba(var(--customer-primary-rgb, 115, 3, 33), 0.18)",
  } satisfies CSSProperties,
  primaryPromoCard: {
    background: "var(--customer-primary, #730321)",
    boxShadow: "0 14px 30px rgba(var(--customer-primary-rgb, 115, 3, 33), 0.16)",
  } satisfies CSSProperties,
  primarySoftBg: {
    background: "rgba(var(--customer-primary-rgb, 115, 3, 33), 0.08)",
  } satisfies CSSProperties,
  accentSoftBg: {
    background: "rgba(var(--customer-accent-rgb, 201, 162, 39), 0.12)",
  } satisfies CSSProperties,
  accentCta: {
    background: "var(--customer-accent, #C9A227)",
    color: "#1f1a14",
  } satisfies CSSProperties,
  heroBadgeText: {
    color: "color-mix(in srgb, var(--customer-accent, #c9a227) 78%, white)",
  } satisfies CSSProperties,
  heroBodyText: {
    color: "color-mix(in srgb, var(--customer-primary, #730321) 12%, white)",
  } satisfies CSSProperties,
  heroIconAccent: {
    color: "color-mix(in srgb, var(--customer-accent, #c9a227) 70%, white)",
  } satisfies CSSProperties,
  promoSubtext: {
    color: "color-mix(in srgb, var(--customer-primary, #730321) 10%, white)",
  } satisfies CSSProperties,
} as const;
