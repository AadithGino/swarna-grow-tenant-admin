"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Clock3,
  FileText,
  Gift,
  MapPin,
  Package,
  PackageCheck,
  Pencil,
  Plus,
  Store,
  Truck,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  dialogScrollShellClass,
} from "@/components/ui/dialog";
import { PageHeader, Surface } from "@/src/components/common/page-parts";
import { EmptyState, PageSkeleton, QueryError } from "@/src/components/common/query-state";
import { StatusBadge } from "@/src/components/common/status-badge";
import {
  AdminTable,
  IdChip,
  ListPanel,
  LoadMoreFooter,
  type AdminColumn,
} from "@/src/components/admin-ui/admin-table";
import { FilterBar, FilterSearch, FilterSelect, QuickViews } from "@/src/components/admin-ui/filter-bar";
import {
  DetailLayout,
  Fact,
  FactGrid,
  InfoList,
  InfoRow,
  Notice,
  Timeline,
  type TimelineStep,
} from "@/src/components/admin-ui/detail-parts";
import { useLoadMoreList } from "@/src/hooks/use-load-more-list";
import { toastApiError } from "@/src/lib/api-error";
import { newIdempotencyKey } from "@/src/lib/idempotency";
import {
  useCreateDigitalMetalsRedemptionCatalogItemMutation,
  useGetDigitalMetalsRedemptionCatalogueQuery,
  useGetDigitalMetalsRedemptionFulfilmentQueueQuery,
  useGetDigitalMetalsRedemptionOrderQuery,
  useGetDigitalMetalsRedemptionOrdersQuery,
  usePatchDigitalMetalsRedemptionCatalogItemMutation,
  usePostDigitalMetalsRedemptionFulfilmentActionMutation,
} from "@/src/store/api/admin-api";
import { formatAssetLabel, gramsToUg } from "@/src/lib/digital-metals-asset-ui";
import {
  formatDeliveryAddressSnapshot,
  paiseToRupeeInput,
  rupeeInputToPaise,
  ugToGramsDisplay,
} from "@/src/lib/digital-metals-display";
import { cn } from "@/lib/utils";
import { useDigitalMetalsServerEntitlement } from "./digital-metals-admin-shared";
import { AdminDigitalMetalsDirectPdfPanel } from "./digital-metals-admin-direct-pdf-panel";
import {
  RedemptionAdminCustomerPanel,
  RedemptionPermittedActionChips,
  redemptionFulfilmentPreview,
  redemptionMetalLabel,
  type RedemptionAdminRow,
} from "./digital-metals-redemption-admin-shared";
import { DM_SECTION, DmCustomerCell, DmGate, MetalPill, dmInr, shortDateTime, timeAgo } from "./digital-metals-admin-ui";

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

// Separate mandatory acceptance / packing steps were removed from normal use.
// The backend folds these into CHARGE_PAID; we never surface them as actions.
const LEGACY_REDEMPTION_ACTIONS = ["ACCEPT_FULFILMENT", "RECORD_PACKING"];

const ACTION_LABELS: Record<string, string> = {
  ACCEPT_FULFILMENT: "Accept fulfilment (legacy)",
  RECORD_PACKING: "Mark packing (legacy)",
  MARK_PICKUP_READY: "Ready for pickup",
  DISPATCH: "Ship order",
  ISSUE_PICKUP_CODE: "Issue pickup code",
  COMPLETE_PICKUP: "Complete pickup",
  COMPLETE_DELIVERY: "Complete delivery",
  CANCEL_PRE_DISPATCH: "Cancel (pre-dispatch)",
  OPEN_INVESTIGATION: "Open investigation",
  RESOLVE_RETURN: "Verified return",
  DISPATCH_REPLACEMENT: "Replacement dispatch",
  RECORD_DELAY: "Record delay",
};

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

function mintingSummary(rule: Record<string, unknown> | undefined) {
  const type = String(rule?.type ?? "NONE");
  if (type === "FLAT_INR") return `${dmInr(Number(rule?.amountPaise ?? 0))} minting`;
  if (type === "PERCENT") return `${String(rule?.percent ?? 0)}% minting`;
  return "No minting fee";
}

/** Coin / bar visual drawn in CSS (no product photo needed). */
function CoinArt({ metal, grams, bar }: { metal: string; grams: string; bar?: boolean }) {
  const silver = metal === "SILVER";
  return (
    <div
      className={cn(
        "relative grid aspect-[4/3] place-items-center overflow-hidden",
        silver ? "bg-[radial-gradient(circle_at_50%_35%,#ffffff,#eef1f4_55%,#dde2e8)]" : "bg-[radial-gradient(circle_at_50%_35%,#ffffff,#f9efda_55%,#efdcb6)]",
      )}
      aria-hidden
    >
      <div
        className={cn(
          "grid place-items-center text-center shadow-[inset_0_-6px_12px_rgba(0,0,0,0.15),0_10px_24px_-12px_rgba(0,0,0,0.45)]",
          bar ? "h-16 w-28 rounded-lg" : "size-24 rounded-full",
          silver ? "bg-[linear-gradient(135deg,#ffffff,#c9ced5_45%,#8e959e_75%,#eceef1)]" : "bg-[linear-gradient(135deg,#fff2c4,#e6c06a_40%,#b8862f_75%,#f3d58a)]",
        )}
      >
        <span className={cn("font-serif text-lg font-bold leading-none", silver ? "text-[#4b5158]" : "text-[#6b4413]")}>{grams}</span>
        <span className={cn("text-[0.6rem] font-semibold tracking-[0.2em]", silver ? "text-[#5b6168]" : "text-[#7a4f12]")}>
          {silver ? "Ag 999" : "24K 999"}
        </span>
      </div>
    </div>
  );
}

function FormField({ label, hint, children, className }: { label: string; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={cn("block space-y-1.5", className)}>
      <span className="text-sm font-medium text-[#4f3d41]">{label}</span>
      {children}
      {hint ? <span className="block text-xs text-[#9a8d90]">{hint}</span> : null}
    </label>
  );
}

const selectClass =
  "h-10 w-full rounded-xl border border-[#e6dad6] bg-white px-3 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-[#7b0a2b]/15";

function TaxLinesEditor({ lines, onChange }: { lines: CatalogueTaxLine[]; onChange: (next: CatalogueTaxLine[]) => void }) {
  return (
    <div className="space-y-2 sm:col-span-2">
      <p className="text-sm font-medium text-[#4f3d41]">Tax lines</p>
      {lines.length === 0 ? <p className="text-xs text-[#9a8d90]">No tax lines — add one if minting is taxable.</p> : null}
      {lines.map((t, idx) => (
        <div key={idx} className="grid gap-2 sm:grid-cols-[1fr_6rem_1.4fr_auto]">
          <Input placeholder="Code" value={t.code} onChange={(e) => onChange(lines.map((r, i) => (i === idx ? { ...r, code: e.target.value } : r)))} className="h-10 rounded-xl" />
          <Input placeholder="Rate %" value={t.ratePercent} onChange={(e) => onChange(lines.map((r, i) => (i === idx ? { ...r, ratePercent: e.target.value } : r)))} className="h-10 rounded-xl" />
          <Input placeholder="Label" value={t.label} onChange={(e) => onChange(lines.map((r, i) => (i === idx ? { ...r, label: e.target.value } : r)))} className="h-10 rounded-xl" />
          <Button type="button" variant="ghost" className="h-10 rounded-xl text-red-700" onClick={() => onChange(lines.filter((_, i) => i !== idx))}>
            Remove
          </Button>
        </div>
      ))}
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="rounded-lg"
        onClick={() => onChange([...lines, { code: "", label: "", base: "MINTING", ratePercent: "", active: true }])}
      >
        <Plus /> Add tax line
      </Button>
    </div>
  );
}

function CatalogueEditDialog({
  item,
  open,
  onOpenChange,
  patchItem,
  onSaved,
}: {
  item: Record<string, unknown>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patchItem: ReturnType<typeof usePatchDigitalMetalsRedemptionCatalogItemMutation>[0];
  onSaved: () => void;
}) {
  const [label, setLabel] = useState(String(item.label ?? ""));
  const [leadDays, setLeadDays] = useState(String(item.leadTimeDays ?? 3));
  const [deliveryPaise, setDeliveryPaise] = useState(paiseToRupeeInput(Number(item.deliveryFlatPaise ?? 0)));
  const [packagingPaise, setPackagingPaise] = useState(paiseToRupeeInput(Number(item.packagingPaise ?? 0)));
  const [pickupEnabled, setPickupEnabled] = useState(item.pickupEnabled !== false);
  const [deliveryEnabled, setDeliveryEnabled] = useState(item.deliveryEnabled !== false);
  const minting = (item.mintingRule ?? {}) as Record<string, unknown>;
  const [mintingType, setMintingType] = useState(String(minting.type ?? "NONE"));
  const [mintingValue, setMintingValue] = useState(
    minting.type === "FLAT_INR" ? paiseToRupeeInput(Number(minting.amountPaise ?? 0)) : String(minting.percent ?? "0"),
  );
  const [taxLines, setTaxLines] = useState(() => taxLinesFromItem(item.taxLines));
  const [saving, setSaving] = useState(false);

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
    let mintingRule: Record<string, unknown>;
    if (mintingType === "NONE") mintingRule = { type: "NONE" };
    else if (mintingType === "FLAT_INR") {
      const amountPaise = rupeeInputToPaise(mintingValue);
      if (amountPaise == null) {
        toast.error("Enter a valid minting fee.");
        return;
      }
      mintingRule = { type: "FLAT_INR", amountPaise };
    } else mintingRule = { type: "PERCENT", percent: Number(mintingValue) };
    setSaving(true);
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
      onOpenChange(false);
      onSaved();
    } catch (err) {
      toastApiError(err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(dialogScrollShellClass, "sm:max-w-2xl")}>
        <DialogBody>
          <DialogHeader className="mb-5">
            <DialogTitle>Edit {String(item.label ?? "item")}</DialogTitle>
            <DialogDescription>
              {String(item.sku)} · {formatAssetLabel(String(item.metal), Number(item.finenessPpm))} ·{" "}
              {ugToGramsDisplay(String(item.unitQuantityUg))} per unit
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 pb-6 sm:grid-cols-2">
            <FormField label="Name customers see">
              <Input value={label} onChange={(e) => setLabel(e.target.value)} className="h-10 rounded-xl" />
            </FormField>
            <FormField label="Lead time (days)">
              <Input value={leadDays} onChange={(e) => setLeadDays(e.target.value)} className="h-10 rounded-xl" />
            </FormField>
            <FormField label="Delivery charge (₹)" hint="₹0 is allowed">
              <Input inputMode="decimal" value={deliveryPaise} onChange={(e) => setDeliveryPaise(e.target.value)} className="h-10 rounded-xl" />
            </FormField>
            <FormField label="Packaging charge (₹)" hint="₹0 is allowed">
              <Input inputMode="decimal" value={packagingPaise} onChange={(e) => setPackagingPaise(e.target.value)} className="h-10 rounded-xl" />
            </FormField>
            <FormField label="Minting fee">
              <select className={selectClass} value={mintingType} onChange={(e) => setMintingType(e.target.value)}>
                <option value="NONE">No minting fee</option>
                <option value="FLAT_INR">Flat amount (₹)</option>
                <option value="PERCENT">Percent of metal value</option>
              </select>
            </FormField>
            {mintingType !== "NONE" ? (
              <FormField label={mintingType === "FLAT_INR" ? "Minting amount (₹)" : "Minting percent"}>
                <Input value={mintingValue} onChange={(e) => setMintingValue(e.target.value)} className="h-10 rounded-xl" />
              </FormField>
            ) : (
              <div />
            )}
            <div className="flex flex-wrap gap-4 sm:col-span-2">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={pickupEnabled} onCheckedChange={(v) => setPickupEnabled(v === true)} />
                Branch pickup
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={deliveryEnabled} onCheckedChange={(v) => setDeliveryEnabled(v === true)} />
                Home delivery
              </label>
            </div>
            <TaxLinesEditor lines={taxLines} onChange={setTaxLines} />
          </div>
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={saving} onClick={() => void saveEdit()}>
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CatalogueCard({
  item,
  patchItem,
  onSaved,
}: {
  item: Record<string, unknown>;
  patchItem: ReturnType<typeof usePatchDigitalMetalsRedemptionCatalogItemMutation>[0];
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const metal = String(item.metal ?? "GOLD");
  const grams = `${Number((Number(item.unitQuantityUg ?? 0) / 1_000_000).toFixed(3))} g`;
  const active = item.active === true;
  return (
    <article className={cn("overflow-hidden rounded-[1.15rem] border bg-white transition-shadow hover:shadow-[0_12px_28px_-20px_rgb(67_15_25/40%)]", active ? "border-[#e8dcd7]" : "border-dashed border-[#e0d3cf] opacity-80")}>
      <div className="relative">
        <CoinArt metal={metal} grams={grams} bar={/bar/i.test(String(item.label ?? item.sku ?? ""))} />
        <div className="absolute left-3 top-3 flex gap-1.5">
          <StatusBadge status={active ? "ACTIVE" : "INACTIVE"} label={active ? "On sale" : "Hidden"} />
        </div>
      </div>
      <div className="space-y-3 p-4">
        <div>
          <h3 className="font-bold text-[#28161a]">{String(item.label)}</h3>
          <p className="text-xs text-[#857a7d]">
            {String(item.sku)} · {formatAssetLabel(metal, Number(item.finenessPpm))}
          </p>
        </div>
        <dl className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-lg bg-[#fbf8f6] px-2.5 py-2">
            <dt className="text-[#9a8d90]">Minting</dt>
            <dd className="mt-0.5 font-semibold text-[#3c2a2e]">{mintingSummary(item.mintingRule as Record<string, unknown>)}</dd>
          </div>
          <div className="rounded-lg bg-[#fbf8f6] px-2.5 py-2">
            <dt className="text-[#9a8d90]">Ready in</dt>
            <dd className="mt-0.5 font-semibold text-[#3c2a2e]">{String(item.leadTimeDays ?? "—")} days</dd>
          </div>
        </dl>
        <div className="flex flex-wrap gap-1.5 text-xs">
          {item.pickupEnabled !== false ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#f6efec] px-2 py-0.5 font-medium text-[#5c4a4e]">
              <Store className="size-3" aria-hidden /> Pickup
            </span>
          ) : null}
          {item.deliveryEnabled !== false ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#f6efec] px-2 py-0.5 font-medium text-[#5c4a4e]">
              <Truck className="size-3" aria-hidden /> Delivery {Number(item.deliveryFlatPaise ?? 0) ? dmInr(Number(item.deliveryFlatPaise)) : "free"}
            </span>
          ) : null}
        </div>
        <div className="flex gap-2 border-t border-[#f3eae7] pt-3">
          <Button type="button" size="sm" variant="outline" className="flex-1 rounded-lg" onClick={() => setEditing(true)}>
            <Pencil /> Edit
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="flex-1 rounded-lg"
            onClick={() =>
              void patchItem({ itemId: String(item.id), body: { active: !item.active } })
                .unwrap()
                .then(onSaved)
                .catch(toastApiError)
            }
          >
            {item.active ? "Hide from customers" : "Put on sale"}
          </Button>
        </div>
      </div>
      {editing ? (
        <CatalogueEditDialog item={item} open={editing} onOpenChange={setEditing} patchItem={patchItem} onSaved={onSaved} />
      ) : null}
    </article>
  );
}

export function DigitalMetalsRedemptionCatalogPage() {
  const ent = useDigitalMetalsServerEntitlement();
  const catalogue = useGetDigitalMetalsRedemptionCatalogueQuery(undefined, { skip: !ent.workspaceVisible });
  const [createItem, createState] = useCreateDigitalMetalsRedemptionCatalogItemMutation();
  const [patchItem] = usePatchDigitalMetalsRedemptionCatalogItemMutation();
  const [createOpen, setCreateOpen] = useState(false);
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
  const [search, setSearch] = useState("");
  const [metalFilter, setMetalFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const items = (catalogue.data?.items ?? []) as Record<string, unknown>[];
  const needle = search.trim().toLowerCase();
  const visible = items.filter(
    (i) =>
      (metalFilter === "ALL" || String(i.metal) === metalFilter) &&
      (statusFilter === "ALL" || (statusFilter === "ACTIVE" ? i.active === true : i.active !== true)) &&
      (!needle || `${String(i.label ?? "")} ${String(i.sku ?? "")}`.toLowerCase().includes(needle)),
  );

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
    let mintingRule: Record<string, unknown>;
    if (mintingType === "NONE") mintingRule = { type: "NONE" };
    else if (mintingType === "FLAT_INR") {
      const amountPaise = rupeeInputToPaise(mintingPaise);
      if (amountPaise == null) {
        toast.error("Enter a valid minting fee.");
        return;
      }
      mintingRule = { type: "FLAT_INR", amountPaise };
    } else mintingRule = { type: "PERCENT", percent: Number(mintingPaise) };
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
      setCreateOpen(false);
      catalogue.refetch();
    } catch (err) {
      toastApiError(err);
    }
  }

  return (
    <DmGate loading={ent.loading} visible={ent.workspaceVisible} message={ent.disabledMessage} title="Coin & bar catalogue">
      <div className="space-y-6" data-testid="digital-metals-redemption-catalogue">
        <PageHeader
          eyebrow={DM_SECTION}
          icon={Package}
          title="Coin & bar catalogue"
          description="The physical coins and bars customers can redeem their digital metal for. No stock is needed — items are minted to order."
          actions={
            <Button className="rounded-xl" onClick={() => setCreateOpen(true)}>
              <Plus /> Add coin or bar
            </Button>
          }
        />
        <ListPanel
          toolbar={
            <FilterBar
              search={<FilterSearch value={search} onChange={setSearch} placeholder="Search name or SKU" />}
              filters={
                <>
                  <FilterSelect
                    label="Metal"
                    value={metalFilter}
                    onChange={setMetalFilter}
                    options={[
                      { value: "ALL", label: "All" },
                      { value: "GOLD", label: "Gold" },
                      { value: "SILVER", label: "Silver" },
                    ]}
                  />
                  <FilterSelect
                    label="Status"
                    value={statusFilter}
                    onChange={setStatusFilter}
                    options={[
                      { value: "ALL", label: "All" },
                      { value: "ACTIVE", label: "On sale" },
                      { value: "HIDDEN", label: "Hidden" },
                    ]}
                  />
                </>
              }
              resultLabel={`${visible.length} of ${items.length} items`}
            />
          }
        >
          {catalogue.isError ? (
            <QueryError error={catalogue.error} onRetry={catalogue.refetch} />
          ) : catalogue.isLoading ? (
            <div className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-72 animate-pulse rounded-[1.15rem] bg-[#f5ede9]" />
              ))}
            </div>
          ) : visible.length === 0 ? (
            <EmptyState
              icon={Package}
              title={items.length ? "No items match" : "No coins or bars yet"}
              detail={items.length ? "Try another filter." : "Add the denominations customers can redeem — e.g. 1 g and 5 g gold coins."}
              action={!items.length ? <Button onClick={() => setCreateOpen(true)}>Add coin or bar</Button> : undefined}
            />
          ) : (
            <div className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-4">
              {visible.map((item) => (
                <CatalogueCard key={String(item.id)} item={item} onSaved={() => catalogue.refetch()} patchItem={patchItem} />
              ))}
            </div>
          )}
        </ListPanel>

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent className={cn(dialogScrollShellClass, "sm:max-w-2xl")}>
            <DialogBody>
              <DialogHeader className="mb-5">
                <DialogTitle>Add a coin or bar</DialogTitle>
                <DialogDescription>Customers redeem this item with metal from their wallet and pay the charges below.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 pb-6 sm:grid-cols-2">
                <FormField label="SKU">
                  <Input placeholder="e.g. DG-COIN-2" value={sku} onChange={(e) => setSku(e.target.value)} className="h-10 rounded-xl" />
                </FormField>
                <FormField label="Name customers see">
                  <Input placeholder="e.g. 2 g gold coin" value={label} onChange={(e) => setLabel(e.target.value)} className="h-10 rounded-xl" />
                </FormField>
                <FormField label="Metal">
                  <select className={selectClass} value={metal} onChange={(e) => setMetal(e.target.value as "GOLD" | "SILVER")}>
                    <option value="GOLD">Gold</option>
                    <option value="SILVER">Silver</option>
                  </select>
                </FormField>
                <FormField label="Fineness (ppm)" hint="999000 = 99.9%">
                  <Input value={finenessPpm} onChange={(e) => setFinenessPpm(e.target.value)} className="h-10 rounded-xl" />
                </FormField>
                <FormField label="Weight per unit (grams)">
                  <Input inputMode="decimal" value={unitGrams} onChange={(e) => setUnitGrams(e.target.value)} className="h-10 rounded-xl" />
                </FormField>
                <FormField label="Lead time (days)">
                  <Input value={leadDays} onChange={(e) => setLeadDays(e.target.value)} className="h-10 rounded-xl" />
                </FormField>
                <FormField label="Minting fee">
                  <select className={selectClass} value={mintingType} onChange={(e) => setMintingType(e.target.value as typeof mintingType)}>
                    <option value="NONE">No minting fee</option>
                    <option value="FLAT_INR">Flat amount (₹)</option>
                    <option value="PERCENT">Percent of metal value</option>
                  </select>
                </FormField>
                {mintingType !== "NONE" ? (
                  <FormField label={mintingType === "FLAT_INR" ? "Minting amount (₹)" : "Minting percent"}>
                    <Input inputMode="decimal" value={mintingPaise} onChange={(e) => setMintingPaise(e.target.value)} className="h-10 rounded-xl" />
                  </FormField>
                ) : (
                  <div />
                )}
                <FormField label="Delivery charge (₹)" hint="₹0 is allowed">
                  <Input inputMode="decimal" value={deliveryPaise} onChange={(e) => setDeliveryPaise(e.target.value)} className="h-10 rounded-xl" />
                </FormField>
                <FormField label="Packaging charge (₹)" hint="₹0 is allowed">
                  <Input inputMode="decimal" value={packagingPaise} onChange={(e) => setPackagingPaise(e.target.value)} className="h-10 rounded-xl" />
                </FormField>
                <div className="flex flex-wrap gap-4 sm:col-span-2">
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox checked={pickupEnabled} onCheckedChange={(v) => setPickupEnabled(v === true)} />
                    Branch pickup
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox checked={deliveryEnabled} onCheckedChange={(v) => setDeliveryEnabled(v === true)} />
                    Home delivery
                  </label>
                </div>
                <TaxLinesEditor lines={createTaxLines} onChange={setCreateTaxLines} />
              </div>
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="button" onClick={() => void onCreate()} disabled={createState.isLoading} data-testid="dm-catalog-create">
                Create catalogue item
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DmGate>
  );
}

const rowId = (r: RedemptionAdminRow) => r.id;

function redemptionColumns(showActions: boolean): AdminColumn<RedemptionAdminRow>[] {
  return [
    {
      key: "customer",
      header: "Customer",
      primary: true,
      cell: (r) => <DmCustomerCell customer={r.customer} fallbackId={r.id} />,
      sortValue: (r) => r.customer?.name ?? "",
    },
    {
      key: "item",
      header: "Redeeming",
      cell: (r) => (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <MetalPill metal={r.metal} />
            <span className="tabular-nums">{ugToGramsDisplay(String(r.quantityUg ?? "0"))}</span>
          </div>
          <p className="text-xs text-[#9a8d90]">{String((r as Record<string, unknown>).itemLabel ?? r.id)}</p>
        </div>
      ),
    },
    {
      key: "mode",
      header: "Handover",
      cell: (r) => (
        <span className="inline-flex max-w-[15rem] items-center gap-1.5 text-sm text-[#5c4a4e]">
          {String(r.fulfilmentMode) === "DELIVERY" ? <Truck className="size-3.5 shrink-0" aria-hidden /> : <Store className="size-3.5 shrink-0" aria-hidden />}
          <span className="truncate">{redemptionFulfilmentPreview(r)}</span>
        </span>
      ),
      hideOnMobile: true,
    },
    {
      key: "paid",
      header: "Charges paid",
      cell: (r) => <span className="text-sm text-[#5c4a4e]">{r.chargePaidAt ? timeAgo(r.chargePaidAt) : "Not paid"}</span>,
      sortValue: (r) => r.chargePaidAt ?? "",
      hideOnMobile: true,
    },
    {
      key: "status",
      header: showActions ? "Next step" : "Status",
      primary: true,
      cell: (r) => (
        <div className="space-y-1.5">
          <StatusBadge status={r.status} />
          {showActions ? <RedemptionPermittedActionChips actions={r.permittedActions} /> : null}
        </div>
      ),
      sortValue: (r) => r.status,
    },
    {
      key: "charge",
      header: "Charges",
      align: "right",
      cell: (r) => <span className="font-bold">{r.chargeTotalPaise != null ? dmInr(r.chargeTotalPaise) : "—"}</span>,
      sortValue: (r) => Number(r.chargeTotalPaise ?? 0),
    },
  ];
}

function useRedemptionFilters(rows: RedemptionAdminRow[]) {
  const [status, setStatus] = useState("ALL");
  const [mode, setMode] = useState("ALL");
  const [search, setSearch] = useState("");
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const r of rows) c[r.status] = (c[r.status] ?? 0) + 1;
    return c;
  }, [rows]);
  const needle = search.trim().toLowerCase();
  const visible = rows.filter(
    (r) =>
      (status === "ALL" || r.status === status) &&
      (mode === "ALL" || String(r.fulfilmentMode ?? "PICKUP") === mode) &&
      (!needle || [r.id, r.customer?.name, r.customer?.customerNumber, r.customer?.mobile].filter(Boolean).some((v) => String(v).toLowerCase().includes(needle))),
  );
  const views = [
    { value: "ALL", label: "All", count: rows.length },
    ...Object.keys(counts).map((k) => ({ value: k, label: k.replaceAll("_", " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase()), count: counts[k] })),
  ];
  const toolbar = (resultNoun: string, hasMore?: boolean) => (
    <FilterBar
      quickViews={<QuickViews value={status} onChange={setStatus} options={views} ariaLabel="Redemption status" />}
      search={<FilterSearch value={search} onChange={setSearch} placeholder="Search customer or order ID" />}
      filters={
        <FilterSelect
          label="Handover"
          value={mode}
          onChange={setMode}
          options={[
            { value: "ALL", label: "Any" },
            { value: "PICKUP", label: "Branch pickup" },
            { value: "DELIVERY", label: "Home delivery" },
          ]}
        />
      }
      resultLabel={`${visible.length}${hasMore ? "+" : ""} ${resultNoun}`}
    />
  );
  return { visible, toolbar };
}

export function DigitalMetalsRedemptionFulfilmentQueuePage() {
  const ent = useDigitalMetalsServerEntitlement();
  const list = useLoadMoreList<RedemptionAdminRow>("fulfilment", rowId);
  const queue = useGetDigitalMetalsRedemptionFulfilmentQueueQuery(
    { limit: 25, cursor: list.cursor },
    { skip: !ent.workspaceVisible },
  );
  const rows = list.merge((queue.data?.items ?? []) as RedemptionAdminRow[]);
  const filters = useRedemptionFilters(rows);
  const meta = queue.data?.meta;

  return (
    <DmGate loading={ent.loading} visible={ent.workspaceVisible} message={ent.disabledMessage} title="Fulfilment queue">
      <div className="space-y-6" data-testid="digital-metals-redemption-fulfilment-queue">
        <PageHeader
          eyebrow={DM_SECTION}
          icon={PackageCheck}
          title="Fulfilment queue"
          description="Paid redemptions waiting to be packed, handed over or delivered. Open one to take the next step."
          actions={
            <Button variant="outline" asChild className="rounded-xl">
              <Link href="/digital-metals/redemption/orders">All redemptions</Link>
            </Button>
          }
        />
        <ListPanel toolbar={filters.toolbar("orders to fulfil", meta?.hasMore)}>
          {queue.isError ? (
            <QueryError error={queue.error} onRetry={queue.refetch} />
          ) : (
            <AdminTable
              columns={redemptionColumns(true)}
              rows={filters.visible}
              getRowId={rowId}
              rowHref={(r) => `/digital-metals/redemption/orders/${r.id}`}
              loading={queue.isLoading}
              caption="Redemption fulfilment queue"
              empty={<EmptyState icon={PackageCheck} title="Nothing to fulfil" detail="Paid redemptions appear here until they're handed over." />}
              footer={
                <LoadMoreFooter
                  shown={filters.visible.length}
                  hasMore={meta?.hasMore}
                  loading={queue.isFetching}
                  noun="orders"
                  onLoadMore={() => list.loadMore(rows, meta?.nextCursor)}
                />
              }
            />
          )}
        </ListPanel>
      </div>
    </DmGate>
  );
}

export function DigitalMetalsRedemptionOrdersPage() {
  const ent = useDigitalMetalsServerEntitlement();
  const list = useLoadMoreList<RedemptionAdminRow>("orders", rowId);
  const orders = useGetDigitalMetalsRedemptionOrdersQuery(
    { limit: 25, cursor: list.cursor },
    { skip: !ent.workspaceVisible },
  );
  const rows = list.merge((orders.data?.items ?? []) as RedemptionAdminRow[]);
  const filters = useRedemptionFilters(rows);
  const meta = orders.data?.meta;

  return (
    <DmGate loading={ent.loading} visible={ent.workspaceVisible} message={ent.disabledMessage} title="Redemptions">
      <div className="space-y-6" data-testid="digital-metals-redemption-orders">
        <PageHeader
          eyebrow={DM_SECTION}
          icon={Gift}
          title="Redemptions"
          description="Customers turning digital metal into physical coins and bars — from checkout and charges to handover."
          actions={
            <Button asChild className="rounded-xl">
              <Link href="/digital-metals/redemption/fulfilment">
                <PackageCheck /> Fulfilment queue
              </Link>
            </Button>
          }
        />
        <ListPanel toolbar={filters.toolbar("redemptions", meta?.hasMore)}>
          {orders.isError ? (
            <QueryError error={orders.error} onRetry={orders.refetch} />
          ) : (
            <AdminTable
              columns={redemptionColumns(false)}
              rows={filters.visible}
              getRowId={rowId}
              rowHref={(r) => `/digital-metals/redemption/orders/${r.id}`}
              loading={orders.isLoading}
              caption="Redemption orders"
              empty={<EmptyState icon={Gift} title="No redemptions yet" detail="When a customer redeems coins or bars, the order appears here." />}
              footer={
                <LoadMoreFooter
                  shown={filters.visible.length}
                  hasMore={meta?.hasMore}
                  loading={orders.isFetching}
                  noun="redemptions"
                  onLoadMore={() => list.loadMore(rows, meta?.nextCursor)}
                />
              }
            />
          )}
        </ListPanel>
      </div>
    </DmGate>
  );
}

const FLOW_PICKUP = ["CHECKOUT_PENDING", "CHARGE_PAID", "PICKUP_READY", "COMPLETED"];
const FLOW_DELIVERY = ["CHECKOUT_PENDING", "CHARGE_PAID", "DISPATCHED", "COMPLETED"];
const FLOW_LABELS: Record<string, string> = {
  CHECKOUT_PENDING: "Checkout started",
  CHARGE_PAID: "Charges paid",
  FULFILMENT_ACCEPTED: "Accepted for fulfilment",
  PACKING: "Packing",
  PICKUP_READY: "Ready for pickup",
  DISPATCHED: "Shipped",
  COMPLETED: "Handed over",
};

function redemptionTimeline(order: RedemptionAdminRow & Record<string, unknown>): TimelineStep[] {
  const flow = String(order.fulfilmentMode) === "DELIVERY" ? FLOW_DELIVERY : FLOW_PICKUP;
  const status = String(order.status ?? "");
  const mapped =
    status === "FULFILMENT_ACCEPTED" || status === "PACKING" ? "CHARGE_PAID" : status;
  const at = flow.indexOf(mapped);
  if (at < 0) {
    return [
      { key: "paid", title: "Charges paid", time: shortDateTime(order.chargePaidAt as string | undefined), state: order.chargePaidAt ? "done" : "upcoming" },
      { key: "now", title: status.replaceAll("_", " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase()), state: /CANCEL|INVESTIGATION|FAIL/.test(status) ? "failed" : "current" },
    ];
  }
  return flow.map((s, i) => ({
    key: s,
    title: FLOW_LABELS[s],
    time:
      s === "CHECKOUT_PENDING"
        ? shortDateTime(order.createdAt as string | undefined)
        : s === "CHARGE_PAID" && order.chargePaidAt
          ? shortDateTime(order.chargePaidAt as string)
          : undefined,
    state: i < at || (i === at && s === "COMPLETED") ? "done" : i === at ? "current" : "upcoming",
  }));
}

export function DigitalMetalsRedemptionOrderDetailPage({ orderId }: { orderId: string }) {
  const ent = useDigitalMetalsServerEntitlement();
  const detail = useGetDigitalMetalsRedemptionOrderQuery(orderId, { skip: !ent.workspaceVisible });
  const [postAction, postState] = usePostDigitalMetalsRedemptionFulfilmentActionMutation();
  const [pickupCode, setPickupCode] = useState("");
  const [trackingRef, setTrackingRef] = useState("");
  const [actionReason, setActionReason] = useState("");
  const [deliveryAttestation, setDeliveryAttestation] = useState(false);
  const [pickupHandoverConfirmed, setPickupHandoverConfirmed] = useState(false);
  const shipmentIdemRef = useRef<{
    key: string;
    action: string;
    carrier: string;
    trackingReference: string;
  } | null>(null);

  if (ent.loading || detail.isLoading) return <PageSkeleton cards={2} />;
  if (!ent.workspaceVisible) {
    return <p className="text-sm text-muted-foreground">{ent.disabledMessage}</p>;
  }
  if (detail.isError) return <QueryError error={detail.error} onRetry={detail.refetch} />;

  const order = detail.data as (RedemptionAdminRow & Record<string, unknown>) | undefined;
  const permitted = (order?.permittedActions ?? []).filter(
    (a) => !LEGACY_REDEMPTION_ACTIONS.includes(a),
  );
  const version = Number(order?.version ?? 1);
  const customer = order?.customer;
  const status = String(order?.status ?? "");

  async function runAction(action: string) {
    await detail.refetch();
    const freshVersion = Number((detail.data as Record<string, unknown> | undefined)?.version ?? version);
    const path = actionPath(action);
    const body: Record<string, unknown> = { expectedVersion: freshVersion };
    let idempotencyKey = newIdempotencyKey();
    if (action === "COMPLETE_PICKUP") {
      if (!pickupHandoverConfirmed) {
        toast.error("Confirm you are handing physical metal to the customer.");
        return;
      }
      body.pickupCode = pickupCode;
      body.fulfilmentBranchId = order?.fulfilmentBranchId ?? order?.pickupBranchId;
      body.staffHandoverConfirmed = true;
    }
    if (action === "DISPATCH" || action === "DISPATCH_REPLACEMENT") {
      const carrier = "Manual";
      const trackingReference = trackingRef || "MANUAL";
      body.carrier = carrier;
      body.trackingReference = trackingReference;
      const prior = shipmentIdemRef.current;
      if (prior && prior.action === action && prior.carrier === carrier && prior.trackingReference === trackingReference) {
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
      await postAction({ orderId, action: path, idempotencyKey, body }).unwrap();
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

  const needsReason = permitted.some((a) => ["OPEN_INVESTIGATION", "RESOLVE_RETURN", "CANCEL_PRE_DISPATCH"].includes(a));
  const primaryActions = permitted.filter((a) => !["CANCEL_PRE_DISPATCH", "OPEN_INVESTIGATION", "RECORD_DELAY"].includes(a));
  const secondaryActions = permitted.filter((a) => ["CANCEL_PRE_DISPATCH", "OPEN_INVESTIGATION", "RECORD_DELAY"].includes(a));
  const pickupCodeReady = /^\d{6}$/.test(pickupCode.trim());
  const pickupSubmitReady = pickupHandoverConfirmed && pickupCodeReady;
  const showDocs = ["CHARGE_PAID", "FULFILMENT_ACCEPTED", "PACKING", "COMPLETED", "DISPATCHED", "PICKUP_READY", "INVESTIGATION"].includes(status);

  return (
    <div className="space-y-6" data-testid="digital-metals-redemption-order-detail">
      <PageHeader
        back={{ href: "/digital-metals/redemption/fulfilment", label: "Fulfilment queue" }}
        eyebrow={DM_SECTION}
        title={customer?.name ? `Redemption for ${customer.name}` : "Redemption order"}
        meta={
          <>
            <StatusBadge status={status} />
            {order?.metal ? <MetalPill metal={String(order.metal)} /> : null}
            <IdChip>{orderId}</IdChip>
          </>
        }
        actions={
          customer?.id ? (
            <Button variant="outline" size="sm" asChild className="h-9 rounded-xl">
              <Link href={`/customers/${customer.id}`}>
                <UserRound /> Customer profile
              </Link>
            </Button>
          ) : null
        }
      />
      <DetailLayout
        main={
          <>
            <Surface>
              <FactGrid>
                <Fact label="Metal reserved" value={order ? ugToGramsDisplay(String(order.quantityUg ?? "0")) : "—"} detail={order ? redemptionMetalLabel(order).split(" · ")[1] : undefined} />
                <Fact label="Charges" value={dmInr(Number(order?.chargeTotalPaise ?? 0))} detail="Minting, packing, delivery" />
                <Fact label="Placed" value={shortDateTime(order?.createdAt as string | undefined)} />
                <Fact label="Charges paid" value={order?.chargePaidAt ? shortDateTime(order.chargePaidAt as string) : "Not yet"} />
              </FactGrid>
            </Surface>
            <Surface icon={String(order?.fulfilmentMode) === "DELIVERY" ? Truck : Store} title="Handover">
              <InfoList>
                <InfoRow label="Method">{order ? redemptionFulfilmentPreview(order).split(" · ")[0] : "—"}</InfoRow>
                {order?.deliveryAddressSnapshot ? (
                  <InfoRow label={<span className="inline-flex items-center gap-1"><MapPin className="size-3.5" /> Deliver to</span>}>
                    <span className="block max-w-sm text-sm leading-5">
                      {formatDeliveryAddressSnapshot(order.deliveryAddressSnapshot as Record<string, unknown>)}
                    </span>
                  </InfoRow>
                ) : null}
                {order?.pickupBranchLabel ? <InfoRow label="Pickup branch">{String(order.pickupBranchLabel)}</InfoRow> : null}
                {order?.trackingReference ? (
                  <InfoRow label={`Tracking (${String(order?.trackingSource ?? "MANUAL").toLowerCase()})`}>{String(order.trackingReference)}</InfoRow>
                ) : null}
                <InfoRow label="Last updated">{shortDateTime(order?.updatedAt as string | undefined)}</InfoRow>
              </InfoList>
              {order?.delayNote ? (
                <div className="px-5 pb-4">
                  <Notice tone="amber" icon={Clock3} title="Production delay">
                    {String(order.delayNote)}
                  </Notice>
                </div>
              ) : null}
            </Surface>
            {showDocs ? (
              <Surface icon={FileText} title="Documents">
                <div className="space-y-3 px-5 py-4">
                  <AdminDigitalMetalsDirectPdfPanel
                    title="Redemption charge receipt"
                    downloadPath={`/admin/digital-metals/redemption/orders/${encodeURIComponent(orderId)}/charge-receipt.pdf`}
                    filenameHint={`redemption-charge-${orderId}`}
                  />
                  {status === "COMPLETED" ? (
                    <AdminDigitalMetalsDirectPdfPanel
                      title="Physical handover receipt"
                      downloadPath={`/admin/digital-metals/redemption/orders/${encodeURIComponent(orderId)}/handover-receipt.pdf`}
                      filenameHint={`handover-${orderId}`}
                    />
                  ) : null}
                </div>
              </Surface>
            ) : null}
          </>
        }
        aside={
          <>
            {permitted.length > 0 ? (
              <Surface title="Next step" description="Actions available at this stage" className="ring-1 ring-[#ecd3d9]">
                <div className="space-y-3 px-5 py-4">
                  {permitted.includes("COMPLETE_PICKUP") ? (
                    <>
                      <FormField label="Pickup code from the customer">
                        <Input placeholder="6-digit code" value={pickupCode} onChange={(e) => setPickupCode(e.target.value)} className="h-10 rounded-xl tracking-[0.3em]" />
                      </FormField>
                      <label className="flex items-start gap-3 rounded-xl border border-[#efe5e1] bg-[#fcf9f8] p-3 text-sm leading-5">
                        <Checkbox checked={pickupHandoverConfirmed} onCheckedChange={(v) => setPickupHandoverConfirmed(v === true)} className="mt-0.5" />
                        <span>I verified the customer&apos;s pickup code and am handing over the physical metal now.</span>
                      </label>
                    </>
                  ) : null}
                  {permitted.includes("DISPATCH") || permitted.includes("DISPATCH_REPLACEMENT") ? (
                    <FormField label="Courier tracking reference">
                      <Input placeholder="e.g. DTDC7Z44102" value={trackingRef} onChange={(e) => setTrackingRef(e.target.value)} className="h-10 rounded-xl" />
                    </FormField>
                  ) : null}
                  {permitted.includes("COMPLETE_DELIVERY") ? (
                    <label className="flex items-start gap-3 rounded-xl border border-[#efe5e1] bg-[#fcf9f8] p-3 text-sm leading-5">
                      <Checkbox checked={deliveryAttestation} onCheckedChange={(v) => setDeliveryAttestation(v === true)} className="mt-0.5" />
                      <span>I attest that physical handover to the customer is complete and matches this order.</span>
                    </label>
                  ) : null}
                  <div className="flex flex-col gap-2">
                    {primaryActions.map((action) => (
                      <Button
                        key={action}
                        type="button"
                        className="h-10 rounded-xl"
                        disabled={
                          postState.isLoading
                          || (action === "COMPLETE_PICKUP" && !pickupSubmitReady)
                          || (action === "COMPLETE_DELIVERY" && !deliveryAttestation)
                        }
                        onClick={() => void runAction(action)}
                      >
                        {ACTION_LABELS[action] ?? action}
                      </Button>
                    ))}
                  </div>
                  {secondaryActions.length ? (
                    <div className="space-y-2 border-t border-[#f3eae7] pt-3">
                      {needsReason ? (
                        <FormField label="Reason" hint="Required to cancel, investigate or resolve a return (8+ characters)">
                          <Input
                            value={actionReason}
                            onChange={(e) => setActionReason(e.target.value)}
                            placeholder="What happened and what the customer should expect"
                            className="h-10 rounded-xl"
                          />
                        </FormField>
                      ) : null}
                      <div className="flex flex-wrap gap-2">
                        {secondaryActions.map((action) => (
                          <Button
                            key={action}
                            type="button"
                            size="sm"
                            variant={action === "CANCEL_PRE_DISPATCH" ? "destructive" : "outline"}
                            className="rounded-lg"
                            disabled={postState.isLoading}
                            onClick={() => void runAction(action)}
                          >
                            {ACTION_LABELS[action] ?? action}
                          </Button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              </Surface>
            ) : null}
            <Surface title="Progress">
              <Timeline steps={order ? redemptionTimeline(order) : []} />
            </Surface>
            <RedemptionAdminCustomerPanel customer={customer} />
          </>
        }
      />
    </div>
  );
}
