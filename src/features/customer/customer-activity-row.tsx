"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { formatCustomerDate } from "@/src/components/customer/customer-ui";
import {
  customerRecentActivityHeadline,
  customerRecentActivityHref,
  type CustomerRecentActivityItem,
} from "@/src/lib/customer-recent-activity";
import {
  ActivityRowIcon,
  activityIconStyles,
  activityAmountClass,
  formatActivityAmount,
} from "@/src/lib/customer-recent-activity-ui";

export function CustomerActivityRow({
  item,
  tenantSlug,
  compact,
}: {
  item: CustomerRecentActivityItem;
  tenantSlug: string | null;
  compact?: boolean;
}) {
  const href = customerRecentActivityHref(tenantSlug, item);
  const styles = activityIconStyles(item);
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-[1.15rem] border border-[var(--ck-line)] bg-white transition hover:bg-[#fdfbf8]",
        compact ? "px-3.5 py-3" : "px-4 py-3.5",
      )}
    >
      <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl", styles.tileClass)}>
        <ActivityRowIcon item={item} className="size-[1.1rem]" strokeWidth={1.8} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[0.9rem] font-semibold leading-snug text-[var(--ck-ink)]">{customerRecentActivityHeadline(item)}</p>
        <p className="mt-0.5 truncate text-xs text-[var(--ck-muted)]">
          {item.occurredAt ? formatCustomerDate(item.occurredAt) : "—"}
          {item.statusLabel ? (
            <>
              <span className="mx-1.5 text-[#d5ced6]">·</span>
              {item.statusLabel}
            </>
          ) : null}
        </p>
      </div>
      <span className={cn("shrink-0 text-[0.92rem] font-semibold tabular-nums", activityAmountClass(item))}>{formatActivityAmount(item)}</span>
    </Link>
  );
}
