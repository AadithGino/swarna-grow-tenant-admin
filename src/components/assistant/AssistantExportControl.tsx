"use client";

import { Download, FileSpreadsheet, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { useAppSelector } from "@/src/store/hooks";
import { postAuthorizedDownload } from "@/src/lib/download-api";
import { hasPermission } from "@/src/lib/permissions";
import type { AssistantExportSource } from "@/src/types/assistant";

type ExportFormat = "CSV" | "XLSX";

/** Map chat table column keys to export field names when they differ (legacy router answers). */
const TABLE_KEY_TO_EXPORT_FIELD: Record<string, string> = {
  customer: "customerId",
  scheme: "schemeId",
  branch: "branchId",
  receipt: "receiptNumber",
  paidAt: "paidAt",
  value: "total",
  label: "label",
  payments: "count",
};

function exportFieldForTableKey(key: string, allowed: Set<string>): string | null {
  if (allowed.has(key)) return key;
  const mapped = TABLE_KEY_TO_EXPORT_FIELD[key];
  if (mapped && allowed.has(mapped)) return mapped;
  return null;
}

function exportFields(source: AssistantExportSource): string[] {
  const options = source.exportable;
  if (options && "fields" in options) return options.fields;
  if (options && "columns" in options) return options.columns;
  return (source.table?.columns ?? []).map((column) => column.key);
}

function defaultSelectedFields(source: AssistantExportSource): string[] {
  const tableKeys = (source.table?.columns ?? []).map((c) => c.key);
  const allowedList = exportFields(source);
  const allowed = new Set(allowedList);
  if (!tableKeys.length) return [...allowedList].slice(0, 8);
  const picked = tableKeys
    .map((k) => exportFieldForTableKey(k, allowed))
    .filter((k): k is string => Boolean(k));
  return picked.length ? picked : [...allowedList].slice(0, 8);
}

function triggerBrowserDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function AssistantExportControl({
  source,
  vizHint,
}: {
  source: AssistantExportSource;
  vizHint?: string;
}) {
  const user = useAppSelector((s) => s.session.session?.user);
  const canExport = hasPermission(user, "report.export");
  const [open, setOpen] = useState(false);
  const [format, setFormat] = useState<ExportFormat>("XLSX");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const labelByKey = useMemo(
    () => new Map((source.table?.columns ?? []).map((c) => [c.key, c.label])),
    [source.table],
  );
  const fieldOptions = useMemo(
    () => exportFields(source).map((key) => ({ key, label: labelByKey.get(key) ?? key })),
    [source, labelByKey],
  );
  const [selected, setSelected] = useState<string[]>(() => defaultSelectedFields(source));

  if (!canExport) return null;
  if (!source.table?.rows?.length && !source.exportable) return null;
  if (!source.action) return null;
  if (vizHint === "clarify" || vizHint === "unsupported") return null;

  const toggleField = (key: string) => {
    setSelected((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  };

  const runExport = async () => {
    if (!selected.length) {
      setError("Pick at least one field.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await postAuthorizedDownload("/admin/assistant/export", {
        action: source.action,
        fields: selected,
        format,
      });
      if (result.exportJob) {
        setError("Report export queued — open Exports to download when ready.");
        return;
      }
      const ext = format === "XLSX" ? "xlsx" : "csv";
      triggerBrowserDownload(result.blob, result.filename ?? `sidekick-export-${Date.now()}.${ext}`);
      setOpen(false);
    } catch (e) {
      const err = e as { data?: { message?: string; error?: { message?: string } } };
      setError(
        err?.data?.error?.message ??
          err?.data?.message ??
          (typeof err?.data === "string" ? err.data : null) ??
          "Export failed — check you are signed in and the API is running.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition",
          open
            ? "border-[var(--sk-maroon)] bg-[var(--sk-maroon)] text-white"
            : "border-[var(--sk-line-2)] bg-white text-[var(--sk-ink-2)] hover:border-[var(--sk-maroon)] hover:text-[var(--sk-maroon)]",
        )}
      >
        <Download className="size-3.5" />
        Export
      </button>
      {open ? (
        <div
          className="sk-pop absolute bottom-full right-0 z-30 mb-2 w-64 rounded-xl border border-[var(--sk-line)] bg-white p-3 text-left shadow-[var(--sk-shadow)]"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="flex items-center gap-1.5 text-xs font-semibold text-[var(--sk-ink)]">
            <FileSpreadsheet className="size-3.5 text-[var(--sk-maroon)]" />
            Columns to export
          </p>
          <div className="mt-2 max-h-40 space-y-1 overflow-y-auto pr-1">
            {fieldOptions.map((f) => (
              <label key={f.key} className="flex cursor-pointer items-center gap-2 text-xs text-[var(--sk-ink-2)]">
                <input
                  type="checkbox"
                  className="accent-[#730321]"
                  checked={selected.includes(f.key)}
                  onChange={() => toggleField(f.key)}
                />
                {f.label}
              </label>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-1 rounded-lg bg-[var(--sk-cream-2)] p-1">
            {(["XLSX", "CSV"] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFormat(f)}
                className={cn(
                  "rounded-md py-1 text-xs font-semibold",
                  format === f ? "bg-white text-[var(--sk-maroon)] shadow-sm" : "text-[var(--sk-muted)]",
                )}
              >
                {f === "XLSX" ? "Excel" : "CSV"}
              </button>
            ))}
          </div>
          {error ? <p className="mt-2 text-xs text-[var(--sk-bad)]">{error}</p> : null}
          <button
            type="button"
            disabled={busy}
            onClick={() => void runExport()}
            className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-gradient-to-br from-[var(--sk-maroon-2)] to-[var(--sk-maroon)] px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
          >
            {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
            {busy ? "Exporting…" : "Download"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
