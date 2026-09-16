"use client";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export type BulkJobResult = {
  jobId?: string;
  queued: number;
  skipped?: { schemeId?: string; installmentId?: string; reason: string }[];
};

const SKIP_LABELS: Record<string, string> = {
  WHATSAPP_OPTED_OUT: "WhatsApp opted out",
  QUOTA_EXCEEDED: "WhatsApp quota exceeded",
  NO_OPEN_INSTALLMENT: "No payable installment",
  ALREADY_SENT: "Link already sent today",
};

export function BulkJobResultSheet({
  result,
  open,
  onOpenChange,
}: {
  result: BulkJobResult | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const skipped = result?.skipped ?? [];
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Bulk job queued</SheetTitle>
          <SheetDescription>
            {result?.queued ?? 0} message
            {(result?.queued ?? 0) === 1 ? "" : "s"} queued
            {result?.jobId ? ` · ${result.jobId}` : ""}
          </SheetDescription>
        </SheetHeader>
        {skipped.length > 0 ? (
          <div className="mt-6 space-y-3">
            <p className="text-sm font-medium">
              Skipped ({skipped.length})
            </p>
            <ul className="divide-y rounded-xl border text-sm">
              {skipped.map((row, i) => (
                <li key={`${row.installmentId ?? row.schemeId ?? i}`} className="px-4 py-3">
                  <strong className="block font-mono text-xs text-muted-foreground">
                    {row.installmentId ?? row.schemeId ?? "—"}
                  </strong>
                  <span>
                    {SKIP_LABELS[row.reason] ?? row.reason.replace(/_/g, " ").toLowerCase()}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="mt-6 text-sm text-muted-foreground">
            All selected rows were queued successfully.
          </p>
        )}
        <SheetFooter className="mt-8">
          <Button type="button" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
