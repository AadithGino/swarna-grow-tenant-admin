"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CursorPagination } from "@/src/components/common/cursor-pagination";
import { FieldLabel, Surface } from "@/src/components/common/page-parts";
import { PageSkeleton } from "@/src/components/common/query-state";
import { StatusBadge } from "@/src/components/common/status-badge";
import {
  PerformanceExtendedInsights,
  PerformanceHistoryTable,
  StaffPerformanceSummaryBlock,
} from "@/src/features/access/access-detail-visuals";
import { MoneyPair } from "@/src/features/access/access-detail-parts";
import { useCursorPagination } from "@/src/hooks/use-cursor-pagination";
import { emptyPageMeta } from "@/src/lib/cursor-pagination";
import {
  useGetBranchPerformanceSectionQuery,
  useGetBranchPerformanceSummaryQuery,
} from "@/src/store/api/admin-api";

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function defaultMonthRange() {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  return { from: isoDate(from), to: isoDate(now) };
}

function formatWhen(iso?: string | null) {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return String(iso);
  }
}

function rangeLabel(from?: string, to?: string) {
  if (from && to) return `${from} → ${to} (IST)`;
  if (from) return `From ${from}`;
  if (to) return `Until ${to}`;
  return "Current month";
}

export function BranchPerformanceTab({ branchId }: { branchId: string }) {
  const defaults = useMemo(() => defaultMonthRange(), []);
  const [draftFrom, setDraftFrom] = useState(defaults.from);
  const [draftTo, setDraftTo] = useState(defaults.to);
  const [range, setRange] = useState(defaults);
  const rangeKey = `${range.from}|${range.to}`;

  const collectionsPager = useCursorPagination(8, `branch-collections|${rangeKey}`);
  const enrolmentsPager = useCursorPagination(8, `branch-enrolments|${rangeKey}`);
  const handoversPager = useCursorPagination(8, `branch-handovers|${rangeKey}`);

  const summaryQuery = useGetBranchPerformanceSummaryQuery({
    branchId,
    from: range.from,
    to: range.to,
  });

  const collectionsQuery = useGetBranchPerformanceSectionQuery({
    branchId,
    section: "collections",
    from: range.from,
    to: range.to,
    ...collectionsPager.queryParams,
  });

  const enrolmentsQuery = useGetBranchPerformanceSectionQuery({
    branchId,
    section: "enrolments",
    from: range.from,
    to: range.to,
    ...enrolmentsPager.queryParams,
  });

  const handoversQuery = useGetBranchPerformanceSectionQuery({
    branchId,
    section: "handovers",
    from: range.from,
    to: range.to,
    ...handoversPager.queryParams,
  });

  const summary = summaryQuery.data;
  const collections = collectionsQuery.data?.items ?? [];
  const enrolments = enrolmentsQuery.data?.items ?? [];
  const handovers = handoversQuery.data?.items ?? [];

  const collectionsPage =
    collectionsQuery.data?.page ?? emptyPageMeta();
  const enrolmentsPage = enrolmentsQuery.data?.page ?? emptyPageMeta();
  const handoversPage = handoversQuery.data?.page ?? emptyPageMeta();

  const cashControlHref = `/cash-control?branchId=${encodeURIComponent(branchId)}`;

  if (summaryQuery.isLoading && !summary) {
    return <PageSkeleton cards={4} />;
  }

  return (
    <div className="space-y-5">
      <Surface
        title="Date range"
        description="Branch-wide collections, enrolments and cash handovers"
      >
        <div className="flex flex-col gap-4 p-6 sm:flex-row sm:flex-wrap sm:items-end">
          <div>
            <FieldLabel>From</FieldLabel>
            <Input
              type="date"
              value={draftFrom}
              onChange={(e) => setDraftFrom(e.target.value)}
            />
          </div>
          <div>
            <FieldLabel>To</FieldLabel>
            <Input
              type="date"
              value={draftTo}
              onChange={(e) => setDraftTo(e.target.value)}
            />
          </div>
          <Button
            onClick={() =>
              setRange({ from: draftFrom || undefined, to: draftTo || undefined })
            }
          >
            Apply
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setDraftFrom(defaults.from);
              setDraftTo(defaults.to);
              setRange(defaults);
            }}
          >
            This month
          </Button>
        </div>
      </Surface>

      <StaffPerformanceSummaryBlock
        rangeLabel={rangeLabel(range.from, range.to)}
        collection={summary?.collectionTotal}
        enrolments={Number(summary?.enrolments ?? 0)}
        customersServed={Number(summary?.customersServed ?? 0)}
        paymentsCount={Number(summary?.paymentsCount ?? 0)}
        cashInHand={summary?.cash?.cashInHand as { amountDisplay?: string }}
        cash={
          summary?.cash as {
            cashPendingAcceptance?: { amountDisplay?: string };
            cashCollected?: { amountDisplay?: string };
            handedOver?: { amountDisplay?: string };
            lastHandoverAt?: string | null;
          }
        }
        cashControlHref={cashControlHref}
      />

      <PerformanceExtendedInsights
        summary={summary as Record<string, unknown>}
        variant="branch"
      />

      <PerformanceHistoryTable
        title="Collection history"
        description={`Payments recorded at this branch · ${rangeLabel(range.from, range.to)}`}
        emptyMessage="No collections in this date range."
        isLoading={collectionsQuery.isLoading}
        headers={[
          "When",
          "Receipt",
          "Customer",
          "Enrollment",
          "Collected by",
          "Mode",
          "Source",
          "Amount",
        ]}
        rows={collections.map((row) => [
          formatWhen(row.paidAt as string),
          <span key="r" className="font-mono text-xs">
            {String(row.receiptNumber ?? "—")}
          </span>,
          (row.customer as { id?: string; name?: string })?.id ? (
            <Link
              key="c"
              href={`/customers/${(row.customer as { id: string }).id}`}
              className="text-[#730321] hover:underline"
            >
              {(row.customer as { name: string }).name}
            </Link>
          ) : (
            ((row.customer as { name?: string })?.name ?? "—")
          ),
          (row.scheme as { id?: string; enrollmentNumber?: string })?.id ? (
            <Link
              key="enr"
              href={`/enrollments/${(row.scheme as { id: string }).id}`}
              className="font-mono text-xs text-[#730321] hover:underline"
            >
              {(row.scheme as { enrollmentNumber?: string }).enrollmentNumber ??
                (row.scheme as { id: string }).id}
            </Link>
          ) : (
            "—"
          ),
          (row.collectedBy as { name?: string })?.name ? (
            <Link
              key="s"
              href={`/staff-branches/staff/${(row.collectedBy as { id: string }).id}`}
              className="text-[#730321] hover:underline"
            >
              {(row.collectedBy as { name: string }).name}
            </Link>
          ) : (
            "—"
          ),
          String(row.mode ?? "—").replace(/_/g, " "),
          String((row as { source?: string }).source ?? "—").replace(/_/g, " "),
          <MoneyPair key="a" block={row.amount as { amountDisplay?: string }} fallback="₹0" />,
        ])}
        footer={
          <CursorPagination
            page={collectionsPage}
            pageIndex={collectionsPager.pageIndex}
            rowCount={collections.length}
            onNext={() =>
              collectionsPager.goNext(collectionsPage.nextCursor)
            }
            onPrevious={collectionsPager.goPrevious}
            canPrevious={collectionsPager.canPrevious}
          />
        }
      />

      <PerformanceHistoryTable
        title="Enrolments"
        description={`New schemes at this branch · ${rangeLabel(range.from, range.to)}`}
        emptyMessage="No enrolments in this date range."
        isLoading={enrolmentsQuery.isLoading}
        headers={["When", "Enrollment #", "Customer", "Plan", "Status"]}
        rows={enrolments.map((row) => [
          formatWhen(row.createdAt as string),
          row.id ? (
            <Link
              key="e"
              href={`/enrollments/${row.id}`}
              className="font-mono text-xs text-[#730321] hover:underline"
            >
              {String(row.enrollmentNumber ?? "—")}
            </Link>
          ) : (
            <span key="e" className="font-mono text-xs">
              {String(row.enrollmentNumber ?? "—")}
            </span>
          ),
          (row.customer as { id?: string; name?: string })?.id ? (
            <Link
              key="c"
              href={`/customers/${(row.customer as { id: string }).id}`}
              className="text-[#730321] hover:underline"
            >
              {(row.customer as { name: string }).name}
            </Link>
          ) : (
            ((row.customer as { name?: string })?.name ?? "—")
          ),
          row.plan
            ? `${(row.plan as { name: string }).name}${
                (row.plan as { code?: string }).code
                  ? ` (${(row.plan as { code: string }).code})`
                  : ""
              }`
            : "—",
          <StatusBadge key="s" status={String(row.status ?? "—")} />,
        ])}
        footer={
          <CursorPagination
            page={enrolmentsPage}
            pageIndex={enrolmentsPager.pageIndex}
            rowCount={enrolments.length}
            onNext={() => enrolmentsPager.goNext(enrolmentsPage.nextCursor)}
            onPrevious={enrolmentsPager.goPrevious}
            canPrevious={enrolmentsPager.canPrevious}
          />
        }
      />

      <PerformanceHistoryTable
        title="Cash submission history"
        description={`Handovers from this branch · ${rangeLabel(range.from, range.to)}`}
        emptyMessage="No cash handovers in this date range."
        isLoading={handoversQuery.isLoading}
        headers={[
          "Submitted",
          "Staff",
          "Amount",
          "Accepted",
          "Status",
          "Settled",
        ]}
        rows={handovers.map((row) => [
          formatWhen(row.submittedAt as string),
          (row.staff as { id?: string; name?: string })?.id ? (
            <Link
              key="st"
              href={`/staff-branches/staff/${(row.staff as { id: string }).id}`}
              className="text-[#730321] hover:underline"
            >
              {(row.staff as { name: string }).name}
            </Link>
          ) : (
            ((row.staff as { name?: string })?.name ?? "—")
          ),
          <MoneyPair key="a" block={row.amount as { amountDisplay?: string }} fallback="₹0" />,
          row.acceptedAmount ? (
            <MoneyPair block={row.acceptedAmount as { amountDisplay?: string }} fallback="—" />
          ) : (
            "—"
          ),
          <StatusBadge key="s" status={String(row.status ?? "—")} />,
          formatWhen(row.settledAt as string),
        ])}
        footer={
          <CursorPagination
            page={handoversPage}
            pageIndex={handoversPager.pageIndex}
            rowCount={handovers.length}
            onNext={() => handoversPager.goNext(handoversPage.nextCursor)}
            onPrevious={handoversPager.goPrevious}
            canPrevious={handoversPager.canPrevious}
          />
        }
      />
    </div>
  );
}
