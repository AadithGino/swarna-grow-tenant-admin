"use client";

import { Plus, Receipt, Tags, Trash2, Percent } from "lucide-react";
import { useExternalValueSync } from "@/src/hooks/use-external-value-sync";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader, FieldLabel } from "@/src/components/common/page-parts";
import {
  PageTab,
  PageTabs,
  PageTabsBar,
  PageTabsPanel,
} from "@/src/components/common/page-tabs";
import { PageSkeleton, QueryError } from "@/src/components/common/query-state";
import { toastApiError } from "@/src/lib/api-error";
import { cn } from "@/lib/utils";
import {
  useGetEcommerceFulfilmentSettingsQuery,
  useGetEcommerceTaxSettingsQuery,
  usePutEcommerceTaxSettingsMutation,
} from "@/src/store/api/admin-api";
import { blockersFromReadiness } from "@/src/features/ecommerce/ecommerce-checkout-blockers";
import { useEcommerceCatalogWrite } from "@/src/features/ecommerce/ecommerce-admin-shared";
import {
  EcommerceReadinessPanel,
  EcommerceRelatedLink,
  EcommerceSettingsHint,
  EcommerceSetupSteps,
  gstBpsFromPercentInput,
  gstPercentFromBps,
} from "@/src/features/ecommerce/ecommerce-settings-ui";

type RateRow = {
  code: string;
  label?: string;
  rateBps: number;
  active?: boolean;
  /** Local-only percent string for the input */
  ratePercent?: string;
};

type HsnRow = {
  classification: string;
  hsnSacCode: string;
  hsnSacType: "HSN" | "SAC";
};

function rateRowFromApi(r: RateRow): RateRow {
  return {
    ...r,
    ratePercent: gstPercentFromBps(r.rateBps),
  };
}

export function EcommerceTaxSettingsPage() {
  const query = useGetEcommerceTaxSettingsQuery();
  const fulfilment = useGetEcommerceFulfilmentSettingsQuery();
  const [putTax] = usePutEcommerceTaxSettingsMutation();
  const { entitled, disabledMessage } = useEcommerceCatalogWrite();
  const [rates, setRates] = useExternalValueSync<RateRow[]>(
    ((query.data?.rates as RateRow[]) ?? []).map(rateRowFromApi),
  );
  const [defaultClassification, setDefaultClassification] = useExternalValueSync(
    query.data?.defaultClassification ?? "",
  );
  const [version, setVersion] = useExternalValueSync(query.data?.version ?? 1);
  const [hsnMappings, setHsnMappings] = useExternalValueSync<HsnRow[]>(
    ((query.data?.hsnSacMappings as HsnRow[]) ?? []).map((m) => ({
      classification: String(m.classification ?? ""),
      hsnSacCode: String(m.hsnSacCode ?? ""),
      hsnSacType: (m.hsnSacType === "SAC" ? "SAC" : "HSN") as HsnRow["hsnSacType"],
    })),
  );

  if (query.isLoading) return <PageSkeleton cards={2} />;
  if (query.isError) return <QueryError error={query.error} onRetry={query.refetch} />;

  function updateRate(index: number, patch: Partial<RateRow>) {
    setRates(rates.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  function addRate() {
    setRates([...rates, { code: "", label: "", rateBps: 300, ratePercent: "3", active: true }]);
  }

  function removeRate(index: number) {
    setRates(rates.filter((_, i) => i !== index));
  }

  async function save() {
    if (!entitled) {
      toast.error(disabledMessage ?? "Not entitled");
      return;
    }
    const cleaned = rates
      .map((r) => ({
        code: r.code.trim(),
        label: r.label?.trim() || undefined,
        rateBps: r.ratePercent != null ? gstBpsFromPercentInput(r.ratePercent) : r.rateBps,
        active: r.active !== false,
      }))
      .filter((r) => r.code);
    try {
      const hasPersisted =
        Boolean(query.data?.updatedAt) || (query.data?.rates?.length ?? 0) > 0;
      const saved = await putTax({
        ...(hasPersisted ? { expectedVersion: version } : {}),
        rates: cleaned,
        defaultClassification: defaultClassification || null,
        hsnSacMappings: hsnMappings
          .filter((m) => m.classification.trim() && m.hsnSacCode.trim())
          .map((m) => ({
            classification: m.classification.trim(),
            hsnSacCode: m.hsnSacCode.trim().toUpperCase(),
            hsnSacType: m.hsnSacType,
          })),
      }).unwrap();
      setVersion(saved.version ?? version + 1);
      toast.success("Tax settings saved");
      query.refetch();
    } catch (err) {
      toastApiError(err);
    }
  }

  const activeCodes = rates.filter((r) => r.active !== false && r.code.trim());
  const checkoutBlockers = blockersFromReadiness(
    fulfilment.data?.checkoutReadiness as { blockers?: { code?: string; message?: string }[] },
  );
  const taxBlockers = checkoutBlockers.filter((b) =>
    [
      "MISSING_CATALOG_DEFAULT_CLASSIFICATION",
      "MISSING_ACTIVE_TAX_RATES",
      "MISSING_HSN_SAC_MAPPING",
      "UNKNOWN_ITEM_CLASSIFICATION",
    ].includes(String(b.code)),
  );

  function updateHsn(index: number, patch: Partial<HsnRow>) {
    setHsnMappings(hsnMappings.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  const readiness = fulfilment.data?.checkoutReadiness as
    | { checkoutTaxReady?: boolean; checkoutUsable?: boolean }
    | undefined;

  return (
    <>
      <PageHeader
        eyebrow="Online store · Store settings"
        icon={Percent}
        title="GST & HSN"
        description="GST buckets on products and the HSN/SAC codes used on quotes and invoices."
        actions={
          <Button type="button" className="rounded-xl" disabled={!entitled} onClick={save}>
            Save tax settings
          </Button>
        }
      />
      <EcommerceSetupSteps active="tax" />
      {!entitled ? <p className="text-sm text-amber-800">{disabledMessage}</p> : null}

      <EcommerceReadinessPanel
        blockers={taxBlockers}
        checkoutTaxReady={readiness?.checkoutTaxReady}
        checkoutUsable={readiness?.checkoutUsable}
        description="Issues tied to catalog GST or HSN/SAC on this page."
      />

      <EcommerceSettingsHint icon={Receipt} title="Two layers of tax">
        <p>
          <strong>Here</strong> you define how products are labelled in the catalog (e.g. 3% demo
          bucket) and map each bucket to an HSN or SAC code.{" "}
          <strong>Checkout GST</strong> (CGST/SGST/IGST split, seller GSTIN, accountant sign-off) lives
          on{" "}
          <EcommerceRelatedLink href="/ecommerce/fulfilment" label="Fulfilment settings" /> — both are
          required before customers can pay.
        </p>
      </EcommerceSettingsHint>

      <PageTabs defaultValue="rates" className="mt-6">
        <PageTabsBar sectionLabel="Configure">
          <PageTab value="rates">Product GST rates</PageTab>
          <PageTab value="hsn">HSN / SAC codes</PageTab>
        </PageTabsBar>

        <PageTabsPanel value="rates">
          <div className="space-y-5 p-5 sm:p-6">
            <div className="max-w-lg">
              <FieldLabel>Default GST bucket for new products</FieldLabel>
              <Select
                value={defaultClassification || "__none"}
                onValueChange={(v) => setDefaultClassification(v === "__none" ? "" : v)}
              >
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Choose default" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">No default — set per product</SelectItem>
                  {activeCodes.map((r) => (
                    <SelectItem key={r.code} value={r.code}>
                      {r.label ?? r.code} ({gstPercentFromBps(r.rateBps)}%)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Applied when a product does not pick its own classification.
              </p>
            </div>

            {rates.length === 0 ? (
              <p className="rounded-xl border border-dashed border-[#e4d7d2] bg-[#faf7f5] px-4 py-10 text-center text-sm text-muted-foreground">
                Add at least one GST bucket — for example a 3% jewellery rate and a 0% exempt bucket.
              </p>
            ) : (
              <div className="overflow-hidden rounded-xl border border-[#eaded9]">
                <div className="hidden grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_100px_88px_40px] gap-3 border-b border-[#eaded9] bg-[#faf7f5] px-4 py-2.5 text-xs font-semibold text-muted-foreground lg:grid">
                  <span>Code</span>
                  <span>Customer-facing label</span>
                  <span>GST %</span>
                  <span>Active</span>
                  <span className="sr-only">Remove</span>
                </div>
                <div className="divide-y divide-[#eaded9]">
                  {rates.map((r, index) => (
                    <div
                      key={`${r.code}-${index}`}
                      className="grid gap-3 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_100px_88px_40px] lg:items-center"
                    >
                      <div>
                        <p className="mb-1.5 text-sm font-medium text-[#4f3d41] lg:sr-only">Code</p>
                        <Input
                          value={r.code}
                          disabled={!entitled}
                          placeholder="JEWellery_3"
                          onChange={(e) => updateRate(index, { code: e.target.value.toUpperCase() })}
                          className="h-10 font-mono uppercase"
                        />
                      </div>
                      <div>
                        <p className="mb-1.5 text-sm font-medium text-[#4f3d41] lg:sr-only">Label</p>
                        <Input
                          value={r.label ?? ""}
                          disabled={!entitled}
                          placeholder="GST 3% (display)"
                          onChange={(e) => updateRate(index, { label: e.target.value })}
                          className="h-10"
                        />
                      </div>
                      <div>
                        <p className="mb-1.5 text-sm font-medium text-[#4f3d41] lg:sr-only">GST %</p>
                        <Input
                          value={r.ratePercent ?? gstPercentFromBps(r.rateBps)}
                          disabled={!entitled}
                          inputMode="decimal"
                          placeholder="3"
                          onChange={(e) => {
                            const ratePercent = e.target.value;
                            updateRate(index, {
                              ratePercent,
                              rateBps: gstBpsFromPercentInput(ratePercent),
                            });
                          }}
                          className="h-10 tabular-nums"
                        />
                      </div>
                      <label
                        className={cn(
                          "flex h-10 items-center justify-center gap-2 rounded-lg border border-[#e4d7d2] bg-white text-sm font-medium",
                          !entitled && "opacity-60",
                        )}
                      >
                        <Checkbox
                          checked={r.active !== false}
                          disabled={!entitled}
                          onCheckedChange={(checked) =>
                            updateRate(index, { active: checked === true })
                          }
                        />
                        <span className="lg:sr-only">Active</span>
                      </label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={!entitled}
                        className="text-muted-foreground hover:text-red-600"
                        onClick={() => removeRate(index)}
                        aria-label="Remove rate"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Button type="button" size="sm" variant="outline" disabled={!entitled} onClick={addRate}>
              <Plus className="mr-1.5 size-4" />
              Add GST bucket
            </Button>
          </div>
        </PageTabsPanel>

        <PageTabsPanel value="hsn">
          <div className="space-y-5 p-5 sm:p-6">
            <EcommerceSettingsHint icon={Tags} title="Why HSN/SAC matters">
              Checkout quotes and tax invoices need a statutory code for each GST bucket. Add one row
              per active classification code above.
            </EcommerceSettingsHint>

            {hsnMappings.length === 0 ? (
              <p className="rounded-xl border border-dashed border-[#e4d7d2] bg-[#faf7f5] px-4 py-10 text-center text-sm text-muted-foreground">
                No mappings yet. Use &quot;Add code&quot; to link each classification to HSN (goods) or SAC
                (services).
              </p>
            ) : (
              <div className="space-y-3">
                {hsnMappings.map((m, index) => (
                  <div
                    key={`${m.classification}-${index}`}
                    className="grid gap-4 rounded-xl border border-[#eaded9] bg-[#faf7f5] p-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_140px_auto] md:items-end"
                  >
                    <div>
                      <FieldLabel>Classification code</FieldLabel>
                      <Input
                        value={m.classification}
                        disabled={!entitled}
                        list={`hsn-classifications-${index}`}
                        placeholder="Same code as GST bucket"
                        onChange={(e) =>
                          updateHsn(index, { classification: e.target.value.toUpperCase() })
                        }
                        className="h-10 font-mono uppercase"
                      />
                      {activeCodes.length ? (
                        <datalist id={`hsn-classifications-${index}`}>
                          {activeCodes.map((r) => (
                            <option key={r.code} value={r.code} />
                          ))}
                        </datalist>
                      ) : null}
                    </div>
                    <div>
                      <FieldLabel>HSN / SAC number</FieldLabel>
                      <Input
                        value={m.hsnSacCode}
                        disabled={!entitled}
                        placeholder="7113"
                        onChange={(e) => updateHsn(index, { hsnSacCode: e.target.value })}
                        className="h-10 font-mono uppercase"
                      />
                    </div>
                    <div>
                      <FieldLabel>Code type</FieldLabel>
                      <Select
                        value={m.hsnSacType}
                        disabled={!entitled}
                        onValueChange={(v) =>
                          updateHsn(index, { hsnSacType: v as HsnRow["hsnSacType"] })
                        }
                      >
                        <SelectTrigger className="h-10">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="HSN">HSN — goods</SelectItem>
                          <SelectItem value="SAC">SAC — services</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={!entitled}
                      className="text-muted-foreground hover:text-red-600 md:mb-0.5"
                      onClick={() => setHsnMappings(hsnMappings.filter((_, i) => i !== index))}
                      aria-label="Remove mapping"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={!entitled}
              onClick={() =>
                setHsnMappings([
                  ...hsnMappings,
                  {
                    classification: defaultClassification || activeCodes[0]?.code || "",
                    hsnSacCode: "",
                    hsnSacType: "HSN",
                  },
                ])
              }
            >
              <Plus className="mr-1.5 size-4" />
              Add code mapping
            </Button>
          </div>
        </PageTabsPanel>
      </PageTabs>

      <p className="mt-4 text-center text-sm text-muted-foreground">
        Saved as configuration version {version}. Next:{" "}
        <EcommerceRelatedLink href="/ecommerce/fulfilment" label="Delivery, policies & checkout GST" />
      </p>
    </>
  );
}
