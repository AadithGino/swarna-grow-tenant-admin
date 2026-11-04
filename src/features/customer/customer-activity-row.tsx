"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { FileText } from "lucide-react";
import { formatCustomerDate } from "@/src/components/customer/customer-ui";
import {
  customerRecentActivityHeadline,
  customerRecentActivityHref,
  type CustomerRecentActivityItem,
} from "@/src/lib/customer-recent-activity";
import {
  activityIcon,
  activityIconStyles,
  ActivityDirectionBadge,
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
  const Icon = activityIcon(item);
  const styles = activityIconStyles(item);
  return (
    <Link
      href={href}
      className={
        compact
          ? "flex items-center gap-3.5 rounded-2xl border border-[#f0ebe6] bg-white p-4 shadow-[0_8px_24px_rgba(var(--customer-primary-rgb,115,3,33),0.06)] transition hover:-translate-y-0.5 sm:p-[1.05rem]"
          : "flex items-center gap-3.5 rounded-2xl border border-[#f0ebe6] bg-white p-4 shadow-[0_8px_24px_rgba(var(--customer-primary-rgb,115,3,33),0.06)] transition hover:-translate-y-0.5"
      }
    >
      <span className={`grid size-11 shrink-0 place-items-center rounded-full ${styles.circleClass}`}>
        <Icon className="size-5" strokeWidth={2} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[0.9375rem] font-bold leading-snug text-[#171722] line-clamp-2">
            {customerRecentActivityHeadline(item)}
          </p>
          <ActivityDirectionBadge item={item} />
        </div>
        <p className="mt-1 truncate text-sm text-[#77727c]">
          {item.occurredAt ? formatCustomerDate(item.occurredAt) : "—"}
          {item.statusLabel ? (
            <>
              <span className="mx-2 text-[#d5ced6]">·</span>
              {item.statusLabel}
            </>
          ) : null}
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-2 pl-2">
        <span className={cn("text-base font-bold tabular-nums leading-none sm:text-[1.05rem]", activityAmountClass(item))}>
          {formatActivityAmount(item)}
        </span>
        <span className="grid size-10 place-items-center rounded-xl bg-[#f6f2ee] text-[#a59da8]">
          <FileText className="size-[1.15rem]" strokeWidth={1.75} />
        </span>
      </div>
    </Link>
  );
}
