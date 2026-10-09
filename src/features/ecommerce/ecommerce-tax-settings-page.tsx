"use client";

import { useExternalValueSync } from "@/src/hooks/use-external-value-sync";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import {
  useGetEcommerceTaxSettingsQuery,
  usePutEcommerceTaxSettingsMutation,
} from "@/src/store/api/admin-api";
import { useEcommerceCatalogWrite } from "@/src/features/ecommerce/ecommerce-admin-shared";

type RateRow = {
  code: string;
  label?: string;
  rateBps: number;
  active?: boolean;
};

export function EcommerceTaxSettingsPage() {
  const query = useGetEcommerceTaxSettingsQuery();
  const [putTax] = usePutEcommerceTaxSettingsMutation();
  const { entitled, disabledMessage } = useEcommerceCatalogWrite();
  const [rates, setRates] = useExternalValueSync<RateRow[]>(
    (query.data?.rates as RateRow[]) ?? [],
  );
  const [defaultClassification, setDefaultClassification] = useExternalValueSync(
    query.data?.defaultClassification ?? "",
  );
  const [version, setVersion] = useExternalValueSync(query.data?.version ?? 1);

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
      }).unwrap();
      setVersion(saved.version ?? version + 1);
      toast.success("Tax settings saved");
      query.refetch();
    } catch (err) {
      toastApiError(err);
    }
  }

  const activeCodes = rates.filter((r) => r.active !== false && r.code.trim());

  return (
    <>
      <PageHeader
        eyebrow="Online store"
        title="Tax settings"
        description="Display estimates use a single rate per product classification. Confirm CGST/SGST/IGST split with your accountant before checkout."
        actions={
          <Button type="button" disabled={!entitled} onClick={save}>
            Save settings
          </Button>
        }
      />
      {!entitled ? (
        <p className="mb-4 text-sm text-amber-800">{disabledMessage}</p>
      ) : null}
      <Surface title={`Configuration v${version}`}>
        <div className="space-y-4 p-6 text-sm">
          <div className="max-w-sm">
            <FieldLabel>Default classification</FieldLabel>
            <Select
              value={defaultClassification || "__none"}
              onValueChange={(v) => setDefaultClassification(v === "__none" ? "" : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="None" />
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
          </div>
          <table className="w-full text-left">
            <thead>
              <tr className="border-b text-xs uppercase text-muted-foreground">
                <th className="py-2">Code</th>
                <th>Label</th>
                <th>Rate (bps)</th>
                <th>Active</th>
              </tr>
            </thead>
            <tbody>
              {rates.map((r, index) => (
                <tr key={`${r.code}-${index}`} className="border-b align-top">
                  <td className="py-2 pr-2">
                    <Input
                      value={r.code}
                      disabled={!entitled}
                      onChange={(e) => updateRate(index, { code: e.target.value })}
                      className="font-mono"
                    />
                  </td>
                  <td className="pr-2">
                    <Input
                      value={r.label ?? ""}
                      disabled={!entitled}
                      onChange={(e) => updateRate(index, { label: e.target.value })}
                    />
                  </td>
                  <td className="pr-2">
                    <Input
                      value={String(r.rateBps)}
                      disabled={!entitled}
                      inputMode="numeric"
                      onChange={(e) =>
                        updateRate(index, { rateBps: Number(e.target.value) || 0 })
                      }
                    />
                  </td>
                  <td>
                    <input
                      type="checkbox"
                      checked={r.active !== false}
                      disabled={!entitled}
                      onChange={(e) => updateRate(index, { active: e.target.checked })}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Button type="button" size="sm" variant="outline" disabled={!entitled} onClick={addRate}>
            Add rate row
          </Button>
        </div>
      </Surface>
    </>
  );
}
