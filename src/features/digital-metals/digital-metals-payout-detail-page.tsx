"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { PageHeader, Surface } from "@/src/components/common/page-parts";
import { PageSkeleton, QueryError } from "@/src/components/common/query-state";
import { StatusBadge } from "@/src/components/common/status-badge";
import { toastApiError } from "@/src/lib/api-error";
import { newIdempotencyKey } from "@/src/lib/idempotency";
import { money } from "@/src/lib/format";
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

  if (ent.loading || detail.isLoading) return <PageSkeleton cards={2} />;
  if (!ent.workspaceVisible) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">{ent.disabledMessage}</p>
      </div>
    );
  }
  if (detail.isError) return <QueryError error={detail.error} onRetry={detail.refetch} />;

  const payout = detail.data?.payout as Record<string, unknown> | undefined;
  const payable = detail.data?.payable as Record<string, unknown> | undefined;
  const actions = (payout?.permittedActions as string[]) ?? [];
  const snap = payout?.destinationSnapshot as Record<string, unknown> | undefined;

  async function run(action: () => Promise<unknown>) {
    try {
      await action();
      toast.success("Updated.");
      detail.refetch();
    } catch (err) {
      toastApiError(err);
    }
  }

  return (
    <div className="space-y-6 p-6" data-testid="digital-metals-payout-detail">
      <PageHeader title="Payout instruction" description={payoutId} />
      <Surface title="Summary">
        <dl className="space-y-2 px-4 py-3 text-sm">
          <div className="flex justify-between">
            <dt>Status</dt>
            <dd>
              <StatusBadge status={String(payout?.status ?? "")} />
            </dd>
          </div>
          <div className="flex justify-between">
            <dt>Amount</dt>
            <dd className="font-semibold">{money(Number(payout?.amountPaise ?? 0))}</dd>
          </div>
          <div className="flex justify-between">
            <dt>Outstanding payable</dt>
            <dd>{money(Number(payable?.outstandingPaise ?? 0))}</dd>
          </div>
          {snap ? (
            <div>
              <dt className="font-medium">Frozen destination</dt>
              <dd className="text-muted-foreground">
                {String(snap.accountHolderName)} · ****{String(snap.accountLast4)} · {String(snap.ifsc)}
              </dd>
            </div>
          ) : null}
        </dl>
      </Surface>
      {(payout?.statusHistory as { status: string; note?: string; at: string }[])?.length ? (
        <Surface title="Immutable history">
          <ul className="divide-y px-4 py-2 text-xs">
            {(payout?.statusHistory as { status: string; note?: string; at: string }[]).map((h, i) => (
              <li key={`${h.at}-${i}`} className="py-2">
                {h.status} · {new Date(h.at).toLocaleString()}
                {h.note ? ` — ${h.note}` : ""}
              </li>
            ))}
          </ul>
        </Surface>
      ) : null}
      <Surface title="Actions">
        <div className="space-y-3 px-4 py-3">
          {actions.includes("APPROVE") ? (
            <Button type="button" onClick={() => void run(() => approve(payoutId).unwrap())}>
              Approve (approver)
            </Button>
          ) : null}
          {actions.includes("SUBMIT") ? (
            <div className="flex flex-wrap gap-2">
              <Input
                placeholder="Bank reference"
                value={bankReference}
                onChange={(e) => setBankReference(e.target.value)}
                className="max-w-xs"
              />
              <Button
                type="button"
                onClick={() =>
                  void run(() =>
                    submit({ payoutId, bankReference, idempotencyKey: newIdempotencyKey() }).unwrap(),
                  )
                }
              >
                Record bank submission
              </Button>
            </div>
          ) : null}
          {actions.includes("RECORD_SETTLEMENT") ? (
            <div className="flex flex-col gap-2 max-w-md">
              <Input placeholder="Settlement date YYYY-MM-DD" value={settlementDate} onChange={(e) => setSettlementDate(e.target.value)} />
              <Input placeholder="Bank reference" value={bankReference} onChange={(e) => setBankReference(e.target.value)} />
              <Input placeholder="Evidence upload id" value={evidenceId} onChange={(e) => setEvidenceId(e.target.value)} />
              <label className="flex items-start gap-2 text-sm">
                <Checkbox
                  checked={settlementAttestation}
                  onCheckedChange={(v) => setSettlementAttestation(v === true)}
                />
                <span>
                  I attest that bank evidence confirms the customer received this payout amount (staff attestation — not
                  automated verification).
                </span>
              </label>
              <Button
                type="button"
                disabled={!settlementAttestation || !settlementDate.trim() || !evidenceId.trim()}
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
            </div>
          ) : null}
          {actions.includes("RECORD_FAILURE") ? (
            <div className="flex flex-col gap-2 max-w-md">
              <Input placeholder="Failure reason" value={failureReason} onChange={(e) => setFailureReason(e.target.value)} />
              <Input placeholder="Evidence upload id" value={evidenceId} onChange={(e) => setEvidenceId(e.target.value)} />
              <Button
                type="button"
                variant="outline"
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
            </div>
          ) : null}
          {actions.includes("MARK_UNKNOWN") ? (
            <div className="flex flex-col gap-2 max-w-md">
              <Input placeholder="Why status is unclear" value={unknownReason} onChange={(e) => setUnknownReason(e.target.value)} />
              <Button
                type="button"
                variant="outline"
                disabled={unknownReason.trim().length < 8}
                onClick={() =>
                  void run(() =>
                    unknown({
                      payoutId,
                      reason: unknownReason.trim(),
                      idempotencyKey: newIdempotencyKey(),
                    }).unwrap(),
                  )
                }
              >
                Mark unknown
              </Button>
            </div>
          ) : null}
          {actions.includes("RESOLVE_UNKNOWN") ? (
            <div className="flex flex-col gap-2 max-w-md">
              <Input placeholder="Resolution note" value={resolutionNote} onChange={(e) => setResolutionNote(e.target.value)} />
              <Button
                type="button"
                disabled={resolutionNote.trim().length < 8 || !evidenceId.trim()}
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
            </div>
          ) : null}
          {actions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No actions permitted for your role on this state.</p>
          ) : null}
        </div>
      </Surface>
      {["SETTLED", "MANUAL_RECORDED"].includes(String(payout?.status ?? "")) ? (
        <AdminDigitalMetalsDocumentPanel
          title="Payout settlement record"
          docType="PAYOUT_RECEIPT"
          subjectId={payoutId}
          staffAttestedLabel="Staff-attested settlement record — bank account details are not shown on the PDF."
        />
      ) : null}
      <Link href="/digital-metals/payouts" className="text-sm underline">
        Back to payouts
      </Link>
    </div>
  );
}
