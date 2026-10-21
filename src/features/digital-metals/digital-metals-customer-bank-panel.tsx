"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/src/components/common/status-badge";
import { toastApiError } from "@/src/lib/api-error";
import { newIdempotencyKey } from "@/src/lib/idempotency";
import {
  useDisableDigitalMetalsBankDestinationMutation,
  useGetDigitalMetalsCustomerBankDestinationsQuery,
  useVerifyDigitalMetalsBankDestinationMutation,
} from "@/src/store/api/admin-api";

function formatWhen(iso: unknown) {
  if (!iso || typeof iso !== "string") return "—";
  try {
    return new Date(iso).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" });
  } catch {
    return "—";
  }
}

export function DigitalMetalsCustomerBankPanel({ customerId }: { customerId: string }) {
  const banks = useGetDigitalMetalsCustomerBankDestinationsQuery(customerId);
  const [verify, verifyState] = useVerifyDigitalMetalsBankDestinationMutation();
  const [disable, disableState] = useDisableDigitalMetalsBankDestinationMutation();
  const [noteById, setNoteById] = useState<Record<string, string>>({});
  const [evidenceById, setEvidenceById] = useState<Record<string, string>>({});

  if (banks.isLoading) return <p className="text-xs text-muted-foreground">Loading bank accounts…</p>;
  if (banks.isError) return <p className="text-xs text-destructive">Could not load bank destinations.</p>;

  const items = banks.data?.items ?? [];

  return (
    <div className="space-y-3" data-testid="admin-customer-digital-metals-banks">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold">Payout bank accounts</h3>
          <p className="text-xs text-muted-foreground">
            Manual staff attestation — verify only after you confirm account details offline.
          </p>
        </div>
        <Link href="/digital-metals/bank-verification" className="text-xs font-medium underline underline-offset-2">
          Verification queue
        </Link>
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">No bank destinations on file.</p>
      ) : (
        <ul className="space-y-3">
          {items.map((row) => {
            const id = String(row.id);
            const status = String(row.status ?? "");
            const note = noteById[id] ?? "";
            const evidenceRaw = evidenceById[id] ?? "";
            const evidenceUploadIds = evidenceRaw
              .split(/[\s,]+/)
              .map((s) => s.trim())
              .filter(Boolean);
            return (
              <li key={id} className="rounded-xl border bg-card px-4 py-3 text-sm">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{String(row.accountHolderName ?? "Account")}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      ****{String(row.accountLast4 ?? "????")} · {String(row.ifsc ?? "—")}
                      {row.bankName ? ` · ${String(row.bankName)}` : ""}
                    </p>
                  </div>
                  <StatusBadge status={status} />
                </div>
                <dl className="mt-2 grid gap-1 text-xs text-muted-foreground">
                  <div className="flex justify-between gap-4">
                    <dt>Last action</dt>
                    <dd>{formatWhen(row.verifiedAt)}</dd>
                  </div>
                  {row.verifiedByName ? (
                    <div className="flex justify-between gap-4">
                      <dt>Staff</dt>
                      <dd>{String(row.verifiedByName)}</dd>
                    </div>
                  ) : null}
                  {row.manualVerificationNote ? (
                    <div>
                      <dt className="font-medium text-[#5c3d42]">Note</dt>
                      <dd className="mt-0.5">{String(row.manualVerificationNote)}</dd>
                    </div>
                  ) : null}
                </dl>
                {status === "PENDING_VERIFICATION" ? (
                  <div className="mt-3 space-y-2 border-t pt-3">
                    <div>
                      <Label htmlFor={`note-${id}`} className="text-xs">
                        Verification note (required)
                      </Label>
                      <Input
                        id={`note-${id}`}
                        className="mt-1"
                        value={note}
                        onChange={(e) => setNoteById((m) => ({ ...m, [id]: e.target.value }))}
                        placeholder="How you verified this account (audited)"
                      />
                    </div>
                    <div>
                      <Label htmlFor={`ev-${id}`} className="text-xs">
                        Evidence upload IDs (optional, space-separated)
                      </Label>
                      <Input
                        id={`ev-${id}`}
                        className="mt-1 font-mono text-xs"
                        value={evidenceRaw}
                        onChange={(e) => setEvidenceById((m) => ({ ...m, [id]: e.target.value }))}
                        placeholder="upl_… upl_…"
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        disabled={verifyState.isLoading || note.trim().length < 3}
                        onClick={() =>
                          void verify({
                            customerId,
                            destinationId: id,
                            note: note.trim(),
                            activate: true,
                            evidenceUploadIds: evidenceUploadIds.length ? evidenceUploadIds : undefined,
                            idempotencyKey: newIdempotencyKey(),
                          })
                            .unwrap()
                            .then(() => {
                              toast.success("Bank account verified (manual attestation recorded).");
                              banks.refetch();
                            })
                            .catch(toastApiError)
                        }
                      >
                        Verify (activate)
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        disabled={verifyState.isLoading || note.trim().length < 3}
                        onClick={() =>
                          void verify({
                            customerId,
                            destinationId: id,
                            note: note.trim(),
                            activate: false,
                            evidenceUploadIds: evidenceUploadIds.length ? evidenceUploadIds : undefined,
                            idempotencyKey: newIdempotencyKey(),
                          })
                            .unwrap()
                            .then(() => {
                              toast.message("Left in pending verification (manual review recorded).");
                              banks.refetch();
                            })
                            .catch(toastApiError)
                        }
                      >
                        Reject verification
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={disableState.isLoading || note.trim().length < 3}
                        onClick={() =>
                          void disable({
                            customerId,
                            destinationId: id,
                            note: note.trim(),
                            evidenceUploadIds: evidenceUploadIds.length ? evidenceUploadIds : undefined,
                            idempotencyKey: newIdempotencyKey(),
                          })
                            .unwrap()
                            .then(() => {
                              toast.success("Bank destination disabled.");
                              banks.refetch();
                            })
                            .catch(toastApiError)
                        }
                      >
                        Disable
                      </Button>
                    </div>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
