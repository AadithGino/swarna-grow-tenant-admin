"use client";

import type { ReactNode } from "react";
import {
  AlertTriangle,
  Building2,
  Clock3,
  Smartphone,
  Store,
  UserRound,
} from "lucide-react";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
  dialogScrollShellClass,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { QueryError } from "@/src/components/common/query-state";
import { DetailRecordTabsHeader } from "@/src/components/common/page-parts";
import { StatusBadge } from "@/src/components/common/status-badge";
import { money } from "@/src/lib/format";
import { useGetHandoverQuery } from "@/src/store/api/admin-api";
import type { CashHandoverDetail } from "@/src/types/domain";
import { cn } from "@/lib/utils";
import { ReceiptLink } from "@/src/components/common/portal-entity-links";

export function HandoverDetailDialog({
  handoverId,
  open,
  onOpenChange,
}: {
  handoverId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const query = useGetHandoverQuery(handoverId ?? "", { skip: !handoverId });
  const d = query.data;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(dialogScrollShellClass, "gap-0 p-0 sm:max-w-3xl")}
      >
        {query.isLoading && (
          <DialogBody className="space-y-4 p-6">
            <Skeleton className="h-28 rounded-2xl" />
            <Skeleton className="h-20 rounded-xl" />
            <Skeleton className="h-48 rounded-xl" />
          </DialogBody>
        )}
        {query.isError && (
          <DialogBody className="p-6">
            <QueryError error={query.error} onRetry={query.refetch} />
          </DialogBody>
        )}
        {d && (
          <>
            <HandoverHero d={d} />
            <DialogBody className="space-y-6 pb-6 pt-5">
              {d.declared !== d.systemAmount && (
                <div className="flex gap-3 rounded-xl border border-amber-200/80 bg-gradient-to-r from-amber-50 to-[#fff9f4] px-4 py-3 text-sm text-amber-950">
                  <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-700" />
                  <div>
                    <strong>Declared amount differs from system</strong>
                    <p className="mt-0.5 text-amber-900/85">
                      System {money(d.systemAmount)} · Declared{" "}
                      {money(d.declared)} (
                      {d.declared < d.systemAmount ? "short" : "over"} by{" "}
                      {money(Math.abs(d.declared - d.systemAmount))})
                    </p>
                  </div>
                </div>
              )}
              {d.remarks && (
                <p className="rounded-xl border border-[#e8dde2] bg-[#fbf8f5] px-4 py-3 text-sm leading-relaxed text-[#5c4a4e]">
                  <span className="font-semibold text-[#2d191d]">Note · </span>
                  {d.remarks}
                </p>
              )}
              <div className="grid gap-5 lg:grid-cols-[1fr_1.1fr]">
                <div className="space-y-5">
                  <section>
                    <DetailRecordTabsHeader label="Activity" />
                    <ol className="space-y-0 rounded-xl border border-[#eaded9] bg-[#faf7f5] p-4">
                      {(d.timeline ?? []).length === 0 ? (
                        <li className="px-1 py-2 text-sm text-muted-foreground">
                          No activity recorded yet.
                        </li>
                      ) : (
                        (d.timeline ?? []).map((ev, i) => (
                        <li
                          key={i}
                          className={cn(
                            "relative flex gap-3 pb-4 last:pb-0",
                            i < (d.timeline?.length ?? 0) - 1 &&
                              "border-b border-[#eaded9]/80 mb-4 last:mb-0 last:border-0",
                          )}
                        >
                          <span
                            className={cn(
                              "mt-1 flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                              i === (d.timeline?.length ?? 0) - 1
                                ? "bg-[#730321] text-white"
                                : "bg-white text-[#730321] ring-1 ring-[#eaded9]",
                            )}
                          >
                            {i + 1}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-[#2d191d]">
                              {formatEvent(ev.event)}
                            </p>
                            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-[#776a6d]">
                              <Clock3 className="size-3.5" />
                              {ev.at}
                              <span aria-hidden>·</span>
                              {ev.by}
                            </p>
                            {ev.note && (
                              <p className="mt-2 rounded-lg bg-white/80 px-2.5 py-1.5 text-xs text-[#5c4a4e]">
                                {ev.note}
                              </p>
                            )}
                          </div>
                        </li>
                        ))
                      )}
                    </ol>
                  </section>
                  {d.coversFrom && (
                    <section>
                      <DetailRecordTabsHeader label="Coverage window" />
                      <p className="rounded-xl border border-[#eaded9] bg-white px-4 py-3 text-sm text-[#5c4a4e]">
                        {d.coversFrom}
                        <span className="mx-2 text-[#9a8a8e]">→</span>
                        {d.coversUntil ?? "—"}
                      </p>
                    </section>
                  )}
                </div>
                <div className="space-y-5">
                  <section>
                    <DetailRecordTabsHeader label="Cash receipts" />
                    <ul className="max-h-56 overflow-y-auto rounded-xl border border-[#eaded9] bg-white">
                      {(d.paymentLines ?? []).length === 0 ? (
                        <li className="px-4 py-3 text-sm text-muted-foreground">
                          No linked cash receipts on this handover.
                        </li>
                      ) : (
                        (d.paymentLines ?? []).map((p, i) => (
                        <li
                          key={p.id}
                          className={cn(
                            "flex items-center justify-between gap-3 px-4 py-3 text-sm",
                            i > 0 && "border-t border-[#f0e8e4]",
                          )}
                        >
                          <div className="min-w-0">
                            <p className="font-semibold text-[#2d191d]">
                              <ReceiptLink paymentId={p.id} receiptNo={p.receiptNo}>
                                {p.receiptNo}
                              </ReceiptLink>
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {p.customer}
                            </p>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="font-bold text-[#730321]">
                              {money(p.amount)}
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              {p.paidAt}
                            </p>
                          </div>
                        </li>
                        ))
                      )}
                    </ul>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {(d.paymentLines ?? []).length} receipt
                      {(d.paymentLines ?? []).length === 1 ? "" : "s"} ·{" "}
                      {money(
                        (d.paymentLines ?? []).reduce((s, p) => s + p.amount, 0),
                      )}{" "}
                      total
                    </p>
                  </section>
                  {d.denominations && d.denominations.length > 0 && (
                    <section>
                      <DetailRecordTabsHeader label="Denominations" />
                      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                        {d.denominations.map((den) => (
                          <div
                            key={den.denomination}
                            className="rounded-lg border border-[#eaded9] bg-[#fbf8f5] px-2 py-2 text-center"
                          >
                            <p className="text-xs font-medium text-[#776a6d]">
                              ₹{den.denomination}
                            </p>
                            <p className="text-lg font-bold text-[#2d191d]">
                              ×{den.count}
                            </p>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}
                </div>
              </div>
            </DialogBody>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function HandoverHero({ d }: { d: CashHandoverDetail }) {
  const isStaff = d.initiatedBy === "STAFF";
  const SourceIcon = isStaff ? Smartphone : Store;

  return (
    <div className="border-b border-[#eaded9] bg-gradient-to-br from-[#fff9f4] via-white to-[#fdf5f7] px-6 pb-5 pt-6">
      <DialogHeader className="space-y-4 text-left">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#9a6f2a]">
              Cash submission
            </p>
            <DialogTitle className="mt-1 text-2xl tracking-tight">
              {d.handoverNo}
            </DialogTitle>
          </div>
          <StatusBadge status={d.status} />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#eaded9] bg-white px-3 py-1 text-xs font-medium text-[#5c4a4e]">
            <SourceIcon className="size-3.5 text-[#730321]" />
            {isStaff ? "Staff app" : "Branch counter"}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#eaded9] bg-white px-3 py-1 text-xs font-medium text-[#5c4a4e]">
            <UserRound className="size-3.5" />
            {d.staff}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#eaded9] bg-white px-3 py-1 text-xs font-medium text-[#5c4a4e]">
            <Building2 className="size-3.5" />
            {d.branch}
          </span>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <AmountTile label="System amount" value={money(d.systemAmount)} primary />
          <AmountTile label="Declared" value={money(d.declared)} />
          <AmountTile
            label="Receipts"
            value={String(d.payments)}
            sub={d.submittedAt}
          />
        </div>
        {d.acceptedBy && (
          <p className="text-xs text-[#776a6d]">
            Accepted by <strong className="text-[#2d191d]">{d.acceptedBy}</strong>
          </p>
        )}
      </DialogHeader>
    </div>
  );
}

function AmountTile({
  label,
  value,
  sub,
  primary,
}: {
  label: string;
  value: ReactNode;
  sub?: string;
  primary?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border px-4 py-3",
        primary
          ? "border-[#730321]/20 bg-[#730321]/5"
          : "border-[#eaded9] bg-white/80",
      )}
    >
      <p className="text-[11px] font-semibold uppercase tracking-wide text-[#776a6d]">
        {label}
      </p>
      <p
        className={cn(
          "mt-0.5 font-bold tracking-tight text-[#2d191d]",
          primary ? "text-xl text-[#730321]" : "text-lg",
        )}
      >
        {value}
      </p>
      {sub && (
        <p className="mt-1 text-[11px] text-muted-foreground">{sub}</p>
      )}
    </div>
  );
}

function formatEvent(event: string) {
  return event
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/^\w/, (c) => c.toUpperCase());
}
