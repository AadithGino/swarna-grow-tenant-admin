"use client";

import { useState } from "react";
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
import { ActionDialog } from "@/src/components/common/action-dialog";
import { FieldLabel, PageHeader, Surface } from "@/src/components/common/page-parts";
import { PageSkeleton, QueryError } from "@/src/components/common/query-state";
import { toastApiError } from "@/src/lib/api-error";
import {
  useGetEcommerceGoldRatesCurrentQuery,
  useGetEcommerceGoldRatesHistoryQuery,
  useSetEcommerceGoldRateMutation,
} from "@/src/store/api/admin-api";
import { useEcommerceCatalogWrite } from "@/src/features/ecommerce/ecommerce-admin-shared";

export function EcommerceGoldRatesPage() {
  const current = useGetEcommerceGoldRatesCurrentQuery();
  const history = useGetEcommerceGoldRatesHistoryQuery({ limit: 20 });
  const [setRate] = useSetEcommerceGoldRateMutation();
  const { entitled, disabledMessage } = useEcommerceCatalogWrite();
  const [open, setOpen] = useState(false);
  const [purity, setPurity] = useState("22K");
  const [rateRupee, setRateRupee] = useState("");
  const [effectiveAt, setEffectiveAt] = useState(
    () => new Date().toISOString().slice(0, 16),
  );

  if (current.isLoading || history.isLoading) return <PageSkeleton cards={3} />;
  if (current.isError || history.isError) {
    return (
      <QueryError
        error={current.error ?? history.error}
        onRetry={() => {
          current.refetch();
          history.refetch();
        }}
      />
    );
  }

  async function submitRate() {
    if (!entitled) {
      toast.error(disabledMessage ?? "Not entitled");
      return;
    }
    const rupees = Number(rateRupee);
    if (!Number.isFinite(rupees) || rupees <= 0) {
      toast.error("Enter a valid rate per gram in rupees.");
      return;
    }
    try {
      await setRate({
        purity,
        ratePerGramPaise: Math.round(rupees * 100),
        effectiveAt: new Date(effectiveAt).toISOString(),
      }).unwrap();
      toast.success("Gold rate published");
      setOpen(false);
      current.refetch();
      history.refetch();
    } catch (err) {
      toastApiError(err);
      throw err;
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Online store"
        title="Ecommerce gold rates"
        description="Rates older than seven days block new price estimates until you publish a fresh rate."
        actions={
          <Button type="button" disabled={!entitled} onClick={() => setOpen(true)}>
            Publish rate
          </Button>
        }
      />
      {!entitled ? (
        <p className="mb-4 text-sm text-amber-800">{disabledMessage}</p>
      ) : null}
      <div className="grid gap-4 md:grid-cols-3">
        {(current.data?.rates ?? []).map((row) => (
          <Surface key={row.purity} title={row.purity}>
            <div className="p-6 text-sm">
              <p className="text-2xl font-bold">
                {row.ratePerGram?.amountDisplay ?? "Not set"}
              </p>
              <p className="mt-2 text-muted-foreground">
                {row.effectiveAt
                  ? `Effective ${new Date(row.effectiveAt).toLocaleString("en-IN")}`
                  : "Publish a rate for this purity"}
              </p>
            </div>
          </Surface>
        ))}
      </div>
      <Surface title="Rate history">
        <ul className="divide-y text-sm">
          {(history.data?.items ?? []).slice(0, 20).map((row) => (
            <li key={row.id} className="flex justify-between px-6 py-3">
              <span>
                {row.purity} · {row.ratePerGram?.amountDisplay}
              </span>
              <span className="text-muted-foreground">
                {row.effectiveAt
                  ? new Date(row.effectiveAt).toLocaleString("en-IN")
                  : "—"}
              </span>
            </li>
          ))}
        </ul>
      </Surface>
      <ActionDialog
        open={open}
        onOpenChange={setOpen}
        title="Publish ecommerce gold rate"
        actionLabel="Save rate"
        submitDisabled={!entitled}
        onSubmit={submitRate}
      >
        <div className="grid gap-4">
          <div>
            <FieldLabel>Purity</FieldLabel>
            <Select value={purity} onValueChange={setPurity}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["18K", "22K", "24K"].map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <FieldLabel>Rate per gram (₹)</FieldLabel>
            <Input value={rateRupee} onChange={(e) => setRateRupee(e.target.value)} inputMode="decimal" />
          </div>
          <div>
            <FieldLabel>Effective at</FieldLabel>
            <Input
              type="datetime-local"
              value={effectiveAt}
              onChange={(e) => setEffectiveAt(e.target.value)}
            />
          </div>
        </div>
      </ActionDialog>
    </>
  );
}
