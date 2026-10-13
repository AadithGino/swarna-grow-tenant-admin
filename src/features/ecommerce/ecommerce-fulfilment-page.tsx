"use client";

import { MapPin, ShieldCheck, Truck } from "lucide-react";
import { useExternalValueSync } from "@/src/hooks/use-external-value-sync";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { PageHeader, FieldLabel } from "@/src/components/common/page-parts";
import {
  PageTab,
  PageTabs,
  PageTabsBar,
  PageTabsPanel,
} from "@/src/components/common/page-tabs";
import { PageSkeleton, QueryError } from "@/src/components/common/query-state";
import { toastApiError, parseApiError } from "@/src/lib/api-error";
import { rupeesToPaise, useEcommerceAdminAccess } from "@/src/features/ecommerce/ecommerce-admin-shared";
import {
  deliveryConfigIssues,
  isDeliveryConfigured,
  parseServiceablePincodes,
} from "@/src/features/ecommerce/ecommerce-delivery-config";
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
import {
  EcommerceReadinessPanel,
  EcommerceRelatedLink,
  EcommerceSettingsHint,
  EcommerceSettingsToggle,
  EcommerceCatalogNav,
  EcommerceSetupSteps,
} from "@/src/features/ecommerce/ecommerce-settings-ui";

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
      <PageHeader
        title="Fulfilment"
        description={access.readBlockedMessage ?? "Ecommerce read access required."}
      />
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
        title="Fulfilment & checkout"
        description="Step 2: how orders are fulfilled, what shoppers agree to, and GST on the payment screen."
        actions={
          <Button type="button" disabled={!access.entitled || !access.canWrite} onClick={save}>
            Save fulfilment settings
          </Button>
        }
      />
      {!access.entitled ? (
        <p className="mb-4 text-sm text-amber-800">{access.disabledMessage}</p>
      ) : null}

      <EcommerceCatalogNav />
      <EcommerceSetupSteps active="fulfilment" />

      <EcommerceReadinessPanel
        blockers={blockers}
        checkoutTaxReady={readiness?.checkoutTaxReady}
        checkoutUsable={readiness?.checkoutUsable}
      />

      <p className="mb-4 text-sm text-muted-foreground">
        Configuration version {version}. Product GST is on{" "}
        <EcommerceRelatedLink href="/ecommerce/tax" label="Tax settings" />.
      </p>

      <PageTabs defaultValue="fulfilment">
        <PageTabsBar sectionLabel="Store checkout setup">
          <PageTab value="fulfilment">Delivery & pickup</PageTab>
          <PageTab value="policies">Shopper policies</PageTab>
          <PageTab value="checkout-tax">GST on payment</PageTab>
        </PageTabsBar>

        <PageTabsPanel value="fulfilment">
          <div className="space-y-6 p-5 sm:p-6">
            <EcommerceSettingsHint icon={Truck} title="At least one fulfilment method">
              Turn on branch pickup, home delivery, or both. Customers choose at checkout; you can
              restrict COD to specific pincodes inside delivery.
            </EcommerceSettingsHint>

            <EcommerceSettingsToggle
              id="pickup-enabled"
              title="Branch pickup"
              description="Customers collect orders from selected showrooms."
              checked={pickupEnabled}
              disabled={!access.canWrite}
              onCheckedChange={setPickupEnabled}
            />
            {pickupEnabled ? (
              <div className="rounded-xl border border-[#eaded9] bg-white p-4">
                <FieldLabel>Which branches offer pickup?</FieldLabel>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {branchItems.map((b) => (
                    <label
                      key={String(b.id)}
                      className="flex cursor-pointer items-center gap-2 rounded-lg border border-[#efe7e1] px-3 py-2.5 text-sm hover:bg-[#faf7f5]"
                    >
                      <Checkbox
                        checked={pickupBranchIds.includes(String(b.id))}
                        disabled={!access.canWrite}
                        onCheckedChange={() => toggleBranch(String(b.id))}
                      />
                      <span>
                        {String(b.name)}{" "}
                        <span className="text-muted-foreground">({String(b.code)})</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            ) : null}

            <EcommerceSettingsToggle
              id="delivery-enabled"
              title="Home delivery"
              description="Ship to pincodes you list below. Set ₹0 for free delivery."
              checked={deliveryEnabled}
              disabled={!access.canWrite}
              onCheckedChange={setDeliveryEnabled}
            />

            {deliveryEnabled ? (
              <div className="space-y-4 rounded-xl border border-[#eaded9] bg-white p-4 sm:p-5">
                <div className="grid gap-4 lg:grid-cols-2">
                  <div>
                    <FieldLabel>Serviceable pincodes</FieldLabel>
                    <Textarea
                      value={pincodesText}
                      disabled={!access.canWrite}
                      onChange={(e) => setPincodesText(e.target.value)}
                      rows={5}
                      placeholder={"686691\n686692\n(one per line or comma-separated)"}
                      className="font-mono text-sm"
                    />
                    <p className="mt-1.5 text-xs text-muted-foreground">Six-digit Indian pincodes only.</p>
                  </div>
                  <div>
                    <FieldLabel>Delivery fee (₹)</FieldLabel>
                    <Input
                      value={deliveryChargeRupees}
                      disabled={!access.canWrite}
                      onChange={(e) => setDeliveryChargeRupees(e.target.value)}
                      placeholder="0"
                      inputMode="decimal"
                      className="h-11 text-lg tabular-nums"
                    />
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      Charged once per order. Use 0 for free delivery.
                    </p>
                    {deliveryIssues.length ? (
                      <ul className="mt-3 list-disc space-y-1 pl-4 text-xs text-amber-900">
                        {deliveryIssues.map((issue) => (
                          <li key={issue}>{issue}</li>
                        ))}
                      </ul>
                    ) : deliveryReady ? (
                      <p className="mt-3 text-xs text-emerald-800">Looks good — save to apply.</p>
                    ) : null}
                  </div>
                </div>

                <EcommerceSettingsToggle
                  id="courier-tracking"
                  title="Require courier name or tracking when marking shipped"
                  description="Turn off if you deliver with your own staff and do not use courier AWB numbers."
                  checked={requireCourierTracking}
                  disabled={!access.canWrite}
                  onCheckedChange={setRequireCourierTracking}
                />

                <div className="border-t border-[#eaded9] pt-4">
                  <EcommerceSettingsToggle
                    id="cod-enabled"
                    title="Cash on delivery (COD)"
                    description="Only for pincodes listed below — must be inside your delivery list."
                    checked={codEnabled}
                    disabled={!access.canWrite}
                    onCheckedChange={setCodEnabled}
                  />
                  {codEnabled ? (
                    <div className="mt-4">
                      <FieldLabel>COD pincodes</FieldLabel>
                      <Textarea
                        value={codPincodesText}
                        disabled={!access.canWrite}
                        onChange={(e) => setCodPincodesText(e.target.value)}
                        rows={3}
                        placeholder="686691"
                        className="font-mono text-sm"
                      />
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}

            <EcommerceSettingsHint icon={MapPin} title="Inter-state delivery">
              If you ship outside your registered state, also add destination states under the{" "}
              <strong>GST on payment</strong> tab so IGST lines can apply.
            </EcommerceSettingsHint>
          </div>
        </PageTabsPanel>

        <PageTabsPanel value="policies">
          <div className="p-5 sm:p-6">
            <EcommerceStorePoliciesPanel
              form={storePoliciesForm}
              disabled={!access.canWrite}
              onChange={setStorePoliciesForm}
            />
          </div>
        </PageTabsPanel>

        <PageTabsPanel value="checkout-tax">
          <div className="space-y-4 p-5 sm:p-6">
            <EcommerceSettingsHint icon={ShieldCheck} title="Accountant-approved checkout GST">
              This is separate from catalog GST buckets. Enter what your accountant signed off for
              live payment quotes (seller GSTIN, CGST/SGST or IGST splits, approval reference).
            </EcommerceSettingsHint>
            <EcommerceCheckoutTaxPanel
              form={checkoutForm}
              setForm={setCheckoutForm}
              blockers={blockers}
              disabled={!access.canWrite}
            />
          </div>
        </PageTabsPanel>
      </PageTabs>
    </>
  );
}
