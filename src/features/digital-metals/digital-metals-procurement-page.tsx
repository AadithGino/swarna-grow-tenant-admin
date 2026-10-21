"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader, Surface } from "@/src/components/common/page-parts";
import { PageSkeleton, QueryError } from "@/src/components/common/query-state";
import { StatusBadge } from "@/src/components/common/status-badge";
import { toastApiError } from "@/src/lib/api-error";
import { newIdempotencyKey } from "@/src/lib/idempotency";
import { hasPermission } from "@/src/lib/permissions";
import {
  useApproveDigitalMetalsProcurementEntryMutation,
  useCreateDigitalMetalsProcurementEntryMutation,
  useGetDigitalMetalsProcurementEntriesQuery,
  useGetDigitalMetalsProcurementEntryQuery,
} from "@/src/store/api/admin-api";
import { useAppSelector } from "@/src/store/hooks";
import { contractPayload } from "@/src/store/api/contract-adapters";
import { useDigitalMetalsServerEntitlement } from "./digital-metals-admin-shared";
import { ugToGramsDisplay } from "@/src/lib/digital-metals-display";
import { gramsToUg } from "@/src/lib/digital-metals-asset-ui";
import { istBusinessDateToday } from "@/src/lib/ist-business-date";

const ENTRY_TYPES = [
  "OPENING_POSITION",
  "COMMITMENT",
  "RECEIPT",
  "DISPOSAL",
  "REVERSAL",
] as const;

export function DigitalMetalsProcurementPage() {
  const searchParams = useSearchParams();
  const ent = useDigitalMetalsServerEntitlement();
  const user = useAppSelector((s) => s.session.session?.user);
  const canWrite = hasPermission(user, "digital-metals.procurement.write");
  const canApprove = hasPermission(user, "digital-metals.procurement.approve");
  const [entryTypeFilter, setEntryTypeFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [cursor, setCursor] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(() => searchParams.get("entryId")?.trim() || null);

  useEffect(() => {
    const entryId = searchParams.get("entryId")?.trim();
    if (entryId) setSelectedId(entryId);
  }, [searchParams]);

  const list = useGetDigitalMetalsProcurementEntriesQuery(
    {
      ...(entryTypeFilter ? { entryType: entryTypeFilter } : {}),
      ...(statusFilter ? { status: statusFilter } : {}),
      ...(cursor ? { cursor } : {}),
    },
    { skip: !ent.workspaceVisible },
  );
  const detail = useGetDigitalMetalsProcurementEntryQuery(selectedId ?? "", {
    skip: !ent.workspaceVisible || !selectedId,
  });
  const [createEntry, createState] = useCreateDigitalMetalsProcurementEntryMutation();
  const [approveEntry, approveState] = useApproveDigitalMetalsProcurementEntryMutation();

  const [form, setForm] = useState({
    entryType: "COMMITMENT" as (typeof ENTRY_TYPES)[number],
    metal: "GOLD",
    finenessPpm: "916000",
    quantityGrams: "1",
    effectiveDate: istBusinessDateToday(),
    supplierRef: "",
    billRef: "",
    commitmentEntryId: "",
    reversesEntryId: "",
    evidenceUploadIds: "",
    reasonNote: "",
  });
  const [overReceiptNote, setOverReceiptNote] = useState("");

  const listPage = contractPayload(list.data) as
    | { items?: Record<string, unknown>[]; nextCursor?: string | null }
    | undefined;
  const items = listPage?.items ?? [];
  const nextCursor = listPage?.nextCursor ?? null;

  const selected = useMemo(() => {
    if (!selectedId) return null;
    const detailRow = contractPayload(detail.data) as Record<string, unknown> | undefined;
    return detailRow ?? items.find((i) => i.id === selectedId);
  }, [detail.data, items, selectedId]);

  if (ent.loading || list.isLoading) return <PageSkeleton cards={2} />;
  if (!ent.workspaceVisible) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">{ent.disabledMessage}</p>
      </div>
    );
  }
  if (list.isError) return <QueryError error={list.error} onRetry={list.refetch} />;

  async function submitCreate() {
    try {
      const evidence = form.evidenceUploadIds
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      await createEntry({
        idempotencyKey: newIdempotencyKey(),
        body: {
          entryType: form.entryType,
          metal: form.metal,
          finenessPpm: Number(form.finenessPpm),
          quantityUg: gramsToUg(form.quantityGrams),
          effectiveDate: form.effectiveDate,
          supplierRef: form.supplierRef || undefined,
          billRef: form.billRef || undefined,
          commitmentEntryId: form.commitmentEntryId || undefined,
          reversesEntryId: form.reversesEntryId || undefined,
          evidenceUploadIds: evidence.length ? evidence : undefined,
          reasonNote: form.reasonNote || undefined,
        },
      }).unwrap();
      toast.success("Procurement entry submitted for approval.");
      list.refetch();
    } catch (err) {
      toastApiError(err);
    }
  }

  async function submitApprove(overReceipt = false) {
    if (!selectedId) return;
    try {
      await approveEntry({
        entryId: selectedId,
        idempotencyKey: newIdempotencyKey(),
        ...(overReceipt
          ? { overReceiptApprove: true, overReceiptApprovalNote: overReceiptNote }
          : {}),
      }).unwrap();
      toast.success("Entry approved.");
      list.refetch();
      detail.refetch();
    } catch (err) {
      toastApiError(err);
    }
  }

  return (
    <div className="space-y-6 p-6" data-testid="digital-metals-procurement">
      <PageHeader
        title="Procurement journal"
        description="Opening positions, commitments, receipts, disposals, and reversals (maker-checker)."
      />
      <div className="flex flex-wrap gap-2 text-sm">
        <Link href="/digital-metals/hedge" className="text-primary underline-offset-2 hover:underline">
          Hedge dashboard
        </Link>
      </div>
      <Surface title="Filters">
        <div className="flex flex-wrap gap-2 px-4 py-3">
          <select
            className="rounded-md border px-2 py-1 text-sm"
            value={entryTypeFilter}
            onChange={(e) => {
              setEntryTypeFilter(e.target.value);
              setCursor(null);
            }}
          >
            <option value="">All types</option>
            {ENTRY_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <select
            className="rounded-md border px-2 py-1 text-sm"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCursor(null);
            }}
          >
            <option value="">All statuses</option>
            <option value="PENDING_APPROVAL">Pending approval</option>
            <option value="APPROVED">Approved</option>
          </select>
        </div>
      </Surface>
      <div className="grid gap-6 lg:grid-cols-2">
        <Surface title="Entries">
          <ul className="divide-y text-sm">
            {items.length === 0 ? (
              <li className="px-4 py-3 text-muted-foreground">No entries.</li>
            ) : (
              items.map((row) => (
                <li key={String(row.id)}>
                  <button
                    type="button"
                    data-testid={`procurement-entry-${String(row.id)}`}
                    className="w-full px-4 py-3 text-left hover:bg-muted/40"
                    onClick={() => setSelectedId(String(row.id))}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{String(row.entryType)}</span>
                      <StatusBadge status={String(row.status)} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {String(row.metal)} · {ugToGramsDisplay(String(row.quantityUg))} · {String(row.effectiveDate)}
                    </p>
                    {row.entryType === "COMMITMENT" && row.remainingCommitmentUg != null ? (
                      <p className="text-xs text-amber-800">
                        Remaining: {ugToGramsDisplay(String(row.remainingCommitmentUg))}
                      </p>
                    ) : null}
                  </button>
                </li>
              ))
            )}
          </ul>
          {nextCursor ? (
            <div className="border-t px-4 py-2">
              <Button type="button" size="sm" variant="outline" onClick={() => setCursor(nextCursor)}>
                Load more
              </Button>
            </div>
          ) : null}
        </Surface>
        <Surface title="Detail & actions">
          {!selected ? (
            <p className="px-4 py-3 text-sm text-muted-foreground">Select an entry.</p>
          ) : (
            <div className="space-y-3 px-4 py-3 text-sm">
              <p>
                <span className="text-muted-foreground">ID:</span> {String(selected.id)}
              </p>
              <p>
                Maker: {String(selected.createdByUserId)}{" "}
                {selected.approvedByUserId ? (
                  <>
                    · Approver: {String(selected.approvedByUserId)} · {String(selected.approvedAt ?? "")}
                  </>
                ) : null}
              </p>
              {selected.commitmentEntryId ? (
                <p>
                  Commitment:{" "}
                  <button
                    type="button"
                    className="text-primary underline"
                    onClick={() => setSelectedId(String(selected.commitmentEntryId))}
                  >
                    {String(selected.commitmentEntryId)}
                  </button>
                </p>
              ) : null}
              {selected.reversesEntryId ? (
                <p>
                  Reverses:{" "}
                  <button
                    type="button"
                    className="text-primary underline"
                    onClick={() => setSelectedId(String(selected.reversesEntryId))}
                  >
                    {String(selected.reversesEntryId)}
                  </button>
                </p>
              ) : null}
              {(selected.evidenceUploadIds as string[] | undefined)?.length ? (
                <p className="text-xs">Evidence uploads: {(selected.evidenceUploadIds as string[]).join(", ")}</p>
              ) : null}
              {selected.reasonNote ? <p className="text-xs">{String(selected.reasonNote)}</p> : null}
              {(selected.relatedEntries as Record<string, unknown>[] | undefined)?.length ? (
                <div>
                  <p className="font-medium">Related</p>
                  <ul className="text-xs">
                    {(selected.relatedEntries as Record<string, unknown>[]).map((r) => (
                      <li key={String(r.id)}>
                        <button
                          type="button"
                          className="text-primary underline"
                          onClick={() => setSelectedId(String(r.id))}
                        >
                          {String(r.entryType)} · {ugToGramsDisplay(String(r.quantityUg))}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {canApprove && selected.status === "PENDING_APPROVAL" ? (
                <div className="space-y-2 border-t pt-3">
                  <Input
                    placeholder="Over-receipt approval note (if needed)"
                    value={overReceiptNote}
                    onChange={(e) => setOverReceiptNote(e.target.value)}
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      disabled={approveState.isLoading}
                      onClick={() => void submitApprove(false)}
                    >
                      Approve
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={approveState.isLoading}
                      onClick={() => void submitApprove(true)}
                    >
                      Approve with over-receipt
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </Surface>
      </div>
      {canWrite ? (
        <Surface title="Create entry (pending approval)">
          <div className="grid gap-2 px-4 py-3 sm:grid-cols-2">
            <label className="text-xs">
              Type
              <select
                className="mt-1 w-full rounded-md border px-2 py-1 text-sm"
                value={form.entryType}
                onChange={(e) =>
                  setForm((f) => ({ ...f, entryType: e.target.value as (typeof ENTRY_TYPES)[number] }))
                }
              >
                {ENTRY_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs">
              Effective date (IST)
              <Input
                type="date"
                className="mt-1"
                value={form.effectiveDate}
                onChange={(e) => setForm((f) => ({ ...f, effectiveDate: e.target.value }))}
              />
            </label>
            <label className="text-xs">
              Quantity (grams)
              <Input
                className="mt-1"
                value={form.quantityGrams}
                onChange={(e) => setForm((f) => ({ ...f, quantityGrams: e.target.value }))}
              />
            </label>
            <label className="text-xs">
              Commitment ID (receipts)
              <Input
                className="mt-1"
                value={form.commitmentEntryId}
                onChange={(e) => setForm((f) => ({ ...f, commitmentEntryId: e.target.value }))}
              />
            </label>
            <label className="text-xs">
              Reverses entry ID
              <Input
                className="mt-1"
                value={form.reversesEntryId}
                onChange={(e) => setForm((f) => ({ ...f, reversesEntryId: e.target.value }))}
              />
            </label>
            <label className="text-xs sm:col-span-2">
              Evidence upload IDs (comma-separated)
              <Input
                className="mt-1"
                value={form.evidenceUploadIds}
                onChange={(e) => setForm((f) => ({ ...f, evidenceUploadIds: e.target.value }))}
              />
            </label>
            <label className="text-xs sm:col-span-2">
              Reason / notes
              <Input
                className="mt-1"
                value={form.reasonNote}
                onChange={(e) => setForm((f) => ({ ...f, reasonNote: e.target.value }))}
              />
            </label>
          </div>
          <div className="px-4 pb-3">
            <Button type="button" size="sm" disabled={createState.isLoading} onClick={() => void submitCreate()}>
              Submit for approval
            </Button>
          </div>
        </Surface>
      ) : null}
    </div>
  );
}
