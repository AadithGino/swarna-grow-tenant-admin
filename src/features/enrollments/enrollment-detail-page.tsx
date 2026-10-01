"use client";

import Link from "next/link";
import { useState } from "react";
import {
  CalendarClock,
  Download,
  Gift,
  IndianRupee,
  LockKeyhole,
  MessageCircleMore,
  ReceiptText,
  Scale,
  Send,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { toastApiError } from "@/src/lib/api-error";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { DataTable } from "@/src/components/common/data-table";
import {
  PageHeader,
  StatCard,
  Surface,
} from "@/src/components/common/page-parts";
import {
  PageTab,
  PageTabs,
  PageTabsBar,
  PageTabsPanel,
} from "@/src/components/common/page-tabs";
import { PageSkeleton, QueryError } from "@/src/components/common/query-state";
import { StatusBadge } from "@/src/components/common/status-badge";
import { EnrollmentRedemptionStatus } from "@/src/features/enrollments/enrollment-redemption-banner";
import { EnrollmentMaturityTab } from "@/src/features/enrollments/enrollment-maturity-tab";
import { EnrollmentSchedule } from "@/src/features/enrollments/scheme-schedule";
import {
  PrematureClosureDialog,
  SettlementPreviewDialog,
} from "@/src/features/enrollments/settlement-dialogs";
import { PaymentDialog } from "@/src/features/payments/payment-dialog";
import { EntityAuditTab } from "@/src/features/audit/entity-audit-tab";
import { goldLedgerColumns } from "@/src/components/common/gold-payment-columns";
import { downloadJson } from "@/src/lib/download";
import { grams, idempotencyKey, money } from "@/src/lib/format";
import { paymentHasGoldAccrual } from "@/src/lib/gold-payment-display";
import {
  cashSettlementBasisLabel,
  planShowsCashSettlementBasis,
  resolveCashSettlementBasis,
} from "@/src/lib/cash-settlement-basis";
import type { Payment } from "@/src/types/domain";
import {
  useCreatePaymentLinkMutation,
  useGetEnrollmentQuery,
  useGetPaymentsQuery,
  useGetSchemeLedgerQuery,
  useGetSettlementPreviewQuery,
  useLazyGetSchemePassbookQuery,
} from "@/src/store/api/admin-api";

export function EnrollmentDetailPage({ id }: { id: string }) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewType, setPreviewType] = useState<
    "MATURITY_REDEMPTION" | "PREMATURE_CLOSURE"
  >("MATURITY_REDEMPTION");
  const [closeOpen, setCloseOpen] = useState(false);
  const [createPaymentLink, createLinkState] = useCreatePaymentLinkMutation();
  const [fetchPassbook, passbookState] = useLazyGetSchemePassbookQuery();
  const query = useGetEnrollmentQuery(id);
  const paymentQuery = useGetPaymentsQuery(
    { schemeId: id, limit: 100 },
    { skip: !id },
  );
  const ledgerQuery = useGetSchemeLedgerQuery(id, { skip: !id });
  const enrollment = query.data;
  const redemptionInProgress = Boolean(enrollment?.pendingRedemption);
  const maturedForPreview =
    enrollment?.status === "MATURED" || redemptionInProgress;
  const maturityPreview = useGetSettlementPreviewQuery(
    {
      schemeId: id,
      type: "MATURITY_REDEMPTION",
      mode:
        enrollment?.allowedRedemptionModes?.[0] ??
        (enrollment?.valueBasis === "GOLD_WEIGHT" ? "GOLD_HANDOVER" : "CASH"),
    },
    {
      skip:
        !enrollment ||
        (!maturedForPreview && !enrollment.canRedeem),
    },
  );
  if (query.isLoading) return <PageSkeleton cards={5} />;
  if (query.isError || !query.data)
    return (
      <QueryError
        onRetry={query.refetch}
        title="Enrollment could not be loaded"
        error={query.error}
      />
    );
  const row = query.data;
  const payments: Payment[] = paymentQuery.data?.items ?? [];
  const ledgerRows = ledgerQuery.data ?? [];
  const ledgerSource = ledgerRows.length > 0;
  const showGoldLedger =
    row.valueBasis === "GOLD_WEIGHT" ||
    payments.some((p: import("@/src/types/domain").Payment) => paymentHasGoldAccrual(p)) ||
    ledgerRows.some((p) => paymentHasGoldAccrual(p));
  const displayMode = row.displayMode ?? "FIXED";
  const matured =
    row.status === "MATURED" || Boolean(row.pendingRedemption);
  const inProgress = Boolean(row.pendingRedemption);
  const closedOut =
    row.status === "REDEEMED" || row.status === "CLOSED_PREMATURE";
  const enrollmentCashBasisLabel =
    row.valueBasis === "GOLD_WEIGHT" &&
    planShowsCashSettlementBasis(row.valueBasis, row.allowedRedemptionModes)
      ? cashSettlementBasisLabel(
          resolveCashSettlementBasis({
            cashSettlementBasis: row.cashSettlementBasis,
          }),
        )
      : null;
  const canCloseEarly =
    !inProgress &&
    !closedOut &&
    (row.status === "ACTIVE" ||
      row.status === "LOCKED" ||
      row.status === "PENDING_PAYMENT");
  const settlementDisplayPaise =
    row.pendingRedemption?.settlementPaise ??
    row.completedRedemption?.settlementPaise;
  const percent =
    displayMode === "FLEXIBLE_FREE_WINDOW"
      ? Math.min(
          100,
          ((row.monthlyBreakdown?.filter((m) => m.paid > 0).length ?? 0) / 6) *
            100,
        )
      : displayMode === "FLEXIBLE_LOCK_WINDOW"
        ? Math.min(
            100,
            row.currentCycleCap
              ? ((row.confirmedThisCycle ?? 0) / row.currentCycleCap) * 100
              : 0,
          )
        : Math.min(100, (row.progress / Math.max(row.tenure, 1)) * 100);
  const patternCopy =
    displayMode === "FLEXIBLE_FREE_WINDOW"
      ? "Flexible window"
      : displayMode === "FLEXIBLE_LOCK_WINDOW"
        ? "Flexible · capped"
        : "Fixed date";

  async function handleSendPaymentLink() {
    try {
      const amountPaise = Math.round(Number(row.installment ?? 0) * 100);
      if (!amountPaise) {
        toast.error("No payable installment amount on this scheme");
        return;
      }
      const link = await createPaymentLink({
        schemeId: row.id,
        amountPaise,
        idempotencyKey: idempotencyKey(),
      }).unwrap();
      toast.success(`Payment link sent · expires ${link.expiresAt}`);
    } catch (err) {
      toastApiError(err, "Could not create payment link");
    }
  }

  async function handleDownloadPassbook() {
    try {
      const data = await fetchPassbook(row.id).unwrap();
      downloadJson(`${row.enrollmentNo}-passbook.json`, data);
      toast.success("Passbook downloaded");
    } catch (err) {
      toastApiError(err, "Could not download passbook");
    }
  }

  return (
    <>
      <SettlementPreviewDialog
        schemeId={row.id}
        type={previewType}
        mode={
          row.allowedRedemptionModes?.[0] ??
          (row.valueBasis === "GOLD_WEIGHT" ? "GOLD_HANDOVER" : "CASH")
        }
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        redemptionWizard={previewType === "MATURITY_REDEMPTION"}
      />
      <PrematureClosureDialog
        schemeId={row.id}
        open={closeOpen}
        onOpenChange={setCloseOpen}
      />
      <Link
        href="/enrollments"
        className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-[#730321]"
      >
        ← Back to enrollments
      </Link>
      {(inProgress || closedOut) && (
        <EnrollmentRedemptionStatus enrollment={row} />
      )}
      <PageHeader
        eyebrow="Enrollment record"
        title={row.plan}
        description={`${row.enrollmentNo} · ${row.customer} · ${row.branch}`}
        actions={
          <>
            {row.customerId ? (
              <Button variant="outline" asChild>
                <Link href={`/customers/${row.customerId}`}>
                  <UserRound />
                  View customer
                </Link>
              </Button>
            ) : null}
            <Button
              variant="outline"
              disabled={
                createLinkState.isLoading ||
                matured ||
                closedOut ||
                row.canRecordPayment === false
              }
              onClick={() => void handleSendPaymentLink()}
            >
              <Send />
              Send payment link
            </Button>
            {row.canRecordPayment !== false && !matured && !closedOut ? (
              <PaymentDialog
                schemeId={row.id}
                customer={row.customer}
                lockScheme
              />
            ) : (
              <Button disabled>
                <Gift />
                {closedOut
                  ? row.status === "REDEEMED"
                    ? "Redeemed"
                    : "Closed"
                  : inProgress
                    ? "Redemption pending"
                    : matured
                      ? "Ready to redeem"
                      : "Not payable"}
              </Button>
            )}
          </>
        }
      />
      {displayMode === "FLEXIBLE_LOCK_WINDOW" && (
        <div className="rounded-2xl border border-[#eadbb5] bg-[#fff8e8] px-5 py-4 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status="LOCKED" />
            <StatusBadge status="PARTIALLY_PAID" />
            <span className="font-semibold text-[#805817]">Capped phase</span>
          </div>
          <p className="mt-2 font-medium">{row.formulaLabel}</p>
          <p className="mt-1 text-muted-foreground">{row.explainerText}</p>
          <p className="mt-2 text-muted-foreground">
            {row.cycleLabel}: {money(row.confirmedThisCycle ?? 0)} of{" "}
            {money(row.currentCycleCap ?? 0)} this cycle ·{" "}
            {money(row.remainingThisCycle ?? 0)} remaining
          </p>
        </div>
      )}
      {displayMode === "FLEXIBLE_FREE_WINDOW" && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status="ACTIVE" />
            <span className="font-semibold text-emerald-800">Flexible window</span>
          </div>
          <p className="mt-2 text-muted-foreground">{row.helperText}</p>
          <p className="mt-1 text-muted-foreground">
            Lock date {row.lockDate} · projected cap{" "}
            {money(row.projectedMonthly ?? 0)}
          </p>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          icon={IndianRupee}
          label="Total paid"
          value={money(row.paid)}
          detail={
            displayMode === "FIXED"
              ? `${row.progress} successful installments`
              : displayMode === "FLEXIBLE_LOCK_WINDOW"
                ? `${row.progress} capped cycles complete`
                : `${row.monthlyBreakdown?.reduce((s, m) => s + m.paymentCount, 0) ?? 0} payments in the free window`
          }
        />
        <StatCard
          icon={CalendarClock}
          label="Progress"
          value={
            displayMode === "FLEXIBLE_LOCK_WINDOW"
              ? `${row.progress} / ${row.tenure} cycles`
              : displayMode === "FLEXIBLE_FREE_WINDOW"
                ? `${row.monthlyBreakdown?.filter((m) => m.paid > 0).length ?? 0} / 6`
                : `${row.progress} / ${row.tenure}`
          }
          detail={`${Math.round(percent)}% completed`}
          tone="gold"
        />
        <StatCard
          icon={IndianRupee}
          label={
            closedOut
              ? "Final settlement"
              : inProgress
                ? "Redemption"
                : matured
                  ? "Redemption"
                  : "Next payable"
          }
          value={
            closedOut || inProgress
              ? settlementDisplayPaise != null
                ? money(settlementDisplayPaise / 100)
                : closedOut
                  ? "Closed"
                  : "Pending"
              : matured
                ? "Matured"
                : displayMode === "FLEXIBLE_FREE_WINDOW"
                  ? "Any amount"
                  : money(row.payableSuggested ?? row.installment)
          }
          detail={
            closedOut
              ? row.status.replaceAll("_", " ")
              : inProgress
                ? row.pendingRedemption?.status?.replaceAll("_", " ") ??
                  "In progress"
                : row.nextDue
          }
          tone={closedOut ? "green" : inProgress ? "gold" : matured ? "cream" : "red"}
        />
        <StatCard
          icon={Gift}
          label="Maturity"
          value={row.maturity.split(" ").slice(0, 2).join(" ")}
          detail={
            closedOut
              ? "Enrollment closed"
              : matured || inProgress
                ? "Term complete"
                : "Projected term end"
          }
          tone="cream"
        />
        <StatCard
          icon={row.valueBasis === "GOLD_WEIGHT" ? Scale : LockKeyhole}
          label={
            row.valueBasis === "GOLD_WEIGHT"
              ? "Gold accumulated"
              : "Payment pattern"
          }
          value={
            row.valueBasis === "GOLD_WEIGHT"
              ? grams(row.accumulatedGold ?? 0)
              : patternCopy
          }
          detail={
            enrollmentCashBasisLabel
              ? `Cash payout: ${enrollmentCashBasisLabel} (snapshot)`
              : row.valueBasis.replaceAll("_", " ")
          }
          tone="green"
        />
      </div>
      <Surface>
        <div className="grid gap-6 p-5 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-bold">
                  {displayMode === "FLEXIBLE_LOCK_WINDOW"
                    ? "Capped cycle progress"
                    : displayMode === "FLEXIBLE_FREE_WINDOW"
                      ? "Flexible window progress"
                      : "Scheme progress"}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {displayMode === "FLEXIBLE_FREE_WINDOW"
                    ? `${money(row.paid)} paid in the free window`
                    : displayMode === "FLEXIBLE_LOCK_WINDOW"
                      ? `${money(row.confirmedThisCycle ?? 0)} of ${money(row.currentCycleCap ?? 0)} this cycle`
                      : `${money(row.paid)} paid of projected ${money(row.installment * row.tenure)}`}
                </p>
              </div>
              <StatusBadge status={row.status} />
            </div>
            <Progress value={percent} className="mt-4 h-3" />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              disabled={passbookState.isFetching}
              onClick={() => void handleDownloadPassbook()}
            >
              <Download />
              Passbook
            </Button>
            <Button
              variant="outline"
              disabled={closedOut}
              onClick={() => {
                setPreviewType(
                  matured || inProgress
                    ? "MATURITY_REDEMPTION"
                    : "PREMATURE_CLOSURE",
                );
                setPreviewOpen(true);
              }}
            >
              Settlement preview
            </Button>
            {canCloseEarly ? (
              <Button
                variant="outline"
                className="border-red-200 text-red-700 hover:bg-red-50"
                onClick={() => setCloseOpen(true)}
              >
                Close prematurely
              </Button>
            ) : null}
          </div>
        </div>
      </Surface>
      <PageTabs defaultValue="schedule">
        <PageTabsBar sectionLabel="Enrollment views">
          <PageTab value="schedule">
            <CalendarClock />
            Schedule
          </PageTab>
          <PageTab value="payments">
            <ReceiptText />
            Payment ledger
          </PageTab>
          <PageTab value="maturity">
            <Gift />
            Maturity
          </PageTab>
          <PageTab value="timeline">
            <MessageCircleMore />
            Timeline
          </PageTab>
        </PageTabsBar>
        <PageTabsPanel value="schedule">
          <EnrollmentSchedule enrollment={row} />
        </PageTabsPanel>
        <PageTabsPanel value="payments">
          <Surface
            title="Immutable payment ledger"
            description={
              ledgerSource
                ? "Ledger entries are the source of truth; gold weight and rate are stored on each credit."
                : "Every balance and receipt traces back to these payment records"
            }
          >
            {ledgerSource ? (
              <DataTable
                rows={ledgerRows}
                emptyTitle="No ledger entries for this enrollment"
                columns={[
                  { key: "seq", header: "#", render: (r) => r.sequence ?? "—" },
                  { key: "date", header: "Recorded at", render: (r) => r.date },
                  {
                    key: "type",
                    header: "Entry",
                    render: (r) =>
                      String(r.type ?? "—")
                        .replaceAll("_", " ")
                        .toLowerCase(),
                  },
                  {
                    key: "receipt",
                    header: "Receipt",
                    render: (r) =>
                      r.receiptNo && r.receiptNo !== "—" ? (
                        <strong>{r.receiptNo}</strong>
                      ) : (
                        "—"
                      ),
                  },
                  {
                    key: "amount",
                    header: "Amount",
                    render: (r) => money(r.amount),
                  },
                  ...(showGoldLedger ? goldLedgerColumns<(typeof ledgerRows)[number]>() : []),
                  {
                    key: "mode",
                    header: "Mode",
                    render: (r) => (r.mode ? r.mode.replaceAll("_", " ") : "—"),
                  },
                ]}
              />
            ) : (
              <DataTable
                rows={payments}
                emptyTitle="No payments recorded for this enrollment"
                columns={[
                  { key: "date", header: "Recorded at", render: (r) => r.date },
                  {
                    key: "receipt",
                    header: "Receipt",
                    render: (r) => <strong>{r.receiptNo}</strong>,
                  },
                  {
                    key: "amount",
                    header: "Amount",
                    render: (r) => money(r.amount),
                  },
                  ...(showGoldLedger ? goldLedgerColumns<(typeof payments)[number]>() : []),
                  {
                    key: "mode",
                    header: "Mode",
                    render: (r) => r.mode.replaceAll("_", " "),
                  },
                  { key: "staff", header: "Recorded by", render: (r) => r.staff },
                  {
                    key: "source",
                    header: "Source",
                    render: (r) => r.source.replaceAll("_", " "),
                  },
                  {
                    key: "status",
                    header: "Status",
                    render: (r) => <StatusBadge status={r.status} />,
                  },
                ]}
              />
            )}
          </Surface>
        </PageTabsPanel>
        <PageTabsPanel value="maturity">
          <EnrollmentMaturityTab
            enrollment={row}
            maturityPreview={maturityPreview.data}
            onMaturityPreview={() => {
              setPreviewType("MATURITY_REDEMPTION");
              setPreviewOpen(true);
            }}
            onPrematurePreview={() => {
              setPreviewType("PREMATURE_CLOSURE");
              setPreviewOpen(true);
            }}
            onRedeem={() => {
              setPreviewType("MATURITY_REDEMPTION");
              setPreviewOpen(true);
            }}
            onCloseEarly={() => setCloseOpen(true)}
          />
        </PageTabsPanel>
        <PageTabsPanel value="timeline">
          <EntityAuditTab entityType="scheme" entityId={row.id} />
        </PageTabsPanel>
      </PageTabs>
    </>
  );
}
