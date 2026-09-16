"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Copy,
  Download,
  Loader2,
  MessageCircle,
  Printer,
  Share2,
} from "lucide-react";
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
  dialogScrollShellClass,
} from "@/components/ui/dialog";
import {
  useLazyGetPaymentPassbookImageQuery,
  useLazyGetPaymentReceiptQuery,
  useSharePaymentWhatsappMutation,
} from "@/src/store/api/admin-api";
import { useAppSelector } from "@/src/store/hooks";
import { downloadBlobUrl, printBlobUrl } from "@/src/lib/download";
import { money } from "@/src/lib/format";

export type PaymentSuccessPayload = {
  paymentId?: string;
  receiptNo: string;
  amount: number;
  customer?: string;
  enrollmentNo?: string;
  mode?: string;
  allocation?: string;
  cashInHand?: number;
  whatsappStatus?: "SENT" | "FAILED" | "QUEUED";
  passbookImageStatus?: "READY" | "GENERATING" | "FAILED";
  passbookImageUrl?: string;
};

function modeLabel(mode?: string) {
  if (!mode) return "—";
  return mode.replaceAll("_", " ");
}

function whatsappStatusLabel(status?: PaymentSuccessPayload["whatsappStatus"]) {
  if (status === "SENT") return "Confirmation sent on WhatsApp";
  if (status === "FAILED") return "WhatsApp delivery failed";
  if (status === "QUEUED") return "WhatsApp confirmation queued";
  return null;
}

export function PaymentSuccessSheet({
  open,
  onOpenChange,
  result,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  result: PaymentSuccessPayload | null;
}) {
  const tenantName =
    useAppSelector((s) => s.session.session?.tenant?.name) ?? "Your jeweller";
  const [fetchPassbook] = useLazyGetPaymentPassbookImageQuery();
  const [fetchReceipt] = useLazyGetPaymentReceiptQuery();
  const [shareWhatsapp, { isLoading: sharing }] =
    useSharePaymentWhatsappMutation();

  const [passbookImageUrl, setPassbookImageUrl] = useState<string | undefined>(
    result?.passbookImageUrl,
  );
  const [passbookImageStatus, setPassbookImageStatus] = useState<
    PaymentSuccessPayload["passbookImageStatus"]
  >(result?.passbookImageStatus);
  const [receiptPreviewUrl, setReceiptPreviewUrl] = useState<string | null>(
    null,
  );
  const [receiptLoading, setReceiptLoading] = useState(false);
  const [receiptError, setReceiptError] = useState(false);

  const whatsappPreviewText = useMemo(() => {
    if (!result) return "";
    const lines = [
      `Payment received — ${tenantName}`,
      "",
      `Receipt: ${result.receiptNo}`,
      `Amount: ${money(result.amount)}`,
      `Mode: ${modeLabel(result.mode)}`,
    ];
    if (result.enrollmentNo) lines.push(`Enrollment: ${result.enrollmentNo}`);
    if (result.allocation) lines.push("", result.allocation);
    lines.push("", "Passbook entry image attached ↓");
    return lines.join("\n");
  }, [result, tenantName]);

  useEffect(() => {
    if (!open || !result) return;

    setPassbookImageUrl(result.passbookImageUrl);
    setPassbookImageStatus(result.passbookImageStatus);
    setReceiptPreviewUrl(null);
    setReceiptError(false);

    if (result.passbookImageUrl) {
      setPassbookImageStatus("READY");
    } else if (result.paymentId) {
      let cancelled = false;
      setPassbookImageStatus("GENERATING");
      void fetchPassbook(result.paymentId)
        .unwrap()
        .then(({ blobUrl }) => {
          if (cancelled) {
            URL.revokeObjectURL(blobUrl);
            return;
          }
          setPassbookImageUrl(blobUrl);
          setPassbookImageStatus("READY");
        })
        .catch(() => {
          if (!cancelled) setPassbookImageStatus("FAILED");
        });
      return () => {
        cancelled = true;
      };
    }
  }, [open, result?.paymentId, result?.receiptNo, fetchPassbook, result]);

  useEffect(() => {
    if (!open || !result?.paymentId) return;

    let cancelled = false;
    setReceiptLoading(true);
    setReceiptError(false);
    void fetchReceipt(result.paymentId)
      .unwrap()
      .then((data) => {
        if (cancelled) {
          if (data.kind === "blob") URL.revokeObjectURL(data.blobUrl);
          return;
        }
        if (data.kind === "blob" && data.contentType.includes("pdf")) {
          setReceiptPreviewUrl(data.blobUrl);
        } else {
          setReceiptError(true);
        }
      })
      .catch(() => {
        if (!cancelled) setReceiptError(true);
      })
      .finally(() => {
        if (!cancelled) setReceiptLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, result?.paymentId, result?.receiptNo, fetchReceipt]);

  useEffect(() => {
    const passbook = passbookImageUrl;
    const receipt = receiptPreviewUrl;
    return () => {
      if (passbook?.startsWith("blob:")) URL.revokeObjectURL(passbook);
      if (receipt?.startsWith("blob:")) URL.revokeObjectURL(receipt);
    };
  }, [passbookImageUrl, receiptPreviewUrl]);

  async function handleDownloadReceipt() {
    if (!result?.paymentId) return;
    try {
      const data = await fetchReceipt(result.paymentId).unwrap();
      if (data.kind === "blob") {
        const ext = data.contentType.includes("pdf") ? "pdf" : "bin";
        downloadBlobUrl(`${result.receiptNo}.${ext}`, data.blobUrl);
      } else {
        toast.message("Receipt is available as JSON from the API");
      }
    } catch {
      toast.error("Could not download receipt");
    }
  }

  async function handlePrintReceipt() {
    if (!result?.paymentId) return;
    try {
      const data = await fetchReceipt(result.paymentId).unwrap();
      if (data.kind === "blob") {
        if (!printBlobUrl(data.blobUrl)) {
          toast.error("Allow pop-ups to print the receipt");
        }
      } else {
        toast.error("Print is only available for PDF receipts");
      }
    } catch {
      toast.error("Could not open receipt for printing");
    }
  }

  function handleDownloadPassbook() {
    if (!passbookImageUrl || !result) return;
    downloadBlobUrl(`${result.receiptNo}-passbook.png`, passbookImageUrl);
  }

  async function handleShareWhatsapp() {
    if (!result?.paymentId) return;
    try {
      await shareWhatsapp(result.paymentId).unwrap();
      toast.success("WhatsApp receipt queued again");
    } catch {
      toast.error("Could not queue WhatsApp message");
    }
  }

  async function copyReceiptNo() {
    if (!result?.receiptNo) return;
    try {
      await navigator.clipboard.writeText(result.receiptNo);
      toast.success("Receipt number copied");
    } catch {
      toast.error("Could not copy");
    }
  }

  if (!result) return null;

  const whatsappLine = whatsappStatusLabel(result.whatsappStatus);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={`${dialogScrollShellClass} flex max-h-[min(92vh,880px)] flex-col sm:max-w-2xl`}
      >
        <DialogBody className="min-h-0 flex-1 overflow-y-auto pb-2">
          <DialogHeader className="space-y-3 text-left">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-emerald-100 p-2 text-emerald-800">
                <CheckCircle2 className="size-6" />
              </div>
              <div className="min-w-0 flex-1">
                <DialogTitle className="text-xl">Payment collected</DialogTitle>
                <DialogDescription className="text-pretty">
                  Collection posted successfully. Share or print the receipt
                  below — previews match what the customer gets on WhatsApp.
                </DialogDescription>
              </div>
            </div>
            <div className="rounded-xl border bg-[#fbf7f4] p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-3xl font-bold tabular-nums">
                  {money(result.amount)}
                </p>
                <button
                  type="button"
                  onClick={() => void copyReceiptNo()}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-[#730321] hover:underline"
                >
                  {result.receiptNo}
                  <Copy className="size-3.5 opacity-70" />
                </button>
              </div>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                {result.customer ? <span>{result.customer}</span> : null}
                {result.enrollmentNo ? (
                  <span>{result.enrollmentNo}</span>
                ) : null}
                {result.mode ? <span>{modeLabel(result.mode)}</span> : null}
              </div>
              {result.allocation ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  {result.allocation}
                </p>
              ) : null}
              {result.cashInHand != null ? (
                <p className="mt-2 text-sm">
                  Cash in hand updated:{" "}
                  <strong>{money(result.cashInHand)}</strong>
                </p>
              ) : null}
              {whatsappLine ? (
                <p className="mt-3 flex items-center gap-2 text-sm">
                  <MessageCircle className="size-4 text-emerald-700" />
                  <strong>{whatsappLine}</strong>
                </p>
              ) : null}
            </div>
          </DialogHeader>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <section className="rounded-xl border p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                WhatsApp preview
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Message + passbook image the customer receives
              </p>
              <div className="mt-3 rounded-2xl border border-emerald-900/10 bg-[#e7f5ec] p-3">
                <pre className="whitespace-pre-wrap font-sans text-[13px] leading-snug text-[#111]">
                  {whatsappPreviewText}
                </pre>
                <div className="mt-3 rounded-xl border border-emerald-900/10 bg-white p-2">
                  {passbookImageStatus === "GENERATING" ? (
                    <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
                      <Loader2 className="size-4 animate-spin" />
                      Loading passbook image…
                    </div>
                  ) : passbookImageStatus === "FAILED" ? (
                    <p className="py-4 text-sm text-amber-900">
                      Image unavailable — customer may get text-only receipt.
                    </p>
                  ) : passbookImageUrl ? (
                    <img
                      src={passbookImageUrl}
                      alt="Passbook entry"
                      className="w-full rounded-lg"
                    />
                  ) : (
                    <p className="py-4 text-sm text-muted-foreground">
                      Passbook image not loaded
                    </p>
                  )}
                </div>
              </div>
            </section>

            <section className="rounded-xl border p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Counter receipt (PDF)
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Printable receipt for the customer or branch file
              </p>
              <div className="mt-3 min-h-[220px] overflow-hidden rounded-xl border bg-white">
                {receiptLoading ? (
                  <div className="flex h-[220px] items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" />
                    Loading receipt…
                  </div>
                ) : receiptPreviewUrl ? (
                  <iframe
                    title="Receipt preview"
                    src={receiptPreviewUrl}
                    className="h-[min(360px,50vh)] w-full border-0"
                  />
                ) : receiptError ? (
                  <p className="p-4 text-sm text-muted-foreground">
                    PDF preview unavailable — use Download or Print below.
                  </p>
                ) : (
                  <p className="p-4 text-sm text-muted-foreground">
                    No receipt preview
                  </p>
                )}
              </div>
            </section>
          </div>
        </DialogBody>

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-auto"
            disabled={!result.paymentId}
            onClick={() => void handlePrintReceipt()}
          >
            <Printer />
            Print receipt
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-auto"
            disabled={!result.paymentId}
            onClick={() => void handleDownloadReceipt()}
          >
            <Download />
            Download PDF
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-auto"
            disabled={!passbookImageUrl}
            onClick={handleDownloadPassbook}
          >
            <Download />
            Passbook image
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="w-full sm:w-auto"
            disabled={!result.paymentId || sharing}
            onClick={() => void handleShareWhatsapp()}
          >
            {sharing ? <Loader2 className="animate-spin" /> : <Share2 />}
            Resend WhatsApp
          </Button>
          <Button
            type="button"
            className="w-full sm:ml-auto sm:w-auto"
            onClick={() => onOpenChange(false)}
          >
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
