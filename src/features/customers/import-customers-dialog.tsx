"use client";

import { Loader2, Upload } from "lucide-react";
import { useRef, useState } from "react";
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
import { useCreateCustomerMutation } from "@/src/store/api/admin-api";

function normalizeMobile(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return digits;
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  return digits;
}

function parseCsv(text: string): { name: string; mobile: string; branchCode?: string; email?: string }[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (!lines.length) return [];
  const header = lines[0].toLowerCase();
  const hasHeader =
    header.includes("name") && (header.includes("mobile") || header.includes("phone"));
  const rows = hasHeader ? lines.slice(1) : lines;
  return rows
    .map((line) => {
      const parts = line.split(",").map((p) => p.trim().replace(/^"|"$/g, ""));
      const [name, mobileRaw, branchCode, email] = parts;
      if (!name || !mobileRaw) return null;
      const mobile = normalizeMobile(mobileRaw);
      if (mobile.length < 10) return null;
      return {
        name,
        mobile,
        branchCode: branchCode || undefined,
        email: email || undefined,
      };
    })
    .filter(Boolean) as {
    name: string;
    mobile: string;
    branchCode?: string;
    email?: string;
  }[];
}

export function ImportCustomersDialog({
  open,
  onOpenChange,
  branchCodeToId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branchCodeToId: Map<string, string>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [createCustomer] = useCreateCustomerMutation();
  const [busy, setBusy] = useState(false);

  async function handleFile(file: File) {
    const text = await file.text();
    const rows = parseCsv(text);
    if (!rows.length) {
      toast.error("No valid rows found. Use: name,mobile,branchCode,email");
      return;
    }
    setBusy(true);
    let ok = 0;
    let failed = 0;
    for (const row of rows) {
      try {
        const branchId = row.branchCode
          ? branchCodeToId.get(row.branchCode.toUpperCase())
          : undefined;
        await createCustomer({
          name: row.name,
          phone: row.mobile,
          email: row.email,
          branchId,
        }).unwrap();
        ok += 1;
      } catch {
        failed += 1;
      }
    }
    setBusy(false);
    onOpenChange(false);
    if (ok) toast.success(`Imported ${ok} customer${ok === 1 ? "" : "s"}`);
    if (failed) toast.error(`${failed} row${failed === 1 ? "" : "s"} failed (duplicate mobile or invalid data)`);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogBody>
          <DialogHeader>
            <DialogTitle>Import customers</DialogTitle>
            <DialogDescription>
              CSV columns: name, mobile, optional branch code, optional email.
              First row may be a header.
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
            className="mt-4 w-full"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            {busy ? <Loader2 className="animate-spin" /> : <Upload />}
            Choose CSV file
          </Button>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
