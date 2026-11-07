"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HeroStat } from "@/src/components/admin-ui/section-hero";
import { Surface } from "@/src/components/common/page-parts";
import type { EnrollmentStatusBreakdown } from "@/src/lib/enrollment-status-counts";
import {
  openEnrollmentCount,
  openEnrollmentDetail,
} from "@/src/lib/enrollment-status-counts";
import { portalPathFromContract } from "@/src/lib/contract-paths";

export type EnrollmentStatusFilterKey =
  | "OPEN"
  | "PENDING_PAYMENT"
  | "ACTIVE"
  | "LOCKED"
  | "DEFAULTED"
  | "MATURED"
  | "PAST";

/** Hero summary row — same pattern as Dues & Maturity pages. */
export function EnrollmentStatusHeroStats({
  data,
  loading,
  activeFilter,
  onFilter,
}: {
  data: EnrollmentStatusBreakdown;
  loading?: boolean;
  activeFilter?: string;
  onFilter?: (key: EnrollmentStatusFilterKey) => void;
}) {
  const open = openEnrollmentCount(data);
  const interactive = Boolean(onFilter);

  return (
    <>
      <HeroStat
        label="Not started"
        value={data.notStarted}
        detail="No first instalment yet"
        loading={loading}
        active={activeFilter === "PENDING_PAYMENT"}
        onClick={
          interactive ? () => onFilter!("PENDING_PAYMENT") : undefined
        }
      />
      <HeroStat
        label="Open"
        value={open}
        detail={openEnrollmentDetail(data)}
        loading={loading}
        active={activeFilter === "OPEN"}
        onClick={interactive ? () => onFilter!("OPEN") : undefined}
      />
      <HeroStat
        label="Matured"
        value={data.matured}
        detail="Ready to redeem"
        loading={loading}
        active={activeFilter === "MATURED"}
        onClick={interactive ? () => onFilter!("MATURED") : undefined}
      />
      <HeroStat
        label="Completed"
        value={data.completed}
        detail="Redeemed or closed early"
        loading={loading}
        active={activeFilter === "PAST"}
        onClick={interactive ? () => onFilter!("PAST") : undefined}
      />
      <HeroStat
        label="Total accounts"
        value={data.total}
        detail={`${data.notStarted} not started · ${open} open`}
        loading={loading}
      />
    </>
  );
}

const heroStatsGridClass =
  "-ml-px grid grid-cols-2 bg-[#fcfaf8] sm:grid-cols-[repeat(auto-fit,minmax(11rem,1fr))]";

/** Dashboard block — hero stat grid inside a Surface. */
export function EnrollmentStatusBreakdown({
  data,
  loading,
  variant = "surface",
  scopeLabel,
  activeFilter,
  onFilter,
}: {
  data: EnrollmentStatusBreakdown;
  loading?: boolean;
  variant?: "surface" | "embedded";
  scopeLabel?: string;
  activeFilter?: string;
  onFilter?: (key: EnrollmentStatusFilterKey) => void;
}) {
  const grid = (
    <div className={heroStatsGridClass}>
      <EnrollmentStatusHeroStats
        data={data}
        loading={loading}
        activeFilter={activeFilter}
        onFilter={onFilter}
      />
    </div>
  );

  if (variant === "embedded") {
    return grid;
  }

  return (
    <Surface
      title="Scheme enrollments"
      description={
        scopeLabel
          ? `Status snapshot · ${scopeLabel}`
          : "Status snapshot for your branch scope"
      }
      action={
        <Button variant="outline" size="sm" asChild>
          <Link href={portalPathFromContract("/enrollments")}>
            Open directory
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      }
      bodyClassName="p-0"
    >
      {grid}
    </Surface>
  );
}
