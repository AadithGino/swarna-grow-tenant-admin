"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  Download,
  HandCoins,
  IndianRupee,
  RotateCcw,
  CreditCard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ListSearchInput } from "@/src/components/common/list-search-input";
import {
  CollectionTrendChart,
  DonutChart,
} from "@/src/components/common/charts";
import { DateRangeFilter } from "@/src/components/common/date-range-filter";
import { PaginatedDataTable } from "@/src/components/common/paginated-data-table";
import {
  PageHeader,
  StatCard,
  Surface,
} from "@/src/components/common/page-parts";
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
import {
  useGetDashboardQuery,
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

type LedgerTab = "all" | "pending" | "late" | "reversed";
type CollectionSection = "payments" | "refunds" | "settlement";

export function CollectionsPage() {
  const searchParams = useSearchParams();
  const receiptFromUrl = searchParams.get("q") ?? "";
  const requestedSection = searchParams.get("view");
  const [section, setSection] = useState<CollectionSection>(() =>
    requestedSection === "refunds" || requestedSection === "settlement"
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
        <PageHeader
          eyebrow="Money & fulfilment"
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
  const s = query.data.summary ?? {};
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

  const ledgerColumns = [
    {
      key: "receipt",
      header: "Receipt",
      render: (r: (typeof rows)[number]) => <strong>{r.receiptNo}</strong>,
    },
    {
      key: "date",
      header: "Recorded at",
      render: (r: (typeof rows)[number]) => r.date,
    },
    {
      key: "customer",
      header: "Customer",
      render: (r: (typeof rows)[number]) => r.customer,
    },
    {
      key: "enrollment",
      header: "Enrollment",
      render: (r: (typeof rows)[number]) => r.enrollmentNo,
    },
    {
      key: "amount",
      header: "Net amount",
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
      render: (r: (typeof rows)[number]) => r.mode.replaceAll("_", " "),
    },
    {
      key: "staff",
      header: "Staff",
      render: (r: (typeof rows)[number]) => r.staff,
    },
    {
      key: "source",
      header: "Source",
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
      render: (r: (typeof rows)[number]) => <StatusBadge status={r.status} />,
    },
    {
      key: "ops",
      header: "",
      render: (r: (typeof rows)[number]) => {
        const status = String(r.status ?? "");
        const showPendingOps =
          tab === "pending" ||
          tab === "late" ||
          status === "PENDING" ||
          status === "LATE_SUCCESS";
        return (
          <div className="flex flex-wrap justify-end gap-1">
            {showPendingOps ? (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={paymentActionBusy}
                  onClick={() => void handlePollStatus(r.id)}
                >
                  Poll
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={paymentActionBusy}
                  onClick={() => void handleReconcile(r.id)}
                >
                  Reconcile
                </Button>
              </>
            ) : null}
            {status === "SUCCESS" &&
            tab !== "reversed" &&
            r.mode !== "ONLINE_GATEWAY" &&
            r.mode !== "LEGACY_ONLINE" ? (
              <Button
                size="sm"
                variant="ghost"
                className="text-red-700"
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
                onClick={() => setRefundTarget(r)}
              >
                Refund
              </Button>
            ) : null}
            <Button
              size="sm"
              variant="outline"
              onClick={() => void handleDownloadReceipt(r.id, r.receiptNo)}
            >
              <Download />
              Receipt
            </Button>
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
      render: (row: Payment) => <strong>{row.receiptNo}</strong>,
    },
    {
      key: "customer",
      header: "Customer",
      render: (row: Payment) => (
        <div>
          <p className="font-medium">{row.customer}</p>
          <p className="text-xs text-muted-foreground">{row.enrollmentNo}</p>
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
      <PageHeader
        eyebrow="Money & fulfilment"
        title="Collections"
        description="All collection channels, gateway states, receipts and reversals in one operational ledger."
        actions={
          <>
            <ListSearchInput
              value={q}
              onChange={setQ}
              placeholder="Receipt, customer…"
              className="w-[200px]"
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
            />
            <Button
              variant="outline"
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
              <Download />
              Export
            </Button>
          </>
        }
      />
      <Surface className="overflow-visible">
        <PageFilterTabs
          sectionLabel="Collection operations"
          value={section}
          onValueChange={(value) => setSection(value as CollectionSection)}
        >
          <PageTab value="payments">Payments</PageTab>
          <PageTab value="refunds">PhonePe refunds</PageTab>
          <PageTab value="settlement">Daily settlement</PageTab>
        </PageFilterTabs>
      </Surface>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard
          icon={IndianRupee}
          label="Collected"
          value={money(s.collected ?? 0)}
          detail={
            tab === "all"
              ? `${s.successfulCount ?? 0} successful · ${s.count ?? rows.length} in period`
              : `${s.count ?? rows.length} payments in "${tab}" view`
          }
        />
        <StatCard
          icon={HandCoins}
          label="Cash"
          value={money(s.cash ?? 0)}
          detail={`${cashShare}% of successful`}
          tone="cream"
        />
        <StatCard
          icon={CreditCard}
          label="Non-cash"
          value={money(s.digital ?? 0)}
          detail={`Card ${money(s.card ?? 0)} · UPI ${money(s.upi ?? 0)}`}
          tone="gold"
        />
        <StatCard
          icon={AlertTriangle}
          label="Pending"
          value={money(s.pending ?? 0)}
          detail="Gateway confirmation"
          tone="red"
        />
        <StatCard
          icon={RotateCcw}
          label="Reversed"
          value={money(s.reversed ?? 0)}
          detail={`${money(s.refunded ?? 0)} refunded · ${s.failed ?? 0} failed`}
          tone="red"
        />
      </div>
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
            />
          </div>
        </Surface>
      </div>
      <Surface className="overflow-visible">
        <PageFilterTabs
          sectionLabel="Payment views"
          value={tab}
          onValueChange={(value) => setTab(value as LedgerTab)}
        >
          <PageTab value="all">All payments</PageTab>
          <PageTab value="pending">Pending</PageTab>
          <PageTab value="late">Late success</PageTab>
          <PageTab value="reversed">Reversed</PageTab>
        </PageFilterTabs>
        <PaginatedDataTable
          rows={rows}
          page={page}
          pageIndex={pager.pageIndex}
          onNext={() => pager.goNext(page.nextCursor)}
          onPrevious={pager.goPrevious}
          canPrevious={pager.canPrevious}
          columns={ledgerColumns}
        />
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
