"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Surface, FieldLabel } from "@/src/components/common/page-parts";
import { StatusBadge } from "@/src/components/common/status-badge";
import { toastApiError } from "@/src/lib/api-error";
import { idempotencyKey, money } from "@/src/lib/format";
import {
  useGetGatewaySettlementMismatchesQuery,
  useGetGatewaySettlementRunsQuery,
  useResolveGatewaySettlementMismatchMutation,
  useUploadGatewaySettlementMutation,
} from "@/src/store/api/admin-api";

const CATEGORIES = [
  "PROVIDER_CONFIRMED",
  "BANK_CONFIRMED",
  "TIMING_DIFFERENCE",
  "DUPLICATE_STATEMENT_ROW",
  "INTERNAL_REFERENCE_CORRECTED",
  "ACCEPTED_MANUAL_EXCEPTION",
] as const;

type UploadItem = {
  providerTransactionId?: string;
  providerRefundId?: string;
  expectedAmountPaise?: number;
  settledAmountPaise: number;
  matchedPaymentId?: string;
  matchedRefundId?: string;
};

export function GatewaySettlementPanel() {
  const runs = useGetGatewaySettlementRunsQuery({ limit: 30 });
  const mismatches = useGetGatewaySettlementMismatchesQuery({ status: "OPEN", limit: 100 });
  const [upload, uploadState] = useUploadGatewaySettlementMutation();
  const [resolve, resolveState] = useResolveGatewaySettlementMismatchMutation();
  const [businessDate, setBusinessDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [fileName, setFileName] = useState("phonepe-settlement.json");
  const [statement, setStatement] = useState("[]");
  const [resolution, setResolution] = useState<Record<string, { category: string; reason: string }>>({});

  async function submitUpload() {
    let items: UploadItem[];
    try {
      const parsed = JSON.parse(statement);
      if (!Array.isArray(parsed) || parsed.length === 0) throw new Error();
      items = parsed;
    } catch {
      toast.error("Paste a non-empty JSON array of PhonePe settlement rows.");
      return;
    }
    try {
      await upload({
        businessDate,
        contentType: "JSON",
        sourceFileName: fileName.trim() || undefined,
        items,
        idempotencyKey: idempotencyKey(),
      }).unwrap();
      toast.success("Settlement statement uploaded and verified");
      await Promise.all([runs.refetch(), mismatches.refetch()]);
    } catch (error) {
      toastApiError(error, "Could not upload settlement statement");
    }
  }

  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <Surface
        title="PhonePe daily settlement"
        description="Upload provider rows; the backend compares captures and refunds against the ledger."
      >
        <div className="space-y-4 p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <FieldLabel>Business date</FieldLabel>
              <Input type="date" value={businessDate} onChange={(e) => setBusinessDate(e.target.value)} />
            </div>
            <div>
              <FieldLabel>Source filename</FieldLabel>
              <Input maxLength={200} value={fileName} onChange={(e) => setFileName(e.target.value)} />
            </div>
          </div>
          <div>
            <FieldLabel>Settlement rows (JSON)</FieldLabel>
            <Textarea
              className="min-h-36 font-mono text-xs"
              value={statement}
              onChange={(e) => setStatement(e.target.value)}
              placeholder='[{"providerTransactionId":"...","settledAmountPaise":10000}]'
            />
          </div>
          <Button disabled={uploadState.isLoading || !businessDate} onClick={() => void submitUpload()}>
            Upload and verify
          </Button>
          <div className="space-y-2 border-t pt-4">
            <p className="text-sm font-semibold">Recent runs</p>
            {(runs.data ?? []).slice(0, 8).map((run) => (
              <div key={String(run._id ?? run.id)} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                <div>
                  <p className="font-medium">{String(run.businessDate ?? "—")}</p>
                  <p className="text-xs text-muted-foreground">
                    Capture {money(Number(run.providerCapturePaise ?? 0) / 100)} · Refund {money(Number(run.providerRefundPaise ?? 0) / 100)}
                  </p>
                </div>
                <StatusBadge status={String(run.status ?? "PENDING")} />
              </div>
            ))}
          </div>
        </div>
      </Surface>
      <Surface title="Open settlement mismatches" description="Resolving a mismatch records an immutable reason; it does not alter the financial ledger.">
        <div className="space-y-3 p-5">
          {(mismatches.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No open mismatches.</p>
          ) : (
            (mismatches.data ?? []).map((row) => {
              const id = String(row._id ?? row.id);
              const value = resolution[id] ?? { category: "PROVIDER_CONFIRMED", reason: "" };
              return (
                <div key={id} className="space-y-3 rounded-xl border p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{String(row.reason ?? "Settlement mismatch")}</p>
                      <p className="text-xs text-muted-foreground">Run {String(row.runId ?? "—")}</p>
                    </div>
                    <StatusBadge status={String(row.status ?? "OPEN")} />
                  </div>
                  <Select
                    value={value.category}
                    onValueChange={(category) => setResolution((prev) => ({ ...prev, [id]: { ...value, category } }))}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((category) => (
                        <SelectItem key={category} value={category}>{category.replaceAll("_", " ")}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    value={value.reason}
                    maxLength={500}
                    placeholder="Resolution reason"
                    onChange={(e) => setResolution((prev) => ({ ...prev, [id]: { ...value, reason: e.target.value } }))}
                  />
                  <Button
                    size="sm"
                    disabled={resolveState.isLoading || value.reason.trim().length < 3}
                    onClick={async () => {
                      try {
                        await resolve({
                          mismatchId: id,
                          category: value.category,
                          reason: value.reason.trim(),
                          expectedVersion: Number(row.version ?? 0),
                          idempotencyKey: idempotencyKey(),
                        }).unwrap();
                        toast.success("Mismatch resolved");
                        await mismatches.refetch();
                      } catch (error) {
                        toastApiError(error, "Could not resolve mismatch");
                      }
                    }}
                  >
                    Resolve mismatch
                  </Button>
                </div>
              );
            })
          )}
        </div>
      </Surface>
    </div>
  );
}
