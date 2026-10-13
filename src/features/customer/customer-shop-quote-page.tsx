"use client";

import Link from "next/link";
import { useRef } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Clock3, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PageHeader, Surface } from "@/src/components/common/page-parts";
import { PageSkeleton, QueryError } from "@/src/components/common/query-state";
import { toastApiError } from "@/src/lib/api-error";
import { newIdempotencyKey } from "@/src/lib/idempotency";
import { useCustomerTenant } from "@/src/components/customer/customer-tenant-context";
import { customerPath } from "@/src/lib/customer-tenant";
import { customerShopOrderPath } from "@/src/lib/customer-shop-paths";
import {
  useCancelShopQuoteMutation,
  useCreateShopOrderMutation,
  useGetShopQuoteQuery,
} from "@/src/store/api/customer-api";
import { CustomerShopPoliciesLinks } from "@/src/features/customer/customer-shop-policies";

function formatInr(paise: number) {
  return `₹${(paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
}

export function CustomerShopQuotePage({ quoteId }: { quoteId: string }) {
  const router = useRouter();
  const { tenantSlug } = useCustomerTenant();
  const quote = useGetShopQuoteQuery(quoteId, { pollingInterval: 30_000 });
  const [cancelQuote, cancelState] = useCancelShopQuoteMutation();
  const [createOrder, createOrderState] = useCreateShopOrderMutation();
  // Keep the same key on an uncertain retry so a double click/network timeout cannot create another order.
  const orderIdempotencyKey = useRef<string>(newIdempotencyKey());

  if (quote.isLoading) return <PageSkeleton cards={2} />;
  if (quote.isError) return <QueryError error={quote.error} onRetry={quote.refetch} />;
  const q = quote.data;
  if (!q) return null;

  const lines = (q.lines as Record<string, unknown>[]) ?? [];
  const expiresAt = q.expiresAt ? new Date(String(q.expiresAt)) : null;
  const status = String(q.status ?? "");
  const expired = status === "EXPIRED";

  const checkoutTaxReady = q.checkoutTaxReady === true;
  const paymentMethod = String(q.paymentMethod ?? "ONLINE");
  const orderPlacementAllowed = q.orderPlacementAllowed === true;
  const canPlaceOrder =
    orderPlacementAllowed && checkoutTaxReady && status === "ACTIVE" && !expired;
  const placeOrderLabel = canPlaceOrder
    ? paymentMethod === "COD"
      ? "Place COD order"
      : "Place order & pay"
    : !checkoutTaxReady
      ? "Place order (checkout tax blocked)"
      : !orderPlacementAllowed
        ? paymentMethod === "COD"
          ? "Place COD order (not available)"
          : "Place order (payment blocked)"
        : "Place order (unavailable)";

  async function onPlaceOrder() {
    try {
      const order = await createOrder({
        quoteId,
        idempotencyKey: orderIdempotencyKey.current,
      }).unwrap();
      toast.success(paymentMethod === "COD" ? "COD order placed" : "Order created — continue to payment");
      router.push(customerShopOrderPath(tenantSlug, String(order.id)));
    } catch (err) {
      toastApiError(err);
    }
  }

  async function onCancel() {
    try {
      await cancelQuote({ quoteId, idempotencyKey: newIdempotencyKey() }).unwrap();
      toast.success("Quote cancelled");
      router.push(customerPath(tenantSlug, "shop", "cart"));
    } catch (err) {
      toastApiError(err);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Shop"
        title="Price preview"
        description="Check the final item, tax and fulfilment amounts before placing your order."
        actions={
          <Link href={customerPath(tenantSlug, "shop", "cart")}>
            <Button type="button" variant="outline">
              Back to cart
            </Button>
          </Link>
        }
      />
      <div className="mb-5 flex flex-wrap items-center gap-2 rounded-2xl border border-[#eee1d9] bg-white px-4 py-3 text-xs font-semibold text-[#66595b]">
        <span className="inline-flex items-center gap-1.5 text-emerald-800"><CheckCircle2 className="size-4" aria-hidden /> Cart</span>
        <span aria-hidden>→</span>
        <span className="inline-flex items-center gap-1.5 text-[#730321]"><Clock3 className="size-4" aria-hidden /> Review price</span>
        <span aria-hidden>→</span>
        <span className="inline-flex items-center gap-1.5"><ShoppingBag className="size-4" aria-hidden /> Order</span>
      </div>
      <Surface title="Quote status">
        <div className="space-y-2 p-6 text-sm">
          <p>
            {status === "ACTIVE" ? "Your price preview is ready" : status === "EXPIRED" ? "This price preview has expired" : "This price preview is no longer active"}
            {expired || status === "EXPIRED" ? (
              <span className="ml-2 text-amber-900">
                This preview expired — request a new quote from your cart if prices or stock changed.
              </span>
            ) : null}
          </p>
          {expiresAt ? (
            <p className="text-muted-foreground">
              Valid until {expiresAt.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
            </p>
          ) : null}
          {!checkoutTaxReady ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950">
              <p className="font-semibold">Checkout is temporarily unavailable</p>
              <p className="mt-1 leading-5">This store is finishing its checkout setup. Your preview is for reference; you cannot place this order yet.</p>
            </div>
          ) : null}
          {paymentMethod === "COD" ? (
            <p className="text-muted-foreground">
              Payment method: <strong>Cash on delivery</strong> — pay when your order is delivered.
            </p>
          ) : null}
          {checkoutTaxReady && paymentMethod === "ONLINE" && q.paymentAllowed !== true ? (
            <div className="rounded-lg border border-stone-200 bg-stone-50 p-3 text-xs text-stone-900">
              <p className="font-semibold">Online payment is not available for this store</p>
              <p className="mt-2 leading-5">You can review this price, but the jeweller has not enabled online checkout. Contact the store for availability.</p>
            </div>
          ) : null}
        </div>
      </Surface>
      <Surface title="Items">
        <ul className="divide-y p-4 text-sm">
          {lines.map((line) => (
            <li key={String(line.productId)} className="flex justify-between py-3">
              <div>
                <div className="font-medium">{String(line.name)}</div>
                <div className="text-muted-foreground">Qty {String(line.quantity)}</div>
              </div>
              <div>{formatInr(Number(line.lineTotalPaise ?? 0))} pre-tax</div>
            </li>
          ))}
        </ul>
      </Surface>
      <Surface title="Order total">
        <dl className="space-y-2 p-6 text-sm">
          <div className="flex justify-between">
            <dt>Subtotal (pre-tax)</dt>
            <dd>{formatInr(Number(q.subtotalPaise ?? 0))}</dd>
          </div>
          <div className="flex justify-between">
            <dt>Tax</dt>
            <dd>{formatInr(Number(q.taxPaise ?? 0))}</dd>
          </div>
          <div className="flex justify-between">
            <dt>Fulfilment</dt>
            <dd>{formatInr(Number(q.fulfilmentChargePaise ?? 0))}</dd>
          </div>
          <div className="flex justify-between border-t pt-2 font-semibold">
            <dt>Amount to pay</dt>
            <dd>{formatInr(Number(q.totalPaise ?? 0))}</dd>
          </div>
        </dl>
        <div className="flex flex-wrap gap-2 px-6 pb-6">
          <Button
            type="button"
            disabled={!canPlaceOrder || createOrderState.isLoading}
            onClick={onPlaceOrder}
            title={
              canPlaceOrder
                ? paymentMethod === "COD" ? "Place your cash on delivery order" : "Create order and continue to payment"
                : "Checkout is currently unavailable for this quote"
            }
          >
            {placeOrderLabel}
          </Button>
          {status === "ACTIVE" && !expired ? (
            <Button
              type="button"
              variant="outline"
              disabled={cancelState.isLoading}
              onClick={onCancel}
            >
              Cancel preview
            </Button>
          ) : (
            <Link href={customerPath(tenantSlug, "shop", "cart")}>
              <Button type="button">Refresh from cart</Button>
            </Link>
          )}
        </div>
        <CustomerShopPoliciesLinks className="mt-6 border-t pt-4" />
      </Surface>
    </>
  );
}
