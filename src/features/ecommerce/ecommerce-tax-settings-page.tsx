"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
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
import { PageHeader, Surface } from "@/src/components/common/page-parts";
import { PageSkeleton, QueryError } from "@/src/components/common/query-state";
import { FieldLabel } from "@/src/components/common/page-parts";
import { toastApiError } from "@/src/lib/api-error";
import { cn } from "@/lib/utils";
import {
  useGetEcommerceFulfilmentSettingsQuery,
  useGetEcommerceTaxSettingsQuery,
  usePutEcommerceTaxSettingsMutation,
} from "@/src/store/api/admin-api";
import { blockersFromReadiness } from "@/src/features/ecommerce/ecommerce-checkout-blockers";
import { useEcommerceCatalogWrite } from "@/src/features/ecommerce/ecommerce-admin-shared";
import { EcommerceSectionNav } from "@/src/features/ecommerce/ecommerce-section-nav";

type RateRow = {
  code: string;
  label?: string;
  rateBps: number;
  active?: boolean;
};

type HsnRow = {
  classification: string;
  hsnSacCode: string;
  hsnSacType: "HSN" | "SAC";
};

function bpsToPercentLabel(bps: number) {
  if (!Number.isFinite(bps)) return "";
  return `${(bps / 100).toFixed(2)}%`;
}

export function EcommerceTaxSettingsPage() {
  const query = useGetEcommerceTaxSettingsQuery();
  const fulfilment = useGetEcommerceFulfilmentSettingsQuery();
  const [putTax] = usePutEcommerceTaxSettingsMutation();
  const { entitled, disabledMessage } = useEcommerceCatalogWrite();
  const [rates, setRates] = useExternalValueSync<RateRow[]>(
    (query.data?.rates as RateRow[]) ?? [],
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
    setRates([...rates, { code: "", label: "", rateBps: 300, active: true }]);
  }

  async function save() {
    if (!entitled) {
      toast.error(disabledMessage ?? "Not entitled");
      return;
    }
    const cleaned = rates
      .map((r) => ({
        ...r,
        code: r.code.trim(),
        label: r.label?.trim() || undefined,
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

  return (
    <>
      <PageHeader
        eyebrow="Online store"
        title="Tax settings"
        description="Catalog display rates and HSN/SAC mappings. Checkout component tax is configured separately under Fulfilment."
        actions={
          <Button type="button" disabled={!entitled} onClick={save}>
            Save settings
          </Button>
        }
      />
      <EcommerceSectionNav />
      {!entitled ? (
        <p className="mb-4 text-sm text-amber-800">{disabledMessage}</p>
      ) : null}

      {taxBlockers.length ? (
        <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-950">
          <p className="font-semibold">Checkout blockers tied to tax settings</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
            {taxBlockers.map((b) => (
              <li key={b.code ?? b.message}>
                <span className="font-mono text-xs">{b.code}</span> — {b.message}
              </li>
            ))}
          </ul>
          <Link
            href="/ecommerce/fulfilment"
            className="mt-3 inline-block text-sm font-semibold text-[#730321] underline"
          >
            Fulfilment & checkout tax
          </Link>
        </div>
      ) : null}

      <div className="space-y-5">
        <Surface
          title="Catalog tax classifications"
          description={`Display-only GST buckets for products. Saved as version ${version}.`}
        >
          <div className="space-y-5 p-5 sm:p-6">
            <div className="max-w-md">
              <FieldLabel>Default classification</FieldLabel>
              <Select
                value={defaultClassification || "__none"}
                onValueChange={(v) => setDefaultClassification(v === "__none" ? "" : v)}
              >
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Choose default" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">None (explicit null on save)</SelectItem>
                  {activeCodes.map((r) => (
                    <SelectItem key={r.code} value={r.code}>
                      {r.label ?? r.code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="mt-1.5 text-xs text-muted-foreground">
                Used when a product does not specify its own classification.
              </p>
            </div>

            <div className="space-y-3">
              {rates.length === 0 ? (
                <p className="rounded-xl border border-dashed border-[#e4d7d2] bg-[#faf7f5] px-4 py-8 text-center text-sm text-muted-foreground">
                  No tax rates yet. Add a row for each catalog classification code.
                </p>
              ) : null}
              {rates.map((r, index) => (
                <div
                  key={`${r.code}-${index}`}
                  className="rounded-xl border border-[#eaded9] bg-[#faf7f5] p-4"
                >
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_140px_auto] lg:items-end">
                    <div>
                      <FieldLabel>Code</FieldLabel>
                      <Input
                        value={r.code}
                        disabled={!entitled}
                        placeholder="DEMO_GST_3"
                        onChange={(e) => updateRate(index, { code: e.target.value.toUpperCase() })}
                        className="h-10 font-mono uppercase"
                      />
                    </div>
                    <div>
                      <FieldLabel>Label</FieldLabel>
                      <Input
                        value={r.label ?? ""}
                        disabled={!entitled}
                        placeholder="Demo GST 3%"
                        onChange={(e) => updateRate(index, { label: e.target.value })}
                        className="h-10"
                      />
                    </div>
                    <div>
                      <FieldLabel>Rate (basis points)</FieldLabel>
                      <Input
                        value={String(r.rateBps)}
                        disabled={!entitled}
                        inputMode="numeric"
                        onChange={(e) =>
                          updateRate(index, { rateBps: Number(e.target.value) || 0 })
                        }
                        className="h-10 font-mono tabular-nums"
                      />
                      <p className="mt-1 text-xs text-muted-foreground">
                        {bpsToPercentLabel(r.rateBps) || "—"} display rate
                      </p>
                    </div>
                    <label
                      className={cn(
                        "flex h-10 items-center gap-2 rounded-lg border border-[#e4d7d2] bg-white px-3 text-sm font-medium text-[#4f3d41]",
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
                      Active
                    </label>
                  </div>
                </div>
              ))}
            </div>

            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={!entitled}
              onClick={addRate}
            >
              <Plus className="mr-1.5 size-4" />
              Add classification
            </Button>
          </div>
        </Surface>

        <Surface
          title="HSN / SAC mappings"
          description="Required for checkout quotes and invoices — map each classification to a statutory code."
        >
          <div className="space-y-3 p-5 sm:p-6">
            {hsnMappings.length === 0 ? (
              <p className="rounded-xl border border-dashed border-[#e4d7d2] bg-[#faf7f5] px-4 py-8 text-center text-sm text-muted-foreground">
                Add a mapping for each active classification code.
              </p>
            ) : null}
            {hsnMappings.map((m, index) => (
              <div
                key={`${m.classification}-${index}`}
                className="grid gap-4 rounded-xl border border-[#eaded9] bg-[#faf7f5] p-4 md:grid-cols-3 md:items-end"
              >
                <div>
                  <FieldLabel>Classification</FieldLabel>
                  <Input
                    value={m.classification}
                    disabled={!entitled}
                    placeholder="DEMO_GST_3"
                    onChange={(e) => updateHsn(index, { classification: e.target.value.toUpperCase() })}
                    className="h-10 font-mono uppercase"
                  />
                </div>
                <div>
                  <FieldLabel>HSN / SAC code</FieldLabel>
                  <Input
                    value={m.hsnSacCode}
                    disabled={!entitled}
                    placeholder="7113"
                    onChange={(e) => updateHsn(index, { hsnSacCode: e.target.value })}
                    className="h-10 font-mono uppercase"
                  />
                </div>
                <div>
                  <FieldLabel>Type</FieldLabel>
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
                      <SelectItem value="HSN">HSN (goods)</SelectItem>
                      <SelectItem value="SAC">SAC (services)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))}
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={!entitled}
              onClick={() =>
                setHsnMappings([
                  ...hsnMappings,
                  {
                    classification: defaultClassification || "",
                    hsnSacCode: "",
                    hsnSacType: "HSN",
                  },
                ])
              }
            >
              <Plus className="mr-1.5 size-4" />
              Add mapping
            </Button>
          </div>
        </Surface>
      </div>
    </>
  );
}
