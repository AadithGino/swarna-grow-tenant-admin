"use client";

import { useState } from "react";
import { toast } from "sonner";
import { BadgeCheck, CircleHelp, Landmark, Send, ShieldCheck, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { PageHeader, Surface } from "@/src/components/common/page-parts";
import { PageSkeleton, QueryError } from "@/src/components/common/query-state";
import { StatusBadge } from "@/src/components/common/status-badge";
import { IdChip } from "@/src/components/admin-ui/admin-table";
import { DetailLayout, Fact, FactGrid, Timeline, type TimelineStep } from "@/src/components/admin-ui/detail-parts";
import { toastApiError } from "@/src/lib/api-error";
import { newIdempotencyKey } from "@/src/lib/idempotency";
import {
  useApproveDigitalMetalsPayoutMutation,
  useGetDigitalMetalsPayoutQuery,
  useMarkDigitalMetalsPayoutUnknownMutation,
  useRecordDigitalMetalsPayoutFailureMutation,
  useRecordDigitalMetalsPayoutSettlementMutation,
  useResolveDigitalMetalsPayoutUnknownMutation,
  useSubmitDigitalMetalsPayoutMutation,
} from "@/src/store/api/admin-api";
import { useDigitalMetalsServerEntitlement } from "./digital-metals-admin-shared";
import { AdminDigitalMetalsDocumentPanel } from "./digital-metals-admin-document-panel";
import { DM_SECTION, dmInr, shortDateTime } from "./digital-metals-admin-ui";

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-[#4f3d41]">{label}</span>
      {children}
      {hint ? <span className="block text-xs text-[#9a8d90]">{hint}</span> : null}
    </label>
  );
}

function ActionBlock({
  icon: Icon,
  title,
  description,
  children,
  tone = "default",
}: {
  icon: typeof Send;
  title: string;
  description?: string;
  children: React.ReactNode;
  tone?: "default" | "danger";
}) {
  return (
    <div className={`rounded-2xl border p-4 ${tone === "danger" ? "border-red-100 bg-red-50/40" : "border-[#efe5e1] bg-[#fcf9f8]"}`}>
      <div className="mb-3 flex items-start gap-2.5">
        <Icon className={`mt-0.5 size-4 shrink-0 ${tone === "danger" ? "text-red-600" : "text-[#7b0a2b]"}`} aria-hidden />
        <div>
          <p className="font-semibold text-[#28161a]">{title}</p>
          {description ? <p className="text-xs leading-5 text-[#857a7d]">{description}</p> : null}
        </div>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

export function DigitalMetalsPayoutDetailPage({ payoutId }: { payoutId: string }) {
  const ent = useDigitalMetalsServerEntitlement();
  const detail = useGetDigitalMetalsPayoutQuery(payoutId, { skip: !ent.workspaceVisible });
  const [approve] = useApproveDigitalMetalsPayoutMutation();
  const [submit] = useSubmitDigitalMetalsPayoutMutation();
  const [settle] = useRecordDigitalMetalsPayoutSettlementMutation();
  const [fail] = useRecordDigitalMetalsPayoutFailureMutation();
  const [unknown] = useMarkDigitalMetalsPayoutUnknownMutation();
  const [resolve] = useResolveDigitalMetalsPayoutUnknownMutation();
  const [bankReference, setBankReference] = useState("");
  const [settlementDate, setSettlementDate] = useState("");
  const [evidenceId, setEvidenceId] = useState("");
  const [failureReason, setFailureReason] = useState("");
  const [resolutionNote, setResolutionNote] = useState("");
  const [settlementAttestation, setSettlementAttestation] = useState(false);
  const [unknownReason, setUnknownReason] = useState("");
  const [busy, setBusy] = useState(false);

  if (ent.loading || detail.isLoading) return <PageSkeleton cards={2} />;
  if (!ent.workspaceVisible) {
    return <p className="text-sm text-muted-foreground">{ent.disabledMessage}</p>;
  }
  if (detail.isError) return <QueryError error={detail.error} onRetry={detail.refetch} />;

  const payout = detail.data?.payout as Record<string, unknown> | undefined;
  const payable = detail.data?.payable as Record<string, unknown> | undefined;
  const actions = (payout?.permittedActions as string[]) ?? [];
  const snap = payout?.destinationSnapshot as Record<string, unknown> | undefined;
  const history = (payout?.statusHistory as { status: string; note?: string; at: string }[] | undefined) ?? [];
  const status = String(payout?.status ?? "");

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    try {
      await action();
      toast.success("Payout updated.");
      detail.refetch();
    } catch (err) {
      toastApiError(err);
    } finally {
      setBusy(false);
    }
  }

  const timeline: TimelineStep[] = history.map((h, i) => ({
    key: `${h.at}-${i}`,
    title: h.status.replaceAll("_", " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase()),
    time: new Date(h.at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }),
    detail: h.note,
    state: h.status === "FAILED" ? "failed" : i === history.length - 1 && !["SETTLED", "MANUAL_RECORDED"].includes(h.status) ? "current" : "done",
  }));

  return (
    <div className="space-y-6" data-testid="digital-metals-payout-detail">
      <PageHeader
        back={{ href: "/digital-metals/payouts", label: "Payouts" }}
        eyebrow={DM_SECTION}
        title={`Payout ${dmInr(Number(payout?.amountPaise ?? 0))}`}
        meta={
          <>
            <StatusBadge status={status} />
            <IdChip>{payoutId}</IdChip>
            {payout?.sellOrderId ? <span>From sale {String(payout.sellOrderId)}</span> : null}
          </>
        }
      />
      <DetailLayout
        main={
          <>
            <Surface>
              <FactGrid>
                <Fact label="Amount" value={dmInr(Number(payout?.amountPaise ?? 0))} detail="To the customer" />
                <Fact label="Still owed" value={dmInr(Number(payable?.outstandingPaise ?? 0))} detail="On the payable" />
                <Fact label="Bank reference" value={String(payout?.bankReference ?? "—")} detail="UTR / transfer ID" />
                <Fact label="Updated" value={shortDateTime(String(payout?.updatedAt ?? history[history.length - 1]?.at ?? ""))} />
              </FactGrid>
            </Surface>
            <Surface icon={ShieldCheck} title="Next step" description="Only the actions your role can take right now are shown.">
              <div className="space-y-4 px-5 py-4">
                {actions.includes("APPROVE") ? (
                  <ActionBlock icon={BadgeCheck} title="Approve payout" description="A second person approves before money leaves your account.">
                    <Button type="button" className="rounded-xl" disabled={busy} onClick={() => void run(() => approve(payoutId).unwrap())}>
                      Approve (approver)
                    </Button>
                  </ActionBlock>
                ) : null}
                {actions.includes("SUBMIT") ? (
                  <ActionBlock icon={Send} title="Send to the bank" description="After you initiate the NEFT/IMPS/RTGS transfer from your bank.">
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Input
                        placeholder="Bank reference (UTR)"
                        value={bankReference}
                        onChange={(e) => setBankReference(e.target.value)}
                        className="h-10 rounded-xl sm:max-w-xs"
                      />
                      <Button
                        type="button"
                        className="h-10 rounded-xl"
                        disabled={busy}
                        onClick={() =>
                          void run(() => submit({ payoutId, bankReference, idempotencyKey: newIdempotencyKey() }).unwrap())
                        }
                      >
                        Record bank submission
                      </Button>
                    </div>
                  </ActionBlock>
                ) : null}
                {actions.includes("RECORD_SETTLEMENT") ? (
                  <ActionBlock icon={BadgeCheck} title="Record settlement" description="Use the bank statement or credit confirmation as evidence.">
                    <div className="grid gap-3 sm:grid-cols-3">
                      <Field label="Settlement date">
                        <Input type="date" value={settlementDate} onChange={(e) => setSettlementDate(e.target.value)} className="h-10 rounded-xl" />
                      </Field>
                      <Field label="Bank reference">
                        <Input value={bankReference} onChange={(e) => setBankReference(e.target.value)} placeholder={String(payout?.bankReference ?? "UTR")} className="h-10 rounded-xl" />
                      </Field>
                      <Field label="Evidence upload ID">
                        <Input value={evidenceId} onChange={(e) => setEvidenceId(e.target.value)} className="h-10 rounded-xl" />
                      </Field>
                    </div>
                    <label className="flex items-start gap-3 rounded-xl border border-[#efe5e1] bg-white p-3 text-sm leading-5">
                      <Checkbox checked={settlementAttestation} onCheckedChange={(v) => setSettlementAttestation(v === true)} className="mt-0.5" />
                      <span>
                        I attest that bank evidence confirms the customer received this payout amount (staff attestation — not automated verification).
                      </span>
                    </label>
                    <Button
                      type="button"
                      className="rounded-xl"
                      disabled={busy || !settlementAttestation || !settlementDate.trim() || !evidenceId.trim()}
                      onClick={() =>
                        void run(() =>
                          settle({
                            payoutId,
                            settlementDate,
                            bankReference: bankReference || String(payout?.bankReference ?? ""),
                            evidenceUploadIds: [evidenceId.trim()],
                            approverAttestation: true,
                            idempotencyKey: newIdempotencyKey(),
                          }).unwrap(),
                        )
                      }
                    >
                      Record staff-attested settlement
                    </Button>
                  </ActionBlock>
                ) : null}
                {actions.includes("RECORD_FAILURE") ? (
                  <ActionBlock icon={TriangleAlert} title="Record failure" description="The bank returned or rejected the transfer." tone="danger">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="What happened">
                        <Input value={failureReason} onChange={(e) => setFailureReason(e.target.value)} placeholder="e.g. Account frozen" className="h-10 rounded-xl" />
                      </Field>
                      <Field label="Evidence upload ID">
                        <Input value={evidenceId} onChange={(e) => setEvidenceId(e.target.value)} className="h-10 rounded-xl" />
                      </Field>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-xl border-red-200 text-red-700 hover:bg-red-50"
                      disabled={busy}
                      onClick={() =>
                        void run(() =>
                          fail({
                            payoutId,
                            reason: failureReason,
                            evidenceUploadIds: [evidenceId],
                            idempotencyKey: newIdempotencyKey(),
                          }).unwrap(),
                        )
                      }
                    >
                      Record failure with evidence
                    </Button>
                  </ActionBlock>
                ) : null}
                {actions.includes("MARK_UNKNOWN") ? (
                  <ActionBlock icon={CircleHelp} title="Outcome unclear?" description="Mark it unknown while you check with the bank. Payouts can't be resent until it's resolved.">
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Input value={unknownReason} onChange={(e) => setUnknownReason(e.target.value)} placeholder="Why the status is unclear (8+ characters)" className="h-10 rounded-xl" />
                      <Button
                        type="button"
                        variant="outline"
                        className="h-10 rounded-xl"
                        disabled={busy || unknownReason.trim().length < 8}
                        onClick={() =>
                          void run(() => unknown({ payoutId, reason: unknownReason.trim(), idempotencyKey: newIdempotencyKey() }).unwrap())
                        }
                      >
                        Mark unknown
                      </Button>
                    </div>
                  </ActionBlock>
                ) : null}
                {actions.includes("RESOLVE_UNKNOWN") ? (
                  <ActionBlock icon={CircleHelp} title="Resolve unknown outcome">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="Resolution note">
                        <Input value={resolutionNote} onChange={(e) => setResolutionNote(e.target.value)} className="h-10 rounded-xl" />
                      </Field>
                      <Field label="Evidence upload ID">
                        <Input value={evidenceId} onChange={(e) => setEvidenceId(e.target.value)} className="h-10 rounded-xl" />
                      </Field>
                    </div>
                    <Button
                      type="button"
                      className="rounded-xl"
                      disabled={busy || resolutionNote.trim().length < 8 || !evidenceId.trim()}
                      onClick={() =>
                        void run(() =>
                          resolve({
                            payoutId,
                            outcome: "FAILED",
                            resolutionNote: resolutionNote.trim(),
                            evidenceUploadIds: [evidenceId.trim()],
                            idempotencyKey: newIdempotencyKey(),
                          }).unwrap(),
                        )
                      }
                    >
                      Resolve unknown (evidenced)
                    </Button>
                  </ActionBlock>
                ) : null}
                {actions.length === 0 ? (
                  <p className="text-sm text-[#7a6d70]">No actions for your role at this stage.</p>
                ) : null}
              </div>
            </Surface>
            {["SETTLED", "MANUAL_RECORDED"].includes(status) ? (
              <AdminDigitalMetalsDocumentPanel
                title="Payout settlement record"
                docType="PAYOUT_RECEIPT"
                subjectId={payoutId}
                staffAttestedLabel="Staff-attested settlement record — bank account details are not shown on the PDF."
              />
            ) : null}
          </>
        }
        aside={
          <>
            {snap ? (
              <Surface icon={Landmark} title="Paying to" description="Frozen when the payout was created">
                <div className="mx-5 my-4 rounded-2xl bg-gradient-to-br from-[#3d0c15] to-[#6d1730] px-4 py-4 text-white">
                  <p className="text-xs text-[#e2c88f]">{String(snap.bankName ?? "Bank account")}</p>
                  <p className="mt-2 text-lg font-bold tracking-[0.18em] tabular-nums">•••• {String(snap.accountLast4)}</p>
                  <div className="mt-2 flex items-end justify-between gap-2 text-xs text-white/75">
                    <span className="truncate">{String(snap.accountHolderName)}</span>
                    <span className="tabular-nums">{String(snap.ifsc)}</span>
                  </div>
                </div>
              </Surface>
            ) : null}
            {timeline.length ? (
              <Surface title="History" description="Every change is recorded and can't be edited">
                <Timeline steps={timeline} />
              </Surface>
            ) : null}
          </>
        }
      />
    </div>
  );
}
