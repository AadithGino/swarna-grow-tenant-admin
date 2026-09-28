"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CUSTOMER_MOBILE_NAV_DOCK,
  FixedSchemeSummaryDock,
  NextInstalmentCard,
  normalizeSchemeMode,
  PaymentScheduleBlock,
  SchemeDetailModeBody,
  SchemeDetailTabs,
} from "@/src/features/customer/customer-scheme-detail-views";
import { downloadCustomerPaymentReceipt } from "@/src/lib/customer-receipt";
import { PageSkeleton, QueryError } from "@/src/components/common/query-state";
import {
  useGetCustomerSchemeQuery,
  useGetCustomerPassbookQuery,
  useGetCustomerSettlementPreviewQuery,
  useInitiatePublicPaymentLinkMutation,
  useRequestCustomerRedemptionMutation,
} from "@/src/store/api/customer-api";
import { openCustomerPaymentTarget } from "@/src/lib/customer-payment-redirect";
import { CustomerMakePaymentSheet } from "@/src/features/customer/customer-make-payment-sheet";
import { useCustomerTenant } from "@/src/components/customer/customer-tenant-context";
import { customerPath } from "@/src/lib/customer-tenant";
import { useCustomerPortalCapabilities } from "@/src/lib/customer-portal-capabilities";
import { toast } from "sonner";
import { isGoldWeightScheme } from "@/src/lib/customer-gold-ui";
export function CustomerSchemeDetailPage({ id }: { id: string }) {
  const { customerAppPaymentsEnabled } = useCustomerPortalCapabilities();
  const { data: scheme, isLoading, isError, refetch } = useGetCustomerSchemeQuery(id);
  const passbook = useGetCustomerPassbookQuery(id);
  const [payOpen, setPayOpen] = useState(false);
  const [redeemOpen, setRedeemOpen] = useState(false);
  const [redemptionMode, setRedemptionMode] = useState("");
  const [billNumber, setBillNumber] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [redemptionRemarks, setRedemptionRemarks] = useState("");
  const [requestRedemption, redemptionState] = useRequestCustomerRedemptionMutation();
  const redemptionModeOptions = useMemo(() => {
    const preferred = scheme?.redemption?.preferredModes ?? [];
    return preferred.map((entry) =>
      typeof entry === "string" ? { mode: entry, label: entry.replaceAll("_", " ").toLowerCase() } : entry,
    );
  }, [scheme?.redemption?.preferredModes]);
  const effectiveRedemptionMode = redemptionMode || redemptionModeOptions[0]?.mode || "";
  const preview = useGetCustomerSettlementPreviewQuery(
    { schemeId: id, mode: effectiveRedemptionMode },
    { skip: !redeemOpen || !effectiveRedemptionMode },
  );

  if (isLoading || !scheme) return <PageSkeleton cards={3} />;
  if (isError) return <QueryError onRetry={refetch} />;

  const payButtonRaw = scheme.payButton ?? { visible: scheme.canPay, enabled: scheme.canPay, label: "Pay" };
  const displayMode = normalizeSchemeMode(scheme.displayMode);
  const payButton = customerAppPaymentsEnabled
    ? payButtonRaw
    : {
        ...payButtonRaw,
        enabled: false,
        label: "Payments unavailable",
        helperText: "This jeweller has set the customer app to view-only or disabled online payments.",
      };
  const redemption = scheme.redemption ?? { eligible: false, status: "NOT_ELIGIBLE", preferredModes: [] as Array<{ mode: string; label: string } | string> };
  const schemeIsGold = isGoldWeightScheme(scheme.valueBasis);
  const payments = scheme.payments ?? [];
  const maturityBenefit = scheme.maturityBenefit ?? {
    title: scheme.benefitLabel || "Maturity benefit",
    summary: scheme.benefitLabel || "",
    details: [] as string[],
    eligibility: [] as string[],
  };
  const planRuleSections = scheme.planRules?.sections ?? [];

  const downloadReceipt = async (payment: (typeof payments)[number]) => {
    if (!payment.receiptDownloadPath) {
      toast.error("Receipt is not available for this entry");
      return;
    }
    try {
      const name = payment.receiptNumber ? `${payment.receiptNumber}.pdf` : `receipt-${payment.id}.pdf`;
      await downloadCustomerPaymentReceipt(payment.receiptDownloadPath, name);
      toast.success("Receipt downloaded");
    } catch {
      toast.error("Could not download receipt. Try again.");
    }
  };

  const redeem = async () => {
    try {
      if (!effectiveRedemptionMode) return toast.error("Choose how you would like to redeem");
      if (!preview.data?.eligible) return toast.error(preview.data?.blockers?.[0]?.message ?? "Settlement is not currently eligible");
      if (effectiveRedemptionMode === "PURCHASE_ADJUSTMENT" && !billNumber.trim()) {
        return toast.error("Bill number is required for purchase adjustment");
      }
      await requestRedemption({
        schemeId: scheme.id,
        preferredMode: effectiveRedemptionMode,
        ...(preferredDate ? { preferredDate } : {}),
        ...(redemptionRemarks.trim() ? { remarks: redemptionRemarks.trim() } : {}),
        ...(effectiveRedemptionMode === "PURCHASE_ADJUSTMENT"
          ? { modeDetails: { billNumber: billNumber.trim() } }
          : {}),
        expectedVersion: scheme.version,
      }).unwrap();
      toast.success("Redemption request sent to your jewellery");
      setRedeemOpen(false);
    } catch {
      toast.error("Could not submit the request");
    }
  };

  const payLabel =
    payButton.label ??
    (displayMode === "FIXED" && scheme.nextActionAmount
      ? `Pay ${scheme.nextActionAmount.amountDisplay}`
      : displayMode === "FLEXIBLE_LOCK_WINDOW" && scheme.progressCard.remainingThisCycle
        ? `Pay up to ${scheme.progressCard.remainingThisCycle.amountDisplay}`
        : "Add payment");

  return (
    <div
      className="mx-auto max-w-lg lg:pb-8"
      style={{
        paddingBottom:
          displayMode === "FIXED"
            ? `calc(${CUSTOMER_MOBILE_NAV_DOCK} + 6.5rem + 1.5rem + env(safe-area-inset-bottom, 0px))`
            : `calc(${CUSTOMER_MOBILE_NAV_DOCK} + 0.75rem + env(safe-area-inset-bottom, 0px))`,
      }}
    >
      <SchemeDetailModeBody
        scheme={scheme}
        mode={scheme.displayMode}
        schemeIsGold={schemeIsGold}
        onPay={() => setPayOpen(true)}
        payEnabled={payButton.visible !== false && payButton.enabled}
        payLabel={payLabel}
      />
      <SchemeDetailTabs
        scheme={scheme}
        maturityBenefit={maturityBenefit}
        schemeIsGold={schemeIsGold}
        planRuleSections={planRuleSections}
        payments={payments}
        redemptionEligible={redemption.eligible}
        redemptionBlocker={redemption.blocker}
        onRedeem={() => setRedeemOpen(true)}
        onDownloadReceipt={downloadReceipt}
        passbookLayout={displayMode === "FIXED" ? "fixed" : "default"}
        passbookRows={passbook.data?.rows}
        passbookExtra={
          displayMode === "FIXED" ? (
            <>
              <NextInstalmentCard
                scheme={scheme}
                onPay={() => setPayOpen(true)}
                payEnabled={payButton.visible !== false && payButton.enabled}
                payLabel={payLabel}
                helperText={payButton.helperText}
              />
              <PaymentScheduleBlock
                scheme={scheme}
                schemeIsGold={schemeIsGold}
                onDownloadReceipt={downloadReceipt}
              />
            </>
          ) : undefined
        }
      />
      {displayMode === "FIXED" ? <FixedSchemeSummaryDock scheme={scheme} /> : null}
      <CustomerMakePaymentSheet scheme={scheme} open={payOpen} onOpenChange={setPayOpen} />
      <Dialog open={redeemOpen} onOpenChange={setRedeemOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request redemption</DialogTitle>
            <DialogDescription>
              This sends a servicing request. No financial ledger entry is created until the jewellery completes settlement.
            </DialogDescription>
          </DialogHeader>
          {redemptionModeOptions.length > 1 ? (
            <div className="mt-2">
              <label className="text-xs font-bold text-muted-foreground">Preferred settlement</label>
              <Select value={effectiveRedemptionMode} onValueChange={setRedemptionMode}>
                <SelectTrigger className="mt-2 h-11 rounded-xl">
                  <SelectValue placeholder="Choose mode" />
                </SelectTrigger>
                <SelectContent>
                  {redemptionModeOptions.map((opt) => (
                    <SelectItem key={opt.mode} value={opt.mode}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : redemptionModeOptions.length === 1 ? (
            <p className="text-sm text-muted-foreground">Settlement: {redemptionModeOptions[0].label}</p>
          ) : null}
          {preview.isFetching ? (
            <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
              <LoaderCircle className="size-4 animate-spin" /> Calculating settlement…
            </div>
          ) : preview.data ? (
            <div className="mt-4 rounded-xl border bg-muted/30 p-3 text-sm">
              <div className="space-y-2">
                {preview.data.computation.lines.map((line) => (
                  <div key={line.key} className="flex justify-between gap-3">
                    <span className="text-muted-foreground">{line.label}</span>
                    <span className="font-bold">{line.sign}{line.amount.amountDisplay}</span>
                  </div>
                ))}
                <div className="flex justify-between gap-3 border-t pt-2 text-base font-black">
                  <span>Settlement</span>
                  <span>{preview.data.computation.finalValue.amountDisplay}</span>
                </div>
                {preview.data.computation.goldWeight ? (
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">Gold handover</span>
                    <span className="font-bold">{preview.data.computation.goldWeight.weightDisplay}</span>
                  </div>
                ) : null}
              </div>
              {preview.data.valuationNote ? <p className="mt-3 text-xs text-muted-foreground">{preview.data.valuationNote}</p> : null}
              {preview.data.warningText ? <p className="mt-3 text-xs font-semibold text-amber-800">{preview.data.warningText}</p> : null}
              {!preview.data.eligible ? (
                <div className="mt-3 space-y-1 text-xs font-semibold text-red-700">
                  {preview.data.blockers.map((blocker) => <p key={blocker.code}>{blocker.message}</p>)}
                </div>
              ) : null}
            </div>
          ) : null}
          {effectiveRedemptionMode === "PURCHASE_ADJUSTMENT" ? (
            <div className="mt-4">
              <label className="text-xs font-bold text-muted-foreground" htmlFor="redemption-bill-number">Bill number</label>
              <Input id="redemption-bill-number" value={billNumber} onChange={(event) => setBillNumber(event.target.value)} maxLength={64} className="mt-2" />
            </div>
          ) : null}
          <div className="mt-4 grid gap-3">
            <div>
              <label className="text-xs font-bold text-muted-foreground" htmlFor="redemption-date">Preferred date (optional)</label>
              <Input id="redemption-date" type="date" value={preferredDate} onChange={(event) => setPreferredDate(event.target.value)} className="mt-2" />
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground" htmlFor="redemption-remarks">Remarks (optional)</label>
              <Textarea id="redemption-remarks" value={redemptionRemarks} onChange={(event) => setRedemptionRemarks(event.target.value)} maxLength={500} className="mt-2" />
            </div>
          </div>
          <Button disabled={redemptionState.isLoading || preview.isFetching || !effectiveRedemptionMode || !preview.data?.eligible || (effectiveRedemptionMode === "PURCHASE_ADJUSTMENT" && !billNumber.trim())} onClick={redeem} className="mt-4 bg-[#730321]">
            Submit request
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** Resolves `/pay/:token` (backend link path) into PhonePe checkout under `/customer/:slug/pay/:token`. */
export function CustomerPaymentLinkPage({ linkToken }: { linkToken: string }) {
  const router = useRouter();
  const { tenantSlug } = useCustomerTenant();
  const [initiatePublicLink] = useInitiatePublicPaymentLinkMutation();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const statusRedirectUrl = customerPath(tenantSlug, "pay", "status");
        const statusRedirectFull = `${window.location.origin}${statusRedirectUrl}`;
        await openCustomerPaymentTarget(
          { token: linkToken, gatewayUrl: `/pay/${linkToken}` },
          {
            tenantSlug,
            statusRedirectUrl,
            session: { kind: "link", linkToken },
            initiateLink: async (token) =>
              initiatePublicLink({ linkToken: token, redirectUrl: statusRedirectFull }).unwrap(),
            navigate: (path) => router.replace(path),
          },
        );
      } catch {
        if (!cancelled) setError("Could not start payment. Go back and try again.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [linkToken, tenantSlug, initiatePublicLink, router]);

  if (error) {
    return (
      <div className="grid min-h-[50vh] place-items-center p-6 text-center">
        <p className="text-sm text-muted-foreground">{error}</p>
        <Button asChild className="mt-4 bg-[#730321]">
          <Link href={customerPath(tenantSlug, "schemes")}>Back to schemes</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="grid min-h-[50vh] place-items-center">
      <LoaderCircle className="size-10 animate-spin text-[#730321]" />
    </div>
  );
}
