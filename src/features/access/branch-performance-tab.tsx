"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CursorPagination } from "@/src/components/common/cursor-pagination";
import { PageSkeleton } from "@/src/components/common/query-state";
import { StatusBadge } from "@/src/components/common/status-badge";
import {
  PageTab,
  PageTabs,
  PageTabsBar,
  PageTabsPanel,
} from "@/src/components/common/page-tabs";
import {
  BranchPerformanceOverview,
  PerformanceDateRangeBar,
  PerformanceExtendedInsights,
  PerformanceHistoryTable,
} from "@/src/features/access/access-detail-visuals";
import { MoneyPair } from "@/src/features/access/access-detail-parts";
import { useCursorPagination } from "@/src/hooks/use-cursor-pagination";
import { emptyPageMeta } from "@/src/lib/cursor-pagination";
import { validateListDateRange } from "@/src/lib/list-date-range";
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

const recordLinkClass =
  "font-medium text-[#2d191d] hover:text-[#730321] hover:underline";

type PerformanceCollectionRow = {
  paidAt?: string;
  receiptNumber?: string;
  customer?: { id?: string; name?: string };
  scheme?: { id?: string; enrollmentNumber?: string };
  collectedBy?: { id?: string; name?: string };
  mode?: string;
  source?: string;
  amount?: { amountDisplay?: string };
};

type PerformanceEnrolmentRow = {
  id?: string;
  createdAt?: string;
  enrollmentNumber?: string;
  customer?: { id?: string; name?: string };
  plan?: { name?: string; code?: string };
  status?: string;
};

type PerformanceHandoverRow = {
  submittedAt?: string;
  staff?: { id?: string; name?: string };
  amount?: { amountDisplay?: string };
  acceptedAmount?: { amountDisplay?: string };
  status?: string;
  settledAt?: string;
};

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
  const applyRangeError = validateListDateRange(draftFrom, draftTo);

  const collections = (collectionsQuery.data?.items ??
    []) as PerformanceCollectionRow[];
  const enrolments = (enrolmentsQuery.data?.items ??
    []) as PerformanceEnrolmentRow[];
  const handovers = (handoversQuery.data?.items ??
    []) as PerformanceHandoverRow[];

  const collectionsPage =
    collectionsQuery.data?.page ?? emptyPageMeta();
  const enrolmentsPage = enrolmentsQuery.data?.page ?? emptyPageMeta();
  const handoversPage = handoversQuery.data?.page ?? emptyPageMeta();

  const cashControlHref = `/cash-control?branchId=${encodeURIComponent(branchId)}`;
  const currentRangeLabel = rangeLabel(range.from, range.to);

  if (summaryQuery.isLoading && !summary) {
    return <PageSkeleton cards={4} />;
  }

  return (
    <div className="space-y-5">
      <PerformanceDateRangeBar
        draftFrom={draftFrom}
        draftTo={draftTo}
        rangeLabel={currentRangeLabel}
        applyRangeError={applyRangeError}
        onDraftFromChange={setDraftFrom}
        onDraftToChange={setDraftTo}
        onApply={() => {
          const err = validateListDateRange(draftFrom, draftTo);
          if (err) return;
          setRange({ from: draftFrom, to: draftTo });
        }}
        onResetMonth={() => {
          setDraftFrom(defaults.from);
          setDraftTo(defaults.to);
          setRange(defaults);
        }}
      />

      <BranchPerformanceOverview
        rangeLabel={currentRangeLabel}
        collection={summary?.collectionTotal}
        enrolments={Number(summary?.enrolments ?? 0)}
        customersServed={Number(summary?.customersServed ?? 0)}
        paymentsCount={Number(summary?.paymentsCount ?? 0)}
        averageTicket={summary?.averageTicket}
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

      <PageTabs defaultValue="collections" className="gap-0">
        <PageTabsBar
          sectionLabel="Activity history"
          listVariant="detailSub"
          className="h-auto w-full max-w-full flex-wrap"
        >
          <PageTab value="collections">Collections</PageTab>
          <PageTab value="enrolments">Enrolments</PageTab>
          <PageTab value="handovers">Cash handovers</PageTab>
        </PageTabsBar>

        <PageTabsPanel value="collections" flush>
          <PerformanceHistoryTable
            embedded
            title="Collection history"
            description={`Payments recorded at this branch · ${currentRangeLabel}`}
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
                  className={recordLinkClass}
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
                  className={`font-mono text-xs ${recordLinkClass}`}
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
                  className={recordLinkClass}
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
        </PageTabsPanel>

        <PageTabsPanel value="enrolments" flush>
          <PerformanceHistoryTable
            embedded
            title="Enrolments"
            description={`New schemes at this branch · ${currentRangeLabel}`}
            emptyMessage="No enrolments in this date range."
            isLoading={enrolmentsQuery.isLoading}
            headers={["When", "Enrollment #", "Customer", "Plan", "Status"]}
            rows={enrolments.map((row) => [
              formatWhen(row.createdAt as string),
              row.id ? (
                <Link
                  key="e"
                  href={`/enrollments/${row.id}`}
                  className={`font-mono text-xs ${recordLinkClass}`}
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
                  className={recordLinkClass}
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
        </PageTabsPanel>

        <PageTabsPanel value="handovers" flush>
          <PerformanceHistoryTable
            embedded
            title="Cash submission history"
            description={`Handovers from this branch · ${currentRangeLabel}`}
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
                  className={recordLinkClass}
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
        </PageTabsPanel>
      </PageTabs>
    </div>
  );
}
