"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Download,
  Gem,
  IndianRupee,
  LoaderCircle,
  WalletCards,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CustomerPageHeader } from "@/src/components/customer/customer-ui";
import { PageSkeleton, QueryError } from "@/src/components/common/query-state";
import { useCustomerTenant } from "@/src/components/customer/customer-tenant-context";
import { customerPath } from "@/src/lib/customer-tenant";
import {
  useGetCustomerPaymentQuery,
  useGetCustomerPaymentsQuery,
  useGetCustomerSchemesQuery,
} from "@/src/store/api/customer-api";
import { summarizeCustomerPayments } from "@/src/lib/customer-payment-adapter";
import { downloadCustomerPaymentReceipt } from "@/src/lib/customer-receipt";
import type { PaymentListItem } from "@/src/types/customer";
import { formatGoldPurchaseDate, paymentHasGoldAccrual } from "@/src/lib/gold-payment-display";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

function formatPaymentDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatPaymentDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function StatusBadge({ payment }: { payment: PaymentListItem }) {
  const label = payment.statusLabel ?? payment.status;
  const tone =
    payment.status === "SUCCESS"
      ? "bg-emerald-50 text-emerald-800"
      : payment.status === "PENDING"
        ? "bg-amber-50 text-amber-900"
        : payment.status === "FAILED"
          ? "bg-red-50 text-red-700"
          : "bg-muted text-muted-foreground";
  return <span className={cn("rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide", tone)}>{label}</span>;
}

function PaymentStatusIcon({ payment }: { payment: PaymentListItem }) {
  if (payment.status === "SUCCESS") {
    return (
      <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-emerald-700">
        <IndianRupee className="size-5" />
      </span>
    );
  }
  if (payment.status === "PENDING") {
    return (
      <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-amber-50 text-amber-800">
        <Clock3 className="size-5" />
      </span>
    );
  }
  return (
    <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-red-50 text-red-600">
      <XCircle className="size-5" />
    </span>
  );
}

async function downloadReceipt(payment: PaymentListItem) {
  if (!payment.receiptDownloadPath) {
    toast.error("Receipt is available after payment is successful");
    return;
  }
  try {
    const name = payment.receiptNumber ? `${payment.receiptNumber}.pdf` : `receipt-${payment.id}.pdf`;
    await downloadCustomerPaymentReceipt(payment.receiptDownloadPath, name);
    toast.success("Receipt downloaded");
  } catch {
    toast.error("Could not download receipt. Try again.");
  }
}

export function CustomerPaymentsPage() {
  const { tenantSlug } = useCustomerTenant();
  const { data, isLoading, isError, refetch } = useGetCustomerPaymentsQuery();
  const { data: schemes } = useGetCustomerSchemesQuery();

  if (isLoading) return <PageSkeleton />;
  if (isError) return <QueryError onRetry={refetch} />;

  const items = data ?? [];
  const summary = summarizeCustomerPayments(items);
  const activeSchemeCount = schemes?.length ?? 0;

  return (
    <div>
      <CustomerPageHeader
        eyebrow="Digital passbook"
        title="Payments & receipts"
        description="A permanent record of every verified contribution."
      />
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="customer-surface p-5">
          <span className="grid size-10 place-items-center rounded-full bg-[#fff0c8] text-[#8b5f08]"><WalletCards className="size-5" /></span>
          <p className="mt-4 text-xs text-[#77727c]">Total verified</p>
          <p className="mt-1 text-2xl font-black text-[#8b5f08]">{formatInrDisplay(summary.totalPaidPaise)}</p>
        </div>
        <div className="customer-surface p-5">
          <CheckCircle2 className="size-5 text-emerald-700" />
          <p className="mt-4 text-xs text-muted-foreground">Successful payments</p>
          <p className="mt-1 text-2xl font-black">{summary.successCount}</p>
        </div>
        <div className="customer-surface p-5">
          <Gem className="size-5 text-[#9a6f2a]" />
          <p className="mt-4 text-xs text-muted-foreground">Active schemes</p>
          <p className="mt-1 text-2xl font-black">{activeSchemeCount}</p>
        </div>
      </div>
      <section className="customer-surface mt-5 overflow-hidden">
        <div className="border-b p-5">
          <h2 className="font-black">Recent transactions</h2>
          <p className="text-xs text-muted-foreground">Open a payment for details or download its receipt</p>
        </div>
        {items.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">No payments yet. Contributions appear here once recorded.</p>
        ) : (
          <div className="divide-y">
            {items.map((payment) => (
              <Link
                key={payment.id}
                href={customerPath(tenantSlug, "payments", payment.id)}
                className="flex items-center gap-3 p-4 transition hover:bg-[#fcf8f5] sm:p-5"
              >
                <PaymentStatusIcon payment={payment} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-black">{payment.schemeName}</p>
                    <StatusBadge payment={payment} />
                  </div>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {payment.schemeNumber ? `${payment.schemeNumber} · ` : ""}
                    {payment.recordedByLabel ?? payment.channelLabel ?? payment.channel}
                    {payment.receiptNumber ? ` · ${payment.receiptNumber}` : ""}
                  </p>
                  {paymentHasGoldAccrual(payment) && payment.goldAccrual ? (
                    <p className="mt-0.5 text-[10px] font-semibold text-[#8b5f08]">
                      {payment.goldAccrual.weightDisplay} · {payment.goldAccrual.ratePerGramDisplay}/g ·{" "}
                      {formatGoldPurchaseDate(payment.goldAccrual.purchasedAt ?? payment.paidAt)}
                    </p>
                  ) : null}
                </div>
                <div className="text-right">
                  <p className="font-black">{payment.amount.amountDisplay}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {formatPaymentDate(payment.paidAt ?? payment.createdAt)}
                  </p>
                </div>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function formatInrDisplay(paise: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(paise / 100);
}

export function CustomerPaymentDetailPage({ id }: { id: string }) {
  const { tenantSlug } = useCustomerTenant();
  const router = useRouter();
  const { data: payment, isLoading, isError, refetch } = useGetCustomerPaymentQuery(id);
  const [downloading, setDownloading] = useState(false);

  if (isLoading || !payment) return <PageSkeleton />;
  if (isError) return <QueryError onRetry={refetch} />;

  const onDownload = async () => {
    setDownloading(true);
    try {
      await downloadReceipt(payment);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div>
      <Link
        href={customerPath(tenantSlug, "payments")}
        className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-[#730321]"
      >
        <ArrowLeft className="size-4" />
        All payments
      </Link>
      <section className="customer-surface overflow-hidden">
        <div className="border-b border-[#eadfda] bg-[#fffaf0] p-6 sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <StatusBadge payment={payment} />
              <h1 className="mt-3 text-3xl font-black">{payment.amount.amountDisplay}</h1>
              <p className="mt-2 text-sm text-[#706b77]">{payment.schemeName}</p>
            </div>
            <PaymentStatusIcon payment={payment} />
          </div>
        </div>
        <div className="grid gap-4 p-6 sm:grid-cols-2 sm:p-8">
          <DetailField label="Enrolment" value={payment.schemeNumber || "—"} />
          <DetailField label="Paid on" value={formatPaymentDateTime(payment.paidAt ?? payment.createdAt)} />
          <DetailField label="Recorded by" value={payment.recordedByLabel ?? payment.channelLabel ?? payment.channel} />
          <DetailField label="Plan type" value={payment.paymentPattern === "FLEXIBLE" ? "Flexible" : "Fixed"} />
          {payment.targetCycle ? <DetailField label="Contribution cycle" value={payment.targetCycle} /> : null}
          {payment.goldAccrual?.weightMg ? (
            <>
              <DetailField label="Gold weight booked" value={payment.goldAccrual.weightDisplay} />
              <DetailField
                label="Gold rate on booking date"
                value={`${payment.goldAccrual.ratePerGramDisplay} / g`}
              />
              <DetailField
                label="Gold booking date"
                value={formatGoldPurchaseDate(
                  payment.goldAccrual.purchasedAt ?? payment.paidAt ?? payment.createdAt,
                )}
              />
            </>
          ) : null}
          <DetailField label="Receipt" value={payment.receiptNumber ?? "Available after confirmation"} />
        </div>
        <div className="flex flex-wrap gap-3 border-t p-6 sm:p-8">
          <Button
            className="rounded-xl bg-[#730321] font-bold"
            disabled={!payment.receiptDownloadPath || downloading}
            onClick={onDownload}
          >
            {downloading ? <LoaderCircle className="size-4 animate-spin" /> : <Download className="size-4" />}
            Download receipt
          </Button>
          <Button variant="outline" className="rounded-xl font-bold" asChild>
            <Link href={customerPath(tenantSlug, "schemes", payment.schemeId)}>View scheme passbook</Link>
          </Button>
          <Button variant="ghost" className="rounded-xl" onClick={() => router.back()}>
            Back
          </Button>
        </div>
      </section>
    </div>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-[#faf6f3] p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-black leading-snug">{value}</p>
    </div>
  );
}
