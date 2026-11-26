"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { CkCard } from "@/src/components/customer/customer-kit";
import type { CkStepState } from "@/src/components/customer/customer-kit";
import type { ShopActivityItem } from "@/src/lib/customer-shop-activity";
import { cn } from "@/lib/utils";
import { customerShopActivityPath } from "@/src/lib/customer-shop-paths";

function stepProgress(steps: { label: string; state: CkStepState }[]) {
  const total = Math.max(steps.length, 1);
  const currentIdx = steps.findIndex((s) => s.state === "current");
  const done = steps.filter((s) => s.state === "complete").length;
  const idx = currentIdx >= 0 ? currentIdx : Math.min(done, total - 1);
  const current = steps.find((s) => s.state === "current");
  const pct = Math.round(((idx + (current ? 0.35 : 1)) / total) * 100);
  const currentLabel = current?.label ?? steps[Math.min(idx, total - 1)]?.label ?? "";
  return { pct: Math.min(100, Math.max(8, pct)), currentLabel, idx: idx + 1, total };
}

function ActivityProgressBar({ steps, className }: { steps: { label: string; state: CkStepState }[]; className?: string }) {
  const { pct, currentLabel, idx, total } = stepProgress(steps);
  return (
    <div className={cn("min-w-0", className)}>
      <div className="h-2 w-full overflow-hidden rounded-full bg-[#ebe2d7]">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "var(--customer-primary, #730321)" }} />
      </div>
      <p className="mt-1.5 text-xs text-[var(--ck-muted)]">
        <span className="font-semibold text-[var(--ck-ink)]">{currentLabel}</span>
        <span> · Step {idx} of {total}</span>
      </p>
    </div>
  );
}

/** Shop top: one short banner — no carousel, no stepper. */
export function ShopActivityStrip({
  tenantSlug,
  items,
  className,
}: {
  tenantSlug: string;
  items: ShopActivityItem[];
  className?: string;
}) {
  if (!items.length) return null;
  const seeMore = customerShopActivityPath(tenantSlug);
  const top = items[0];
  const more = items.length - 1;

  return (
    <section className={cn("mt-2", className)}>
      <Link
        href={top.href}
        className="flex items-center gap-3 rounded-xl border border-[#e8ddd6] bg-[#fdf8f5] px-3.5 py-3"
      >
        <div className="min-w-0 flex-1">
          <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-[var(--customer-primary,#730321)]">
            Needs your attention
          </p>
          <p className="mt-0.5 truncate text-[0.9rem] font-bold text-[var(--ck-ink)]">{top.title}</p>
          <p className="mt-0.5 truncate text-sm text-[#5b4f53]">{top.plainLine}</p>
        </div>
        <ChevronRight className="size-5 shrink-0 text-[var(--customer-primary,#730321)]" aria-hidden />
      </Link>
      {more > 0 ? (
        <Link href={seeMore} className="mt-1.5 block text-center text-xs font-semibold text-[var(--customer-primary,#730321)]">
          View all {items.length} in progress
        </Link>
      ) : null}
    </section>
  );
}

/** Track & filter hub — title + one line + simple progress only. */
export function ShopActivityCompactRow({ item }: { item: ShopActivityItem }) {
  return (
    <Link href={item.href} className="block">
      <CkCard className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-base font-semibold text-[var(--ck-ink)]">{item.title}</p>
            <p className="mt-1 text-sm text-[#5b4f53]">{item.plainLine}</p>
          </div>
          <ChevronRight className="mt-1 size-5 shrink-0 text-[#c4b8bc]" />
        </div>
        <ActivityProgressBar steps={item.steps} className="mt-4" />
      </CkCard>
    </Link>
  );
}