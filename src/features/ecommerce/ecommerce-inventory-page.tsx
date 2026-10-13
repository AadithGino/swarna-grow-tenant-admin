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
import { PageHeader, Surface, FieldLabel } from "@/src/components/common/page-parts";
import { PageSkeleton, QueryError } from "@/src/components/common/query-state";
import { toastApiError, parseApiError } from "@/src/lib/api-error";
import { toast } from "sonner";
import {
  useAdjustEcommerceInventoryProductMutation,
  useGetEcommerceInventoryQuery,
  usePatchEcommerceInventoryProductMutation,
} from "@/src/store/api/admin-api";
import { useEcommerceAdminAccess } from "@/src/features/ecommerce/ecommerce-admin-shared";
import {
  EcommerceCatalogNav,
  EcommerceSettingsHint,
} from "@/src/features/ecommerce/ecommerce-settings-ui";
import { Boxes } from "lucide-react";
const STOCK_POLICIES = [
  { value: "MADE_TO_ORDER", label: "Made to order" },
  { value: "QUANTITY_TRACKED", label: "Quantity tracked" },
] as const;

export function EcommerceInventoryPage() {
  const { entitled, canRead, canWrite, disabledMessage, readBlockedMessage, writeBlockedMessage } =
    useEcommerceAdminAccess();
  const [q, setQ] = useState("");
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

  return (
    <>
      <PageHeader
        eyebrow="Online store"
        title="Inventory"
        description="Published products do not imply stock. Set quantity tracked or made-to-order per SKU."
      />
      {!entitled ? (
        <p className="mb-4 text-sm text-amber-800">{disabledMessage}</p>
      ) : null}
      {!canWrite ? (
        <p className="mb-4 text-sm text-muted-foreground">{writeBlockedMessage}</p>
      ) : null}
      <EcommerceCatalogNav />
      <EcommerceSettingsHint icon={Boxes} title="Stock vs made-to-order">
        Publishing a product does not imply stock. Set quantity tracked or made-to-order per SKU so
        checkout and fulfilment stay accurate.
      </EcommerceSettingsHint>
      <div className="mb-4 mt-5 flex gap-2">
        <Input
          placeholder="Search products…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="max-w-xs"
        />
        <Button type="button" variant="outline" onClick={() => query.refetch()}>
          Refresh
        </Button>
      </div>
      <Surface title={`Products (${items.length})`}>
        <div className="overflow-x-auto p-4 text-sm">
          <table className="w-full min-w-[640px] text-left">
            <thead>
              <tr className="border-b text-xs uppercase text-muted-foreground">
                <th className="py-2 pr-4">Product</th>
                <th className="py-2 pr-4">Policy</th>
                <th className="py-2 pr-4">On hand</th>
                <th className="py-2 pr-4">Reserved</th>
                <th className="py-2 pr-4">Available</th>
                <th className="py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={String(row.productId)} className="border-b">
                  <td className="py-3 pr-4">
                    <div className="font-medium">{String(row.productName)}</div>
                    <div className="text-xs text-muted-foreground">{String(row.status)}</div>
                  </td>
                  <td className="py-3 pr-4">
                    <Select
                      value={String(row.stockPolicy ?? "MADE_TO_ORDER")}
                      disabled={!entitled || !canWrite}
                      onValueChange={(v) => savePolicy(row, v)}
                    >
                      <SelectTrigger className="w-[160px]">
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
                  </td>
                  <td className="py-3 pr-4">
                    {row.stockPolicy === "QUANTITY_TRACKED" ? (
                      <Input
                        type="number"
                        min={0}
                        className="w-24"
                        defaultValue={String(row.quantityOnHand ?? 0)}
                        disabled={!entitled || !canWrite}
                        onBlur={(e) => setOnHand(row, e.target.value)}
                      />
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="py-3 pr-4">
                    {row.stockPolicy === "QUANTITY_TRACKED" ? row.reservedQuantity ?? 0 : "—"}
                  </td>
                  <td className="py-3 pr-4">
                    {row.stockPolicy === "QUANTITY_TRACKED"
                      ? row.availableQuantity ?? 0
                      : "Made to order"}
                  </td>
                  <td className="py-3">
                    {row.stockPolicy === "QUANTITY_TRACKED" && entitled && canWrite ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setAdjustProductId(String(row.productId));
                          setAdjustVersion(Number(row.version ?? 0));
                        }}
                      >
                        Adjust
                      </Button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!items.length ? (
            <p className="py-6 text-muted-foreground">No catalog products yet.</p>
          ) : null}
        </div>
      </Surface>
      {adjustProductId ? (
        <Surface title="Manual adjustment">
          <div className="space-y-3 p-6 text-sm">
            <FieldLabel>Delta quantity (+ / −)</FieldLabel>
            <Input value={delta} onChange={(e) => setDelta(e.target.value)} />
            <FieldLabel>Reason (audit trail)</FieldLabel>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} />
            <div className="flex gap-2">
              <Button type="button" onClick={submitAdjust}>
                Apply adjustment
              </Button>
              <Button type="button" variant="ghost" onClick={() => setAdjustProductId(null)}>
                Cancel
              </Button>
            </div>
          </div>
        </Surface>
      ) : null}
    </>
  );
}
