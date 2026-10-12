"use client";

import { useExternalValueSync } from "@/src/hooks/use-external-value-sync";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { PageHeader, Surface, FieldLabel } from "@/src/components/common/page-parts";
import { PageSkeleton, QueryError } from "@/src/components/common/query-state";
import { toastApiError, parseApiError } from "@/src/lib/api-error";
import { rupeesToPaise, useEcommerceAdminAccess } from "@/src/features/ecommerce/ecommerce-admin-shared";
import {
  deliveryConfigIssues,
  isDeliveryConfigured,
  parseServiceablePincodes,
} from "@/src/features/ecommerce/ecommerce-delivery-config";
import { EcommerceSectionNav } from "@/src/features/ecommerce/ecommerce-section-nav";
import {
  checkoutTaxConfigPayload,
  checkoutTaxFormFromApi,
  EcommerceCheckoutTaxPanel,
} from "@/src/features/ecommerce/ecommerce-checkout-tax-panel";
import { blockersFromReadiness } from "@/src/features/ecommerce/ecommerce-checkout-blockers";
import {
  useGetBranchesQuery,
  useGetEcommerceFulfilmentSettingsQuery,
  usePutEcommerceFulfilmentSettingsMutation,
} from "@/src/store/api/admin-api";
import {
  EcommerceStorePoliciesPanel,
  storePoliciesFormFromApi,
  storePoliciesPayload,
  storePolicyFieldIssues,
  type StorePoliciesForm,
} from "@/src/features/ecommerce/ecommerce-store-policies-panel";

const EMPTY_BRANCH_IDS: string[] = [];

export function EcommerceFulfilmentPage() {
  const access = useEcommerceAdminAccess();
  const query = useGetEcommerceFulfilmentSettingsQuery(undefined, { skip: !access.canRead });
  const branches = useGetBranchesQuery(undefined, { skip: !access.canRead });
  const [putSettings] = usePutEcommerceFulfilmentSettingsMutation();

  const [version, setVersion] = useExternalValueSync(query.data?.version ?? 1);
  const [pickupEnabled, setPickupEnabled] = useExternalValueSync(query.data?.pickupEnabled === true);
  const [pickupBranchIds, setPickupBranchIds] = useExternalValueSync<string[]>(
    (query.data?.pickupBranchIds as string[]) ?? EMPTY_BRANCH_IDS,
  );
  const [deliveryEnabled, setDeliveryEnabled] = useExternalValueSync(
    query.data?.deliveryEnabled === true,
  );
  const [deliveryChargeRupees, setDeliveryChargeRupees] = useExternalValueSync(
    query.data?.deliveryChargePaise != null
      ? String(Number(query.data.deliveryChargePaise) / 100)
      : "",
  );
  const [pincodesText, setPincodesText] = useExternalValueSync(
    ((query.data?.serviceablePincodes as string[]) ?? []).join("\n"),
  );
  const [codEnabled, setCodEnabled] = useExternalValueSync(query.data?.codEnabled === true);
  const [codPincodesText, setCodPincodesText] = useExternalValueSync(
    ((query.data?.codPincodes as string[]) ?? []).join("\n"),
  );
  const [checkoutForm, setCheckoutForm] = useExternalValueSync(
    checkoutTaxFormFromApi(query.data?.checkoutTaxConfig as Record<string, unknown> | undefined),
  );
  const [requireCourierTracking, setRequireCourierTracking] = useExternalValueSync(
    query.data?.requireCourierTrackingForShipped === true,
  );
  const [storePoliciesForm, setStorePoliciesForm] = useExternalValueSync<StorePoliciesForm>(
    storePoliciesFormFromApi(query.data as Record<string, unknown> | undefined),
  );

  const deliveryChargePaisePreview = rupeesToPaise(deliveryChargeRupees);
  const deliveryReady = isDeliveryConfigured(pincodesText, deliveryChargePaisePreview);
  const deliveryIssues = deliveryEnabled
    ? deliveryConfigIssues(pincodesText, deliveryChargeRupees, deliveryChargePaisePreview)
    : [];

  if (!access.canRead) {
    return (
      <Surface title="Fulfilment">
        <p className="p-6 text-sm text-muted-foreground">{access.readBlockedMessage}</p>
      </Surface>
    );
  }
  if (query.isLoading) return <PageSkeleton cards={2} />;
  if (query.isError) return <QueryError error={query.error} onRetry={query.refetch} />;

  const readiness = query.data?.checkoutReadiness as
    | { checkoutTaxReady?: boolean; checkoutUsable?: boolean; blockers?: { code?: string; message?: string }[] }
    | undefined;
  const blockers = blockersFromReadiness(readiness);
  const branchItems = branches.data?.items ?? [];

  function toggleBranch(id: string) {
    setPickupBranchIds(
      pickupBranchIds.includes(id)
        ? pickupBranchIds.filter((b) => b !== id)
        : [...pickupBranchIds, id],
    );
  }

  function applySavedSettings(saved: Record<string, unknown>) {
    setVersion(Number(saved.version ?? version + 1));
    setPickupEnabled(saved.pickupEnabled === true);
    setPickupBranchIds((saved.pickupBranchIds as string[]) ?? []);
    setDeliveryEnabled(saved.deliveryEnabled === true);
    setDeliveryChargeRupees(
      saved.deliveryChargePaise != null ? String(Number(saved.deliveryChargePaise) / 100) : "",
    );
    setPincodesText(((saved.serviceablePincodes as string[]) ?? []).join("\n"));
    setCodEnabled(saved.codEnabled === true);
    setCodPincodesText(((saved.codPincodes as string[]) ?? []).join("\n"));
    setCheckoutForm(
      checkoutTaxFormFromApi(saved.checkoutTaxConfig as Record<string, unknown> | undefined),
    );
    setRequireCourierTracking(saved.requireCourierTrackingForShipped === true);
    setStorePoliciesForm(storePoliciesFormFromApi(saved));
  }

  async function save() {
    if (!access.entitled || !access.canWrite) {
      toast.error(access.writeBlockedMessage ?? access.disabledMessage ?? "Not allowed");
      return;
    }
    const deliveryChargePaise = rupeesToPaise(deliveryChargeRupees);
    const serviceablePincodes = parseServiceablePincodes(pincodesText);
    const codPincodes = parseServiceablePincodes(codPincodesText);
    if (deliveryEnabled) {
      const issues = deliveryConfigIssues(pincodesText, deliveryChargeRupees, deliveryChargePaise);
      if (issues.length) {
        toast.error(issues.join(" "));
        return;
      }
    }
    if (pickupEnabled && pickupBranchIds.length === 0) {
      toast.error("Select at least one pickup branch, or turn off branch pickup.");
      return;
    }
    const policyIssues = storePolicyFieldIssues(storePoliciesForm);
    if (policyIssues.length) {
      toast.error(policyIssues[0]);
      return;
    }
    const wantDelivery = deliveryEnabled;
    try {
      const saved = await putSettings({
        expectedVersion: version,
        pickupEnabled,
        pickupBranchIds,
        deliveryEnabled,
        deliveryChargePaise: deliveryChargePaise ?? undefined,
        serviceablePincodes,
        codEnabled,
        codPincodes: codEnabled ? codPincodes : [],
        requireCourierTrackingForShipped: requireCourierTracking,
        storePolicies: storePoliciesPayload(storePoliciesForm, query.data as Record<string, unknown>),
        checkoutTaxConfig: checkoutTaxConfigPayload(checkoutForm),
      }).unwrap();
      applySavedSettings(saved);
      if (wantDelivery && saved.deliveryEnabled !== true) {
        toast.warning(
          "Delivery was not enabled — the server requires valid pincodes and a delivery charge (₹0 is allowed).",
        );
      } else {
        toast.success("Fulfilment settings saved");
      }
      void query.refetch();
    } catch (err) {
      if (parseApiError(err).code === "VERSION_CONFLICT") {
        toast.error("Settings changed elsewhere — refreshing.");
        query.refetch();
        return;
      }
      toastApiError(err);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Online store"
        title="Fulfilment & checkout readiness"
        description="Pickup, delivery, and accountant checkout tax. Quotes use these rules — display GST alone is not enough for checkout."
        actions={
          <Button type="button" disabled={!access.entitled || !access.canWrite} onClick={save}>
            Save settings
          </Button>
        }
      />
      <EcommerceSectionNav />
      {!access.entitled ? (
        <p className="mb-4 text-sm text-amber-800">{access.disabledMessage}</p>
      ) : null}
      <Surface title={`Configuration v${version}`}>
        <div className="space-y-6 p-6 text-sm">
          <div>
            <h3 className="font-semibold">Checkout readiness</h3>
            <p className="mt-1 text-muted-foreground">
              Checkout tax ready: {readiness?.checkoutTaxReady ? "Yes" : "No"} · Payment checkout:{" "}
              {readiness?.checkoutUsable ? "Enabled" : "Blocked (payments need separate entitlement)"}
            </p>
            {blockers.length ? (
              <ul className="mt-2 space-y-1 text-amber-900">
                {blockers.map((b) => (
                  <li key={b.code ?? b.message}>
                    <span className="font-mono text-xs text-amber-950">{b.code ?? "BLOCKER"}</span>
                    {" — "}
                    {b.message}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-emerald-800">No checkout tax blockers from the server.</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              checked={pickupEnabled}
              disabled={!access.canWrite}
              onCheckedChange={(v) => setPickupEnabled(v === true)}
            />
            <span>Enable branch pickup</span>
          </div>
          {pickupEnabled ? (
            <div className="space-y-2">
              <FieldLabel>Pickup branches (must belong to this jeweller)</FieldLabel>
              {branchItems.map((b) => (
                <label key={String(b.id)} className="flex items-center gap-2">
                  <Checkbox
                    checked={pickupBranchIds.includes(String(b.id))}
                    disabled={!access.canWrite}
                    onCheckedChange={() => toggleBranch(String(b.id))}
                  />
                  {String(b.name)} ({String(b.code)})
                </label>
              ))}
            </div>
          ) : null}
          <div className="space-y-3 rounded-lg border border-border/80 p-4">
            <div className="flex items-start gap-2">
              <Checkbox
                id="delivery-enabled"
                checked={deliveryEnabled}
                disabled={!access.canWrite}
                onCheckedChange={(v) => setDeliveryEnabled(v === true)}
              />
              <label htmlFor="delivery-enabled" className="cursor-pointer leading-snug">
                <span className="font-medium">Offer delivery</span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  Fill pincodes and delivery charge below, then save. For checkout tax, also add
                  supported destination states and inter-state IGST lines in the section below.
                </span>
              </label>
            </div>
            {deliveryEnabled && !deliveryReady ? (
              <ul className="list-disc space-y-1 pl-5 text-xs text-amber-900">
                {deliveryIssues.map((issue) => (
                  <li key={issue}>{issue}</li>
                ))}
              </ul>
            ) : null}
            {deliveryEnabled && deliveryReady ? (
              <p className="text-xs text-emerald-800">
                Delivery details look complete — click Save settings to apply.
              </p>
            ) : null}
            <FieldLabel>Serviceable pincodes (one per line or comma-separated, 6 digits)</FieldLabel>
            <Textarea
              value={pincodesText}
              disabled={!access.canWrite}
              onChange={(e) => setPincodesText(e.target.value)}
              rows={4}
              placeholder="686691"
            />
            <FieldLabel>Delivery charge (₹, server-authoritative — use 0 for free delivery)</FieldLabel>
            <Input
              value={deliveryChargeRupees}
              disabled={!access.canWrite}
              onChange={(e) => setDeliveryChargeRupees(e.target.value)}
              placeholder="0"
              inputMode="decimal"
            />
            <label className="mt-3 flex items-start gap-2 text-sm">
              <Checkbox
                checked={requireCourierTracking}
                disabled={!access.canWrite}
                onCheckedChange={(v) => setRequireCourierTracking(v === true)}
              />
              <span>
                Require courier name or tracking number before marking delivery orders as shipped. Turn
                off for store-managed delivery without courier tracking.
              </span>
            </label>
            <div className="mt-4 space-y-2 border-t border-border/60 pt-4">
              <div className="flex items-start gap-2">
                <Checkbox
                  id="cod-enabled"
                  checked={codEnabled}
                  disabled={!access.canWrite || !deliveryEnabled}
                  onCheckedChange={(v) => setCodEnabled(v === true)}
                />
                <label htmlFor="cod-enabled" className="cursor-pointer leading-snug">
                  <span className="font-medium">Cash on delivery (COD)</span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    COD pincodes must be a subset of serviceable delivery pincodes. Delivery coverage
                    and COD coverage are configured separately.
                  </span>
                </label>
              </div>
              {codEnabled ? (
                <>
                  <FieldLabel>COD pincodes (subset of delivery list above)</FieldLabel>
                  <Textarea
                    value={codPincodesText}
                    disabled={!access.canWrite}
                    onChange={(e) => setCodPincodesText(e.target.value)}
                    rows={3}
                    placeholder="686692"
                  />
                </>
              ) : null}
            </div>
          </div>
          <EcommerceStorePoliciesPanel
            form={storePoliciesForm}
            disabled={!access.canWrite}
            onChange={setStorePoliciesForm}
          />
          <hr />
          <h3 className="font-semibold">Checkout tax (accountant-approved components)</h3>
          <EcommerceCheckoutTaxPanel
            form={checkoutForm}
            setForm={setCheckoutForm}
            blockers={blockers}
            disabled={!access.canWrite}
          />
        </div>
      </Surface>
    </>
  );
}
