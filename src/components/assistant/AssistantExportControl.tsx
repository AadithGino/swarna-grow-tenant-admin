"use client";

import { useMemo, useState } from "react";
import { useAppSelector } from "@/src/store/hooks";
import { postAuthorizedDownload } from "@/src/lib/download-api";
import { hasPermission } from "@/src/lib/permissions";
import type { AssistantBundle } from "@/src/types/assistant";

type ExportFormat = "CSV" | "XLSX";

/** Map chat table column keys to export field names when they differ. */
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

function defaultSelectedFields(bundle: AssistantBundle): string[] {
  const tableKeys = (bundle.table?.columns ?? []).map((c) => c.key);
  const allowedList =
    bundle.exportable?.fields ??
    bundle.exportable?.columns ??
    tableKeys;
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

export function AssistantExportControl({ bundle }: { bundle: AssistantBundle }) {
  const user = useAppSelector((s) => s.session.session?.user);
  const canExport = hasPermission(user, "report.export");
  const [open, setOpen] = useState(false);
  const [format, setFormat] = useState<ExportFormat>("XLSX");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fieldOptions = useMemo(() => {
    if (bundle.exportable?.fields?.length) {
      return bundle.exportable.fields.map((key) => ({ key, label: key }));
    }
    if (bundle.exportable?.columns?.length) {
      return bundle.exportable.columns.map((key) => ({ key, label: key }));
    }
    return (bundle.table?.columns ?? []).map((c) => ({
      key: c.key,
      label: c.label,
    }));
  }, [bundle]);

  const [selected, setSelected] = useState<string[]>(() =>
    defaultSelectedFields(bundle),
  );

  if (!canExport) {
    return (
      <span className="text-[0.65rem] text-[#807478]">
        Export needs report.export permission.
      </span>
    );
  }
  if (!bundle.table?.rows?.length && !bundle.exportable) return null;
  if (!bundle.action) {
    return (
      <span className="text-[0.65rem] text-[#807478]">
        Re-run this question to enable Export.
      </span>
    );
  }
  if (bundle.vizHint === "clarify" || bundle.vizHint === "unsupported") {
    return null;
  }

  const toggleField = (key: string) => {
    setSelected((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
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
        action: bundle.action,
        fields: selected,
        format,
      });
      if (result.exportJob) {
        setError("Report export queued — open Exports to download when ready.");
        return;
      }
      const ext = format === "XLSX" ? "xlsx" : "csv";
      const name =
        result.filename ?? `sidekick-export-${Date.now()}.${ext}`;
      triggerBrowserDownload(result.blob, name);
      setOpen(false);
    } catch (e) {
      const err = e as { data?: { message?: string; error?: { message?: string } } };
      const msg =
        err?.data?.error?.message ??
        err?.data?.message ??
        (typeof err?.data === "string" ? err.data : null) ??
        "Export failed — check you are signed in and the API is running.";
      setError(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="w-full shrink-0 sm:w-auto sm:min-w-[12rem]">
      <button
        type="button"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="rounded-lg border border-[#d4c4bc] bg-white px-3 py-1.5 text-xs font-semibold text-[#5c4a4e] shadow-sm hover:bg-[#faf7f5]"
      >
        {open ? "Close export" : "Export"}
      </button>
      {open ? (
        <div
          className="mt-2 w-full min-w-[16rem] rounded-xl border border-[#eaded9] bg-white p-3 shadow-md"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-xs font-semibold text-[#28161a]">Fields</p>
          <div className="mt-2 max-h-40 space-y-1 overflow-y-auto">
            {fieldOptions.map((f) => (
              <label
                key={f.key}
                className="flex cursor-pointer items-center gap-2 text-xs text-[#3d2a2f]"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(f.key)}
                  onChange={() => toggleField(f.key)}
                />
                {f.label}
              </label>
            ))}
          </div>
          <p className="mt-3 text-xs font-semibold text-[#28161a]">Format</p>
          <div className="mt-1 flex gap-2">
            {(["CSV", "XLSX"] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFormat(f)}
                className={`rounded-md px-2 py-1 text-xs font-medium ${
                  format === f
                    ? "bg-[#9a6f2a] text-white"
                    : "bg-[#f3ebe6] text-[#5c4a4e]"
                }`}
              >
                {f === "XLSX" ? "Excel" : "CSV"}
              </button>
            ))}
          </div>
          {error ? (
            <p className="mt-2 text-xs text-red-700">{error}</p>
          ) : null}
          <button
            type="button"
            disabled={busy}
            onClick={() => void runExport()}
            className="mt-3 w-full rounded-lg bg-[#28161a] px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
          >
            {busy ? "Exporting…" : "Download"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
