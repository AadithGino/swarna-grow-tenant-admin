"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  useGetCustomerSettlementPreviewQuery,
  useInitiatePublicPaymentLinkMutation,
  useRequestCustomerRedemptionMutation,
} from "@/src/store/api/customer-api";
import { CustomerRedemptionPreview } from "@/src/features/customer/customer-redemption-preview";
import { apiErrorMessage } from "@/src/lib/api-error";
import { openCustomerPaymentTarget } from "@/src/lib/customer-payment-redirect";
import { CustomerMakePaymentSheet } from "@/src/features/customer/customer-make-payment-sheet";
import type { CustomerSchemeDetail } from "@/src/types/customer";
import { useCustomerTenant } from "@/src/components/customer/customer-tenant-context";
import { customerPath } from "@/src/lib/customer-tenant";
import { useCustomerPortalCapabilities } from "@/src/lib/customer-portal-capabilities";
import { toast } from "sonner";
import { isGoldWeightScheme } from "@/src/lib/customer-gold-ui";
export function CustomerSchemeDetailPage({ id }: { id: string }) {
  const { customerAppPaymentsEnabled } = useCustomerPortalCapabilities();
  const { data: scheme, isLoading, isError, refetch } = useGetCustomerSchemeQuery(id);
  const [payOpen, setPayOpen] = useState(false);
  const [redeemOpen, setRedeemOpen] = useState(false);
  const [redemptionMode, setRedemptionMode] = useState("");
  const [requestRedemption, redemptionState] = useRequestCustomerRedemptionMutation();
  const redemptionModeOptions = useMemo(() => {
    const preferred = scheme?.redemption?.preferredModes ?? [];
    return preferred.map((entry) =>
      typeof entry === "string" ? { mode: entry, label: entry.replaceAll("_", " ").toLowerCase() } : entry,
    );
  }, [scheme?.redemption?.preferredModes]);

  useEffect(() => {
    if (!redeemOpen) return;
    if (redemptionModeOptions.length) {
      setRedemptionMode(redemptionModeOptions[0].mode);
    }
  }, [redeemOpen, redemptionModeOptions]);

  const previewQuery = useGetCustomerSettlementPreviewQuery(
    { schemeId: id, mode: redemptionMode || "CASH" },
    { skip: !redeemOpen || !redemptionMode },
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
      if (!redemptionMode) return toast.error("Choose how you would like to redeem");
      await requestRedemption({
        schemeId: scheme.id,
        preferredMode: redemptionMode,
        expectedVersion: scheme.version,
      }).unwrap();
      toast.success("Redemption request sent to your jewellery");
      setRedeemOpen(false);
      await refetch();
    } catch (err) {
      toast.error(apiErrorMessage(err, "Could not submit the request"));
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
        mode={scheme.displayMode}
        maturityBenefit={maturityBenefit}
        schemeIsGold={schemeIsGold}
        planRuleSections={planRuleSections}
        payments={payments}
        redemptionEligible={redemption.eligible}
        redemptionBlocker={redemption.blocker}
        onRedeem={() => setRedeemOpen(true)}
        onDownloadReceipt={downloadReceipt}
        passbookLayout={displayMode === "FIXED" ? "fixed" : "default"}
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
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Request redemption</DialogTitle>
            <DialogDescription>
              Review the estimated settlement below. No ledger entry is created until your jeweller completes handover.
            </DialogDescription>
          </DialogHeader>
          {redemptionModeOptions.length > 1 ? (
            <div className="mt-2">
              <label className="text-xs font-bold text-muted-foreground">Preferred settlement</label>
              <Select value={redemptionMode} onValueChange={setRedemptionMode}>
                <SelectTrigger className="mt-2 h-11 rounded-xl">
                  <SelectValue placeholder="Choose mode" />
                </SelectTrigger>
                <SelectContent>
                  {redemptionModeOptions
                    .filter((opt) => {
                      const allowed = previewQuery.data?.allowedModes;
                      if (!allowed?.length) return true;
                      const row = allowed.find((m) => m.mode === opt.mode);
                      return row ? row.available !== false : true;
                    })
                    .map((opt) => (
                      <SelectItem key={opt.mode} value={opt.mode}>
                        {opt.label}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {previewQuery.data?.modePreviews?.[redemptionMode]?.note ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  {previewQuery.data.modePreviews[redemptionMode].note}
                  {previewQuery.data.modePreviews[redemptionMode].weightDisplay
                    ? ` · ${previewQuery.data.modePreviews[redemptionMode].weightDisplay}`
                    : ""}
                </p>
              ) : null}
            </div>
          ) : redemptionModeOptions.length === 1 ? (
            <p className="text-sm text-muted-foreground">Settlement: {redemptionModeOptions[0].label}</p>
          ) : null}
          <CustomerRedemptionPreview
            preview={previewQuery.data}
            isLoading={previewQuery.isLoading}
            isError={previewQuery.isError}
            error={previewQuery.error}
          />
          <Button
            disabled={
              redemptionState.isLoading ||
              !redemptionMode ||
              previewQuery.isLoading ||
              !previewQuery.data?.eligible
            }
            onClick={redeem}
            className="mt-4 bg-[#730321]"
          >
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
