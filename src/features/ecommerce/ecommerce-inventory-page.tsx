"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader, Surface, FieldLabel, StatCard } from "@/src/components/common/page-parts";
import { EmptyState, PageSkeleton, QueryError } from "@/src/components/common/query-state";
import { StatusBadge } from "@/src/components/common/status-badge";
import { AdminTable, ListPanel, type AdminColumn } from "@/src/components/admin-ui/admin-table";
import { FilterBar, FilterSearch, QuickViews } from "@/src/components/admin-ui/filter-bar";
import { Notice } from "@/src/components/admin-ui/detail-parts";
import { EcommerceCatalogImage } from "@/src/features/ecommerce/ecommerce-catalog-image";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toastApiError, parseApiError } from "@/src/lib/api-error";
import { toast } from "sonner";
import {
  useAdjustEcommerceInventoryProductMutation,
  useGetEcommerceInventoryQuery,
  usePatchEcommerceInventoryProductMutation,
} from "@/src/store/api/admin-api";
import { useEcommerceAdminAccess } from "@/src/features/ecommerce/ecommerce-admin-shared";
import { AlertTriangle, ArrowUpDown, Boxes, Hammer, PackageX, RefreshCw } from "lucide-react";
const STOCK_POLICIES = [
  { value: "MADE_TO_ORDER", label: "Made to order" },
  { value: "QUANTITY_TRACKED", label: "Quantity tracked" },
] as const;

export function EcommerceInventoryPage() {
  const { entitled, canRead, canWrite, disabledMessage, readBlockedMessage, writeBlockedMessage } =
    useEcommerceAdminAccess();
  const [q, setQ] = useState("");
  const [stockView, setStockView] = useState("ALL");
  const query = useGetEcommerceInventoryQuery({ q: q.trim() || undefined, limit: 50 }, { skip: !canRead });
  const [patchInventory] = usePatchEcommerceInventoryProductMutation();
  const [adjustInventory] = useAdjustEcommerceInventoryProductMutation();
  const [adjustProductId, setAdjustProductId] = useState<string | null>(null);
  const [delta, setDelta] = useState("");
  const [reason, setReason] = useState("");
  const [adjustVersion, setAdjustVersion] = useState(0);

  if (!canRead) {
    return (
      <Surface title="Inventory">
        <p className="p-6 text-sm text-muted-foreground">{readBlockedMessage}</p>
      </Surface>
    );
  }
  if (query.isLoading) return <PageSkeleton cards={2} />;
  if (query.isError) return <QueryError error={query.error} onRetry={query.refetch} />;

  const items = query.data?.items ?? [];

  async function savePolicy(row: Record<string, unknown>, stockPolicy: string) {
    if (!entitled || !canWrite) {
      toast.error(writeBlockedMessage ?? disabledMessage ?? "Not allowed");
      return;
    }
    try {
      await patchInventory({
        productId: String(row.productId),
        body: {
          expectedVersion: row.version,
          stockPolicy,
          ...(stockPolicy === "QUANTITY_TRACKED" && row.quantityOnHand == null
            ? { quantityOnHand: 0 }
            : {}),
        },
      }).unwrap();
      toast.success("Stock policy updated");
      query.refetch();
    } catch (err) {
      if (parseApiError(err).code === "VERSION_CONFLICT") {
        toast.error("Inventory changed elsewhere — refreshing.");
        query.refetch();
        return;
      }
      toastApiError(err);
    }
  }

  async function setOnHand(row: Record<string, unknown>, raw: string) {
    if (!entitled || !canWrite) return;
    const quantityOnHand = Number(raw);
    if (!Number.isInteger(quantityOnHand) || quantityOnHand < 0) return;
    try {
      await patchInventory({
        productId: String(row.productId),
        body: { expectedVersion: row.version, stockPolicy: "QUANTITY_TRACKED", quantityOnHand },
      }).unwrap();
      toast.success("On-hand quantity saved");
      query.refetch();
    } catch (err) {
      if (parseApiError(err).code === "VERSION_CONFLICT") {
        toast.error("Version conflict — refresh and retry.");
        query.refetch();
        return;
      }
      toastApiError(err);
    }
  }

  async function submitAdjust() {
    if (!adjustProductId || !entitled || !canWrite) return;
    const deltaQuantity = Number(delta);
    if (!Number.isInteger(deltaQuantity) || deltaQuantity === 0) {
      toast.error("Enter a non-zero whole number adjustment.");
      return;
    }
    try {
      await adjustInventory({
        productId: adjustProductId,
        body: { expectedVersion: adjustVersion, deltaQuantity, reason: reason.trim() || undefined },
      }).unwrap();
      toast.success("Stock adjusted");
      setAdjustProductId(null);
      setDelta("");
      setReason("");
      query.refetch();
    } catch (err) {
      if (parseApiError(err).code === "VERSION_CONFLICT") {
        toast.error("Version conflict — refresh and retry.");
        query.refetch();
        return;
      }
      toastApiError(err);
    }
  }

  const tracked = items.filter((r) => r.stockPolicy === "QUANTITY_TRACKED");
  const outOfStock = tracked.filter((r) => Number(r.availableQuantity ?? 0) <= 0);
  const lowStock = tracked.filter((r) => Number(r.availableQuantity ?? 0) > 0 && Number(r.availableQuantity ?? 0) <= 2);
  const visibleRows = items.filter((r) => {
    if (stockView === "LOW") return r.stockPolicy === "QUANTITY_TRACKED" && Number(r.availableQuantity ?? 0) > 0 && Number(r.availableQuantity ?? 0) <= 2;
    if (stockView === "OUT") return r.stockPolicy === "QUANTITY_TRACKED" && Number(r.availableQuantity ?? 0) <= 0;
    if (stockView === "MTO") return r.stockPolicy !== "QUANTITY_TRACKED";
    if (stockView === "TRACKED") return r.stockPolicy === "QUANTITY_TRACKED";
    return true;
  });
  const adjustRow = items.find((r) => String(r.productId) === adjustProductId);

  const columns: AdminColumn<Record<string, unknown>>[] = [
    {
      key: "product",
      header: "Product",
      primary: true,
      cell: (row) => (
        <div className="flex min-w-0 items-center gap-3">
          <span className="relative size-11 shrink-0 overflow-hidden rounded-xl bg-[#f7f1eb] ring-1 ring-[#efe5e1]">
            {row.imageUploadId ? <EcommerceCatalogImage uploadId={String(row.imageUploadId)} channel="admin" alt="" fill /> : null}
          </span>
          <div className="min-w-0">
            <p className="truncate font-semibold text-[#28161a]">{String(row.productName)}</p>
            <p className="truncate text-xs text-[#857a7d]">
              {row.sku ? `${String(row.sku)} · ` : ""}
              {String(row.status ?? "").toLowerCase()}
            </p>
          </div>
        </div>
      ),
      sortValue: (row) => String(row.productName ?? ""),
    },
    {
      key: "policy",
      header: "Stock policy",
      cell: (row) => (
        <Select value={String(row.stockPolicy ?? "MADE_TO_ORDER")} disabled={!entitled || !canWrite} onValueChange={(v) => savePolicy(row, v)}>
          <SelectTrigger className="h-9 w-[11rem] rounded-lg">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STOCK_POLICIES.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ),
    },
    {
      key: "onhand",
      header: "On hand",
      cell: (row) =>
        row.stockPolicy === "QUANTITY_TRACKED" ? (
          <Input
            type="number"
            min={0}
            aria-label={`On hand for ${String(row.productName)}`}
            className="h-9 w-24 rounded-lg tabular-nums"
            defaultValue={String(row.quantityOnHand ?? 0)}
            disabled={!entitled || !canWrite}
            onBlur={(e) => setOnHand(row, e.target.value)}
          />
        ) : (
          <span className="text-[#b9a9ad]">—</span>
        ),
    },
    {
      key: "reserved",
      header: "Reserved",
      align: "right",
      cell: (row) => (row.stockPolicy === "QUANTITY_TRACKED" ? String(row.reservedQuantity ?? 0) : "—"),
      hideOnMobile: true,
    },
    {
      key: "available",
      header: "Available",
      align: "right",
      cell: (row) => {
        if (row.stockPolicy !== "QUANTITY_TRACKED") return <StatusBadge status="IN_PROGRESS" label="Made to order" />;
        const n = Number(row.availableQuantity ?? 0);
        return n <= 0 ? (
          <StatusBadge status="OUT_OF_STOCK" label="Out of stock" />
        ) : n <= 2 ? (
          <StatusBadge status="LOW_STOCK" label={`${n} left`} />
        ) : (
          <span className="font-bold tabular-nums">{n}</span>
        );
      },
      sortValue: (row) => (row.stockPolicy === "QUANTITY_TRACKED" ? Number(row.availableQuantity ?? 0) : 9999),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      cell: (row) =>
        row.stockPolicy === "QUANTITY_TRACKED" && entitled && canWrite ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="rounded-lg"
            onClick={() => {
              setAdjustProductId(String(row.productId));
              setAdjustVersion(Number(row.version ?? 0));
            }}
          >
            <ArrowUpDown /> Adjust
          </Button>
        ) : null,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Online store"
        icon={Boxes}
        title="Inventory"
        description="Publishing a product doesn't mean it's in stock. Track quantities for ready pieces, or mark them made to order."
        actions={
          <Button type="button" variant="outline" className="rounded-xl" onClick={() => query.refetch()}>
            <RefreshCw /> Refresh
          </Button>
        }
      />
      {!entitled ? <Notice tone="amber">{disabledMessage}</Notice> : null}
      {!canWrite ? <Notice tone="blue">{writeBlockedMessage}</Notice> : null}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Boxes}
          label="Tracked items"
          value={tracked.length}
          detail={
            query.data?.truncated
              ? `Counted from the ${items.length} most recently updated of ${query.data.totalProducts} products`
              : "Quantity counted per SKU"
          }
          tone="cream"
        />
        <StatCard icon={Hammer} label="Made to order" value={items.length - tracked.length} detail="Crafted after the order" tone="blue" />
        <StatCard icon={AlertTriangle} label="Low stock" value={lowStock.length} detail="2 or fewer available" tone={lowStock.length ? "gold" : "wine"} />
        <StatCard icon={PackageX} label="Out of stock" value={outOfStock.length} detail="Customers can't order these" tone={outOfStock.length ? "red" : "wine"} />
      </div>
      <ListPanel
        toolbar={
          <FilterBar
            quickViews={
              <QuickViews
                value={stockView}
                onChange={setStockView}
                options={[
                  { value: "ALL", label: "All", count: items.length },
                  { value: "TRACKED", label: "Tracked", count: tracked.length },
                  { value: "LOW", label: "Low stock", count: lowStock.length },
                  { value: "OUT", label: "Out of stock", count: outOfStock.length },
                  { value: "MTO", label: "Made to order", count: items.length - tracked.length },
                ]}
                ariaLabel="Stock view"
              />
            }
            search={<FilterSearch value={q} onChange={setQ} placeholder="Search products" />}
            resultLabel={`${visibleRows.length} products`}
          />
        }
      >
        <AdminTable
          columns={columns}
          rows={visibleRows}
          getRowId={(r) => String(r.productId)}
          fetching={query.isFetching}
          caption="Inventory"
          empty={<EmptyState icon={Boxes} title={items.length ? "Nothing in this view" : "No catalog products yet"} detail={items.length ? "Try another stock view." : "Add products first, then set their stock here."} />}
        />
      </ListPanel>
      <Dialog open={Boolean(adjustProductId)} onOpenChange={(o) => !o && setAdjustProductId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Adjust stock</DialogTitle>
            <DialogDescription>
              {adjustRow ? `${String(adjustRow.productName)} · ${String(adjustRow.availableQuantity ?? 0)} available now` : "Add or remove pieces"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <div>
              <FieldLabel>Change in quantity (+ to add, − to remove)</FieldLabel>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="icon" className="rounded-lg" onClick={() => setDelta(String((Number(delta) || 0) - 1))} aria-label="Remove one">
                  −
                </Button>
                <Input value={delta} onChange={(e) => setDelta(e.target.value)} inputMode="numeric" className="h-10 rounded-xl text-center text-base tabular-nums" />
                <Button type="button" variant="outline" size="icon" className="rounded-lg" onClick={() => setDelta(String((Number(delta) || 0) + 1))} aria-label="Add one">
                  +
                </Button>
              </div>
            </div>
            <div>
              <FieldLabel>Reason (kept in the audit trail)</FieldLabel>
              <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. New stock from workshop" className="h-10 rounded-xl" />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="ghost" onClick={() => setAdjustProductId(null)}>
                Cancel
              </Button>
              <Button type="button" onClick={submitAdjust}>
                Apply adjustment
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
