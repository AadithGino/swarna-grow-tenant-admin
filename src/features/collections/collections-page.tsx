"use client";

import { useMemo, useState, type KeyboardEvent, type MouseEvent } from "react";
import { useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  Download,
  HandCoins,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ListSearchInput } from "@/src/components/common/list-search-input";
import {
  CollectionTrendChart,
  DonutChart,
} from "@/src/components/common/charts";
import { DateRangeFilter } from "@/src/components/common/date-range-filter";
import { PaginatedDataTable } from "@/src/components/common/paginated-data-table";
import { Surface } from "@/src/components/common/page-parts";
import {
  HeroStat,
  SectionHero,
  heroButtonClass,
} from "@/src/components/admin-ui/section-hero";
import { PageFilterTabs, PageTab } from "@/src/components/common/page-tabs";
import {
  EmptyState,
  PageSkeleton,
  QueryError,
} from "@/src/components/common/query-state";
import { useValidatedListDateRange } from "@/src/hooks/use-validated-list-date-range";
import { StatusBadge } from "@/src/components/common/status-badge";
import { downloadBlobUrl, downloadCsv, downloadText } from "@/src/lib/download";
import { goldLedgerColumns } from "@/src/components/common/gold-payment-columns";
import { money } from "@/src/lib/format";
import { paymentHasGoldAccrual } from "@/src/lib/gold-payment-display";
import { emptyPageMeta } from "@/src/lib/cursor-pagination";
import {
  defaultListRangeFrom,
  defaultListRangeTo,
  listSearchQueryForApi,
  sanitizeListSearchQueryInput,
  shouldSkipListSearchQuery,
} from "@/src/lib/list-date-range";
import {
  useActingBranchId,
  useActingBranchKey,
} from "@/src/hooks/use-acting-branch-id";
import { useCursorPagination } from "@/src/hooks/use-cursor-pagination";
import { useDebouncedValue } from "@/src/hooks/use-debounced-value";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CustomerLink,
  EnrollmentLink,
  ReceiptLink,
  collectionsSearchHref,
} from "@/src/components/common/portal-entity-links";
import {
  useGetDashboardQuery,
  useGetPostSettlementRefundCasesQuery,
  useGetPaymentsQuery,
  useLazyGetPaymentReceiptQuery,
  usePollPaymentStatusMutation,
  useReconcilePaymentMutation,
  useReversePaymentMutation,
} from "@/src/store/api/admin-api";
import { toast } from "sonner";
import { toastApiError } from "@/src/lib/api-error";
import { ReversePaymentDialog } from "@/src/features/collections/reverse-payment-dialog";
import { PaymentRefundDialog } from "@/src/features/collections/payment-refund-dialog";
import type { Payment } from "@/src/types/domain";
import { GatewaySettlementPanel } from "@/src/features/collections/gateway-settlement-panel";
import { PostSettlementRefundsPanel } from "@/src/features/collections/post-settlement-refunds-panel";

type LedgerTab = "all" | "pending" | "late" | "reversed";
type CollectionSection = "payments" | "refunds" | "settlement" | "post-settlement-refunds";

export function CollectionsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const receiptFromUrl = searchParams.get("q") ?? "";
  const requestedSection = searchParams.get("view");
  const [section, setSection] = useState<CollectionSection>(() =>
    requestedSection === "refunds" ||
    requestedSection === "settlement" ||
    requestedSection === "post-settlement-refunds"
      ? requestedSection
      : "payments",
  );
  const { from, setFrom, to, setTo, dateRangeError, skipForBadDates } =
    useValidatedListDateRange();
  const [tab, setTab] = useState<LedgerTab>("all");
  const [q, setQ] = useState(() =>
    sanitizeListSearchQueryInput(receiptFromUrl),
  );
  const debouncedQ = useDebouncedValue(q, 350);
  const skipForSearch = shouldSkipListSearchQuery(debouncedQ);
  const skipQueries = skipForBadDates || skipForSearch;
  const branchId = useActingBranchId();
  const branchKey = useActingBranchKey();
  const pager = useCursorPagination(
    8,
    `${from}|${to}|${tab}|${debouncedQ}|${branchKey}`,
  );
  const [fetchReceipt] = useLazyGetPaymentReceiptQuery();
  const [pollStatus, pollState] = usePollPaymentStatusMutation();
  const [reconcilePayment, reconcileState] = useReconcilePaymentMutation();
  const [reversePayment, reverseState] = useReversePaymentMutation();
  const paymentActionBusy =
    pollState.isLoading || reconcileState.isLoading || reverseState.isLoading;
  const [reverseTarget, setReverseTarget] = useState<{
    id: string;
    receiptNo: string;
  } | null>(null);
  const [refundTarget, setRefundTarget] = useState<Payment | null>(null);

  const queryArgs = useMemo(() => {
    const range = {
      from,
      to,
      q: listSearchQueryForApi(debouncedQ),
      branchId,
      ...pager.queryParams,
    };
    if (tab === "pending") return { ...range, status: "PENDING" };
    if (tab === "reversed") return { ...range, status: "REVERSED" };
    if (tab === "late") return { ...range, isLateSuccess: true };
    return range;
  }, [
    from,
    to,
    tab,
    debouncedQ,
    branchId,
    pager.queryParams,
  ]);

  const query = useGetPaymentsQuery(queryArgs, { skip: skipQueries });
  const pendingCases = useGetPostSettlementRefundCasesQuery({
    status: "PENDING_RESOLUTION",
  });
  const pendingPostSettlementCount =
    pendingCases.data?.meta?.pendingCount ?? 0;
  const modeMixQuery = useGetPaymentsQuery(
    { from, to, branchId, limit: 1 },
    { skip: skipForBadDates },
  );
  const dashboard = useGetDashboardQuery(
    { from, to, branchId, period: "CUSTOM" },
    { skip: skipForBadDates },
  );
  if (skipForBadDates) {
    return (
      <>
        <SectionHero
          icon={HandCoins}
          eyebrow="Money"
          title="Collections"
          description="All collection channels, gateway states, receipts and reversals in one operational ledger."
        />
        <Surface title="Invalid period">
          <EmptyState title="Fix the date range" detail={dateRangeError ?? ""} />
        </Surface>
      </>
    );
  }
  if (query.isLoading) return <PageSkeleton />;
  if (query.isError || !query.data)
    return <QueryError error={query.error} onRetry={query.refetch} />;
  // KPI cards always describe the whole period; the tab only filters the table.
  const s = modeMixQuery.data?.summary ?? query.data.summary ?? {};
  const rows = query.data.items;
  const showGoldLedger = rows.some((r: Payment) => paymentHasGoldAccrual(r));
  const page = query.data.page ?? emptyPageMeta();
  const byMode = modeMixQuery.data?.byMode ?? query.data.byMode ?? [];
  const donutData = byMode
    .filter((d: { amount: number }) => d.amount > 0)
    .map((d: { label: string; amount: number }) => ({
      name: d.label,
      value: d.amount,
    }));
  const cashShare =
    (s.collected ?? 0) > 0
      ? Math.round(((s.cash ?? 0) / (s.collected ?? 1)) * 1000) / 10
      : 0;

  async function handleDownloadReceipt(paymentId: string, receiptNo: string) {
    try {
      const result = await fetchReceipt(paymentId).unwrap();
      if (result.kind === "blob") {
        const ext = result.contentType.includes("pdf") ? "pdf" : "bin";
        downloadBlobUrl(`${receiptNo}.${ext}`, result.blobUrl);
      } else {
        downloadText(
          `${receiptNo}.json`,
          JSON.stringify(result.payload, null, 2),
          "application/json;charset=utf-8",
        );
      }
    } catch {
      toast.error("Could not download receipt");
    }
  }

  async function handlePollStatus(paymentId: string) {
    try {
      const result = await pollStatus(paymentId).unwrap();
      toast.success(
        `${result.outcome.replaceAll("_", " ")} · ${result.paymentStatus.replaceAll("_", " ")}`,
      );
      await query.refetch();
    } catch (err) {
      toastApiError(err, "Could not poll payment status");
    }
  }

  async function handleReconcile(paymentId: string) {
    try {
      await reconcilePayment(paymentId).unwrap();
      toast.success("Reconciliation queued");
      await query.refetch();
    } catch (err) {
      toastApiError(err, "Could not reconcile payment");
    }
  }

  const clip = "block truncate";
  const ledgerColumns = [
    {
      key: "receipt",
      header: "Receipt",
      widthClass: "w-[11rem]",
      className: "truncate",
      render: (r: (typeof rows)[number]) => (
        <ReceiptLink paymentId={r.id} receiptNo={r.receiptNo} className={clip}>
          <strong className="truncate" title={r.receiptNo}>
            {r.receiptNo}
          </strong>
        </ReceiptLink>
      ),
    },
    {
      key: "date",
      header: "Recorded at",
      widthClass: "w-[12rem]",
      className: "truncate whitespace-nowrap text-[0.85rem]",
      render: (r: (typeof rows)[number]) => (
        <span className="truncate" title={r.date}>
          {r.date}
        </span>
      ),
    },
    {
      key: "customer",
      header: "Customer",
      widthClass: "w-[10rem]",
      className: "truncate",
      render: (r: (typeof rows)[number]) => (
        <CustomerLink customerId={r.customerId} className={clip}>
          <span title={r.customer}>{r.customer}</span>
        </CustomerLink>
      ),
    },
    {
      key: "enrollment",
      header: "Enrollment",
      widthClass: "w-[9rem]",
      className: "truncate whitespace-nowrap",
      render: (r: (typeof rows)[number]) => (
        <EnrollmentLink schemeId={r.schemeId}>{r.enrollmentNo}</EnrollmentLink>
      ),
    },
    {
      key: "amount",
      header: "Net amount",
      widthClass: "w-[8.5rem]",
      className: "overflow-visible whitespace-normal text-right tabular-nums",
      headerClassName: "text-right",
      render: (r: (typeof rows)[number]) => (
        <div>
          <strong>{money(r.netAmount ?? r.amount)}</strong>
          {(r.refundedAmount ?? 0) > 0 ? (
            <p className="text-xs text-muted-foreground">
              Gross {money(r.grossAmount ?? r.amount)} · refunded {money(r.refundedAmount ?? 0)}
            </p>
          ) : null}
        </div>
      ),
    },
    ...(showGoldLedger ? goldLedgerColumns<(typeof rows)[number]>() : []),
    {
      key: "mode",
      header: "Mode",
      widthClass: "w-[8rem]",
      className: "truncate text-[0.85rem]",
      render: (r: (typeof rows)[number]) => r.mode.replaceAll("_", " "),
    },
    {
      key: "staff",
      header: "Staff",
      widthClass: "w-[8rem]",
      className: "truncate",
      render: (r: (typeof rows)[number]) => r.staff,
    },
    {
      key: "source",
      header: "Source",
      widthClass: "w-[7.5rem]",
      className: "truncate text-[0.85rem]",
      render: (r: (typeof rows)[number]) =>
        r.source === "STAFF"
          ? "Staff app"
          : r.source === "ADMIN"
            ? "Admin panel"
            : "Customer app",
    },
    {
      key: "status",
      header: "Status",
      widthClass: "w-[8rem]",
      render: (r: (typeof rows)[number]) => <StatusBadge status={r.status} />,
    },
    {
      key: "ops",
      header: "Actions",
      widthClass: "w-[11rem]",
      className: "overflow-visible whitespace-normal text-right align-top",
      headerClassName: "text-right",
      render: (r: (typeof rows)[number]) => {
        const status = String(r.status ?? "");
        const showPendingOps =
          tab === "pending" ||
          tab === "late" ||
          status === "PENDING" ||
          status === "LATE_SUCCESS";
        const stopRow = (e: MouseEvent | KeyboardEvent) => {
          e.stopPropagation();
        };
        return (
          <div
            className="flex flex-col items-stretch gap-1 sm:items-end"
            onClick={stopRow}
            onKeyDown={stopRow}
            role="presentation"
          >
            {showPendingOps ? (
              <div className="flex flex-wrap justify-end gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 px-2"
                  disabled={paymentActionBusy}
                  onClick={() => void handlePollStatus(r.id)}
                >
                  Poll
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 px-2"
                  disabled={paymentActionBusy}
                  onClick={() => void handleReconcile(r.id)}
                >
                  Reconcile
                </Button>
              </div>
            ) : null}
            <div className="flex flex-wrap justify-end gap-1">
              {status === "SUCCESS" &&
              tab !== "reversed" &&
              r.mode !== "ONLINE_GATEWAY" &&
              r.mode !== "LEGACY_ONLINE" ? (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 px-2 text-red-700"
                  disabled={paymentActionBusy}
                  onClick={() =>
                    setReverseTarget({ id: r.id, receiptNo: r.receiptNo })
                  }
                >
                  Reverse
                </Button>
              ) : null}
              {r.mode === "ONLINE_GATEWAY" &&
              ["SUCCESS", "PARTIALLY_REFUNDED"].includes(status) ? (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 px-2"
                  onClick={() => setRefundTarget(r)}
                >
                  Refund
                </Button>
              ) : null}
              <Button
                size="sm"
                variant="outline"
                className="h-8 gap-1 px-2"
                onClick={() => void handleDownloadReceipt(r.id, r.receiptNo)}
              >
                <Download className="size-3.5" aria-hidden />
                Receipt
              </Button>
            </div>
          </div>
        );
      },
    },
  ];

  const refundableRows = rows.filter(
    (row: Payment) =>
      row.mode === "ONLINE_GATEWAY" &&
      ["SUCCESS", "PARTIALLY_REFUNDED"].includes(String(row.status)),
  );
  const refundColumns = [
    {
      key: "receipt",
      header: "Receipt",
      render: (row: Payment) => (
        <ReceiptLink paymentId={row.id} receiptNo={row.receiptNo}>
          <strong>{row.receiptNo}</strong>
        </ReceiptLink>
      ),
    },
    {
      key: "customer",
      header: "Customer",
      render: (row: Payment) => (
        <div>
          <p className="font-medium">
            <CustomerLink customerId={row.customerId}>{row.customer}</CustomerLink>
          </p>
          <p className="text-xs text-muted-foreground">
            <EnrollmentLink schemeId={row.schemeId}>
              {row.enrollmentNo}
            </EnrollmentLink>
          </p>
        </div>
      ),
    },
    {
      key: "gross",
      header: "Gross paid",
      render: (row: Payment) => money(row.grossAmount ?? row.amount),
    },
    {
      key: "refunded",
      header: "Already refunded",
      render: (row: Payment) => money(row.refundedAmount ?? 0),
    },
    {
      key: "available",
      header: "Refundable now",
      render: (row: Payment) => (
        <strong>{money(Math.max(0, row.netAmount ?? row.amount))}</strong>
      ),
    },
    {
      key: "status",
      header: "Payment status",
      render: (row: Payment) => <StatusBadge status={row.status} />,
    },
    {
      key: "action",
      header: "",
      render: (row: Payment) => (
        <Button size="sm" onClick={() => setRefundTarget(row)}>
          Manage refund
        </Button>
      ),
    },
  ];

  return (
    <>
      {pendingPostSettlementCount > 0 && section !== "post-settlement-refunds" ? (
        <Surface className="mb-4 border-amber-200/80 bg-amber-50/90 px-4 py-3">
          <div className="flex flex-wrap items-center gap-2 text-sm text-amber-950">
            <AlertTriangle className="size-4 shrink-0" aria-hidden />
            <span>
              {pendingPostSettlementCount} post-settlement gateway refund
              {pendingPostSettlementCount === 1 ? "" : "s"} pending resolution.
            </span>
            <Link
              href="?view=post-settlement-refunds"
              className="font-medium underline underline-offset-2"
            >
              Review cases
            </Link>
          </div>
        </Surface>
      ) : null}
      <SectionHero
        icon={HandCoins}
        eyebrow="Money"
        title="Collections"
        description="All collection channels, gateway states, receipts and reversals in one operational ledger."
        actions={
          <button
            type="button"
            className={heroButtonClass}
            onClick={() =>
              downloadCsv(
                "collections.csv",
                [
                  "Receipt",
                  "Date",
                  "Customer",
                  "Enrollment",
                  "Amount",
                  "Mode",
                  "Status",
                ],
                rows.map((r: (typeof rows)[number]) => [
                  r.receiptNo,
                  r.date,
                  r.customer,
                  r.enrollmentNo,
                  r.amount,
                  r.mode,
                  r.status,
                ]),
              )
            }
          >
            <Download className="size-4" aria-hidden />
            Export CSV
          </button>
        }
      >
        <HeroStat
          label="Collected (net)"
          value={money(s.collected ?? 0)}
          detail={`${s.successfulCount ?? 0} successful of ${s.count ?? 0} payments in period`}
        />
        <HeroStat
          label="Cash"
          value={money(s.cash ?? 0)}
          detail={`${cashShare}% of collected`}
        />
        <HeroStat
          label="Non-cash"
          value={money(s.digital ?? 0)}
          detail={`UPI ${money(s.upi ?? 0)} · Card ${money(s.card ?? 0)}${(s.online ?? 0) > 0 ? ` · Online ${money(s.online ?? 0)}` : ""}`}
        />
        <HeroStat
          label="Awaiting gateway"
          value={money(s.pending ?? 0)}
          detail={`${s.pendingCount ?? 0} pending · ${s.failed ?? 0} failed`}
        />
        <HeroStat
          label="Reversed"
          value={money(s.reversed ?? 0)}
          detail={`${s.reversedCount ?? 0} reversed · ${money(s.refunded ?? 0)} partly refunded`}
        />
      </SectionHero>

      <Surface className="overflow-visible p-0">
        <div className="px-4 pt-4 pb-3 sm:px-5">
          <PageFilterTabs
            sectionLabel="Collection operations"
            toolbarChrome="plain"
            value={section}
            onValueChange={(value) => setSection(value as CollectionSection)}
            tabsListClassName="h-auto w-fit max-w-full flex-wrap justify-start shadow-none"
          >
            <PageTab value="payments">Payments</PageTab>
            <PageTab value="refunds">PhonePe refunds</PageTab>
            <PageTab value="settlement">Daily settlement</PageTab>
            <PageTab value="post-settlement-refunds">
              Post-settlement
              {pendingPostSettlementCount > 0
                ? ` (${pendingPostSettlementCount})`
                : ""}
            </PageTab>
          </PageFilterTabs>
        </div>
        <div className="flex flex-col gap-2 border-t border-[#eaded9] bg-[#fcfaf8] px-4 py-3 sm:flex-row sm:items-center sm:justify-end sm:gap-3 sm:px-5">
          <ListSearchInput
            value={q}
            onChange={setQ}
            placeholder="Receipt, customer…"
            className="w-full sm:w-56"
            inputClassName="h-10 rounded-xl"
            iconClassName="size-4"
          />
          <DateRangeFilter
            label="Paid"
            from={from}
            to={to}
            onFromChange={setFrom}
            onToChange={setTo}
            onPreset={() => {
              setFrom(defaultListRangeFrom());
              setTo(defaultListRangeTo());
            }}
            className="w-full shrink-0 sm:w-auto"
          />
        </div>
      </Surface>
      {section === "post-settlement-refunds" ? <PostSettlementRefundsPanel /> : null}
      {section === "payments" ? <><div className="grid gap-5 xl:grid-cols-[1.5fr_.8fr]">
        <Surface title="Collection trend" description="Cash versus digital">
          <div className="h-[320px] p-5">
            {dashboard.data && (
              <CollectionTrendChart data={dashboard.data.collectionTrend} />
            )}
          </div>
        </Surface>
        <Surface
          title="Mode mix"
          description={
            tab === "all"
              ? "Successful payments by mode"
              : "Successful payments by mode (period-wide; table uses tab filter)"
          }
        >
          <div className="h-[360px] p-5">
            <DonutChart
              data={donutData}
              centre={money(s.collected ?? 0)}
              showLegend
              showSliceLabels
            />
          </div>
        </Surface>
      </div>
      <Surface className="p-0">
        <div className="px-4 py-3 sm:px-5">
        <PageFilterTabs
          sectionLabel="Payment views"
          toolbarChrome="plain"
          value={tab}
          onValueChange={(value) => setTab(value as LedgerTab)}
          tabsListClassName="h-auto w-fit max-w-full flex-wrap justify-start shadow-none"
        >
          <PageTab value="all">All payments</PageTab>
          <PageTab value="pending">Pending</PageTab>
          <PageTab value="late">Late success</PageTab>
          <PageTab value="reversed">Reversed</PageTab>
        </PageFilterTabs>
        </div>
        <div className="border-t border-[#eaded9]">
        <PaginatedDataTable
          rows={rows}
          page={page}
          pageIndex={pager.pageIndex}
          onNext={() => pager.goNext(page.nextCursor)}
          onPrevious={pager.goPrevious}
          canPrevious={pager.canPrevious}
          onRowClick={(r: (typeof rows)[number]) =>
            router.push(collectionsSearchHref(r.receiptNo || r.id))
          }
          columns={ledgerColumns}
          minTableWidth="min-w-[88rem]"
        />
        </div>
      </Surface>
      </> : null}
      {section === "refunds" ? (
        <Surface
          title="PhonePe refunds"
          description="Initiate full or partial refunds, review provider state, reconcile pending refunds, and safely release failed reservations with evidence."
        >
          <div className="border-b bg-amber-50 px-5 py-3 text-sm text-amber-900">
            Only successful or partially refunded PhonePe payments are eligible.
            Use the search and date filters above to locate a receipt or customer.
          </div>
          {refundableRows.length ? (
            <PaginatedDataTable
              rows={refundableRows}
              page={page}
              pageIndex={pager.pageIndex}
              onNext={() => pager.goNext(page.nextCursor)}
              onPrevious={pager.goPrevious}
              canPrevious={pager.canPrevious}
              columns={refundColumns}
            />
          ) : (
            <div className="p-6">
              <EmptyState
                title="No refundable PhonePe payments in this view"
                detail="Expand the date range or search by receipt/customer. Cash, manual UPI, card and bank-transfer collections are reversed through the payment ledger, not the PhonePe refund workflow."
              />
            </div>
          )}
        </Surface>
      ) : null}
      {section === "settlement" ? <GatewaySettlementPanel /> : null}
      <ReversePaymentDialog
        open={Boolean(reverseTarget)}
        onOpenChange={(open) => {
          if (!open) setReverseTarget(null);
        }}
        receiptNo={reverseTarget?.receiptNo}
        busy={reverseState.isLoading}
        onConfirm={async (reason) => {
          if (!reverseTarget) return;
          await reversePayment({
            paymentId: reverseTarget.id,
            reason,
          }).unwrap();
          toast.success("Payment reversed");
          await query.refetch();
        }}
      />
      <PaymentRefundDialog
        key={refundTarget?.id ?? "no-refund"}
        payment={refundTarget}
        open={Boolean(refundTarget)}
        onOpenChange={(next) => {
          if (!next) setRefundTarget(null);
        }}
      />
    </>
  );
}
