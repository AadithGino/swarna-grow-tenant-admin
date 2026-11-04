"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { BookOpenCheck, FileText, Plus, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  dialogScrollShellClass,
} from "@/components/ui/dialog";
import { PageHeader, Surface } from "@/src/components/common/page-parts";
import { EmptyState, QueryError } from "@/src/components/common/query-state";
import { StatusBadge } from "@/src/components/common/status-badge";
import { FilterBar, FilterSelect, QuickViews } from "@/src/components/admin-ui/filter-bar";
import { InfoList, InfoRow } from "@/src/components/admin-ui/detail-parts";
import { IdChip } from "@/src/components/admin-ui/admin-table";
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
import { gramsToUg } from "@/src/lib/digital-metals-asset-ui";
import { istBusinessDateToday } from "@/src/lib/ist-business-date";
import { cn } from "@/lib/utils";
import { useDigitalMetalsServerEntitlement } from "./digital-metals-admin-shared";
import { DM_SECTION, DmGate, MetalPill, dmWeight } from "./digital-metals-admin-ui";

const ENTRY_TYPES = ["OPENING_POSITION", "COMMITMENT", "RECEIPT", "DISPOSAL", "REVERSAL"] as const;

const TYPE_LABELS: Record<string, { label: string; help: string }> = {
  OPENING_POSITION: { label: "Opening position", help: "Metal already in your vault when you start" },
  COMMITMENT: { label: "Commitment", help: "Metal ordered from a supplier" },
  RECEIPT: { label: "Receipt", help: "Metal received against a commitment" },
  DISPOSAL: { label: "Disposal", help: "Metal leaving the vault (e.g. minted coins)" },
  REVERSAL: { label: "Reversal", help: "Undo a wrong entry" },
};

const selectClass =
  "h-10 w-full rounded-xl border border-[#e6dad6] bg-white px-3 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-[#7b0a2b]/15";

function typeLabel(t: unknown) {
  return TYPE_LABELS[String(t)]?.label ?? String(t ?? "").replaceAll("_", " ").toLowerCase();
}

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
  const [createOpen, setCreateOpen] = useState(false);

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

  const listPage = contractPayload(list.data) as { items?: Record<string, unknown>[]; nextCursor?: string | null } | undefined;
  const items = useMemo(() => listPage?.items ?? [], [listPage?.items]);
  const nextCursor = listPage?.nextCursor ?? null;

  const selected = useMemo(() => {
    if (!selectedId) return null;
    const detailRow = contractPayload(detail.data) as Record<string, unknown> | undefined;
    return detailRow ?? items.find((i) => i.id === selectedId);
  }, [detail.data, items, selectedId]);

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
      setCreateOpen(false);
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
        ...(overReceipt ? { overReceiptApprove: true, overReceiptApprovalNote: overReceiptNote } : {}),
      }).unwrap();
      toast.success("Entry approved.");
      list.refetch();
      detail.refetch();
    } catch (err) {
      toastApiError(err);
    }
  }

  const pendingCount = items.filter((i) => i.status === "PENDING_APPROVAL").length;

  return (
    <DmGate loading={ent.loading || list.isLoading} visible={ent.workspaceVisible} message={ent.disabledMessage} title="Procurement">
      <div className="space-y-6" data-testid="digital-metals-procurement">
        <PageHeader
          eyebrow={DM_SECTION}
          icon={BookOpenCheck}
          title="Procurement journal"
          description="Advanced supplier and vault journal — not part of the daily customer workflow. Use Hedge book for live coverage and day-end snapshots."
          actions={
            <>
              <Button variant="outline" asChild className="rounded-xl">
                <Link href="/digital-metals/hedge">
                  <TrendingUp /> Hedge book
                </Link>
              </Button>
              {canWrite ? (
                <Button className="rounded-xl" onClick={() => setCreateOpen(true)}>
                  <Plus /> New entry
                </Button>
              ) : null}
            </>
          }
        />
        {list.isError ? <QueryError error={list.error} onRetry={list.refetch} /> : null}
        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
          <section className="overflow-hidden rounded-[1.15rem] border border-[#e8dcd7] bg-white">
            <FilterBar
              quickViews={
                <QuickViews
                  value={statusFilter || "ALL"}
                  onChange={(v) => {
                    setStatusFilter(v === "ALL" ? "" : v);
                    setCursor(null);
                  }}
                  options={[
                    { value: "ALL", label: "All" },
                    { value: "PENDING_APPROVAL", label: "To approve", count: pendingCount || null },
                    { value: "APPROVED", label: "Approved" },
                  ]}
                  ariaLabel="Entry status"
                />
              }
              filters={
                <FilterSelect
                  label="Type"
                  value={entryTypeFilter || "ALL"}
                  onChange={(v) => {
                    setEntryTypeFilter(v === "ALL" ? "" : v);
                    setCursor(null);
                  }}
                  options={[{ value: "ALL", label: "All types" }, ...ENTRY_TYPES.map((t) => ({ value: t, label: typeLabel(t) }))]}
                  widthClass="min-w-[13rem]"
                />
              }
              resultLabel={`${items.length} entries`}
            />
            {items.length === 0 ? (
              <EmptyState icon={BookOpenCheck} title="No entries" detail="Start with an opening position for metal already in your vault." />
            ) : (
              <ul className="divide-y divide-[#f3eae7]">
                {items.map((row) => {
                  const active = selectedId === String(row.id);
                  return (
                    <li key={String(row.id)}>
                      <button
                        type="button"
                        data-testid={`procurement-entry-${String(row.id)}`}
                        className={cn(
                          "grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-5 py-3.5 text-left transition-colors",
                          active ? "bg-[#fbf1f3]" : "hover:bg-[#fcf6f4]",
                        )}
                        onClick={() => setSelectedId(String(row.id))}
                        aria-pressed={active}
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-[#28161a]">{typeLabel(row.entryType)}</span>
                            <MetalPill metal={String(row.metal)} />
                          </div>
                          <p className="mt-0.5 truncate text-xs text-[#857a7d]">
                            {String(row.effectiveDate)}
                            {row.supplierRef ? ` · ${String(row.supplierRef)}` : ""}
                            {row.billRef ? ` · ${String(row.billRef)}` : ""}
                          </p>
                          {row.entryType === "COMMITMENT" && row.remainingCommitmentUg != null ? (
                            <p className="mt-0.5 text-xs font-medium text-amber-700">
                              {dmWeight(String(row.remainingCommitmentUg))} still to receive
                            </p>
                          ) : null}
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className="font-bold tabular-nums text-[#28161a]">{dmWeight(String(row.quantityUg))}</span>
                          <StatusBadge status={String(row.status)} label={row.status === "PENDING_APPROVAL" ? "To approve" : undefined} />
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
            {nextCursor ? (
              <div className="border-t border-[#efe5e1] bg-[#fbf8f6] px-5 py-3">
                <Button type="button" size="sm" variant="outline" className="rounded-lg" onClick={() => setCursor(nextCursor)}>
                  Load more
                </Button>
              </div>
            ) : null}
          </section>

          <Surface icon={FileText} title={selected ? typeLabel(selected.entryType) : "Entry details"} className="xl:sticky xl:top-[6.5rem]">
            {!selected ? (
              <p className="px-5 py-6 text-sm text-[#7a6d70]">Pick an entry on the left to see who made it, what it links to and approve it.</p>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-2 border-b border-[#f3eae7] px-5 py-3">
                  <StatusBadge status={String(selected.status)} />
                  <MetalPill metal={String(selected.metal)} />
                  <span className="text-lg font-extrabold tabular-nums">{dmWeight(String(selected.quantityUg ?? "0"))}</span>
                </div>
                <InfoList>
                  <InfoRow label="Entry ID">
                    <IdChip>{String(selected.id)}</IdChip>
                  </InfoRow>
                  <InfoRow label="Effective date">{String(selected.effectiveDate ?? "—")}</InfoRow>
                  <InfoRow label="Made by">{String(selected.createdByUserId ?? "—")}</InfoRow>
                  {selected.approvedByUserId ? (
                    <InfoRow label="Approved by">
                      {String(selected.approvedByUserId)}
                      {selected.approvedAt ? <span className="block text-xs font-normal text-[#857a7d]">{new Date(String(selected.approvedAt)).toLocaleString("en-IN")}</span> : null}
                    </InfoRow>
                  ) : null}
                  {selected.supplierRef ? <InfoRow label="Supplier">{String(selected.supplierRef)}</InfoRow> : null}
                  {selected.billRef ? <InfoRow label="Bill / PO">{String(selected.billRef)}</InfoRow> : null}
                  {selected.commitmentEntryId ? (
                    <InfoRow label="Against commitment">
                      <button type="button" className="font-semibold text-[#7b0a2b] underline-offset-2 hover:underline" onClick={() => setSelectedId(String(selected.commitmentEntryId))}>
                        {String(selected.commitmentEntryId)}
                      </button>
                    </InfoRow>
                  ) : null}
                  {selected.reversesEntryId ? (
                    <InfoRow label="Reverses">
                      <button type="button" className="font-semibold text-[#7b0a2b] underline-offset-2 hover:underline" onClick={() => setSelectedId(String(selected.reversesEntryId))}>
                        {String(selected.reversesEntryId)}
                      </button>
                    </InfoRow>
                  ) : null}
                  {(selected.evidenceUploadIds as string[] | undefined)?.length ? (
                    <InfoRow label="Evidence">{(selected.evidenceUploadIds as string[]).join(", ")}</InfoRow>
                  ) : null}
                  {selected.reasonNote ? <InfoRow label="Note">{String(selected.reasonNote)}</InfoRow> : null}
                </InfoList>
                {(selected.relatedEntries as Record<string, unknown>[] | undefined)?.length ? (
                  <div className="border-t border-[#f3eae7] px-5 py-3">
                    <p className="mb-1.5 text-sm font-semibold">Related entries</p>
                    <ul className="space-y-1 text-sm">
                      {(selected.relatedEntries as Record<string, unknown>[]).map((r) => (
                        <li key={String(r.id)}>
                          <button type="button" className="text-[#7b0a2b] underline-offset-2 hover:underline" onClick={() => setSelectedId(String(r.id))}>
                            {typeLabel(r.entryType)} · {dmWeight(String(r.quantityUg))}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {canApprove && selected.status === "PENDING_APPROVAL" ? (
                  <div className="space-y-3 border-t border-[#f3eae7] bg-[#fcf9f8] px-5 py-4">
                    <label className="block space-y-1.5">
                      <span className="text-sm font-medium text-[#4f3d41]">Over-receipt note (only if more arrived than committed)</span>
                      <Input value={overReceiptNote} onChange={(e) => setOverReceiptNote(e.target.value)} className="h-10 rounded-xl" />
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" className="rounded-xl" disabled={approveState.isLoading} onClick={() => void submitApprove(false)}>
                        Approve
                      </Button>
                      <Button type="button" variant="outline" className="rounded-xl" disabled={approveState.isLoading} onClick={() => void submitApprove(true)}>
                        Approve with over-receipt
                      </Button>
                    </div>
                  </div>
                ) : null}
              </>
            )}
          </Surface>
        </div>

        {canWrite ? (
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogContent className={cn(dialogScrollShellClass, "sm:max-w-2xl")}>
              <DialogBody>
                <DialogHeader className="mb-5">
                  <DialogTitle>New procurement entry</DialogTitle>
                  <DialogDescription>It stays pending until someone else approves it.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 pb-6 sm:grid-cols-2">
                  <label className="block space-y-1.5 sm:col-span-2">
                    <span className="text-sm font-medium text-[#4f3d41]">Type</span>
                    <select
                      className={selectClass}
                      value={form.entryType}
                      onChange={(e) => setForm((f) => ({ ...f, entryType: e.target.value as (typeof ENTRY_TYPES)[number] }))}
                    >
                      {ENTRY_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {TYPE_LABELS[t].label} — {TYPE_LABELS[t].help}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block space-y-1.5">
                    <span className="text-sm font-medium text-[#4f3d41]">Metal</span>
                    <select className={selectClass} value={form.metal} onChange={(e) => setForm((f) => ({ ...f, metal: e.target.value }))}>
                      <option value="GOLD">Gold</option>
                      <option value="SILVER">Silver</option>
                    </select>
                  </label>
                  <label className="block space-y-1.5">
                    <span className="text-sm font-medium text-[#4f3d41]">Fineness (ppm)</span>
                    <Input value={form.finenessPpm} onChange={(e) => setForm((f) => ({ ...f, finenessPpm: e.target.value }))} className="h-10 rounded-xl" />
                  </label>
                  <label className="block space-y-1.5">
                    <span className="text-sm font-medium text-[#4f3d41]">Quantity (grams)</span>
                    <Input value={form.quantityGrams} onChange={(e) => setForm((f) => ({ ...f, quantityGrams: e.target.value }))} className="h-10 rounded-xl" />
                  </label>
                  <label className="block space-y-1.5">
                    <span className="text-sm font-medium text-[#4f3d41]">Effective date (IST)</span>
                    <Input type="date" value={form.effectiveDate} onChange={(e) => setForm((f) => ({ ...f, effectiveDate: e.target.value }))} className="h-10 rounded-xl" />
                  </label>
                  <label className="block space-y-1.5">
                    <span className="text-sm font-medium text-[#4f3d41]">Supplier reference</span>
                    <Input value={form.supplierRef} onChange={(e) => setForm((f) => ({ ...f, supplierRef: e.target.value }))} className="h-10 rounded-xl" />
                  </label>
                  <label className="block space-y-1.5">
                    <span className="text-sm font-medium text-[#4f3d41]">Bill / PO reference</span>
                    <Input value={form.billRef} onChange={(e) => setForm((f) => ({ ...f, billRef: e.target.value }))} className="h-10 rounded-xl" />
                  </label>
                  <label className="block space-y-1.5">
                    <span className="text-sm font-medium text-[#4f3d41]">Commitment ID (for receipts)</span>
                    <Input value={form.commitmentEntryId} onChange={(e) => setForm((f) => ({ ...f, commitmentEntryId: e.target.value }))} className="h-10 rounded-xl" />
                  </label>
                  <label className="block space-y-1.5">
                    <span className="text-sm font-medium text-[#4f3d41]">Reverses entry ID</span>
                    <Input value={form.reversesEntryId} onChange={(e) => setForm((f) => ({ ...f, reversesEntryId: e.target.value }))} className="h-10 rounded-xl" />
                  </label>
                  <label className="block space-y-1.5 sm:col-span-2">
                    <span className="text-sm font-medium text-[#4f3d41]">Evidence upload IDs (comma-separated)</span>
                    <Input value={form.evidenceUploadIds} onChange={(e) => setForm((f) => ({ ...f, evidenceUploadIds: e.target.value }))} className="h-10 rounded-xl" />
                  </label>
                  <label className="block space-y-1.5 sm:col-span-2">
                    <span className="text-sm font-medium text-[#4f3d41]">Reason / notes</span>
                    <Input value={form.reasonNote} onChange={(e) => setForm((f) => ({ ...f, reasonNote: e.target.value }))} className="h-10 rounded-xl" />
                  </label>
                </div>
              </DialogBody>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                  Cancel
                </Button>
                <Button type="button" disabled={createState.isLoading} onClick={() => void submitCreate()}>
                  Submit for approval
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        ) : null}
      </div>
    </DmGate>
  );
}
