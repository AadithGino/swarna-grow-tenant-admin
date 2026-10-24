"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader, Surface } from "@/src/components/common/page-parts";
import { PageSkeleton, QueryError } from "@/src/components/common/query-state";
import { StatusBadge } from "@/src/components/common/status-badge";
import { toastApiError } from "@/src/lib/api-error";
import { money } from "@/src/lib/format";
import { newIdempotencyKey } from "@/src/lib/idempotency";
import {
  useCreateDigitalMetalsRedemptionCatalogItemMutation,
  useGetDigitalMetalsRedemptionCatalogueQuery,
  useGetDigitalMetalsRedemptionFulfilmentQueueQuery,
  useGetDigitalMetalsRedemptionOrderQuery,
  useGetDigitalMetalsRedemptionOrdersQuery,
  usePostDigitalMetalsRedemptionFulfilmentActionMutation,
} from "@/src/store/api/admin-api";
import { formatAssetLabel, gramsToUg } from "@/src/lib/digital-metals-asset-ui";
import { formatDeliveryAddressSnapshot } from "@/src/lib/digital-metals-display";
import {
  paiseToRupeeInput,
  rupeeInputToPaise,
  ugToGramsDisplay,
} from "@/src/lib/digital-metals-display";
import { Checkbox } from "@/components/ui/checkbox";
import { FieldLabel } from "@/src/components/common/page-parts";
import {
  useGetDigitalMetalsCapabilityQuery,
  usePatchDigitalMetalsRedemptionCatalogItemMutation,
} from "@/src/store/api/admin-api";
import { useDigitalMetalsServerEntitlement } from "./digital-metals-admin-shared";
import { AdminDigitalMetalsDirectPdfPanel } from "./digital-metals-admin-direct-pdf-panel";
import {
  formatAdminDateTime,
  RedemptionAdminCustomerPanel,
  RedemptionOrderListRow,
  redemptionFulfilmentPreview,
  redemptionMetalLabel,
  type RedemptionAdminRow,
} from "./digital-metals-redemption-admin-shared";

type CatalogueTaxLine = {
  code: string;
  label: string;
  base: string;
  ratePercent: string;
  active: boolean;
};

function taxLinesFromItem(lines: unknown): CatalogueTaxLine[] {
  if (!Array.isArray(lines)) return [];
  return lines.map((row) => {
    const r = row as Record<string, unknown>;
    return {
      code: String(r.code ?? ""),
      label: String(r.label ?? ""),
      base: String(r.base ?? "MINTING"),
      ratePercent: r.ratePercent != null ? String(r.ratePercent) : "",
      active: r.active !== false,
    };
  });
}

function taxLinesToApi(lines: CatalogueTaxLine[]) {
  return lines
    .filter((t) => t.code.trim())
    .map((t) => ({
      code: t.code.trim(),
      label: t.label.trim() || t.code.trim(),
      base: t.base.trim() || "MINTING",
      ratePercent: Number(t.ratePercent),
      active: t.active,
    }));
}

const ACTION_LABELS: Record<string, string> = {
  ACCEPT_FULFILMENT: "Accept fulfilment",
  RECORD_PACKING: "Mark packing",
  MARK_PICKUP_READY: "Pickup ready",
  DISPATCH: "Dispatch (manual tracking)",
  ISSUE_PICKUP_CODE: "Issue pickup code",
  COMPLETE_PICKUP: "Complete pickup",
  COMPLETE_DELIVERY: "Complete delivery",
  CANCEL_PRE_DISPATCH: "Cancel (pre-dispatch)",
  OPEN_INVESTIGATION: "Open investigation",
  RESOLVE_RETURN: "Verified return",
  DISPATCH_REPLACEMENT: "Replacement dispatch",
  RECORD_DELAY: "Record delay",
};

function CatalogueItemRow({
  item,
  patchItem,
  onSaved,
}: {
  item: Record<string, unknown>;
  patchItem: ReturnType<typeof usePatchDigitalMetalsRedemptionCatalogItemMutation>[0];
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(String(item.label ?? ""));
  const [leadDays, setLeadDays] = useState(String(item.leadTimeDays ?? 3));
  const [deliveryPaise, setDeliveryPaise] = useState(paiseToRupeeInput(Number(item.deliveryFlatPaise ?? 0)));
  const [packagingPaise, setPackagingPaise] = useState(paiseToRupeeInput(Number(item.packagingPaise ?? 0)));
  const [pickupEnabled, setPickupEnabled] = useState(item.pickupEnabled !== false);
  const [deliveryEnabled, setDeliveryEnabled] = useState(item.deliveryEnabled !== false);
  const minting = (item.mintingRule ?? {}) as Record<string, unknown>;
  const [mintingType, setMintingType] = useState(String(minting.type ?? "NONE"));
  const [mintingValue, setMintingValue] = useState(
    minting.type === "FLAT_INR"
      ? paiseToRupeeInput(Number(minting.amountPaise ?? 0))
      : String(minting.percent ?? "0"),
  );
  const [taxLines, setTaxLines] = useState(() => taxLinesFromItem(item.taxLines));

  async function saveEdit() {
    if (!pickupEnabled && !deliveryEnabled) {
      toast.error("Enable pickup and/or delivery.");
      return;
    }
    const deliveryFlatPaise = rupeeInputToPaise(deliveryPaise);
    const packagingFlatPaise = rupeeInputToPaise(packagingPaise);
    if (deliveryFlatPaise == null || packagingFlatPaise == null || leadDays.trim() === "" || Number.isNaN(Number(leadDays))) {
      toast.error("Charges and lead time must be valid (zero rupees is allowed).");
      return;
    }
    for (const t of taxLines) {
      if (t.code.trim() && (t.ratePercent.trim() === "" || Number.isNaN(Number(t.ratePercent)))) {
        toast.error("Tax lines need a rate or must be removed.");
        return;
      }
    }
    const mintingRule =
      mintingType === "NONE"
        ? { type: "NONE" as const }
        : mintingType === "FLAT_INR"
          ? (() => {
              const amountPaise = rupeeInputToPaise(mintingValue);
              if (amountPaise == null) throw new Error("Invalid minting fee");
              return { type: "FLAT_INR" as const, amountPaise };
            })()
          : { type: "PERCENT" as const, percent: Number(mintingValue) };
    try {
      await patchItem({
        itemId: String(item.id),
        body: {
          label: label.trim(),
          leadTimeDays: Number(leadDays),
          deliveryFlatPaise,
          packagingPaise: packagingFlatPaise,
          pickupEnabled,
          deliveryEnabled,
          mintingRule,
          taxLines: taxLinesToApi(taxLines),
        },
      }).unwrap();
      toast.success("Catalogue item updated.");
      setEditing(false);
      onSaved();
    } catch (err) {
      toastApiError(err);
    }
  }

  return (
    <div className="space-y-2 px-4 py-3 text-sm">
      <div className="flex flex-wrap justify-between gap-2">
        <div>
          <p className="font-medium">{String(item.label)}</p>
          <p className="text-xs text-muted-foreground">
            {String(item.sku)} · {formatAssetLabel(String(item.metal), Number(item.finenessPpm))} ·{" "}
            {ugToGramsDisplay(String(item.unitQuantityUg))} per unit
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={item.active ? "ACTIVE" : "DISABLED"} />
          <Button type="button" size="sm" variant="outline" onClick={() => setEditing((v) => !v)}>
            {editing ? "Close" : "Edit"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() =>
              void patchItem({
                itemId: String(item.id),
                body: { active: !item.active },
              })
                .unwrap()
                .then(onSaved)
                .catch(toastApiError)
            }
          >
            {item.active ? "Disable" : "Enable"}
          </Button>
        </div>
      </div>
      {editing ? (
        <div className="grid gap-2 rounded border p-3 md:grid-cols-2">
          <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Label" />
          <Input value={leadDays} onChange={(e) => setLeadDays(e.target.value)} placeholder="Lead days" />
          <Input inputMode="decimal" value={deliveryPaise} onChange={(e) => setDeliveryPaise(e.target.value)} placeholder="Delivery charge (₹)" />
          <Input inputMode="decimal" value={packagingPaise} onChange={(e) => setPackagingPaise(e.target.value)} placeholder="Packaging charge (₹)" />
          <select
            className="rounded border px-2 py-2"
            value={mintingType}
            onChange={(e) => setMintingType(e.target.value)}
          >
            <option value="NONE">Minting none</option>
            <option value="FLAT_INR">Minting flat (₹)</option>
            <option value="PERCENT">Minting percent</option>
          </select>
          {mintingType !== "NONE" ? (
            <Input value={mintingValue} onChange={(e) => setMintingValue(e.target.value)} placeholder="Minting value" />
          ) : null}
          <label className="flex items-center gap-2">
            <Checkbox checked={pickupEnabled} onCheckedChange={(v) => setPickupEnabled(v === true)} />
            Pickup
          </label>
          <label className="flex items-center gap-2">
            <Checkbox checked={deliveryEnabled} onCheckedChange={(v) => setDeliveryEnabled(v === true)} />
            Delivery
          </label>
          <div className="md:col-span-2 space-y-2">
            <FieldLabel>Tax lines</FieldLabel>
            {taxLines.map((t, idx) => (
              <div key={idx} className="grid gap-2 md:grid-cols-4">
                <Input
                  placeholder="Code"
                  value={t.code}
                  onChange={(e) =>
                    setTaxLines((rows) => rows.map((r, i) => (i === idx ? { ...r, code: e.target.value } : r)))
                  }
                />
                <Input
                  placeholder="Rate %"
                  value={t.ratePercent}
                  onChange={(e) =>
                    setTaxLines((rows) => rows.map((r, i) => (i === idx ? { ...r, ratePercent: e.target.value } : r)))
                  }
                />
                <Input
                  placeholder="Label"
                  value={t.label}
                  onChange={(e) =>
                    setTaxLines((rows) => rows.map((r, i) => (i === idx ? { ...r, label: e.target.value } : r)))
                  }
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setTaxLines((rows) => rows.filter((_, i) => i !== idx))}
                >
                  Remove
                </Button>
              </div>
            ))}
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() =>
                setTaxLines((rows) => [
                  ...rows,
                  { code: "", label: "", base: "MINTING", ratePercent: "", active: true },
                ])
              }
            >
              Add tax line
            </Button>
          </div>
          <Button type="button" size="sm" onClick={() => void saveEdit()}>
            Save changes
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function actionPath(action: string): string {
  const map: Record<string, string> = {
    ACCEPT_FULFILMENT: "accept",
    RECORD_PACKING: "packing",
    MARK_PICKUP_READY: "pickup-ready",
    DISPATCH: "dispatch",
    ISSUE_PICKUP_CODE: "pickup-code",
    COMPLETE_PICKUP: "complete-pickup",
    COMPLETE_DELIVERY: "complete-delivery",
    CANCEL_PRE_DISPATCH: "cancel",
    OPEN_INVESTIGATION: "investigation",
    RESOLVE_RETURN: "resolve-return",
    DISPATCH_REPLACEMENT: "replacement-dispatch",
    RECORD_DELAY: "delay",
  };
  return map[action] ?? action.toLowerCase();
}

export function DigitalMetalsRedemptionCatalogPage() {
  const ent = useDigitalMetalsServerEntitlement();
  const capability = useGetDigitalMetalsCapabilityQuery(undefined, { skip: !ent.workspaceVisible });
  const catalogue = useGetDigitalMetalsRedemptionCatalogueQuery(undefined, { skip: !ent.workspaceVisible });
  const [createItem, createState] = useCreateDigitalMetalsRedemptionCatalogItemMutation();
  const [patchItem] = usePatchDigitalMetalsRedemptionCatalogItemMutation();
  const [sku, setSku] = useState("");
  const [label, setLabel] = useState("");
  const [metal, setMetal] = useState<"GOLD" | "SILVER">("GOLD");
  const [finenessPpm, setFinenessPpm] = useState("999000");
  const [unitGrams, setUnitGrams] = useState("2");
  const [mintingType, setMintingType] = useState<"NONE" | "FLAT_INR" | "PERCENT">("FLAT_INR");
  const [mintingPaise, setMintingPaise] = useState("500");
  const [deliveryPaise, setDeliveryPaise] = useState("0");
  const [packagingPaise, setPackagingPaise] = useState("0");
  const [createTaxLines, setCreateTaxLines] = useState<CatalogueTaxLine[]>([]);
  const [pickupEnabled, setPickupEnabled] = useState(true);
  const [deliveryEnabled, setDeliveryEnabled] = useState(false);
  const [leadDays, setLeadDays] = useState("3");

  if (ent.loading || catalogue.isLoading) return <PageSkeleton cards={2} />;
  if (!ent.workspaceVisible) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">{ent.disabledMessage}</p>
      </div>
    );
  }
  if (catalogue.isError) return <QueryError error={catalogue.error} onRetry={catalogue.refetch} />;

  const items = (catalogue.data?.items ?? []) as Record<string, unknown>[];

  async function onCreate() {
    if (!sku.trim() || !label.trim()) {
      toast.error("SKU and label required.");
      return;
    }
    if (!pickupEnabled && !deliveryEnabled) {
      toast.error("Enable pickup and/or delivery.");
      return;
    }
    const unitQuantityUg = gramsToUg(unitGrams);
    if (unitQuantityUg < 1) {
      toast.error("Invalid unit weight.");
      return;
    }
    const deliveryFlatPaise = rupeeInputToPaise(deliveryPaise);
    const packagingFlatPaise = rupeeInputToPaise(packagingPaise);
    if (deliveryFlatPaise == null || packagingFlatPaise == null) {
      toast.error("Enter valid delivery and packaging charges (₹0 is allowed).");
      return;
    }
    const mintingRule =
      mintingType === "NONE"
        ? { type: "NONE" as const }
        : mintingType === "FLAT_INR"
          ? (() => {
              const amountPaise = rupeeInputToPaise(mintingPaise);
              if (amountPaise == null) throw new Error("Invalid minting fee");
              return { type: "FLAT_INR" as const, amountPaise };
            })()
          : { type: "PERCENT" as const, percent: Number(mintingPaise) };
    try {
      await createItem({
        sku: sku.trim(),
        label: label.trim(),
        metal,
        finenessPpm: Number(finenessPpm),
        unitQuantityUg,
        mintingRule,
        deliveryFlatPaise,
        packagingPaise: packagingFlatPaise,
        taxLines: taxLinesToApi(createTaxLines),
        leadTimeDays: Number(leadDays),
        pickupEnabled,
        deliveryEnabled,
        active: true,
      }).unwrap();
      toast.success("Catalogue item created.");
      setSku("");
      setLabel("");
      catalogue.refetch();
    } catch (err) {
      toastApiError(err);
    }
  }

  return (
    <div className="space-y-6 p-6" data-testid="digital-metals-redemption-catalogue">
      <PageHeader title="Redemption catalogue" description="Physical denominations; no stock prerequisite." />
      <Surface title="Add catalogue item">
        <div className="grid gap-3 px-4 py-3 md:grid-cols-2">
          <Input placeholder="SKU" value={sku} onChange={(e) => setSku(e.target.value)} />
          <Input placeholder="Customer label" value={label} onChange={(e) => setLabel(e.target.value)} />
          <div>
            <FieldLabel>Metal</FieldLabel>
            <select className="w-full rounded border px-2 py-2 text-sm" value={metal} onChange={(e) => setMetal(e.target.value as "GOLD" | "SILVER")}>
              <option value="GOLD">Gold</option>
              <option value="SILVER">Silver</option>
            </select>
          </div>
          <div>
            <FieldLabel>Fineness (ppm)</FieldLabel>
            <Input value={finenessPpm} onChange={(e) => setFinenessPpm(e.target.value)} />
          </div>
          <div>
            <FieldLabel>Unit weight (grams)</FieldLabel>
            <Input inputMode="decimal" value={unitGrams} onChange={(e) => setUnitGrams(e.target.value)} />
          </div>
          <div>
            <FieldLabel>Lead time (days)</FieldLabel>
            <Input value={leadDays} onChange={(e) => setLeadDays(e.target.value)} />
          </div>
          <div>
            <FieldLabel>Minting rule</FieldLabel>
            <select className="w-full rounded border px-2 py-2 text-sm" value={mintingType} onChange={(e) => setMintingType(e.target.value as typeof mintingType)}>
              <option value="NONE">None (₹0)</option>
              <option value="FLAT_INR">Flat charge (₹)</option>
              <option value="PERCENT">Percent</option>
            </select>
            {mintingType !== "NONE" ? (
              <Input inputMode="decimal" className="mt-1" value={mintingPaise} onChange={(e) => setMintingPaise(e.target.value)} placeholder={mintingType === "FLAT_INR" ? "₹ amount" : "Percent"} />
            ) : null}
          </div>
          <div>
            <FieldLabel>Delivery charge (₹, 0 allowed)</FieldLabel>
            <Input inputMode="decimal" value={deliveryPaise} onChange={(e) => setDeliveryPaise(e.target.value)} />
          </div>
          <div>
            <FieldLabel>Packaging charge (₹, 0 allowed)</FieldLabel>
            <Input inputMode="decimal" value={packagingPaise} onChange={(e) => setPackagingPaise(e.target.value)} />
          </div>
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={pickupEnabled} onCheckedChange={(v) => setPickupEnabled(v === true)} />
              Pickup enabled
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={deliveryEnabled} onCheckedChange={(v) => setDeliveryEnabled(v === true)} />
              Delivery enabled
            </label>
          </div>
          <div className="md:col-span-2">
            <Button type="button" onClick={() => void onCreate()} disabled={createState.isLoading} data-testid="dm-catalog-create">
              Create catalogue item
            </Button>
          </div>
        </div>
      </Surface>
      <Surface title="Items">
        <div className="divide-y">
          {items.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">No catalogue items.</p>
          ) : (
            items.map((item) => (
              <CatalogueItemRow
                key={String(item.id)}
                item={item}
                onSaved={() => catalogue.refetch()}
                patchItem={patchItem}
              />
            ))
          )}
        </div>
      </Surface>
      <Link href="/digital-metals" className="text-sm underline">
        Back
      </Link>
    </div>
  );
}

export function DigitalMetalsRedemptionFulfilmentQueuePage() {
  const ent = useDigitalMetalsServerEntitlement();
  const pageSize = 25;
  const [cursor, setCursor] = useState<string | undefined>();
  const [stack, setStack] = useState<RedemptionAdminRow[]>([]);
  const queue = useGetDigitalMetalsRedemptionFulfilmentQueueQuery(
    { limit: pageSize, cursor },
    { skip: !ent.workspaceVisible },
  );

  useEffect(() => {
    setCursor(undefined);
    setStack([]);
  }, []);

  const rows = useMemo(() => {
    const batch = (queue.data?.items ?? []) as RedemptionAdminRow[];
    if (!cursor) return batch;
    const ids = new Set(stack.map((r) => r.id));
    return [...stack, ...batch.filter((r) => !ids.has(r.id))];
  }, [queue.data?.items, cursor, stack]);

  if (ent.loading || queue.isLoading) return <PageSkeleton cards={2} />;
  if (!ent.workspaceVisible) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">{ent.disabledMessage}</p>
      </div>
    );
  }
  if (queue.isError) return <QueryError error={queue.error} onRetry={queue.refetch} />;

  const meta = queue.data?.meta;

  return (
    <div className="space-y-6 p-6" data-testid="digital-metals-redemption-fulfilment-queue">
      <PageHeader
        title="Redemption fulfilment queue"
        description="Charge-paid through investigation. Open a row for customer context and staff actions."
      />
      <Surface title={`Open fulfilment (${rows.length}${meta?.hasMore ? "+" : ""})`}>
        {rows.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">No orders awaiting fulfilment.</p>
        ) : (
          <div className="divide-y">
            <div className="hidden border-b bg-muted/30 px-4 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground md:grid md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto_auto]">
              <span>Customer</span>
              <span>Order</span>
              <span>Timeline</span>
              <span className="text-right">Status & actions</span>
            </div>
            {rows.map((o) => (
              <RedemptionOrderListRow
                key={o.id}
                row={o}
                href={`/digital-metals/redemption/orders/${o.id}`}
                showActions
              />
            ))}
          </div>
        )}
        {meta?.hasMore ? (
          <div className="border-t px-4 py-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setStack(rows);
                setCursor(meta.nextCursor ?? undefined);
              }}
            >
              Load more
            </Button>
          </div>
        ) : null}
      </Surface>
      <Link href="/digital-metals/redemption/orders" className="text-sm underline">
        All redemption orders
      </Link>
    </div>
  );
}

export function DigitalMetalsRedemptionOrdersPage() {
  const ent = useDigitalMetalsServerEntitlement();
  const pageSize = 25;
  const [cursor, setCursor] = useState<string | undefined>();
  const [stack, setStack] = useState<RedemptionAdminRow[]>([]);
  const orders = useGetDigitalMetalsRedemptionOrdersQuery(
    { limit: pageSize, cursor },
    { skip: !ent.workspaceVisible },
  );

  useEffect(() => {
    setCursor(undefined);
    setStack([]);
  }, []);

  const rows = useMemo(() => {
    const batch = (orders.data?.items ?? []) as RedemptionAdminRow[];
    if (!cursor) return batch;
    const ids = new Set(stack.map((r) => r.id));
    return [...stack, ...batch.filter((r) => !ids.has(r.id))];
  }, [orders.data?.items, cursor, stack]);

  if (ent.loading || orders.isLoading) return <PageSkeleton cards={2} />;
  if (!ent.workspaceVisible) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">{ent.disabledMessage}</p>
      </div>
    );
  }
  if (orders.isError) return <QueryError error={orders.error} onRetry={orders.refetch} />;

  const meta = orders.data?.meta;

  return (
    <div className="space-y-6 p-6" data-testid="digital-metals-redemption-orders">
      <PageHeader title="Redemption orders" description="Checkout, charge payment, and fulfilment handover." />
      <div className="flex gap-2">
        <Button variant="outline" size="sm" asChild>
          <Link href="/digital-metals/redemption/fulfilment">Fulfilment queue</Link>
        </Button>
      </div>
      <Surface title={`Orders (${rows.length}${meta?.hasMore ? "+" : ""})`}>
        {rows.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">No redemption orders yet.</p>
        ) : (
          <div className="divide-y">
            <div className="hidden border-b bg-muted/30 px-4 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground md:grid md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto_auto]">
              <span>Customer</span>
              <span>Order</span>
              <span>Timeline</span>
              <span className="text-right">Status</span>
            </div>
            {rows.map((o) => (
              <RedemptionOrderListRow
                key={o.id}
                row={o}
                href={`/digital-metals/redemption/orders/${o.id}`}
              />
            ))}
          </div>
        )}
        {meta?.hasMore ? (
          <div className="border-t px-4 py-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setStack(rows);
                setCursor(meta.nextCursor ?? undefined);
              }}
            >
              Load more
            </Button>
          </div>
        ) : null}
      </Surface>
    </div>
  );
}

export function DigitalMetalsRedemptionOrderDetailPage({ orderId }: { orderId: string }) {
  const ent = useDigitalMetalsServerEntitlement();
  const detail = useGetDigitalMetalsRedemptionOrderQuery(orderId, { skip: !ent.workspaceVisible });
  const [postAction, postState] = usePostDigitalMetalsRedemptionFulfilmentActionMutation();
  const [pickupCode, setPickupCode] = useState("");
  const [trackingRef, setTrackingRef] = useState("");
  const [actionReason, setActionReason] = useState("");
  const [deliveryAttestation, setDeliveryAttestation] = useState(false);
  const shipmentIdemRef = useRef<{
    key: string;
    action: string;
    carrier: string;
    trackingReference: string;
  } | null>(null);

  if (ent.loading || detail.isLoading) return <PageSkeleton cards={2} />;
  if (!ent.workspaceVisible) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">{ent.disabledMessage}</p>
      </div>
    );
  }
  if (detail.isError) return <QueryError error={detail.error} onRetry={detail.refetch} />;

  const order = detail.data as RedemptionAdminRow & Record<string, unknown> | undefined;
  const permitted = order?.permittedActions ?? [];
  const version = Number(order?.version ?? 1);
  const customer = order?.customer;

  async function runAction(action: string) {
    await detail.refetch();
    const freshVersion = Number((detail.data as Record<string, unknown> | undefined)?.version ?? version);
    const path = actionPath(action);
    const body: Record<string, unknown> = { expectedVersion: freshVersion };
    let idempotencyKey = newIdempotencyKey();
    if (action === "COMPLETE_PICKUP") {
      body.pickupCode = pickupCode;
      body.fulfilmentBranchId = order?.fulfilmentBranchId ?? order?.pickupBranchId;
    }
    if (action === "DISPATCH" || action === "DISPATCH_REPLACEMENT") {
      const carrier = "Manual";
      const trackingReference = trackingRef || "MANUAL";
      body.carrier = carrier;
      body.trackingReference = trackingReference;
      const prior = shipmentIdemRef.current;
      if (
        prior
        && prior.action === action
        && prior.carrier === carrier
        && prior.trackingReference === trackingReference
      ) {
        idempotencyKey = prior.key;
      } else {
        shipmentIdemRef.current = { key: idempotencyKey, action, carrier, trackingReference };
      }
    } else {
      shipmentIdemRef.current = null;
    }
    if (action === "COMPLETE_DELIVERY") {
      if (!deliveryAttestation) {
        toast.error("Confirm handover attestation before completing delivery.");
        return;
      }
      body.approverAttestation = true;
    }
    if (action === "OPEN_INVESTIGATION" || action === "RESOLVE_RETURN" || action === "CANCEL_PRE_DISPATCH") {
      const reason = actionReason.trim();
      if (reason.length < 8) {
        toast.error("Enter a clear reason (at least 8 characters) for this action.");
        return;
      }
      body.reason = reason;
    }
    try {
      const res = await postAction({
        orderId,
        action: path,
        idempotencyKey,
        body,
      }).unwrap();
      if (action === "ISSUE_PICKUP_CODE") {
        toast.success("Pickup code issued. Customer can reveal it in the app.");
      } else {
        toast.success(`${ACTION_LABELS[action] ?? action} recorded.`);
      }
      detail.refetch();
    } catch (err) {
      toastApiError(err);
    }
  }

  return (
    <div className="space-y-6 p-6" data-testid="digital-metals-redemption-order-detail">
      <PageHeader
        title="Redemption order"
        description={
          customer?.name
            ? `${customer.name} · ${order ? redemptionMetalLabel(order) : orderId}`
            : orderId
        }
      />
      <div className="flex flex-wrap gap-2">
        {customer?.id ? (
          <Button variant="outline" size="sm" asChild>
            <Link href={`/customers/${customer.id}`}>Open customer profile</Link>
          </Button>
        ) : null}
        <Button variant="outline" size="sm" asChild>
          <Link href="/digital-metals/redemption/fulfilment">Back to fulfilment queue</Link>
        </Button>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <RedemptionAdminCustomerPanel customer={customer} />
        <Surface title="Order summary">
          <dl className="space-y-2 px-4 py-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Order ID</dt>
              <dd className="font-mono text-xs">{orderId}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>Status</dt>
              <dd>
                <StatusBadge status={String(order?.status ?? "")} />
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>Metal reserved</dt>
              <dd>{order ? redemptionMetalLabel(order) : "—"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>Charge total</dt>
              <dd className="font-semibold">{money(Number(order?.chargeTotalPaise ?? 0))}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>Placed</dt>
              <dd>{formatAdminDateTime(order?.createdAt as string | undefined)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>Charges paid</dt>
              <dd>{formatAdminDateTime(order?.chargePaidAt as string | undefined)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>Last updated</dt>
              <dd>{formatAdminDateTime(order?.updatedAt as string | undefined)}</dd>
            </div>
          </dl>
        </Surface>
      </div>
      <Surface title="Fulfilment">
        <dl className="space-y-2 px-4 py-3 text-sm">
          <div className="flex justify-between gap-4">
            <dt>Mode</dt>
            <dd>{order ? redemptionFulfilmentPreview(order) : "—"}</dd>
          </div>
          {order?.deliveryAddressSnapshot ? (
            <div>
              <dt className="text-muted-foreground">Delivery address</dt>
              <dd className="mt-1 text-xs leading-relaxed">
                {formatDeliveryAddressSnapshot(order.deliveryAddressSnapshot as Record<string, unknown>)}
              </dd>
            </div>
          ) : null}
          {order?.pickupBranchLabel ? (
            <div className="flex justify-between gap-4">
              <dt>Pickup branch</dt>
              <dd>{String(order.pickupBranchLabel)}</dd>
            </div>
          ) : null}
          {order?.trackingReference ? (
            <div className="flex justify-between gap-4">
              <dt>Tracking ({String(order?.trackingSource ?? "MANUAL")})</dt>
              <dd>{String(order.trackingReference)}</dd>
            </div>
          ) : null}
          {order?.delayNote ? (
            <div>
              <dt className="text-muted-foreground">Production delay</dt>
              <dd className="mt-1">{String(order.delayNote)}</dd>
            </div>
          ) : null}
        </dl>
      </Surface>
      {permitted.length > 0 ? (
        <Surface title="Fulfilment actions">
          <div className="space-y-3 px-4 py-3">
            {permitted.some((a) =>
              ["OPEN_INVESTIGATION", "RESOLVE_RETURN", "CANCEL_PRE_DISPATCH"].includes(a),
            ) ? (
              <div className="max-w-md space-y-1">
                <FieldLabel>Reason (required for cancel, investigation, or return)</FieldLabel>
                <Input
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  placeholder="Describe what happened and the next step for the customer"
                />
              </div>
            ) : null}
            {permitted.includes("COMPLETE_PICKUP") ? (
              <Input
                placeholder="Pickup code"
                value={pickupCode}
                onChange={(e) => setPickupCode(e.target.value)}
                className="max-w-xs"
              />
            ) : null}
            {permitted.includes("DISPATCH") || permitted.includes("DISPATCH_REPLACEMENT") ? (
              <Input
                placeholder="Manual tracking reference"
                value={trackingRef}
                onChange={(e) => setTrackingRef(e.target.value)}
                className="max-w-xs"
              />
            ) : null}
            {permitted.includes("COMPLETE_DELIVERY") ? (
              <label className="flex max-w-lg items-start gap-2 text-sm">
                <Checkbox
                  checked={deliveryAttestation}
                  onCheckedChange={(v) => setDeliveryAttestation(v === true)}
                />
                <span>I attest that physical handover to the customer is complete and matches this order.</span>
              </label>
            ) : null}
            <div className="flex flex-wrap gap-2">
              {permitted.map((action) => (
                <Button
                  key={action}
                  type="button"
                  size="sm"
                  variant={action === "CANCEL_PRE_DISPATCH" ? "destructive" : "default"}
                  disabled={postState.isLoading}
                  onClick={() => void runAction(action)}
                >
                  {ACTION_LABELS[action] ?? action}
                </Button>
              ))}
            </div>
          </div>
        </Surface>
      ) : null}
      {["CHARGE_PAID", "FULFILMENT_ACCEPTED", "PACKING", "COMPLETED", "DISPATCHED", "PICKUP_READY", "INVESTIGATION"].includes(
        String(order?.status ?? ""),
      ) ? (
        <Surface title="Documents">
          <div className="space-y-3 px-4 py-3">
            <AdminDigitalMetalsDirectPdfPanel
              title="Redemption charge receipt"
              downloadPath={`/admin/digital-metals/redemption/orders/${encodeURIComponent(orderId)}/charge-receipt.pdf`}
              filenameHint={`redemption-charge-${orderId}`}
            />
            {String(order?.status ?? "") === "COMPLETED" ? (
              <AdminDigitalMetalsDirectPdfPanel
                title="Physical handover receipt"
                downloadPath={`/admin/digital-metals/redemption/orders/${encodeURIComponent(orderId)}/handover-receipt.pdf`}
                filenameHint={`handover-${orderId}`}
              />
            ) : null}
          </div>
        </Surface>
      ) : null}
      <Link href="/digital-metals/redemption/orders" className="text-sm underline">
        Back to orders
      </Link>
    </div>
  );
}
