"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Banknote,
  Check,
  ChevronRight,
  ClipboardList,
  Download,
  Gift,
  Loader2,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { PageSkeleton, QueryError } from "@/src/components/common/query-state";
import { FieldLabel } from "@/src/components/common/page-parts";
import { StatusBadge } from "@/src/components/common/status-badge";
import { SettlementLinesPanel } from "@/src/features/enrollments/settlement-lines-panel";
import { apiErrorMessage, toastApiError } from "@/src/lib/api-error";
import { downloadText } from "@/src/lib/download";
import { money } from "@/src/lib/format";
import { cn } from "@/lib/utils";
import type { RedemptionDetailView } from "@/src/store/api/contract-adapters";
import {
  useApproveRedemptionMutation,
  useCompleteRedemptionMutation,
  useGetEntityAuditQuery,
  useGetRedemptionQuery,
  useLazyGetRedemptionReceiptQuery,
  useRejectRedemptionMutation,
} from "@/src/store/api/admin-api";

const WORKFLOW_STEPS = [
  { key: "submitted", label: "Submitted" },
  { key: "approved", label: "Approved" },
  { key: "handover", label: "Handover" },
] as const;

/** 0–2 = active step; 3 = all complete */
function workflowPhase(status: string): number {
  if (status === "REJECTED") return -1;
  if (status === "COMPLETED") return 3;
  if (status === "APPROVED") return 2;
  return 1;
}

function WorkflowStepper({ status }: { status: string }) {
  const phase = workflowPhase(status);
  const rejected = status === "REJECTED";

  if (rejected) {
    return (
      <div className="border-b border-red-100 bg-red-50 px-6 py-3 text-center text-sm font-medium text-red-800">
        Request rejected — no further steps
      </div>
    );
  }

  return (
    <div className="border-b border-[#eaded9] bg-[#faf7f5] px-6 py-4">
      <ol className="flex items-center gap-0">
        {WORKFLOW_STEPS.map((step, i) => {
          const done = phase === 3 || phase > i;
          const current = phase === i && phase < 3;
          return (
            <li key={step.key} className="flex min-w-0 flex-1 items-center">
              <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
                <span
                  className={cn(
                    "grid size-8 place-items-center rounded-full border-2 text-xs font-bold transition-colors",
                    done &&
                      "border-emerald-600 bg-emerald-600 text-white",
                    current &&
                      "border-[#730321] bg-[#730321] text-white shadow-[0_0_0_4px_rgb(115_3_33/12%)]",
                    !done &&
                      !current &&
                      "border-[#e4d7d2] bg-white text-[#9a8a8e]",
                  )}
                >
                  {done ? <Check className="size-4" /> : i + 1}
                </span>
                <span
                  className={cn(
                    "max-w-full truncate text-center text-[11px] font-semibold uppercase tracking-wide",
                    current || (phase === 3 && i === 2)
                      ? "text-[#730321]"
                      : "text-[#776a6d]",
                  )}
                >
                  {step.label}
                </span>
              </div>
              {i < WORKFLOW_STEPS.length - 1 ? (
                <div
                  className={cn(
                    "mx-1 mb-5 h-0.5 min-w-[1rem] flex-1 rounded-full",
                    phase === 3 || phase > i
                      ? "bg-emerald-500"
                      : "bg-[#e8dde2]",
                  )}
                  aria-hidden
                />
              ) : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function EntityLinkCard({
  href,
  icon: Icon,
  eyebrow,
  title,
  detail,
}: {
  href: string;
  icon: typeof UserRound;
  eyebrow: string;
  title: string;
  detail?: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-xl border border-[#e4d7d2] bg-white p-4 shadow-[0_1px_3px_rgb(67_15_25/4%)] transition hover:border-[#730321]/25 hover:shadow-md"
    >
      <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#f7ecee] text-[#730321] transition group-hover:bg-[#730321] group-hover:text-white">
        <Icon className="size-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#9a6f2a]">
          {eyebrow}
        </p>
        <p className="truncate font-bold text-[#241316]">{title}</p>
        {detail ? (
          <p className="truncate text-sm text-[#776a6d]">{detail}</p>
        ) : null}
      </div>
      <ChevronRight className="size-5 shrink-0 text-[#c59a9f] transition group-hover:translate-x-0.5 group-hover:text-[#730321]" />
    </Link>
  );
}

function DetailBlock({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-2xl border border-[#e4d7d2] bg-white shadow-[0_2px_5px_rgb(67_15_25/3%)]",
        className,
      )}
    >
      <div className="border-b border-[#eaded9] bg-[#faf7f5] px-4 py-3">
        <h3 className="text-sm font-bold text-[#2d191d]">{title}</h3>
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

function RedemptionDetailBody({
  d,
  rejectReason,
  setRejectReason,
  completeRemarks,
  setCompleteRemarks,
  showRejectForm,
  setShowRejectForm,
  busy,
  onApprove,
  onReject,
  onCompleteClick,
}: {
  d: RedemptionDetailView;
  rejectReason: string;
  setRejectReason: (v: string) => void;
  completeRemarks: string;
  setCompleteRemarks: (v: string) => void;
  showRejectForm: boolean;
  setShowRejectForm: (v: boolean) => void;
  busy: boolean;
  onApprove: () => void;
  onReject: () => void;
  onCompleteClick: () => void;
}) {
  const [fetchReceipt, receiptState] = useLazyGetRedemptionReceiptQuery();
  const settlementPreview = {
    ...d.settlementPreview,
    scheme: undefined,
    customer: undefined,
  };
  const pending =
    d.status === "REQUESTED" || d.status === "PENDING_APPROVAL";
  const approved = d.status === "APPROVED";
  const terminal = d.status === "COMPLETED" || d.status === "REJECTED";

  return (
    <>
      <div className="border-b border-[#eaded9] bg-gradient-to-br from-[#fdf8f5] via-[#f9f0f2] to-[#fffbf7] px-6 pb-5 pt-6 pr-14">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#9a6f2a]">
          Redemption request
        </p>
        <SheetTitle className="mt-1 text-2xl font-extrabold tracking-tight text-[#241316]">
          {d.closureTypeLabel}
        </SheetTitle>
        <SheetDescription className="sr-only">
          {d.customer.name} · {d.scheme.enrollmentNumber}
        </SheetDescription>

        <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#776a6d]">
              Settlement amount
            </p>
            <p className="text-[2rem] font-extrabold leading-none tabular-nums tracking-tight text-[#730321]">
              {money(d.settlementPreview.finalValue)}
            </p>
            {d.settlementPreview.finalWeightDisplay ? (
              <p className="mt-1 text-sm font-medium text-[#776a6d]">
                {d.settlementPreview.finalWeightDisplay}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <StatusBadge status={d.status} />
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#eaded9] bg-white/80 px-3 py-1 text-xs font-semibold text-[#4f3d41]">
              <Banknote className="size-3.5 text-[#9a6f2a]" />
              {d.modeLabel}
            </span>
          </div>
        </div>

        <p className="mt-3 font-mono text-[11px] text-[#9a8a8e]">
          {d.redemptionNumber}
          {d.branchName ? ` · ${d.branchName}` : ""}
        </p>
      </div>

      <WorkflowStepper status={d.status} />

      <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
        <div className="grid gap-3 sm:grid-cols-2">
          {d.customer.id ? (
            <EntityLinkCard
              href={`/customers/${d.customer.id}`}
              icon={UserRound}
              eyebrow="Customer"
              title={d.customer.name}
              detail={
                [d.customer.customerNo, d.customer.mobile]
                  .filter(Boolean)
                  .join(" · ") || undefined
              }
            />
          ) : null}
          {d.scheme.id ? (
            <EntityLinkCard
              href={`/enrollments/${d.scheme.id}`}
              icon={ClipboardList}
              eyebrow="Enrollment"
              title={d.scheme.enrollmentNumber}
              detail={
                [d.scheme.planName, d.scheme.status]
                  .filter(Boolean)
                  .join(" · ") || undefined
              }
            />
          ) : null}
        </div>

        <RequestTimeline d={d} />
        <RedemptionAuditTrail redemptionId={d.id} refreshKey={d.version} />

        <DetailBlock title="Settlement breakdown">
          <SettlementLinesPanel preview={settlementPreview} compact />
        </DetailBlock>

        {d.fulfilment && d.status === "COMPLETED" ? (
          <DetailBlock title="Recorded handover">
            {d.fulfilment.goldWeightG != null ? (
              <div className="space-y-2 text-sm">
                <p>
                  <strong>{d.fulfilment.goldWeightG.toFixed(3)} g</strong> gold
                  handed over
                </p>
                {d.fulfilment.handoverValue != null ? (
                  <p className="text-muted-foreground">
                    Reference value at handover:{" "}
                    <strong>{money(d.fulfilment.handoverValue)}</strong>
                    {d.fulfilment.handoverRatePerGram != null &&
                    d.fulfilment.handoverRateDate ? (
                      <>
                        {" "}
                        (₹{d.fulfilment.handoverRatePerGram.toLocaleString("en-IN")}
                        /g on {d.fulfilment.handoverRateDate})
                      </>
                    ) : null}
                  </p>
                ) : null}
                <p className="text-xs text-muted-foreground">
                  No cash payout — fulfilment is metal out of inventory.
                </p>
              </div>
            ) : (
              <p className="text-sm">
                Cash paid out:{" "}
                <strong>{money(d.fulfilment.cashOut)}</strong>
                {d.mode === "CASH" ? (
                  <span className="mt-1 block text-xs text-muted-foreground">
                    Gold-weight schemes closed against this cash settlement.
                  </span>
                ) : null}
              </p>
            )}
          </DetailBlock>
        ) : null}

        {pending && showRejectForm ? (
          <DetailBlock title="Reject request">
            <FieldLabel>Reason (required)</FieldLabel>
            <Textarea
              placeholder="Explain why this request cannot be approved"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              className="resize-none border-[#e4d7d2] bg-[#faf7f5]"
            />
            <div className="mt-3 flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowRejectForm(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                variant="destructive"
                disabled={busy || !rejectReason.trim()}
                onClick={onReject}
              >
                Confirm reject
              </Button>
            </div>
          </DetailBlock>
        ) : null}

        {approved ? (
          <DetailBlock title="Handover notes">
            <FieldLabel>Optional remarks for audit trail</FieldLabel>
            <Textarea
              placeholder="e.g. Cash paid at counter · Gold weighed and handed over"
              value={completeRemarks}
              onChange={(e) => setCompleteRemarks(e.target.value)}
              rows={3}
              className="resize-none border-[#e4d7d2] bg-[#faf7f5]"
            />
          </DetailBlock>
        ) : null}

        {d.status === "COMPLETED" ? (
          <div className="space-y-3 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 text-sm text-emerald-900">
            <div className="flex items-start gap-3">
              <Gift className="mt-0.5 size-5 shrink-0 text-emerald-700" />
              <p>
                Handover is recorded and the enrollment is closed. Download the
                settlement receipt or open the enrollment for ledger entries.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="border-emerald-300 bg-white"
              disabled={receiptState.isFetching}
              onClick={async () => {
                try {
                  const payload = await fetchReceipt(d.id).unwrap();
                  if (!payload) {
                    toast.error("Receipt not available");
                    return;
                  }
                  downloadText(
                    `${d.redemptionNumber}-receipt.json`,
                    JSON.stringify(payload, null, 2),
                    "application/json;charset=utf-8",
                  );
                  toast.success("Receipt downloaded");
                } catch {
                  toast.error("Could not download receipt");
                }
              }}
            >
              {receiptState.isFetching ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Download />
              )}
              Download receipt
            </Button>
          </div>
        ) : null}
      </div>

      {!terminal ? (
        <div className="shrink-0 border-t border-[#eaded9] bg-white/95 px-6 py-4 shadow-[0_-8px_24px_rgb(67_15_25/6%)] backdrop-blur-sm">
          {pending ? (
            <div className="space-y-3">
              <Button
                className="h-11 w-full text-base font-semibold"
                disabled={busy}
                onClick={onApprove}
              >
                {busy ? <Loader2 className="animate-spin" /> : null}
                Approve redemption
              </Button>
              {!showRejectForm ? (
                <button
                  type="button"
                  className="w-full text-center text-sm font-medium text-red-700 underline-offset-2 hover:underline"
                  onClick={() => setShowRejectForm(true)}
                >
                  Reject this request instead
                </button>
              ) : null}
            </div>
          ) : null}
          {approved ? (
            <Button
              className="h-11 w-full text-base font-semibold"
              disabled={busy}
              onClick={onCompleteClick}
            >
              Complete handover
            </Button>
          ) : null}
        </div>
      ) : null}
    </>
  );
}

type TimelineStepState = "done" | "current" | "upcoming" | "danger";

type TimelineStep = {
  id: string;
  title: string;
  description?: string;
  time?: string;
  state: TimelineStepState;
};

function buildTimelineSteps(d: RedemptionDetailView): TimelineStep[] {
  const pending =
    d.status === "REQUESTED" || d.status === "PENDING_APPROVAL";
  const approved = d.status === "APPROVED";
  const completed = d.status === "COMPLETED";
  const rejected = d.status === "REJECTED";

  const steps: TimelineStep[] = [
    {
      id: "submitted",
      title: "Request submitted",
      time: d.requestedAt,
      state: "done",
    },
  ];

  if (rejected) {
    steps.push({
      id: "approval",
      title: "Approval declined",
      description: d.rejectionReason ?? "This request was rejected.",
      state: "danger",
    });
    return steps;
  }

  if (pending) {
    steps.push({
      id: "approval",
      title: "Manager approval",
      description: "Review settlement below, then approve or reject.",
      state: "current",
    });
    steps.push({
      id: "handover",
      title: "Customer handover",
      description: `Complete ${d.modeLabel.toLowerCase()} after approval.`,
      state: "upcoming",
    });
    return steps;
  }

  steps.push({
    id: "approval",
    title: "Approved",
    time: d.approvedAt,
    description: d.approvedAt ? undefined : "Ready for handover",
    state: "done",
  });

  if (completed) {
    steps.push({
      id: "handover",
      title: "Handover completed",
      time: d.completedAt,
      state: "done",
    });
  } else if (approved) {
    steps.push({
      id: "handover",
      title: "Handover pending",
      description: `Confirm ${d.modeLabel.toLowerCase()} with the customer, then complete below.`,
      state: "current",
    });
  }

  return steps;
}

function TimelineNode({ state }: { state: TimelineStepState }) {
  if (state === "done") {
    return (
      <span className="grid size-8 place-items-center rounded-full bg-emerald-600 text-white shadow-sm ring-4 ring-emerald-600/15">
        <Check className="size-4 stroke-[2.5]" />
      </span>
    );
  }
  if (state === "current") {
    return (
      <span className="grid size-8 place-items-center rounded-full border-2 border-[#730321] bg-white shadow-sm ring-4 ring-[#730321]/12">
        <span className="size-2.5 rounded-full bg-[#730321]" />
      </span>
    );
  }
  if (state === "danger") {
    return (
      <span className="grid size-8 place-items-center rounded-full border-2 border-red-400 bg-red-50 text-red-600 ring-4 ring-red-500/10">
        <span className="text-sm font-bold">!</span>
      </span>
    );
  }
  return (
    <span className="grid size-8 place-items-center rounded-full border-2 border-dashed border-[#d4c4c8] bg-[#faf7f5]">
      <span className="size-2 rounded-full bg-[#d4c4c8]" />
    </span>
  );
}

function connectorTone(state: TimelineStepState) {
  if (state === "done") return "bg-emerald-300";
  if (state === "danger") return "bg-red-200";
  return "bg-[#e4d7d2]";
}

function RedemptionAuditTrail({
  redemptionId,
  refreshKey,
}: {
  redemptionId: string;
  refreshKey?: number;
}) {
  const auditQuery = useGetEntityAuditQuery({
    entityType: "redemption",
    entityId: redemptionId,
    limit: 25,
  });
  useEffect(() => {
    void auditQuery.refetch();
  }, [refreshKey, redemptionId]);
  const rows = auditQuery.data?.items ?? [];

  return (
    <DetailBlock title="Audit trail">
      {auditQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading audit events…</p>
      ) : auditQuery.isError ? (
        <p className="text-sm text-red-800">
          Could not load audit trail for this redemption.
        </p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No audit entries recorded yet.
        </p>
      ) : (
        <ul className="m-0 list-none space-y-3 p-0">
          {rows.map((row) => (
            <li
              key={row.id}
              className="rounded-xl border border-[#eaded9] bg-[#faf7f5] px-3 py-2.5"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-sm font-semibold text-[#241316]">
                  {row.action.replaceAll("_", " ")}
                </span>
                <time className="text-xs tabular-nums text-[#776a6d]">
                  {row.at}
                </time>
              </div>
              <p className="mt-0.5 text-xs text-[#776a6d]">
                {row.actor}
                {row.summary && row.summary !== row.action
                  ? ` · ${row.summary}`
                  : ""}
              </p>
              {row.changes?.length ? (
                <ul className="mt-2 space-y-1 border-t border-[#eaded9] pt-2 text-xs text-[#4f3d41]">
                  {row.changes.map((c, i) => (
                    <li key={i}>
                      <strong>{c.field}</strong>: {c.from || "—"} → {c.to || "—"}
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </DetailBlock>
  );
}

function RequestTimeline({ d }: { d: RedemptionDetailView }) {
  const steps = buildTimelineSteps(d);

  return (
    <DetailBlock title="Request timeline">
      <ol className="relative m-0 list-none p-0">
        {steps.map((step, index) => {
          const isLast = index === steps.length - 1;
          return (
            <li
              key={step.id}
              className={cn("relative pl-11", !isLast && "pb-7")}
            >
              {!isLast ? (
                <span
                  aria-hidden
                  className={cn(
                    "absolute left-4 top-8 h-[calc(100%-12px)] w-[2px] rounded-full",
                    connectorTone(step.state),
                  )}
                />
              ) : null}

              <div className="absolute left-0 top-0">
                <TimelineNode state={step.state} />
              </div>

              <div
                className={cn(
                  "min-w-0 pt-0.5",
                  step.state === "current" &&
                    "rounded-xl border border-[#eaded9] bg-gradient-to-br from-[#fdf8f5] to-white px-4 py-3 shadow-sm",
                  step.state === "danger" &&
                    "rounded-xl border border-red-200 bg-red-50/60 px-4 py-3",
                )}
              >
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <p
                    className={cn(
                      "text-[15px] font-semibold leading-snug",
                      step.state === "danger"
                        ? "text-red-900"
                        : "text-[#241316]",
                    )}
                  >
                    {step.title}
                  </p>
                  {step.time ? (
                    <time className="shrink-0 text-xs font-medium tabular-nums text-[#776a6d]">
                      {step.time}
                    </time>
                  ) : null}
                </div>
                {step.description ? (
                  <p
                    className={cn(
                      "mt-1.5 text-sm leading-relaxed",
                      step.state === "danger"
                        ? "text-red-800/90"
                        : "text-[#776a6d]",
                    )}
                  >
                    {step.description}
                  </p>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>

      {d.requestReason && d.status !== "REJECTED" ? (
        <div className="mt-5 flex gap-3 rounded-xl border border-[#eaded9] bg-[#faf7f5] px-4 py-3">
          <div className="mt-0.5 size-1.5 shrink-0 rounded-full bg-[#9a6f2a]" />
          <div className="min-w-0">
            <p className="text-xs font-semibold text-[#776a6d]">
              Customer reason
            </p>
            <p className="mt-0.5 text-sm font-medium leading-snug text-[#241316]">
              {d.requestReason}
            </p>
          </div>
        </div>
      ) : null}
    </DetailBlock>
  );
}

export function RedemptionDetailSheet({
  redemptionId,
  onClose,
  onUpdated,
}: {
  redemptionId: string | null;
  onClose: () => void;
  onUpdated?: () => void;
}) {
  const open = Boolean(redemptionId);
  const detailQuery = useGetRedemptionQuery(redemptionId ?? "", {
    skip: !redemptionId,
  });
  const [approve, approveState] = useApproveRedemptionMutation();
  const [reject, rejectState] = useRejectRedemptionMutation();
  const [complete, completeState] = useCompleteRedemptionMutation();
  const [rejectReason, setRejectReason] = useState("");
  const [completeRemarks, setCompleteRemarks] = useState("");
  const [confirmCompleteOpen, setConfirmCompleteOpen] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);

  const d = detailQuery.data;
  const busy =
    approveState.isLoading || rejectState.isLoading || completeState.isLoading;

  async function afterAction(message: string) {
    toast.success(message);
    await detailQuery.refetch();
    onUpdated?.();
    if (message.includes("completed") || message.includes("rejected")) {
      onClose();
    }
  }

  function resetLocalState() {
    setRejectReason("");
    setCompleteRemarks("");
    setConfirmCompleteOpen(false);
    setShowRejectForm(false);
  }

  return (
    <>
      <Sheet
        open={open}
        onOpenChange={(v) => {
          if (!v) {
            resetLocalState();
            onClose();
          }
        }}
      >
        <SheetContent className="flex h-full w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
          {!redemptionId ? null : detailQuery.isLoading ? (
            <div className="p-6">
              <PageSkeleton />
            </div>
          ) : detailQuery.isError || !d ? (
            <div className="p-6">
              <QueryError
                onRetry={detailQuery.refetch}
                title="Could not load redemption"
                detail={apiErrorMessage(detailQuery.error)}
              />
            </div>
          ) : (
            <RedemptionDetailBody
              d={d}
              rejectReason={rejectReason}
              setRejectReason={setRejectReason}
              completeRemarks={completeRemarks}
              setCompleteRemarks={setCompleteRemarks}
              showRejectForm={showRejectForm}
              setShowRejectForm={setShowRejectForm}
              busy={busy}
              onApprove={async () => {
                try {
                  await approve({
                    id: d.id,
                    expectedVersion: d.version,
                  }).unwrap();
                  await afterAction("Redemption approved");
                } catch (err) {
                  toastApiError(err, "Could not approve redemption");
                }
              }}
              onReject={async () => {
                try {
                  await reject({
                    id: d.id,
                    reason: rejectReason.trim(),
                  }).unwrap();
                  await afterAction("Redemption rejected");
                } catch (err) {
                  toastApiError(err, "Could not reject redemption");
                }
              }}
              onCompleteClick={() => setConfirmCompleteOpen(true)}
            />
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog open={confirmCompleteOpen} onOpenChange={setConfirmCompleteOpen}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Complete handover?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>
                  This closes{" "}
                  <strong className="text-foreground">
                    {d?.scheme.enrollmentNumber}
                  </strong>{" "}
                  and posts ledger entries. Only continue if settlement is done.
                </p>
                {d ? (
                  <div className="rounded-xl border border-[#eaded9] bg-[#faf7f5] px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#776a6d]">
                      Payout
                    </p>
                    <p className="text-lg font-bold text-[#730321]">
                      {money(d.settlementPreview.finalValue)} · {d.modeLabel}
                    </p>
                    <p className="mt-1 text-sm">{d.customer.name}</p>
                  </div>
                ) : null}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={completeState.isLoading}>
              Not yet
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={completeState.isLoading || !d}
              className="bg-[#730321] hover:bg-[#5a021a]"
              onClick={async (e) => {
                e.preventDefault();
                if (!d) return;
                try {
                  await complete({
                    id: d.id,
                    remarks: completeRemarks.trim() || undefined,
                  }).unwrap();
                  setConfirmCompleteOpen(false);
                  await afterAction("Redemption completed");
                } catch (err) {
                  toastApiError(err, "Could not complete redemption");
                }
              }}
            >
              {completeState.isLoading && (
                <Loader2 className="animate-spin" />
              )}
              Confirm handover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
