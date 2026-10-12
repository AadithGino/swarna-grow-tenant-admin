"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
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
import {
  formatPaymentBlockedReason,
  paymentGateBlockers,
  taxBlockers,
  type CapabilityBlocker,
} from "@/src/lib/ecommerce-payment-blockers";
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

  if (quote.isLoading) return <PageSkeleton cards={2} />;
  if (quote.isError) return <QueryError error={quote.error} onRetry={quote.refetch} />;
  const q = quote.data;
  if (!q) return null;

  const lines = (q.lines as Record<string, unknown>[]) ?? [];
  const expiresAt = q.expiresAt ? new Date(String(q.expiresAt)) : null;
  const status = String(q.status ?? "");
  const expired = status === "EXPIRED";

  const checkoutTaxReady = q.checkoutTaxReady === true;
  const quoteBlockers = (q.blockers as CapabilityBlocker[] | undefined) ?? [];
  const taxOnlyBlockers = taxBlockers(quoteBlockers);
  const paymentOnlyBlockers = paymentGateBlockers(quoteBlockers);
  const paymentBlockedReason = formatPaymentBlockedReason(quoteBlockers);
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
        idempotencyKey: newIdempotencyKey(),
      }).unwrap();
      toast.success("Order created");
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
        description="Server-generated quote for your cart. Amounts and tax are authoritative from the server."
        actions={
          <Link href={customerPath(tenantSlug, "shop", "cart")}>
            <Button type="button" variant="outline">
              Back to cart
            </Button>
          </Link>
        }
      />
      <Surface title="Quote status">
        <div className="space-y-2 p-6 text-sm">
          <p>
            Status: <strong>{status}</strong>
            {expired || status === "EXPIRED" ? (
              <span className="ml-2 text-amber-900">
                This preview expired — request a new quote from your cart if prices or stock changed.
              </span>
            ) : null}
          </p>
          {expiresAt ? (
            <p className="text-muted-foreground">
              Valid until {expiresAt.toLocaleString()} (server time)
            </p>
          ) : null}
          {!checkoutTaxReady && taxOnlyBlockers.length ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950">
              <p className="font-semibold">Checkout tax not ready</p>
              <ul className="mt-2 list-disc pl-5">
                {taxOnlyBlockers.map((b) => (
                  <li key={b.code ?? b.message}>
                    {b.message ?? b.code}
                    {b.code ? (
                      <span className="ml-1 font-mono text-[10px]">{b.code}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
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
              {paymentBlockedReason ? (
                <p className="mt-2 leading-5">{paymentBlockedReason}</p>
              ) : null}
              {paymentOnlyBlockers.length ? (
                <ul className="mt-2 list-disc pl-5">
                  {paymentOnlyBlockers.map((b) => (
                    <li key={b.code ?? b.message}>
                      {b.message ?? b.code}
                      {b.code ? (
                        <span className="ml-1 font-mono text-[10px]">{b.code}</span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-muted-foreground">
                  You can review this quote; place order when your jeweller enables payments.
                </p>
              )}
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
      <Surface title="Amounts (server)">
        <dl className="space-y-2 p-6 text-sm">
          <div className="flex justify-between">
            <dt>Subtotal (pre-tax)</dt>
            <dd>{formatInr(Number(q.subtotalPaise ?? 0))}</dd>
          </div>
          <div className="flex justify-between">
            <dt>Tax (accountant components)</dt>
            <dd>{formatInr(Number(q.taxPaise ?? 0))}</dd>
          </div>
          <div className="flex justify-between">
            <dt>Fulfilment</dt>
            <dd>{formatInr(Number(q.fulfilmentChargePaise ?? 0))}</dd>
          </div>
          <div className="flex justify-between border-t pt-2 font-semibold">
            <dt>Total preview</dt>
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
                ? "Create order and continue to payment"
                : "Requires server checkout and payment readiness"
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
