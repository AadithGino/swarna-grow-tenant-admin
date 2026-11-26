import { ShoppingBag } from "lucide-react";
import type { SchemeShopBalanceSummary } from "@/src/lib/scheme-shop-balance";
import { schemeShopBalanceVisible } from "@/src/lib/scheme-shop-balance";
import { cn } from "@/lib/utils";

/** One-line shop used / remaining (customer cards, admin rows). */
export function SchemeShopBalanceLine({
  summary,
  className,
}: {
  summary?: SchemeShopBalanceSummary | null;
  className?: string;
}) {
  if (!schemeShopBalanceVisible(summary)) return null;
  const line = summary?.summaryLine ?? summary?.usedLabel ?? null;
  if (!line) return null;
  return (
    <p className={cn("text-[0.7rem] leading-snug text-[#9a1b35]", className)}>
      <ShoppingBag className="mr-0.5 inline size-3 opacity-80" aria-hidden />
      {line}
    </p>
  );
}

/** Detail hero for scheme page (customer + admin enrollment). */
export function SchemeShopBalancePanel({
  summary,
  variant = "customer",
  className,
}: {
  summary?: SchemeShopBalanceSummary | null;
  variant?: "customer" | "admin";
  className?: string;
}) {
  if (!schemeShopBalanceVisible(summary)) return null;
  const used = summary?.usedLabel;
  const available = summary?.availableLabel;
  const isCustomer = variant === "customer";
  return (
    <section
      className={cn(
        "rounded-2xl border p-4",
        isCustomer
          ? "border-[#f0e4dc] bg-gradient-to-br from-[#fffbf7] to-white"
          : "border-emerald-200/80 bg-gradient-to-br from-emerald-50/80 via-white to-white",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-xl",
            isCustomer ? "bg-[#fce8ee] text-[#9a1b35]" : "bg-emerald-100 text-emerald-900",
          )}
        >
          <ShoppingBag className="size-5" strokeWidth={1.8} />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-bold text-[#171722]">Online shop balance</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Value moved from this enrolment to the store, and what you can still spend online.
          </p>
          <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            {used ? (
              <div className="rounded-xl bg-white/80 px-3 py-2 ring-1 ring-black/5">
                <dt className="text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">Used online</dt>
                <dd className="mt-0.5 font-bold text-[#9a1b35]">− {used.replace(/^−\s*/, "")}</dd>
              </div>
            ) : null}
            {available ? (
              <div className="rounded-xl bg-white/80 px-3 py-2 ring-1 ring-black/5">
                <dt className="text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">Still for shop</dt>
                <dd className="mt-0.5 font-bold text-[#171722]">{available}</dd>
              </div>
            ) : summary?.orderCount ? (
              <motionlessFallback count={summary.orderCount} />
            ) : null}
          </dl>
        </div>
      </div>
    </section>
  );
}

export type SchemeOnlineEncumbrance = {
  summaryLines?: string[];
};

export function SchemeOnlineEncumbrancePanel({
  encumbrance,
  variant = "customer",
  className,
}: {
  encumbrance?: SchemeOnlineEncumbrance | null;
  variant?: "customer" | "admin";
  className?: string;
}) {
  const lines = encumbrance?.summaryLines?.filter(Boolean) ?? [];
  if (!lines.length) return null;
  const isCustomer = variant === "customer";
  return (
    <section
      className={cn(
        "rounded-2xl border px-4 py-3 text-sm leading-relaxed",
        isCustomer
          ? "border-[#e8ddd6] bg-[#faf7f5] text-[#5c4f52]"
          : "border-[#e4d7d2] bg-[#faf7f5] text-[#5c4f52]",
        className,
      )}
    >
      <p className="font-semibold text-[#730321]">Online shop vs passbook</p>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        {lines.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </section>
  );
}

function motionlessFallback({ count }: { count: number }) {
  return (
    <div className="rounded-xl bg-white/80 px-3 py-2 ring-1 ring-black/5 sm:col-span-2">
      <dt className="text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">Shop orders</dt>
      <dd className="mt-0.5 font-semibold">
        {count} order{count === 1 ? "" : "s"} paid with this scheme
      </dd>
    </div>
  );
}