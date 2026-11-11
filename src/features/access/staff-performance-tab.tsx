"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CursorPagination } from "@/src/components/common/cursor-pagination";
import { FieldLabel, Surface } from "@/src/components/common/page-parts";
import { PageSkeleton } from "@/src/components/common/query-state";
import { StatusBadge } from "@/src/components/common/status-badge";
import Link from "next/link";
import {
  PerformanceExtendedInsights,
  PerformanceHistoryTable,
  StaffPerformanceSummaryBlock,
} from "@/src/features/access/access-detail-visuals";
import { MoneyPair } from "@/src/features/access/access-detail-parts";
import { useCursorPagination } from "@/src/hooks/use-cursor-pagination";
import { istMonthToDateRange } from "@/src/lib/ist-business-date";
import { emptyPageMeta } from "@/src/lib/cursor-pagination";
import {
  useGetStaffPerformanceSectionQuery,
  useGetStaffPerformanceSummaryQuery,
} from "@/src/store/api/admin-api";

function defaultMonthRange() {
  // IST calendar month; toISOString() on a local-midnight date started the range a day early.
  return istMonthToDateRange();
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

export function StaffPerformanceTab({ staffId }: { staffId: string }) {
  const defaults = useMemo(() => defaultMonthRange(), []);
  const [draftFrom, setDraftFrom] = useState(defaults.from);
  const [draftTo, setDraftTo] = useState(defaults.to);
  const [range, setRange] = useState(defaults);
  const rangeKey = `${range.from}|${range.to}`;

  const collectionsPager = useCursorPagination(8, `collections|${rangeKey}`);
  const enrolmentsPager = useCursorPagination(8, `enrolments|${rangeKey}`);
  const handoversPager = useCursorPagination(8, `handovers|${rangeKey}`);

  const summaryQuery = useGetStaffPerformanceSummaryQuery({
    staffId,
    from: range.from,
    to: range.to,
  });

  const collectionsQuery = useGetStaffPerformanceSectionQuery({
    staffId,
    section: "collections",
    from: range.from,
    to: range.to,
    ...collectionsPager.queryParams,
  });

  const enrolmentsQuery = useGetStaffPerformanceSectionQuery({
    staffId,
    section: "enrolments",
    from: range.from,
    to: range.to,
    ...enrolmentsPager.queryParams,
  });

  const handoversQuery = useGetStaffPerformanceSectionQuery({
    staffId,
    section: "handovers",
    from: range.from,
    to: range.to,
    ...handoversPager.queryParams,
  });

  const summary = summaryQuery.data;
  const collections =
    collectionsQuery.data?.kind === "collections"
      ? collectionsQuery.data.items
      : [];
  const enrolments =
    enrolmentsQuery.data?.kind === "enrolments"
      ? enrolmentsQuery.data.items
      : [];
  const handovers =
    handoversQuery.data?.kind === "handovers"
      ? handoversQuery.data.items
      : [];

  const collectionsPage =
    collectionsQuery.data?.page ?? emptyPageMeta();
  const enrolmentsPage = enrolmentsQuery.data?.page ?? emptyPageMeta();
  const handoversPage = handoversQuery.data?.page ?? emptyPageMeta();

  if (summaryQuery.isLoading && !summary) {
    return <PageSkeleton cards={4} />;
  }

  return (
    <div className="space-y-5">
      <Surface
        title="Date range"
        description="Filter collections, enrolments and cash submissions (tenant timezone)"
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
              setRange({
                from: draftFrom || defaults.from,
                to: draftTo || defaults.to,
              })
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
        cashInHand={summary?.cash?.cashInHand}
        cash={summary?.cash}
        staffId={staffId}
      />

      <PerformanceExtendedInsights
        summary={summary as Record<string, unknown>}
        variant="staff"
      />

      <PerformanceHistoryTable
        title="Collection history"
        description={`Successful payments in ${rangeLabel(range.from, range.to)}`}
        emptyMessage="No collections in this date range."
        isLoading={collectionsQuery.isLoading}
        headers={[
          "When",
          "Receipt",
          "Customer",
          "Enrollment",
          "Mode",
          "Source",
          "Amount",
        ]}
        rows={collections.map((row) => [
          formatWhen(row.paidAt),
          <span key="r" className="font-mono text-xs">
            {row.receiptNumber}
          </span>,
          row.customer?.id ? (
            <Link
              key="c"
              href={`/customers/${row.customer.id}`}
              className="text-[#730321] hover:underline"
            >
              {row.customer.name}
            </Link>
          ) : (
            (row.customer?.name ?? "—")
          ),
          row.scheme?.id ? (
            <Link
              key="e"
              href={`/enrollments/${row.scheme.id}`}
              className="font-mono text-xs text-[#730321] hover:underline"
            >
              {row.scheme.enrollmentNumber ?? row.scheme.id}
            </Link>
          ) : (
            "—"
          ),
          row.mode === "CASH"
            ? "Cash in hand"
            : String(row.mode ?? "—").replace(/_/g, " "),
          String(row.source ?? "—").replace(/_/g, " "),
          <MoneyPair key="a" block={row.amount} fallback="₹0" />,
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
        description={`Schemes created in ${rangeLabel(range.from, range.to)}`}
        emptyMessage="No enrolments in this date range."
        isLoading={enrolmentsQuery.isLoading}
        headers={["When", "Enrollment #", "Customer", "Plan", "Status"]}
        rows={enrolments.map((row) => [
          formatWhen(row.createdAt),
          row.id ? (
            <Link
              key="e"
              href={`/enrollments/${row.id}`}
              className="font-mono text-xs text-[#730321] hover:underline"
            >
              {row.enrollmentNumber}
            </Link>
          ) : (
            <span key="e" className="font-mono text-xs">
              {row.enrollmentNumber}
            </span>
          ),
          row.customer?.id ? (
            <Link
              key="c"
              href={`/customers/${row.customer.id}`}
              className="text-[#730321] hover:underline"
            >
              {row.customer.name}
            </Link>
          ) : (
            (row.customer?.name ?? "—")
          ),
          row.plan
            ? `${row.plan.name}${row.plan.code ? ` (${row.plan.code})` : ""}`
            : "—",
          <StatusBadge key="s" status={row.status} />,
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
        description={`Handovers submitted in ${rangeLabel(range.from, range.to)}`}
        emptyMessage="No cash handovers in this date range."
        isLoading={handoversQuery.isLoading}
        headers={["Submitted", "Amount", "Accepted", "Status", "Settled"]}
        rows={handovers.map((row) => [
          formatWhen(row.submittedAt),
          <MoneyPair key="a" block={row.amount} fallback="₹0" />,
          row.acceptedAmount ? (
            <MoneyPair block={row.acceptedAmount} fallback="—" />
          ) : (
            "—"
          ),
          <StatusBadge key="s" status={row.status} />,
          formatWhen(row.settledAt),
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
