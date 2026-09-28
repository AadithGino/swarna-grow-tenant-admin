"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  CheckCircle2,
  Download,
  FileText,
  LoaderCircle,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CustomerBrand } from "@/src/components/customer/customer-ui";
import { useCustomerTenant } from "@/src/components/customer/customer-tenant-context";
import {
  customerApi,
  useGetCustomerPaymentQuery,
  useLazyPollCustomerPaymentIntentQuery,
  useLazyPollPublicPaymentLinkQuery,
} from "@/src/store/api/customer-api";
import { customerPath } from "@/src/lib/customer-tenant";
import {
  clearCustomerPaymentSession,
  readCustomerPaymentSession,
} from "@/src/lib/customer-payment-session";
import { downloadCustomerPaymentReceipt } from "@/src/lib/customer-receipt";
import { money } from "@/src/lib/format";
import { cn } from "@/lib/utils";
import { useDispatch } from "react-redux";
import { toast } from "sonner";

function PhonePeMarkSmall() {
  return (
    <span className="grid size-8 shrink-0 place-items-center rounded-md bg-[#5f259f] text-[10px] font-black text-white">
      Pe
    </span>
  );
}

function formatPaidAt(iso?: string) {
  if (!iso) return { date: "—", time: "—" };
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { date: iso, time: "" };
  return {
    date: d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
    time: d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
  };
}

function DetailRow({
  icon,
  title,
  subtitle,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex items-start gap-3 py-3">
      <span className="mt-0.5 shrink-0 text-[var(--customer-accent,#8b5f08)]">{icon}</span>
      <div className="min-w-0">
        <p className="text-sm font-bold text-[#171722]">{title}</p>
        <p className="text-xs text-[#777280]">{subtitle}</p>
      </div>
    </div>
  );
}

function TimelineStep({
  label,
  time,
  done,
  last,
}: {
  label: string;
  time: string;
  done: boolean;
  last?: boolean;
}) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <span
          className={cn(
            "grid size-6 place-items-center rounded-full",
            done ? "bg-emerald-500 text-white" : "border-2 border-[#e5ddd7] bg-white",
          )}
        >
          {done ? <Check className="size-3.5" strokeWidth={3} /> : null}
        </span>
        {!last ? <span className={cn("my-0.5 w-0.5 flex-1 min-h-[1.25rem]", done ? "bg-emerald-400" : "bg-[#e5ddd7]")} /> : null}
      </div>
      <div className={cn("pb-4", last && "pb-0")}>
        <p className="text-sm font-bold text-[#171722]">{label}</p>
        <p className="text-[11px] text-[#777280]">{time}</p>
      </div>
    </div>
  );
}

export function CustomerPaymentStatusPage() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { tenantSlug } = useCustomerTenant();
  const [pollIntent] = useLazyPollCustomerPaymentIntentQuery();
  const [pollLink] = useLazyPollPublicPaymentLinkQuery();
  const [stage, setStage] = useState<"PROCESSING" | "PAID" | "FAILED" | "UNKNOWN">("PROCESSING");
  const [detail, setDetail] = useState("PhonePe is confirming your payment…");
  const [receiptPaymentId, setReceiptPaymentId] = useState<string | null>(null);
  const [receiptNumber, setReceiptNumber] = useState<string | null>(null);
  const [paidAt, setPaidAt] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const [sessionSnapshot] = useState(() => readCustomerPaymentSession());

  const { data: paymentRecord } = useGetCustomerPaymentQuery(receiptPaymentId ?? "", {
    skip: !receiptPaymentId || stage !== "PAID",
  });

  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;

    const finish = (
      next: typeof stage,
      message: string,
      receipt?: { paymentId?: string; receiptNumber?: string; paidAt?: string } | null,
    ) => {
      if (cancelled) return;
      setStage(next);
      setDetail(message);
      if (receipt?.receiptNumber) setReceiptNumber(receipt.receiptNumber);
      if (receipt?.paymentId) setReceiptPaymentId(receipt.paymentId);
      if (receipt?.paidAt) setPaidAt(receipt.paidAt);
      if (next === "PAID") {
        clearCustomerPaymentSession();
        dispatch(
          customerApi.util.invalidateTags(["CustomerScheme", "CustomerPayment", "CustomerHome"]),
        );
      }
    };

    const pollOnce = async (): Promise<boolean> => {
      const session = readCustomerPaymentSession();
      if (!session) {
        finish(
          "UNKNOWN",
          "We could not find an active payment session. If you completed payment, check your passbook shortly.",
        );
        return true;
      }

      try {
        const result =
          session.kind === "intent" && session.intentId
            ? await pollIntent(session.intentId).unwrap()
            : session.linkToken
              ? await pollLink(session.linkToken).unwrap()
              : null;
        if (!result) {
          finish("UNKNOWN", "Payment status is unavailable. Please check your schemes list.");
          return true;
        }
        if (result.paid) {
          finish("PAID", "Your investment in a brighter tomorrow", {
            paymentId: result.receipt?.paymentId,
            receiptNumber: result.receipt?.receiptNumber,
            paidAt: result.receipt?.paidAt,
          });
          return true;
        }
        if (result.failed || result.status === "EXPIRED" || result.status === "CANCELLED") {
          finish(
            "FAILED",
            result.status === "EXPIRED"
              ? "This payment session expired before PhonePe confirmed it."
              : "PhonePe reported that the payment did not complete.",
          );
          clearCustomerPaymentSession();
          return true;
        }
        const delayMs = Math.max(1500, (result.retryAfterSeconds ?? 3) * 1000);
        timer = window.setTimeout(() => {
          void pollOnce();
        }, delayMs);
        return false;
      } catch {
        finish(
          "UNKNOWN",
          "Confirmation is delayed. Your payment session is safe; retry when your connection is stable.",
        );
        return true;
      }
    };

    void pollOnce();

    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [dispatch, pollIntent, pollLink, retryKey]);

  const amountPaise =
    sessionSnapshot?.amountPaise ??
    paymentRecord?.amount?.amountPaise ??
    0;
  const amountLabel = amountPaise > 0 ? money(amountPaise / 100) : "—";
  const schemeName = sessionSnapshot?.schemeName ?? paymentRecord?.schemeName ?? "Your scheme";
  const schemeNumber =
    sessionSnapshot?.schemeNumber ?? paymentRecord?.schemeNumber ?? "—";
  const receiptLabel = receiptNumber ?? paymentRecord?.receiptNumber ?? "—";
  const paidAtParts = formatPaidAt(paidAt ?? paymentRecord?.paidAt);
  const timelineTime = paidAtParts.time ? `${paidAtParts.time}` : "Just now";

  const schemeHref = sessionSnapshot?.schemeId
    ? customerPath(tenantSlug, "schemes", sessionSnapshot.schemeId)
    : customerPath(tenantSlug, "schemes");

  const downloadReceipt = async () => {
    const path = paymentRecord?.receiptDownloadPath;
    if (!path) {
      toast.error("Receipt is not ready yet. Open passbook in a moment.");
      return;
    }
    try {
      const name = receiptLabel !== "—" ? `${receiptLabel}.pdf` : "receipt.pdf";
      await downloadCustomerPaymentReceipt(path, name);
      toast.success("Receipt downloaded");
    } catch {
      toast.error("Could not download receipt");
    }
  };

  if (stage === "PROCESSING") {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-4 text-center">
        <span className="grid size-16 place-items-center rounded-full bg-[#f3eafb] text-[#5f259f]">
          <LoaderCircle className="size-8 animate-spin" />
        </span>
        <h1 className="mt-5 text-xl font-black text-[#171722]">Confirming your payment</h1>
        <p className="mt-2 text-sm leading-relaxed text-[#777280]">{detail}</p>
      </div>
    );
  }

  if (stage !== "PAID") {
    return (
      <div className="mx-auto max-w-lg px-4 py-8 text-center">
        <span className="mx-auto grid size-16 place-items-center rounded-full bg-red-50 text-red-700">
          <ShieldCheck className="size-8" />
        </span>
        <h1 className="mt-5 text-xl font-black text-[#171722]">
          {stage === "FAILED" ? "Payment not completed" : "Payment status unknown"}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-[#777280]">{detail}</p>
        <Button
          onClick={() => {
            if (stage === "UNKNOWN" && readCustomerPaymentSession()) {
              setStage("PROCESSING");
              setDetail("PhonePe is confirming your payment…");
              setRetryKey((value) => value + 1);
              return;
            }
            router.replace(customerPath(tenantSlug, "schemes"));
          }}
          className="mt-6 w-full rounded-xl font-bold text-white"
          style={{ background: "var(--customer-primary, #730321)" }}
        >
          {stage === "UNKNOWN" && readCustomerPaymentSession() ? "Retry confirmation" : "Back to schemes"}
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 pb-8">
      <header className="flex items-center justify-between gap-2 py-2">
        <button
          type="button"
          onClick={() => router.replace(schemeHref)}
          className="grid size-10 place-items-center rounded-full text-[#171722] hover:bg-[#f6f2ee]"
          aria-label="Back"
        >
          <ArrowLeft className="size-5" strokeWidth={2.25} />
        </button>
        <div className="flex min-w-0 flex-1 justify-center">
          <CustomerBrand compact />
        </div>
        <span className="size-10" aria-hidden />
      </header>

      <div className="mt-4 text-center">
        <span className="mx-auto grid size-[4.5rem] place-items-center rounded-full bg-emerald-50 text-emerald-600">
          <CheckCircle2 className="size-10" strokeWidth={2} />
        </span>
        <h1 className="mt-5 text-2xl font-black tracking-[-.02em] text-[#171722]">Payment successful</h1>
        <p className="mt-2 text-sm text-[#777280]">Your investment in a brighter tomorrow</p>
        <p className="mt-4 text-[2.5rem] font-black leading-none tracking-[-.03em] text-[#171722]">{amountLabel}</p>
      </div>

      <section className="customer-surface mt-6 divide-y divide-[#ece6e1] px-4 py-1">
        <DetailRow
          icon={
            <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
              <rect x="3" y="10" width="5" height="8" rx="0.5" fill="currentColor" opacity="0.85" />
              <rect x="9" y="7" width="5" height="11" rx="0.5" fill="currentColor" />
              <rect x="15" y="10" width="5" height="8" rx="0.5" fill="currentColor" opacity="0.7" />
            </svg>
          }
          title={schemeName}
          subtitle={`Scheme ${schemeNumber}`}
        />
        <DetailRow icon={<FileText className="size-5" strokeWidth={2} />} title={`Receipt ${receiptLabel}`} subtitle="Saved to your passbook" />
        <DetailRow icon={<PhonePeMarkSmall />} title="PhonePe" subtitle="Online payment" />
        <DetailRow
          icon={<CalendarDays className="size-5" strokeWidth={2} />}
          title={`${paidAtParts.date}${paidAtParts.time ? ` · ${paidAtParts.time}` : ""}`}
          subtitle="Payment date & time"
        />
      </section>

      <section className="customer-surface mt-4 p-4">
        <TimelineStep label="Payment initiated" time={timelineTime} done />
        <TimelineStep label="Confirmed by PhonePe" time={timelineTime} done />
        <TimelineStep label="Added to passbook" time={timelineTime} done last />
      </section>

      <div className="mt-5 space-y-2.5">
        <Button
          onClick={downloadReceipt}
          className="h-12 w-full rounded-xl text-base font-black text-white"
          style={{ background: "var(--customer-primary, #730321)" }}
        >
          <Download className="mr-2 size-4" />
          Download receipt
        </Button>
        <Button
          variant="outline"
          onClick={() => router.replace(schemeHref)}
          className="h-12 w-full rounded-xl border-[var(--customer-primary,#730321)] text-base font-bold text-[var(--customer-primary,#730321)]"
        >
          Back to scheme
        </Button>
      </div>

      <p className="mt-5 flex items-center justify-center gap-1.5 text-center text-xs font-semibold text-emerald-700">
        <CheckCircle2 className="size-4" strokeWidth={2.25} />
        Your passbook has been updated
      </p>
    </div>
  );
}
