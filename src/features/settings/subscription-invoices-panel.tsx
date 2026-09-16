"use client";

import { useCallback, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileText,
  IndianRupee,
  Loader2,
  Receipt,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DataTable, type DataColumn } from "@/src/components/common/data-table";
import { StatCard, Surface } from "@/src/components/common/page-parts";
import { StatusBadge } from "@/src/components/common/status-badge";
import { cn } from "@/lib/utils";
import { money } from "@/src/lib/format";
import { downloadBlobUrl } from "@/src/lib/download";
import { useLazyDownloadSubscriptionInvoiceQuery } from "@/src/store/api/admin-api";

export type SubscriptionInvoiceRow = {
  id: string;
  number: string;
  periodLabel: string;
  amountDisplay: string;
  amountPaise: number;
  status: string;
  paidAt: string | null;
  dueDate: string | null;
  sortAt: number;
};

type InvoiceFilter = "ALL" | "PAID" | "OPEN";

function paiseFromAmount(amount: unknown): number {
  if (!amount || typeof amount !== "object") return 0;
  const p = (amount as { amountPaise?: number }).amountPaise;
  return typeof p === "number" ? p : 0;
}

function displayFromAmount(amount: unknown): string {
  if (!amount || typeof amount !== "object") return "—";
  const d = (amount as { amountDisplay?: string }).amountDisplay;
  return d?.trim() ? d : "—";
}

function formatWhen(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function normalizeInvoice(raw: Record<string, unknown>): SubscriptionInvoiceRow {
  const amount = raw.amount;
  const paidAt = raw.paidAt ? String(raw.paidAt) : null;
  const createdAt = raw.createdAt ? String(raw.createdAt) : null;
  const sortSource = paidAt ?? createdAt;
  const sortAt = sortSource ? new Date(sortSource).getTime() : 0;
  return {
    id: String(raw.id ?? ""),
    number: String(raw.number ?? "—"),
    periodLabel: String(raw.periodLabel ?? raw.dueDate ?? "—"),
    amountDisplay: displayFromAmount(amount),
    amountPaise: paiseFromAmount(amount),
    status: String(raw.status ?? "ISSUED").toUpperCase(),
    paidAt,
    dueDate: raw.dueDate ? String(raw.dueDate) : null,
    sortAt,
  };
}

const FILTER_OPTIONS: { key: InvoiceFilter; label: string }[] = [
  { key: "ALL", label: "All" },
  { key: "PAID", label: "Paid" },
  { key: "OPEN", label: "Open" },
];

export function SubscriptionInvoicesPanel({
  invoices,
  isLoading,
  isError,
  onRetry,
}: {
  invoices: Record<string, unknown>[];
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
}) {
  const [filter, setFilter] = useState<InvoiceFilter>("ALL");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [fetchInvoicePdf] = useLazyDownloadSubscriptionInvoiceQuery();

  const downloadInvoice = useCallback(
    async (row: SubscriptionInvoiceRow) => {
      if (!row.id || downloadingId) return;
      setDownloadingId(row.id);
      try {
        const result = await fetchInvoicePdf({
          invoiceId: row.id,
          filename: `${row.number.replace(/[^\w.-]+/g, "_")}.pdf`,
        }).unwrap();
        downloadBlobUrl(result.filename, result.blobUrl);
        toast.success("Invoice download started");
      } catch {
        toast.error("Could not download invoice");
      } finally {
        setDownloadingId(null);
      }
    },
    [downloadingId, fetchInvoicePdf],
  );

  const columns = useMemo((): DataColumn<SubscriptionInvoiceRow>[] => {
    return [
      {
        key: "number",
        header: "Invoice",
        render: (row) => (
          <div className="flex items-start gap-3">
            <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg bg-[#f7ecee] text-[#7b0a2b]">
              <Receipt className="size-4" aria-hidden />
            </span>
            <div className="min-w-0">
              <div className="font-mono text-sm font-semibold text-[#28161a]">
                {row.number}
              </div>
              <div className="text-xs text-muted-foreground">
                Platform subscription
              </div>
            </div>
          </div>
        ),
      },
      {
        key: "period",
        header: "Billing period",
        render: (row) => (
          <span className="font-medium text-[#3d2a2e]">{row.periodLabel}</span>
        ),
      },
      {
        key: "amount",
        header: "Amount",
        className: "text-right",
        render: (row) => (
          <span className="font-semibold tabular-nums">{row.amountDisplay}</span>
        ),
      },
      {
        key: "status",
        header: "Status",
        render: (row) => <StatusBadge status={row.status} />,
      },
      {
        key: "date",
        header: "Paid / due",
        render: (row) => {
          if (row.status === "PAID") {
            return (
              <div className="text-sm">
                <div className="font-medium text-emerald-800">Paid</div>
                <div className="text-muted-foreground">
                  {formatWhen(row.paidAt)}
                </div>
              </div>
            );
          }
          if (row.status === "VOID") {
            return <span className="text-sm text-muted-foreground">Voided</span>;
          }
          return (
            <div className="text-sm">
              <div className="font-medium text-amber-800">Due</div>
              <div className="text-muted-foreground">
                {row.dueDate ?? row.periodLabel}
              </div>
            </div>
          );
        },
      },
      {
        key: "actions",
        header: "",
        className: "w-[140px] text-right",
        render: (row) => {
          const busy = downloadingId === row.id;
          return (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              disabled={!row.id || busy}
              onClick={(event) => {
                event.stopPropagation();
                void downloadInvoice(row);
              }}
            >
              {busy ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
              ) : (
                <Download className="size-3.5" aria-hidden />
              )}
              PDF
            </Button>
          );
        },
      },
    ];
  }, [downloadInvoice, downloadingId]);

  const rows = useMemo(() => {
    const normalized = invoices.map(normalizeInvoice).sort((a, b) => b.sortAt - a.sortAt);
    if (filter === "PAID") return normalized.filter((r) => r.status === "PAID");
    if (filter === "OPEN") {
      return normalized.filter((r) =>
        ["ISSUED", "DRAFT"].includes(r.status),
      );
    }
    return normalized;
  }, [invoices, filter]);

  const stats = useMemo(() => {
    const all = invoices.map(normalizeInvoice);
    let paidPaise = 0;
    let openPaise = 0;
    let openCount = 0;
    let paidCount = 0;
    let lastPaid: SubscriptionInvoiceRow | undefined;
    for (const row of all) {
      if (row.status === "PAID") {
        paidPaise += row.amountPaise;
        paidCount += 1;
        if (!lastPaid || row.sortAt > lastPaid.sortAt) lastPaid = row;
      } else if (row.status === "ISSUED" || row.status === "DRAFT") {
        openPaise += row.amountPaise;
        openCount += 1;
      }
    }
    return {
      paidPaise,
      openPaise,
      openCount,
      paidCount,
      total: all.length,
      lastPaid,
    };
  }, [invoices]);

  return (
    <Surface
      title="Invoices"
      description="GST-compliant platform billing for your Swarna Grow subscription"
    >
      {isLoading ? (
        <p className="p-6 text-sm text-muted-foreground">Loading invoices…</p>
      ) : isError ? (
        <div className="flex flex-wrap items-center gap-3 p-6 text-sm text-red-700">
          Could not load invoices.
          {onRetry ? (
            <Button type="button" variant="outline" size="sm" onClick={onRetry}>
              Retry
            </Button>
          ) : null}
        </div>
      ) : (
        <>
          {stats.openCount > 0 ? (
            <div className="flex flex-wrap items-start gap-3 border-b border-[#eaded9] bg-[#fff8e8] px-6 py-4 text-sm text-[#805817]">
              <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
              <div>
                <strong>
                  {stats.openCount} open invoice{stats.openCount === 1 ? "" : "s"}
                </strong>{" "}
                totalling {money(stats.openPaise / 100)}. The platform team will
                share payment instructions or mark invoices paid after settlement.
              </div>
            </div>
          ) : null}

          <div className="grid gap-4 border-b border-[#eaded9] p-6 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              icon={FileText}
              label="Invoices"
              value={String(stats.total)}
              detail="On this account"
              tone="cream"
            />
            <StatCard
              icon={CheckCircle2}
              label="Paid"
              value={String(stats.paidCount)}
              detail={
                stats.paidPaise > 0
                  ? `${money(stats.paidPaise / 100)} settled`
                  : "No payments yet"
              }
              tone="green"
            />
            <StatCard
              icon={AlertCircle}
              label="Open"
              value={String(stats.openCount)}
              detail={
                stats.openPaise > 0
                  ? `${money(stats.openPaise / 100)} outstanding`
                  : "All caught up"
              }
              tone={stats.openCount > 0 ? "gold" : "green"}
            />
            <StatCard
              icon={IndianRupee}
              label="Last payment"
              value={stats.lastPaid?.amountDisplay ?? "—"}
              detail={
                stats.lastPaid ? formatWhen(stats.lastPaid.paidAt) : "—"
              }
              tone="wine"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#eaded9] px-6 py-3">
            <div className="flex flex-wrap gap-2">
              {FILTER_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setFilter(opt.key)}
                  className={cn(
                    "rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors",
                    filter === opt.key
                      ? "bg-[#730321] text-white"
                      : "bg-[#f3eef0] text-[#5c4a4e] hover:bg-[#eaded9]",
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Tax invoices are issued by Swarna Grow platform billing.
            </p>
          </div>

          <div className="overflow-x-auto">
            {rows.length === 0 ? (
              <p className="p-8 text-center text-sm text-muted-foreground">
                {filter === "ALL"
                  ? "No invoices yet. Monthly platform charges will appear here after billing runs."
                  : `No ${filter === "PAID" ? "paid" : "open"} invoices in this view.`}
              </p>
            ) : (
              <DataTable
                columns={columns}
                rows={rows}
                emptyTitle="No invoices"
              />
            )}
          </div>
        </>
      )}
    </Surface>
  );
}
