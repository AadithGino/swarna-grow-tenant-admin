"use client";

import type { ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { DataTable } from "@/src/components/common/data-table";
import { Surface } from "@/src/components/common/page-parts";
import { PageSubTabsList, PageTab } from "@/src/components/common/page-tabs";
import { StatusBadge } from "@/src/components/common/status-badge";
import { PaymentDialog } from "@/src/features/payments/payment-dialog";
import { downloadBlobUrl, downloadText } from "@/src/lib/download";
import { goldLedgerColumns } from "@/src/components/common/gold-payment-columns";
import { money } from "@/src/lib/format";
import { paymentHasGoldAccrual } from "@/src/lib/gold-payment-display";
import { useLazyGetPaymentReceiptQuery } from "@/src/store/api/admin-api";
import type { Enrollment, ScheduleRow } from "@/src/types/domain";

function ScheduleActions({
  row,
  enrollment,
}: {
  row: ScheduleRow;
  enrollment: Enrollment;
}) {
  const [fetchReceipt] = useLazyGetPaymentReceiptQuery();

  if (row.status === "PAID") {
    return (
      <Button
        size="sm"
        variant="outline"
        onClick={async () => {
          const paymentId = row.paymentId;
          if (!paymentId) {
            toast.error("No payment linked to this installment");
            return;
          }
          try {
            const result = await fetchReceipt(paymentId).unwrap();
            const name = row.receipt ?? paymentId;
            if (result.kind === "blob") {
              const ext = result.contentType.includes("pdf") ? "pdf" : "bin";
              downloadBlobUrl(`${name}.${ext}`, result.blobUrl);
            } else {
              downloadText(
                `${name}.json`,
                JSON.stringify(result.payload, null, 2),
                "application/json;charset=utf-8",
              );
            }
          } catch {
            toast.error("Could not download receipt");
          }
        }}
      >
        Receipt
      </Button>
    );
  }
  if (
    (row.status === "DUE" || row.status === "PARTIALLY_PAID") &&
    enrollment.canRecordPayment
  ) {
    return (
      <PaymentDialog
        schemeId={enrollment.id}
        lockScheme
        trigger={<Button size="sm">Collect</Button>}
      />
    );
  }
  if (enrollment.status === "MATURED") {
    return <span className="text-xs text-muted-foreground">Matured</span>;
  }
  return <span className="text-xs text-muted-foreground">Not payable yet</span>;
}

function SchedulePanelHeader({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 border-b border-[#eaded9] px-5 py-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#9a6f2a]">
          {eyebrow}
        </p>
        <h2 className="mt-1 font-bold text-[#2d191d]">{title}</h2>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {children}
    </div>
  );
}

export function EnrollmentSchedule({ enrollment }: { enrollment: Enrollment }) {
  const rows = enrollment.schedule ?? [];
  const showGoldSchedule =
    enrollment.valueBasis === "GOLD_WEIGHT" ||
    rows.some((r) => paymentHasGoldAccrual(r));
  const mode = enrollment.displayMode ?? "FIXED";
  const matured =
    enrollment.status === "MATURED" ||
    enrollment.status === "REDEMPTION_PENDING";

  if (matured) {
    return (
      <Surface
        title="Matured schedule"
        description="Every cycle is complete. This account is ready for redemption, not collection."
      >
        <div className="border-b bg-[#f6f0ff] px-5 py-4 text-sm">
          Term ended on {enrollment.maturity}. Total paid{" "}
          {money(enrollment.paid)}.
        </div>
        <DataTable
          rows={rows}
          columns={[
            { key: "label", header: "Cycle", render: (r) => r.label },
            { key: "due", header: "Due", render: (r) => r.due },
            { key: "amount", header: "Amount", render: (r) => money(r.amount) },
            {
              key: "status",
              header: "Status",
              render: () => <StatusBadge status="PAID" />,
            },
            {
              key: "receipt",
              header: "Receipt",
              render: (r) => r.receipt ?? "—",
            },
            ...(showGoldSchedule ? goldLedgerColumns<ScheduleRow>() : []),
          ]}
        />
      </Surface>
    );
  }

  if (mode === "FLEXIBLE_FREE_WINDOW") {
    const elapsed =
      enrollment.monthlyBreakdown?.filter((m) => m.paid > 0).length ?? 0;
    return (
      <Surface className="overflow-visible">
        <Tabs defaultValue="overview">
          <SchedulePanelHeader
            eyebrow="Schedule detail"
            title="Flexible window"
            description="Pay any amount until the lock date — then the capped phase begins."
          >
            <PageSubTabsList>
              <PageTab value="overview">Overview</PageTab>
              <PageTab value="months">By month</PageTab>
            </PageSubTabsList>
          </SchedulePanelHeader>
          <TabsContent value="overview" className="space-y-4 p-5">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <strong>Pay any amount until {enrollment.lockDate}</strong>
              <p className="mt-1 text-sm text-muted-foreground">
                {enrollment.daysToLock} days to lock · no due date in this
                phase.
              </p>
            </div>
            <div>
              <div className="mb-2 flex justify-between text-sm">
                <span>Month {elapsed} of 6</span>
                <span>{money(enrollment.paid)} paid so far</span>
              </div>
              <Progress value={(elapsed / 6) * 100} className="h-3" />
            </div>
            <div className="rounded-xl border bg-[#fff8e8] p-4 text-sm">
              <div className="text-xs font-bold uppercase tracking-[0.14em] text-[#9a6f2a]">
                Projected monthly cap
              </div>
              <strong className="mt-1 block text-xl">
                {money(enrollment.projectedMonthly ?? 0)}
              </strong>
              <p className="mt-1 text-muted-foreground">
                {enrollment.formulaLabel}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {enrollment.explainerText}
              </p>
            </div>
          </TabsContent>
          <TabsContent value="months" className="p-0">
            <p className="border-b border-[#eaded9] px-5 py-3 text-sm text-muted-foreground">
              Free-window rows are payments, not fixed installments.
            </p>
            <DataTable
              rows={
                enrollment.monthlyBreakdown?.map((item, index) => ({
                  id: `${enrollment.id}_${index}`,
                  cycle: index + 1,
                  label: item.month,
                  due: item.month,
                  amount: item.paid,
                  paid: item.paid,
                  paymentCount: item.paymentCount,
                  status: item.status,
                })) ?? []
              }
              columns={[
                { key: "label", header: "Month", render: (r) => r.label },
                {
                  key: "paid",
                  header: "Paid",
                  render: (r) => money(r.paid ?? 0),
                },
                {
                  key: "count",
                  header: "Payments",
                  render: (r) => r.paymentCount ?? 0,
                },
                {
                  key: "status",
                  header: "Status",
                  render: (r) => <StatusBadge status={r.status} />,
                },
                {
                  key: "action",
                  header: "",
                  render: (r) => (
                    <ScheduleActions row={r} enrollment={enrollment} />
                  ),
                },
              ]}
            />
          </TabsContent>
        </Tabs>
      </Surface>
    );
  }

  if (mode === "FLEXIBLE_LOCK_WINDOW") {
    const cap = enrollment.currentCycleCap ?? 0;
    const confirmed = enrollment.confirmedThisCycle ?? 0;
    return (
      <Surface className="overflow-visible">
        <Tabs defaultValue="current">
          <SchedulePanelHeader
            eyebrow="Schedule detail"
            title="Capped phase"
            description="Each cycle has its own allowance. Unused remainder does not carry forward."
          >
            <PageSubTabsList>
              <PageTab value="current">Current cycle</PageTab>
              <PageTab value="cycles">All cycles</PageTab>
            </PageSubTabsList>
          </SchedulePanelHeader>
          <TabsContent value="current" className="space-y-4 p-5">
            <div className="rounded-xl border border-[#eadbb5] bg-[#fff8e8] p-4">
              <strong>{enrollment.formulaLabel}</strong>
              <p className="mt-1 text-sm text-muted-foreground">
                {enrollment.explainerText}
              </p>
            </div>
            <div>
              <div className="mb-2 flex justify-between text-sm">
                <span>{enrollment.cycleLabel} · cycle remainder</span>
                <span>
                  {money(confirmed)} of {money(cap)}
                </span>
              </div>
              <Progress
                value={cap ? (confirmed / cap) * 100 : 0}
                className="h-3"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border p-3 text-sm">
                <div className="text-muted-foreground">Cycle cap</div>
                <strong>{money(cap)}</strong>
              </div>
              <div className="rounded-xl border p-3 text-sm">
                <div className="text-muted-foreground">Confirmed</div>
                <strong>{money(confirmed)}</strong>
              </div>
              <div className="rounded-xl border p-3 text-sm">
                <div className="text-muted-foreground">Remaining</div>
                <strong>{money(enrollment.remainingThisCycle ?? 0)}</strong>
              </div>
            </div>
            {(enrollment.cyclePayments ?? []).length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-semibold">
                  Payments this cycle
                </h3>
                <div className="space-y-2">
                  {enrollment.cyclePayments?.map((payment) => (
                    <div
                      key={payment.receiptNo}
                      className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
                    >
                      <span>
                        {payment.receiptNo} · {payment.mode} · {payment.paidAt}
                      </span>
                      <strong>{money(payment.amount)}</strong>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>
          <TabsContent value="cycles" className="p-0">
            <DataTable
              rows={rows}
              columns={[
                { key: "label", header: "Cycle", render: (r) => r.label },
                {
                  key: "cap",
                  header: "Cap",
                  render: (r) => money(r.amount),
                },
                {
                  key: "paid",
                  header: "Paid",
                  render: (r) => money(r.paid ?? 0),
                },
                {
                  key: "remaining",
                  header: "Remaining",
                  render: (r) => money(r.remaining ?? 0),
                },
                {
                  key: "status",
                  header: "Status",
                  render: (r) => <StatusBadge status={r.status} />,
                },
                {
                  key: "note",
                  header: "Note",
                  render: (r) => r.note ?? "—",
                },
                {
                  key: "action",
                  header: "",
                  render: (r) => (
                    <ScheduleActions row={r} enrollment={enrollment} />
                  ),
                },
              ]}
            />
          </TabsContent>
        </Tabs>
      </Surface>
    );
  }

  return (
    <Surface
      title="Installment schedule"
      description="Oldest pending installment is allocated first. Advance payments cover later cycles."
    >
      <DataTable
        rows={rows}
        columns={[
          { key: "label", header: "Installment", render: (r) => r.label },
          { key: "due", header: "Due date", render: (r) => r.due },
          { key: "amount", header: "Expected", render: (r) => money(r.amount) },
          {
            key: "status",
            header: "Status",
            render: (r) => <StatusBadge status={r.status} />,
          },
          {
            key: "receipt",
            header: "Receipt",
            render: (r) => r.receipt ?? "—",
          },
          ...(showGoldSchedule ? goldLedgerColumns<ScheduleRow>() : []),
          {
            key: "action",
            header: "",
            render: (r) => <ScheduleActions row={r} enrollment={enrollment} />,
          },
        ]}
      />
    </Surface>
  );
}
