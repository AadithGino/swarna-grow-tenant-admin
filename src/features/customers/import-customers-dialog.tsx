"use client";

import { Loader2, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  importRowApiErrorMessage,
  parseCustomerImportCsv,
  summarizeCustomerImport,
  validateCustomerImportRows,
  type CustomerImportRow,
} from "@/src/lib/customer-import";
import { cn } from "@/lib/utils";
import { useCreateCustomerMutation } from "@/src/store/api/admin-api";

type RowImportStatus = "pending" | "ok" | "failed";

type PreviewRow = CustomerImportRow & {
  importStatus?: RowImportStatus;
  importMessage?: string;
};

export function ImportCustomersDialog({
  open,
  onOpenChange,
  branchCodeToId,
  requireBranch,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branchCodeToId: Map<string, string>;
  requireBranch: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [createCustomer] = useCreateCustomerMutation();
  const [busy, setBusy] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [rows, setRows] = useState<PreviewRow[]>([]);

  const { validCount, invalidCount } = summarizeCustomerImport(rows);

  useEffect(() => {
    if (!open) {
      setRows([]);
      setFileName(null);
      setBusy(false);
    }
  }, [open]);

  async function handleFile(file: File) {
    const text = await file.text();
    const { rows: rawRows } = parseCustomerImportCsv(text);
    if (!rawRows.length) {
      toast.error(
        "No data rows found. Use columns: name, mobile, branchCode, email",
      );
      setRows([]);
      setFileName(null);
      return;
    }
    const validated = validateCustomerImportRows(rawRows, {
      branchCodeToId,
      requireBranch,
    });
    setFileName(file.name);
    setRows(validated);
    const { validCount: ok, invalidCount: bad } =
      summarizeCustomerImport(validated);
    if (bad && ok) {
      toast.message(`${ok} row${ok === 1 ? "" : "s"} ready; ${bad} need fixes`);
    } else if (bad && !ok) {
      toast.error(`All ${bad} row${bad === 1 ? "" : "s"} have validation errors`);
    }
  }

  async function runImport() {
    const toImport = rows.filter((r) => r.valid);
    if (!toImport.length) {
      toast.error("Fix row errors or choose a different file.");
      return;
    }
    setBusy(true);
    let ok = 0;
    let failed = 0;
    const nextRows = [...rows];

    for (let i = 0; i < nextRows.length; i += 1) {
      const row = nextRows[i];
      if (!row.valid) continue;
      nextRows[i] = { ...row, importStatus: "pending", importMessage: undefined };
      setRows([...nextRows]);

      try {
        await createCustomer({
          name: row.name.trim(),
          phone: row.mobile,
          email: row.email.trim() || undefined,
          branchId: row.branchId,
        }).unwrap();
        ok += 1;
        nextRows[i] = {
          ...nextRows[i],
          importStatus: "ok",
          importMessage: "Imported",
        };
      } catch (err) {
        failed += 1;
        nextRows[i] = {
          ...nextRows[i],
          importStatus: "failed",
          importMessage: importRowApiErrorMessage(err),
        };
      }
      setRows([...nextRows]);
    }

    setBusy(false);
    if (ok) toast.success(`Imported ${ok} customer${ok === 1 ? "" : "s"}`);
    if (failed) {
      toast.error(
        `${failed} row${failed === 1 ? "" : "s"} failed — see messages below`,
      );
    }
    if (failed === 0 && invalidCount === 0) {
      onOpenChange(false);
    }
  }

  const showPreview = rows.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogBody>
          <DialogHeader>
            <DialogTitle>Import customers</DialogTitle>
            <DialogDescription>
              CSV columns: name, mobile, optional branch code, optional email.
              First row may be a header. Each row is checked before import.
              {requireBranch
                ? " Branch code is required for every row when you have branches."
                : null}
            </DialogDescription>
          </DialogHeader>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) void handleFile(file);
            }}
          />
          <Button
            type="button"
            variant="outline"
            className="mt-2 w-full"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            {busy ? <Loader2 className="animate-spin" /> : <Upload />}
            {fileName ? `Replace file (${fileName})` : "Choose CSV file"}
          </Button>

          {showPreview ? (
            <div className="mt-4 space-y-2">
              <p className="text-sm text-muted-foreground">
                {validCount} ready
                {invalidCount
                  ? ` · ${invalidCount} with errors (skipped on import)`
                  : ""}
              </p>
              <ScrollArea className="h-[min(320px,50vh)] rounded-md border">
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 bg-muted/95 text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="px-2 py-2 font-medium">Row</th>
                      <th className="px-2 py-2 font-medium">Name</th>
                      <th className="px-2 py-2 font-medium">Mobile</th>
                      <th className="px-2 py-2 font-medium">Branch</th>
                      <th className="px-2 py-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => {
                      const issue =
                        row.importMessage ??
                        (row.errors.length ? row.errors.join(" ") : null);
                      const statusClass = row.importStatus === "ok"
                        ? "text-green-700 dark:text-green-400"
                        : row.importStatus === "failed" ||
                            (!row.valid && !row.importStatus)
                          ? "text-destructive"
                          : row.importStatus === "pending"
                            ? "text-muted-foreground"
                            : "text-green-700 dark:text-green-400";
                      const statusLabel =
                        row.importStatus === "ok"
                          ? "Imported"
                          : row.importStatus === "failed"
                            ? "Failed"
                            : row.importStatus === "pending"
                              ? "Importing…"
                              : row.valid
                                ? "Ready"
                                : "Invalid";
                      return (
                        <tr
                          key={row.lineNumber}
                          className={cn(
                            "border-t align-top",
                            !row.valid && !row.importStatus && "bg-destructive/5",
                          )}
                        >
                          <td className="px-2 py-2 tabular-nums">{row.lineNumber}</td>
                          <td className="max-w-[120px] truncate px-2 py-2" title={row.name}>
                            {row.name || "—"}
                          </td>
                          <td className="px-2 py-2 tabular-nums">
                            {row.mobileRaw || "—"}
                          </td>
                          <td className="px-2 py-2">{row.branchCode || "—"}</td>
                          <td className={cn("px-2 py-2", statusClass)}>
                            <span className="font-medium">{statusLabel}</span>
                            {issue ? (
                              <p className="mt-0.5 text-xs font-normal text-pretty">
                                {issue}
                              </p>
                            ) : null}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </ScrollArea>
            </div>
          ) : null}
        </DialogBody>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Close
          </Button>
          {showPreview ? (
            <Button
              onClick={() => void runImport()}
              disabled={busy || validCount === 0}
            >
              {busy ? (
                <Loader2 className="animate-spin" />
              ) : null}
              Import {validCount} customer{validCount === 1 ? "" : "s"}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
